import { companies, isOpen, statusOf, territoryOf, REPS } from "./data";
import type { Company, Stage } from "./types";

// Fake but believable quotas (won $ targets). Quarterly per rep; team = sum.
export const QUARTER_QUOTA_PER_REP = 220_000;

const sum = (l: Company[]) => l.reduce((s, c) => s + c.dealValue, 0);

export interface TeamMetrics {
  scopeRep: string; // "all" or rep
  scopeTerritory: string; // "all" or territory
  reps: number; // # of reps in scope (for quota math)
  accounts: number;
  prospects: number;
  open: number;
  won: number;
  lost: number;
  openValue: number;
  wonValue: number;
  byStage: Record<Stage, number>;
  quarter: { actual: number; target: number; pct: number };
  year: { actual: number; target: number; pct: number };
}

export function computeMetrics(rep: string, territory: string): TeamMetrics {
  const list = companies.filter(
    (c) =>
      (rep === "all" || c.ownerRep === rep) &&
      (territory === "all" || territoryOf(c.country) === territory)
  );

  const prospects = list.filter((c) => c.stage === "Prospecting").length;
  const open = list.filter(isOpen);
  const won = list.filter((c) => statusOf(c) === "Won");
  const lost = list.filter((c) => statusOf(c) === "Lost");

  const byStage = {} as Record<Stage, number>;
  for (const c of list) byStage[c.stage] = (byStage[c.stage] ?? 0) + 1;

  const repsInScope = rep === "all" ? REPS.length : 1;
  const wonValue = sum(won);
  const qTarget = QUARTER_QUOTA_PER_REP * repsInScope;
  // Yearly: target is 4 quarters; "actual" simulates cumulative progress so the
  // two bars read differently in the demo.
  const yTarget = qTarget * 4;
  const yActual = Math.round(wonValue * 2.7);

  return {
    scopeRep: rep,
    scopeTerritory: territory,
    reps: repsInScope,
    accounts: list.length,
    prospects,
    open: open.length,
    won: won.length,
    lost: lost.length,
    openValue: sum(open),
    wonValue,
    byStage,
    quarter: { actual: wonValue, target: qTarget, pct: qTarget ? wonValue / qTarget : 0 },
    year: { actual: yActual, target: yTarget, pct: yTarget ? yActual / yTarget : 0 },
  };
}
