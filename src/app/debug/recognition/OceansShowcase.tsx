"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { Img } from "@/components/Img";
import { l2 } from "@/lib/recognition/distance";
import { pickMatch } from "@/lib/recognition/recognize";
import { cfg, DEFAULT_CONFIG } from "@/lib/recognition/types";

// One committed Ocean's Eleven descriptor + where its photo lives. The image is
// served by /api/oceans11/<identity>/<file>.
export interface OceansSample {
  id: string; // `${identity}/${file}`
  identity: string; // actor slug, e.g. "george-clooney"
  file: string; // e.g. "george-clooney-01.jpg"
  embedding: number[];
}

// Reference photos enrolled per known person (the "we already know these
// people" gallery); the rest become photos to auto-tag.
const ENROLL_PER = 3;
const TICK_MS = 220; // one photo tagged per tick during playback

// Structurally a recognize.ts NeighborRow — declared locally so this client
// component never imports the server-only db module.
type Neighbor = { faceId: string; identityId: string | null; name: string | null; distance: number };

const prettify = (slug: string) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const imgSrc = (s: { identity: string; file: string }) =>
  `/api/oceans11/${encodeURIComponent(s.identity)}/${encodeURIComponent(s.file)}`;

/**
 * Ocean's Eleven super-showcase, framed as the product's real job: tagging new
 * photos against PRE-KNOWN people. We enroll a few reference photos per crew
 * actor (named, "known"), then auto-tag the remaining photos with the
 * pipeline's actual recognize decision (recognize.ts#pickMatch) — kNN against
 * the enrolled gallery, threshold + optional vote. Start/Pause/Restart play the
 * tagging as it happens; nothing is persisted (recomputed each render).
 */
export function OceansShowcase({ samples }: { samples: OceansSample[] }) {
  const [threshold, setThreshold] = useState(DEFAULT_CONFIG.recognizeThreshold);
  const [vote, setVote] = useState(DEFAULT_CONFIG.recognizeVote);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(0);

  // Split each actor's photos into an enrolled gallery (known) + photos to tag.
  // Query photos are round-robined across actors so the reveal populates many
  // people early.
  const { gallery, query, people } = useMemo(() => {
    const byActor = new Map<string, OceansSample[]>();
    for (const s of [...samples].sort((a, b) => (a.file < b.file ? -1 : 1))) {
      const list = byActor.get(s.identity);
      if (list) list.push(s);
      else byActor.set(s.identity, [s]);
    }
    const sorted = [...byActor.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const gallery: { id: string; identity: string; name: string; embedding: number[] }[] = [];
    const people: { identity: string; name: string; enrolled: OceansSample[] }[] = [];
    const rests: OceansSample[][] = [];
    for (const [identity, list] of sorted) {
      const name = prettify(identity);
      const enrolled = list.slice(0, ENROLL_PER);
      enrolled.forEach((s) => gallery.push({ id: s.id, identity, name, embedding: s.embedding }));
      people.push({ identity, name, enrolled });
      rests.push(list.slice(ENROLL_PER));
    }
    const query: OceansSample[] = [];
    for (let i = 0; ; i++) {
      let any = false;
      for (const r of rests) {
        if (i < r.length) {
          query.push(r[i]);
          any = true;
        }
      }
      if (!any) break;
    }
    return { gallery, query, people };
  }, [samples]);

  const config = useMemo(
    () => cfg({ recognizeThreshold: threshold, recognizeVote: vote }),
    [threshold, vote],
  );

  // The actual recognition decision per query photo: kNN vs the enrolled
  // gallery → pickMatch (mirrors /api/recognition/recognize, sans DB).
  const results = useMemo(
    () =>
      query.map((q) => {
        const neighbors: Neighbor[] = gallery
          .map((g) => ({
            faceId: g.id,
            identityId: g.identity,
            name: g.name,
            distance: l2(q.embedding, g.embedding),
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, config.recognizeK);
        const match = pickMatch(neighbors, config);
        return { q, match, correct: match != null && match.identityId === q.identity };
      }),
    [query, gallery, config],
  );

  // Playback reveals query photos one per tick (the tagging "happening").
  const revealedRef = useRef(revealed);
  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);
  useEffect(() => {
    if (!playing) return;
    const h = setInterval(() => {
      const next = revealedRef.current + 1;
      setRevealed(Math.min(query.length, next));
      if (next >= query.length) setPlaying(false);
    }, TICK_MS);
    return () => clearInterval(h);
  }, [playing, query.length]);

  const start = () => {
    if (revealed >= query.length) setRevealed(0); // replay if finished
    setPlaying(true);
  };
  const pause = () => setPlaying(false);
  const restart = () => {
    setRevealed(0);
    setPlaying(true);
  };
  const tagAll = () => {
    setPlaying(false);
    setRevealed(query.length);
  };

  if (samples.length === 0) {
    return (
      <section className="rounded border p-4" data-testid="oceans-showcase">
        <p className="text-gray-500">
          No Ocean&apos;s Eleven descriptors found (fixtures/recognition/oceans11-descriptors.json).
        </p>
      </section>
    );
  }

  const shown = results.slice(0, revealed);
  const taggedByPerson = new Map<string, typeof shown>();
  const unknown: typeof shown = [];
  for (const r of shown) {
    if (r.match) {
      const arr = taggedByPerson.get(r.match.identityId);
      if (arr) arr.push(r);
      else taggedByPerson.set(r.match.identityId, [r]);
    } else {
      unknown.push(r);
    }
  }
  const tagged = shown.length - unknown.length;
  const correct = shown.filter((r) => r.correct).length;
  const acc = shown.length ? Math.round((correct / shown.length) * 100) : 0;
  const progress = query.length ? revealed / query.length : 0;

  return (
    <div className="space-y-4" data-testid="oceans-showcase">
      <style>{`@keyframes oceansPop{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:none}}.oceans-pop{animation:oceansPop .3s ease both}`}</style>

      {/* --- intro + controls --- */}
      <section className="space-y-3 rounded border p-4">
        <div>
          <h2 className="font-semibold">Ocean&apos;s Eleven — tag the known crew</h2>
          <p className="text-xs text-gray-500">
            We&apos;ve already enrolled the eleven crew actors as <b>known people</b> ({ENROLL_PER}{" "}
            reference photos each). Hit Start and the pipeline&apos;s recognizer (
            <code>recognize.ts</code>) tags each remaining photo to the right person — nearest
            enrolled face within the threshold, with a confidence — exactly the Hope Chest
            &ldquo;who is this?&rdquo; path. Runs in your browser; nothing is saved.
          </p>
        </div>

        {/* playback */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              data-testid="oceans-play"
              onClick={start}
              disabled={playing}
              className="rounded border px-3 py-1 disabled:opacity-40"
            >
              ▶ Start
            </button>
            <button
              data-testid="oceans-pause"
              onClick={pause}
              disabled={!playing}
              className="rounded border px-3 py-1 disabled:opacity-40"
            >
              ⏸ Pause
            </button>
            <button
              data-testid="oceans-restart"
              onClick={restart}
              className="rounded border px-3 py-1"
            >
              ↻ Restart
            </button>
            <button
              data-testid="oceans-tagall"
              onClick={tagAll}
              className="rounded border px-3 py-1 text-gray-600"
            >
              ⤓ Tag all
            </button>
            <span className="font-mono text-xs text-gray-500" data-testid="oceans-summary">
              {playing ? "tagging…" : revealed >= query.length ? "done ✓" : "paused"} · {revealed}/
              {query.length} photos · {tagged} tagged · {acc}% correct
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded bg-gray-200">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* recognize knobs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">
              accept threshold (max L2 to a known face) —{" "}
              <b className="font-mono">{threshold.toFixed(2)}</b>
            </span>
            <input
              data-testid="oceans-threshold"
              type="range"
              min={0.3}
              max={1.0}
              step={0.01}
              value={threshold}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setThreshold(Number(e.target.value))}
            />
          </label>
          <label className="flex items-center gap-2 self-end text-xs text-gray-500">
            <input
              data-testid="oceans-vote"
              type="checkbox"
              checked={vote}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setVote(e.target.checked)}
            />
            majority vote among k={config.recognizeK} nearest (vs single nearest)
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Enrolled {people.length} people · {gallery.length} reference faces · {query.length} photos
          to tag. <span className="text-emerald-700">green ring = enrolled reference</span> ·{" "}
          <span className="text-red-600">red ring = mis-tagged</span>.
        </p>
      </section>

      {/* --- known people, each with their enrolled refs + freshly tagged photos --- */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {people.map((p) => {
          const tags = taggedByPerson.get(p.identity) ?? [];
          return (
            <section
              key={p.identity}
              data-testid="oceans-person"
              className="space-y-2 rounded border p-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                <span className="rounded bg-gray-200 px-2 text-xs">
                  +{tags.length} tagged
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {/* enrolled references */}
                {p.enrolled.map((s) => (
                  <Img
                    key={s.id}
                    src={imgSrc(s)}
                    alt={s.file}
                    title={`enrolled · ${s.file}`}
                    className="h-14 w-14 rounded object-cover ring-2 ring-emerald-500"
                  />
                ))}
                {/* a divider between enrolled and tagged */}
                {tags.length > 0 && <div className="mx-1 w-px self-stretch bg-gray-200" />}
                {/* freshly tagged photos */}
                {tags.map((r) => (
                  <div key={r.q.id} className="oceans-pop relative">
                    <Img
                      src={imgSrc(r.q)}
                      alt={r.q.file}
                      title={`${r.q.identity} · ${r.q.file}`}
                      className={`h-14 w-14 rounded object-cover ${r.correct ? "" : "ring-2 ring-red-500"}`}
                    />
                    <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-1 text-[10px] leading-tight text-white">
                      {Math.round((r.match?.confidence ?? 0) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* --- unknown / below threshold --- */}
      {unknown.length > 0 && (
        <section className="space-y-2 rounded border border-dashed p-3" data-testid="oceans-unknown">
          <h3 className="font-semibold text-gray-600">
            No confident match ({unknown.length})
          </h3>
          <p className="text-xs text-gray-500">
            Nearest enrolled face is farther than the threshold ({threshold.toFixed(2)}) — the
            recognizer declines to tag rather than guess. Raise the threshold to tag more (at the
            risk of mistakes).
          </p>
          <div className="flex flex-wrap gap-1">
            {unknown.map((r) => (
              <Img
                key={r.q.id}
                src={imgSrc(r.q)}
                alt={r.q.file}
                title={`${r.q.identity} · ${r.q.file}`}
                className="oceans-pop h-14 w-14 rounded object-cover opacity-70 grayscale"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
