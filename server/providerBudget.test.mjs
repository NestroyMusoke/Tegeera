import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProviderBudget } from "./providerBudget.mjs";

test("persistent reservations survive new instances and reset only on a new UTC day", t => {
  const root = mkdtempSync(join(tmpdir(), "tegeera-budget-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = join(root, "quota.json"); let day = 100;
  const options = { file, limit: 2, now: () => day * 86_400_000 };
  createProviderBudget(options).reserve();
  const restarted = createProviderBudget(options); restarted.reserve();
  assert.equal(restarted.remaining(), false);
  assert.throws(() => restarted.reserve(), /budget exhausted/);
  day++; assert.equal(restarted.remaining(), true); restarted.reserve();
});

test("corruption and an existing writer lock fail closed", t => {
  const root = mkdtempSync(join(tmpdir(), "tegeera-budget-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = join(root, "quota.json");
  const budget = createProviderBudget({ file, limit: 5 });
  writeFileSync(file, "broken");
  assert.equal(budget.remaining(), false); assert.throws(() => budget.reserve());
  writeFileSync(file, JSON.stringify({ day: Math.floor(Date.now() / 86_400_000), count: 0 }));
  writeFileSync(`${file}.lock`, "");
  assert.equal(budget.remaining(), false); assert.throws(() => budget.reserve());
});

test("in-memory development budget remains bounded", () => {
  const budget = createProviderBudget({ limit: 1 }); budget.reserve();
  assert.equal(budget.remaining(), false); assert.throws(() => budget.reserve());
  assert.throws(() => createProviderBudget({ limit: 2, file: "relative.json" }), /absolute/);
});
