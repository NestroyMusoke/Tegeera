import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DoodleCanvas } from '../components/DoodleCanvas';
import { compileUniversalScene } from './universalScene';
import { initialScene, applyDoodleScript } from '../doodlescript/scene';
import { validateDoodleScript } from '../doodlescript/validator';

const plan = () => ({ blueprintVersion: '1.0', mode: 'replace', confidence: 0.94,
  objects: ['emitter', 'pulse', 'cable', 'receiver', 'observer'].map((label, i) => ({ id: `r${i}`, label, kind: 'generic', x: 14 + (i % 4) * 24, y: i < 4 ? 30 : 68 })),
  connections: [{ from: 'r0', to: 'r1', kind: 'emits', label: 'emits' },
    { from: 'r1', to: 'r2', kind: 'propagatesThrough', label: 'propagates through' },
    { from: 'r1', to: 'r3', kind: 'reaches', label: 'reaches' },
    { from: 'r4', to: 'r3', label: 'observes' }] });
const text = 'An emitter sends a pulse through a cable to a receiver. An observer watches the receiver.';

it('retains both compatible origin links and all their endpoints in the actual renderer', () => {
  const candidate = plan();
  candidate.connections.push({ from: 'r0', to: 'r2', kind: 'enters', label: 'enters' });
  const script = compileUniversalScene(candidate, initialScene, text);
  expect(validateDoodleScript(script, initialScene).ok).toBe(true);
  const scene = applyDoodleScript(initialScene, script);
  expect(scene.relations).toHaveLength(5);
  expect(scene.relations!.map(r => [r.sourceIds[0], r.targetIds[0], r.predicate])).toEqual(
    candidate.connections.map(r => [r.from, r.to, r.label]));
  expect(renderToStaticMarkup(<DoodleCanvas scene={scene} />)).not.toContain('data-relation-layout="linear-propagation"');
});

it('renders the complete mixed explanation rather than dropping the observer', () => {
  const candidate = plan(); const snapshot = structuredClone(candidate);
  const script = compileUniversalScene(candidate, initialScene, text);
  const checked = validateDoodleScript(script, initialScene);
  expect(checked.ok, JSON.stringify(checked)).toBe(true);
  const scene = applyDoodleScript(initialScene, script);
  expect(scene.entities).toHaveLength(5);
  expect(scene.relations).toHaveLength(4);
  expect(scene.relations!.map((r) => [r.sourceIds[0], r.targetIds[0], r.predicate])).toEqual(
    candidate.connections.map((r) => [r.from, r.to, r.label]));
  expect(renderToStaticMarkup(<DoodleCanvas scene={scene} />)).not.toContain('data-relation-layout="linear-propagation"');
  expect(candidate).toEqual(snapshot);
  const next = applyDoodleScript(scene, compileUniversalScene(candidate, scene, text));
  expect(next.entities).toHaveLength(5);
  expect(next.relations).toHaveLength(4);
  expect(next.revision).toBe(scene.revision + 1);
});

it('does not use ordinary rendering to evade a broken propagation contract', () => {
  const candidate = plan(); candidate.connections.splice(1, 1);
  expect(() => compileUniversalScene(candidate, initialScene, text)).toThrow(/omitted a stated relationship/);
  expect(() => compileUniversalScene(candidate, initialScene, 'Draw these objects.')).toThrow(/Propagation needs/);
});
