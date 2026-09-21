import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("node_modules/emojibase-data/en/data.json");
const target = resolve("src/glyphs/emojiIndex.json");
const data = JSON.parse(await readFile(source, "utf8"));
const index = new Map();
const ambiguous = new Set();
for (const entry of data) {
  const noun = entry.label?.toLowerCase().trim();
  if (!noun || !/^[a-z][a-z -]{1,47}$/.test(noun) || typeof entry.emoji !== "string") continue;
  if (index.has(noun) && index.get(noun) !== entry.emoji) ambiguous.add(noun);
  else index.set(noun, entry.emoji);
}
for (const noun of ambiguous) index.delete(noun);
const sorted = Object.fromEntries([...index].sort(([left], [right]) => left.localeCompare(right)));
await writeFile(target, `${JSON.stringify(sorted)}\n`);
console.log(`Wrote ${index.size} unambiguous exact emoji labels to ${target}`);
