/** Bounded, DOM-free label layout. Full text remains in the SVG title/caption. */
export function stickerLabel(value: string): { lines: string[]; fontSize: number } {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (const word of words) {
    const chars = Array.from(word);
    const pieces = chars.length <= 16 ? [word] : [];
    if (!pieces.length) {
      for (let offset = 0; offset < chars.length; offset += 16) pieces.push(chars.slice(offset, offset + 16).join(""));
    }
    for (const piece of pieces) {
      const last = lines.at(-1);
      if (last && Array.from(`${last} ${piece}`).length <= 16) lines[lines.length - 1] = `${last} ${piece}`;
      else lines.push(piece);
    }
  }
  if (!lines.length) lines.push("object");
  const visible = lines.slice(0, 3);
  if (lines.length > 3) visible[2] = `${Array.from(visible[2]).slice(0, 15).join("")}…`;
  const longest = Math.max(...visible.map((line) => Array.from(line).length));
  return { lines: visible, fontSize: Math.max(11, Math.min(16, 110 / longest)) };
}
