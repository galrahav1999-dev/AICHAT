"use client";

import { useMemo } from "react";
import {
  companies,
  fmtMoney,
  fmtDate,
  relativeFromToday,
  daysFromToday,
  repColor,
  repsForName,
  overlappingNames,
  statusOf,
  STAGE_ORDER,
} from "@/lib/data";
import { useCockpit } from "@/lib/store";
import { RepAvatar, StageBadge, SparkIcon, WarnIcon } from "./ui";
import type { Company } from "@/lib/types";

// Deterministic 0..1 from a string (so a company's "stats" never change).
function seeded(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}
const clamp = (n: number, lo = 0, hi = 99) => Math.max(lo, Math.min(hi, Math.round(n)));

const STAGE_CODE: Record<string, string> = {
  Prospecting: "PRS",
  Qualified: "QAL",
  Demo: "DEM",
  Proposal: "PRP",
  Negotiation: "NEG",
  "Closed Won": "WON",
  "Closed Lost": "LST",
};
const WIN_BY_STAGE: Record<string, number> = {
  Prospecting: 12,
  Qualified: 28,
  Demo: 45,
  Proposal: 62,
  Negotiation: 82,
  "Closed Won": 100,
  "Closed Lost": 3,
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function rarityOf(rating: number) {
  if (rating >= 86) return { name: "Legendary", grad: ["#fde68a", "#f59e0b", "#b45309"], text: "#3a2a06" };
  if (rating >= 76) return { name: "Gold", grad: ["#fcd34d", "#d4a017", "#a8780f"], text: "#3a2a06" };
  if (rating >= 66) return { name: "Silver", grad: ["#e2e8f0", "#94a3b8", "#64748b"], text: "#1e293b" };
  return { name: "Bronze", grad: ["#e7b08a", "#b97a4e", "#8a5733"], text: "#2a1607" };
}

export default function CompanyCardReveal() {
  const drill = useCockpit((s) => s.drill);
  const selectedId = useCockpit((s) => s.selectedCompanyId);
  const stageOverrides = useCockpit((s) => s.stageOverrides);
  const drillUp = useCockpit((s) => s.drillUp);
  const togglePanel = useCockpit((s) => s.togglePanel);

  const overlaps = useMemo(() => overlappingNames(), []);
  const base = (selectedId ? companies.find((c) => c.id === selectedId) : null) ?? null;
  const company: Company | null = base && stageOverrides[base.id] ? { ...base, stage: stageOverrides[base.id] } : base;

  const open = !!company && drill === "company";

  const stats = useMemo(() => {
    if (!company) return null;
    const s = seeded(company.id);
    const s2 = seeded(company.id + "x");
    const days = Math.abs(daysFromToday(company.lastActivity) ?? 20);
    const VAL = clamp((company.dealValue / 500_000) * 99, 20);
    const WIN = WIN_BY_STAGE[company.stage] ?? 30;
    const ENG = clamp(99 - days * 4, 25);
    const MOM = clamp(55 + s * 40);
    const REL = clamp(50 + s2 * 45);
    const STG = clamp((STAGE_ORDER.indexOf(company.stage) / 6) * 99, 8);
    const rating = clamp((VAL + WIN + ENG + MOM) / 4, 48);
    return { VAL, WIN, ENG, MOM, REL, STG, rating };
  }, [company]);

  if (!open || !company || !stats) return null;

  const accent = repColor(company.ownerRep);
  const rarity = rarityOf(stats.rating);
  const isOverlap = overlaps.has(company.name.toLowerCase());
  const otherReps = repsForName(company.name).filter((r) => r !== company.ownerRep);
  const overdue = (daysFromToday(company.nextFollowUp) ?? 1) <= 0 && company.nextFollowUp;
  const logoGrad = `linear-gradient(135deg, ${accent}, ${accent}66)`;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
      {/* backdrop */}
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-md" onClick={drillUp} />

      <div
        key={company.id}
        className="relative z-10 flex max-h-full w-full max-w-4xl flex-col items-stretch gap-5 overflow-y-auto lg:flex-row lg:items-center"
      >
        {/* ---- FIFA-style card ---- */}
        <div className="flex shrink-0 justify-center [perspective:1400px]">
          <div
            className="card-reveal relative h-[420px] w-[290px] overflow-hidden rounded-[26px] p-[2px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
            style={{ background: `linear-gradient(160deg, ${rarity.grad[0]}, ${rarity.grad[1]} 55%, ${rarity.grad[2]})` }}
          >
            <div className="card-shine" />
            <div className="relative flex h-full w-full flex-col rounded-[24px] bg-black/10 px-5 py-4" style={{ color: rarity.text }}>
              {/* top: rating + position + owner */}
              <div className="flex items-start justify-between">
                <div className="leading-none">
                  <div className="text-5xl font-black tabular-nums">{stats.rating}</div>
                  <div className="mt-1 text-sm font-bold tracking-wider">{STAGE_CODE[company.stage]}</div>
                  <div className="mt-2 h-px w-8 bg-black/30" />
                  <div className="mt-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: accent }} />
                    {rarity.name}
                  </div>
                </div>
                <div className="grid h-16 w-16 place-items-center rounded-2xl text-xl font-black text-white shadow-lg ring-2 ring-white/40" style={{ background: logoGrad }}>
                  {initials(company.name)}
                </div>
              </div>

              {/* name */}
              <div className="mt-3 text-center">
                <div className="truncate text-xl font-black uppercase tracking-tight">{company.name}</div>
                <div className="text-[11px] font-semibold opacity-70">
                  {company.city}, {company.country}
                </div>
              </div>

              {/* stats */}
              <div className="mt-3 grid grid-cols-3 gap-y-2 border-t border-black/20 pt-3 text-center">
                <Stat k="VAL" v={stats.VAL} />
                <Stat k="WIN" v={stats.WIN} />
                <Stat k="ENG" v={stats.ENG} />
                <Stat k="MOM" v={stats.MOM} />
                <Stat k="REL" v={stats.REL} />
                <Stat k="STG" v={stats.STG} />
              </div>

              {/* footer value */}
              <div className="mt-auto flex items-center justify-between border-t border-black/20 pt-2 text-sm font-black">
                <span>{fmtMoney(company.dealValue)}</span>
                <span className="text-[11px] font-bold uppercase opacity-70">{statusOf(company)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- rep "standing" + details ---- */}
        <div className="reveal-right min-w-0 flex-1">
          <div className="card overflow-hidden">
            {/* owner hero band */}
            <div className="relative flex items-center gap-4 border-b border-white/5 p-4" style={{ background: `linear-gradient(100deg, ${accent}22, transparent)` }}>
              <div className="relative">
                <div className="absolute -inset-2 rounded-full opacity-60 blur-xl" style={{ background: accent }} />
                <RepAvatar rep={company.ownerRep} size={56} />
              </div>
              <div className="min-w-0">
                <div className="label-eyebrow">Account owner · pulled this card</div>
                <div className="truncate text-lg font-semibold text-white">{company.ownerRep}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StageBadge stage={company.stage} />
                  {isOverlap && (
                    <span className="chip animate-pulse-glow bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40">
                      <WarnIcon className="h-3 w-3" /> {repsForName(company.name).length} reps
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={drillUp}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {isOverlap && (
              <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-200">
                <WarnIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <span className="font-semibold">Account overlap.</span> Also worked by{" "}
                  <span className="font-medium text-amber-100">{otherReps.join(", ")}</span>. Coordinate before reaching out.
                </div>
              </div>
            )}

            {/* facts */}
            <div className="grid grid-cols-2 gap-px bg-white/5 p-px">
              <Fact label="Deal value" value={fmtMoney(company.dealValue)} accent={accent} />
              <Fact label="Win probability" value={`${stats.WIN}%`} />
              <Fact label="Last activity" value={fmtDate(company.lastActivity)} sub={company.activityNote} />
              <Fact label="Next follow-up" value={fmtDate(company.nextFollowUp)} sub={overdue ? "overdue" : relativeFromToday(company.nextFollowUp)} danger={!!overdue} />
            </div>

            {/* AI suggestion */}
            {company.aiFollowUp && (
              <div className="p-4">
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-soft">
                    <SparkIcon className="h-3.5 w-3.5" /> AI-suggested next step
                  </div>
                  <p className="text-sm leading-relaxed text-slate-200">{company.aiFollowUp}</p>
                </div>
                <button onClick={() => togglePanel(true)} className="btn-primary mt-3 w-full">
                  <SparkIcon className="h-4 w-4" /> Draft follow-up for approval
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="text-base font-black tabular-nums">{v}</span>
      <span className="text-[11px] font-bold opacity-70">{k}</span>
    </div>
  );
}

function Fact({
  label,
  value,
  sub,
  accent,
  danger,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  danger?: boolean;
}) {
  return (
    <div className="bg-ink-850 p-3">
      <div className="label-eyebrow">{label}</div>
      <div className="mt-1 text-sm font-semibold" style={{ color: accent ?? "#fff" }}>
        {value}
      </div>
      {sub && <div className={`mt-0.5 text-[11px] ${danger ? "font-medium text-rose-400" : "text-slate-500"}`}>{sub}</div>}
    </div>
  );
}
