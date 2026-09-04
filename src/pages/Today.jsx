import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useGarden } from "@/lib/garden-context";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Droplets, Sprout, Plus, CalendarDays, Thermometer, ArrowRight, Check } from "lucide-react";
import ActionCard from "@/components/ActionCard";
import PlantCard from "@/components/PlantCard";
import StatusBadge from "@/components/StatusBadge";
import { getStatus } from "@/lib/statusConfig";
import { fetchPendingActions, fetchActivePlants, plantsNeedingAttention, fetchWeatherSnapshot } from "@/lib/garden-data";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Today() {
  const { user, activeGarden, loading, needsOnboarding } = useGarden();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [actions, setActions] = useState([]);
  const [plants, setPlants] = useState([]);
  const [weather, setWeather] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dismissedWeather, setDismissedWeather] = useState(false);

  useEffect(() => {
    if (needsOnboarding) { navigate("/onboarding"); return; }
    if (!activeGarden) return;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      try {
        const [a, p, w] = await Promise.all([
          fetchPendingActions(activeGarden.id),
          fetchActivePlants(activeGarden.id),
          fetchWeatherSnapshot(activeGarden.id)
        ]);
        if (!cancelled) { setActions(a); setPlants(p); setWeather(w); }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeGarden, needsOnboarding, navigate]);

  const attentionPlants = plantsNeedingAttention(plants);
  const greeting = getGreeting();
  const firstName = (user?.full_name || user?.email || "gardener").split(" ")[0].split("@")[0];
  const attentionCount = actions.length + attentionPlants.length;

  const updateAction = async (action, updates, toastMsg) => {
    try {
      await base44.entities.GardenAction.update(action.id, updates);
      setActions((prev) => prev.filter((a) => a.id !== action.id));
      if (toastMsg) toast({ description: toastMsg });
    } catch (e) {
      toast({ variant: "destructive", description: "Could not update that action." });
    }
  };

  const completeAction = (action) => updateAction(action, { status: "completed", completed_date: new Date().toISOString() }, "Nice work — marked complete.");
  const snoozeAction = (action) => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    updateAction(action, { status: "snoozed", snoozed_until: tomorrow.toISOString().slice(0, 10) }, "Snoozed until tomorrow.");
  };
  const skipAction = (action) => updateAction(action, { status: "skipped", skipped_date: new Date().toISOString() }, "Skipped.");

  const quickWater = async () => {
    if (!activeGarden) return;
    try {
      await base44.entities.WateringRecord.create({
        garden_id: activeGarden.id,
        timestamp: new Date().toISOString(),
        source: "quick_action",
        note: "Watered from Today"
      });
      toast({ description: "Watering recorded." });
    } catch { toast({ variant: "destructive", description: "Could not record watering." }); }
  };

  const quickHarvest = () => navigate("/add-update?type=harvest");

  if (loading || dataLoading) return <PageSkeleton />;

  const showWeatherAlert = weather && weather.alert_type && weather.alert_type !== "none" && !dismissedWeather;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground font-medium">{greeting}</p>
        <h1 className="font-display font-semibold leading-tight mt-1" style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>
          {firstName}
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          {attentionCount === 0
            ? "Everything looks tended to. Enjoy your garden."
            : `${attentionCount} ${attentionCount === 1 ? "thing" : "things"} need your attention today.`}
        </p>
      </div>

      {/* Weather alert band */}
      {showWeatherAlert && (
        <WeatherAlert weather={weather} onDismiss={() => setDismissedWeather(true)} />
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-8">
        <QuickAction icon={Droplets} label="Watered" onClick={quickWater} />
        <QuickAction icon={Sprout} label="Add Harvest" onClick={quickHarvest} />
        <QuickAction icon={Plus} label="Add Update" onClick={() => navigate("/add-update")} highlight />
      </div>

      {/* Today's Priorities */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">Today's Priorities</h2>
          {actions.length > 0 && <span className="text-sm text-muted-foreground">{actions.length} pending</span>}
        </div>
        {actions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
            <Check className="h-8 w-8 text-status-healthy mx-auto mb-2" />
            <p className="text-muted-foreground">No pending tasks. Your garden is caught up.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => {
              const plant = plants.find((p) => p.id === action.plant_id);
              return (
                <ActionCard
                  key={action.id}
                  action={action}
                  plant={plant}
                  onComplete={completeAction}
                  onSnooze={snoozeAction}
                  onSkip={skipAction}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Plants Needing Attention */}
      {attentionPlants.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-xl font-bold mb-4">Plants Needing Attention</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            {attentionPlants.map((plant) => (
              <div key={plant.id} className="shrink-0 w-44">
                <PlantCard plant={plant} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* This Week Preview */}
      <section>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">This Week</h2>
          </div>
          <p className="text-muted-foreground text-sm">Your prioritized weekly garden plan.</p>
          <Button onClick={() => navigate("/this-week")} variant="outline" className="tap-target w-full mt-4">
            View weekly plan <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function WeatherAlert({ weather, onDismiss }) {
  const alertLabels = { heat: "Heat Alert", frost: "Frost Alert", wind: "Wind Alert", rain: "Rain Alert" };
  const label = alertLabels[weather.alert_type] || "Weather Alert";
  const temp = weather.forecast_high || weather.current_temp;
  const msg = weather.alert_type === "heat"
    ? `${temp ? temp + "°F forecast. " : ""}Check soil moisture around young and recently transplanted plants this evening.`
    : weather.alert_type === "frost"
    ? `Low of ${weather.forecast_low}°F forecast. Consider covering tender crops tonight.`
    : `Weather conditions may affect your garden.`;
  return (
    <div className="mb-6 rounded-2xl border border-status-alert/30 bg-status-alert/5 p-4 flex items-start gap-3">
      <Thermometer className="h-5 w-5 text-status-alert shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-status-alert">{label}</p>
        <p className="text-sm text-foreground/80 mt-0.5">{msg}</p>
      </div>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground text-sm shrink-0">Dismiss</button>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, highlight }) {
  return (
    <button
      onClick={onClick}
      className={`tap-target flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 font-medium text-sm transition-colors ${
        highlight ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8 animate-pulse">
      <div className="h-4 w-24 bg-muted rounded mb-2" />
      <div className="h-10 w-48 bg-muted rounded mb-2" />
      <div className="h-5 w-64 bg-muted/60 rounded" />
      <div className="grid grid-cols-3 gap-2 mt-8 mb-8">
        <div className="h-20 bg-muted rounded-2xl" /><div className="h-20 bg-muted rounded-2xl" /><div className="h-20 bg-muted rounded-2xl" />
      </div>
      <div className="h-40 bg-muted rounded-2xl mb-4" />
      <div className="h-40 bg-muted rounded-2xl" />
    </div>
  );
}