"use client";

import { useMemo, useState } from "react";

import { Img } from "@/components/Img";
import { calibrate } from "@/lib/recognition/calibration";
import { rebuild, type ClusterFace } from "@/lib/recognition/cluster";
import { DEFAULT_CONFIG } from "@/lib/recognition/types";

// One committed Ocean's Eleven descriptor + where its photo lives. The image is
// served by /api/oceans11/<identity>/<file>.
export interface OceansSample {
  id: string; // `${identity}/${file}`
  identity: string; // actor slug, e.g. "george-clooney"
  file: string; // e.g. "george-clooney-01.jpg"
  embedding: number[];
}

const prettify = (slug: string) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const imgSrc = (s: OceansSample) =>
  `/api/oceans11/${encodeURIComponent(s.identity)}/${encodeURIComponent(s.file)}`;

// Most common actor slug among a set of member ids, with its count (for the
// cluster label + purity).
function majority(ids: string[], byId: Map<string, OceansSample>) {
  const counts = new Map<string, number>();
  for (const id of ids) {
    const who = byId.get(id)?.identity ?? "?";
    counts.set(who, (counts.get(who) ?? 0) + 1);
  }
  let name = "?";
  let count = 0;
  for (const [k, v] of counts) {
    if (v > count || (v === count && k < name)) {
      name = k;
      count = v;
    }
  }
  return { name, count };
}

/**
 * Ocean's Eleven super-showcase: runs the pipeline's real DBSCAN clusterer
 * (cluster.ts#rebuild) over the committed crew descriptors, live in the
 * browser, and lays the photos out by cluster. Drag eps/minPts and watch the
 * groups re-sort. Nothing is persisted — it recomputes every render.
 */
export function OceansShowcase({ samples }: { samples: OceansSample[] }) {
  const [eps, setEps] = useState(DEFAULT_CONFIG.eps);
  const [minPts, setMinPts] = useState(DEFAULT_CONFIG.minPts);

  const byId = useMemo(() => new Map(samples.map((s) => [s.id, s])), [samples]);

  const result = useMemo(() => {
    const faces: ClusterFace[] = samples.map((s) => ({ id: s.id, embedding: s.embedding }));
    return rebuild(faces, { ...DEFAULT_CONFIG, eps, minPts });
  }, [samples, eps, minPts]);

  // Separation readout from the pipeline's own calibrator (pure), at this eps.
  const cal = useMemo(() => {
    if (samples.length < 2) return null;
    try {
      return calibrate(
        samples.map((s) => ({ identity: s.identity, embedding: s.embedding })),
        eps,
      );
    } catch {
      return null;
    }
  }, [samples, eps]);

  if (samples.length === 0) {
    return (
      <section className="rounded border p-4" data-testid="oceans-showcase">
        <p className="text-gray-500">
          No Ocean&apos;s Eleven descriptors found (fixtures/recognition/oceans11-descriptors.json).
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4" data-testid="oceans-showcase">
      {/* --- intro + live controls --- */}
      <section className="space-y-3 rounded border p-4">
        <div>
          <h2 className="font-semibold">Ocean&apos;s Eleven — sort the crew</h2>
          <p className="text-xs text-gray-500">
            {samples.length} real face-api descriptors of the eleven crew actors, clustered live by
            the pipeline&apos;s DBSCAN (<code>cluster.ts</code>) in your browser. Drag the knobs and
            watch the photos re-group — nothing is saved, it recomputes each time.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">
              eps (same-person L2 threshold) — <b className="font-mono">{eps.toFixed(2)}</b>
            </span>
            <input
              data-testid="oceans-eps"
              type="range"
              min={0.3}
              max={1.0}
              step={0.01}
              value={eps}
              onChange={(e) => setEps(Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">
              minPts (core-point support) — <b className="font-mono">{minPts}</b>
            </span>
            <input
              data-testid="oceans-minpts"
              type="range"
              min={1}
              max={8}
              step={1}
              value={minPts}
              onChange={(e) => setMinPts(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-xs" data-testid="oceans-summary">
            {samples.length} photos → <b>{result.clusters.length}</b> groups ·{" "}
            <b>{result.noise.length}</b> unsorted · eps {eps.toFixed(2)} · minPts {minPts}
          </p>
          <button
            className="rounded border px-2 py-1 text-xs"
            onClick={() => {
              setEps(DEFAULT_CONFIG.eps);
              setMinPts(DEFAULT_CONFIG.minPts);
            }}
          >
            reset to {DEFAULT_CONFIG.eps} / {DEFAULT_CONFIG.minPts}
          </button>
          {cal && (
            <span
              className={`rounded px-2 py-0.5 text-xs ${cal.clean ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}
            >
              {cal.clean
                ? `CLEAN · intra p95 ${cal.intra.p95.toFixed(2)} < eps < inter p5 ${cal.inter.p5.toFixed(2)}`
                : `SMEAR · intra p95 ${cal.intra.p95.toFixed(2)} / inter p5 ${cal.inter.p5.toFixed(2)}`}
            </span>
          )}
        </div>
      </section>

      {/* --- the clusters --- */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {result.clusters.map((c) => {
          const maj = majority(c.memberIds, byId);
          const pure = maj.count === c.size;
          return (
            <section
              key={c.memberIds[0]}
              data-testid="oceans-cluster"
              className="space-y-2 rounded border p-3 transition-all"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{prettify(maj.name)}</h3>
                <div className="flex items-center gap-1">
                  <span className="rounded bg-gray-200 px-2 text-xs">{c.size} photos</span>
                  <span
                    className={`rounded px-2 text-xs ${pure ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}
                  >
                    {pure ? "pure" : `${maj.count}/${c.size}`}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {c.memberIds.map((id) => {
                  const s = byId.get(id);
                  if (!s) return null;
                  const isMedoid = id === c.representativeFaceId;
                  const offIdentity = s.identity !== maj.name;
                  return (
                    <Img
                      key={id}
                      src={imgSrc(s)}
                      alt={s.file}
                      title={`${s.identity} · ${s.file}`}
                      className={`h-16 w-16 rounded object-cover ${
                        isMedoid
                          ? "ring-2 ring-blue-500"
                          : offIdentity
                            ? "ring-2 ring-red-400"
                            : ""
                      }`}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* --- noise / unsorted --- */}
      {result.noise.length > 0 && (
        <section className="space-y-2 rounded border border-dashed p-3" data-testid="oceans-noise">
          <h3 className="font-semibold text-gray-600">
            Unsorted / outliers ({result.noise.length})
          </h3>
          <p className="text-xs text-gray-500">
            Below the core-point bar at this eps/minPts — typically group or red-carpet shots where
            a co-star&apos;s face dominates.
          </p>
          <div className="flex flex-wrap gap-1">
            {result.noise.map((id) => {
              const s = byId.get(id);
              if (!s) return null;
              return (
                <Img
                  key={id}
                  src={imgSrc(s)}
                  alt={s.file}
                  title={`${s.identity} · ${s.file}`}
                  className="h-16 w-16 rounded object-cover opacity-70 grayscale"
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
