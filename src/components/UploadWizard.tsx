"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Img } from "./Img";
import { UploadIcon } from "./icons";
import { uploadPhoto } from "@/app/(app)/upload/actions";

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
export function UploadWizard({ locations }: { locations: { id: string; label: string }[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [title, setTitle] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [locationId, setLocationId] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onPick(file: File) {
    const previewUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setPicked({ file, previewUrl, width: img.naturalWidth, height: img.naturalHeight });
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    };
    img.src = previewUrl;
    setErrors([]);
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
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-sepia/35 bg-cream px-6 py-16 text-center transition-colors hover:border-sepia hover:bg-sepia/5"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-sepia/10 text-sepia transition-transform group-hover:-translate-y-0.5">
            <UploadIcon className="size-7" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-walnut">Choose a photo</span>
          <span className="max-w-sm text-sm leading-6 text-ink-soft">
            A scan, a print, or a phone picture — JPEG, PNG, WebP, or GIF, up to 8MB.
          </span>
        </button>
        <input
          ref={fileInputRef}
          data-testid="upload-input"
          type="file"
          accept="image/*"
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
      <Img
        src={picked.previewUrl}
        alt="Selected photo preview"
        width={picked.width}
        height={picked.height}
        className="mx-auto max-h-72 w-auto rounded-lg ring-1 ring-hairline"
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
