// @vitest-environment node
import { afterAll, describe, expect, it, vi } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { initialScene } from '../doodlescript/scene';
import { validateDoodleScript } from '../doodlescript/validator';
import { compileUniversalScene } from './universalScene';
import { compileStrokeGlyph } from '../glyphs/strokeGlyph';
import { editStrokeGlyphRemotely, generateStrokeGlyphRemotely, planLessonNouns } from './generateGlyph';
import { interpretRemotely } from './remoteInterpreter';

const live = process.env.TEGEERA_RUN_LIVE_TESTS === '1' && Boolean(process.env.OPENROUTER_API_KEY);
const liveIt = live ? it : it.skip;
const evidence: Record<string, unknown> = {};
const output = join(process.cwd(), '.visual-check');

if (live) {
  vi.stubGlobal('window', { location: { href: 'http://localhost/' } });
  afterAll(async () => {
    await mkdir(output, { recursive: true });
    await writeFile(join(output, 'live-api-smoke.json'), JSON.stringify(evidence, null, 2));
  });
}

describe('explicit live OpenRouter text/stroke smoke (never run by npm test)', () => {
  liveIt('returns a validator-safe semantic scene', async () => {
    const started = performance.now();
    const interpretation = await interpretRemotely('A dragon flies above a village', initialScene,
      process.env.OPENROUTER_API_KEY!, AbortSignal.timeout(45_000));
    evidence.semantic = { model: interpretation.model ?? null, milliseconds: Math.round(performance.now() - started) };
    const script = compileUniversalScene(interpretation.candidate, initialScene, 'A dragon flies above a village');
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
  }, 50_000);

  liveIt('streams and edits a bounded doodle', async () => {
    const key = process.env.OPENROUTER_API_KEY!;
    const streamed: string[] = [];
    let started = performance.now();
    const strokes = await generateStrokeGlyphRemotely('dragon', key, AbortSignal.timeout(45_000), (stroke) => streamed.push(stroke.part));
    evidence.stroke = { milliseconds: Math.round(performance.now() - started), streamedCount: streamed.length };
    expect(streamed.length).toBeGreaterThan(0);
    expect(compileStrokeGlyph(strokes).parts.length).toBeGreaterThan(0);

    started = performance.now();
    const edited = await editStrokeGlyphRemotely('dragon', strokes, 'add a small horn', key, AbortSignal.timeout(45_000));
    const glyph = compileStrokeGlyph(edited);
    evidence.edit = { milliseconds: Math.round(performance.now() - started), parts: glyph.parts.length };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="256" height="256">${glyph.parts.map((part) => `<path d="${part.d}" fill="${part.fill}" stroke="${part.stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
    await mkdir(output, { recursive: true });
    await writeFile(join(output, 'live-dragon-strokes.png'), new Resvg(svg, { background: '#ffffff' }).render().asPng());
  }, 95_000);

  liveIt('plans concrete lesson nouns', async () => {
    const started = performance.now();
    const nouns = await planLessonNouns('the water cycle', process.env.OPENROUTER_API_KEY!, AbortSignal.timeout(45_000));
    evidence.lesson = { milliseconds: Math.round(performance.now() - started), nounCount: nouns.length };
    expect(nouns.length).toBeGreaterThan(0);
  }, 50_000);
});
