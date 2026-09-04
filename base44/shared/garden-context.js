// Server-side plant context building + knowledge source matching for Botany Betty.
// All entity functions take a base44 client (user-scoped) as the first argument.
// Logic shared with the pure-logic module is imported from garden-ai.js.

import { scoreKnowledgeSource } from "./garden-ai.js";

const RECENT_OBSERVATION_LIMIT = 5;
const RECENT_ANALYSIS_LIMIT = 3;
const RECENT_COMPLETED_ACTION_LIMIT = 5;
const RECENT_WATERING_LIMIT = 5;
const RECENT_HARVEST_LIMIT = 3;

// Build a compact Plant Context Package from the database (Part 1).
// Retrieves only the most relevant recent history — not the plant's lifetime.
export async function buildPlantContextPackage(client, plantId, journalEntryId) {
  const plant = await client.entities.Plant.get(plantId);
  if (!plant) return null;

  let area = null;
  if (plant.garden_area_id) {
    try { area = await client.entities.GardenArea.get(plant.garden_area_id); } catch {}
  }

  let garden = null;
  try { garden = await client.entities.Garden.get(plant.garden_id); } catch {}

  let currentUpdate = null;
  if (journalEntryId) {
    try { currentUpdate = await client.entities.JournalEntry.get(journalEntryId); } catch {}
  }

  const [observations, analyses, pendingActions, completedActions, watering, harvests] = await Promise.all([
    client.entities.PlantObservation.filter({ plant_id: plantId }, "-observation_date", RECENT_OBSERVATION_LIMIT).catch(() => []),
    client.entities.AIAnalysis.filter({ plant_id: plantId }, "-analysis_date", RECENT_ANALYSIS_LIMIT).catch(() => []),
    client.entities.GardenAction.filter({ plant_id: plantId, status: "pending" }).catch(() => []),
    client.entities.GardenAction.filter({ plant_id: plantId, status: "completed" }, "-completed_date", RECENT_COMPLETED_ACTION_LIMIT).catch(() => []),
    client.entities.WateringRecord.filter({ plant_id: plantId }, "-timestamp", RECENT_WATERING_LIMIT).catch(() => []),
    client.entities.Harvest.filter({ plant_id: plantId }, "-date", RECENT_HARVEST_LIMIT).catch(() => [])
  ]);

  let weather = null;
  try {
    const weatherList = await client.entities.WeatherSnapshot.filter({ garden_id: plant.garden_id }, "-timestamp", 1);
    weather = weatherList[0] || null;
  } catch {}

  return {
    plant: {
      id: plant.id,
      garden_id: plant.garden_id,
      plant_type: plant.plant_type,
      variety: plant.variety,
      planting_date: plant.planting_date,
      current_status: plant.current_status,
      display_name: plant.display_name
    },
    area: area ? {
      name: area.name,
      area_type: area.area_type,
      sun_exposure: area.sun_exposure,
      watering_method: area.watering_method,
      soil_notes: area.soil_notes
    } : null,
    garden: garden ? {
      name: garden.name,
      city: garden.city,
      region: garden.region
    } : null,
    current_update: currentUpdate ? {
      id: currentUpdate.id,
      entry_type: currentUpdate.entry_type,
      note: currentUpdate.note,
      voice_transcript: currentUpdate.voice_transcript,
      media: currentUpdate.media || [],
      created_date: currentUpdate.created_date
    } : null,
    recent_observations: observations.map(compactObservation),
    recent_analyses: analyses.map(compactAnalysis),
    pending_actions: pendingActions.map((a) => ({ title: a.title, priority: a.priority, due_date: a.due_date })),
    recently_completed_actions: completedActions.map((a) => ({ title: a.title, completed_date: a.completed_date, outcome: a.outcome })),
    recent_watering: watering.map((w) => ({ timestamp: w.timestamp, amount: w.amount, source: w.source })),
    recent_harvests: harvests.map((h) => ({ date: h.date, crop: h.crop, quantity: h.quantity, unit: h.unit, quality: h.quality })),
    weather: weather ? {
      timestamp: weather.timestamp,
      current_temp: weather.current_temp,
      forecast_high: weather.forecast_high,
      forecast_low: weather.forecast_low,
      precipitation: weather.precipitation,
      alert_type: weather.alert_type
    } : null
  };
}

function compactObservation(o) {
  return {
    observation_category: o.observation_category,
    severity: o.severity,
    description: o.description,
    observation_date: o.observation_date
  };
}

function compactAnalysis(a) {
  return {
    observation_summary: a.observation_summary,
    confidence_level: a.confidence_level,
    recommended_next_action: a.recommended_next_action,
    analysis_date: a.analysis_date
  };
}

// Find matching approved KnowledgeSources using structured matching (Part 6).
// Criteria: crop, issues (array), topic, region, season.
export async function findMatchingKnowledgeSources(client, criteria) {
  let approved = [];
  try {
    approved = await client.entities.KnowledgeSource.filter({ approved: true });
  } catch {
    return [];
  }
  const scored = approved
    .map((source) => ({ source, score: scoreKnowledgeSource(source, criteria) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((s) => s.source);
}

// Determine the current California gardening season from a date.
export function currentSeason(date) {
  const d = date || new Date();
  const month = d.getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

// Build a compact text summary of the context for the LLM prompt.
export function buildHistorySummary(context) {
  if (!context) return "";
  const lines = [];
  if (context.recent_observations?.length) {
    lines.push("Recent observations:");
    for (const o of context.recent_observations) {
      lines.push(`- ${o.observation_category?.replace(/_/g, " ")} (${o.severity || "none"}): ${o.description || ""}`);
    }
  }
  if (context.recent_analyses?.length) {
    lines.push("Recent AI analyses:");
    for (const a of context.recent_analyses) {
      lines.push(`- ${a.observation_summary} (confidence: ${a.confidence_level}, action: ${a.recommended_next_action || "none"})`);
    }
  }
  if (context.pending_actions?.length) {
    lines.push("Pending actions:");
    for (const a of context.pending_actions) {
      lines.push(`- ${a.title} (priority: ${a.priority})`);
    }
  }
  if (context.recently_completed_actions?.length) {
    lines.push("Recently completed:");
    for (const a of context.recently_completed_actions) {
      lines.push(`- ${a.title}`);
    }
  }
  if (context.recent_watering?.length) {
    lines.push("Recent watering:");
    for (const w of context.recent_watering) {
      lines.push(`- ${w.timestamp?.slice(0, 10)} (${w.source})`);
    }
  }
  if (context.weather) {
    lines.push(`Weather: ${context.weather.current_temp ?? "unknown"}F, alert: ${context.weather.alert_type || "none"}`);
  }
  return lines.join("\n");
}