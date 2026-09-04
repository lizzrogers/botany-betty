// Centralized plant status configuration — never communicate status by color alone.
// Each status pairs a botanical icon, a text label, and a tone used for badge styling.

export const PLANT_STATUSES = {
  healthy: { label: "Healthy", icon: "Leaf", tone: "healthy", description: "Looking good" },
  watch: { label: "Watch", icon: "Eye", tone: "warning", description: "Keep an eye on it" },
  needs_attention: { label: "Needs Attention", icon: "AlertTriangle", tone: "warning", description: "Something needs a closer look" },
  serious_concern: { label: "Serious Concern", icon: "AlertOctagon", tone: "alert", description: "Act soon" },
  harvesting: { label: "Harvesting", icon: "Sprout", tone: "healthy", description: "Ready to harvest" },
  finished: { label: "Finished", icon: "CheckCircle2", tone: "muted", description: "Season ended" }
};

export const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", icon: "Flame", tone: "alert" },
  today: { label: "Today", icon: "Sun", tone: "warning" },
  follow_up: { label: "Follow-up", icon: "RotateCw", tone: "primary" },
  routine: { label: "Routine", icon: "CalendarCheck", tone: "muted" },
  upcoming: { label: "Upcoming", icon: "CalendarClock", tone: "muted" }
};

export const CONFIDENCE_CONFIG = {
  high: { label: "High confidence", description: "Clear recommendation supported by evidence.", tone: "healthy" },
  medium: { label: "Medium confidence", description: "Likely possibilities and a low-risk next step.", tone: "warning" },
  low: { label: "Low confidence", description: "More evidence is needed before drawing a conclusion.", tone: "alert" }
};

export const ENTRY_TYPE_CONFIG = {
  observation: { label: "Observation", icon: "Eye" },
  watered: { label: "Watered", icon: "Droplets" },
  harvest: { label: "Harvest", icon: "Sprout" },
  completed_task: { label: "Completed Task", icon: "CheckCircle2" },
  general: { label: "General", icon: "NotebookPen" },
  treatment: { label: "Treatment", icon: "FlaskConical" },
  planting: { label: "Planting", icon: "Sprout" }
};

export function getStatus(key) {
  return PLANT_STATUSES[key] || PLANT_STATUSES.healthy;
}
export function getPriority(key) {
  return PRIORITY_CONFIG[key] || PRIORITY_CONFIG.routine;
}
export function getConfidence(key) {
  return CONFIDENCE_CONFIG[key] || CONFIDENCE_CONFIG.medium;
}