"use client";

import { useMemo } from "react";
import { useCockpit } from "@/lib/store";
import { computeMetrics } from "@/lib/metrics";
import { fmtMoney, STAGE_COLORS, STAGE_ORDER } from "@/lib/data";
import { RepAvatar } from "./ui";
import type { Stage } from "@/lib/types";

export default function MetricsPanel() {
  const open = useCockpit((s) => s.metricsOpen);
  const toggle = useCockpit((s) => s.toggleMetrics);
  const repFilter = useCockpit((s) => s.repFilter);
  const territoryFilter = useCockpit((s) => s.territoryFilter);

  const m = useMemo(() => computeMetrics(repFilter, territoryFilter), [repFilter, territoryFilter]);

  return (
    <>
      <div
        onClick={() => toggle(false)}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-r border-white/10 bg-ink-900/95 backdrop-blur-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-white/5 p-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-sky-500 shadow-glow">
            <ChartIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-white">Team metrics</h2>
            <p className="text-xs text-slate-400">Live against quarterly &amp; yearly targets</p>
          </div>
          <button
            onClick={() => toggle(false)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scope indicator — who these numbers relate to */}
        <ScopeChip rep={repFilter} territory={territoryFilter} />

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-2">
            <Kpi label="Accounts" value={m.accounts} />
            <Kpi label="Prospects" value={m.prospects} tone="sky" />
            <Kpi label="Open pipeline" value={fmtMoney(m.openValue)} />
            <Kpi label="Closed won" value={fmtMoney(m.wonValue)} tone="green" />
          </div>

          {/* Status split */}
          <Section title="Deals by status">
            <StatusBar open={m.open} won={m.won} lost={m.lost} />
          </Section>

          {/* Quota attainment */}
          <Section title="Quota attainment">
            <Quota label="This quarter" actual={m.quarter.actual} target={m.quarter.target} pct={m.quarter.pct} />
            <div className="h-3" />
            <Quota label="Year to date" actual={m.year.actual} target={m.year.target} pct={m.year.pct} />
          </Section>

          {/* Stage distribution */}
          <Section title="Pipeline by stage">
            <div className="space-y-1.5">
              {STAGE_ORDER.map((s) => (
                <StageRow key={s} stage={s} count={m.byStage[s] ?? 0} max={Math.max(1, ...Object.values(m.byStage))} />
              ))}
            </div>
          </Section>
        </div>
      </aside>
    </>
  );
}

function ScopeChip({ rep, territory }: { rep: string; territory: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-white/5 bg-accent/5 px-4 py-3">
      <span className="text-[11px] font-medium text-slate-400">Showing</span>
      {rep === "all" ? (
        <span className="chip bg-white/10 text-white ring-1 ring-white/15">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Whole team
        </span>
      ) : (
        <span className="chip bg-white/10 text-white ring-1 ring-white/15">
          <RepAvatar rep={rep} size={16} /> {rep}
        </span>
      )}
      <span className="chip bg-ink-800 text-slate-300 ring-1 ring-white/5">
        {territory === "all" ? "All territories" : territory}
      </span>
    </div>
  );
}

function Kpi({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "green" | "sky" }) {
  const color = tone === "green" ? "text-emerald-400" : tone === "sky" ? "text-sky-400" : "text-white";
  return (
    <div className="rounded-xl border border-white/5 bg-ink-850/70 p-3">
      <div className="label-eyebrow">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</div>
      {children}
    </div>
  );
}

function StatusBar({ open, won, lost }: { open: number; won: number; lost: number }) {
  const total = Math.max(1, open + won + lost);
  const seg = (n: number, c: string, label: string) =>
    n > 0 ? (
      <div className="flex items-center justify-center text-[10px] font-semibold text-white/90" style={{ width: `${(n / total) * 100}%`, background: c }} title={`${label}: ${n}`}>
        {n}
      </div>
    ) : null;
  return (
    <div>
      <div className="flex h-7 overflow-hidden rounded-lg">
        {seg(open, "#38bdf8", "Open")}
        {seg(won, "#22c55e", "Won")}
        {seg(lost, "#ef4444", "Lost")}
      </div>
      <div className="mt-1.5 flex gap-4 text-[11px] text-slate-400">
        <Legend c="#38bdf8" label={`Open ${open}`} />
        <Legend c="#22c55e" label={`Won ${won}`} />
        <Legend c="#ef4444" label={`Lost ${lost}`} />
      </div>
    </div>
  );
}

function Quota({ label, actual, target, pct }: { label: string; actual: number; target: number; pct: number }) {
  const clamped = Math.min(1, pct);
  const hit = pct >= 1;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        <span className={`text-xs font-semibold tabular-nums ${hit ? "text-emerald-400" : "text-slate-300"}`}>
          {Math.round(pct * 100)}%
        </span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-ink-700">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${clamped * 100}%`,
            background: hit ? "linear-gradient(90deg,#22c55e,#4ade80)" : "linear-gradient(90deg,#6366f1,#818cf8)",
          }}
        />
      </div>
      <div className="mt-1 text-[11px] text-slate-500 tabular-nums">
        {fmtMoney(actual)} <span className="text-slate-600">of</span> {fmtMoney(target)}
      </div>
    </div>
  );
}

function StageRow({ stage, count, max }: { stage: Stage; count: number; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-[11px] text-slate-400">{stage}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-700">
        <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: STAGE_COLORS[stage] }} />
      </div>
      <span className="w-5 shrink-0 text-right text-[11px] font-semibold tabular-nums text-slate-300">{count}</span>
    </div>
  );
}

function Legend({ c, label }: { c: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: c }} />
      {label}
    </span>
  );
}

function ChartIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M4 20V10m6 10V4m6 16v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
