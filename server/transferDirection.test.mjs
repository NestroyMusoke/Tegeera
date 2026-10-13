import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transferDirectionIssue } from '../shared/transferDirection.mjs';
import { sceneValidationIssue } from './engine.mjs';

const plan = (label = 'receives', reverse = false) => ({ blueprintVersion: '1.0', mode: 'replace', confidence: 0.95,
  objects: [{ id: 'p', label: 'data', kind: 'generic', x: 20, y: 50 }, { id: 'r', label: 'screen', kind: 'generic', x: 80, y: 50 }],
  connections: [{ from: reverse ? 'r' : 'p', to: reverse ? 'p' : 'r', label }] });

test('rejects an active receive verb reversed against an explicit source transfer', () => {
  const before = plan(); const snapshot = structuredClone(before);
  assert.match(transferDirectionIssue('A receiver sends data to a screen.', before), /payload receives the recipient/);
  assert.match(sceneValidationIssue(before, { entities: [] }, 'A receiver sends data to a screen.'), /payload receives the recipient/);
  assert.deepEqual(before, snapshot);
});

test('accepts correct active, passive and arrival formulations', () => {
  for (const candidate of [plan('receives', true), plan('received by'), plan('reaches')]) {
    assert.equal(transferDirectionIssue('A receiver sends data to a screen.', candidate), null);
  }
});

test('does not guess from uncertain, negative, pronominal, unmatched or ambiguous phrases', () => {
  for (const source of ['Maybe a receiver sends data to a screen.', 'A receiver does not send data to a screen.',
    'A receiver sends it to a screen.', 'A receiver sends data to it.', 'A receiver sends power to a screen.']) {
    assert.equal(transferDirectionIssue(source, plan()), null);
  }
  const duplicate = plan(); duplicate.objects.push({ ...duplicate.objects[1], id: 'other' });
  assert.equal(transferDirectionIssue('A receiver sends data to a screen.', duplicate), null);
});

test('the same rule transfers to unseen multiword nouns', () => {
  const candidate = plan(); candidate.objects[0].label = 'silver pellets'; candidate.objects[1].label = 'sealed hopper';
  assert.ok(transferDirectionIssue('The feeder delivers silver pellets to the sealed hopper.', candidate));
});
