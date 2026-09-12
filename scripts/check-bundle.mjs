import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const assetsDirectory = fileURLToPath(new URL("../dist/assets/", import.meta.url));
const maximumJavaScriptBytes = 500 * 1024;
const requiredPartitions = ["react-vendor-", "schema-vendor-", "index-"];

const files = (await readdir(assetsDirectory)).filter((name) => name.endsWith(".js"));
const measured = await Promise.all(files.map(async (name) => ({
  name,
  bytes: (await stat(join(assetsDirectory, name))).size
})));

const missing = requiredPartitions.filter((prefix) => !measured.some(({ name }) => name.startsWith(prefix)));
const oversized = measured.filter(({ bytes }) => bytes > maximumJavaScriptBytes);

if (missing.length || oversized.length) {
  if (missing.length) console.error(`Missing required local bundle partition(s): ${missing.join(", ")}`);
  for (const { name, bytes } of oversized) {
    console.error(`${name} is ${(bytes / 1024).toFixed(2)} kB; limit is ${maximumJavaScriptBytes / 1024} kB.`);
  }
  process.exitCode = 1;
} else {
  const summary = measured
    .sort((left, right) => right.bytes - left.bytes)
    .map(({ name, bytes }) => `${name} ${(bytes / 1024).toFixed(2)} kB`)
    .join(", ");
  console.log(`Bundle budget passed: ${summary}`);
}
