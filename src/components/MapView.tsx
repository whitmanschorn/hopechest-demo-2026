"use client";

import dynamic from "next/dynamic";

import type { MapMarker } from "./LeafletMap";

// Leaflet touches `window`, so the map can't be server-prerendered. Per Next's
// lazy-loading guide, `ssr: false` must live inside a Client Component — hence
// this wrapper. The route pages stay server components and pass plain props.
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-parchment text-sm text-ink-soft">
      Loading map…
    </div>
  ),
});

export function MapView({
  markers,
  center,
  zoom = 12,
  className = "h-72",
}: {
  markers: MapMarker[];
  center: [number, number];
  zoom?: number;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl ring-1 ring-hairline ${className}`}>
      <LeafletMap markers={markers} center={center} zoom={zoom} />
    </div>
  );
}
