import { expect, it } from "vitest";
import { spatialLevels } from "./spatialLevels";
import { compileUniversalScene } from "./universalScene";
import { initialScene, applyDoodleScript } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";

it("derives four levels from relationships, regardless of IDs or input ordering", () => {
  const objects = ['bottom', 'middle', 'upper', 'top', 'neighbor'].map((id) => ({ id }));
  const connections = [['upper', 'middle', 'rests on'], ['middle', 'bottom', 'above'], ['top', 'upper', 'above'], ['neighbor', 'bottom', 'beside']]
    .map(([from, to, label]) => ({ from, to, label }));
  expect(spatialLevels(objects, connections)).toEqual({ count: 4, above: [3, 2, 1, 0, 0], below: [0, 1, 2, 3, 0] });
  expect(() => spatialLevels(objects, [...connections, { from: 'bottom', to: 'top', label: 'above' }])).toThrow(/cycle/);
});

it("compiles a novel four-level stack without relying on suggested model coordinates", () => {
  const objects = ['stone', 'basket', 'balloon', 'star'].map((label, index) => ({ id: `n${index}`, label, kind: 'generic', x: 50, y: 50 }));
  const connections = [0, 1, 2].map((index) => ({ from: `n${index + 1}`, to: `n${index}`, label: 'above' }));
  const script = compileUniversalScene({ blueprintVersion: '1.0', mode: 'replace', confidence: 0.95, objects, connections }, initialScene,
    'A basket is above a stone. A balloon is above the basket. A star is above the balloon.');
  const checked = validateDoodleScript(script, initialScene);
  expect(checked.ok, JSON.stringify(checked)).toBe(true);
  const entities = applyDoodleScript(initialScene, script).entities;
  for (let index = 0; index < 3; index++) expect(entities[index + 1].y).toBeLessThan(entities[index].y);
});

it("rejects an over-capacity vertical chain explicitly instead of reversing it", () => {
  const objects = Array.from({ length: 5 }, (_, index) => ({ id: `n${index}`, label: `object ${index}`, kind: 'generic', x: 50, y: 50 }));
  const connections = [0, 1, 2, 3].map((index) => ({ from: `n${index}`, to: `n${index + 1}`, label: 'above' }));
  expect(() => compileUniversalScene({ blueprintVersion: '1.0', mode: 'replace', confidence: 0.95, objects, connections }, initialScene, 'Draw these objects.')).toThrow(/four vertical levels/);
});
