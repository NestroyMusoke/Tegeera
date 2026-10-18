import assert from "node:assert/strict";
import test from "node:test";
import { scoreNovelGraph } from "./score-novel-graphs.mjs";

const gold = { roles: ["battery", "motor", "fan"], links: [["battery", "motor"], ["motor", "fan"]] };
const complete = { confidence: 0.9,
  objects: ["battery", "motor", "fan"].map((label, index) => ({ id: `node-${index}`, label })),
  connections: [{ from: "node-0", to: "node-1" }, { from: "node-1", to: "node-2" }] };

test("correct endpoints with the opposite meaning cannot pass the relation gate", () => {
  const expected = { ...gold, relations: [{ from: "battery", to: "motor", labels: ["powers", "supplies power"] }] };
  const candidate = { ...complete, connections: [{ ...complete.connections[0], label: "disables", kind: "powers" }, complete.connections[1]] };
  const score = scoreNovelGraph(expected, candidate);
  assert.equal(score.graphComplete, true);
  assert.equal(score.relationComplete, false);
  assert.equal(score.semanticComplete, false);
  assert.equal(score.relationCoverage, "0/1");
  assert.equal(scoreNovelGraph(expected, { ...candidate, connections: [...candidate.connections, { ...complete.connections[0], label: "powers" }] }).semanticComplete, false);
});

test("relation checks require explicit labels, directed endpoints and all annotated meanings", () => {
  const expected = { ...gold, relations: [{ from: "battery", to: "motor", labels: ["powers", "supplies power"] }] };
  for (const label of ["powers", " Supplies POWER. "]) {
    const score = scoreNovelGraph(expected, { ...complete, connections: [{ ...complete.connections[0], label }, complete.connections[1]] });
    assert.equal(score.semanticComplete, true);
    assert.equal(score.relationCoverage, "1/1");
  }
  for (const label of ["does not power", "may power", "related to", "powers off", "powers?"]) {
    assert.equal(scoreNovelGraph(expected, { ...complete, connections: [{ ...complete.connections[0], label }, complete.connections[1]] }).semanticComplete, false);
  }
  assert.equal(scoreNovelGraph(expected, complete).semanticComplete, false);
  assert.equal(scoreNovelGraph(expected, { ...complete, connections: [{ from: "node-1", to: "node-0", label: "powers" }] }).semanticComplete, false);
});

test("unannotated probes do not imply meaning was checked", () => {
  const score = scoreNovelGraph(gold, complete);
  assert.equal(score.relationComplete, null);
  assert.equal(score.semanticComplete, null);
  assert.equal(score.relationCoverage, "not checked");
});

test("novel graph score requires every role and directed endpoint, without claiming visual approval", () => {
  assert.equal(scoreNovelGraph(gold, complete).graphComplete, true);
  assert.deepEqual(scoreNovelGraph(gold, { ...complete, connections: [{ from: "node-1", to: "node-0" }, complete.connections[1]] }).missingLinks,
    ["battery -> motor"]);
  assert.deepEqual(scoreNovelGraph(gold, { ...complete, objects: complete.objects.slice(1) }).missingRoles, ["battery"]);
  assert.equal(scoreNovelGraph(gold, { ...complete, confidence: 0.3 }).graphComplete, false);
});

test("exact roles beat qualified siblings while ambiguous partial roles remain unscored", () => {
  const candidate = { confidence: 0.95,
    objects: ["bee", "second bee", "hive", "hive entrance", "flower", "nectar"]
      .map((label, index) => ({ id: `n${index}`, label })),
    connections: [{ from: "n4", to: "n5" }, { from: "n0", to: "n5" }, { from: "n0", to: "n2" }] };
  const expected = { roles: ["bee", "hive", "entrance", "flower", "nectar"],
    links: [["flower", "nectar"], ["bee", "nectar"], ["bee", "hive"]] };
  assert.equal(scoreNovelGraph(expected, candidate).graphComplete, true);
  assert.deepEqual(scoreNovelGraph({ roles: ["bee"], links: [] }, {
    ...candidate, objects: [...candidate.objects.filter(({ label }) => label !== "bee"),
      { id: "n6", label: "third bee" }]
  }).missingRoles, ["bee"]);
});
