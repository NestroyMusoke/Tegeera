import assert from "node:assert/strict";
import test from "node:test";
import { scoreNovelGraph } from "./score-novel-graphs.mjs";

const gold = { roles: ["battery", "motor", "fan"], links: [["battery", "motor"], ["motor", "fan"]] };
const complete = { confidence: 0.9,
  objects: ["battery", "motor", "fan"].map((label, index) => ({ id: `node-${index}`, label })),
  connections: [{ from: "node-0", to: "node-1" }, { from: "node-1", to: "node-2" }] };

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
