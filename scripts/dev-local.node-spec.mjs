import { test } from "node:test";
import assert from "node:assert/strict";
import { browserEnvironment } from "./dev-local.mjs";
import { fork } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";

test("frontend receives only the public address, never inherited provider credentials", () => {
  const original = { PATH: "tools", NVIDIA_API_KEY: "private", NEBIUS_API_KEY: "private", OPENROUTER_API_KEY: "private", VITE_PRIVATE_TOKEN: "private", VITE_TEGEERA_INTERPRETER_URL: "https://old.example" };
  const result = browserEnvironment(original, 32123);
  assert.deepEqual(result, { PATH: "tools", VITE_TEGEERA_INTERPRETER_URL: "http://127.0.0.1:32123" });
  assert.equal(original.NEBIUS_API_KEY, "private");
});
test("invalid backend ports fail closed", () => {
  for (const port of [0, -1, 65536, "8080", undefined, NaN, 1.2]) assert.throws(() => browserEnvironment({}, port));
});

test("private backend reports its actual ephemeral port and exits when its owner disconnects", { timeout: 15000 }, async t => {
  const child = fork(resolve(import.meta.dirname, "../server/local.mjs"), [], {
    execArgv: [], env: { ...browserEnvironment(process.env, 1), PORT: "0", ALLOWED_ORIGINS: "http://127.0.0.1:5173" },
    stdio: ["ignore", "ignore", "ignore", "ipc"], windowsHide: true
  });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  const [message] = await once(child, "message");
  assert.equal(message.type, "ready");
  assert.ok(message.port > 0);
  const response = await fetch(`http://127.0.0.1:${message.port}/health`, {
    headers: { Origin: "http://127.0.0.1:5173", Connection: "close" }, signal: AbortSignal.timeout(3000)
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://127.0.0.1:5173");
  assert.equal((await response.json()).configured, false);
  const closed = once(child, "exit");
  child.disconnect();
  const [code] = await closed;
  assert.equal(code, 0);
  await assert.rejects(fetch(`http://127.0.0.1:${message.port}/health`, { signal: AbortSignal.timeout(1000) }));
});
