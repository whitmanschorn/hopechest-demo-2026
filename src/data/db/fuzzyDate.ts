/**
 * Turn a single free-text date field (what the "add life event" form collects)
 * into the app's {@link FuzzyDate} contract. Pure and side-effect free so it can
 * be unit-tested and shared by server actions and the client form preview.
 *
 * Accepted shapes (most precise first):
 *   "1950-06-10"  -> day      "June 10, 1950"
 *   "1950-06"     -> month    "June 1950"
 *   "1950"        -> year     "1950"
 *   "circa 1950" / "c. 1950" / "~1950" / "abt 1950" -> circa "circa 1950"
 *   anything else -> circa, display = the raw text, year extracted if present
 */
import type { FuzzyDate } from "./schema";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthName(month: number): string {
  return MONTHS[month - 1] ?? "";
}

export function parseFuzzyDate(input: string): FuzzyDate {
  const raw = input.trim();

  const day = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
  if (day) {
    const year = Number(day[1]);
    const month = Number(day[2]);
    const dayOfMonth = Number(day[3]);
    if (month >= 1 && month <= 12 && dayOfMonth >= 1 && dayOfMonth <= 31) {
      const iso = `${day[1]}-${day[2].padStart(2, "0")}-${day[3].padStart(2, "0")}`;
      return {
        iso,
        year,
        month,
        day: dayOfMonth,
        precision: "day",
        display: `${monthName(month)} ${dayOfMonth}, ${year}`,
      };
    }
  }

  const month = /^(\d{4})-(\d{1,2})$/.exec(raw);
  if (month) {
    const year = Number(month[1]);
    const m = Number(month[2]);
    if (m >= 1 && m <= 12) {
      return { year, month: m, precision: "month", display: `${monthName(m)} ${year}` };
    }
  }

  const yearOnly = /^(\d{4})$/.exec(raw);
  if (yearOnly) {
    const year = Number(yearOnly[1]);
    return { year, precision: "year", display: String(year) };
  }

  const circa = /^(?:circa|c\.?|ca\.?|abt\.?|about|~)\s*(\d{4})$/i.exec(raw);
  if (circa) {
    const year = Number(circa[1]);
    return { year, precision: "circa", display: `circa ${year}`, deduced: true };
  }

  // Fallback: keep the caption verbatim, pull a 4-digit year out if one exists.
  const embeddedYear = /\b(\d{4})\b/.exec(raw);
  return {
    ...(embeddedYear ? { year: Number(embeddedYear[1]) } : {}),
    precision: "circa",
    display: raw,
    deduced: true,
  };
}

/** Flatten a FuzzyDate into the Photo/LifeEvent `date*` columns — the inverse of
 * `toFuzzyDate` in load.ts. Pure, so it can be unit-tested for round-tripping. */
export function fuzzyDateToColumns(date: FuzzyDate): {
  dateIso: string | null;
  dateYear: number | null;
  dateMonth: number | null;
  dateDay: number | null;
  datePrecision: string;
  dateDisplay: string;
  dateDeduced: boolean;
  dateClue: string | null;
} {
  return {
    dateIso: date.iso ?? null,
    dateYear: date.year ?? null,
    dateMonth: date.month ?? null,
    dateDay: date.day ?? null,
    datePrecision: date.precision,
    dateDisplay: date.display,
    dateDeduced: date.deduced ?? false,
    dateClue: date.clue ?? null,
  };
}

/** Format a fuzzy date for display (the row already carries a `display` string).
 * Lives here (prisma-free) so client components can import it without pulling
 * the server data layer into the browser bundle. */
export function formatDate(date: { display: string }): string {
  return date.display;
}
