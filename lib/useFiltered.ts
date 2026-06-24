"use client";

import { useMemo } from "react";
import { companies, overlappingNames, isOverlap } from "./data";
import { useCockpit } from "./store";
import type { Company } from "./types";

// Overlap detection runs on the FULL dataset so badges are stable regardless
// of the active filter. The rep filter + overlaps-only toggle then narrow the
// visible set shared by all three views.
export function useFiltered() {
  const repFilter = useCockpit((s) => s.repFilter);
  const overlapsOnly = useCockpit((s) => s.overlapsOnly);

  const overlaps = useMemo(() => overlappingNames(companies), []);

  const visible: Company[] = useMemo(() => {
    return companies.filter((c) => {
      if (repFilter !== "all" && c.ownerRep !== repFilter) return false;
      if (overlapsOnly && !isOverlap(c, overlaps)) return false;
      return true;
    });
  }, [repFilter, overlapsOnly, overlaps]);

  return { visible, overlaps };
}
