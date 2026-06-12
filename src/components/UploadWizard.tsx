"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { Img } from "./Img";
import { CameraIcon, PeopleIcon, RestoreIcon, UploadIcon } from "./icons";
import { getPerson, getPhoto } from "@/data";

type Step = "pick" | "detecting" | "restore" | "done";

export function UploadWizard() {
  const photo = getPhoto("klara-and-sarah-1933");
  const [step, setStep] = useState<Step>("pick");

  // simulate face detection working
  useEffect(() => {
    if (step !== "detecting") return;
    const t = setTimeout(() => setStep("restore"), 1800);
    return () => clearTimeout(t);
  }, [step]);

  if (step === "pick") {
    return (
      <button
        type="button"
        onClick={() => setStep("detecting")}
        className="group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-sepia/35 bg-cream px-6 py-16 text-center transition-colors hover:border-sepia hover:bg-sepia/5"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-sepia/10 text-sepia transition-transform group-hover:-translate-y-0.5">
          <UploadIcon className="size-7" />
        </span>
        <span className="font-display text-xl font-semibold tracking-tight text-walnut">
          Drop a photo here
        </span>
        <span className="max-w-sm text-sm leading-6 text-ink-soft">
          Scans, prints, or phone pictures of prints — Hopechest figures out
          what it&rsquo;s looking at. Tap to try it with a sample photo.
        </span>
      </button>
    );
  }

  if (step === "detecting") {
    return (
      <div className="flex flex-col items-center gap-5 rounded-2xl bg-cream px-6 py-10 ring-1 ring-hairline">
        <div className="relative w-44 overflow-hidden rounded-lg">
          <Img
            src={photo.src}
            alt="Uploading sample"
            width={photo.width}
            height={photo.height}
            loading="eager"
            className="w-full"
          />
          {/* scan line */}
          <span className="absolute inset-x-0 top-0 h-10 animate-[scan_1.8s_ease-in-out_infinite] bg-gradient-to-b from-brass/0 via-brass/50 to-brass/0" />
          <style>{`@keyframes scan { 0% { transform: translateY(-2.5rem); } 100% { transform: translateY(16rem); } }`}</style>
        </div>
        <div className="flex items-center gap-2.5 text-[15px] text-ink">
          <PeopleIcon className="size-5 text-sepia" />
          Detecting faces… <span className="font-medium">found 2</span>
        </div>
        <p className="text-sm text-ink-soft">
          Checking for matching prints already in the chest…
        </p>
      </div>
    );
  }

  if (step === "restore") {
    return (
      <div className="flex flex-col gap-5 rounded-2xl bg-cream p-6 ring-1 ring-hairline">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-walnut">
            <RestoreIcon className="size-5 text-brass" />
            Hopechest can restore this print
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            Faded sepia, scratches, and vignetting detected — and{" "}
            <span className="font-medium text-ink">
              2 faces recognized: Great Grandmother K. and Grandma S.
            </span>{" "}
            Preview the restoration:
          </p>
        </div>
        <div className="mx-auto w-full max-w-sm">
          <BeforeAfterSlider
            beforeSrc={photo.src}
            afterSrc={photo.restoration!.restoredSrc}
            alt={photo.title}
            width={photo.width}
            height={photo.height}
          />
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setStep("done")}
            className="inline-flex h-11 items-center justify-center rounded-full bg-sepia px-6 text-sm font-medium text-cream transition-colors hover:bg-walnut"
          >
            Add to the chest, restored
          </button>
          <button
            type="button"
            onClick={() => setStep("done")}
            className="inline-flex h-11 items-center justify-center rounded-full border border-sepia/40 px-6 text-sm font-medium text-sepia transition-colors hover:bg-sepia/10"
          >
            Keep it as-is
          </button>
        </div>
      </div>
    );
  }

  const eleanor = getPerson("eleanor");
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-cream px-6 py-12 text-center ring-1 ring-hairline">
      <span className="flex size-14 items-center justify-center rounded-full bg-brass/15 text-brass">
        <CameraIcon className="size-7" />
      </span>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-walnut">
        Added to your chest
      </h2>
      <p className="max-w-md text-sm leading-6 text-ink-soft">
        Two faces tagged, linked to the original print {eleanor.shortName}{" "}
        scanned, and filed into two smart albums — automatically.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link
          href={`/photos/${photo.id}`}
          className="inline-flex h-11 items-center justify-center rounded-full bg-sepia px-6 text-sm font-medium text-cream transition-colors hover:bg-walnut"
        >
          See the photo
        </Link>
        <button
          type="button"
          onClick={() => setStep("pick")}
          className="inline-flex h-11 items-center justify-center rounded-full border border-sepia/40 px-6 text-sm font-medium text-sepia transition-colors hover:bg-sepia/10"
        >
          Upload another
        </button>
      </div>
    </div>
  );
}
