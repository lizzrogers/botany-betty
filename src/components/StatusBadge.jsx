import { CheckCircle2, Eye, AlertTriangle, AlertOctagon, Sprout, Leaf, Flame, Sun, RotateCw, CalendarCheck, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  healthy: "bg-status-healthy/10 text-status-healthy border-status-healthy/30",
  warning: "bg-status-warning/10 text-status-warning border-status-warning/30",
  alert: "bg-status-alert/10 text-status-alert border-status-alert/30",
  muted: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/30"
};

const ICONS = { CheckCircle2, Eye, AlertTriangle, AlertOctagon, Sprout, Leaf, Flame, Sun, RotateCw, CalendarCheck, CalendarClock };

export default function StatusBadge({ label, icon, tone = "muted", size = "sm", className }) {
  const Icon = ICONS[icon] || Leaf;
  const toneClass = TONE_STYLES[tone] || TONE_STYLES.muted;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-medium",
      size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
      toneClass,
      className
    )}>
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
      {label}
    </span>
  );
}