"use client";

import { useMemo } from "react";
import { aggregateByCity, fmtMoney, repColor } from "@/lib/data";
import { useCockpit } from "@/lib/store";
import { useFiltered } from "@/lib/useFiltered";
import { RepAvatar, StageBadge } from "./ui";

// Click-friendly list of what's "inside" the current territory, so users never
// have to hunt tiny dots: country → its cities, city → its accounts.
export default function DrillPanel() {
  const drill = useCockpit((s) => s.drill);
  const selectedCountry = useCockpit((s) => s.selectedCountry);
  const selectedCity = useCockpit((s) => s.selectedCity);
  const drillToCity = useCockpit((s) => s.drillToCity);
  const selectCompany = useCockpit((s) => s.selectCompany);
  const { visible } = useFiltered();

  const cities = useMemo(
    () => (selectedCountry ? aggregateByCity(visible, selectedCountry).sort((a, b) => b.totalValue - a.totalValue) : []),
    [visible, selectedCountry]
  );
  const accounts = useMemo(
    () => visible.filter((c) => c.country === selectedCountry && c.city === selectedCity).sort((a, b) => b.dealValue - a.dealValue),
    [visible, selectedCountry, selectedCity]
  );

  if (drill !== "country" && drill !== "city") return null;

  const dominant = (city: string) => {
    const by: Record<string, number> = {};
    for (const c of visible) if (c.country === selectedCountry && c.city === city) by[c.ownerRep] = (by[c.ownerRep] ?? 0) + c.dealValue;
    return Object.entries(by).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  };

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-20 flex max-h-[calc(100%-7rem)] w-72 flex-col rounded-2xl glass shadow-card sm:right-4 sm:top-4">
      <div className="border-b border-white/5 px-4 py-3">
        <div className="label-eyebrow">{drill === "country" ? "Cities in" : "Accounts in"}</div>
        <div className="text-sm font-semibold text-white">{drill === "country" ? selectedCountry : selectedCity}</div>
        <div className="mt-0.5 text-[11px] text-slate-500">
          {drill === "country" ? `${cities.length} cities · click to zoom in` : `${accounts.length} accounts · click to open`}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {drill === "country"
          ? cities.map((c) => {
              const rep = dominant(c.city);
              return (
                <button
                  key={c.city}
                  onClick={() => drillToCity(selectedCountry!, c.city)}
                  className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/5"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: repColor(rep), boxShadow: `0 0 6px ${repColor(rep)}` }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{c.city}</div>
                    <div className="text-[11px] text-slate-500">{c.dealCount} account{c.dealCount > 1 ? "s" : ""}</div>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-slate-300">{fmtMoney(c.totalValue)}</span>
                  <ChevronIcon className="h-4 w-4 text-slate-600 group-hover:text-slate-300" />
                </button>
              );
            })
          : accounts.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCompany(c)}
                className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/5"
              >
                <RepAvatar rep={c.ownerRep} size={22} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{c.name}</div>
                  <div className="mt-0.5">
                    <StageBadge stage={c.stage} className="!px-1.5 !py-0.5 !text-[10px]" />
                  </div>
                </div>
                <span className="text-xs font-semibold tabular-nums text-slate-300">{fmtMoney(c.dealValue)}</span>
                <ChevronIcon className="h-4 w-4 text-slate-600 group-hover:text-slate-300" />
              </button>
            ))}
      </div>
    </div>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
