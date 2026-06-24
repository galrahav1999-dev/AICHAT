"use client";

import { useMemo } from "react";
import {
  companies,
  overlappingNames,
  isOverlap,
  territoryOf,
  sizeOf,
  statusOf,
} from "./data";
import { useCockpit } from "./store";
import type { Company } from "./types";

// Overlap detection runs on the FULL dataset so badges are stable regardless
// of the active filter. The filters + local row edits then narrow the visible
// set shared by all three views.
export function useFiltered() {
  const repFilter = useCockpit((s) => s.repFilter);
  const overlapsOnly = useCockpit((s) => s.overlapsOnly);
  const territoryFilter = useCockpit((s) => s.territoryFilter);
  const sizeFilter = useCockpit((s) => s.sizeFilter);
  const statusFilter = useCockpit((s) => s.statusFilter);
  const stageFilter = useCockpit((s) => s.stageFilter);
  const stageOverrides = useCockpit((s) => s.stageOverrides);
  const removedIds = useCockpit((s) => s.removedIds);
  const extraRows = useCockpit((s) => s.extraRows);

  const overlaps = useMemo(() => overlappingNames(companies), []);

  // Base set: dataset + locally added rows − locally removed rows, with stage
  // overrides (board drag) applied so every view stays in sync.
  const base: Company[] = useMemo(() => {
    const removed = new Set(removedIds);
    return [...companies, ...extraRows]
      .filter((c) => !removed.has(c.id))
      .map((c) => (stageOverrides[c.id] ? { ...c, stage: stageOverrides[c.id] } : c));
  }, [stageOverrides, removedIds, extraRows]);

  const visible: Company[] = useMemo(() => {
    return base.filter((c) => {
      if (repFilter !== "all" && c.ownerRep !== repFilter) return false;
      if (overlapsOnly && !isOverlap(c, overlaps)) return false;
      if (territoryFilter !== "all" && territoryOf(c.country) !== territoryFilter) return false;
      if (sizeFilter !== "all" && sizeOf(c.dealValue) !== sizeFilter) return false;
      if (statusFilter !== "all" && statusOf(c) !== statusFilter) return false;
      if (stageFilter !== "all" && c.stage !== stageFilter) return false;
      return true;
    });
  }, [base, repFilter, overlapsOnly, territoryFilter, sizeFilter, statusFilter, stageFilter, overlaps]);

  return { visible, overlaps, base };
}
