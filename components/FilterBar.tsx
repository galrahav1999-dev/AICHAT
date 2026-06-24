"use client";

import { REPS, REP_COLORS } from "@/lib/data";
import { useCockpit } from "@/lib/store";
import { useFiltered } from "@/lib/useFiltered";
import { RepAvatar, WarnIcon } from "./ui";

export default function FilterBar() {
  const repFilter = useCockpit((s) => s.repFilter);
  const setRepFilter = useCockpit((s) => s.setRepFilter);
  const overlapsOnly = useCockpit((s) => s.overlapsOnly);
  const toggleOverlapsOnly = useCockpit((s) => s.toggleOverlapsOnly);

  const drill = useCockpit((s) => s.drill);
  const country = useCockpit((s) => s.selectedCountry);
  const city = useCockpit((s) => s.selectedCity);
  const drillToGlobe = useCockpit((s) => s.drillToGlobe);
  const drillToCountry = useCockpit((s) => s.drillToCountry);

  const { visible, overlaps } = useFiltered();
  const overlapCount = visible.filter((c) => overlaps.has(c.name.toLowerCase())).length;

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-col gap-2 sm:left-4 sm:top-4">
      {/* Breadcrumb */}
      <nav className="pointer-events-auto flex items-center gap-1 self-start rounded-xl glass px-2 py-1 text-xs text-slate-400 shadow-card">
        <Crumb active={drill === "globe"} onClick={drillToGlobe}>
          World
        </Crumb>
        {country && (
          <>
            <Sep />
            <Crumb active={drill === "country"} onClick={() => drillToCountry(country)}>
              {country}
            </Crumb>
          </>
        )}
        {city && (
          <>
            <Sep />
            <Crumb active={drill === "city" || drill === "company"} onClick={() => {}}>
              {city}
            </Crumb>
          </>
        )}
      </nav>

      {/* Rep filter + overlaps */}
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 self-start rounded-xl glass p-1.5 shadow-card">
        <span className="px-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Book
        </span>
        <RepPill
          active={repFilter === "all"}
          onClick={() => setRepFilter("all")}
          dot="#94a3b8"
        >
          Whole team
        </RepPill>
        {REPS.map((rep) => (
          <RepPill
            key={rep}
            active={repFilter === rep}
            onClick={() => setRepFilter(rep)}
            dot={REP_COLORS[rep]}
          >
            <span className="flex items-center gap-1.5">
              <RepAvatar rep={rep} size={16} />
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

function Crumb({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-2 py-0.5 font-medium transition-colors ${
        active ? "text-white" : "hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="text-slate-600">/</span>;
}
