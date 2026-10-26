import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRemoteBudget, remoteBudgetConfiguration, RESERVE_SCRIPT } from './remoteBudget.mjs';
import { createInterpreterServer } from './index.mjs';
import { modelConfiguration } from './engine.mjs';

const configuration = { url: 'https://test.upstash.io', token: 'private-test-token', totalLimit: 1000 };

test('remote budget configuration rejects partial and unsafe credential destinations', () => {
  assert.equal(remoteBudgetConfiguration({}), null);
  assert.throws(() => remoteBudgetConfiguration({ UPSTASH_REDIS_REST_URL: configuration.url }));
  for (const url of ['http://test.upstash.io', 'https://untrusted.example', 'https://test.upstash.io/path', 'https://test.upstash.io?token=x']) {
    assert.throws(() => remoteBudgetConfiguration({ UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: 'secret' }));
  }
  assert.equal(remoteBudgetConfiguration({ UPSTASH_REDIS_REST_URL: configuration.url, UPSTASH_REDIS_REST_TOKEN: 'secret' }).totalLimit, 1000);
  assert.throws(() => remoteBudgetConfiguration({ UPSTASH_REDIS_REST_URL: configuration.url, UPSTASH_REDIS_REST_TOKEN: 'secret', MAX_PROVIDER_CALLS_TOTAL: '-1' }));
});

test('every reservation uses one atomic script, shared key, server time and private header', async () => {
  let calls = 0;
  const budget = createRemoteBudget({ configuration, limit: 80, fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, configuration.url);
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.authorization, 'Bearer private-test-token');
    assert.deepEqual(JSON.parse(options.body), ['EVAL', RESERVE_SCRIPT, '1', 'geera:provider-budget:v1', '80', '1000']);
    assert.ok(options.signal);
    return Response.json({ result: 1 });
  } });
  await budget.reserve(); await budget.reserve();
  assert.equal(calls, 2);
  assert.match(RESERVE_SCRIPT, /redis.call\('TIME'\)/);
});

test('quota exhaustion, storage corruption and uncertain network outcomes all fail closed', async () => {
  for (const fetchImpl of [
    async () => Response.json({ result: 0 }),
    async () => Response.json({ result: -1 }),
    async () => Response.json({ result: '1' }),
    async () => Response.json({ error: 'secret provider details' }),
    async () => new Response('unavailable', { status: 503 }),
    async () => new Response('bad json'),
    async () => { throw new TypeError('fetch failed secret-token'); },
  ]) {
    const budget = createRemoteBudget({ configuration, limit: 80, fetchImpl });
    await assert.rejects(budget.reserve(), { message: 'Provider call budget exhausted.' });
  }
});

test('HTTP service never calls model when durable reservation fails', async () => {
  let calls = 0;
  const server = createInterpreterServer({ configuration: modelConfiguration({ NEBIUS_API_KEY: 'test-key' }),
    remoteBudget: configuration, budgetFetch: async () => Response.json({ result: 0 }),
    modelFetch: async () => { calls++; throw new Error('Must not call provider'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/v1/interpret`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'A boat beside a tree', scene: { entities: [], relations: [] } })
    });
    assert.equal(response.status, 429);
    assert.equal(calls, 0);
    assert.doesNotMatch(JSON.stringify(await response.json()), /test-key|private-test-token/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
