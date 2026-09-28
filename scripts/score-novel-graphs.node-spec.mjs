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
