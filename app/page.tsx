"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import DrillPanel from "@/components/DrillPanel";
import ListBoardView from "@/components/ListBoardView";
import CompanyCardReveal from "@/components/CompanyCardReveal";
import AutomationPanel from "@/components/AutomationPanel";
import MetricsPanel from "@/components/MetricsPanel";
import OverlapAlert from "@/components/OverlapAlert";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ViewSkeleton } from "@/components/Skeletons";
import { useCockpit } from "@/lib/store";

// Globe + Map are WebGL/canvas and must only render on the client.
const GlobeView = dynamic(() => import("@/components/GlobeView"), {
  ssr: false,
  loading: () => <ViewSkeleton kind="globe" />,
});
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <ViewSkeleton kind="map" />,
});

export default function Page() {
  const view = useCockpit((s) => s.view);
  const escapeOut = useCockpit((s) => s.escapeOut);
  const [mounted, setMounted] = useState(false);

  // Brief "powering up" state to make the first paint feel intentional.
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 650);
    return () => clearTimeout(t);
  }, []);

  // Escape backs out of any view (close panel, then zoom out a level).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) {
        el.blur();
        return;
      }
      try {
        escapeOut();
      } catch {
        /* never let a keypress break the app */
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [escapeOut]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />

      <main className="relative flex-1 overflow-hidden">
        {!mounted ? (
          <ViewSkeleton kind={view} />
        ) : (
          <>
            <div className="absolute inset-0">
              <ErrorBoundary key={view}>
                {view === "globe" && <GlobeView />}
                {view === "map" && <MapView />}
                {view === "list" && <ListBoardView />}
              </ErrorBoundary>
            </div>

            {/* Globe gets the location nav + rep pills + overlap CTA overlays */}
            {view === "globe" && (
              <>
                <FilterBar />
                <DrillPanel />
                <OverlapAlert />
              </>
            )}

            {/* Selecting an account anywhere reveals its dossier (with a
                togglable account list inside) */}
            <CompanyCardReveal />
          </>
        )}

        <AutomationPanel />
        <MetricsPanel />
      </main>
    </div>
  );
}
