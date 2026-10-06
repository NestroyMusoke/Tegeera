import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createProvisionalPack } from './build-provisional-quickdraw.mjs';
import { candidateFingerprint } from './quickdraw-vision-triage.mjs';

const entry = { id: 'bee-123', noun: 'bee', keyId: '123',
  svg: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M10 10 L90 10 L90 90 Z" fill="none" stroke="#2f3e46"/></svg>',
  sourceUrl: 'https://storage.googleapis.com/quickdraw_dataset/full/simplified/bee.ndjson#key_id=123' };
const manifest = { formatVersion: '1.0.0', entries: [entry] };
const triage = { formatVersion: '1.0.0', items: { [entry.id]: { status: 'guessed',
  fingerprint: candidateFingerprint(entry), model: 'blind-vision-model', blindGuess: 'A bee' } } };
const selections = { formatVersion: '1.0.0', ids: [entry.id] };

test('provisional builder retains source, glyph, and an explicit non-human-review state', () => {
  const result = createProvisionalPack(manifest, triage, selections);
  assert.equal(result.entries[0].noun, 'bee');
  assert.equal(result.entries[0].glyph.viewBox, '0 0 100 100');
  assert.equal(result.entries[0].screening.humanReviewed, false);
  assert.equal(result.entries[0].provenance.license, 'CC BY 4.0');
});

test('provisional builder rejects stale artwork, a wrong guess, and duplicate nouns', () => {
  assert.throws(() => createProvisionalPack(manifest, { ...triage, items: {
    [entry.id]: { ...triage.items[entry.id], fingerprint: 'stale' }
  } }, selections), /No matching blind/);
  assert.throws(() => createProvisionalPack(manifest, { ...triage, items: {
    [entry.id]: { ...triage.items[entry.id], blindGuess: 'a house' }
  } }, selections), /No matching blind/);
  assert.throws(() => createProvisionalPack(manifest, triage,
    { ...selections, ids: [entry.id, entry.id] }), /Duplicate provisional noun/);
});
