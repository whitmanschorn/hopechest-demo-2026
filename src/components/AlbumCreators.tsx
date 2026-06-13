"use client";

import { useMemo, useState } from "react";

import { Img } from "./Img";
import { SparkleIcon, UploadIcon } from "./icons";

/** A thing the chest can build a smart album around (person / place / decade). */
export interface SmartFacet {
  id: string;
  kind: "person" | "location" | "decade";
  /** The rule the album would carry, e.g. "Everyone tagged: Sarah Whitfield". */
  rule: string;
  /** Lowercased words that should match this facet from a free-text description. */
  terms: string[];
  count: number;
  sampleSrcs: string[];
}

const EXAMPLES = [
  "Every photo of Sarah",
  "Photos at the lake",
  "Anything from the 1960s",
  "The Kowalski farm",
];

function interpret(description: string, facets: SmartFacet[]): SmartFacet | null {
  const words = description.toLowerCase().split(/\W+/).filter(Boolean);
  if (words.length === 0) return null;
  let best: SmartFacet | null = null;
  let bestScore = 0;
  for (const f of facets) {
    const score = f.terms.filter((t) => words.some((w) => w === t || w.startsWith(t) || t.startsWith(w))).length;
    if (score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

type Mode = "idle" | "standard" | "smart";
type SmartStep = "describe" | "preview" | "done";

export function AlbumCreators({ facets }: { facets: SmartFacet[] }) {
  const [mode, setMode] = useState<Mode>("idle");

  if (mode === "idle") {
    return (
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setMode("standard")}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sepia px-5 py-3 text-sm font-medium text-cream transition-colors hover:bg-walnut"
        >
          <UploadIcon className="size-4.5" />
          Create album
        </button>
        <button
          type="button"
          onClick={() => setMode("smart")}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cream px-5 py-3 text-sm font-medium text-sepia ring-1 ring-brass/40 transition-colors hover:ring-brass"
        >
          <SparkleIcon className="size-4.5 text-brass" />
          Create smart album
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl bg-cream p-5 ring-1 ring-hairline">
      {mode === "standard" ? (
        <StandardForm onClose={() => setMode("idle")} />
      ) : (
        <SmartWizard facets={facets} onClose={() => setMode("idle")} />
      )}
    </div>
  );
}

function StandardForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <Done
        heading={`“${title || "New album"}” created`}
        body="Empty for now — add photos from any photo's page, or drag a batch in. (Demo: nothing is saved.)"
        onClose={onClose}
      />
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
    >
      <Header title="New album" onClose={onClose} />
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Album title</span>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Grandpa's workshop"
          className="h-11 w-full rounded-lg border border-hairline bg-parchment px-3.5 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-sepia focus:outline-none focus:ring-2 focus:ring-sepia/20"
        />
      </label>
      <div className="mt-5 flex gap-2">
        <button type="submit" className={primaryBtn}>Create album</button>
        <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
      </div>
    </form>
  );
}

function SmartWizard({ facets, onClose }: { facets: SmartFacet[]; onClose: () => void }) {
  const [step, setStep] = useState<SmartStep>("describe");
  const [description, setDescription] = useState("");
  const match = useMemo(() => interpret(description, facets), [description, facets]);

  if (step === "done") {
    return (
      <Done
        heading="Smart album created"
        body={`“${match?.rule ?? description}” — Hopechest will keep it up to date as new photos arrive. (Demo: nothing is saved.)`}
        onClose={onClose}
      />
    );
  }

  if (step === "preview") {
    return (
      <div>
        <Header title="Smart album — preview" onClose={onClose} />
        {match ? (
          <>
            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-brass/10 px-4 py-3 ring-1 ring-brass/25">
              <SparkleIcon className="size-5 shrink-0 text-brass" />
              <p className="text-sm text-ink">
                Interpreted as <span className="font-medium">{match.rule}</span> —{" "}
                {match.count} photo{match.count === 1 ? "" : "s"} match right now.
              </p>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {match.sampleSrcs.map((src) => (
                <Img key={src} src={src} alt="" width={96} height={72} className="h-16 w-24 shrink-0 rounded-md object-cover ring-1 ring-hairline" />
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-xl bg-parchment px-4 py-3 text-sm text-ink-soft ring-1 ring-hairline">
            Hopechest couldn&rsquo;t pin that down to people, a place, or a decade yet — try naming someone, somewhere, or a decade.
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" disabled={!match} onClick={() => setStep("done")} className={`${primaryBtn} disabled:opacity-50`}>
            Create this album
          </button>
          <button type="button" onClick={() => setStep("describe")} className={ghostBtn}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Describe your smart album" onClose={onClose} />
      <p className="mt-1 text-sm text-ink-soft">
        Tell Hopechest what belongs in it — a person, a place, a time — and it builds the rule.
      </p>
      <input
        autoFocus
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g. Every photo of Sarah at the lake"
        className="mt-4 h-11 w-full rounded-lg border border-hairline bg-parchment px-3.5 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-sepia focus:outline-none focus:ring-2 focus:ring-sepia/20"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setDescription(ex)}
            className="rounded-full border border-sepia/30 bg-parchment px-3 py-1.5 text-xs text-ink transition-colors hover:border-sepia hover:bg-sepia/5"
          >
            {ex}
          </button>
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        <button type="button" disabled={!description.trim()} onClick={() => setStep("preview")} className={`${primaryBtn} disabled:opacity-50`}>
          Interpret
        </button>
        <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
      </div>
    </div>
  );
}

const primaryBtn = "inline-flex h-11 items-center justify-center rounded-full bg-sepia px-6 text-sm font-medium text-cream transition-colors hover:bg-walnut";
const ghostBtn = "inline-flex h-11 items-center justify-center rounded-full border border-sepia/40 px-5 text-sm font-medium text-sepia transition-colors hover:bg-sepia/10";

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="font-display text-xl font-semibold tracking-tight text-walnut">{title}</h3>
      <button type="button" onClick={onClose} className="text-sm text-ink-soft hover:text-sepia">
        ✕
      </button>
    </div>
  );
}

function Done({ heading, body, onClose }: { heading: string; body: string; onClose: () => void }) {
  return (
    <div className="text-center">
      <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brass/15 text-brass">
        <SparkleIcon className="size-6" />
      </span>
      <h3 className="font-display text-xl font-semibold tracking-tight text-walnut">{heading}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-ink-soft">{body}</p>
      <button type="button" onClick={onClose} className={`${primaryBtn} mt-4`}>Done</button>
    </div>
  );
}
