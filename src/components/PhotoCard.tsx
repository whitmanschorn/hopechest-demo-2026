import Link from "next/link";

import { Badge } from "./Badge";
import { Img } from "./Img";
import { CopiesIcon } from "./icons";
import type { Photo } from "@/data";

export function PhotoCard({
  photo,
  caption,
  priority = false,
}: {
  photo: Photo;
  caption?: string;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/photos/${photo.id}`}
      className="group block overflow-hidden rounded-xl bg-cream ring-1 ring-hairline transition-shadow hover:shadow-lg hover:shadow-walnut/10"
    >
      <span className="relative block overflow-hidden">
        <Img
          src={photo.src}
          alt={photo.title}
          width={photo.width}
          height={photo.height}
          loading={priority ? "eager" : "lazy"}
          className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {photo.captures.length > 0 ? (
          <Badge tone="brass" className="absolute left-2 top-2 backdrop-blur">
            <CopiesIcon className="size-3.5" />1 original ·{" "}
            {photo.captures.length} copies
          </Badge>
        ) : null}
      </span>
      <span className="block px-3 py-2.5">
        <span className="block truncate text-sm font-medium text-ink">
          {caption ?? photo.title}
        </span>
        <span className="block text-xs text-ink-soft">{photo.date.display}</span>
      </span>
    </Link>
  );
}
