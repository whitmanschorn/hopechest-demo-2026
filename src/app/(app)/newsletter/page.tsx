import type { Metadata } from "next";
import Link from "next/link";

import { Img } from "@/components/Img";
import { SectionHeader, SubHeader } from "@/components/SectionHeader";
import { MailIcon } from "@/components/icons";
import { getCurrentIssue, getPastIssues, getPhoto } from "@/data";

export const metadata: Metadata = { title: "Newsletter" };

export default async function Newsletter() {
  const currentIssue = await getCurrentIssue();
  const pastIssues = await getPastIssues();
  const highlights = await Promise.all(
    currentIssue.highlights.map(async (h) => ({
      h,
      photo: h.photoId ? await getPhoto(h.photoId) : null,
    })),
  );
  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader
        title="Newsletter"
        subtitle="Hopechest drafts a family digest every month from what's new in the chest."
      />

      {/* The issue, styled like a printed chronicle */}
      <article className="overflow-hidden rounded-2xl bg-[#fbf6ea] ring-1 ring-hairline">
        <header className="border-b-2 border-walnut/80 px-6 pb-4 pt-7 text-center sm:px-10">
          <p className="text-xs uppercase tracking-[0.25em] text-ink-soft">
            {currentIssue.month} · issue no. 5
          </p>
          <h2 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-walnut sm:text-4xl">
            {currentIssue.title}
          </h2>
        </header>
        <div className="px-6 py-6 sm:px-10">
          <p className="font-display text-[17px] italic leading-8 text-ink">
            {currentIssue.intro}
          </p>
          <div className="mt-6 flex flex-col gap-7">
            {highlights.map(({ h, photo }) => {
              return (
                <section
                  key={h.heading}
                  className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]"
                >
                  <div>
                    <h3 className="font-display text-xl font-semibold tracking-tight text-walnut">
                      {h.heading}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-7 text-ink">
                      {h.body}
                    </p>
                  </div>
                  {photo ? (
                    <Link
                      href={`/photos/${photo.id}`}
                      className="group order-first overflow-hidden rounded-lg ring-1 ring-hairline sm:order-none"
                    >
                      <Img
                        src={photo.src}
                        alt={photo.title}
                        width={photo.width}
                        height={photo.height}
                        className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </Link>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline bg-cream px-6 py-4 sm:px-10">
          <p className="text-sm text-ink-soft">
            Goes out to {currentIssue.recipients} family members on the first
            Sunday.
          </p>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-sepia px-5 text-sm font-medium text-cream transition-colors hover:bg-walnut"
          >
            <MailIcon className="size-4.5" />
            Send this issue
          </button>
        </footer>
      </article>

      <SubHeader>Past issues</SubHeader>
      <div className="flex flex-col gap-2">
        {pastIssues.map((issue) => (
          <div
            key={issue.id}
            className="flex items-center justify-between rounded-xl bg-cream px-5 py-3.5 ring-1 ring-hairline"
          >
            <p className="text-[15px] text-ink">
              <span className="font-medium">{issue.month}</span>
              <span className="text-ink-soft"> — {issue.headline}</span>
            </p>
            <span className="text-sm text-ink-soft">Sent ✓</span>
          </div>
        ))}
      </div>
    </div>
  );
}
