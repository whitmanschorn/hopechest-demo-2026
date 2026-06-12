import type { Metadata } from "next";
import Link from "next/link";

import { MapView } from "@/components/MapView";
import { PhotoGrid } from "@/components/PhotoGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { ChevronLeftIcon, MapPinIcon } from "@/components/icons";
import { getLocation, locations, photosForLocation } from "@/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return locations.map((l) => ({ locationId: l.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locationId: string }>;
}): Promise<Metadata> {
  const { locationId } = await params;
  return { title: getLocation(locationId).label };
}

export default async function LocationView({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  const location = getLocation(locationId);
  const photos = photosForLocation(locationId);
  const address = [location.street, location.city, location.state, location.country]
    .filter(Boolean)
    .join(", ");

  const markers = photos.length
    ? [
        {
          id: location.id,
          label: location.label,
          lat: location.lat,
          lng: location.lng,
          href: `/photos/${photos[0].id}`,
          photoSrc: photos[0].src,
          meta: `${photos.length} photo${photos.length > 1 ? "s" : ""} here`,
        },
      ]
    : [
        { id: location.id, label: location.label, lat: location.lat, lng: location.lng, href: "#" },
      ];

  return (
    <>
      <Link
        href="/map"
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-sepia"
      >
        <ChevronLeftIcon className="size-4" />
        Map of the chest
      </Link>
      <SectionHeader
        title={location.label}
        subtitle={
          `${address}${address ? " · " : ""}` +
          `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
        }
      />
      <div className="mb-6 flex items-center gap-2 text-sm text-ink-soft">
        <MapPinIcon className="size-4 text-sepia" />
        Precise coordinates — {photos.length} photo{photos.length === 1 ? "" : "s"} taken here.
      </div>

      <MapView markers={markers} center={[location.lat, location.lng]} zoom={13} className="mb-7 h-80" />

      {photos.length > 0 ? (
        <PhotoGrid photos={photos} />
      ) : (
        <p className="rounded-xl bg-cream px-6 py-10 text-center text-sm text-ink-soft ring-1 ring-hairline">
          No photos placed here yet.
        </p>
      )}
    </>
  );
}
