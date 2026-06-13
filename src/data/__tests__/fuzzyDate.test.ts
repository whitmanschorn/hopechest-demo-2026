import { parseFuzzyDate } from "@/data/db/fuzzyDate";

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
