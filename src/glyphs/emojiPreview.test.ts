import { describe, expect, it } from "vitest";
import { emojiPreviewFor, extractEmojiPreviews } from "./emojiPreview";

describe("offline emoji previews", () => {
  it("retrieves exact labels and safe plurals without guessing ambiguous concepts", () => {
    expect(emojiPreviewFor("dragon")).toBe("🐉");
    expect(emojiPreviewFor("volcanoes")).toBe("🌋");
    expect(emojiPreviewFor("cell")).toBeUndefined();
    expect(emojiPreviewFor("constitutional legitimacy")).toBeUndefined();
  });

  it("extracts bounded live hints without claiming to parse the relationship", () => {
    const result = extractEmojiPreviews("A dragon flies above a volcano. Then the dragon turns.");
    expect(result.map(({ emoji }) => emoji)).toEqual(["🐉", "🌋"]);
    expect(extractEmojiPreviews("A cell divides", 2)).toEqual([]);
  });
});
