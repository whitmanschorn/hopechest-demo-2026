import type { ScriptedExchange } from "./types";

export const exchanges: ScriptedExchange[] = [
  {
    id: "hero-klara-sarah",
    prompt:
      "Is there a photo of Great Grandmother K. with Grandma S. as a toddler? Eleanor or Susan might have one.",
    keywords: [
      "great",
      "grandmother",
      "klara",
      "toddler",
      "grandma",
      "sarah",
      "only",
      "photo",
      "eleanor",
      "susan",
      "baby",
    ],
    thinkingLabel: "Searching 412 photos and 38 documents…",
    answer: [
      {
        kind: "text",
        text: "Yes — there's exactly one. It was taken around 1933 at the Kowalski farm: Klara holding Sarah, who would have been about two.",
      },
      {
        kind: "photo",
        photoId: "klara-and-sarah-1933",
        caption:
          "Klara & Sarah, c. 1933 — 1 original print · 2 family copies",
      },
      {
        kind: "text",
        text: "You've actually seen this photo twice before without knowing it: Susan photographed it in Grandma's album in 2022, and Eleanor snapped it at Thanksgiving in 2024. Hopechest recognized both as copies of the same print, which Eleanor has since scanned. A note in Sarah's baby book confirms it's the only picture of the two of them together.",
      },
      { kind: "source", documentId: "sarahs-baby-book" },
      {
        kind: "people",
        personIds: ["great-grandmother-klara", "grandma-sarah"],
      },
    ],
  },
  {
    id: "klara-immigration",
    prompt: "How did Klara come to America?",
    keywords: ["klara", "america", "immigrate", "immigration", "came", "arrive", "ship"],
    thinkingLabel: "Reading immigration records and letters…",
    answer: [
      {
        kind: "text",
        text: "Klara arrived at the Port of Baltimore in June 1912, aged 14, aboard the SS Rhein — listed as Kowalska, Klara, bound for Green Bay, Wisconsin, where her uncle had settled. Thirteen years later she sat for this studio portrait in Green Bay.",
      },
      {
        kind: "photo",
        photoId: "klara-portrait-1925",
        caption: "Klara, studio portrait, c. 1925",
      },
      { kind: "source", documentId: "immigration-record-1912" },
      { kind: "people", personIds: ["great-grandmother-klara"] },
    ],
  },
  {
    id: "lake-summers",
    prompt: "Show me summers at the lake house.",
    keywords: ["lake", "summer", "house", "swim", "fishing", "kangaroo"],
    thinkingLabel: "Gathering photos from Kangaroo Lake…",
    answer: [
      {
        kind: "text",
        text: "The Whitfields spent every summer from 1958 onward at the lake house on Kangaroo Lake. Here are the highlights — including Tom's record walleye.",
      },
      {
        kind: "photo",
        photoId: "lake-house-summer-1958",
        caption: "The lake house, 1958",
      },
      {
        kind: "photo",
        photoId: "lake-swimmers-1960",
        caption: "Swimmers off the dock, 1960",
      },
      {
        kind: "photo",
        photoId: "tom-fishing-1972",
        caption: "Tom's record walleye, 1972",
      },
    ],
  },
];

export const fallbackExchange: ScriptedExchange = {
  id: "fallback",
  prompt: "",
  keywords: [],
  thinkingLabel: "Searching the archive…",
  answer: [
    {
      kind: "text",
      text: "I couldn't find an exact match for that, but here are a few treasures from the chest you might be thinking of:",
    },
    {
      kind: "photo",
      photoId: "wedding-day-1950",
      caption: "Sarah & Tom's wedding day, June 1950",
    },
    {
      kind: "photo",
      photoId: "family-reunion-1968",
      caption: "The big reunion, 1968",
    },
    {
      kind: "text",
      text: "Try asking about a person, a place, or a year — for example, “How did Klara come to America?”",
    },
  ],
};
