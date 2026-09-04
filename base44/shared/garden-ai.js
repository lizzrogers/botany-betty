// Shared AI + recommendation logic for Botany Betty.
// Extension points for plant context retrieval, confidence thresholds,
// recommendation safety, and historical comparison live here so they can
// be strengthened separately without touching UI components.

export const CONFIDENCE_LEVELS = {
  high: "high",
  medium: "medium",
  low: "low"
};

// Low-risk recommendations a user can act on without specialist evidence.
export const LOW_RISK_ACTIONS = [
  "observe",
  "photograph_again",
  "inspect_leaves",
  "check_soil_moisture",
  "adjust_watering_timing",
  "temporary_shade",
  "improve_airflow",
  "remove_dead_material",
  "gather_more_evidence"
];

// Higher-impact interventions that require sufficient evidence + an approved
// authoritative knowledge source before being recommended strongly.
export const HIGHER_IMPACT_ACTIONS = [
  "pesticide",
  "fungicide",
  "fertilizer",
  "major_pruning",
  "soil_amendment"
];

// Classify a recommended action's risk level.
export function classifyActionRisk(action) {
  if (!action) return "unknown";
  const key = String(action).toLowerCase().replace(/\s+/g, "_");
  if (LOW_RISK_ACTIONS.includes(key)) return "low";
  if (HIGHER_IMPACT_ACTIONS.includes(key)) return "higher_impact";
  return "unknown";
}

// Determine whether a strong higher-impact recommendation may be shown.
// Requires high confidence AND an approved knowledge source reference.
export function canShowHigherImpactRecommendation(confidence, sourceReferences) {
  const hasApprovedSource = Array.isArray(sourceReferences) && sourceReferences.length > 0;
  return confidence === CONFIDENCE_LEVELS.high && hasApprovedSource;
}

// Build the confidence-level guidance text shown to the user.
export function confidenceGuidance(confidence) {
  switch (confidence) {
    case CONFIDENCE_LEVELS.high:
      return "A clear recommendation is supported by enough evidence.";
    case CONFIDENCE_LEVELS.medium:
      return "This may be one of a few likely causes. Try the low-risk next step before doing anything stronger.";
    case CONFIDENCE_LEVELS.low:
      return "I can't identify the cause confidently yet. Please gather a little more evidence — for example, photograph the underside of two affected leaves.";
    default:
      return "Confidence is still being assessed.";
  }
}

// Normalize a raw AI identification result into a stable shape.
export function normalizeIdentification(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    likely_plant: raw.likely_plant || raw.plant_type || "",
    confidence: (raw.confidence || "medium").toLowerCase(),
    alternatives: Array.isArray(raw.alternatives) ? raw.alternatives : [],
    notes: raw.notes || ""
  };
}

// Normalize a raw AI photo observation result into a stable shape.
export function normalizePhotoAnalysis(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    observation_summary: raw.observation_summary || "",
    observations: Array.isArray(raw.observations) ? raw.observations : [],
    possible_explanations: Array.isArray(raw.possible_explanations) ? raw.possible_explanations : [],
    recommended_next_action: raw.recommended_next_action || "",
    action_risk: classifyActionRisk(raw.recommended_next_action),
    confidence_level: (raw.confidence_level || "medium").toLowerCase(),
    urgency: raw.urgency || "routine",
    follow_up_date: raw.follow_up_date || null,
    source_references: Array.isArray(raw.source_references) ? raw.source_references : [],
    change_from_previous: raw.change_from_previous || "",
    image_quality: raw.image_quality || "unknown",
    additional_evidence_needed: raw.additional_evidence_needed || "",
    higher_impact_considered: Boolean(raw.higher_impact_considered),
    visible_growth_stage: raw.visible_growth_stage || "",
    flowering_present: Boolean(raw.flowering_present),
    fruit_present: Boolean(raw.fruit_present),
    visible_pest_possible: Boolean(raw.visible_pest_possible)
  };
}

// --- Garden Guidance Foundation extensions ---

// Image quality levels assessed from the photo.
export const IMAGE_QUALITY_LEVELS = {
  good: "good",
  fair: "fair",
  poor: "poor",
  unusable: "unusable",
  unknown: "unknown"
};

// Force confidence toward LOW when image quality is insufficient (Part 4).
export function forceConfidenceFromImageQuality(confidence, imageQuality) {
  if (imageQuality === IMAGE_QUALITY_LEVELS.unusable || imageQuality === IMAGE_QUALITY_LEVELS.poor) {
    return CONFIDENCE_LEVELS.low;
  }
  return confidence;
}

// Determine if the analysis found no meaningful abnormality (Part 2 rule).
// A healthy-looking plant should not receive an invented problem.
export function hasNoMeaningfulAbnormality(observations) {
  if (!Array.isArray(observations) || observations.length === 0) return true;
  return observations.every((o) => !o.severity || o.severity === "none");
}

// Score a knowledge source against matching criteria (Part 6 structured matching).
// Used by garden-context.js to rank approved sources by relevance.
export function scoreKnowledgeSource(source, criteria) {
  if (!source || !source.approved) return 0;
  let score = 0;
  const cropTags = (source.crop_tags || []).map((t) => String(t).toLowerCase());
  const issueTags = (source.issue_tags || []).map((t) => String(t).toLowerCase());
  const topicTags = (source.topic_tags || []).map((t) => String(t).toLowerCase());
  if (criteria.crop && cropTags.includes(String(criteria.crop).toLowerCase())) score += 3;
  if (Array.isArray(criteria.issues)) {
    for (const issue of criteria.issues) {
      if (issue && issueTags.includes(String(issue).toLowerCase())) score += 2;
    }
  }
  if (criteria.topic && topicTags.includes(String(criteria.topic).toLowerCase())) score += 2;
  if (criteria.region && source.california_region) {
    if (String(source.california_region).toLowerCase().includes(String(criteria.region).toLowerCase())) score += 1;
  }
  if (criteria.season && source.season) {
    if (String(source.season).toLowerCase() === String(criteria.season).toLowerCase()) score += 1;
  }
  return score;
}

// Human-readable action title templates (Part 8).
const ACTION_TITLE_TEMPLATES = {
  check_soil_moisture: (n) => `Check soil moisture around ${n}`,
  photograph_again: (n) => `Take another photo of ${n}`,
  inspect_leaves: (n) => `Inspect leaves of ${n}`,
  observe: (n) => `Keep an eye on ${n}`,
  adjust_watering_timing: (n) => `Adjust watering timing for ${n}`,
  temporary_shade: (n) => `Provide temporary shade for ${n}`,
  improve_airflow: (n) => `Improve airflow around ${n}`,
  remove_dead_material: (n) => `Remove dead material from ${n}`,
  pesticide: (n) => `Consider treatment for ${n}`,
  fungicide: (n) => `Consider fungicide for ${n}`,
  fertilizer: (n) => `Consider fertilizing ${n}`,
  major_pruning: (n) => `Prune ${n}`,
  soil_amendment: (n) => `Amend soil for ${n}`,
  gather_more_evidence: (n) => `Gather more evidence for ${n}`
};

export function buildActionTitle(actionKey, plantDisplayName) {
  const key = String(actionKey || "").toLowerCase().replace(/\s+/g, "_");
  const name = plantDisplayName || "the plant";
  const template = ACTION_TITLE_TEMPLATES[key];
  if (template) return template(name);
  const titleCased = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `${titleCased} ${name}`.trim();
}

// Validate an LLM-provided follow-up date.
// Returns a clean YYYY-MM-DD string only if the date parses to a valid date,
// is not in the past, and falls within a reasonable 1–30 day window.
// Otherwise returns null so the caller falls back to deterministic timing.
export function validateFollowUpDate(rawDate) {
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  if (isNaN(parsed.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parsedDate = new Date(parsed);
  parsedDate.setHours(0, 0, 0, 0);
  if (parsedDate < today) return null;
  const maxDate = new Date();
  maxDate.setHours(23, 59, 59, 999);
  maxDate.setDate(maxDate.getDate() + 30);
  if (parsedDate > maxDate) return null;
  return parsedDate.toISOString().slice(0, 10);
}

// Compute a due date from urgency + optional explicit follow-up date.
// The LLM's follow_up_date is validated first; if it fails validation, the
// deterministic urgency-based fallback is used instead.
export function dueDateFromUrgency(urgency, followUpDate) {
  const validated = validateFollowUpDate(followUpDate);
  if (validated) return validated;
  const today = new Date();
  const days = { urgent: 0, today: 0, follow_up: 3, routine: 7, upcoming: 14 };
  today.setDate(today.getDate() + (days[urgency] ?? 7));
  return today.toISOString().slice(0, 10);
}

// Determine whether a prior AI analysis warrants controlled re-analysis.
// Re-analysis is allowed when the prior result had low confidence, poor or
// unusable image quality, explicitly requested additional evidence, or
// appears to be an uncertainty (failure) placeholder.
export function canReanalyze(analysis) {
  if (!analysis) return true;
  if (analysis.confidence_level === CONFIDENCE_LEVELS.low) return true;
  if (analysis.image_quality === IMAGE_QUALITY_LEVELS.poor || analysis.image_quality === IMAGE_QUALITY_LEVELS.unusable) return true;
  if (analysis.additional_evidence_needed && String(analysis.additional_evidence_needed).trim()) return true;
  if (analysis.observation_summary === UNCERTAINTY_RESULT.observation_summary) return true;
  return false;
}

// Detect whether a new action duplicates an existing pending action (Part 8).
export function isDuplicateAction(existingPendingActions, newActionKey, plantId) {
  const newKey = String(newActionKey || "").toLowerCase().replace(/\s+/g, "_");
  if (!newKey) return false;
  return (existingPendingActions || []).some((a) => {
    if (a.plant_id !== plantId) return false;
    if (a.status !== "pending") return false;
    const existingTitle = String(a.title || "").toLowerCase().replace(/\s+/g, "_");
    return existingTitle.includes(newKey) || newKey.includes(existingTitle);
  });
}

// The uncertainty fallback result when AI processing fails (Part 10).
export const UNCERTAINTY_RESULT = {
  observation_summary: "Botany Betty couldn't analyze this update right now.",
  observations: [],
  possible_explanations: [],
  recommended_next_action: "observe",
  action_risk: "low",
  confidence_level: "low",
  urgency: "routine",
  follow_up_date: null,
  source_references: [],
  change_from_previous: "",
  image_quality: "unknown",
  additional_evidence_needed: "",
  higher_impact_considered: false,
  visible_growth_stage: "",
  flowering_present: false,
  fruit_present: false,
  visible_pest_possible: false
};