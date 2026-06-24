"use client";

import { companies, fmtMoney, fmtDate, relativeFromToday, repsForName, daysFromToday } from "@/lib/data";
import { overlappingNames } from "@/lib/data";
import { useCockpit } from "@/lib/store";
import { RepAvatar, StageBadge, OverlapBadge, SparkIcon, WarnIcon } from "./ui";
import { useMemo } from "react";

export default function AccountDetailCard() {
  const selectedId = useCockpit((s) => s.selectedCompanyId);
  const drill = useCockpit((s) => s.drill);
  const clearSelection = useCockpit((s) => s.clearSelection);
  const togglePanel = useCockpit((s) => s.togglePanel);

  const overlaps = useMemo(() => overlappingNames(), []);
  const company = selectedId ? companies.find((c) => c.id === selectedId) : null;

  if (!company || drill !== "company") return null;

  const isOverlap = overlaps.has(company.name.toLowerCase());
  const otherReps = repsForName(company.name).filter((r) => r !== company.ownerRep);
  const dueIn = daysFromToday(company.nextFollowUp);
  const overdue = dueIn !== null && dueIn <= 0;

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-20 w-[340px] max-w-[calc(100%-1.5rem)] animate-slide-in sm:right-4 sm:top-4">
      <div className="card overflow-hidden">
        {/* Header band */}
        <div className="relative border-b border-white/5 p-4">
          <button
            onClick={clearSelection}
            className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="label-eyebrow">Account</div>
          <h2 className="mt-0.5 pr-8 text-lg font-semibold tracking-tight text-white">
            {company.name}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <PinIcon className="h-3.5 w-3.5" />
            {company.city}, {company.country}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StageBadge stage={company.stage} />
            {isOverlap && <OverlapBadge reps={repsForName(company.name)} />}
          </div>
        </div>

        {/* Overlap callout */}
        {isOverlap && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-200">
            <WarnIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold">Account overlap.</span> Also being worked by{" "}
              {otherReps.map((r, i) => (
                <span key={r} className="font-medium text-amber-100">
                  {r}
                  {i < otherReps.length - 1 ? ", " : ""}
                </span>
              ))}
              . Coordinate before reaching out.
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-px bg-white/5 p-px">
          <Stat label="Deal value" value={fmtMoney(company.dealValue)} accent />
          <Stat label="Owner">
            <span className="flex items-center gap-1.5">
              <RepAvatar rep={company.ownerRep} size={18} />
              <span className="text-sm font-medium text-white">{company.ownerRep}</span>
            </span>
          </Stat>
          <Stat label="Last activity" value={fmtDate(company.lastActivity)} sub={company.activityNote} />
          <Stat
            label="Next follow-up"
            value={fmtDate(company.nextFollowUp)}
            sub={overdue ? "overdue" : relativeFromToday(company.nextFollowUp)}
            subTone={overdue ? "danger" : "default"}
          />
        </div>

        {/* AI follow-up */}
        <div className="p-4">
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-soft">
              <SparkIcon className="h-3.5 w-3.5" />
              AI-suggested next step
            </div>
            <p className="text-sm leading-relaxed text-slate-200">{company.aiFollowUp}</p>
          </div>

          <button
            onClick={() => togglePanel(true)}
            className="btn-primary mt-3 w-full"
          >
            <SparkIcon className="h-4 w-4" />
            Draft follow-up for approval
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  subTone = "default",
  accent,
  children,
}: {
  label: string;
  value?: string;
  sub?: string;
  subTone?: "default" | "danger";
  accent?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-ink-850 p-3">
      <div className="label-eyebrow">{label}</div>
      <div className="mt-1">
        {children ?? (
          <span className={`text-sm font-semibold ${accent ? "text-accent-glow" : "text-white"}`}>
            {value}
          </span>
        )}
      </div>
      {sub && (
        <div
          className={`mt-0.5 text-[11px] ${
            subTone === "danger" ? "font-medium text-rose-400" : "text-slate-500"
          }`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
