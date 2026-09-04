import { cn } from "@/lib/utils";

// Script Leaf brand mark — a stylized letter B whose loops form botanical leaves.
// Temporary placeholder for the planned "Script Leaf" logo.
export default function BrandMark({ className, showWordmark = true }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden="true">
          {/* Stylized B with leaf-loop forms */}
          <path
            d="M11 7c0 0 0 9 0 18M11 7c4 0 7 1.5 7 5s-3 5-7 5c4 0 8 1.5 8 5.5s-4 5.5-8 5.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 11.5c1.8-1 3.2-1 4.5 0M18.5 20c1.8 1 3.2 1 4.5 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className="font-display text-lg font-semibold leading-none tracking-tight text-foreground">
          Botany Betty
        </span>
      )}
    </div>
  );
}