"use client";

import { useMemo } from "react";
import {
  companies,
  fmtMoney,
  fmtDate,
  relativeFromToday,
  daysFromToday,
  repColor,
  isOpen,
  statusOf,
} from "@/lib/data";
import { useCockpit } from "@/lib/store";
import { RepAvatar, StageBadge } from "./ui";
import type { Company } from "@/lib/types";

// The AE's full book: a table of every opportunity they own. Stays mounted
// under the dossier so you can open one account, close it, and pick another.
export default function RepView() {
  const rep = useCockpit((s) => s.repView);
  const close = useCockpit((s) => s.closeRepView);
  const stageOverrides = useCockpit((s) => s.stageOverrides);
  const selectedId = useCockpit((s) => s.selectedCompanyId);
  const selectCompany = useCockpit((s) => s.selectCompany);

  const rows = useMemo(() => {
    if (!rep) return [];
    return companies
      .filter((c) => c.ownerRep === rep)
      .map((c) => (stageOverrides[c.id] ? { ...c, stage: stageOverrides[c.id] } : c))
      .sort((a, b) => b.dealValue - a.dealValue);
  }, [rep, stageOverrides]);

  const stats = useMemo(() => {
    const open = rows.filter(isOpen);
    const won = rows.filter((c) => statusOf(c) === "Won");
    return {
      accounts: rows.length,
      openValue: open.reduce((s, c) => s + c.dealValue, 0),
      wonValue: won.reduce((s, c) => s + c.dealValue, 0),
      open: open.length,
    };
  }, [rows]);

  if (!rep) return null;
  const accent = repColor(rep);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-md" onClick={close} />

      <div className="account-reveal relative z-10 flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-ink-900/95 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
        {/* Header */}
        <div className="relative flex items-center gap-4 border-b border-white/5 p-5" style={{ background: `linear-gradient(100deg, ${accent}22, transparent)` }}>
          <div className="relative">
            <div className="absolute -inset-2 rounded-full opacity-50 blur-xl" style={{ background: accent }} />
            <RepAvatar rep={rep} size={52} />
          </div>
          <div className="flex-1">
            <div className="label-eyebrow">Account Executive</div>
            <div className="text-xl font-bold tracking-tight text-white">{rep}</div>
          </div>
          <div className="hidden gap-5 sm:flex">
            <HeaderStat label="Accounts" value={String(stats.accounts)} />
            <HeaderStat label="Open" value={fmtMoney(stats.openValue)} accent={accent} />
            <HeaderStat label="Won" value={fmtMoney(stats.wonValue)} />
          </div>
          <button onClick={close} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-2 text-[11px] text-slate-500">Click any opportunity to open its dossier — close it to come back here.</div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-ink-900/95 backdrop-blur">
              <tr className="border-b border-white/10 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2.5">Account</th>
                <th className="px-3 py-2.5">Stage</th>
                <th className="px-3 py-2.5 text-right">Value</th>
                <th className="hidden px-3 py-2.5 sm:table-cell">Next step</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c: Company) => {
                const overdue = (daysFromToday(c.nextFollowUp) ?? 1) <= 0 && c.nextFollowUp;
                return (
                  <tr
                    key={c.id}
                    onClick={() => selectCompany(c)}
                    className={`cursor-pointer border-b border-white/5 transition-colors ${
                      selectedId === c.id ? "bg-accent/10" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <td className="px-5 py-2.5">
                      <div className="font-medium text-white">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.city}, {c.country}</div>
                    </td>
                    <td className="px-3 py-2.5"><StageBadge stage={c.stage} /></td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-white">{fmtMoney(c.dealValue)}</td>
                    <td className="hidden px-3 py-2.5 sm:table-cell">
                      {c.nextFollowUp ? (
                        <span className={overdue ? "font-medium text-rose-400" : "text-slate-400"}>{relativeFromToday(c.nextFollowUp)}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`chip ring-1 ${statusChip(statusOf(c))}`}>{statusOf(c)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function HeaderStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="leading-tight">
      <div className="label-eyebrow">{label}</div>
      <div className="text-sm font-semibold tabular-nums" style={{ color: accent ?? "#fff" }}>{value}</div>
    </div>
  );
}

function statusChip(status: string) {
  if (status === "Won") return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
  if (status === "Lost") return "bg-rose-500/15 text-rose-300 ring-rose-500/30";
  return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
}
