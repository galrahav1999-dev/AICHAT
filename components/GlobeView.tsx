"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";
import { feature } from "topojson-client";
import { useCockpit } from "@/lib/store";
import { useFiltered } from "@/lib/useFiltered";
import {
  aggregateByCity,
  aggregateByCountry,
  companies as ALL,
  fmtMoney,
  repColor,
  rgba,
  OVERLAP_COLOR,
  REPS,
  REP_COLORS,
  POLY_NAME_TO_COUNTRY,
} from "@/lib/data";
import type { Company } from "@/lib/types";

const ATLAS = "https://unpkg.com/world-atlas@2/countries-110m.json";

// Altitude (camera distance) per drill level — smaller = closer in.
const ALT = { globe: 2.5, country: 1.15, city: 0.5, street: 0.62, company: 0.26 } as const;
const FLY_MS = 1500;
const norm = (s: string) => s.trim().toLowerCase();

// Minimalist deep-navy globe so neon beams + countries pop on the white vortex.
const globeMaterial = new THREE.MeshPhongMaterial({
  color: "#0a0e1c",
  emissive: "#0a0f22",
  emissiveIntensity: 0.6,
  shininess: 6,
});

export default function GlobeView() {
  const globeRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [ready, setReady] = useState(false);
  const [polys, setPolys] = useState<any[]>([]);
  const [hoverPoly, setHoverPoly] = useState<any>(null);

  const { visible, overlaps } = useFiltered();

  const drill = useCockpit((s) => s.drill);
  const repFilter = useCockpit((s) => s.repFilter);
  const selectedCountry = useCockpit((s) => s.selectedCountry);
  const selectedCity = useCockpit((s) => s.selectedCity);
  const selectedCompanyId = useCockpit((s) => s.selectedCompanyId);
  const drillToCountry = useCockpit((s) => s.drillToCountry);
  const drillToCity = useCockpit((s) => s.drillToCity);
  const selectCompany = useCockpit((s) => s.selectCompany);

  const selectRef = useRef(selectCompany);
  selectRef.current = selectCompany;

  const isAggregate = drill === "globe" || drill === "country";

  // Countries that have pipeline (for territory coloring).
  const dealCountries = useMemo(() => new Set(visible.map((c) => c.country)), [visible]);

  // --- Load country shapes once (browser fetch; globe works without them) ---
  useEffect(() => {
    let alive = true;
    fetch(ATLAS)
      .then((r) => r.json())
      .then((topo) => {
        const fc: any = feature(topo, topo.objects.countries);
        if (alive) setPolys(fc.features);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // --- Responsive sizing ---
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- Point/beam data (value/count normalized so sizes never NaN) ---
  const points = useMemo(() => {
    if (drill === "globe") {
      const aggs = aggregateByCountry(visible);
      return aggs.map((a) => ({ kind: "country", country: a.country, lat: a.lat, lng: a.lng, value: a.totalValue, count: a.dealCount }));
    }
    if (drill === "country" && selectedCountry) {
      const aggs = aggregateByCity(visible, selectedCountry);
      return aggs.map((a) => ({ kind: "city", country: a.country, city: a.city, lat: a.lat, lng: a.lng, value: a.totalValue, count: a.dealCount }));
    }
    const list = visible.filter((c) => c.country === selectedCountry && c.city === selectedCity);
    return list.map((c) => ({
      kind: "company" as const,
      company: c,
      lat: c.lat,
      lng: c.lng,
      value: c.dealValue,
      overlap: overlaps.has(norm(c.name)),
      selected: c.id === selectedCompanyId,
    }));
  }, [drill, selectedCountry, selectedCity, selectedCompanyId, visible, overlaps]);

  const maxValue = useMemo(() => Math.max(1, ...points.map((p: any) => p.value || 0)), [points]);

  // --- HTML overlays: overlap badges + selected name label ---
  const htmlData = useMemo(() => {
    if (isAggregate) return [] as any[];
    const inCity = visible.filter((c) => c.country === selectedCountry && c.city === selectedCity);
    const byName = new Map<string, { name: string; lat: number; lng: number; reps: string[] }>();
    for (const c of inCity) {
      if (!overlaps.has(norm(c.name))) continue;
      const e = byName.get(norm(c.name)) ?? { name: c.name, lat: 0, lng: 0, reps: [] };
      e.lat += c.lat;
      e.lng += c.lng;
      if (!e.reps.includes(c.ownerRep)) e.reps.push(c.ownerRep);
      byName.set(norm(c.name), e);
    }
    const badges = [...byName.values()].map((e) => ({ type: "overlap" as const, lat: e.lat / 2, lng: e.lng / 2, reps: e.reps }));
    const sel = inCity.find((c) => c.id === selectedCompanyId);
    const label = sel ? [{ type: "label" as const, lat: sel.lat, lng: sel.lng, text: sel.name }] : [];
    return [...badges, ...label];
  }, [isAggregate, visible, selectedCountry, selectedCity, selectedCompanyId, overlaps]);

  // --- Camera flights (state-driven; reused by back, filters, panel, polygons) ---
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    if (drill === "company" && selectedCompanyId) {
      const c = ALL.find((x) => x.id === selectedCompanyId);
      if (!c) return;
      g.pointOfView({ lat: c.lat, lng: c.lng, altitude: ALT.street }, 750);
      settleTimer.current = setTimeout(() => g.pointOfView({ lat: c.lat, lng: c.lng, altitude: ALT.company }, 950), 780);
    } else if (drill === "city" && selectedCountry && selectedCity) {
      const a = aggregateByCity(ALL, selectedCountry).find((x) => x.city === selectedCity);
      g.pointOfView({ lat: a?.lat ?? 0, lng: a?.lng ?? 0, altitude: ALT.city }, FLY_MS);
    } else if (drill === "country" && selectedCountry) {
      const a = aggregateByCountry(ALL).find((x) => x.country === selectedCountry);
      g.pointOfView({ lat: a?.lat ?? 0, lng: a?.lng ?? 0, altitude: ALT.country }, FLY_MS);
    } else {
      const cur = g.pointOfView();
      g.pointOfView({ lat: 18, lng: cur?.lng ?? 0, altitude: ALT.globe }, FLY_MS);
    }
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [drill, selectedCountry, selectedCity, selectedCompanyId]);

  // --- Auto-rotate only at the world level (drilling "locks" the view) ---
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const c = g.controls();
    c.autoRotate = drill === "globe";
    c.autoRotateSpeed = 0.4;
    c.enableDamping = true;
    c.dampingFactor = 0.1;
  }, [drill, ready]);

  useEffect(() => {
    const g = globeRef.current;
    if (g && ready) {
      g.pointOfView({ lat: 18, lng: -30, altitude: ALT.globe }, 0);
      const c = g.controls();
      c.minDistance = 101;
      c.maxDistance = 600;
    }
  }, [ready]);

  function handlePointClick(pt: any) {
    if (!pt) return;
    if (pt.kind === "country") drillToCountry(pt.country);
    else if (pt.kind === "city") drillToCity(pt.country, pt.city);
    else selectRef.current(pt.company);
  }

  function handlePolyClick(p: any) {
    const country = POLY_NAME_TO_COUNTRY[p?.properties?.name];
    if (country && dealCountries.has(country)) drillToCountry(country);
  }

  const aggColor = repFilter !== "all" ? repColor(repFilter) : "#7c8cff";

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
      {/* White vortex backdrop — shifting purple/blue, slow + minimal */}
      <div className="vortex pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[170%] w-[170%] -translate-x-1/2 -translate-y-1/2">
          <div className="vortex-spin h-full w-full" />
        </div>
        <div className="vortex-blob vortex-blob--p" />
        <div className="vortex-blob vortex-blob--b" />
      </div>

      <Globe
        ref={globeRef}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={globeMaterial}
        showAtmosphere
        atmosphereColor="#9b8cff"
        atmosphereAltitude={0.22}
        onGlobeReady={() => setReady(true)}
        // --- Country territories (hover to highlight, click to zoom-lock) ---
        polygonsData={isAggregate ? polys : []}
        polygonAltitude={(d: any) => (d === hoverPoly ? 0.06 : 0.012)}
        polygonCapColor={(d: any) => {
          const country = POLY_NAME_TO_COUNTRY[d?.properties?.name];
          if (d === hoverPoly) return rgba("#a78bfa", 0.85);
          if (country && dealCountries.has(country)) return rgba(aggColor, 0.32);
          return "rgba(120,130,170,0.10)";
        }}
        polygonSideColor={() => "rgba(120,110,200,0.12)"}
        polygonStrokeColor={(d: any) =>
          d === hoverPoly ? "#c4b5fd" : "rgba(160,170,210,0.25)"
        }
        polygonsTransitionDuration={250}
        onPolygonHover={(p: any) => setHoverPoly(p || null)}
        onPolygonClick={handlePolyClick}
        polygonLabel={(d: any) => territoryLabel(d, dealCountries)}
        // --- Neon beams ---
        pointsData={points as object[]}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lng}
        pointAltitude={(d: any) => (isAggregate ? 0.05 + 0.45 * (d.value / maxValue) : d.selected ? 0.16 : 0.085)}
        pointRadius={(d: any) => (isAggregate ? 0.3 + 0.4 * (d.value / maxValue) : d.selected ? 0.4 : 0.26)}
        pointColor={(d: any) =>
          d.kind === "company" ? rgba(repColor(d.company.ownerRep), d.selected ? 1 : 0.92) : rgba(aggColor, 0.9)
        }
        pointResolution={12}
        pointsTransitionDuration={600}
        onPointClick={handlePointClick}
        pointLabel={(d: any) => beamLabel(d)}
        // --- Glow rings: pipeline hot-spots / overlap pulses ---
        ringsData={ringData(points as any[], isAggregate)}
        ringLat={(d: any) => d.lat}
        ringLng={(d: any) => d.lng}
        ringColor={(d: any) => {
          const base = d.__overlap ? OVERLAP_COLOR : aggColor;
          return (t: number) => rgba(base, 1 - t);
        }}
        ringMaxRadius={(d: any) => (d.__overlap ? 2.4 : isAggregate ? 3.4 : 1.8)}
        ringPropagationSpeed={(d: any) => (d.__overlap ? 1.6 : 1.8)}
        ringRepeatPeriod={(d: any) => (d.__overlap ? 1100 : 1500)}
        // --- HTML overlays ---
        htmlElementsData={htmlData}
        htmlLat={(d: any) => d.lat}
        htmlLng={(d: any) => d.lng}
        htmlAltitude={(d: any) => (d.type === "label" ? 0.22 : 0.14)}
        htmlElement={(d: any) => makeHtml(d)}
      />

      {/* Hovered territory name (bottom-center, elegant) */}
      {isAggregate && hoverPoly && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-ink-900/80 px-4 py-1.5 text-sm font-medium text-white shadow-card backdrop-blur-md">
          {hoverPoly.properties.name}
          {(() => {
            const c = POLY_NAME_TO_COUNTRY[hoverPoly.properties.name];
            return c && dealCountries.has(c) ? (
              <span className="ml-2 text-accent-glow">· click to zoom in</span>
            ) : (
              <span className="ml-2 text-slate-500">· no accounts</span>
            );
          })()}
        </div>
      )}

      {isAggregate ? <ValueHint /> : <RepLegend />}
    </div>
  );
}

function ringData(points: any[], isAggregate: boolean) {
  if (isAggregate) return [...points].sort((a, b) => b.value - a.value).slice(0, 6) as object[];
  return points.filter((p) => p.overlap).map((p) => ({ ...p, __overlap: true })) as object[];
}

function makeHtml(d: any): HTMLElement {
  if (d.type === "label") {
    const el = document.createElement("div");
    el.style.cssText =
      "transform:translate(-50%,-160%);font-family:Inter,sans-serif;font-size:12px;font-weight:600;color:#fff;background:rgba(15,17,23,0.85);border:1px solid rgba(255,255,255,0.12);padding:3px 8px;border-radius:8px;white-space:nowrap;backdrop-filter:blur(6px);box-shadow:0 6px 24px rgba(0,0,0,0.5)";
    el.textContent = d.text;
    return el;
  }
  const el = document.createElement("div");
  el.style.cssText =
    "transform:translate(-50%,-50%);display:flex;align-items:center;gap:5px;font-family:Inter,sans-serif;font-size:11px;font-weight:700;color:#0b0d12;background:" +
    OVERLAP_COLOR +
    ";padding:3px 7px;border-radius:999px;white-space:nowrap;box-shadow:0 0 16px -2px " +
    OVERLAP_COLOR +
    ";animation:pulseGlow 2s ease-in-out infinite";
  const dots = (d.reps as string[])
    .map((r) => `<span style="width:8px;height:8px;border-radius:999px;display:inline-block;background:${repColor(r)};box-shadow:0 0 4px ${repColor(r)}"></span>`)
    .join("");
  el.innerHTML = `<span style="display:flex;gap:3px">${dots}</span><span>${d.reps.length} reps</span>`;
  return el;
}

function box(title: string, lines: string[]) {
  return `<div style="font-family:Inter,sans-serif;background:rgba(15,17,23,0.92);border:1px solid rgba(255,255,255,0.1);padding:8px 10px;border-radius:10px;color:#e2e8f0;font-size:12px;backdrop-filter:blur(8px);box-shadow:0 8px 30px rgba(0,0,0,0.5)">
    <div style="font-weight:600;color:#fff">${title}</div>${lines.map((l) => `<div style="color:#94a3b8">${l}</div>`).join("")}</div>`;
}

function beamLabel(d: any): string {
  if (d.kind === "company") {
    const c: Company = d.company;
    return box(c.name, [`${c.stage} · ${fmtMoney(c.dealValue)}`, `${c.ownerRep}${d.overlap ? " · ⚠ overlap" : ""}`]);
  }
  const title = d.kind === "country" ? d.country : d.city;
  return box(title, [`${fmtMoney(d.value)} · ${d.count} deals`, d.kind === "country" ? "Click to drill into cities" : "Click to see accounts"]);
}

function territoryLabel(d: any, dealCountries: Set<string>): string {
  const country = POLY_NAME_TO_COUNTRY[d?.properties?.name];
  const has = country && dealCountries.has(country);
  return box(d?.properties?.name ?? "", [has ? "Has active pipeline" : "No accounts here"]);
}

function ValueHint() {
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl glass px-3 py-2 text-[11px] text-slate-300 shadow-card">
      <span className="text-accent-soft">●</span> beam height = pipeline value · hover a country, click to zoom
    </div>
  );
}

function RepLegend() {
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl glass px-3 py-2.5 shadow-card">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Reps</div>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-x-4">
        {REPS.map((r) => (
          <span key={r} className="flex items-center gap-1.5 text-[11px] text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: REP_COLORS[r], boxShadow: `0 0 6px ${REP_COLORS[r]}` }} />
            {r.split(" ")[0]}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[11px] text-amber-300">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" style={{ boxShadow: `0 0 6px ${OVERLAP_COLOR}` }} />
          Overlap
        </span>
      </div>
    </div>
  );
}
