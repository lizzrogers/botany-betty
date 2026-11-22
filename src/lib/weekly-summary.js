// Weekly plant performance helpers.
// Combines journal activity with AI analysis records for a rolling 7-day window.

export const WEEK_DAYS = 7;

export const WEEK_VERDICTS = {
  attention: { key: "attention", label: "Needs attention", icon: "AlertTriangle", tone: "alert", rank: 0 },
  watch: { key: "watch", label: "Watch", icon: "Eye", tone: "warning", rank: 1 },
  steady: { key: "steady", label: "Steady", icon: "Leaf", tone: "healthy", rank: 2 },
  on_track: { key: "on_track", label: "On track", icon: "CheckCircle2", tone: "healthy", rank: 2 },
  updates_only: { key: "updates_only", label: "Updates only", icon: "CalendarCheck", tone: "muted", rank: 3 },
  quiet: { key: "quiet", label: "Quiet week", icon: "CalendarCheck", tone: "muted", rank: 4 }
};

// Local midnight of the first day in the window (today included).
export function getWeekStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (WEEK_DAYS - 1));
  return d;
}

export function isWithinWeek(dateValue, weekStart) {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  return !Number.isNaN(d.getTime()) && d >= weekStart;
}

function verdictFor(plant, latest, entries) {
  if (latest) {
    if (latest.urgency === "urgent" || latest.urgency === "today") return WEEK_VERDICTS.attention;
    if (latest.urgency === "follow_up") return WEEK_VERDICTS.watch;
    const noAbnormality = /no meaningful abnormality/i.test(latest.observation_summary || "");
    return noAbnormality ? WEEK_VERDICTS.steady : WEEK_VERDICTS.on_track;
  }
  if (plant.current_status === "serious_concern" || plant.current_status === "needs_attention") {
    return WEEK_VERDICTS.attention;
  }
  if (plant.current_status === "watch") return WEEK_VERDICTS.watch;
  return entries.length > 0 ? WEEK_VERDICTS.updates_only : WEEK_VERDICTS.quiet;
}

export function buildPlantWeekSummaries({ plants, journalEntries, analyses, weekStart }) {
  return (plants || []).map((plant) => {
    const entries = (journalEntries || [])
      .filter((e) => (e.plant_ids || []).includes(plant.id) && isWithinWeek(e.created_date, weekStart))
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    const plantAnalyses = (analyses || [])
      .filter((a) => a.plant_id === plant.id && isWithinWeek(a.analysis_date, weekStart))
      .sort((a, b) => new Date(b.analysis_date) - new Date(a.analysis_date));

    const counts = entries.reduce((acc, entry) => {
      const key = entry.entry_type || "general";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const latest = plantAnalyses[0] || null;

    return {
      plant,
      entries,
      entryCount: entries.length,
      counts,
      analyses: plantAnalyses,
      analysisCount: plantAnalyses.length,
      activityCount: entries.length + plantAnalyses.length,
      latest,
      verdict: verdictFor(plant, latest, entries)
    };
  });
}