import Link from "next/link";

import { Img } from "./Img";
import { CameraIcon } from "./icons";
import { getDemoToday, onThisDay } from "@/data";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * A "Memories"-style module: photos taken on today's calendar day (month + day)
 * in earlier years. Driven by precise photo dates and the demo's pinned today,
 * so it's deterministic and always populated.
 */
export async function OnThisDay() {
  const today = await getDemoToday();
  const [, mm, dd] = today.split("-").map(Number);
  const memories = await onThisDay(mm, dd);
  if (memories.length === 0) return null;

  const todayLabel = `${MONTHS[mm - 1]} ${dd}`;

  return (
    <section className="rounded-2xl bg-cream p-5 ring-1 ring-hairline">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-full bg-sepia/10 text-sepia">
          <CameraIcon className="size-4.5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-walnut">
            On this day
          </h2>
          <p className="text-xs text-ink-soft">
            {todayLabel} — {memories.length} memor{memories.length === 1 ? "y" : "ies"} from years past
          </p>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {memories.map((photo) => (
          <Link
            key={photo.id}
            href={`/photos/${photo.id}`}
            className="group relative w-40 shrink-0 overflow-hidden rounded-lg ring-1 ring-hairline"
          >
            <Img
              src={photo.src}
              alt={photo.title}
              width={photo.width}
              height={photo.height}
              className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
            <span className="absolute left-1.5 top-1.5 rounded-full bg-walnut/85 px-2 py-0.5 text-xs font-medium text-cream backdrop-blur">
              {photo.date.year}
            </span>
            <span className="block truncate px-2 py-1.5 text-xs text-ink-soft">
              {photo.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
