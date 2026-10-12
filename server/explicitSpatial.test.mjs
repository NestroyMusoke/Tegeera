import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explicitSpatialRelations, completeExplicitSpatial, explicitSpatialIssue } from '../shared/explicitSpatial.mjs';
import { completeExplicitPassages, sourceConstraintIssue } from '../shared/sourceConstraints.mjs';
import { interpretScene, modelConfiguration } from './engine.mjs';

const candidate = () => ({ blueprintVersion: '1.0', mode: 'replace', confidence: 0.95,
  objects: [{ id: 'a', label: 'red cup', color: 'red', kind: 'generic', x: 30, y: 40 },
    { id: 'b', label: 'blue book', color: 'blue', kind: 'generic', x: 70, y: 40 },
    { id: 'c', label: 'flower', kind: 'generic', x: 30, y: 70 }], connections: [] });
const text = 'A red cup stands beside a blue book, with a flower above the cup.';
const expected = [{ from: 'a', to: 'b', label: 'beside' }, { from: 'c', to: 'a', label: 'above' }];

test('restores two uniquely named explicit clauses without trusting coordinates or mutating input', () => {
  const before = candidate();
  const result = completeExplicitPassages(text, before);
  assert.deepEqual(result.connections, expected);
  assert.deepEqual(before.connections, []);
  assert.equal(completeExplicitPassages(text, result), result);
  assert.equal(sourceConstraintIssue(text, result), null);
  assert.match(sourceConstraintIssue(text, before), /explicit spatial relation/);
});

test('generic clauses bind new multiword nouns rather than a scenario or asset registry', () => {
  const objects = [{ id: 'a', label: 'flux capsule' }, { id: 'b', label: 'zirconium vessel' }];
  for (const [phrase, label] of [['floats above', 'above'], ['rests beneath', 'below'],
    ['is to the left of', 'left of'], ['hangs next to', 'beside']]) {
    assert.deepEqual(explicitSpatialRelations(`The flux capsule ${phrase} the zirconium vessel.`, objects),
      [{ from: 'a', to: 'b', label }]);
  }
});

test('negation, uncertainty, questions, pronouns and intervening clauses do not license guessed edges', () => {
  for (const input of ['A red cup is not above a blue book.', 'Maybe a red cup is above a blue book.',
    'If a red cup is above a blue book, draw a flower.', 'Is a red cup above a blue book?',
    'A red cup might be above a blue book.', 'A red cup cannot be above a blue book.',
    'A red cup stands here. It is above a blue book.', 'A red cup says above before a blue book moves.']) {
    assert.deepEqual(explicitSpatialRelations(input, candidate().objects), [], input);
  }
  const ambiguous = [...candidate().objects, { id: 'other', label: 'cup' }];
  assert.deepEqual(explicitSpatialRelations('A cup above a blue book.', ambiguous), []);
  assert.deepEqual(explicitSpatialRelations('Pull a sled over snow.',
    [{ id: 'sled', label: 'sled' }, { id: 'snow', label: 'snow' }]), []);
});

test('equivalent reversed edges remain unchanged; contradictions go to validation rather than silent rewriting', () => {
  const pairText = 'A flower is above a red cup.';
  const inverse = { ...candidate(), connections: [{ from: 'a', to: 'c', label: 'below' }] };
  assert.equal(completeExplicitSpatial(pairText, inverse), inverse);
  assert.equal(explicitSpatialIssue(pairText, inverse), null);
  const wrong = { ...candidate(), connections: [{ from: 'c', to: 'a', label: 'below' }] };
  assert.equal(completeExplicitSpatial(pairText, wrong), wrong);
  assert.match(explicitSpatialIssue(pairText, wrong), /missing or contradictory/);
});

test('does not repair low-confidence plans, extensions, specialist diagrams or missing objects', () => {
  for (const override of [{ confidence: 0.4 }, { mode: 'extend' },
    { connections: [{ from: 'a', to: 'b', kind: 'contains', label: 'contains' }] }]) {
    const plan = { ...candidate(), ...override };
    assert.equal(completeExplicitSpatial(text, plan), plan);
  }
  assert.deepEqual(explicitSpatialRelations('A dragon is above a castle.', candidate().objects), []);
});

test('hosted interpretation repairs an omitted spatial graph locally with one provider call', async () => {
  let calls = 0;
  const result = await interpretScene({ text, scene: { entities: [], relations: [] } },
    modelConfiguration({ NEBIUS_API_KEY: 'test-private-key' }), { fetchImpl: async () => {
      calls += 1;
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(candidate()) } }] }), { status: 200 });
    } });
  assert.equal(calls, 1);
  assert.deepEqual(result.candidate.connections, expected);
});
