"use client";

import { STAGE_COLORS, REP_COLORS } from "@/lib/data";
import type { Stage } from "@/lib/types";

export function StageBadge({ stage, className = "" }: { stage: Stage; className?: string }) {
  const c = STAGE_COLORS[stage];
  return (
    <span
      className={`chip ${className}`}
      style={{ backgroundColor: `${c}1f`, color: c, boxShadow: `inset 0 0 0 1px ${c}33` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
      {stage}
    </span>
  );
}

export function RepAvatar({ rep, size = 22 }: { rep: string; size?: number }) {
  const initials = rep
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const c = REP_COLORS[rep] ?? "#6366f1";
  return (
    <span
      title={rep}
      className="inline-flex items-center justify-center rounded-full font-semibold text-white ring-1 ring-white/10"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, ${c}, ${c}99)`,
      }}
    >
      {initials}
    </span>
  );
}

export function OverlapBadge({
  reps,
  compact = false,
}: {
  reps?: string[];
  compact?: boolean;
}) {
  return (
    <span
      className="chip animate-pulse-glow"
      style={{
        backgroundColor: "rgba(245,158,11,0.14)",
        color: "#fbbf24",
        boxShadow: "inset 0 0 0 1px rgba(245,158,11,0.4)",
      }}
      title={reps ? `Worked by ${reps.join(", ")}` : "Multiple reps on this account"}
    >
      <WarnIcon className="h-3 w-3" />
      {compact ? "Overlap" : reps ? `${reps.length} reps` : "Overlap"}
    </span>
  );
}

export function WarnIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3v4m0 10v4m9-9h-4M7 12H3m13.5-5.5-2.8 2.8m-5.4 5.4-2.8 2.8m11 0-2.8-2.8M8.3 8.3 5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
