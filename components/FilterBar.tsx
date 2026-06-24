"use client";

import { REPS, REP_COLORS, companies } from "@/lib/data";
import { useCockpit } from "@/lib/store";
import { useFiltered } from "@/lib/useFiltered";
import { RepAvatar, WarnIcon } from "./ui";

export default function FilterBar() {
  const repFilter = useCockpit((s) => s.repFilter);
  const filterToRep = useCockpit((s) => s.filterToRep);
  const overlapsOnly = useCockpit((s) => s.overlapsOnly);
  const toggleOverlapsOnly = useCockpit((s) => s.toggleOverlapsOnly);

  const { visible, overlaps } = useFiltered();
  const overlapCount = visible.filter((c) => overlaps.has(c.name.toLowerCase())).length;

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-col gap-2 sm:left-4 sm:top-4">
      <LocationNav />

      {/* Rep filter — doubles as the rep color key */}
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 self-start rounded-xl glass p-1.5 shadow-card">
        <span className="px-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Book
        </span>
        <RepPill active={repFilter === "all"} onClick={() => filterToRep("all")} dot="#94a3b8">
          Whole team
        </RepPill>
        {REPS.map((rep) => (
          <RepPill
            key={rep}
            active={repFilter === rep}
            onClick={() => filterToRep(rep)}
            dot={REP_COLORS[rep]}
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: REP_COLORS[rep], boxShadow: `0 0 6px ${REP_COLORS[rep]}` }} />
              <span className="hidden sm:inline">{rep.split(" ")[0]}</span>
            </span>
          </RepPill>
        ))}

        <span className="mx-0.5 h-5 w-px bg-white/10" />

        <button
          onClick={toggleOverlapsOnly}
          className={`chip transition-all ${
            overlapsOnly
              ? "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40"
              : "text-slate-400 hover:bg-white/5"
          }`}
          title="Show only accounts worked by more than one rep"
        >
          <WarnIcon className="h-3.5 w-3.5" />
          Overlaps only
          <span className="rounded-full bg-amber-400/20 px-1.5 text-[10px] font-bold text-amber-300">
            {overlapCount}
          </span>
        </button>
      </div>
    </div>
  );
}

// Elegant location label with a subtle back affordance (replaces the
// folder-path breadcrumb). Going back reverse-animates the camera via state.
function LocationNav() {
  const drill = useCockpit((s) => s.drill);
  const country = useCockpit((s) => s.selectedCountry);
  const city = useCockpit((s) => s.selectedCity);
  const selectedId = useCockpit((s) => s.selectedCompanyId);
  const drillUp = useCockpit((s) => s.drillUp);

  const company = selectedId ? companies.find((c) => c.id === selectedId) : null;

  let title = "Worldwide pipeline";
  let sub = "Click a market to zoom in";
  if (drill === "company" && company) {
    title = company.name;
    sub = `${company.city}, ${company.country}`;
  } else if (drill === "city" && city) {
    title = city;
    sub = country ?? "";
  } else if (drill === "country" && country) {
    title = country;
    sub = "Accounts by city";
  }

  return (
    <div className="pointer-events-auto flex items-center gap-2 self-start rounded-xl glass py-1.5 pl-1.5 pr-3 shadow-card">
      {drill !== "globe" ? (
        <button
          onClick={drillUp}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <span className="grid h-8 w-8 place-items-center text-accent-soft">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3.5 12h17M12 3.5c2.4 2.3 2.4 14.7 0 17M12 3.5c-2.4 2.3-2.4 14.7 0 17" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </span>
      )}
      <div className="leading-tight">
        <div className="max-w-[200px] truncate text-sm font-semibold tracking-tight text-white">
          {title}
        </div>
        {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}

function RepPill({
  active,
  onClick,
  dot,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dot: string;
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
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} />
      )}
      {children}
    </button>
  );
}
