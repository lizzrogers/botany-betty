import React from "react";
import { useNavigate } from "react-router-dom";
import { Image as ImageIcon, ArrowRight } from "lucide-react";
import { Image } from "@/components/ui/image";
import StatusBadge from "@/components/StatusBadge";
import { getStatus, getConfidence } from "@/lib/statusConfig";
import { formatDate } from "@/lib/garden-data";

const ACTIVITY_CHIPS = [
  { key: "watered", label: (n) => `${n} watered` },
  { key: "harvest", label: (n) => `${n} harvest${n === 1 ? "" : "s"}` },
  { key: "treatment", label: (n) => `${n} treatment${n === 1 ? "" : "s"}` },
  { key: "observation", label: (n) => `${n} observation${n === 1 ? "" : "s"}` }
];

export default function PlantWeekCard({ summary }) {
  const navigate = useNavigate();
  const { plant, verdict, entryCount, counts, analysisCount, latest } = summary;
  const status = getStatus(plant.current_status);
  const confidence = latest ? getConfidence(latest.confidence_level) : null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-primary/10">
          {plant.primary_photo ? (
            <Image src={plant.primary_photo} alt={plant.display_name} className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-6 w-6 text-primary/40" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display font-semibold leading-tight truncate">{plant.display_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {plant.plant_type}{plant.variety ? ` · ${plant.variety}` : ""}
              </p>
            </div>
            <StatusBadge label={verdict.label} icon={verdict.icon} tone={verdict.tone} className="shrink-0" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <StatusBadge label={status.label} icon={status.icon} tone={status.tone} />
        {entryCount > 0 && (
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {entryCount} journal update{entryCount === 1 ? "" : "s"}
          </span>
        )}
        {ACTIVITY_CHIPS.map((chip) =>
          counts[chip.key] ? (
            <span key={chip.key} className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              {chip.label(counts[chip.key])}
            </span>
          ) : null
        )}
        {analysisCount > 0 && (
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {analysisCount} AI check{analysisCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {latest ? (
        <div className="mt-3 rounded-xl bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Latest AI check</p>
            <span className="text-xs text-muted-foreground">{formatDate(latest.analysis_date)}</span>
          </div>
          <p className="text-sm leading-relaxed mt-1">{latest.observation_summary}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
            {confidence && <span className="text-muted-foreground">{confidence.label}</span>}
            {latest.recommended_next_action && (
              <span className="text-primary">Next: {latest.recommended_next_action.replace(/_/g, " ")}</span>
            )}
          </div>
          {latest.change_from_previous && (
            <p className="text-xs text-muted-foreground mt-1">Change: {latest.change_from_previous}</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No AI check this week.</p>
      )}

      <button
        onClick={() => navigate(`/plant/${plant.id}`)}
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline tap-target"
      >
        View plant <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}