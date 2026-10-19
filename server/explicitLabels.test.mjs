import test from 'node:test';
import assert from 'node:assert/strict';
import { completeExplicitLabels } from '../shared/explicitLabels.mjs';
import { completeExplicitPassages } from '../shared/sourceConstraints.mjs';

const plan = () => ({ mode: 'replace', confidence: .95,
  objects: [{ id: 'a', label: 'specimen chamber' }, { id: 'b', label: 'crystalline sample' }],
  connections: [{ from: 'a', to: 'b', label: 'contains', kind: 'contains' }] });
const source = 'A transparent specimen chamber contains a crystalline mineral sample.';

test('recovers explicit omitted modifiers without changing identity, relations or input', () => {
  const input = plan(), before = structuredClone(input);
  const result = completeExplicitPassages(source, input);
  assert.deepEqual(result.objects.map(({ label }) => label), ['transparent specimen chamber', 'crystalline mineral sample']);
  assert.equal(result.connections, input.connections);
  assert.deepEqual(input, before);
  assert.equal(completeExplicitLabels(source, result), result);
});
test('generalizes to new noun phrases instead of a noun list', () => {
  const input = plan();
  input.objects[0].label = 'vault'; input.objects[1].label = 'instrument';
  assert.deepEqual(completeExplicitLabels('An insulated archive vault stores a delicate measuring instrument.', input).objects.map(({ label }) => label), ['insulated archive vault', 'delicate measuring instrument']);
});
test('leaves uncertain, compound, pronominal, conflicting and unsupported descriptions unchanged', () => {
  for (const text of [source.replace('contains', 'does not contain'), `Maybe ${source}`, source.replace('.', '?'),
    'A specimen chamber contains a sample and a camera.', 'It contains a crystalline sample.',
    'A specimen chamber with a camera contains a crystalline sample.', source.replace('contains', 'surrounds')]) {
    const input = plan(); assert.equal(completeExplicitLabels(text, input), input);
  }
  for (const mutate of [p => p.mode = 'extend', p => p.confidence = .3,
    p => p.objects.push({ id: 'c', label: 'chamber' }), p => p.connections[0].label = 'does not contain',
    p => p.objects[0].label = 'opaque specimen chamber']) {
    const input = plan(); mutate(input); assert.equal(completeExplicitLabels(source, input), input);
  }
});
test('does not guess between competing descriptions of the same shortened entity', () => {
  const input = plan();
  const result = completeExplicitLabels(`${source} A sealed specimen chamber contains a crystalline mineral sample.`, input);
  assert.equal(result.objects[0], input.objects[0]);
});

test('does not absorb a following clause or exceed the client blueprint label limit', () => {
  const input = plan(); input.objects[0].label = 'holder'; input.objects[1].label = 'cover'; input.connections[0].label = 'holds';
  assert.equal(completeExplicitLabels('A holder holds a cover as a source releases droplets onto the cover.', input), input);
  assert.equal(completeExplicitLabels('A specially reinforced transparent holder holds a cover.', input), input);
});
