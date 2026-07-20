import { isValidEmail, normalizeEmail } from "@/data/db/mailingList";

describe("normalizeEmail", () => {
  test("trims surrounding whitespace and lowercases", () => {
    expect(normalizeEmail("  Me@Example.COM ")).toBe("me@example.com");
  });
  test("leaves an already-clean address unchanged", () => {
    expect(normalizeEmail("cousin@example.com")).toBe("cousin@example.com");
  });
});

describe("isValidEmail", () => {
  test("accepts ordinary addresses (case/space-insensitive)", () => {
    expect(isValidEmail("cousin@example.com")).toBe(true);
    expect(isValidEmail("  First.Last+tag@sub.example.co ")).toBe(true);
  });
  test("rejects obvious non-emails", () => {
    for (const bad of ["", "   ", "nope", "no-at-sign.com", "no@domain", "two@@example.com", "spaces in@example.com"]) {
      expect(isValidEmail(bad)).toBe(false);
    }
  });
});
