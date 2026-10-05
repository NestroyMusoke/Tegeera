import emojiIndex from "./emojiIndex.json";
import natureEmojiIndex from "./emojiNatureIndex.json";
import { glyphKey } from "./glyph";

const index = emojiIndex as Record<string, string>;
const natureIndex = natureEmojiIndex as Record<string, string>;

function exactOrSingular(label: string, entries: Record<string, string>): string | undefined {
  const noun = glyphKey(label).replace(/^(?:a|an|the) /, "");
  if (!noun) return undefined;
  const direct = entries[noun];
  if (direct) return direct;
  if (noun.endsWith("ies")) return entries[`${noun.slice(0, -3)}y`];
  if (noun.endsWith("es") && entries[noun.slice(0, -2)]) return entries[noun.slice(0, -2)];
  if (noun.endsWith("s") && !noun.endsWith("ss")) return entries[noun.slice(0, -1)];
  return undefined;
}

/** Only CLDR Animals & Nature labels or globally unique tags qualify. */
export function natureEmojiPreviewFor(label: string): string | undefined {
  return exactOrSingular(label, natureIndex);
}

/** Exact CLDR label retrieval only. No fuzzy keyword guessing for teaching diagrams. */
export function emojiPreviewFor(label: string): string | undefined {
  return exactOrSingular(label, index) ?? natureEmojiPreviewFor(label);
}

export function extractEmojiPreviews(text: string, limit = 4): Array<{ label: string; emoji: string }> {
  const words = glyphKey(text.slice(0, 500)).split(" ").filter(Boolean);
  const previews: Array<{ label: string; emoji: string }> = [];
  const seen = new Set<string>();
  for (let start = 0; start < words.length && previews.length < limit; start += 1) {
    for (let width = Math.min(4, words.length - start); width >= 1; width -= 1) {
      const label = words.slice(start, start + width).join(" ");
      if (label.length < 3) continue;
      if (width === 1 && !index[label] && !/^(?:a|an|the|[0-9]+)$/.test(words[start - 1] ?? "")) continue;
      const emoji = emojiPreviewFor(label);
      if (!emoji || seen.has(emoji)) continue;
      previews.push({ label, emoji });
      seen.add(emoji);
      start += width - 1;
      break;
    }
  }
  return previews;
}
