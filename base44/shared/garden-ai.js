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
  "remove_dead_material"
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
    change_from_previous: raw.change_from_previous || ""
  };
}