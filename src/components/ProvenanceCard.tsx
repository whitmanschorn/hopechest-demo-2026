import { PhotoOfPhoto } from "./PhotoOfPhoto";
import { CopiesIcon } from "./icons";
import { getPerson, type Photo } from "@/data";

/**
 * The heart of the originals-and-copies concept: one canonical print, with
 * every family capture of it linked underneath.
 */
export async function ProvenanceCard({ photo }: { photo: Photo }) {
  if (photo.captures.length === 0) return null;
  const scannedBy = await getPerson(photo.contributedById);
  const capturedBy = await Promise.all(
    photo.captures.map((capture) => getPerson(capture.capturedById)),
  );
  return (
    <section className="rounded-xl bg-cream p-5 ring-1 ring-hairline">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-walnut">
        <CopiesIcon className="size-5 text-brass" />
        One original, {photo.captures.length} family copies
      </h2>
      <p className="mt-1 text-sm leading-6 text-ink-soft">
        Hopechest recognized these phone photos as pictures of the same
        physical print and linked them to the scanned original.
      </p>
      <div className="mt-4 rounded-lg bg-parchment px-4 py-3 ring-1 ring-hairline">
        <p className="text-sm">
          <span className="font-medium text-ink">The original print</span>
          <span className="text-ink-soft">
            {" "}
            — scanned by {scannedBy.shortName}, {photo.contributedWhen}.
          </span>
        </p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {photo.captures.map((capture, i) => {
          const by = capturedBy[i];
          return (
            <figure key={capture.id} className="flex flex-col">
              <PhotoOfPhoto photo={photo} framing={capture.framing} />
              <figcaption className="px-1 pt-2.5">
                <span className="block text-sm font-medium text-ink">
                  Copy — {by.shortName}, {capture.capturedAt}
                </span>
                <span className="block text-xs text-ink-soft">
                  {capture.device}
                </span>
                {capture.note ? (
                  <span className="mt-1 block text-xs italic leading-5 text-ink-soft">
                    &ldquo;{capture.note}&rdquo;
                  </span>
                ) : null}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
