// Extract only encoded image data from the supplied reference. Never execute its scripts.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const source = await readFile(process.argv[2], 'utf8');
for (const [variable, folder, expected] of [['D', 'desktop', 120], ['M', 'mobile', 60]]) {
  const match = source.match(new RegExp(`const ${variable}\\s*=\\s*(\\[[\\s\\S]*?\\]);`));
  if (!match) throw new Error(`Missing ${variable} frame array`);
  const frames = JSON.parse(match[1]);
  if (!Array.isArray(frames) || frames.length !== expected) throw new Error('Unexpected frame count');
  const output = new URL(`../public/media/film/${folder}/`, import.meta.url);
  await mkdir(output, { recursive: true });
  for (const [index, data] of frames.entries()) {
    if (typeof data !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(data)) throw new Error('Invalid encoded frame');
    const bytes = Buffer.from(data, 'base64');
    if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Not WebP');
    await writeFile(new URL(`${index}.webp`, output), bytes);
  }
  console.log(`${folder}: ${frames.length} WebP frames extracted`);
}
