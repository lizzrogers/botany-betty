import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useGarden } from "@/lib/garden-context";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchActivePlants, fetchJournalEntries } from "@/lib/garden-data";
import { buildPlantWeekSummaries, getWeekStart, isWithinWeek } from "@/lib/weekly-summary";
import WeekStats from "@/components/weekly-summary/WeekStats";
import PlantWeekCard from "@/components/weekly-summary/PlantWeekCard";

function formatRange(start, end) {
  const opts = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

export default function WeeklySummary() {
  const navigate = useNavigate();
  const { activeGarden, needsOnboarding } = useGarden();
  const [plants, setPlants] = useState([]);
  const [journal, setJournal] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  const weekStart = useMemo(() => getWeekStart(), []);

  useEffect(() => {
    if (needsOnboarding) { navigate("/onboarding"); return; }
    if (!activeGarden) return;
    (async () => {
      setLoading(true);
      try {
        const activePlants = await fetchActivePlants(activeGarden.id);
        const plantIds = activePlants.map((p) => p.id);
        const [entries, plantAnalyses] = await Promise.all([
          fetchJournalEntries(activeGarden.id, 100),
          plantIds.length
            ? base44.entities.AIAnalysis.filter(
                { plant_id: { $in: plantIds }, analysis_date: { $gte: weekStart.toISOString() } },
                "-analysis_date"
              )
            : Promise.resolve([])
        ]);
        setPlants(activePlants);
        setJournal(entries);
        setAnalyses(plantAnalyses);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeGarden, needsOnboarding, navigate, weekStart]);

  const summaries = useMemo(
    () =>
      buildPlantWeekSummaries({ plants, journalEntries: journal, analyses, weekStart }).sort(
        (a, b) => a.verdict.rank - b.verdict.rank || b.activityCount - a.activityCount
      ),
    [plants, journal, analyses, weekStart]
  );

  const weekEntries = journal.filter((e) => isWithinWeek(e.created_date, weekStart));

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded mb-3" />
        <div className="h-4 w-64 bg-muted/60 rounded mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          <div className="h-24 bg-muted rounded-2xl" />
          <div className="h-24 bg-muted rounded-2xl" />
          <div className="h-24 bg-muted rounded-2xl" />
          <div className="h-24 bg-muted rounded-2xl" />
        </div>
        <div className="h-40 bg-muted rounded-2xl mb-3" />
        <div className="h-40 bg-muted rounded-2xl" />
      </div>
    );
  }

  const stats = {
    plants: summaries.length,
    updates: weekEntries.length,
    analyses: analyses.length,
    harvests: weekEntries.filter((e) => e.entry_type === "harvest").length
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Today
      </button>

      <div className="flex items-center gap-2 mb-1">
        <CalendarRange className="h-6 w-6 text-primary" aria-hidden="true" />
        <h1 className="font-display text-3xl font-semibold">Last 7 Days</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        How each plant performed · {formatRange(weekStart, new Date())}
      </p>

      <WeekStats stats={stats} />

      {summaries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <CalendarRange className="h-10 w-10 text-primary/40 mx-auto mb-3" aria-hidden="true" />
          <p className="text-muted-foreground mb-4">Add plants to your garden to see their weekly performance.</p>
          <Button onClick={() => navigate("/garden")} className="tap-target">Go to My Garden</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((summary) => (
            <PlantWeekCard key={summary.plant.id} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}