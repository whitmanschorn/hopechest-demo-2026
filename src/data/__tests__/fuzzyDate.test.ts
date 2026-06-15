import { fuzzyDateToColumns, parseFuzzyDate } from "@/data/db/fuzzyDate";
import type { FuzzyDate } from "@/data/db/schema";

/** Rebuild a FuzzyDate from flattened columns — mirrors load.ts `toFuzzyDate`. */
function columnsToFuzzyDate(c: ReturnType<typeof fuzzyDateToColumns>): FuzzyDate {
  return {
    ...(c.dateIso != null ? { iso: c.dateIso } : {}),
    ...(c.dateYear != null ? { year: c.dateYear } : {}),
    ...(c.dateMonth != null ? { month: c.dateMonth } : {}),
    ...(c.dateDay != null ? { day: c.dateDay } : {}),
    precision: c.datePrecision as FuzzyDate["precision"],
    display: c.dateDisplay,
    ...(c.dateDeduced ? { deduced: true } : {}),
    ...(c.dateClue != null ? { clue: c.dateClue } : {}),
  };
}

describe("fuzzyDateToColumns", () => {
  test("round-trips a day-precision date through the flattened columns", () => {
    const date = parseFuzzyDate("1950-06-10");
    expect(columnsToFuzzyDate(fuzzyDateToColumns(date))).toEqual(date);
  });
  test("round-trips a circa date (deduced flag preserved)", () => {
    const date = parseFuzzyDate("circa 1950");
    expect(columnsToFuzzyDate(fuzzyDateToColumns(date))).toEqual(date);
  });
  test("absent fields become null columns", () => {
    expect(fuzzyDateToColumns(parseFuzzyDate("1950"))).toMatchObject({
      dateIso: null,
      dateMonth: null,
      dateDay: null,
      dateYear: 1950,
      datePrecision: "year",
    });
  });
});

describe("parseFuzzyDate", () => {
  test("full ISO date → day precision", () => {
    expect(parseFuzzyDate("1950-06-10")).toMatchObject({
      iso: "1950-06-10",
      year: 1950,
      month: 6,
      day: 10,
      precision: "day",
      display: "June 10, 1950",
    });
  });

  test("zero-pads a single-digit month/day in the iso", () => {
    expect(parseFuzzyDate("1950-6-9")).toMatchObject({
      iso: "1950-06-09",
      precision: "day",
      display: "June 9, 1950",
    });
  });

  test("year-month → month precision", () => {
    expect(parseFuzzyDate("1920-04")).toMatchObject({
      year: 1920,
      month: 4,
      precision: "month",
      display: "April 1920",
    });
  });

  test("year only → year precision", () => {
    expect(parseFuzzyDate("1898")).toMatchObject({
      year: 1898,
      precision: "year",
      display: "1898",
    });
  });

  test.each(["circa 1921", "c. 1921", "ca 1921", "~1921", "abt 1921"])(
    "%s → circa precision",
    (input) => {
      expect(parseFuzzyDate(input)).toMatchObject({
        year: 1921,
        precision: "circa",
        display: "circa 1921",
      });
    },
  );

  test("free text keeps the caption and extracts an embedded year", () => {
    expect(parseFuzzyDate("Summer 1933")).toMatchObject({
      year: 1933,
      precision: "circa",
      display: "Summer 1933",
    });
  });

  test("free text with no year still yields a display", () => {
    const result = parseFuzzyDate("sometime later");
    expect(result.precision).toBe("circa");
    expect(result.display).toBe("sometime later");
    expect(result.year).toBeUndefined();
  });

  test("invalid month falls through to free-text handling", () => {
    expect(parseFuzzyDate("1950-13")).toMatchObject({ precision: "circa", year: 1950 });
  });
});
