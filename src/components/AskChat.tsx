"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Badge } from "./Badge";
import { Img } from "./Img";
import { InitialsAvatar } from "./InitialsAvatar";
import { AskIcon, DocumentIcon, SendIcon } from "./icons";
import {
  currentMemberId,
  exchanges,
  fallbackExchange,
  getDocument,
  getPerson,
  getPhoto,
  type AnswerBlock,
  type ScriptedExchange,
} from "@/data";

const THINK_MS = 1400;

interface Turn {
  id: number;
  question: string;
  exchange: ScriptedExchange;
  state: "thinking" | "answered";
}

function matchExchange(input: string): ScriptedExchange {
  const words = input.toLowerCase().split(/\W+/).filter(Boolean);
  let best: ScriptedExchange | null = null;
  let bestScore = 0;
  for (const ex of exchanges) {
    const score = ex.keywords.filter((k) => words.includes(k)).length;
    if (score > bestScore) {
      best = ex;
      bestScore = score;
    }
  }
  return bestScore >= 2 && best ? best : fallbackExchange;
}

function AnswerBlockView({ block }: { block: AnswerBlock }) {
  switch (block.kind) {
    case "text":
      return <p className="text-[15px] leading-7 text-ink">{block.text}</p>;
    case "photo": {
      const photo = getPhoto(block.photoId);
      return (
        <Link
          href={`/photos/${photo.id}`}
          className="group block max-w-sm overflow-hidden rounded-xl bg-parchment ring-1 ring-hairline transition-shadow hover:shadow-lg hover:shadow-walnut/15"
        >
          <Img
            src={photo.src}
            alt={photo.title}
            width={photo.width}
            height={photo.height}
            className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <span className="block px-3.5 py-2.5">
            <span className="block text-sm font-medium text-ink">
              {block.caption}
            </span>
            <span className="mt-0.5 block text-xs font-medium text-sepia">
              Open photo →
            </span>
          </span>
        </Link>
      );
    }
    case "source": {
      const doc = getDocument(block.documentId);
      return (
        <Link href="/documents" className="inline-block">
          <Badge tone="sepia" className="transition-colors hover:ring-sepia/50">
            <DocumentIcon className="size-3.5" />
            Source: {doc.title}
          </Badge>
        </Link>
      );
    }
    case "people":
      return (
        <span className="flex flex-wrap gap-2">
          {block.personIds.map((id) => {
            const person = getPerson(id);
            return (
              <Link
                key={id}
                href={`/people/${id}`}
                className="inline-flex items-center gap-2 rounded-full bg-parchment py-1 pl-1 pr-3 ring-1 ring-hairline transition-colors hover:ring-sepia/40"
              >
                <InitialsAvatar person={person} size="sm" />
                <span className="text-sm font-medium">{person.shortName}</span>
              </Link>
            );
          })}
        </span>
      );
  }
}

function ThinkingDots({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2.5 text-sm text-ink-soft">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-thinking-dot rounded-full bg-sepia"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </span>
      {label}
    </span>
  );
}

export function AskChat() {
  const me = getPerson(currentMemberId);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (turns.length > 0) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [turns]);

  function ask(question: string, exchange?: ScriptedExchange) {
    const id = nextId.current++;
    const resolved = exchange ?? matchExchange(question);
    setTurns((t) => [
      ...t,
      { id, question, exchange: resolved, state: "thinking" },
    ]);
    setDraft("");
    setTimeout(() => {
      setTurns((t) =>
        t.map((turn) =>
          turn.id === id ? { ...turn, state: "answered" } : turn,
        ),
      );
    }, THINK_MS);
  }

  return (
    <div className="flex flex-col gap-6">
      {turns.length === 0 ? (
        <div className="rounded-2xl bg-cream px-6 py-10 text-center ring-1 ring-hairline">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-sepia/10">
            <AskIcon className="size-6 text-sepia" />
          </span>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-walnut">
            Ask your archive anything
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
            Hopechest reads every photo, face tag, letter, and record in the
            chest — 412 photos and 38 documents so far — and answers like
            someone who was there.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {turns.map((turn) => (
            <div key={turn.id} className="flex flex-col gap-4">
              {/* user bubble */}
              <div className="flex items-start justify-end gap-2.5">
                <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-sepia px-4 py-2.5 text-[15px] leading-6 text-cream sm:max-w-[70%]">
                  {turn.question}
                </p>
                <InitialsAvatar person={me} size="sm" className="mt-1" />
              </div>
              {/* assistant bubble */}
              <div className="flex items-start gap-2.5">
                <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-walnut text-brass">
                  <AskIcon className="size-4" />
                </span>
                <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-cream px-4 py-3.5 ring-1 ring-hairline sm:max-w-[80%]">
                  {turn.state === "thinking" ? (
                    <ThinkingDots label={turn.exchange.thinkingLabel} />
                  ) : (
                    <div className="flex animate-fade-up flex-col gap-3.5">
                      {turn.exchange.answer.map((block, i) => (
                        <AnswerBlockView key={i} block={block} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      {/* suggested prompts */}
      <div className="flex flex-wrap gap-2">
        {exchanges.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => ask(ex.prompt, ex)}
            className="rounded-full border border-sepia/30 bg-cream px-4 py-2 text-left text-sm text-ink transition-colors hover:border-sepia hover:bg-sepia/5"
          >
            {ex.prompt}
          </button>
        ))}
      </div>

      {/* input */}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) ask(draft.trim());
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about a person, a place, a year…"
          className="h-12 flex-1 rounded-full border border-hairline bg-cream px-5 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-sepia focus:outline-none focus:ring-2 focus:ring-sepia/20"
        />
        <button
          type="submit"
          aria-label="Send"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sepia text-cream transition-colors hover:bg-walnut"
        >
          <SendIcon className="size-5" />
        </button>
      </form>
    </div>
  );
}
