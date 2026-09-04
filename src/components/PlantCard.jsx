import React from "react";
import { useNavigate } from "react-router-dom";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import { getStatus } from "@/lib/statusConfig";

// Photo-first plant card with high-contrast health badge (text + icon, never color alone).
export default function PlantCard({ plant, areaName, onClick, className }) {
  const navigate = useNavigate();
  const status = getStatus(plant.current_status);
  const handleClick = onClick || (() => navigate(`/plant/${plant.id}`));

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left transition-shadow hover:shadow-md w-full",
        className
      )}
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {plant.primary_photo ? (
          <img src={plant.primary_photo} alt={plant.display_name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10">
            <ImageIcon className="h-10 w-10 text-primary/40" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <StatusBadge label={status.label} icon={status.icon} tone={status.tone} />
        </div>
      </div>
      <div className="p-3">
        <p className="font-display font-semibold text-foreground leading-tight">{plant.display_name}</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {plant.plant_type}{plant.variety ? ` · ${plant.variety}` : ""}
        </p>
        {areaName && <p className="text-xs text-muted-foreground mt-1">{areaName}</p>}
      </div>
    </button>
  );
}