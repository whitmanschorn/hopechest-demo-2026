"use client";

import { useCallback, useRef, useState } from "react";

import { Img } from "./Img";

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  alt,
  width,
  height,
}: {
  beforeSrc: string;
  afterSrc: string;
  alt: string;
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);

  const update = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(98, Math.max(2, pct)));
  }, []);

  return (
    <div
      ref={ref}
      className="relative select-none overflow-hidden rounded-xl ring-1 ring-hairline"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current) update(e.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
    >
      <Img
        src={beforeSrc}
        alt={`${alt} — before restoration`}
        width={width}
        height={height}
        loading="eager"
        className="block w-full"
        draggable={false}
      />
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <Img
          src={afterSrc}
          alt={`${alt} — after restoration`}
          width={width}
          height={height}
          loading="eager"
          className="block w-full"
          draggable={false}
        />
      </div>
      {/* divider + handle */}
      <div
        className="absolute inset-y-0 w-0.5 bg-cream shadow-[0_0_8px_rgba(0,0,0,.5)]"
        style={{ left: `${pos}%` }}
      >
        <span className="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-cream text-walnut shadow-lg">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />
          </svg>
        </span>
      </div>
      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-walnut/75 px-2.5 py-1 text-xs text-cream backdrop-blur">
        Restored
      </span>
      <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-walnut/75 px-2.5 py-1 text-xs text-cream backdrop-blur">
        Original print
      </span>
    </div>
  );
}
