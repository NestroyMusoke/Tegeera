import { test } from 'node:test';
import assert from 'node:assert/strict';
import { propagationRoles } from '../shared/propagationBlueprint.mjs';
import { sceneValidationIssue, interpretScene, modelConfiguration } from './engine.mjs';

const plan = () => ({ blueprintVersion: '1.0', mode: 'replace', confidence: 0.94,
  objects: ['emitter', 'pulse', 'cable', 'receiver', 'observer'].map((label, i) => ({ id: `r${i}`, label, kind: 'generic', x: 14 + (i % 4) * 24, y: i < 4 ? 30 : 68 })),
  connections: [{ from: 'r0', to: 'r1', kind: 'emits', label: 'emits' },
    { from: 'r1', to: 'r2', kind: 'propagatesThrough', label: 'propagates through' },
    { from: 'r1', to: 'r3', kind: 'reaches', label: 'reaches' },
    { from: 'r4', to: 'r3', label: 'observes' }] });
const scene = { entities: [], relations: [] };

test('repair identifies competing origin forms without silently removing either claim', () => {
  const candidate = plan();
  candidate.connections.push({ from: 'r0', to: 'r2', kind: 'enters', label: 'enters' });
  const snapshot = structuredClone(candidate);
  assert.match(sceneValidationIssue(candidate, scene), /competing origin links.*not both/);
  assert.deepEqual(candidate, snapshot);
});

test('a complete propagation subgraph can retain connected ordinary context without losing roles', () => {
  const before = plan(); const snapshot = structuredClone(before);
  assert.deepEqual(propagationRoles(before), { source: 'r0', payload: 'r1', medium: 'r2', destination: 'r3' });
  assert.equal(sceneValidationIssue(before, scene), null);
  assert.deepEqual(before, snapshot);
});

test('mixed explanations still reject partial or ambiguous propagation and unrelated objects', () => {
  for (const mutate of [
    (p) => p.connections.splice(0, 1),
    (p) => p.connections.splice(1, 1),
    (p) => p.connections.splice(2, 1),
    (p) => p.connections.splice(3, 1),
    (p) => { p.connections[2].from = 'r2'; },
    (p) => p.connections.push({ from: 'r4', to: 'r1', kind: 'emits', label: 'emits' }),
    (p) => { p.connections[3].kind = 'calls'; p.connections[3].label = 'calls'; },
    (p) => { p.mode = 'extend'; }
  ]) {
    const candidate = plan(); mutate(candidate);
    assert.ok(sceneValidationIssue(candidate, scene));
  }
});

test('context must be connected to the propagation, not a separate miniature scene', () => {
  const candidate = plan();
  candidate.objects.push({ id: 'r5', label: 'display', kind: 'generic', x: 62, y: 68 });
  candidate.connections[3].to = 'r5';
  assert.ok(sceneValidationIssue(candidate, scene));
  candidate.connections.push({ from: 'r3', to: 'r5', label: 'updates' });
  assert.equal(sceneValidationIssue(candidate, scene), null);
});

test('complete mixed graph needs only one mocked model request', async () => {
  let calls = 0;
  const result = await interpretScene({ text: 'An emitter sends a pulse through a cable to a receiver. An observer watches the receiver.', scene },
    modelConfiguration({ NEBIUS_API_KEY: 'test-only' }), { fetchImpl: async () => {
      calls++;
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(plan()) } }] }), { status: 200 });
    } });
  assert.equal(calls, 1);
  assert.equal(result.candidate.objects.length, 5);
  assert.equal(result.candidate.connections.length, 4);
});
