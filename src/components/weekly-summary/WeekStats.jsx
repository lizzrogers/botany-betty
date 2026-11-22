import React from "react";
import { Leaf, NotebookPen, FlaskConical, Sprout } from "lucide-react";

const STATS = [
  { key: "plants", label: "Plants tracked", icon: Leaf },
  { key: "updates", label: "Journal updates", icon: NotebookPen },
  { key: "analyses", label: "AI checks", icon: FlaskConical },
  { key: "harvests", label: "Harvests logged", icon: Sprout }
];

export default function WeekStats({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-6">
      {STATS.map((stat) => (
        <div key={stat.key} className="rounded-2xl border border-border bg-surface p-4">
          <stat.icon className="h-4 w-4 text-primary mb-2" aria-hidden="true" />
          <p className="font-display text-2xl font-semibold leading-none">{stats[stat.key] ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1.5">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}