import type { Metadata } from "next";
import Link from "next/link";

import { PhotoGrid } from "@/components/PhotoGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { ChevronLeftIcon, SparkleIcon } from "@/components/icons";
import { getAlbum, photosForAlbum } from "@/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ albumId: string }>;
}): Promise<Metadata> {
  const { albumId } = await params;
  return { title: (await getAlbum(albumId)).title };
}

export default async function AlbumView({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  const album = await getAlbum(albumId);
  const photos = await photosForAlbum(album);
  return (
    <>
      <Link
        href="/albums"
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-sepia"
      >
        <ChevronLeftIcon className="size-4" />
        All albums
      </Link>
      <SectionHeader
        title={album.title}
        subtitle={`${album.subtitle ?? ""}${album.subtitle ? " · " : ""}${photos.length} photos`}
      />
      {album.kind === "smart" ? (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-brass/10 px-4 py-3 ring-1 ring-brass/25">
          <SparkleIcon className="size-5 shrink-0 text-brass" />
          <p className="text-sm text-ink">
            <span className="font-medium">Smart album</span> — built
            automatically. Rule: {album.rule}
          </p>
        </div>
      ) : null}
      <PhotoGrid photos={photos} />
    </>
  );
}
