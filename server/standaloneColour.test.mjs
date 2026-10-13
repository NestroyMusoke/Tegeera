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
  for (const text of ['Not a purple octopus.', 'A purple octopus beside a fish.', 'A purple octopus?', 'Maybe a purple octopus.', 'A purple octopus and a fish.']) {
    const before = scene('purple octopus');
    assert.equal(normalizeStandaloneColour(text, before), before);
  }
  for (const before of [scene('orange juice'), { ...scene('purple octopus'), mode: 'extend' },
    { ...scene('purple octopus'), confidence: 0.2 },
    { ...scene('purple octopus'), objects: [{ label: 'purple octopus', color: 'red' }] }]) {
    assert.equal(normalizeStandaloneColour(`A ${before.objects[0].label}.`, before), before);
  }
});
