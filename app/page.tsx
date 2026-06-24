"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import ListBoardView from "@/components/ListBoardView";
import AccountDetailCard from "@/components/AccountDetailCard";
import AutomationPanel from "@/components/AutomationPanel";
import OverlapAlert from "@/components/OverlapAlert";
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
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
        el.blur();
        return;
      }
      escapeOut();
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
              {view === "globe" && <GlobeView />}
              {view === "map" && <MapView />}
              {view === "list" && <ListBoardView />}
            </div>

            {/* Globe gets the location nav + rep pills + overlap CTA overlays */}
            {view === "globe" && (
              <>
                <FilterBar />
                <OverlapAlert />
              </>
            )}

            {/* Selecting an account anywhere surfaces its card everywhere */}
            <AccountDetailCard />
          </>
        )}

        <AutomationPanel />
      </main>
    </div>
  );
}
