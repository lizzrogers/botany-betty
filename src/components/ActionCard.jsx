import React from "react";
import { useNavigate } from "react-router-dom";
import { Check, Clock, SkipForward, Trees, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { getPriority, getConfidence } from "@/lib/statusConfig";
import { relativeDate } from "@/lib/garden-data";

// Full-width outdoor-ready priority card with prominent action buttons.
export default function ActionCard({ action, plant, onComplete, onSnooze, onSkip, className }) {
  const navigate = useNavigate();
  const priority = getPriority(action.priority);

  const handleComplete = (e) => { e.stopPropagation(); onComplete?.(action); };
  const handleSnooze = (e) => { e.stopPropagation(); onSnooze?.(action); };
  const handleSkip = (e) => { e.stopPropagation(); onSkip?.(action); };
  const viewPlant = () => plant && navigate(`/plant/${plant.id}`);

  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-4 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge label={priority.label} icon={priority.icon} tone={priority.tone} />
            {action.due_date && (
              <span className="text-xs font-medium text-muted-foreground">{relativeDate(action.due_date)}</span>
            )}
          </div>
          <h3 className="font-display text-lg font-semibold mt-2 leading-tight">{action.title}</h3>
          {plant && (
            <button onClick={viewPlant} className="mt-1 flex items-center gap-1 text-sm text-primary font-medium hover:underline">
              <Leaf className="h-3.5 w-3.5" /> {plant.display_name}
            </button>
          )}
        </div>
      </div>

      {action.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{action.description}</p>}
      {action.reason && <p className="text-sm text-foreground/70 mt-1.5"><span className="font-medium">Why: </span>{action.reason}</p>}

      <div className="mt-4 flex items-center gap-2">
        <Button onClick={handleComplete} size="sm" className="tap-target flex-1 bg-primary hover:bg-primary/90">
          <Check className="h-4 w-4 mr-1.5" /> Complete
        </Button>
        <Button onClick={handleSnooze} variant="outline" size="sm" className="tap-target">
          <Clock className="h-4 w-4 mr-1.5" /> Snooze
        </Button>
        <Button onClick={handleSkip} variant="ghost" size="sm" className="tap-target text-muted-foreground">
          <SkipForward className="h-4 w-4 mr-1.5" /> Skip
        </Button>
      </div>
      {plant && (
        <button onClick={viewPlant} className="mt-2 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground py-1">
          View plant →
        </button>
      )}
    </div>
  );
}