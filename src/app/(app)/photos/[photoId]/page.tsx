import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/Badge";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { FaceTagOverlay } from "@/components/FaceTagOverlay";
import { PersonChip } from "@/components/PersonChip";
import { PhotoDetails } from "@/components/PhotoDetails";
import { PhotoComments } from "@/components/PhotoComments";
import { ProvenanceCard } from "@/components/ProvenanceCard";
import { ChevronLeftIcon, RestoreIcon } from "@/components/icons";
import {
  albumsForPhoto,
  commentsForPhoto,
  getPerson,
  getPhoto,
  reactionsForPhoto,
} from "@/data";
import { requireCurrentPerson } from "@/lib/auth/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ photoId: string }>;
}): Promise<Metadata> {
  const { photoId } = await params;
  return { title: (await getPhoto(photoId)).title };
}

export default async function PhotoView({
  params,
}: {
  params: Promise<{ photoId: string }>;
}) {
  const { photoId } = await params;
  const me = await requireCurrentPerson();
  const photo = await getPhoto(photoId);
  const albums = await albumsForPhoto(photo);
  const faceTagPeople = await Promise.all(
    photo.faceTags.map((tag) => getPerson(tag.personId)),
  );
  return (
    <>
      <Link
        href="/albums"
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-sepia"
      >
        <ChevronLeftIcon className="size-4" />
        Back to albums
      </Link>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Left: the photo */}
        <div className="mx-auto w-full max-w-xl lg:max-w-none">
          <FaceTagOverlay photo={photo} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {photo.faceTags.map((tag, i) => (
              <PersonChip
                key={tag.personId}
                person={faceTagPeople[i]}
                detail={
                  tag.confidence
                    ? `${Math.round(tag.confidence * 100)}% match`
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        {/* Right: the story */}
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-walnut">
              {photo.title}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {photo.date.display}
              {photo.location ? (
                <>
                  {" · "}
                  <Link
                    href={`/locations/${photo.location.id}`}
                    className="underline decoration-hairline underline-offset-2 transition-colors hover:text-sepia"
                  >
                    {photo.location.label}
                  </Link>
                </>
              ) : null}
            </p>
            {photo.description ? (
              <p className="mt-3 text-[15px] leading-7 text-ink">
                {photo.description}
              </p>
            ) : null}
          </div>

          <PhotoDetails photo={photo} />

          {albums.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-soft">Appears in:</span>
              {albums.map((album) => (
                <Link key={album.id} href={`/albums/${album.id}`}>
                  <Badge
                    tone={album.kind === "smart" ? "brass" : "plain"}
                    className="transition-colors hover:ring-sepia/50"
                  >
                    {album.title}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : null}

          {photo.restoration ? (
            <section className="rounded-xl bg-cream p-5 ring-1 ring-hairline">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-walnut">
                <RestoreIcon className="size-5 text-brass" />
                Restored by Hopechest
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                {photo.restoration.summary} Drag the handle to compare.
              </p>
              <div className="mt-4">
                <BeforeAfterSlider
                  beforeSrc={photo.src}
                  afterSrc={photo.restoration.restoredSrc}
                  alt={photo.title}
                  width={photo.width}
                  height={photo.height}
                />
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {photo.captures.length > 0 ? (
        <div className="mt-8">
          <ProvenanceCard photo={photo} />
        </div>
      ) : null}

      <div className="mt-8 mx-auto max-w-3xl">
        <PhotoComments
          photoId={photo.id}
          me={me}
          initialReactions={await reactionsForPhoto(photo.id, me.id)}
          initialComments={await commentsForPhoto(photo.id, me.id)}
        />
      </div>
    </>
  );
}
