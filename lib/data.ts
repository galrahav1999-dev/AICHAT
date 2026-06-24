import raw from "@/data/companies.json";
import type { Company, CountryAgg, CityAgg, Dataset, Stage } from "./types";

export const dataset = raw as Dataset;
export const companies: Company[] = dataset.companies;
export const REPS = dataset.reps;
export const STAGES = dataset.stages;

// "Today" for the prototype is pinned so the demo is stable.
export const TODAY = new Date("2026-06-24T12:00:00Z");

export const STAGE_ORDER: Stage[] = [
  "Prospecting",
  "Qualified",
  "Demo",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

// Color language for stages — used across globe, map, list and board.
export const STAGE_COLORS: Record<Stage, string> = {
  Prospecting: "#64748b",
  Qualified: "#38bdf8",
  Demo: "#818cf8",
  Proposal: "#a78bfa",
  Negotiation: "#f59e0b",
  "Closed Won": "#22c55e",
  "Closed Lost": "#ef4444",
};

export const REP_COLORS: Record<string, string> = {};
const REP_PALETTE = ["#6366f1", "#ec4899", "#14b8a6", "#f97316", "#a855f7"];
REPS.forEach((rep, i) => {
  REP_COLORS[rep] = REP_PALETTE[i % REP_PALETTE.length];
});

export function fmtMoney(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v}`;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function daysFromToday(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T12:00:00Z");
  return Math.round((d.getTime() - TODAY.getTime()) / 86_400_000);
}

export function relativeFromToday(iso: string | null): string {
  const n = daysFromToday(iso);
  if (n === null) return "—";
  if (n === 0) return "today";
  if (n < 0) return `${Math.abs(n)}d ago`;
  return `in ${n}d`;
}

const norm = (s: string) => s.trim().toLowerCase();

// Set of company names worked by more than one rep -> account overlaps.
export function overlappingNames(list: Company[] = companies): Set<string> {
  const byName = new Map<string, Set<string>>();
  for (const c of list) {
    const key = norm(c.name);
    if (!byName.has(key)) byName.set(key, new Set());
    byName.get(key)!.add(c.ownerRep);
  }
  const out = new Set<string>();
  for (const [name, reps] of byName) if (reps.size > 1) out.add(name);
  return out;
}

export function isOverlap(company: Company, overlaps: Set<string>): boolean {
  return overlaps.has(norm(company.name));
}

export function repsForName(name: string, list: Company[] = companies): string[] {
  const set = new Set<string>();
  for (const c of list) if (norm(c.name) === norm(name)) set.add(c.ownerRep);
  return [...set];
}

const OPEN_STAGES: Stage[] = ["Prospecting", "Qualified", "Demo", "Proposal", "Negotiation"];
export const isOpen = (c: Company) => OPEN_STAGES.includes(c.stage);

export function aggregateByCountry(list: Company[]): CountryAgg[] {
  const map = new Map<string, CountryAgg>();
  for (const c of list) {
    const a = map.get(c.country) ?? {
      country: c.country,
      lat: 0,
      lng: 0,
      totalValue: 0,
      dealCount: 0,
    };
    a.totalValue += c.dealValue;
    a.dealCount += 1;
    a.lat += c.lat;
    a.lng += c.lng;
    map.set(c.country, a);
  }
  return [...map.values()].map((a) => ({
    ...a,
    lat: a.lat / a.dealCount,
    lng: a.lng / a.dealCount,
  }));
}

export function aggregateByCity(list: Company[], country: string): CityAgg[] {
  const map = new Map<string, CityAgg>();
  for (const c of list) {
    if (c.country !== country) continue;
    const a = map.get(c.city) ?? {
      city: c.city,
      country: c.country,
      lat: 0,
      lng: 0,
      totalValue: 0,
      dealCount: 0,
    };
    a.totalValue += c.dealValue;
    a.dealCount += 1;
    a.lat += c.lat;
    a.lng += c.lng;
    map.set(c.city, a);
  }
  return [...map.values()].map((a) => ({
    ...a,
    lat: a.lat / a.dealCount,
    lng: a.lng / a.dealCount,
  }));
}

// Follow-ups that are "due": open deals whose nextFollowUp is today or past.
export function dueFollowUps(list: Company[]): Company[] {
  return list
    .filter((c) => isOpen(c) && c.nextFollowUp && (daysFromToday(c.nextFollowUp) ?? 1) <= 0)
    .sort((a, b) => (daysFromToday(a.nextFollowUp!) ?? 0) - (daysFromToday(b.nextFollowUp!) ?? 0));
}
