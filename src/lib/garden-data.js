import { base44 } from "@/api/base44Client";

// Centralized data-fetching helpers for the active garden.
// Each returns a promise; pages compose these with React Query or useEffect.

export async function fetchGardenAreas(gardenId) {
  if (!gardenId) return [];
  return base44.entities.GardenArea.filter({ garden_id: gardenId });
}

export async function fetchPlants(gardenId) {
  if (!gardenId) return [];
  return base44.entities.Plant.filter({ garden_id: gardenId });
}

export async function fetchActivePlants(gardenId) {
  const plants = await fetchPlants(gardenId);
  return plants.filter((p) => p.active !== false);
}

export async function fetchPendingActions(gardenId) {
  if (!gardenId) return [];
  const actions = await base44.entities.GardenAction.filter({ garden_id: gardenId, status: "pending" });
  return actions.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
}

export async function fetchJournalEntries(gardenId, limit = 50) {
  if (!gardenId) return [];
  return base44.entities.JournalEntry.filter({ garden_id: gardenId }, "-created_date", limit);
}

export async function fetchWateringRecords(gardenId, limit = 20) {
  if (!gardenId) return [];
  return base44.entities.WateringRecord.filter({ garden_id: gardenId }, "-timestamp", limit);
}

export async function fetchHarvests(gardenId, limit = 20) {
  if (!gardenId) return [];
  return base44.entities.Harvest.filter({ garden_id: gardenId }, "-date", limit);
}

export async function fetchPlantObservations(plantId) {
  if (!plantId) return [];
  return base44.entities.PlantObservation.filter({ plant_id: plantId }, "-observation_date");
}

export async function fetchAIAnalyses(plantId) {
  if (!plantId) return [];
  return base44.entities.AIAnalysis.filter({ plant_id: plantId }, "-analysis_date");
}

export async function fetchWeatherSnapshot(gardenId) {
  if (!gardenId) return null;
  const list = await base44.entities.WeatherSnapshot.filter({ garden_id: gardenId }, "-timestamp", 1);
  return list[0] || null;
}

export function priorityRank(priority) {
  const ranks = { urgent: 0, today: 1, follow_up: 2, routine: 3, upcoming: 4 };
  return ranks[priority] ?? 5;
}

export function plantStatusRank(status) {
  const ranks = { serious_concern: 0, needs_attention: 1, harvesting: 2, watch: 3, healthy: 4, finished: 5 };
  return ranks[status] ?? 6;
}

export function plantsNeedingAttention(plants) {
  const attentionStatuses = ["serious_concern", "needs_attention", "watch", "harvesting"];
  return plants
    .filter((p) => p.active !== false && attentionStatuses.includes(p.current_status))
    .sort((a, b) => plantStatusRank(a.current_status) - plantStatusRank(b.current_status));
}

export function formatDate(dateStr, opts = {}) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...opts });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function relativeDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff <= 7) return `In ${diff} days`;
  if (diff < -1 && diff >= -7) return `${Math.abs(diff)} days ago`;
  return formatDate(dateStr);
}