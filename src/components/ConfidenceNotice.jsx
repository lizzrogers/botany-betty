import React from "react";
import { cn } from "@/lib/utils";
import { getConfidence } from "@/lib/statusConfig";
import { ShieldQuestion, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";

// Renders the confidence level with explicit text — never presents an
// uncertain diagnosis as fact.
export default function ConfidenceNotice({ level, className }) {
  const conf = getConfidence(level);
  const Icon = level === "high" ? CheckCircle2 : level === "medium" ? AlertTriangle : AlertOctagon;
  const tone = level === "high" ? "text-status-healthy" : level === "medium" ? "text-status-warning" : "text-status-alert";
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3", className)}>
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", tone)} aria-hidden="true" />
      <div>
        <p className={cn("text-sm font-semibold", tone)}>{conf.label}</p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{conf.description}</p>
      </div>
    </div>
  );
}