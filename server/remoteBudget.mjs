// Shared, atomic reservations. Redis stores counts only, never prompts or API keys.
export const RESERVE_SCRIPT = `
local day = math.floor(tonumber(redis.call('TIME')[1]) / 86400)
local storedDay = tonumber(redis.call('HGET', KEYS[1], 'day') or day)
local count = tonumber(redis.call('HGET', KEYS[1], 'count') or '0')
local total = tonumber(redis.call('HGET', KEYS[1], 'total') or '0')
if not storedDay or not count or not total or count < 0 or total < count or storedDay > day or count ~= math.floor(count) or total ~= math.floor(total) then return -1 end
if storedDay ~= day then count = 0 end
if count >= tonumber(ARGV[1]) or total >= tonumber(ARGV[2]) then return 0 end
redis.call('HSET', KEYS[1], 'day', day, 'count', count + 1, 'total', total + 1)
return 1`;

export function remoteBudgetConfiguration(env = process.env) {
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url && !token) return null;
  if (!url || !token) throw new Error('Both Upstash REST URL and token are required.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash
    || !parsed.hostname.endsWith('.upstash.io') || !['', '/'].includes(parsed.pathname)) {
    throw new Error('Use the HTTPS REST endpoint from your Upstash Redis database.');
  }
  const totalLimit = Number(env.MAX_PROVIDER_CALLS_TOTAL || 1000);
  if (!Number.isSafeInteger(totalLimit) || totalLimit < 1 || totalLimit > 100000) {
    throw new Error('MAX_PROVIDER_CALLS_TOTAL must be an integer from 1 to 100000.');
  }
  return { url: parsed.origin, token, totalLimit };
}

export function createRemoteBudget({ configuration, limit, fetchImpl = fetch }) {
  return {
    // Only reserve is authoritative; keeping preflight local avoids a second round trip.
    remaining: () => true,
    async reserve() {
      try {
        const response = await fetchImpl(configuration.url, {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(4000),
          headers: { authorization: `Bearer ${configuration.token}`, 'content-type': 'application/json' },
          body: JSON.stringify(['EVAL', RESERVE_SCRIPT, '1', 'geera:provider-budget:v1', String(limit), String(configuration.totalLimit)])
        });
        if (!response.ok) throw new Error('Reservation refused');
        const payload = await response.json();
        if (payload.error || payload.result !== 1) throw new Error('Reservation refused');
      } catch {
        // Includes unknown outcomes: never send a paid request unless reservation is confirmed.
        throw new Error('Provider call budget exhausted.');
      }
    }
  };
}
