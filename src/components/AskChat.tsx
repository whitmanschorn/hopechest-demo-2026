"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Badge } from "./Badge";
import { Img } from "./Img";
import { InitialsAvatar } from "./InitialsAvatar";
import { MentionLink } from "./MentionLink";
import { AskIcon, DocumentIcon, SendIcon, SparkleIcon } from "./icons";
import {
  currentMemberId,
  exchanges,
  fallbackExchange,
  getDocument,
  getPerson,
  getPhoto,
  people,
  suggestMentions,
  type AnswerBlock,
  type MentionSuggestion,
  type ScriptedExchange,
} from "@/data";

const THINK_MS = 1400;

interface Mention {
  text: string; // "@Sarah Whitfield" as it appears in the question
  personId: string;
}

interface Turn {
  id: number;
  question: string;
  mentions: Mention[];
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

/** Render the question text, swapping resolved mentions for smart links. */
function QuestionText({
  text,
  mentions,
}: {
  text: string;
  mentions: Mention[];
}) {
  if (mentions.length === 0) return <>{text}</>;
  const parts: ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest.length > 0) {
    let idx = -1;
    let hit: Mention | null = null;
    for (const m of mentions) {
      const i = rest.indexOf(m.text);
      if (i !== -1 && (idx === -1 || i < idx)) {
        idx = i;
        hit = m;
      }
    }
    if (!hit || idx === -1) {
      parts.push(rest);
      break;
    }
    if (idx > 0) parts.push(rest.slice(0, idx));
    parts.push(<MentionLink key={key++} person={getPerson(hit.personId)} />);
    rest = rest.slice(idx + hit.text.length);
  }
  return <>{parts}</>;
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

const MENTION_RE = /@([a-zA-Z-]*)$/;

export function AskChat() {
  const me = getPerson(currentMemberId);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [draftMentions, setDraftMentions] = useState<Mention[]>([]);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mentionMatch = MENTION_RE.exec(draft);
  const suggestions: MentionSuggestion[] = mentionMatch
    ? mentionMatch[1].length > 0
      ? suggestMentions(mentionMatch[1], currentMemberId)
      : people
          .filter((p) => p.id !== currentMemberId)
          .slice(0, 4)
          .map((p) => ({ person: p, why: p.relation, viaKinship: false }))
    : [];

  useEffect(() => {
    if (turns.length > 0) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [turns]);

  function pickMention(s: MentionSuggestion) {
    const text = `@${s.person.name}`;
    setDraft((d) => d.replace(MENTION_RE, `${text} `));
    setDraftMentions((m) =>
      m.some((x) => x.personId === s.person.id)
        ? m
        : [...m, { text, personId: s.person.id }],
    );
    inputRef.current?.focus();
  }

  function ask(question: string, exchange?: ScriptedExchange, mentions: Mention[] = []) {
    const id = nextId.current++;
    const resolved = exchange ?? matchExchange(question);
    setTurns((t) => [
      ...t,
      { id, question, mentions, exchange: resolved, state: "thinking" },
    ]);
    setDraft("");
    setDraftMentions([]);
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
                  <QuestionText
                    text={turn.question}
                    mentions={turn.mentions}
                  />
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

      {/* input + mention suggestions */}
      <div className="relative">
        {suggestions.length > 0 ? (
          <div className="absolute bottom-full left-0 z-30 mb-2 w-full max-w-md overflow-hidden rounded-xl bg-cream shadow-xl shadow-walnut/20 ring-1 ring-hairline">
            {suggestions[0].viaKinship ? (
              <p className="flex items-center gap-1.5 border-b border-hairline bg-brass/10 px-3.5 py-2 text-xs text-ink">
                <SparkleIcon className="size-3.5 shrink-0 text-brass" />
                &ldquo;@{mentionMatch?.[1]}&rdquo; is a relationship — here&rsquo;s
                who that is on your family tree:
              </p>
            ) : null}
            {suggestions.map((s) => (
              <button
                key={s.person.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickMention(s);
                }}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-sepia/5"
              >
                <InitialsAvatar person={s.person} size="md" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {s.person.name}
                  </span>
                  <span className="block truncate text-xs text-ink-soft">
                    {s.why}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim() && !mentionMatch) {
              ask(
                draft.trim(),
                undefined,
                draftMentions.filter((m) => draft.includes(m.text)),
              );
            }
          }}
        >
          <input
            ref={inputRef}
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
        <p className="mt-2 text-xs text-ink-soft">
          Tip: type <span className="font-medium text-sepia">@</span> and a
          relationship — try{" "}
          <span className="font-medium text-sepia">@grandma</span> — and
          Hopechest works out who you mean from the family tree.
        </p>
      </div>
    </div>
  );
}
