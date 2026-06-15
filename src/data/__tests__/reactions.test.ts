import { isReactionEmoji, nextReactionEmoji } from "@/data/db/reactions";
import { REACTION_EMOJI } from "@/data/db/schema";

describe("isReactionEmoji", () => {
  test("accepts every emoji in the palette", () => {
    for (const e of REACTION_EMOJI) expect(isReactionEmoji(e)).toBe(true);
  });
  test("rejects anything outside the palette", () => {
    expect(isReactionEmoji("🦄")).toBe(false);
    expect(isReactionEmoji("")).toBe(false);
    expect(isReactionEmoji("not-an-emoji")).toBe(false);
  });
});

describe("nextReactionEmoji", () => {
  test("adds a reaction when the person has none", () => {
    expect(nextReactionEmoji(null, "❤️")).toBe("❤️");
  });
  test("toggles off when clicking the emoji you already have", () => {
    expect(nextReactionEmoji("❤️", "❤️")).toBeNull();
  });
  test("replaces when clicking a different emoji", () => {
    expect(nextReactionEmoji("❤️", "😂")).toBe("😂");
  });
});
