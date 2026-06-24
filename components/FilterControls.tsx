"use client";

import {
  REPS,
  TERRITORIES,
  SIZE_BUCKETS,
  STATUSES,
  STAGE_ORDER,
  REP_COLORS,
} from "@/lib/data";
import { useCockpit } from "@/lib/store";
import { useFiltered } from "@/lib/useFiltered";
import { WarnIcon } from "./ui";

// Shared filter row used by the Map and Table/Board toolbars.
export default function FilterControls() {
  const repFilter = useCockpit((s) => s.repFilter);
  const setRepFilter = useCockpit((s) => s.setRepFilter);
  const territoryFilter = useCockpit((s) => s.territoryFilter);
  const sizeFilter = useCockpit((s) => s.sizeFilter);
  const statusFilter = useCockpit((s) => s.statusFilter);
  const stageFilter = useCockpit((s) => s.stageFilter);
  const setFilter = useCockpit((s) => s.setFilter);
  const overlapsOnly = useCockpit((s) => s.overlapsOnly);
  const toggleOverlapsOnly = useCockpit((s) => s.toggleOverlapsOnly);
  const resetFilters = useCockpit((s) => s.resetFilters);

  const { visible } = useFiltered();

  const active =
    repFilter !== "all" ||
    territoryFilter !== "all" ||
    sizeFilter !== "all" ||
    statusFilter !== "all" ||
    stageFilter !== "all" ||
    overlapsOnly;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Select label="Rep" value={repFilter} onChange={setRepFilter} options={["all", ...REPS]} dot={(v) => REP_COLORS[v]} />
      <Select label="Territory" value={territoryFilter} onChange={(v) => setFilter("territory", v)} options={["all", ...TERRITORIES]} />
      <Select label="Size" value={sizeFilter} onChange={(v) => setFilter("size", v)} options={["all", ...SIZE_BUCKETS]} />
      <Select label="Status" value={statusFilter} onChange={(v) => setFilter("status", v)} options={["all", ...STATUSES]} />
      <Select label="Stage" value={stageFilter} onChange={(v) => setFilter("stage", v)} options={["all", ...STAGE_ORDER]} />

      <button
        onClick={toggleOverlapsOnly}
        className={`chip transition-all ${
          overlapsOnly ? "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40" : "text-slate-400 hover:bg-white/5 ring-1 ring-white/5"
        }`}
      >
        <WarnIcon className="h-3.5 w-3.5" />
        Overlaps
      </button>

      <span className="px-1 text-[11px] text-slate-500">
        <span className="font-semibold text-white tabular-nums">{visible.length}</span> shown
      </span>

      {active && (
        <button onClick={resetFilters} className="chip text-slate-400 hover:bg-white/5 ring-1 ring-white/5">
          Clear
        </button>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  dot,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  dot?: (v: string) => string | undefined;
}) {
  const isOn = value !== "all";
  return (
    <label
      className={`relative flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ring-1 transition-colors ${
        isOn ? "bg-accent/15 text-white ring-accent/40" : "bg-ink-800/80 text-slate-300 ring-white/5"
      }`}
    >
      {isOn && dot && dot(value) ? (
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot(value) }} />
      ) : (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent pr-3 text-xs font-medium text-current outline-none [&>option]:bg-ink-850 [&>option]:text-slate-200"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "all" ? `All ${label.toLowerCase()}s` : o}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-1.5 h-3 w-3 text-slate-500" fill="none">
        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
