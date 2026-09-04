import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useGarden } from "@/lib/garden-context";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, Flame, Sun, RotateCw, CalendarCheck, Sprout, Check, Lock } from "lucide-react";
import { fetchPendingActions, fetchActivePlants, fetchWeatherSnapshot, priorityRank } from "@/lib/garden-data";

const SECTIONS = [
  { key: "urgent", label: "Highest Priority", icon: Flame },
  { key: "weather", label: "Weather Preparation", icon: Sun },
  { key: "follow_up", label: "Follow-ups", icon: RotateCw },
  { key: "routine", label: "Routine Garden Care", icon: CalendarCheck },
  { key: "harvest", label: "Harvest / Coming Soon", icon: Sprout }
];

export default function ThisWeek() {
  const navigate = useNavigate();
  const { activeGarden, needsOnboarding } = useGarden();
  const { toast } = useToast();
  const [actions, setActions] = useState([]);
  const [plants, setPlants] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (needsOnboarding) { navigate("/onboarding"); return; }
    if (!activeGarden) return;
    (async () => {
      try {
        const [a, p, w] = await Promise.all([
          fetchPendingActions(activeGarden.id),
          fetchActivePlants(activeGarden.id),
          fetchWeatherSnapshot(activeGarden.id)
        ]);
        setActions(a); setPlants(p); setWeather(w);
      } finally { setLoading(false); }
    })();
  }, [activeGarden, needsOnboarding]);

  const completeAction = async (action) => {
    await base44.entities.GardenAction.update(action.id, { status: "completed", completed_date: new Date().toISOString() });
    setActions((prev) => prev.filter((a) => a.id !== action.id));
    toast({ description: "Marked complete." });
  };

  // Group actions into weekly sections
  const grouped = {};
  for (const s of SECTIONS) grouped[s.key] = [];
  for (const a of actions) {
    if (a.source_type === "weather") grouped.weather.push(a);
    else if (a.priority === "urgent" || a.priority === "today") grouped.urgent.push(a);
    else if (a.priority === "follow_up") grouped.follow_up.push(a);
    else grouped.routine.push(a);
  }
  // Harvest section: plants in harvesting status
  const harvestPlants = plants.filter((p) => p.current_status === "harvesting");

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse"><div className="h-8 w-40 bg-muted rounded mb-6" /><div className="h-24 bg-muted rounded-2xl mb-3" /><div className="h-24 bg-muted rounded-2xl" /></div>;

  const hasContent = SECTIONS.some((s) => grouped[s.key]?.length > 0) || harvestPlants.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Today
      </button>
      <div className="flex items-center gap-2 mb-6">
        <CalendarDays className="h-6 w-6 text-primary" />
        <h1 className="font-display text-3xl font-semibold">This Week</h1>
      </div>
      <p className="text-muted-foreground mb-6">Your prioritized weekly garden plan.</p>

      {weather?.alert_type && weather.alert_type !== "none" && (
        <div className="mb-6 rounded-2xl border border-status-alert/30 bg-status-alert/5 p-4">
          <p className="font-semibold text-status-alert">Weather: {weather.alert_type}</p>
          <p className="text-sm text-foreground/80 mt-0.5">Forecast high {weather.forecast_high}°F / low {weather.forecast_low}°F</p>
        </div>
      )}

      {!hasContent ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <CalendarCheck className="h-10 w-10 text-primary/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Your garden is caught up for the week. Check back as new tasks come up.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const items = section.key === "harvest" ? harvestPlants : grouped[section.key];
            if (!items || items.length === 0) return null;
            return (
              <section key={section.key}>
                <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
                  <section.icon className="h-5 w-5 text-primary" /> {section.label}
                </h2>
                <div className="space-y-2">
                  {section.key === "harvest" ? (
                    items.map((plant) => (
                      <div key={plant.id} className="rounded-2xl border border-border bg-surface p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{plant.display_name}</p>
                          <p className="text-sm text-muted-foreground">{plant.plant_type} — ready to harvest</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/plant/${plant.id}`)} className="tap-target">View</Button>
                      </div>
                    ))
                  ) : (
                    items.map((action) => {
                      const plant = plants.find((p) => p.id === action.plant_id);
                      return (
                        <div key={action.id} className="rounded-2xl border border-border bg-surface p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">{action.title}</p>
                              {plant && <button onClick={() => navigate(`/plant/${plant.id}`)} className="text-sm text-primary hover:underline">{plant.display_name}</button>}
                              {action.reason && <p className="text-sm text-muted-foreground mt-1">{action.reason}</p>}
                            </div>
                            <Button size="sm" onClick={() => completeAction(action)} className="tap-target shrink-0">
                              <Check className="h-4 w-4 mr-1" /> Done
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}

          {/* Premium teaser */}
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center">
            <Lock className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Premium members get a fully personalized, weather-aware weekly plan with deeper follow-ups.</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="tap-target mt-3">Learn about Premium</Button>
          </div>
        </div>
      )}
    </div>
  );
}