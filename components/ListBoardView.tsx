"use client";

import { useMemo, useState } from "react";
import {
  REPS,
  REP_COLORS,
  STAGE_COLORS,
  STAGE_ORDER,
  fmtMoney,
  fmtDate,
  relativeFromToday,
  daysFromToday,
} from "@/lib/data";
import { useCockpit } from "@/lib/store";
import { useFiltered } from "@/lib/useFiltered";
import { RepAvatar, StageBadge, OverlapBadge, WarnIcon } from "./ui";
import type { Company, Stage } from "@/lib/types";

type SortKey = "name" | "city" | "stage" | "ownerRep" | "dealValue" | "lastActivity" | "nextFollowUp";
type Tab = "table" | "board";

export default function ListBoardView() {
  const [tab, setTab] = useState<Tab>("table");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "dealValue", dir: -1 });
  const [query, setQuery] = useState("");

  const { visible, overlaps } = useFiltered();
  const repFilter = useCockpit((s) => s.repFilter);
  const setRepFilter = useCockpit((s) => s.setRepFilter);
  const overlapsOnly = useCockpit((s) => s.overlapsOnly);
  const toggleOverlapsOnly = useCockpit((s) => s.toggleOverlapsOnly);
  const selectedId = useCockpit((s) => s.selectedCompanyId);
  const selectCompany = useCockpit((s) => s.selectCompany);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? visible.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q) ||
            c.country.toLowerCase().includes(q) ||
            c.ownerRep.toLowerCase().includes(q)
        )
      : visible;
    const stageRank = (s: Stage) => STAGE_ORDER.indexOf(s);
    return [...filtered].sort((a, b) => {
      let av: number | string = a[sort.key] ?? "";
      let bv: number | string = b[sort.key] ?? "";
      if (sort.key === "stage") {
        av = stageRank(a.stage);
        bv = stageRank(b.stage);
      }
      if (typeof av === "string") return av.localeCompare(bv as string) * sort.dir;
      return ((av as number) - (bv as number)) * sort.dir;
    });
  }, [visible, sort, query]);

  const totalValue = rows.reduce((s, c) => s + c.dealValue, 0);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));
  }

  const isOverlap = (c: Company) => overlaps.has(c.name.toLowerCase());

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 bg-ink-900/60 px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-0.5 rounded-xl bg-ink-800/80 p-0.5 ring-1 ring-white/5">
          {(["table", "board"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`btn capitalize ${tab === t ? "bg-ink-700 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {t === "table" ? "Table" : "Board"}
            </button>
          ))}
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts…"
            className="w-44 rounded-lg bg-ink-800/80 py-1.5 pl-8 pr-3 text-sm text-white outline-none ring-1 ring-white/5 placeholder:text-slate-600 focus:ring-accent/40 sm:w-56"
          />
        </div>

        {/* Rep filter */}
        <div className="flex items-center gap-1">
          <RepChip active={repFilter === "all"} onClick={() => setRepFilter("all")} color="#94a3b8">
            Team
          </RepChip>
          {REPS.map((rep) => (
            <RepChip
              key={rep}
              active={repFilter === rep}
              onClick={() => setRepFilter(rep)}
              color={REP_COLORS[rep]}
            >
              <RepAvatar rep={rep} size={16} />
              <span className="hidden lg:inline">{rep.split(" ")[0]}</span>
            </RepChip>
          ))}
        </div>

        <button
          onClick={toggleOverlapsOnly}
          className={`chip transition-all ${
            overlapsOnly ? "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40" : "text-slate-400 hover:bg-white/5"
          }`}
        >
          <WarnIcon className="h-3.5 w-3.5" />
          Overlaps only
        </button>

        <div className="ml-auto flex items-center gap-4 pr-1 text-xs">
          <span className="text-slate-500">
            <span className="font-semibold text-white tabular-nums">{rows.length}</span> accounts
          </span>
          <span className="text-slate-500">
            <span className="font-semibold text-accent-glow tabular-nums">{fmtMoney(totalValue)}</span> pipeline
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <EmptyRows />
        ) : tab === "table" ? (
          <Table
            rows={rows}
            sort={sort}
            toggleSort={toggleSort}
            selectedId={selectedId}
            onSelect={selectCompany}
            isOverlap={isOverlap}
          />
        ) : (
          <Board rows={rows} selectedId={selectedId} onSelect={selectCompany} isOverlap={isOverlap} />
        )}
      </div>
    </div>
  );
}

/* ---------------- Table ---------------- */
const COLS: { key: SortKey; label: string; align?: string }[] = [
  { key: "name", label: "Account" },
  { key: "city", label: "Location" },
  { key: "stage", label: "Stage" },
  { key: "ownerRep", label: "Owner" },
  { key: "dealValue", label: "Value", align: "text-right" },
  { key: "lastActivity", label: "Last activity" },
  { key: "nextFollowUp", label: "Next follow-up" },
];

function Table({
  rows,
  sort,
  toggleSort,
  selectedId,
  onSelect,
  isOverlap,
}: {
  rows: Company[];
  sort: { key: SortKey; dir: 1 | -1 };
  toggleSort: (k: SortKey) => void;
  selectedId: string | null;
  onSelect: (c: Company) => void;
  isOverlap: (c: Company) => boolean;
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10 bg-ink-900/95 backdrop-blur">
        <tr className="border-b border-white/10">
          {COLS.map((col) => (
            <th
              key={col.key}
              onClick={() => toggleSort(col.key)}
              className={`cursor-pointer select-none px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-300 ${
                col.align ?? "text-left"
              }`}
            >
              <span className="inline-flex items-center gap-1">
                {col.label}
                {sort.key === col.key && (
                  <span className="text-accent-soft">{sort.dir === 1 ? "↑" : "↓"}</span>
                )}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => {
          const overdue = (daysFromToday(c.nextFollowUp) ?? 1) <= 0 && c.nextFollowUp;
          return (
            <tr
              key={c.id}
              onClick={() => onSelect(c)}
              className={`group cursor-pointer border-b border-white/5 transition-colors ${
                selectedId === c.id ? "bg-accent/10" : "hover:bg-white/[0.03]"
              }`}
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{c.name}</span>
                  {isOverlap(c) && <OverlapBadge compact />}
                </div>
              </td>
              <td className="px-4 py-2.5 text-slate-400">
                {c.city}, <span className="text-slate-500">{c.country}</span>
              </td>
              <td className="px-4 py-2.5">
                <StageBadge stage={c.stage} />
              </td>
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <RepAvatar rep={c.ownerRep} size={18} />
                  {c.ownerRep}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-white">
                {fmtMoney(c.dealValue)}
              </td>
              <td className="px-4 py-2.5 text-slate-400">{fmtDate(c.lastActivity)}</td>
              <td className="px-4 py-2.5">
                {c.nextFollowUp ? (
                  <span className={overdue ? "font-medium text-rose-400" : "text-slate-400"}>
                    {relativeFromToday(c.nextFollowUp)}
                  </span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---------------- Board ---------------- */
function Board({
  rows,
  selectedId,
  onSelect,
  isOverlap,
}: {
  rows: Company[];
  selectedId: string | null;
  onSelect: (c: Company) => void;
  isOverlap: (c: Company) => boolean;
}) {
  return (
    <div className="flex h-full gap-3 overflow-x-auto p-3 sm:p-4">
      {STAGE_ORDER.map((stage) => {
        const items = rows.filter((c) => c.stage === stage);
        const total = items.reduce((s, c) => s + c.dealValue, 0);
        const color = STAGE_COLORS[stage];
        return (
          <div key={stage} className="flex w-[260px] shrink-0 flex-col">
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm font-semibold text-white">{stage}</span>
                <span className="text-xs text-slate-500">{items.length}</span>
              </div>
              <span className="text-[11px] font-medium tabular-nums text-slate-500">
                {fmtMoney(total)}
              </span>
            </div>
            <div
              className="flex-1 space-y-2 rounded-2xl border border-white/5 bg-ink-900/40 p-2"
              style={{ boxShadow: `inset 0 2px 0 -1px ${color}55` }}
            >
              {items.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-600">No deals</div>
              )}
              {items.map((c) => {
                const overdue = (daysFromToday(c.nextFollowUp) ?? 1) <= 0 && c.nextFollowUp;
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className={`w-full rounded-xl border p-2.5 text-left transition-all ${
                      selectedId === c.id
                        ? "border-accent/50 bg-accent/10"
                        : "border-white/5 bg-ink-850/80 hover:border-white/10 hover:bg-ink-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-tight text-white">{c.name}</span>
                      {isOverlap(c) && <OverlapBadge compact />}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {c.city}, {c.country}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <RepAvatar rep={c.ownerRep} size={18} />
                        <span className="text-[11px] text-slate-400">{c.ownerRep.split(" ")[0]}</span>
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-white">
                        {fmtMoney(c.dealValue)}
                      </span>
                    </div>
                    {c.nextFollowUp && (
                      <div
                        className={`mt-1.5 text-[11px] ${overdue ? "font-medium text-rose-400" : "text-slate-500"}`}
                      >
                        Follow-up {relativeFromToday(c.nextFollowUp)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- bits ---------------- */
function RepChip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`chip transition-all ${
        active ? "bg-white/10 text-white ring-1 ring-white/15" : "text-slate-400 hover:bg-white/5"
      }`}
    >
      {typeof children === "string" && (
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      )}
      {children}
    </button>
  );
}

function EmptyRows() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-800 text-slate-600">
        <SearchIcon className="h-7 w-7" />
      </div>
      <div className="text-sm font-medium text-slate-300">No accounts match these filters</div>
      <div className="text-xs text-slate-500">Try clearing the rep filter or the overlaps toggle.</div>
    </div>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
