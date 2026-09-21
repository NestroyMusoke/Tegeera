import { glyphKey, glyphSchema, resolveGlyph, type GlyphSource, type TegeeraGlyph } from "./glyph";

export interface LiveGlyphResolution {
  glyph?: TegeeraGlyph;
  source: GlyphSource;
  status: "final" | "placeholder";
}

export type GlyphGenerator = (noun: string, signal: AbortSignal) => Promise<unknown>;
export type LessonNounPlanner = (topic: string, signal: AbortSignal) => Promise<readonly string[]>;

interface ResolverOptions {
  pack?: ReadonlyMap<string, TegeeraGlyph>;
  emoji?: ReadonlyMap<string, TegeeraGlyph>;
  cache?: Map<string, TegeeraGlyph>;
  synonyms?: ReadonlyMap<string, string>;
  generator?: GlyphGenerator;
  persist?: (noun: string, glyph: TegeeraGlyph) => Promise<unknown>;
  maxConcurrent?: number;
  timeoutMs?: number;
}

/** Synchronous read path; generation runs only after the placeholder has been returned. */
export class LiveGlyphResolver {
  private readonly cache: Map<string, TegeeraGlyph>;
  private readonly pack?: ReadonlyMap<string, TegeeraGlyph>;
  private readonly emoji?: ReadonlyMap<string, TegeeraGlyph>;
  private readonly synonyms?: ReadonlyMap<string, string>;
  private readonly persist?: ResolverOptions["persist"];
  private readonly maxConcurrent: number;
  private readonly timeoutMs: number;
  private readonly listeners = new Set<() => void>();
  private readonly queued = new Set<string>();
  private readonly inFlight = new Set<string>();
  private readonly failedUntil = new Map<string, number>();
  private readonly queue: string[] = [];
  private active = 0;
  private generator?: GlyphGenerator;

  constructor(options: ResolverOptions = {}) {
    this.pack = options.pack;
    this.emoji = options.emoji;
    this.cache = options.cache ?? new Map();
    this.synonyms = options.synonyms;
    this.generator = options.generator;
    this.persist = options.persist;
    this.maxConcurrent = Math.max(1, Math.min(2, options.maxConcurrent ?? 2));
    this.timeoutMs = Math.max(1, options.timeoutMs ?? 12_000);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private emit() { for (const listener of this.listeners) listener(); }

  setGenerator(generator?: GlyphGenerator) {
    this.generator = generator;
    this.drain();
  }

  seedCache(entries: ReadonlyMap<string, TegeeraGlyph>) {
    for (const [noun, glyph] of entries) {
      const parsed = glyphSchema.safeParse(glyph);
      if (parsed.success && !this.cache.has(glyphKey(noun))) this.cache.set(glyphKey(noun), parsed.data);
    }
    this.emit();
  }

  reject(noun: string) {
    this.cache.delete(glyphKey(noun));
    this.failedUntil.set(glyphKey(noun), Date.now() + 30_000);
    this.emit();
  }

  resolve(noun: string): LiveGlyphResolution {
    const key = glyphKey(noun);
    const resolved = resolveGlyph({
      noun: key, kind: "generic", pack: this.pack, emoji: this.emoji,
      cache: this.cache, synonyms: this.synonyms
    });
    if (resolved.glyph) return { ...resolved, status: "final" };
    if (key && this.generator && (this.failedUntil.get(key) ?? 0) <= Date.now()
      && !this.queued.has(key) && !this.inFlight.has(key)) {
      this.queued.add(key);
      this.queue.push(key);
      queueMicrotask(() => this.drain());
    }
    return { glyph: undefined, source: "sticker", status: "placeholder" };
  }

  prefetch(noun: string) { this.resolve(noun); }

  speculativePrefetch(interimTranscript: string) {
    if (interimTranscript.length > 250) return;
    const candidates = [...interimTranscript.toLowerCase().matchAll(/\b(?:a|an|the)\s+([a-z][a-z'-]{2,})\b/g)]
      .map((match) => match[1]).filter((word) => !["and", "then", "this", "that", "with"].includes(word));
    for (const noun of [...new Set(candidates)].slice(0, 3)) this.prefetch(noun);
  }

  async prepareLesson(topic: string, planner: LessonNounPlanner): Promise<number> {
    if (!topic.trim() || topic.length > 120) return 0;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const nouns = await planner(topic.trim(), controller.signal);
      const clean = [...new Set(nouns.filter((noun) => typeof noun === "string")
        .map(glyphKey).filter((noun) => noun.length >= 2 && noun.length <= 48))].slice(0, 30);
      for (const noun of clean) this.prefetch(noun);
      return clean.length;
    } catch { return 0; }
    finally { clearTimeout(timer); }
  }

  private drain() {
    while (this.generator && this.active < this.maxConcurrent && this.queue.length) {
      const noun = this.queue.shift()!;
      this.queued.delete(noun);
      if (this.inFlight.has(noun) || this.cache.has(noun)) continue;
      this.inFlight.add(noun);
      this.active += 1;
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("Glyph generation timed out")); }, this.timeoutMs);
      });
      void Promise.race([Promise.resolve().then(() => this.generator!(noun, controller.signal)), timeout]).then((candidate) => {
        const parsed = glyphSchema.safeParse(candidate);
        if (!parsed.success) throw new Error("Invalid generated glyph");
        this.cache.set(noun, parsed.data);
        this.emit();
        if (this.persist) void this.persist(noun, parsed.data).catch(() => undefined);
      }).catch(() => {
        this.failedUntil.set(noun, Date.now() + 30_000);
      }).finally(() => {
        if (timer) clearTimeout(timer);
        this.inFlight.delete(noun);
        this.active -= 1;
        this.drain();
      });
    }
  }
}
