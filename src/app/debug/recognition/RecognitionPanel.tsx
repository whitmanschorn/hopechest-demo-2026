"use client";

import { useMemo, useState } from "react";

import type { CalibrationReport } from "@/lib/recognition/calibration";
import { DEFAULT_CONFIG } from "@/lib/recognition/types";
import type { PipelineConfig } from "@/lib/recognition/types";
import type { Scenario } from "@/lib/recognition/scenario";
import type {
  ClusterQuestion,
  QuestionsResponse,
  RebuildResponse,
  RecognizeResponse,
} from "@/lib/recognition/types";

const API = "/api/recognition";

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export function RecognitionPanel({
  fixtures,
  calibration,
}: {
  fixtures: Scenario[];
  calibration: CalibrationReport | null;
}) {
  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_CONFIG);
  const set = <K extends keyof PipelineConfig>(k: K, v: PipelineConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  // generator knobs
  const [noiseStd, setNoiseStd] = useState(0.022);
  const [centroidStd, setCentroidStd] = useState(0.1);
  const [personSizes, setPersonSizes] = useState("12,7,3");

  const [selectedFixture, setSelectedFixture] = useState(fixtures[0]?.name ?? "");
  const [seeded, setSeeded] = useState<Scenario | null>(null);
  const [rebuildRes, setRebuildRes] = useState<RebuildResponse | null>(null);
  const [questions, setQuestions] = useState<ClusterQuestion[]>([]);
  const [recognizeRes, setRecognizeRes] = useState<RecognizeResponse | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const sizes = useMemo(
    () => personSizes.split(",").map((s) => Number(s.trim())).filter((n) => n > 0),
    [personSizes],
  );

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(true);
    setStatus(`${label}…`);
    try {
      await fn();
      setStatus(`${label} ✓`);
    } catch (e) {
      setStatus(`${label} ✗ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const reset = () =>
    run("reset", async () => {
      await post("/debug/reset");
      setSeeded(null);
      setRebuildRes(null);
      setQuestions([]);
      setRecognizeRes(null);
    });

  const seedFixture = () =>
    run("seed fixture", async () => {
      const fx = fixtures.find((f) => f.name === selectedFixture);
      if (!fx) throw new Error("no fixture selected");
      await post("/debug/seed-scenario", { scenario: fx });
      setSeeded(fx);
    });

  const generateAndSeed = () =>
    run("generate & seed", async () => {
      const r = await post<{ scenario?: Scenario }>("/debug/seed-scenario", {
        generate: { name: "generated", personSizes: sizes, noiseStd, centroidStd },
      });
      setSeeded(r.scenario ?? null);
    });

  const rebuild = () =>
    run("rebuild", async () => {
      const r = await post<RebuildResponse>("/rebuild", { config });
      setRebuildRes(r);
      const q = await post<QuestionsResponse>("/questions").catch(async () => {
        const res = await fetch(`${API}/questions`);
        return (await res.json()) as QuestionsResponse;
      });
      setQuestions(q.questions);
    });

  const refreshQuestions = async () => {
    const res = await fetch(`${API}/questions`);
    setQuestions(((await res.json()) as QuestionsResponse).questions);
  };

  const label = (clusterId: string, name: string) =>
    run("label", async () => {
      await post("/label", { clusterId, newName: name, config });
      await refreshQuestions();
    });

  const recognizeProbe = (embedding: number[]) =>
    run("recognize", async () => {
      setRecognizeRes(await post<RecognizeResponse>("/recognize", { embedding, config }));
    });

  // Real-upload eyeball path: lazily load face-api ONLY on demand. The specifier
  // is a runtime string so the build never needs the package; if it (or its
  // model weights) isn't present, we just report it. CI never exercises this.
  const onUpload = (file: File) =>
    run("detect+embed upload", async () => {
      const specifier = "@vladmandic/face-api";
      let faceapi: unknown;
      try {
        faceapi = await import(/* @vite-ignore */ specifier);
      } catch {
        throw new Error("face-api not installed — `npm i @vladmandic/face-api` and host model weights to use this path");
      }
      void faceapi;
      void file;
      throw new Error("model weights not configured (see docs/recognition.md)");
    });

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6 text-sm" data-testid="recognition-debug">
      <header>
        <h1 className="text-xl font-semibold">Recognition pipeline — debug</h1>
        <p className="text-gray-500">
          The embedding is the seam. Synthetic vectors in, deterministic cluster math out.
        </p>
        <p data-testid="status" className="mt-1 font-mono text-xs text-blue-700">
          {status}
        </p>
      </header>

      {/* --- real-face calibration (committed descriptors) --- */}
      {calibration && (
        <section className="space-y-2 rounded border p-4" data-testid="calibration">
          <h2 className="font-semibold">Real-face calibration (eps {calibration.eps})</h2>
          <p className="text-xs text-gray-500">
            {calibration.nSamples} real face-api descriptors · {calibration.nIdentities} identities ({calibration.nMultiShot} multi-shot). Does the synthetic math hold on real faces?
          </p>
          <div className="grid grid-cols-1 gap-2 font-mono text-xs md:grid-cols-2">
            <div data-testid="calibration-intra">
              intra-person ({calibration.intra.count} pairs): median {calibration.intra.median.toFixed(3)} · p95{" "}
              {calibration.intra.p95.toFixed(3)} · <span className="text-red-700">{calibration.intra.overEps} over eps</span>
            </div>
            <div data-testid="calibration-inter">
              inter-person ({calibration.inter.count} pairs): p5 {calibration.inter.p5.toFixed(3)} · median{" "}
              {calibration.inter.median.toFixed(3)} · <span className="text-red-700">{calibration.inter.underEps} under eps</span>
            </div>
          </div>
          <p
            data-testid="calibration-verdict"
            className={`rounded p-2 text-xs ${calibration.clean ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}
          >
            {calibration.clean
              ? `CLEAN: intra p95 ${calibration.intra.p95.toFixed(3)} < eps ${calibration.eps} < inter p5 ${calibration.inter.p5.toFixed(3)} — the default holds.`
              : `SMEAR: intra p95 ${calibration.intra.p95.toFixed(3)} and inter p5 ${calibration.inter.p5.toFixed(3)} straddle eps ${calibration.eps} (overlap). Min-error eps on this sample ≈ ${calibration.minError.eps}. Tune eps, quality-gate low-confidence faces, re-calibrate on your real photo mix.`}
          </p>
        </section>
      )}

      {/* --- config knobs --- */}
      <section className="space-y-3 rounded border p-4">
        <h2 className="font-semibold">Config</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Knob label="eps">
            <input
              data-testid="config-eps"
              type="number"
              step="0.05"
              value={config.eps}
              onChange={(e) => set("eps", Number(e.target.value))}
              className="w-full border px-1"
            />
          </Knob>
          <Knob label="minPts">
            <input
              data-testid="config-minPts"
              type="number"
              value={config.minPts}
              onChange={(e) => set("minPts", Number(e.target.value))}
              className="w-full border px-1"
            />
          </Knob>
          <Knob label="metric">
            <select
              data-testid="config-metric"
              value={config.metric}
              onChange={(e) => set("metric", e.target.value as PipelineConfig["metric"])}
              className="w-full border px-1"
            >
              <option value="l2">l2</option>
              <option value="cosine">cosine</option>
            </select>
          </Knob>
          <Knob label="normalize">
            <input
              data-testid="config-normalize"
              type="checkbox"
              checked={config.normalizeForClustering}
              onChange={(e) => set("normalizeForClustering", e.target.checked)}
            />
          </Knob>
          <Knob label="recognizeK">
            <input
              data-testid="config-recognizeK"
              type="number"
              value={config.recognizeK}
              onChange={(e) => set("recognizeK", Number(e.target.value))}
              className="w-full border px-1"
            />
          </Knob>
          <Knob label="recognizeThreshold">
            <input
              data-testid="config-recognizeThreshold"
              type="number"
              step="0.05"
              value={config.recognizeThreshold}
              onChange={(e) => set("recognizeThreshold", Number(e.target.value))}
              className="w-full border px-1"
            />
          </Knob>
          <Knob label="recognizeVote">
            <input
              data-testid="config-recognizeVote"
              type="checkbox"
              checked={config.recognizeVote}
              onChange={(e) => set("recognizeVote", e.target.checked)}
            />
          </Knob>
        </div>
        <button
          data-testid="config-reset"
          className="rounded border px-2 py-1"
          onClick={() => setConfig(DEFAULT_CONFIG)}
        >
          reset to defaults
        </button>
      </section>

      {/* --- generator knobs --- */}
      <section className="space-y-3 rounded border p-4">
        <h2 className="font-semibold">Generator</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Knob label="noiseStd σ">
            <input
              data-testid="gen-noiseStd"
              type="number"
              step="0.001"
              value={noiseStd}
              onChange={(e) => setNoiseStd(Number(e.target.value))}
              className="w-full border px-1"
            />
          </Knob>
          <Knob label="centroidStd κ">
            <input
              data-testid="gen-centroidStd"
              type="number"
              step="0.01"
              value={centroidStd}
              onChange={(e) => setCentroidStd(Number(e.target.value))}
              className="w-full border px-1"
            />
          </Knob>
          <Knob label="personSizes">
            <input
              data-testid="gen-personSizes"
              value={personSizes}
              onChange={(e) => setPersonSizes(e.target.value)}
              className="w-full border px-1"
            />
          </Knob>
        </div>
        <p className="font-mono text-xs text-gray-600" data-testid="gen-readout">
          predicted intra-pair ≈ {(16 * noiseStd).toFixed(2)} · inter-person ≈ {(16 * centroidStd).toFixed(2)} · eps {config.eps}
        </p>
        <button data-testid="gen-seed" disabled={busy} className="rounded border px-2 py-1" onClick={generateAndSeed}>
          generate &amp; seed
        </button>
      </section>

      {/* --- scenario loader --- */}
      <section className="flex flex-wrap items-center gap-3 rounded border p-4">
        <h2 className="font-semibold">Scenario</h2>
        <select
          data-testid="fixture-select"
          value={selectedFixture}
          onChange={(e) => setSelectedFixture(e.target.value)}
          className="border px-1"
        >
          {fixtures.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name} ({f.expected.sizesDesc.join(",")} | noise {f.expected.noise})
            </option>
          ))}
        </select>
        <button data-testid="seed-scenario" disabled={busy} className="rounded border px-2 py-1" onClick={seedFixture}>
          seed
        </button>
        <button data-testid="reset" disabled={busy} className="rounded border px-2 py-1" onClick={reset}>
          reset
        </button>
        {seeded && (
          <span className="text-gray-500" data-testid="seeded-info">
            seeded {seeded.faces.length} faces · expect {seeded.expected.clusters} clusters / {seeded.expected.noise} noise
          </span>
        )}
      </section>

      {/* --- rebuild --- */}
      <section className="space-y-2 rounded border p-4">
        <button data-testid="rebuild" disabled={busy} className="rounded border px-2 py-1" onClick={rebuild}>
          rebuild
        </button>
        {rebuildRes && (
          <p className="font-mono text-xs">
            clusters <b data-testid="cluster-count">{rebuildRes.clusters}</b> · noise{" "}
            <b data-testid="noise-count">{rebuildRes.noise}</b> · clustered {rebuildRes.facesClustered} · {rebuildRes.tookMs}ms
          </p>
        )}
      </section>

      {/* --- who-is-this cards --- */}
      <section className="space-y-3 rounded border p-4">
        <h2 className="font-semibold">Who is this? ({questions.length})</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {questions.map((q) => (
            <ClusterCard key={q.clusterId} q={q} busy={busy} onLabel={label} />
          ))}
        </div>
      </section>

      {/* --- recognize tester --- */}
      <section className="space-y-2 rounded border p-4">
        <h2 className="font-semibold">Recognize</h2>
        {seeded?.probes.map((p, i) => (
          <button
            key={i}
            data-testid={`recognize-probe-${i}`}
            disabled={busy}
            className="mr-2 rounded border px-2 py-1"
            onClick={() => recognizeProbe(p.embedding)}
          >
            probe: {p.note}
          </button>
        ))}
        {recognizeRes && (
          <pre data-testid="recognize-result" className="overflow-auto rounded bg-gray-50 p-2 text-xs">
            {recognizeRes.match
              ? `MATCH ${recognizeRes.match.name} (d=${recognizeRes.match.distance.toFixed(3)}, conf=${recognizeRes.match.confidence.toFixed(2)})`
              : "no match (unknown)"}
          </pre>
        )}
      </section>

      {/* --- real upload (eyeball only; not exercised by CI) --- */}
      <section className="space-y-2 rounded border p-4">
        <h2 className="font-semibold">Real upload (eyeball)</h2>
        <input
          data-testid="upload-input"
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
        />
        <p className="text-xs text-gray-500">
          Browser-side detect/crop/embed via face-api, then POST to ingest. Requires the optional dependency + model weights.
        </p>
      </section>
    </main>
  );
}

function Knob({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function ClusterCard({
  q,
  busy,
  onLabel,
}: {
  q: ClusterQuestion;
  busy: boolean;
  onLabel: (id: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <div data-testid={`cluster-card-${q.clusterId}`} className="space-y-2 rounded border p-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-gray-400">{q.clusterId.slice(0, 8)}</span>
        <span data-testid="cluster-size" className="rounded bg-gray-200 px-2 text-xs">
          {q.size}
        </span>
      </div>
      {q.representativeThumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.representativeThumbUrl} alt="" className="h-20 w-20 rounded object-cover" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
          synthetic
        </div>
      )}
      <div className="flex gap-1">
        <input
          data-testid="label-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="name"
          className="w-full border px-1"
        />
        <button
          data-testid="label-submit"
          disabled={busy || !name.trim()}
          className="rounded border px-2"
          onClick={() => onLabel(q.clusterId, name.trim())}
        >
          label
        </button>
      </div>
    </div>
  );
}
