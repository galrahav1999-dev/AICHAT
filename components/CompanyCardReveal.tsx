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
  sizeOf,
} from "@/lib/data";
import { useCockpit } from "@/lib/store";
import { RepAvatar, StageBadge, SparkIcon, WarnIcon } from "./ui";
import type { Company } from "@/lib/types";

// Deterministic 0..1 from a string so an account's generated fields are stable.
function seeded(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}
const pick = <T,>(arr: T[], s: number) => arr[Math.floor(s * arr.length) % arr.length];
function pickN<T>(arr: T[], s: number, n: number): T[] {
  const out: T[] = [];
  let idx = Math.floor(s * arr.length);
  for (let i = 0; i < n; i++) {
    out.push(arr[idx % arr.length]);
    idx += 3;
  }
  return Array.from(new Set(out)).slice(0, n);
}

const INDUSTRIES = ["Fintech", "Healthtech", "Logistics", "Developer Tools", "Cybersecurity", "E-commerce", "AI / ML", "Manufacturing", "Marketing Tech", "Data & Analytics"];
const STACK = ["Salesforce", "Snowflake", "AWS", "Segment", "Looker", "dbt", "Okta", "Slack", "HubSpot", "Postgres", "Kubernetes", "Datadog", "Stripe", "Zendesk", "GCP", "Tableau"];
const TITLES = ["VP RevOps", "Head of Sales", "CTO", "Director of IT", "VP Marketing", "Chief Revenue Officer", "Head of Growth"];
const FIRST = ["Alex", "Jordan", "Sam", "Riya", "Noa", "Chris", "Dana", "Kai", "Lena", "Marco"];
const LAST = ["Park", "Cohen", "Silva", "Mehta", "Brandt", "Ortiz", "Lindqvist", "Tan", "Rossi", "Bauer"];
const WIN_BY_STAGE: Record<string, number> = {
  Prospecting: 12, Qualified: 28, Demo: 45, Proposal: 62, Negotiation: 82, "Closed Won": 100, "Closed Lost": 3,
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function CompanyCardReveal() {
  const drill = useCockpit((s) => s.drill);
  const selectedId = useCockpit((s) => s.selectedCompanyId);
  const selectedCity = useCockpit((s) => s.selectedCity);
  const repView = useCockpit((s) => s.repView);
  const stageOverrides = useCockpit((s) => s.stageOverrides);
  const togglePanel = useCockpit((s) => s.togglePanel);
  const openRepView = useCockpit((s) => s.openRepView);
  const closeRepView = useCockpit((s) => s.closeRepView);
  const closeCard = useCockpit((s) => s.closeCard);
  const selectCompany = useCockpit((s) => s.selectCompany);

  const overlaps = useMemo(() => overlappingNames(), []);
  const base = (selectedId ? companies.find((c) => c.id === selectedId) : null) ?? null;
  const company: Company | null = base && stageOverrides[base.id] ? { ...base, stage: stageOverrides[base.id] } : base;

  // The togglable account list shown on the right of the card. Context is the
  // rep's whole book when you've clicked the owner, otherwise the current city.
  const railList = useMemo(() => {
    const src = repView
      ? companies.filter((c) => c.ownerRep === repView)
      : companies.filter((c) => c.city === selectedCity);
    return src
      .map((c) => (stageOverrides[c.id] ? { ...c, stage: stageOverrides[c.id] } : c))
      .sort((a, b) => b.dealValue - a.dealValue);
  }, [repView, selectedCity, stageOverrides]);

  const dossier = useMemo(() => {
    if (!company) return null;
    const s = seeded(company.id);
    const industry = pick(INDUSTRIES, s);
    const employees = pick(["35", "120", "340", "900", "2,400", "6,000+"], seeded(company.id + "e"));
    const stack = pickN(STACK, seeded(company.id + "k"), 5);
    const contact = `${pick(FIRST, seeded(company.id + "f"))} ${pick(LAST, seeded(company.id + "l"))}`;
    const title = pick(TITLES, seeded(company.id + "t"));
    const win = WIN_BY_STAGE[company.stage] ?? 30;

    // Ongoing deals & ops
    const ops: { name: string; value: number; stage: string; tone: string }[] = [
      { name: "New business", value: company.dealValue, stage: company.stage, tone: "primary" },
    ];
    if (seeded(company.id + "o") > 0.45) {
      ops.push({
        name: seeded(company.id + "r") > 0.5 ? "Platform expansion" : "Add-on: Premium support",
        value: Math.round(company.dealValue * (0.25 + seeded(company.id + "v") * 0.4)),
        stage: "Qualified",
        tone: "secondary",
      });
    }

    const nextSteps = [
      company.aiFollowUp || "Confirm next touchpoint and owner.",
      `Align with ${contact} (${title}) on timeline.`,
      seeded(company.id + "n") > 0.5 ? "Send security & compliance pack." : "Share vertical case study + ROI model.",
    ];
    return { industry, employees, stack, contact, title, win, ops, nextSteps };
  }, [company]);

  if (drill !== "company" || !company || !dossier) return null;

  const accent = repColor(company.ownerRep);
  const isOverlap = overlaps.has(company.name.toLowerCase());
  const otherReps = repsForName(company.name).filter((r) => r !== company.ownerRep);
  const overdue = (daysFromToday(company.nextFollowUp) ?? 1) <= 0 && company.nextFollowUp;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-md" onClick={closeCard} />

      <div className="relative z-10 flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-ink-900/95 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] animate-fade-in lg:flex-row">
        <div key={company.id} className="account-reveal flex min-w-0 flex-1 flex-col md:flex-row">
        {/* ---- LEFT: company logo / identity ---- */}
        <aside
          className="relative flex shrink-0 flex-col items-center gap-4 border-b border-white/5 p-6 md:w-[270px] md:border-b-0 md:border-r"
          style={{ background: `radial-gradient(120% 80% at 50% 0%, ${accent}22, transparent 70%)` }}
        >
          <div className="relative mt-2">
            <div className="absolute -inset-3 rounded-3xl opacity-50 blur-2xl" style={{ background: accent }} />
            <div
              className="account-logo relative grid h-28 w-28 place-items-center overflow-hidden rounded-3xl text-4xl font-black text-white ring-2 ring-white/20"
              style={{ background: `linear-gradient(140deg, ${accent}, ${accent}66)` }}
            >
              <div className="logo-shine" />
              {initials(company.name)}
            </div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold tracking-tight text-white">{company.name}</div>
            <div className="mt-0.5 text-xs text-slate-400">
              {dossier.industry} · {dossier.employees} employees
            </div>
            <div className="mt-1 text-xs text-slate-500">{company.city}, {company.country}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <StageBadge stage={company.stage} />
            <span className={`chip ring-1 ${statusChip(statusOf(company))}`}>{statusOf(company)}</span>
          </div>

          <button
            onClick={() => openRepView(company.ownerRep)}
            className="group mt-auto flex w-full items-center gap-2 rounded-xl bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10"
            title={`View ${company.ownerRep}'s full book`}
          >
            <RepAvatar rep={company.ownerRep} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{company.ownerRep}</div>
              <div className="text-[11px] text-slate-500">Account owner · view book</div>
            </div>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5" fill="none">
              <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {isOverlap && (
            <span className="chip animate-pulse-glow bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40">
              <WarnIcon className="h-3 w-3" /> Shared with {otherReps.join(", ")}
            </span>
          )}
        </aside>

        {/* ---- RIGHT: account data card ---- */}
        <div className="relative min-w-0 flex-1 overflow-y-auto">
          <button
            onClick={closeCard}
            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <div className="space-y-5 p-5">
            <div className="label-eyebrow">Account dossier</div>

            {/* Overview */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Open value" value={fmtMoney(company.dealValue)} accent={accent} />
              <Metric label="Win prob." value={`${dossier.win}%`} />
              <Metric label="Segment" value={sizeOf(company.dealValue)} />
              <Metric label="Next step" value={fmtDate(company.nextFollowUp)} sub={overdue ? "overdue" : relativeFromToday(company.nextFollowUp)} danger={!!overdue} />
            </div>

            {/* Ongoing deals & ops */}
            <Section title="Ongoing deals & ops">
              <div className="space-y-1.5">
                {dossier.ops.map((op, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-850/70 px-3 py-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: op.tone === "primary" ? accent : "#64748b" }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">{op.name}</div>
                      <div className="text-[11px] text-slate-500">{op.stage}</div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-white">{fmtMoney(op.value)}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Current stack */}
            <Section title="Current stack">
              <div className="flex flex-wrap gap-1.5">
                {dossier.stack.map((t) => (
                  <span key={t} className="chip bg-ink-800 text-slate-300 ring-1 ring-white/5">{t}</span>
                ))}
              </div>
            </Section>

            {/* Last activity + key contact */}
            <Section title="Relationship">
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Last activity" value={fmtDate(company.lastActivity)} sub={company.activityNote} />
                <Metric label="Key contact" value={dossier.contact} sub={dossier.title} />
              </div>
            </Section>

            {/* Next steps */}
            <Section title="Next steps">
              <div className="space-y-1.5">
                {dossier.nextSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-200">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px]" style={{ background: `${accent}22`, color: accent }}>
                      {i + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </Section>

            {/* AI + action */}
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-soft">
                <SparkIcon className="h-3.5 w-3.5" /> AI-suggested follow-up
              </div>
              <p className="text-sm leading-relaxed text-slate-200">{company.aiFollowUp || "Re-engage with a tailored value recap."}</p>
              <button onClick={() => togglePanel(true)} className="btn-primary mt-3 w-full">
                <SparkIcon className="h-4 w-4" /> Draft follow-up for approval
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* ---- RIGHT: togglable account list ---- */}
        <AccountRail
          list={railList}
          activeId={company.id}
          inRepView={!!repView}
          context={repView ? `${repView.split(" ")[0]}'s book` : selectedCity ?? "Nearby"}
          accent={accent}
          onPick={selectCompany}
          onCity={closeRepView}
          onRep={() => openRepView(company.ownerRep)}
        />
      </div>
    </div>
  );
}

function AccountRail({
  list,
  activeId,
  inRepView,
  context,
  accent,
  onPick,
  onCity,
  onRep,
}: {
  list: Company[];
  activeId: string;
  inRepView: boolean;
  context: string;
  accent: string;
  onPick: (c: Company) => void;
  onCity: () => void;
  onRep: () => void;
}) {
  return (
    <aside className="hidden w-[230px] shrink-0 flex-col border-l border-white/5 bg-ink-950/40 lg:flex">
      <div className="border-b border-white/5 p-3">
        <div className="label-eyebrow">Browse · {context}</div>
        <div className="mt-2 flex gap-1">
          <button
            onClick={onCity}
            className={`chip flex-1 justify-center ${!inRepView ? "bg-white/10 text-white ring-1 ring-white/15" : "text-slate-400 hover:bg-white/5"}`}
          >
            This city
          </button>
          <button
            onClick={onRep}
            className={`chip flex-1 justify-center ${inRepView ? "bg-white/10 text-white ring-1 ring-white/15" : "text-slate-400 hover:bg-white/5"}`}
          >
            Owner’s book
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
              c.id === activeId ? "bg-accent/15 ring-1 ring-accent/30" : "hover:bg-white/5"
            }`}
          >
            <RepAvatar rep={c.ownerRep} size={20} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-white">{c.name}</div>
              <div className="truncate text-[10px] text-slate-500">{c.stage}</div>
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-slate-300">{fmtMoney(c.dealValue)}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function statusChip(status: string) {
  if (status === "Won") return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
  if (status === "Lost") return "bg-rose-500/15 text-rose-300 ring-rose-500/30";
  return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</div>
      {children}
    </div>
  );
}

function Metric({ label, value, sub, accent, danger }: { label: string; value: string; sub?: string; accent?: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-white/5 bg-ink-850/70 p-3">
      <div className="label-eyebrow">{label}</div>
      <div className="mt-1 text-sm font-semibold" style={{ color: accent ?? "#fff" }}>{value}</div>
      {sub && <div className={`mt-0.5 text-[11px] ${danger ? "font-medium text-rose-400" : "text-slate-500"}`}>{sub}</div>}
    </div>
  );
}
