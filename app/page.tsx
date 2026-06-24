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
  const [mounted, setMounted] = useState(false);

  // Brief "powering up" state to make the first paint feel intentional.
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 650);
    return () => clearTimeout(t);
  }, []);

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

            {/* Floating filter/alert overlays — only over the spatial views */}
            {view !== "list" && (
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
