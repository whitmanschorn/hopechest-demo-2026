"use client";

import { useMemo, useState } from "react";

import { Img } from "@/components/Img";
import { l2 } from "@/lib/recognition/distance";
import { DEFAULT_CONFIG } from "@/lib/recognition/types";

import { imgSrc, prettify, type OceansSample } from "./oceans";

const THRESHOLD = DEFAULT_CONFIG.recognizeThreshold; // 0.6 accept cutoff
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
// Same heuristic confidence map as recognize.ts#pickMatch.
const confidence = (d: number) => clamp01(1 - d / THRESHOLD);

const pickIndex = (n: number, not: number) => {
  if (n <= 1) return 0;
  let i = not;
  while (i === not) i = Math.floor(Math.random() * n);
  return i;
};

interface Candidate {
  identity: string;
  name: string;
  distance: number; // nearest reference face of this person
  nearest: OceansSample; // that reference photo
}

/**
 * "Who is this?" debug widget. Picks a random Ocean's Eleven photo and shows the
 * top ≤3 candidate people — ranked by the nearest known reference face (same
 * L2/confidence the recognizer uses) — with certainty and debugging info.
 * Recomputes per shuffle, entirely client-side over the committed descriptors.
 */
export function OceansIdentify({ samples }: { samples: OceansSample[] }) {
  // This tab only mounts client-side (it's behind a non-default tab, never
  // SSR'd), so a random initial index can't cause a hydration mismatch.
  const [idx, setIdx] = useState(() => pickIndex(samples.length, -1));

  const shuffle = () => setIdx((cur) => pickIndex(samples.length, cur));

  const query = samples[idx] ?? samples[0];

  const { candidates, neighbors, refCount } = useMemo(() => {
    if (!query) return { candidates: [] as Candidate[], neighbors: [], refCount: 0 };
    const gallery = samples.filter((s) => s.id !== query.id);

    // best (min-distance) reference face per person
    const best = new Map<string, Candidate>();
    for (const g of gallery) {
      const d = l2(query.embedding, g.embedding);
      const cur = best.get(g.identity);
      if (!cur || d < cur.distance) {
        best.set(g.identity, { identity: g.identity, name: prettify(g.identity), distance: d, nearest: g });
      }
    }
    const candidates = [...best.values()].sort((a, b) => a.distance - b.distance).slice(0, 3);

    // raw nearest faces, for deeper debugging
    const neighbors = gallery
      .map((g) => ({ s: g, d: l2(query.embedding, g.embedding) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 5);

    return { candidates, neighbors, refCount: gallery.length };
  }, [samples, query]);

  if (samples.length === 0) {
    return (
      <section className="rounded border p-4" data-testid="oceans-identify">
        <p className="text-gray-500">
          No Ocean&apos;s Eleven descriptors found (fixtures/recognition/oceans11-descriptors.json).
        </p>
      </section>
    );
  }

  const top1 = candidates[0];
  const accepted = top1 && top1.distance <= THRESHOLD;
  const correct = top1?.identity === query?.identity;
  const trueInTop3 = candidates.some((c) => c.identity === query?.identity);
  const margin = candidates[1] ? candidates[1].distance - candidates[0].distance : null;

  return (
    <div className="space-y-4" data-testid="oceans-identify">
      <section className="space-y-1 rounded border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Who is this?</h2>
          <button
            data-testid="oceans-shuffle"
            onClick={shuffle}
            className="rounded border px-3 py-1"
          >
            🔀 Shuffle
          </button>
        </div>
        <p className="text-xs text-gray-500">
          A random photo from the Ocean&apos;s set, ranked against every other known face. Top ≤3
          guesses with confidence (nearest known face within L2 {THRESHOLD}). Runs in your browser.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* the mystery photo */}
        <section className="space-y-2 rounded border p-3" data-testid="oceans-query">
          {query && (
            <Img
              src={imgSrc(query)}
              alt={query.file}
              className="max-h-64 w-full rounded object-contain"
            />
          )}
          <div
            className={`rounded p-2 text-sm ${accepted ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}
          >
            {accepted
              ? `Best guess: ${top1.name} · ${Math.round(confidence(top1.distance) * 100)}% confident`
              : `Unknown — nearest known face is beyond the ${THRESHOLD} threshold`}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-xs text-gray-600">
            <dt className="text-gray-400">file</dt>
            <dd>{query?.file}</dd>
            <dt className="text-gray-400">actual</dt>
            <dd>
              {prettify(query?.identity ?? "")}{" "}
              {top1 && (correct ? <span className="text-green-700">✓ top-1</span> : trueInTop3 ? <span className="text-amber-700">in top-3</span> : <span className="text-red-600">missed</span>)}
            </dd>
            <dt className="text-gray-400">margin</dt>
            <dd>{margin == null ? "—" : margin.toFixed(3)} (d₂−d₁)</dd>
            <dt className="text-gray-400">compared</dt>
            <dd>{refCount} known faces</dd>
          </dl>
        </section>

        {/* the candidates */}
        <section className="space-y-2 rounded border p-3">
          <h3 className="text-xs font-semibold text-gray-500">Top {candidates.length} candidates</h3>
          {candidates.map((c, i) => {
            const conf = confidence(c.distance);
            const isTrue = c.identity === query?.identity;
            return (
              <div
                key={c.identity}
                data-testid="oceans-candidate"
                className={`flex items-center gap-3 rounded border p-2 ${i === 0 ? "border-blue-400 bg-blue-50/50" : ""}`}
              >
                <span className="font-mono text-sm text-gray-400">#{i + 1}</span>
                <Img src={imgSrc(c.nearest)} alt={c.name} className="h-12 w-12 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 font-medium">
                    {c.name}
                    {isTrue && <span className="text-green-700">✓</span>}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded bg-gray-200">
                    <div className="h-full bg-blue-500" style={{ width: `${conf * 100}%` }} />
                  </div>
                  <div className="font-mono text-[11px] text-gray-500">
                    {Math.round(conf * 100)}% · L2 {c.distance.toFixed(3)}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {/* raw nearest faces */}
      <section className="space-y-1 rounded border border-dashed p-3">
        <h3 className="text-xs font-semibold text-gray-500">Nearest known faces (raw)</h3>
        <ul className="font-mono text-[11px] text-gray-600">
          {neighbors.map((n) => (
            <li key={n.s.id}>
              {n.d.toFixed(3)} · {n.s.file}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
