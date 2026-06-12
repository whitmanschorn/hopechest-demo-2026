import type { Metadata } from "next";

import { AlbumCard } from "@/components/AlbumCard";
import { SectionHeader, SubHeader } from "@/components/SectionHeader";
import { SparkleIcon } from "@/components/icons";
import { albums } from "@/data";

export const metadata: Metadata = { title: "Albums" };

export default function Albums() {
  const standard = albums.filter((a) => a.kind === "standard");
  const smart = albums.filter((a) => a.kind === "smart");
  return (
    <>
      <SectionHeader
        title="Albums"
        subtitle="Collections the family curates — and ones Hopechest builds on its own."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {standard.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
      <SubHeader>
        <span className="inline-flex items-center gap-2">
          <SparkleIcon className="size-5 text-brass" />
          Smart albums
        </span>
      </SubHeader>
      <p className="-mt-2 mb-4 text-sm text-ink-soft">
        Built automatically from face tags, places, and dates. They grow as the
        chest grows.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {smart.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </>
  );
}
