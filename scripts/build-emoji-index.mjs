import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("node_modules/emojibase-data/en/data.json");
const target = resolve("src/glyphs/emojiIndex.json");
const natureTarget = resolve("src/glyphs/emojiNatureIndex.json");
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
// CLDR group 3 is Animals & Nature. Exact labels plus globally unique tags
// provide a conservative semantic fallback (e.g. "bee" -> "honeybee")
// without treating an ambiguous keyword like "cup" as a safe match.
const tagOwners = new Map();
for (const entry of data) {
  if (!entry.emoji || entry.group === undefined) continue;
  for (const tag of entry.tags ?? []) {
    if (!/^[a-z][a-z -]{2,47}$/.test(tag)) continue;
    const owners = tagOwners.get(tag) ?? new Set();
    owners.add(entry.emoji);
    tagOwners.set(tag, owners);
  }
}
const nature = new Map();
for (const entry of data) {
  if (entry.group !== 3 || !entry.emoji) continue;
  const label = entry.label?.toLowerCase().trim();
  if (label && sorted[label] === entry.emoji) nature.set(label, entry.emoji);
  for (const tag of entry.tags ?? []) {
    if (tagOwners.get(tag)?.size === 1 && !sorted[tag]) nature.set(tag, entry.emoji);
  }
}
await writeFile(natureTarget, `${JSON.stringify(Object.fromEntries([...nature].sort(([a], [b]) => a.localeCompare(b))))}\n`);
console.log(`Wrote ${index.size} unambiguous exact emoji labels to ${target}`);
console.log(`Wrote ${nature.size} exact or uniquely tagged nature labels to ${natureTarget}`);
