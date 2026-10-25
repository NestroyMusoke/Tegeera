import { test } from "node:test";
import assert from "node:assert/strict";
import { GlyphResultCache } from "./glyphResultCache.mjs";
test("glyph reuse expires, evicts least-recent use and never implies approval or another paid call", () => {
  let now = 0;
  const cache = new GlyphResultCache({ capacity: 2, ttlMs: 10, now: () => now });
  const result = { candidate: { strokes: [] }, provider: "test", model: "test", usage: { totalTokens: 99 }, providerAttempts: 2 };
  cache.set("a", result); cache.set("b", result);
  const hit = cache.get("a"); hit.candidate.strokes.push("mutation");
  assert.deepEqual(cache.get("a").candidate.strokes, []);
  assert.equal(hit.providerAttempts, 0); assert.equal(hit.usage, undefined);
  assert.equal(hit.approved, undefined);
  cache.set("c", result); assert.equal(cache.get("b"), undefined);
  now = 10; assert.equal(cache.get("a"), undefined);
});
