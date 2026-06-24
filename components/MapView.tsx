"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCockpit } from "@/lib/store";
import { useFiltered } from "@/lib/useFiltered";
import { repColor, fmtMoney, companies as ALL, overlappingNames, REPS, REP_COLORS } from "@/lib/data";
import FilterControls from "./FilterControls";
import type { Company } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
//  Token-free basemap (CARTO dark-matter, free for anyone) so the Map view
//  "just works" with no setup. To use Mapbox proper instead, swap the style
//  URL for a Mapbox style and set mapboxgl.accessToken from an env var.
// ─────────────────────────────────────────────────────────────────────────
const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});

  const { visible } = useFiltered();
  const selectedCompanyId = useCockpit((s) => s.selectedCompanyId);
  const selectCompany = useCockpit((s) => s.selectCompany);

  const selectRef = useRef(selectCompany);
  selectRef.current = selectCompany;

  // --- Init map once ---
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [10, 25],
      zoom: 1.4,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []);

  // --- Sync markers with the visible set ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const overlaps = overlappingNames(ALL);

    const render = () => {
      const visibleIds = new Set(visible.map((c) => c.id));
      for (const id of Object.keys(markersRef.current)) {
        if (!visibleIds.has(id)) {
          markersRef.current[id].remove();
          delete markersRef.current[id];
        }
      }
      for (const c of visible) {
        if (markersRef.current[c.id]) continue;
        const el = makeMarkerEl(c, overlaps.has(c.name.toLowerCase()));
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          selectRef.current(c);
        });
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([c.lng, c.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 18, closeButton: false, className: "cockpit-popup" }).setHTML(popupHtml(c))
          )
          .addTo(map);
        el.addEventListener("mouseenter", () => marker.togglePopup());
        el.addEventListener("mouseleave", () => marker.togglePopup());
        markersRef.current[c.id] = marker;
      }
    };

    if (map.isStyleLoaded()) render();
    else map.once("load", render);
  }, [visible]);

  // --- Reflect selection: highlight + fly to it ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.entries(markersRef.current).forEach(([id, m]) => {
      m.getElement().classList.toggle("is-selected", id === selectedCompanyId);
    });
    if (selectedCompanyId) {
      const c = ALL.find((x) => x.id === selectedCompanyId);
      if (c) map.flyTo({ center: [c.lng, c.lat], zoom: 6, duration: 1500, essential: true });
    }
  }, [selectedCompanyId]);

  return (
    <div className="flex h-full flex-col">
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 bg-ink-900/70 px-3 py-2.5 backdrop-blur sm:px-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Filters</span>
        <FilterControls />
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="h-full w-full" />

        {/* Rep legend */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded-xl glass px-3 py-2 shadow-card">
          {REPS.map((r) => (
            <span key={r} className="flex items-center gap-1.5 text-[11px] text-slate-200">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: REP_COLORS[r], boxShadow: `0 0 6px ${REP_COLORS[r]}` }} />
              {r.split(" ")[0]}
            </span>
          ))}
        </div>

        <style jsx global>{`
          .cockpit-marker {
            width: 16px;
            height: 16px;
            border-radius: 999px;
            cursor: pointer;
            box-shadow: 0 0 0 2px rgba(8, 9, 13, 0.9), 0 0 14px 2px var(--c);
            transition: transform 0.15s ease;
          }
          .cockpit-marker:hover { transform: scale(1.35); }
          .cockpit-marker.is-selected {
            transform: scale(1.5);
            box-shadow: 0 0 0 3px #fff, 0 0 18px 4px var(--c);
          }
          .cockpit-marker.is-overlap::after {
            content: "";
            position: absolute;
            inset: -5px;
            border-radius: 999px;
            border: 1.5px solid rgba(245, 158, 11, 0.85);
            animation: pulseGlow 2s ease-in-out infinite;
          }
          .cockpit-popup .maplibregl-popup-content {
            background: rgba(15, 17, 23, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 10px 12px;
            color: #e2e8f0;
            font-family: var(--font-inter), sans-serif;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
          }
          .cockpit-popup .maplibregl-popup-tip { border-top-color: rgba(15, 17, 23, 0.95); }
        `}</style>
      </div>
    </div>
  );
}

function makeMarkerEl(c: Company, overlap: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `cockpit-marker${overlap ? " is-overlap" : ""}`;
  const color = repColor(c.ownerRep);
  el.style.setProperty("--c", color);
  el.style.background = color;
  el.style.position = "relative";
  return el;
}

function popupHtml(c: Company): string {
  return `<div style="min-width:160px">
    <div style="font-weight:600;color:#fff;font-size:13px">${c.name}</div>
    <div style="color:#94a3b8;font-size:12px;margin-top:2px">${c.stage} · ${fmtMoney(c.dealValue)}</div>
    <div style="color:#64748b;font-size:11px;margin-top:1px">${c.city}, ${c.country} · ${c.ownerRep}</div>
  </div>`;
}
