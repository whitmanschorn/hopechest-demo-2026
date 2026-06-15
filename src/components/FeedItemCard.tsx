import Link from "next/link";

import { Img } from "./Img";
import { InitialsAvatar } from "./InitialsAvatar";
import {
  AskIcon,
  CameraIcon,
  CommentIcon,
  CopiesIcon,
  PeopleIcon,
  ReplyIcon,
  RestoreIcon,
} from "./icons";
import { getPerson, getPhoto, type FeedItem } from "@/data";
import type { ReactNode } from "react";

function Frame({
  icon,
  headline,
  when,
  children,
}: {
  icon: ReactNode;
  headline: ReactNode;
  when: string;
  children?: ReactNode;
}) {
  return (
    <article className="rounded-xl bg-cream p-4 ring-1 ring-hairline sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sepia/10 text-sepia">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-6 text-ink">{headline}</p>
          <p className="mt-0.5 text-xs text-ink-soft">{when}</p>
        </div>
      </div>
      {children ? <div className="mt-3 pl-11">{children}</div> : null}
    </article>
  );
}

async function PhotoStrip({ photoId, label }: { photoId: string; label?: string }) {
  const photo = await getPhoto(photoId);
  return (
    <Link
      href={`/photos/${photo.id}`}
      className="group flex items-center gap-3 rounded-lg bg-parchment p-2 ring-1 ring-hairline transition-colors hover:ring-sepia/40"
    >
      <Img
        src={photo.src}
        alt={photo.title}
        width={photo.width}
        height={photo.height}
        className="h-16 w-20 shrink-0 rounded-md object-cover"
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink group-hover:text-sepia">
          {photo.title}
        </span>
        <span className="block text-xs text-ink-soft">
          {label ?? photo.date.display}
        </span>
      </span>
    </Link>
  );
}

export async function FeedItemCard({ item }: { item: FeedItem }) {
  switch (item.kind) {
    case "photo-added": {
      const by = await getPerson(item.byId);
      return (
        <Frame
          icon={<CameraIcon className="size-4.5" />}
          when={item.when}
          headline={
            <>
              <strong className="font-medium">{by.shortName}</strong> added a
              photo to the chest.
              {item.blurb ? (
                <em className="block text-ink-soft">&ldquo;{item.blurb}&rdquo;</em>
              ) : null}
            </>
          }
        >
          <PhotoStrip photoId={item.photoId} />
        </Frame>
      );
    }
    case "restoration":
      return (
        <Frame
          icon={<RestoreIcon className="size-4.5" />}
          when={item.when}
          headline={
            <>
              Hopechest finished <strong className="font-medium">restoring</strong>{" "}
              a 90-year-old print.
            </>
          }
        >
          <PhotoStrip photoId={item.photoId} label="Before & after inside" />
        </Frame>
      );
    case "new-copy-linked": {
      const by = await getPerson(item.byId);
      return (
        <Frame
          icon={<CopiesIcon className="size-4.5" />}
          when={item.when}
          headline={
            <>
              <strong className="font-medium">{by.shortName}</strong>&rsquo;s
              phone photo was recognized as a{" "}
              <strong className="font-medium">copy of an original print</strong>{" "}
              already in the chest.
            </>
          }
        >
          <PhotoStrip photoId={item.photoId} label="1 original · 2 copies" />
        </Frame>
      );
    }
    case "person-milestone": {
      const person = await getPerson(item.personId);
      return (
        <Frame
          icon={<PeopleIcon className="size-4.5" />}
          when={item.when}
          headline={item.blurb}
        >
          <Link
            href={`/people/${person.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-parchment py-1 pl-1 pr-3 ring-1 ring-hairline transition-colors hover:ring-sepia/40"
          >
            <InitialsAvatar person={person} size="sm" />
            <span className="text-sm font-medium">{person.shortName}</span>
          </Link>
        </Frame>
      );
    }
    case "ask-highlight":
      return (
        <Frame
          icon={<AskIcon className="size-4.5" />}
          when={item.when}
          headline={
            <>
              The family asked:{" "}
              <Link
                href="/ask"
                className="font-medium text-sepia underline decoration-hairline underline-offset-4"
              >
                &ldquo;{item.question}&rdquo;
              </Link>
            </>
          }
        >
          <PhotoStrip photoId={item.photoId} label="The answer, found in 2 seconds" />
        </Frame>
      );
    case "comment-added": {
      const by = await getPerson(item.byId);
      return (
        <Frame
          icon={<CommentIcon className="size-4.5" />}
          when={item.when}
          headline={
            <>
              <strong className="font-medium">{by.shortName}</strong> commented on a
              photo.
              <em className="block text-ink-soft">&ldquo;{item.excerpt}&rdquo;</em>
            </>
          }
        >
          <PhotoStrip photoId={item.photoId} label="Join the conversation" />
        </Frame>
      );
    }
    case "comment-reply": {
      const by = await getPerson(item.byId);
      const parent = await getPerson(item.parentAuthorId);
      return (
        <Frame
          icon={<ReplyIcon className="size-4.5" />}
          when={item.when}
          headline={
            <>
              <strong className="font-medium">{by.shortName}</strong> replied to{" "}
              <strong className="font-medium">{parent.shortName}</strong>&rsquo;s
              comment.
              <em className="block text-ink-soft">&ldquo;{item.excerpt}&rdquo;</em>
            </>
          }
        >
          <PhotoStrip photoId={item.photoId} label="See the thread" />
        </Frame>
      );
    }
  }
}
