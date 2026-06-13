"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { Img } from "./Img";

export interface MapMarker {
  id: string;
  label: string;
  lat: number;
  lng: number;
  href: string;
  photoSrc?: string;
  meta?: string;
}

// An on-brand sepia pin built from inline HTML, so we depend on no marker image
// assets (Leaflet's default PNGs break under bundlers).
const pin = L.divIcon({
  className: "hc-pin",
  html:
    '<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#8a5a33;border:2px solid #fdf9f0;box-shadow:0 1px 4px rgba(0,0,0,.45)"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});

/** Fit the viewport to all markers when there's more than one. */
function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  if (markers.length > 1) {
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }
  return null;
}

export default function LeafletMap({
  markers,
  center,
  zoom,
}: {
  markers: MapMarker[];
  center: [number, number];
  zoom: number;
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={false}
      className="h-full w-full"
      style={{ background: "#f6efe2" }}
    >
      {/* CARTO "light" tiles — no API key, and muted enough for the parchment theme. */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={pin}>
          <Popup>
            <Link href={m.href} className="block w-44 no-underline">
              {m.photoSrc ? (
                <Img
                  src={m.photoSrc}
                  alt={m.label}
                  width={176}
                  height={112}
                  className="mb-1.5 h-24 w-full rounded object-cover"
                />
              ) : null}
              <span className="block text-sm font-semibold text-walnut">{m.label}</span>
              {m.meta ? <span className="block text-xs text-ink-soft">{m.meta}</span> : null}
              <span className="mt-0.5 block text-xs font-medium text-sepia">View →</span>
            </Link>
          </Popup>
        </Marker>
      ))}
      <FitBounds markers={markers} />
    </MapContainer>
  );
}
