"use client";

import { useMemo } from "react";
import { companies, overlappingNames } from "@/lib/data";
import { useCockpit } from "@/lib/store";
import { WarnIcon } from "./ui";

export default function OverlapAlert() {
  const overlapsOnly = useCockpit((s) => s.overlapsOnly);
  const toggleOverlapsOnly = useCockpit((s) => s.toggleOverlapsOnly);
  const selectedId = useCockpit((s) => s.selectedCompanyId);

  const { names, accounts } = useMemo(() => {
    const set = overlappingNames(companies);
    const accounts = companies.filter((c) => set.has(c.name.toLowerCase()));
    return { names: set, accounts };
  }, []);

  if (names.size === 0 || overlapsOnly || selectedId) return null;

  return (
    <button
      onClick={toggleOverlapsOnly}
      className="group pointer-events-auto absolute bottom-4 left-3 z-20 flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-2 pr-4 text-left shadow-card backdrop-blur-xl transition-all hover:bg-amber-400/15 sm:left-4"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/20 text-amber-300 animate-pulse-glow">
        <WarnIcon className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-amber-200">
          {names.size} accounts have rep overlap
        </span>
        <span className="block text-[11px] text-amber-200/70">
          {accounts.length} records · click to isolate them
        </span>
      </span>
      <span className="ml-1 text-amber-300/60 transition-transform group-hover:translate-x-0.5">→</span>
    </button>
  );
}
