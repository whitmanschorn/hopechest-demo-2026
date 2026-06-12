import Link from "next/link";

import { Badge } from "./Badge";
import { InitialsAvatar } from "./InitialsAvatar";
import { CameraIcon, SparkleIcon } from "./icons";
import { getPerson, type Photo, type PhotoFact } from "@/data";

function FactRow({ label, fact }: { label: string; fact: PhotoFact }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-0.5">
        <span className="text-[15px] font-medium text-ink">{fact.value}</span>
        {fact.deduced ? (
          <Badge tone="brass" className="ml-2 align-[2px]">
            <SparkleIcon className="size-3" />
            Deduced
          </Badge>
        ) : null}
        {fact.clue ? (
          <span className="mt-0.5 block text-[13px] leading-5 text-ink-soft">
            {fact.deduced ? "How Hopechest knows: " : "Source: "}
            {fact.clue}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

export function PhotoDetails({ photo }: { photo: Photo }) {
  const contributor = getPerson(photo.contributedById);
  const hasDeduced = [
    photo.photographer,
    photo.takenWhen,
    photo.takenWhere,
  ].some((f) => f?.deduced);
  return (
    <section className="overflow-hidden rounded-xl bg-cream ring-1 ring-hairline">
      <h2 className="flex items-center gap-2 px-4 pt-4 font-display text-lg font-semibold tracking-tight text-walnut">
        <CameraIcon className="size-5 text-brass" />
        Details
      </h2>
      <dl className="mt-1 divide-y divide-hairline">
        <div className="px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-ink-soft">
            This version contributed by
          </dt>
          <dd className="mt-1.5">
            <Link
              href={`/people/${contributor.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-parchment py-1 pl-1 pr-3 ring-1 ring-hairline transition-colors hover:ring-sepia/40"
            >
              <InitialsAvatar person={contributor} size="sm" />
              <span className="text-sm font-medium">
                {contributor.shortName}
              </span>
              <span className="text-xs text-ink-soft">
                {photo.contributedWhen}
              </span>
            </Link>
          </dd>
        </div>
        {photo.photographer ? (
          <FactRow label="Taken by" fact={photo.photographer} />
        ) : null}
        {photo.takenWhen ? (
          <FactRow label="When" fact={photo.takenWhen} />
        ) : null}
        {photo.takenWhere ? (
          <FactRow label="Where" fact={photo.takenWhere} />
        ) : null}
      </dl>
      {hasDeduced ? (
        <p className="flex items-start gap-2 border-t border-hairline bg-brass/5 px-4 py-3 text-[13px] leading-5 text-ink-soft">
          <SparkleIcon className="mt-0.5 size-4 shrink-0 text-brass" />
          Deduced details come from clues in other photos — the same people,
          clothing, cars, and buildings across the chest. The family can
          confirm or correct any of them.
        </p>
      ) : null}
    </section>
  );
}
