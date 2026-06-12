import type { Metadata } from "next";
import Link from "next/link";

import { AlbumCard } from "@/components/AlbumCard";
import { FeedItemCard } from "@/components/FeedItemCard";
import { OnThisDay } from "@/components/OnThisDay";
import { SectionHeader, SubHeader } from "@/components/SectionHeader";
import { AskIcon } from "@/components/icons";
import { albums, currentMemberId, feed, getPerson } from "@/data";

export const metadata: Metadata = { title: "Home" };

export default function Home() {
  const me = getPerson(currentMemberId);
  const firstName = me.name.split(" ")[0];
  const featuredAlbums = albums.filter((a) => a.kind === "smart");
  return (
    <>
      <SectionHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Here's what's new in the Kowalski–Whitfield chest."
        action={
          <Link
            href="/ask"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-sepia px-5 text-sm font-medium text-cream transition-colors hover:bg-walnut"
          >
            <AskIcon className="size-4.5" />
            Ask the archive
          </Link>
        }
      />
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_minmax(16rem,20rem)]">
        <div className="flex flex-col gap-3">
          <OnThisDay />
          {feed.map((item) => (
            <FeedItemCard key={item.id} item={item} />
          ))}
        </div>
        <aside className="lg:sticky lg:top-8">
          <SubHeader>Smart albums</SubHeader>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {featuredAlbums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
