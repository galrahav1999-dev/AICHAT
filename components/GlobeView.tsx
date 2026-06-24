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
  repColor,
  rgba,
  OVERLAP_COLOR,
  REPS,
  REP_COLORS,
} from "@/lib/data";
import type { Company } from "@/lib/types";

const NIGHT = "//unpkg.com/three-globe/example/img/earth-night.jpg";
const BUMP = "//unpkg.com/three-globe/example/img/earth-topology.png";

// Altitude (camera distance) per drill level — smaller = closer in.
// `street` is the brief office/city settle before the account card resolves.
const ALT = { globe: 2.5, country: 1.15, city: 0.5, street: 0.62, company: 0.26 } as const;
const FLY_MS = 1500;

const norm = (s: string) => s.trim().toLowerCase();

export default function GlobeView() {
  const globeRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [ready, setReady] = useState(false);

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

  // --- Responsive sizing ---
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- Point/beam data for the current level ---
  const points = useMemo(() => {
    if (drill === "globe") {
      const aggs = aggregateByCountry(visible);
      const max = Math.max(1, ...aggs.map((a) => a.totalValue));
      return aggs.map((a) => ({ kind: "country", ...a, _max: max }));
    }
    if (drill === "country" && selectedCountry) {
      const aggs = aggregateByCity(visible, selectedCountry);
      const max = Math.max(1, ...aggs.map((a) => a.totalValue));
      return aggs.map((a) => ({ kind: "city", ...a, _max: max }));
    }
    // city / company → one rep-colored beam per account.
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

  const maxValue = useMemo(() => Math.max(1, ...points.map((p: any) => p.value)), [points]);

  // --- HTML overlays: overlap warning badges + selected name label ---
  const htmlData = useMemo(() => {
    if (isAggregate) return [] as any[];
    const inCity = visible.filter((c) => c.country === selectedCountry && c.city === selectedCity);

    // one badge per overlapping account name (dedup the two rep records)
    const byName = new Map<string, { name: string; lat: number; lng: number; reps: string[] }>();
    for (const c of inCity) {
      if (!overlaps.has(norm(c.name))) continue;
      const e = byName.get(norm(c.name)) ?? { name: c.name, lat: 0, lng: 0, reps: [] };
      e.lat += c.lat;
      e.lng += c.lng;
      if (!e.reps.includes(c.ownerRep)) e.reps.push(c.ownerRep);
      byName.set(norm(c.name), e);
    }
    const badges = [...byName.values()].map((e) => ({
      type: "overlap" as const,
      lat: e.lat / 2,
      lng: e.lng / 2,
      reps: e.reps,
    }));

    const sel = inCity.find((c) => c.id === selectedCompanyId);
    const label = sel ? [{ type: "label" as const, lat: sel.lat, lng: sel.lng, text: sel.name }] : [];
    return [...badges, ...label];
  }, [isAggregate, visible, selectedCountry, selectedCity, selectedCompanyId, overlaps]);

  // --- Camera flights (state-driven so back / filters / panel all reuse it) ---
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);

    if (drill === "company" && selectedCompanyId) {
      const c = ALL.find((x) => x.id === selectedCompanyId);
      if (!c) return;
      // Two-stage: settle at street altitude, then resolve onto the office.
      g.pointOfView({ lat: c.lat, lng: c.lng, altitude: ALT.street }, 750);
      settleTimer.current = setTimeout(() => {
        g.pointOfView({ lat: c.lat, lng: c.lng, altitude: ALT.company }, 950);
      }, 780);
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

  // --- Auto-rotate only at the world level ---
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const c = g.controls();
    c.autoRotate = drill === "globe";
    c.autoRotateSpeed = 0.45;
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

  const aggColor = repFilter !== "all" ? repColor(repFilter) : "#818cf8";

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
        // translucent neon beams (additive-feeling via low alpha + glow rings)
        pointsData={points as object[]}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lng}
        pointAltitude={(d: any) =>
          isAggregate ? 0.05 + 0.5 * (d.value / maxValue) : d.selected ? 0.16 : 0.085
        }
        pointRadius={(d: any) =>
          isAggregate ? 0.34 + 0.55 * (d.value / maxValue) : d.selected ? 0.42 : 0.28
        }
        pointColor={(d: any) =>
          d.kind === "company"
            ? rgba(repColor(d.company.ownerRep), d.selected ? 0.95 : 0.72)
            : rgba(aggColor, 0.62)
        }
        pointResolution={10}
        pointsTransitionDuration={650}
        onPointClick={handlePointClick}
        pointLabel={(d: any) => labelHtml(d)}
        // glow rings: pipeline hot-spots at aggregate, overlap pulses up close
        ringsData={ringData(points as any[], isAggregate)}
        ringLat={(d: any) => d.lat}
        ringLng={(d: any) => d.lng}
        ringColor={(d: any) => {
          const base = d.__overlap ? OVERLAP_COLOR : aggColor;
          return (t: number) => rgba(base, 1 - t);
        }}
        ringMaxRadius={(d: any) => (d.__overlap ? 2.4 : isAggregate ? 4 : 2)}
        ringPropagationSpeed={(d: any) => (d.__overlap ? 1.6 : 2)}
        ringRepeatPeriod={(d: any) => (d.__overlap ? 1100 : 1400)}
        // HTML overlays for overlap badges + selected label
        htmlElementsData={htmlData}
        htmlLat={(d: any) => d.lat}
        htmlLng={(d: any) => d.lng}
        htmlAltitude={(d: any) => (d.type === "label" ? 0.22 : 0.14)}
        htmlElement={(d: any) => makeHtml(d)}
      />

      {isAggregate ? <ValueHint /> : <RepLegend />}
    </div>
  );
}

// Rings: top pipeline points when zoomed out; overlap accounts when zoomed in.
function ringData(points: any[], isAggregate: boolean) {
  if (isAggregate) {
    return [...points].sort((a, b) => b.value - a.value).slice(0, 6) as object[];
  }
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
  // overlap badge with both rep colors + warning
  const el = document.createElement("div");
  el.style.cssText =
    "transform:translate(-50%,-50%);display:flex;align-items:center;gap:5px;font-family:Inter,sans-serif;font-size:11px;font-weight:700;color:#0b0d12;background:" +
    OVERLAP_COLOR +
    ";padding:3px 7px;border-radius:999px;white-space:nowrap;box-shadow:0 0 16px -2px " +
    OVERLAP_COLOR +
    ";animation:pulseGlow 2s ease-in-out infinite";
  const dots = (d.reps as string[])
    .map(
      (r) =>
        `<span style="width:8px;height:8px;border-radius:999px;display:inline-block;background:${repColor(
          r
        )};box-shadow:0 0 4px ${repColor(r)}"></span>`
    )
    .join("");
  el.innerHTML = `<span style="display:flex;gap:3px">${dots}</span><span>${d.reps.length} reps</span>`;
  return el;
}

function labelHtml(d: any): string {
  const box = (title: string, lines: string[]) =>
    `<div style="font-family:Inter,sans-serif;background:rgba(15,17,23,0.92);border:1px solid rgba(255,255,255,0.1);padding:8px 10px;border-radius:10px;color:#e2e8f0;font-size:12px;backdrop-filter:blur(8px);box-shadow:0 8px 30px rgba(0,0,0,0.5)">
      <div style="font-weight:600;color:#fff">${title}</div>${lines
        .map((l) => `<div style="color:#94a3b8">${l}</div>`)
        .join("")}</div>`;
  if (d.kind === "company") {
    const c: Company = d.company;
    return box(c.name, [`${c.stage} · ${fmtMoney(c.dealValue)}`, `${c.ownerRep}${d.overlap ? " · ⚠ overlap" : ""}`]);
  }
  const title = d.kind === "country" ? d.country : d.city;
  return box(title, [`${fmtMoney(d.value)} · ${d.dealCount} deals`, d.kind === "country" ? "Click to drill into cities" : "Click to see accounts"]);
}

function ValueHint() {
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl glass px-3 py-2 text-[11px] text-slate-400 shadow-card">
      <span className="text-accent-soft">●</span> beam height &amp; glow = pipeline value · click to fly in
    </div>
  );
}

function RepLegend() {
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl glass px-3 py-2.5 shadow-card">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Reps
      </div>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-x-4">
        {REPS.map((r) => (
          <span key={r} className="flex items-center gap-1.5 text-[11px] text-slate-300">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: REP_COLORS[r], boxShadow: `0 0 6px ${REP_COLORS[r]}` }}
            />
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
