"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { useCockpit } from "@/lib/store";
import { useFiltered } from "@/lib/useFiltered";
import {
  aggregateByCity,
  aggregateByCountry,
  companies as ALL,
  fmtMoney,
  STAGE_COLORS,
} from "@/lib/data";
import type { Company, Stage } from "@/lib/types";

const NIGHT = "//unpkg.com/three-globe/example/img/earth-night.jpg";
const BUMP = "//unpkg.com/three-globe/example/img/earth-topology.png";

// Altitude (camera distance) per drill level — smaller = closer in.
const ALT = { globe: 2.5, country: 1.15, city: 0.45, company: 0.28 } as const;
const FLY_MS = 1600;

type Pt =
  | { kind: "country"; country: string; lat: number; lng: number; value: number; count: number }
  | { kind: "city"; country: string; city: string; lat: number; lng: number; value: number; count: number }
  | {
      kind: "company";
      company: Company;
      lat: number;
      lng: number;
      value: number;
      count: number;
      selected: boolean;
    };

export default function GlobeView() {
  const globeRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [ready, setReady] = useState(false);

  const { visible } = useFiltered();

  const drill = useCockpit((s) => s.drill);
  const selectedCountry = useCockpit((s) => s.selectedCountry);
  const selectedCity = useCockpit((s) => s.selectedCity);
  const selectedCompanyId = useCockpit((s) => s.selectedCompanyId);
  const drillToCountry = useCockpit((s) => s.drillToCountry);
  const drillToCity = useCockpit((s) => s.drillToCity);
  const selectCompany = useCockpit((s) => s.selectCompany);

  // --- Responsive sizing ---
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- Build the right point set for the current drill level ---
  const points = useMemo<Pt[]>(() => {
    if (drill === "globe") {
      const aggs = aggregateByCountry(visible);
      const max = Math.max(1, ...aggs.map((a) => a.totalValue));
      return aggs.map((a) => ({
        kind: "country",
        country: a.country,
        lat: a.lat,
        lng: a.lng,
        value: a.totalValue,
        count: a.dealCount,
        _max: max,
      })) as any;
    }
    if (drill === "country" && selectedCountry) {
      const aggs = aggregateByCity(visible, selectedCountry);
      return aggs.map((a) => ({
        kind: "city",
        country: a.country,
        city: a.city,
        lat: a.lat,
        lng: a.lng,
        value: a.totalValue,
        count: a.dealCount,
      }));
    }
    // city / company level -> individual pins for the city
    const list = visible.filter(
      (c) => c.country === selectedCountry && c.city === selectedCity
    );
    return list.map((c) => ({
      kind: "company",
      company: c,
      lat: c.lat,
      lng: c.lng,
      value: c.dealValue,
      count: 1,
      selected: c.id === selectedCompanyId,
    }));
  }, [drill, selectedCountry, selectedCity, selectedCompanyId, visible]);

  const maxValue = useMemo(
    () => Math.max(1, ...points.map((p) => p.value)),
    [points]
  );

  // --- Camera flight driven purely by state (keeps views in sync) ---
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    let target: { lat: number; lng: number; altitude: number };

    if (drill === "company" && selectedCompanyId) {
      const c = ALL.find((x) => x.id === selectedCompanyId)!;
      target = { lat: c.lat, lng: c.lng, altitude: ALT.company };
    } else if (drill === "city" && selectedCountry && selectedCity) {
      const a = aggregateByCity(ALL, selectedCountry).find((x) => x.city === selectedCity);
      target = { lat: a?.lat ?? 0, lng: a?.lng ?? 0, altitude: ALT.city };
    } else if (drill === "country" && selectedCountry) {
      const a = aggregateByCountry(ALL).find((x) => x.country === selectedCountry);
      target = { lat: a?.lat ?? 0, lng: a?.lng ?? 0, altitude: ALT.country };
    } else {
      const cur = g.pointOfView();
      target = { lat: 18, lng: cur?.lng ?? 0, altitude: ALT.globe };
    }
    g.pointOfView(target, FLY_MS);
  }, [drill, selectedCountry, selectedCity, selectedCompanyId]);

  // --- Auto-rotate only at the world level ---
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = drill === "globe";
    controls.autoRotateSpeed = 0.45;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
  }, [drill, ready]);

  // Initial framing.
  useEffect(() => {
    const g = globeRef.current;
    if (g && ready) {
      g.pointOfView({ lat: 18, lng: -30, altitude: ALT.globe }, 0);
      const controls = g.controls();
      controls.minDistance = 110;
      controls.maxDistance = 600;
    }
  }, [ready]);

  function handleClick(pt: Pt | null) {
    if (!pt) return;
    if (pt.kind === "country") drillToCountry(pt.country);
    else if (pt.kind === "city") drillToCity(pt.country, pt.city);
    else selectCompany(pt.company);
  }

  const isAggregate = drill === "globe" || drill === "country";

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      {/* Starfield backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-ink-950">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.7), transparent), radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,0.5), transparent), radial-gradient(1.5px 1.5px at 40% 80%, rgba(255,255,255,0.6), transparent), radial-gradient(1px 1px at 85% 20%, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 55% 15%, rgba(255,255,255,0.4), transparent)",
          }}
        />
      </div>

      <Globe
        ref={globeRef}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl={NIGHT}
        bumpImageUrl={BUMP}
        showAtmosphere
        atmosphereColor="#6f8bff"
        atmosphereAltitude={0.18}
        onGlobeReady={() => setReady(true)}
        // points
        pointsData={points as object[]}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lng}
        pointAltitude={(d: any) =>
          isAggregate ? 0.06 + 0.55 * (d.value / maxValue) : d.selected ? 0.12 : 0.04
        }
        pointRadius={(d: any) =>
          isAggregate ? 0.45 + 0.7 * (d.value / maxValue) : d.selected ? 0.6 : 0.35
        }
        pointColor={(d: any) =>
          d.kind === "company" ? STAGE_COLORS[d.company.stage as Stage] : d.selected ? "#a5b4fc" : "#818cf8"
        }
        pointResolution={6}
        pointsTransitionDuration={700}
        onPointClick={(p: any) => handleClick(p as Pt)}
        pointLabel={(d: any) => labelHtml(d, maxValue)}
        // pulsing rings under aggregate/selected points
        ringsData={ringData(points)}
        ringLat={(d: any) => d.lat}
        ringLng={(d: any) => d.lng}
        ringColor={() => (t: number) => `rgba(129,140,248,${1 - t})`}
        ringMaxRadius={(d: any) => (isAggregate ? 4 : 2)}
        ringPropagationSpeed={2}
        ringRepeatPeriod={1400}
      />

      <Legend isCompany={drill === "city" || drill === "company"} />
    </div>
  );
}

// Only show pulse rings for the strongest few points to keep it clean.
function ringData(points: Pt[]) {
  const top = [...points].sort((a, b) => b.value - a.value).slice(0, 6);
  return top as object[];
}

function labelHtml(d: any, max: number): string {
  if (d.kind === "company") {
    const c: Company = d.company;
    return `<div style="font-family:Inter,sans-serif;background:rgba(15,17,23,0.92);border:1px solid rgba(255,255,255,0.1);
      padding:8px 10px;border-radius:10px;color:#e2e8f0;font-size:12px;backdrop-filter:blur(8px);box-shadow:0 8px 30px rgba(0,0,0,0.5)">
      <div style="font-weight:600;color:#fff">${c.name}</div>
      <div style="color:#94a3b8">${c.stage} · ${fmtMoney(c.dealValue)}</div>
      <div style="color:#64748b;font-size:11px">${c.ownerRep}</div></div>`;
  }
  const title = d.kind === "country" ? d.country : d.city;
  const sub = d.kind === "country" ? "Click to drill into cities" : "Click to see accounts";
  return `<div style="font-family:Inter,sans-serif;background:rgba(15,17,23,0.92);border:1px solid rgba(255,255,255,0.1);
    padding:8px 10px;border-radius:10px;color:#e2e8f0;font-size:12px;backdrop-filter:blur(8px);box-shadow:0 8px 30px rgba(0,0,0,0.5)">
    <div style="font-weight:600;color:#fff">${title}</div>
    <div style="color:#a5b4fc">${fmtMoney(d.value)} · ${d.count} deal${d.count > 1 ? "s" : ""}</div>
    <div style="color:#64748b;font-size:11px">${sub}</div></div>`;
}

function Legend({ isCompany }: { isCompany: boolean }) {
  if (!isCompany) {
    return (
      <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl glass px-3 py-2 text-[11px] text-slate-400 shadow-card">
        <span className="text-accent-soft">●</span> sized & lit by pipeline value · click to fly in
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 flex flex-wrap gap-x-3 gap-y-1 rounded-xl glass px-3 py-2 text-[11px] text-slate-400 shadow-card">
      {Object.entries(STAGE_COLORS).map(([s, c]) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
          {s}
        </span>
      ))}
    </div>
  );
}
