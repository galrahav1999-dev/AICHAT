"use client";

import { useState } from "react";
import { useCockpit, pendingCount, type CrmOption } from "@/lib/store";
import { companies, fmtMoney, isOpen } from "@/lib/data";
import { SparkIcon } from "./ui";
import type { ViewMode } from "@/lib/types";

const VIEWS: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "globe", label: "Globe", icon: <GlobeIcon /> },
  { id: "map", label: "Map", icon: <MapIcon /> },
  { id: "list", label: "List & Board", icon: <BoardIcon /> },
];

const CRMS: CrmOption[] = ["HubSpot", "Salesforce", "Pipedrive"];

// Whole-book KPIs (always reflect the full team, not the active filter).
const openPipeline = companies.filter(isOpen).reduce((s, c) => s + c.dealValue, 0);

export default function Header() {
  const view = useCockpit((s) => s.view);
  const setView = useCockpit((s) => s.setView);
  const drafts = useCockpit((s) => s.drafts);
  const togglePanel = useCockpit((s) => s.togglePanel);
  const pending = pendingCount(drafts);

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-3 border-b border-white/5 bg-ink-900/80 px-3 backdrop-blur-xl sm:px-4">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="relative grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-accent to-sky-500 shadow-[0_6px_20px_-6px_rgba(99,102,241,0.8)]">
          <span className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
          <OrbitMark />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight text-white">Cockpit</div>
          <div className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 sm:block">
            Pipeline, in orbit
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div className="ml-1 flex items-center gap-0.5 rounded-xl bg-ink-800/80 p-0.5 ring-1 ring-white/5">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`btn gap-1.5 ${
              view === v.id
                ? "bg-ink-700 text-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.6)]"
                : "text-slate-400 hover:text-white"
            }`}
            aria-pressed={view === v.id}
          >
            {v.icon}
            <span className="hidden md:inline">{v.label}</span>
          </button>
        ))}
      </div>

      {/* KPI strip */}
      <div className="ml-2 hidden items-center gap-4 lg:flex">
        <Kpi label="Open pipeline" value={fmtMoney(openPipeline)} />
        <span className="h-6 w-px bg-white/5" />
        <Kpi label="Accounts" value={String(companies.length)} />
      </div>

      <div className="flex-1" />

      {/* CRM connector (cosmetic) */}
      <CrmMenu />

      {/* Automation trigger */}
      <button
        onClick={() => togglePanel(true)}
        className="btn relative gap-2 bg-ink-800/80 ring-1 ring-white/5 hover:ring-accent/40"
      >
        <SparkIcon className="h-4 w-4 text-accent-soft" />
        <span className="hidden text-slate-200 sm:inline">Approvals</span>
        {pending > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
            {pending}
          </span>
        )}
      </button>
    </header>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="leading-tight">
      <div className="label-eyebrow">{label}</div>
      <div className="text-sm font-semibold text-white tabular-nums">{value}</div>
    </div>
  );
}

function CrmMenu() {
  const crm = useCockpit((s) => s.crm);
  const setCrm = useCockpit((s) => s.setCrm);
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="btn gap-2 bg-ink-800/80 ring-1 ring-white/5 hover:ring-white/10"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
        <span className="hidden text-slate-400 sm:inline">Connected to</span>
        <span className="font-semibold text-white">{crm}</span>
        <ChevronIcon className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-48 animate-fade-in rounded-xl border border-white/10 bg-ink-850/95 p-1 shadow-card backdrop-blur-xl">
          {CRMS.map((c) => (
            <button
              key={c}
              onMouseDown={() => {
                setCrm(c);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-white/5 ${
                c === crm ? "text-white" : "text-slate-400"
              }`}
            >
              {c}
              {c === crm && <CheckIcon className="h-4 w-4 text-accent-soft" />}
            </button>
          ))}
          <div className="px-3 pb-1 pt-2 text-[10px] text-slate-600">
            CRM-agnostic · cosmetic in this demo
          </div>
        </div>
      )}
    </div>
  );
}

/* --- inline icons --- */
function OrbitMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <ellipse cx="12" cy="12" rx="10" ry="4.5" stroke="currentColor" strokeWidth="1.4" opacity="0.7" transform="rotate(28 12 12)" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="m9 4-6 2.5v13L9 17l6 2.5L21 17V4l-6 2.5L9 4Zm0 0v13m6-10.5v13" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function BoardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <rect x="3" y="4" width="6" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="4" width="6" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M19 6h2M19 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
