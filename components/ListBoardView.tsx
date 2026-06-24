"use client";

import { useMemo, useState } from "react";
import {
  REPS,
  STAGE_COLORS,
  STAGE_ORDER,
  fmtMoney,
  fmtDate,
  relativeFromToday,
  daysFromToday,
  repColor,
} from "@/lib/data";
import { useCockpit } from "@/lib/store";
import { useFiltered } from "@/lib/useFiltered";
import { RepAvatar, StageBadge, OverlapBadge } from "./ui";
import FilterControls from "./FilterControls";
import type { Company, Stage } from "@/lib/types";

type SortKey = "name" | "city" | "stage" | "ownerRep" | "dealValue" | "lastActivity" | "nextFollowUp";
type Tab = "table" | "board";

export default function ListBoardView() {
  const [tab, setTab] = useState<Tab>("table");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "dealValue", dir: -1 });
  const [query, setQuery] = useState("");

  const { visible, overlaps } = useFiltered();
  const selectedId = useCockpit((s) => s.selectedCompanyId);
  const selectCompany = useCockpit((s) => s.selectCompany);
  const repFilter = useCockpit((s) => s.repFilter);
  const addRow = useCockpit((s) => s.addRow);
  const addColumn = useCockpit((s) => s.addColumn);

  function addAccount() {
    const today = new Date().toISOString().slice(0, 10);
    addRow({
      id: `new_${Date.now().toString(36)}`,
      name: "New account",
      lat: 0,
      lng: 0,
      city: "—",
      country: "—",
      stage: "Prospecting",
      ownerRep: repFilter !== "all" ? repFilter : REPS[0],
      dealValue: 0,
      lastActivity: today,
      nextFollowUp: null,
      activityNote: "Added manually",
      aiFollowUp: "",
    });
    setTab("table");
  }
  function addCustomColumn() {
    const label = window.prompt("New column name", "Notes");
    if (label && label.trim()) addColumn(label.trim());
  }

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

        <FilterControls />

        <div className="ml-auto flex items-center gap-2 pr-1">
          {tab === "table" && (
            <>
              <button onClick={addAccount} className="btn-ghost ring-1 ring-white/5" title="Add a new account row">
                <PlusIcon className="h-4 w-4" /> Row
              </button>
              <button onClick={addCustomColumn} className="btn-ghost ring-1 ring-white/5" title="Add a custom column">
                <PlusIcon className="h-4 w-4" /> Column
              </button>
            </>
          )}
          <span className="text-xs text-slate-500">
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
  const customColumns = useCockpit((s) => s.customColumns);
  const cellValues = useCockpit((s) => s.cellValues);
  const setCell = useCockpit((s) => s.setCell);
  const deleteColumn = useCockpit((s) => s.deleteColumn);
  const deleteRow = useCockpit((s) => s.deleteRow);

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
                {sort.key === col.key && <span className="text-accent-soft">{sort.dir === 1 ? "↑" : "↓"}</span>}
              </span>
            </th>
          ))}
          {customColumns.map((col) => (
            <th key={col.id} className="group/col select-none px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                {col.label}
                <button
                  onClick={() => deleteColumn(col.id)}
                  className="opacity-0 transition-opacity group-hover/col:opacity-100 hover:text-rose-400"
                  title="Delete column"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            </th>
          ))}
          <th className="w-8 px-2" />
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
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: repColor(c.ownerRep) }} />
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
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-white">{fmtMoney(c.dealValue)}</td>
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
              {customColumns.map((col) => (
                <td key={col.id} className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    value={cellValues[col.id]?.[c.id] ?? ""}
                    onChange={(e) => setCell(col.id, c.id, e.target.value)}
                    placeholder="—"
                    className="w-full min-w-[90px] rounded-md bg-transparent px-2 py-1 text-sm text-slate-200 outline-none ring-1 ring-transparent hover:ring-white/10 focus:bg-ink-800 focus:ring-accent/40 placeholder:text-slate-600"
                  />
                </td>
              ))}
              <td className="px-2 text-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRow(c.id);
                  }}
                  className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400 text-slate-600"
                  title="Delete row"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---------------- Board (drag between stages) ---------------- */
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
  const moveStage = useCockpit((s) => s.moveStage);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);

  function onDrop(stage: Stage) {
    if (dragId) moveStage(dragId, stage);
    setDragId(null);
    setOverStage(null);
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-3 sm:p-4">
      {STAGE_ORDER.map((stage) => {
        const items = rows.filter((c) => c.stage === stage);
        const total = items.reduce((s, c) => s + c.dealValue, 0);
        const color = STAGE_COLORS[stage];
        const isOver = overStage === stage && dragId;
        return (
          <div key={stage} className="flex w-[270px] shrink-0 flex-col">
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
                <span className="text-sm font-semibold text-white">{stage}</span>
                <span className="text-xs text-slate-500">{items.length}</span>
              </div>
              <span className="text-[11px] font-medium tabular-nums text-slate-500">
                {fmtMoney(total)}
              </span>
            </div>
            <div
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverStage(stage);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget === e.target) setOverStage(null);
              }}
              onDrop={() => onDrop(stage)}
              className={`flex-1 space-y-2 rounded-2xl border p-2 transition-colors ${
                isOver ? "border-accent/50 bg-accent/5" : "border-white/5 bg-ink-900/40"
              }`}
              style={{ boxShadow: `inset 0 2px 0 -1px ${color}55` }}
            >
              {items.length === 0 && (
                <div
                  className={`py-8 text-center text-xs ${isOver ? "text-accent-soft" : "text-slate-600"}`}
                >
                  {isOver ? "Drop here" : "No deals"}
                </div>
              )}
              {items.map((c) => {
                const overdue = (daysFromToday(c.nextFollowUp) ?? 1) <= 0 && c.nextFollowUp;
                const rc = repColor(c.ownerRep);
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(c.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverStage(null);
                    }}
                    onClick={() => onSelect(c)}
                    className={`cursor-grab rounded-xl border bg-ink-850/80 p-2.5 text-left transition-all active:cursor-grabbing ${
                      selectedId === c.id
                        ? "border-accent/50 ring-1 ring-accent/30"
                        : "border-white/5 hover:border-white/15 hover:bg-ink-800"
                    } ${dragId === c.id ? "opacity-40" : ""}`}
                    style={{ borderLeft: `3px solid ${rc}` }}
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
                    <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-1.5 text-[10px]">
                      <span className="text-slate-500">Last: {fmtDate(c.lastActivity)}</span>
                      {c.nextFollowUp ? (
                        <span
                          className={`flex items-center gap-1 ${overdue ? "font-medium text-rose-400" : "text-slate-500"}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${overdue ? "bg-rose-400" : "bg-slate-600"}`}
                          />
                          {relativeFromToday(c.nextFollowUp)}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </div>
                  </div>
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
function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M4 7h16M9 7V5h6v2m-7 0 .8 12a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9L16 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
