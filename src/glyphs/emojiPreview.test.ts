import { describe, expect, it } from "vitest";
import { emojiPreviewFor, extractEmojiPreviews, natureEmojiPreviewFor } from "./emojiPreview";

describe("offline emoji previews", () => {
  it("does not confuse compound concepts with animals named by their final word", () => {
    expect(natureEmojiPreviewFor("computer mouse")).toBeUndefined();
    expect(natureEmojiPreviewFor("butterfly valve")).toBeUndefined();
    expect(natureEmojiPreviewFor("sea lion")).not.toBe(natureEmojiPreviewFor("lion"));
  });
  it.each([["cookies", "cookie"], ["zombies", "zombie"]])("tries an exact alternative when %s does not end in a singular y", (plural, singular) => {
    expect(emojiPreviewFor(plural)).toBeDefined();
    expect(emojiPreviewFor(plural)).toBe(emojiPreviewFor(singular));
  });
  it.each(["constructor", "constructors", "the constructor", "tiny constructor"])("never mistakes inherited object properties for art: %s", (noun) => {
    expect(emojiPreviewFor(noun)).toBeUndefined();
    expect(natureEmojiPreviewFor(noun)).toBeUndefined();
    expect(extractEmojiPreviews(`A ${noun} creates an object.`)).toEqual([]);
  });
  it("separates a validated colour from an exact noun without stripping arbitrary modifiers", () => {
    expect(emojiPreviewFor("purple satellite", "purple")).toBe(emojiPreviewFor("satellite"));
    expect(emojiPreviewFor("purple satellite", "purple")).toBeDefined();
    expect(emojiPreviewFor("green hammers", "green")).toBe(emojiPreviewFor("hammer"));
    expect(emojiPreviewFor("purple satellite")).toBeUndefined();
    expect(emojiPreviewFor("purple satellite", "blue")).toBeUndefined();
    expect(emojiPreviewFor("purple satellite factory", "purple")).toBeUndefined();
    expect(emojiPreviewFor("yellow submarine", "yellow")).toBeUndefined();
  });
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
