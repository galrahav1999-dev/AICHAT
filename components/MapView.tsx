"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useCockpit } from "@/lib/store";
import { useFiltered } from "@/lib/useFiltered";
import { STAGE_COLORS, fmtMoney, companies as ALL, overlappingNames } from "@/lib/data";
import type { Company } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
//  Add your Mapbox token in `.env.local` as NEXT_PUBLIC_MAPBOX_TOKEN.
//  (Copy .env.local.example → .env.local. Tokens start with `pk.`)
// ─────────────────────────────────────────────────────────────────────────
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});

  const { visible } = useFiltered();
  const selectedCompanyId = useCockpit((s) => s.selectedCompanyId);
  const selectCompany = useCockpit((s) => s.selectCompany);

  // Keep latest handlers/data accessible inside stable map callbacks.
  const selectRef = useRef(selectCompany);
  selectRef.current = selectCompany;

  // --- Init map once ---
  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [10, 25],
      zoom: 1.4,
      // Globe projection automatically morphs to Mercator as you zoom in.
      projection: { name: "globe" },
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.on("style.load", () => {
      map.setFog({
        color: "rgb(12,14,20)",
        "high-color": "rgb(20,30,60)",
        "horizon-blend": 0.1,
        "space-color": "rgb(6,7,12)",
        "star-intensity": 0.5,
      } as any);
    });
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
      // Remove stale markers
      const visibleIds = new Set(visible.map((c) => c.id));
      for (const id of Object.keys(markersRef.current)) {
        if (!visibleIds.has(id)) {
          markersRef.current[id].remove();
          delete markersRef.current[id];
        }
      }
      // Add/update
      for (const c of visible) {
        if (markersRef.current[c.id]) continue;
        const el = makeMarkerEl(c, overlaps.has(c.name.toLowerCase()));
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          selectRef.current(c);
        });
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([c.lng, c.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 18, closeButton: false, className: "cockpit-popup" }).setHTML(
              popupHtml(c)
            )
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
      if (c) map.flyTo({ center: [c.lng, c.lat], zoom: 6.5, duration: 1600, essential: true });
    }
  }, [selectedCompanyId]);

  if (!TOKEN) return <MapTokenPlaceholder />;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <style jsx global>{`
        .cockpit-marker {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          cursor: pointer;
          box-shadow: 0 0 0 2px rgba(8, 9, 13, 0.9), 0 0 14px 2px var(--c);
          transition: transform 0.15s ease;
        }
        .cockpit-marker:hover {
          transform: scale(1.35);
        }
        .cockpit-marker.is-selected {
          transform: scale(1.5);
          box-shadow: 0 0 0 3px #fff, 0 0 18px 4px var(--c);
        }
        .cockpit-marker.is-overlap::after {
          content: "";
          position: absolute;
          inset: -5px;
          border-radius: 999px;
          border: 1.5px solid rgba(245, 158, 11, 0.8);
          animation: pulseGlow 2s ease-in-out infinite;
        }
        .cockpit-popup .mapboxgl-popup-content {
          background: rgba(15, 17, 23, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 10px 12px;
          color: #e2e8f0;
          font-family: var(--font-inter), sans-serif;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
        }
        .cockpit-popup .mapboxgl-popup-tip {
          border-top-color: rgba(15, 17, 23, 0.95);
        }
      `}</style>
    </div>
  );
}

function makeMarkerEl(c: Company, overlap: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `cockpit-marker${overlap ? " is-overlap" : ""}`;
  const color = STAGE_COLORS[c.stage];
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

function MapTokenPlaceholder() {
  return (
    <div className="grid h-full w-full place-items-center bg-ink-950 p-6">
      <div className="card max-w-md p-6 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent-soft">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
            <path
              d="m9 4-6 2.5v13L9 17l6 2.5L21 17V4l-6 2.5L9 4Zm0 0v13m6-10.5v13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-white">Add a Mapbox token to enable the 2D map</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
          The Map view uses Mapbox GL with a globe projection that morphs to Mercator as you zoom in.
          The Globe and List/Board views work without it.
        </p>
        <div className="mt-4 rounded-xl bg-ink-900/80 p-3 text-left font-mono text-xs text-slate-300 ring-1 ring-white/5">
          <div className="text-slate-500"># .env.local</div>
          <div>
            NEXT_PUBLIC_MAPBOX_TOKEN=<span className="text-accent-soft">pk.your_token_here</span>
          </div>
        </div>
        <a
          href="https://account.mapbox.com/access-tokens/"
          target="_blank"
          rel="noreferrer"
          className="btn-primary mt-4"
        >
          Get a free token →
        </a>
      </div>
    </div>
  );
}
