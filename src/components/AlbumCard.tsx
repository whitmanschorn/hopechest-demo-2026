import Link from "next/link";

import { Badge } from "./Badge";
import { Img } from "./Img";
import { SparkleIcon } from "./icons";
import { getPhoto, type Album } from "@/data";

/** "2026-05-28" -> "May 2026" (created/updated stamps are month-grained in the UI). */
function monthYear(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[(m ?? 1) - 1]} ${y}`;
}

export async function AlbumCard({ album }: { album: Album }) {
  const cover = await getPhoto(album.coverPhotoId);
  return (
    <Link
      href={`/albums/${album.id}`}
      className="group block overflow-hidden rounded-xl bg-cream ring-1 ring-hairline transition-shadow hover:shadow-lg hover:shadow-walnut/10"
    >
      <span className="relative block overflow-hidden">
        <Img
          src={cover.src}
          alt={cover.title}
          width={cover.width}
          height={cover.height}
          className="aspect-[3/2] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {album.kind === "smart" ? (
          <Badge tone="brass" className="absolute left-2 top-2 backdrop-blur">
            <SparkleIcon className="size-3.5" />
            Smart album
          </Badge>
        ) : null}
      </span>
      <span className="block px-3.5 py-3">
        <span className="block font-display text-lg font-semibold tracking-tight text-walnut">
          {album.title}
        </span>
        <span className="block text-sm text-ink-soft">
          {album.subtitle ?? album.rule} · {album.photoCount} photos
        </span>
        <span className="mt-1 block text-xs text-ink-soft/80">
          Created {monthYear(album.createdAt)} · Updated {monthYear(album.updatedAt)}
        </span>
      </span>
    </Link>
  );
}
