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

const NIGHT = "//unpkg.com/three-globe/example/img/earth-night.jpg";
const BUMP = "//unpkg.com/three-globe/example/img/earth-topology.png";
const STARS = "//unpkg.com/three-globe/example/img/night-sky.png";

const ALT = { globe: 2.5, country: 1.15, city: 0.5, street: 0.62, company: 0.26 } as const;
const FLY_MS = 1500;
const norm = (s: string) => s.trim().toLowerCase();

// Neutral neon for whole-team aggregate beams (rep colors used when filtered).
const NEON = "#38e8ff";

// Shared soft-glow sprite texture (radial gradient) for the neon beam tips.
let GLOW_TEX: THREE.Texture | null = null;
function glowTexture() {
  if (GLOW_TEX) return GLOW_TEX;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  GLOW_TEX = new THREE.CanvasTexture(c);
  return GLOW_TEX;
}

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
  const drillUp = useCockpit((s) => s.drillUp);

  const selectRef = useRef(selectCompany);
  selectRef.current = selectCompany;

  const isAggregate = drill === "globe" || drill === "country";
  const aggColor = repFilter !== "all" ? repColor(repFilter) : NEON;
  const dealCountries = useMemo(() => new Set(visible.map((c) => c.country)), [visible]);

  // --- Load country shapes once (browser fetch; globe works without them) ---
  useEffect(() => {
    let alive = true;
    fetch("https://unpkg.com/world-atlas@2/countries-110m.json")
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

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- Point/beam data (value/count normalized so sizes never NaN) ---
  const points = useMemo(() => {
    const dominantRep = (list: Company[]) => {
      const by: Record<string, number> = {};
      for (const c of list) by[c.ownerRep] = (by[c.ownerRep] ?? 0) + c.dealValue;
      return Object.entries(by).sort((a, b) => b[1] - a[1])[0]?.[0] ?? REPS[0];
    };
    if (drill === "globe") {
      const aggs = aggregateByCountry(visible);
      return aggs.map((a) => ({
        kind: "country",
        country: a.country,
        lat: a.lat,
        lng: a.lng,
        value: a.totalValue,
        count: a.dealCount,
        rep: dominantRep(visible.filter((c) => c.country === a.country)),
      }));
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
        rep: dominantRep(visible.filter((c) => c.country === a.country && c.city === a.city)),
      }));
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

  // Tall glowing beams only at the world level; once zoomed into a territory
  // they flatten into colored dots so they don't hide the map below.
  const beamLevel = drill === "globe";
  const tipAlt = (d: any) => (beamLevel ? 0.05 + 0.5 * (d.value / maxValue) : 0.012);
  const beamColor = (d: any) => repColor(d.kind === "company" ? d.company.ownerRep : d.rep);

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

  // --- Camera flights ---
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

  // Label for the back button (where you'll land).
  const backLabel =
    drill === "company"
      ? selectedCity ?? "city"
      : drill === "city"
      ? selectedCountry ?? "country"
      : drill === "country"
      ? "the world"
      : "";

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-[#05060c]">
      {/* Back button — right above the globe, near where the user is */}
      {drill !== "globe" && (
        <button
          onClick={drillUp}
          className="pointer-events-auto absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink-850/85 px-4 py-2 text-sm font-medium text-white shadow-card ring-1 ring-white/10 backdrop-blur-md transition-all hover:bg-ink-800 hover:ring-white/20"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to {backLabel}
          <kbd className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">Esc</kbd>
        </button>
      )}

      <Globe
        ref={globeRef}
        width={size.w}
        height={size.h}
        backgroundColor="#05060c"
        backgroundImageUrl={STARS}
        globeImageUrl={NIGHT}
        bumpImageUrl={BUMP}
        showAtmosphere
        atmosphereColor="#6f8bff"
        atmosphereAltitude={0.2}
        onGlobeReady={() => setReady(true)}
        // --- Country territories (hover highlight, click to zoom-lock) ---
        polygonsData={isAggregate ? polys : []}
        polygonAltitude={(d: any) => (d === hoverPoly ? 0.06 : 0.01)}
        polygonCapColor={(d: any) => {
          const country = POLY_NAME_TO_COUNTRY[d?.properties?.name];
          if (d === hoverPoly) return rgba(aggColor, 0.55);
          if (country && dealCountries.has(country)) return rgba(aggColor, 0.14);
          return "rgba(255,255,255,0.015)";
        }}
        polygonSideColor={() => "rgba(120,160,255,0.06)"}
        polygonStrokeColor={(d: any) => (d === hoverPoly ? rgba(aggColor, 0.9) : "rgba(150,170,220,0.12)")}
        polygonsTransitionDuration={220}
        onPolygonHover={(p: any) => setHoverPoly(p || null)}
        onPolygonClick={handlePolyClick}
        polygonLabel={(d: any) => territoryLabel(d, dealCountries)}
        // --- Neon beams ---
        pointsData={points as object[]}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lng}
        pointAltitude={tipAlt}
        pointRadius={(d: any) =>
          beamLevel ? 0.12 + 0.12 * (d.value / maxValue) : d.kind === "company" ? (d.selected ? 0.5 : 0.34) : 0.42
        }
        pointColor={beamColor}
        pointResolution={16}
        pointsTransitionDuration={500}
        onPointClick={handlePointClick}
        pointLabel={(d: any) => beamLabel(d)}
        // --- Additive glow at each beam tip (the "neon") ---
        customLayerData={points as object[]}
        customThreeObject={(d: any) => {
          const mat = new THREE.SpriteMaterial({
            map: glowTexture(),
            color: new THREE.Color(beamColor(d)),
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            opacity: 0.9,
          });
          const sprite = new THREE.Sprite(mat);
          sprite.raycast = () => {}; // never intercept beam/polygon clicks
          return sprite;
        }}
        customThreeObjectUpdate={(obj: any, d: any) => {
          const g = globeRef.current;
          if (!g || typeof g.getCoords !== "function") return;
          const { x, y, z } = g.getCoords(d.lat, d.lng, tipAlt(d));
          obj.position.set(x, y, z);
          (obj.material as THREE.SpriteMaterial).color.set(beamColor(d));
          const s = beamLevel ? 7 + 12 * (d.value / maxValue) : d.kind === "company" ? (d.selected ? 11 : 7) : 12;
          obj.scale.set(s, s, 1);
        }}
        // --- Glow rings ---
        ringsData={ringData(points as any[])}
        ringLat={(d: any) => d.lat}
        ringLng={(d: any) => d.lng}
        ringColor={(d: any) => {
          const base = d.__overlap ? OVERLAP_COLOR : beamColor(d);
          return (t: number) => rgba(base, 1 - t);
        }}
        ringMaxRadius={(d: any) => (d.__overlap ? 2.4 : isAggregate ? 3 : 1.6)}
        ringPropagationSpeed={(d: any) => (d.__overlap ? 1.6 : 1.6)}
        ringRepeatPeriod={(d: any) => (d.__overlap ? 1100 : 1500)}
        // --- HTML overlays ---
        htmlElementsData={htmlData}
        htmlLat={(d: any) => d.lat}
        htmlLng={(d: any) => d.lng}
        htmlAltitude={(d: any) => (d.type === "label" ? 0.24 : 0.16)}
        htmlElement={(d: any) => makeHtml(d)}
      />

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

      <RepLegend subtitle={beamLevel ? "beam height = pipeline value" : undefined} />
    </div>
  );
}

function ringData(points: any[]) {
  const overlaps = points.filter((p) => p.overlap).map((p) => ({ ...p, __overlap: true }));
  const base = [...points].sort((a, b) => b.value - a.value).slice(0, 8);
  return [...base, ...overlaps] as object[];
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

function RepLegend({ subtitle }: { subtitle?: string }) {
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl glass px-3 py-2.5 shadow-card">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Reps {subtitle && <span className="ml-1 normal-case tracking-normal text-slate-500">· {subtitle}</span>}
      </div>
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
