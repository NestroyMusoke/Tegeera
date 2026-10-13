import { expect, it } from 'vitest';
import { compileUniversalScene } from './universalScene';
import { initialScene, applyDoodleScript } from '../doodlescript/scene';
import { validateDoodleScript } from '../doodlescript/validator';

it.each(['sound', 'vibration', 'mist', 'celebration'])("does not turn %s into a computer-process or CPU icon", (label) => {
  for (const kind of ['process', 'cpu']) {
    const script = compileUniversalScene({ blueprintVersion: '1.0', mode: 'replace', confidence: 0.95,
      objects: [{ id: 'subject', label, kind, x: 50, y: 50 }], connections: [] }, initialScene, `Show ${label}.`);
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    expect(applyDoodleScript(initialScene, script).entities[0].kind).toBe('generic');
  }
});

it.each([['process', 'process'], ['processor', 'cpu'], ['cpu', 'cpu']])('preserves grounded computer concept %s', (label, kind) => {
  const script = compileUniversalScene({ blueprintVersion: '1.0', mode: 'replace', confidence: 0.95,
    objects: [{ id: 'subject', label, kind, x: 50, y: 50 }], connections: [] }, initialScene, `Show ${label}.`);
  expect(applyDoodleScript(initialScene, script).entities[0].kind).toBe(kind);
});
