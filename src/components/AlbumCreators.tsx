"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Img } from "./Img";
import { SparkleIcon, UploadIcon } from "./icons";
import { createAlbum } from "@/app/(app)/albums/actions";

/** A photo the standard-album picker can choose from. */
export interface PickablePhoto {
  id: string;
  src: string;
  title: string;
}

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

export function AlbumCreators({ facets, photos }: { facets: SmartFacet[]; photos: PickablePhoto[] }) {
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
        <StandardForm photos={photos} onClose={() => setMode("idle")} />
      ) : (
        <SmartWizard facets={facets} onClose={() => setMode("idle")} />
      )}
    </div>
  );
}

function StandardForm({ photos, onClose }: { photos: PickablePhoto[]; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const result = await createAlbum(title, [...selected]);
      if (result.ok && result.albumId) {
        router.push(`/albums/${result.albumId}`);
      } else {
        setErrors(result.errors ?? ["Something went wrong — try again."]);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
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
      <p className="mt-4 mb-1.5 text-sm font-medium text-ink">
        Pick photos <span className="font-normal text-ink-soft">({selected.size} selected)</span>
      </p>
      <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto rounded-lg bg-parchment p-2 ring-1 ring-hairline sm:grid-cols-4">
        {photos.map((p) => {
          const isOn = selected.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              data-testid="album-photo"
              aria-pressed={isOn}
              onClick={() => toggle(p.id)}
              className={`relative overflow-hidden rounded-md ring-2 transition-all ${
                isOn ? "ring-sepia" : "ring-transparent hover:ring-sepia/40"
              }`}
            >
              <Img src={p.src} alt={p.title} width={120} height={90} className="aspect-[4/3] w-full object-cover" />
              {isOn ? (
                <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-sepia text-xs text-cream">✓</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {errors.length > 0 ? (
        <ul className="mt-4 space-y-1 rounded-lg bg-rosewood/10 px-3.5 py-2.5 text-sm text-rosewood ring-1 ring-rosewood/25">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-5 flex gap-2">
        <button type="submit" data-testid="album-create" disabled={isPending} className={`${primaryBtn} disabled:opacity-50`}>
          {isPending ? "Creating…" : "Create album"}
        </button>
        <button type="button" onClick={onClose} disabled={isPending} className={ghostBtn}>Cancel</button>
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
