#!/usr/bin/env node
// An explicit, text-only live check. It never invokes the billable image endpoint.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

let key = process.env.OPENROUTER_API_KEY?.trim();
if (!key) {
  try {
    const local = await readFile(new URL('../.env.local', import.meta.url), 'utf8');
    key = local.split(/\r?\n/).map((line) => line.match(/^OPENROUTER_API_KEY\s*=\s*(.+)\s*$/)?.[1])
      .find(Boolean)?.trim().replace(/^['"]|['"]$/g, '');
  } catch { /* No local secret file. */ }
}
if (!key) {
  console.error('No fresh key found. Put OPENROUTER_API_KEY=... in the gitignored .env.local file; never paste the key into chat or commit it.');
  process.exitCode = 2;
} else {
  const test = join(import.meta.dirname, '..', 'node_modules', 'vitest', 'vitest.mjs');
  const child = spawn(process.execPath, [test, 'run', 'src/llm/liveProvider.smoke.test.ts', '--reporter=verbose', '--maxWorkers=1', ...process.argv.slice(2)], {
    cwd: join(import.meta.dirname, '..'), stdio: 'inherit', windowsHide: true,
    env: { ...process.env, OPENROUTER_API_KEY: key, TEGEERA_RUN_LIVE_TESTS: '1' }
  });
  child.on('error', (error) => { console.error(`Could not launch live check: ${error.message}`); process.exitCode = 1; });
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
}
