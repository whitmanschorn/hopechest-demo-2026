import type { Metadata } from "next";
import Link from "next/link";

import { MapView } from "@/components/MapView";
import { SectionHeader } from "@/components/SectionHeader";
import { MapPinIcon } from "@/components/icons";
import { getPhoto, locationsWithCounts } from "@/data";

export const metadata: Metadata = { title: "Map" };

export default async function MapPage() {
  const places = await locationsWithCounts();
  // Only places with coordinates get a pin; ones typed in while uploading
  // (no lat/lng yet) still appear in the list below.
  const markers = (
    await Promise.all(
      places.map(async ({ location, count, coverPhotoId }) =>
        location.lat == null || location.lng == null
          ? null
          : {
              id: location.id,
              label: location.label,
              lat: location.lat,
              lng: location.lng,
              href: `/locations/${location.id}`,
              photoSrc: coverPhotoId ? (await getPhoto(coverPhotoId)).src : undefined,
              meta: `${count} photo${count > 1 ? "s" : ""}`,
            },
      ),
    )
  ).filter((m): m is NonNullable<typeof m> => m !== null);

  return (
    <>
      <SectionHeader
        title="Map"
        subtitle="Every place the chest remembers — pinned by precise coordinates. Select a pin to see what was taken there."
      />
      <MapView markers={markers} center={[44.9, -87.3]} zoom={7} className="mb-7 h-[28rem]" />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {places.map(({ location, count }) => (
          <Link
            key={location.id}
            href={`/locations/${location.id}`}
            className="flex items-center gap-3 rounded-xl bg-cream px-4 py-3 ring-1 ring-hairline transition-colors hover:ring-sepia/40"
          >
            <MapPinIcon className="size-5 shrink-0 text-sepia" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{location.label}</span>
              <span className="block truncate text-xs text-ink-soft">
                {[location.city, location.state].filter(Boolean).join(", ")}
              </span>
            </span>
            <span className="text-xs text-ink-soft">
              {count} photo{count > 1 ? "s" : ""}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
