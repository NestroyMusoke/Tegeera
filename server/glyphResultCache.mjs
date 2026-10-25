/** Bounded process-local reuse of validated draft artwork, never approval records. */
export class GlyphResultCache {
  constructor({ capacity = 128, ttlMs = 30 * 60_000, now = Date.now } = {}) {
    this.capacity = capacity; this.ttlMs = ttlMs; this.now = now; this.entries = new Map();
  }
  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return;
    if (entry.expires <= this.now()) { this.entries.delete(key); return; }
    this.entries.delete(key); this.entries.set(key, entry);
    return { candidate: structuredClone(entry.value.candidate), provider: entry.value.provider,
      model: entry.value.model, cacheHit: true, providerAttempts: 0, providerAttemptMs: [] };
  }
  set(key, value) {
    this.entries.delete(key);
    this.entries.set(key, { value: structuredClone(value), expires: this.now() + this.ttlMs });
    while (this.entries.size > this.capacity) this.entries.delete(this.entries.keys().next().value);
  }
}
