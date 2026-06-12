import Link from "next/link";

import { Badge } from "./Badge";
import { Img } from "./Img";
import { SparkleIcon } from "./icons";
import { getPhoto, type Album } from "@/data";

export function AlbumCard({ album }: { album: Album }) {
  const cover = getPhoto(album.coverPhotoId);
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
          {album.subtitle ?? album.rule} · {album.photoIds.length} photos
        </span>
      </span>
    </Link>
  );
}
