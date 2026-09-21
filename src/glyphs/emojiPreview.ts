import emojiIndex from "./emojiIndex.json";
import { glyphKey } from "./glyph";

const index = emojiIndex as Record<string, string>;

/** Exact CLDR label retrieval only. No fuzzy keyword guessing for teaching diagrams. */
export function emojiPreviewFor(label: string): string | undefined {
  const noun = glyphKey(label).replace(/^(?:a|an|the) /, "");
  if (!noun) return undefined;
  const direct = index[noun];
  if (direct) return direct;
  if (noun.endsWith("ies")) return index[`${noun.slice(0, -3)}y`];
  if (noun.endsWith("es") && index[noun.slice(0, -2)]) return index[noun.slice(0, -2)];
  if (noun.endsWith("s") && !noun.endsWith("ss")) return index[noun.slice(0, -1)];
  return undefined;
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
