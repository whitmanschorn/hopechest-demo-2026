import type { NewsletterIssue } from "./types";

export const currentIssue: NewsletterIssue = {
  id: "june-2026",
  title: "The Kowalski–Whitfield Chronicle",
  month: "June 2026",
  intro:
    "A big month for the chest: the photo we never thought we'd see clearly again, a fishing-day print resurfaces, and Sarah's timeline grows to three decades.",
  photoIds: [
    "klara-and-sarah-1933",
    "tom-fishing-1972",
    "wedding-day-1950",
  ],
  highlights: [
    {
      heading: "The photo, restored",
      body: "Klara and toddler Sarah, c. 1933 — the only photograph of them together. Eleanor scanned the original print from Sarah's baby book, and Hopechest linked Susan's and Eleanor's phone snapshots to it as copies. The restored version recovers both faces beautifully.",
      photoId: "klara-and-sarah-1933",
    },
    {
      heading: "From the tackle box",
      body: "David found a 1972 print of the family loading up the fishing poles, tucked inside the old tackle box. It joined Summers at the Lake.",
      photoId: "tom-fishing-1972",
    },
    {
      heading: "Ask the archive",
      body: "The family asked 23 questions this month. Most popular: \"How did Klara come to America?\" — answered from her 1912 immigration record.",
    },
  ],
  recipients: 6,
};

export const pastIssues = [
  { id: "may-2026", month: "May 2026", headline: "The wedding album, complete" },
  { id: "april-2026", month: "April 2026", headline: "Welcome, David!" },
];
