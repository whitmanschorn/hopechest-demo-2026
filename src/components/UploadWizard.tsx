"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PhotoTagger, type DraftTag } from "./PhotoTagger";
import { CameraIcon, UploadIcon } from "./icons";
import { uploadPhoto } from "@/app/(app)/upload/actions";
import { createPerson } from "@/app/(app)/people/actions";
import { isHeic } from "@/lib/storage/image";
import type { Person } from "@/data/db/schema";

interface Picked {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

const inputClass =
  "h-11 w-full rounded-lg border border-hairline bg-parchment px-3.5 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-sepia focus:outline-none focus:ring-2 focus:ring-sepia/20";

/** Real photo upload: pick an image, add a title/date/place, and it's saved to
 * the chest. The image bytes are read client-side to capture dimensions and a
 * preview; the file + fields POST to the `uploadPhoto` server action. */
export function UploadWizard({
  locations,
  people,
}: {
  locations: { id: string; label: string }[];
  people: Person[];
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [title, setTitle] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [locationId, setLocationId] = useState("");
  const [tags, setTags] = useState<DraftTag[]>([]);
  const [roster, setRoster] = useState<Person[]>(people);
  const [errors, setErrors] = useState<string[]>([]);
  const [converting, setConverting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function createAndAppend(input: { name: string; gender: string; relation?: string }): Promise<Person | null> {
    const result = await createPerson(input);
    if (!result.ok || !result.person) return null;
    setRoster((prev) => [...prev, result.person!]);
    return result.person;
  }

  async function onPick(file: File) {
    setErrors([]);
    // iPhones save photos as HEIC, which most browsers can't display. Convert
    // to JPEG on-device (lazy-loading the codec) before previewing/uploading.
    let source = file;
    if (isHeic(file)) {
      setConverting(true);
      try {
        const heic2any = (await import("heic2any")).default;
        const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
        const blob = Array.isArray(out) ? out[0] : out;
        source = new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
      } catch {
        setConverting(false);
        setErrors(["That HEIC photo couldn't be converted — try another, or a JPEG."]);
        return;
      }
      setConverting(false);
    }
    const previewUrl = URL.createObjectURL(source);
    const probe = new Image();
    probe.onload = () => {
      setPicked({ file: source, previewUrl, width: probe.naturalWidth, height: probe.naturalHeight });
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    };
    probe.src = previewUrl;
  }

  function submit() {
    if (!picked) return;
    const data = new FormData();
    data.set("file", picked.file);
    data.set("title", title);
    data.set("dateInput", dateInput);
    data.set("locationId", locationId);
    data.set("width", String(picked.width));
    data.set("height", String(picked.height));
    data.set("tags", JSON.stringify(tags));
    startTransition(async () => {
      const result = await uploadPhoto(data);
      if (result.ok && result.photoId) {
        router.push(`/photos/${result.photoId}`);
      } else {
        setErrors(result.errors ?? ["Something went wrong — try again."]);
      }
    });
  }

  if (!picked) {
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            data-testid="upload-camera"
            onClick={() => cameraInputRef.current?.click()}
            disabled={converting}
            className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-sepia/35 bg-cream px-6 py-12 text-center transition-colors hover:border-sepia hover:bg-sepia/5 disabled:opacity-50"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-sepia/10 text-sepia transition-transform group-hover:-translate-y-0.5">
              <CameraIcon className="size-7" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-walnut">Take a photo</span>
            <span className="text-sm leading-6 text-ink-soft">Snap one now with your camera.</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={converting}
            className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-sepia/35 bg-cream px-6 py-12 text-center transition-colors hover:border-sepia hover:bg-sepia/5 disabled:opacity-50"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-sepia/10 text-sepia transition-transform group-hover:-translate-y-0.5">
              <UploadIcon className="size-7" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-walnut">Choose a photo</span>
            <span className="text-sm leading-6 text-ink-soft">A scan, a print, or one from your library.</span>
          </button>
        </div>
        <p className="mt-3 text-center text-sm text-ink-soft">
          {converting ? "Converting your photo…" : "JPEG, PNG, WebP, HEIC, or GIF, up to 8MB."}
        </p>
        <input
          ref={cameraInputRef}
          data-testid="upload-camera-input"
          type="file"
          accept="image/*,.heic,.heif"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
          }}
        />
        <input
          ref={fileInputRef}
          data-testid="upload-input"
          type="file"
          accept="image/*,.heic,.heif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
          }}
        />
        {errors.length > 0 ? <ErrorList errors={errors} /> : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-cream p-6 ring-1 ring-hairline">
      <PhotoTagger
        src={picked.previewUrl}
        width={picked.width}
        height={picked.height}
        people={roster}
        tags={tags}
        onAdd={(personId, box) => setTags((prev) => [...prev, { personId, box }])}
        onRemove={(personId) => setTags((prev) => prev.filter((t) => t.personId !== personId))}
        onCreatePerson={createAndAppend}
      />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Title</span>
        <input
          data-testid="upload-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Grandpa at the lake"
          className={inputClass}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Date <span className="font-normal text-ink-soft">(optional)</span>
          </span>
          <input
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            placeholder="1950, 1950-06, circa 1950…"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Place <span className="font-normal text-ink-soft">(optional)</span>
          </span>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {errors.length > 0 ? <ErrorList errors={errors} /> : null}
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="upload-submit"
          onClick={submit}
          disabled={isPending}
          className="inline-flex h-11 items-center rounded-full bg-sepia px-6 text-sm font-medium text-cream transition-colors hover:bg-walnut disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add to the chest"}
        </button>
        <button
          type="button"
          onClick={() => {
            URL.revokeObjectURL(picked.previewUrl);
            setPicked(null);
            setErrors([]);
          }}
          disabled={isPending}
          className="inline-flex h-11 items-center rounded-full px-4 text-sm text-ink-soft transition-colors hover:text-sepia disabled:opacity-50"
        >
          Choose another
        </button>
      </div>
    </div>
  );
}

function ErrorList({ errors }: { errors: string[] }) {
  return (
    <ul className="space-y-1 rounded-lg bg-rosewood/10 px-3.5 py-2.5 text-sm text-rosewood ring-1 ring-rosewood/25">
      {errors.map((err) => (
        <li key={err}>{err}</li>
      ))}
    </ul>
  );
}
