import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStandaloneColour, normalizeStandaloneReplacement } from '../shared/normalizeBlueprint.mjs';

const scene = (label) => ({ mode: 'replace', confidence: 0.95, objects: [{ id: 'one', label }], connections: [] });
test('recovers explicit single-object colour independently of noun vocabulary', () => {
  for (const noun of ['octopus', 'flux capsule', 'woven basket']) {
    const before = scene(`purple ${noun}`);
    const after = normalizeStandaloneReplacement(`A purple ${noun}.`, before);
    assert.equal(after.objects[0].color, 'purple');
    assert.equal(before.objects[0].color, undefined);
    assert.equal(normalizeStandaloneColour(`A purple ${noun}.`, after), after);
  }
});
test('never guesses from complex, ambiguous, contradictory or uncertain requests', () => {
  for (const text of ['Not a purple octopus.', 'A purple octopus?', 'Maybe a purple octopus.', 'A purple fish beside an octopus.']) {
    const before = scene('purple octopus');
    assert.equal(normalizeStandaloneColour(text, before), before);
  }
  for (const before of [scene('orange juice'), { ...scene('purple octopus'), mode: 'extend' },
    { ...scene('purple octopus'), confidence: 0.2 },
    { ...scene('purple octopus'), objects: [{ label: 'purple octopus', color: 'red' }] }]) {
    assert.equal(normalizeStandaloneColour(`A ${before.objects[0].label}.`, before), before);
  }
});
test('recovers different explicit colours in a longer scene without transferring them', () => {
  const before = { ...scene('blue vase'), objects: [{ id: 'v', label: 'blue vase' }, { id: 's', label: 'red suitcase' }, { id: 'c', label: 'cat' }] };
  const after = normalizeStandaloneColour('A blue vase rests above a red suitcase beside a cat.', before);
  assert.deepEqual(after.objects.map((object) => object.color), ['blue', 'red', undefined]);
  assert.equal(normalizeStandaloneColour('A blue vase rests above a red suitcase beside a cat.', after), after);
  const duplicate = { ...before, objects: [before.objects[0], { ...before.objects[0], id: 'other' }] };
  assert.equal(normalizeStandaloneColour('A blue vase.', duplicate), duplicate);
  assert.equal(before.objects[0].color, undefined);
});
