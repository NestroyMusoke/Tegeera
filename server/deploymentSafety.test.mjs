import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { assertProductionSafety } from "./deploymentSafety.mjs";
test("production AI cannot start without explicit secure origins and a persistent quota path", () => {
  const options = { production: true, configured: true, budgetFile: resolve("quota.local"), allowedOrigins: new Set(["https://tegeera.example"]) };
  assert.doesNotThrow(() => assertProductionSafety(options));
  assert.doesNotThrow(() => assertProductionSafety({ ...options, budgetFile: undefined, remoteBudget: { url: 'https://test.upstash.io', token: 'test' } }));
  assert.throws(() => assertProductionSafety({ ...options, budgetFile: undefined }));
  for (const origin of ["http://localhost:8080", "https://tegeera.example/path", "*", "https://a:b@tegeera.example"]) {
    assert.throws(() => assertProductionSafety({ ...options, allowedOrigins: new Set([origin]) }));
  }
  assert.throws(() => assertProductionSafety({ ...options, allowedOrigins: new Set() }));
  assert.doesNotThrow(() => assertProductionSafety({ production: false, configured: true }));
});
