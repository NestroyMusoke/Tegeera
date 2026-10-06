import { describe, expect, it } from "vitest";
import { emojiPreviewFor, extractEmojiPreviews, natureEmojiPreviewFor } from "./emojiPreview";

describe("offline emoji previews", () => {
  it("retrieves exact labels and safe plurals without guessing ambiguous concepts", () => {
    expect(emojiPreviewFor("dragon")).toBe("🐉");
    expect(emojiPreviewFor("volcanoes")).toBe("🌋");
    expect(emojiPreviewFor("cell")).toBeUndefined();
    expect(emojiPreviewFor("constitutional legitimacy")).toBeUndefined();
  });

  it("uses only a uniquely tagged nature label for an unfamiliar animal name", () => {
    expect(natureEmojiPreviewFor("bee")).toBe("🐝");
    expect(natureEmojiPreviewFor("second bee")).toBe("🐝");
    expect(natureEmojiPreviewFor("tiny bees")).toBe("🐝");
    expect(emojiPreviewFor("bee")).toBe("🐝");
    expect(natureEmojiPreviewFor("dog")).toBe("🐕️");
    expect(natureEmojiPreviewFor("child")).toBeUndefined();
    expect(emojiPreviewFor("cup")).toBeUndefined();
  });

  it("extracts bounded live hints without claiming to parse the relationship", () => {
    const result = extractEmojiPreviews("A dragon flies above a volcano. Then the dragon turns.");
    expect(result.map(({ emoji }) => emoji)).toEqual(["🐉", "🌋"]);
    expect(extractEmojiPreviews("A cell divides", 2)).toEqual([]);
  });
});
