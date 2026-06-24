"use client";

import { useMemo } from "react";
import { companies, overlappingNames, repColor, fmtMoney, STAGE_ORDER } from "@/lib/data";
import { useCockpit } from "@/lib/store";
import { RepAvatar, StageBadge, WarnIcon } from "./ui";
import type { Company } from "@/lib/types";

// Dedicated review of every account being worked by more than one rep — the
// headline "stop stepping on each other" feature.
export default function OverlapsView() {
  const open = useCockpit((s) => s.overlapsView);
  const close = useCockpit((s) => s.toggleOverlapsView);
  const stageOverrides = useCockpit((s) => s.stageOverrides);
  const selectCompany = useCockpit((s) => s.selectCompany);
  const overlapsOnly = useCockpit((s) => s.overlapsOnly);
  const toggleOverlapsOnly = useCockpit((s) => s.toggleOverlapsOnly);
  const setView = useCockpit((s) => s.setView);

  const groups = useMemo(() => {
    const names = overlappingNames(companies);
    const byName = new Map<string, Company[]>();
    for (const c of companies) {
      const key = c.name.toLowerCase();
      if (!names.has(key)) continue;
      const rec = stageOverrides[c.id] ? { ...c, stage: stageOverrides[c.id] } : c;
      byName.set(key, [...(byName.get(key) ?? []), rec]);
    }
    return [...byName.values()]
      .map((recs) => recs.slice().sort((a, b) => b.dealValue - a.dealValue))
      .sort((a, b) => b.length - a.length || b[0].dealValue - a[0].dealValue);
  }, [stageOverrides]);

  if (!open) return null;

  const totalRecords = groups.reduce((n, g) => n + g.length, 0);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-md" onClick={() => close(false)} />

      <div className="account-reveal relative z-10 flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-amber-400/20 bg-ink-900/95 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/5 bg-amber-400/5 p-5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-300 animate-pulse-glow">
            <WarnIcon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold tracking-tight text-white">Account overlaps</h2>
            <p className="text-xs text-slate-400">
              {groups.length} accounts · {totalRecords} reps stepping on each other
            </p>
          </div>
          <button onClick={() => close(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Groups */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {groups.map((recs) => {
            const lead = [...recs].sort((a, b) => STAGE_ORDER.indexOf(b.stage) - STAGE_ORDER.indexOf(a.stage))[0];
            return (
              <div key={recs[0].name} className="overflow-hidden rounded-2xl border border-white/5 bg-ink-850/70">
                <div className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-2.5">
                  <div>
                    <div className="text-sm font-semibold text-white">{recs[0].name}</div>
                    <div className="text-[11px] text-slate-500">{recs[0].city}, {recs[0].country}</div>
                  </div>
                  <span className="chip bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40">
                    <WarnIcon className="h-3 w-3" /> {recs.length} reps
                  </span>
                </div>

                <div className="divide-y divide-white/5">
                  {recs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        close(false);
                        selectCompany(c);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                      style={{ boxShadow: `inset 3px 0 0 0 ${repColor(c.ownerRep)}` }}
                    >
                      <RepAvatar rep={c.ownerRep} size={26} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{c.ownerRep}</div>
                        <div className="mt-0.5"><StageBadge stage={c.stage} className="!px-1.5 !py-0.5 !text-[10px]" /></div>
                      </div>
                      {c.id === lead.id && (
                        <span className="chip bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">furthest along</span>
                      )}
                      <span className="text-sm font-semibold tabular-nums text-white">{fmtMoney(c.dealValue)}</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-white/5 bg-amber-400/[0.04] px-4 py-2 text-[11px] text-amber-200/80">
                  Recommend consolidating under <span className="font-semibold text-amber-100">{lead.ownerRep}</span> ({lead.stage}).
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer action */}
        <div className="flex items-center justify-between gap-2 border-t border-white/5 p-3">
          <span className="px-1 text-[11px] text-slate-500">Click a rep to open the account.</span>
          <button
            onClick={() => {
              if (!overlapsOnly) toggleOverlapsOnly();
              setView("list");
              close(false);
            }}
            className="btn-ghost ring-1 ring-white/10"
          >
            Isolate in List &amp; Board →
          </button>
        </div>
      </div>
    </div>
  );
}
