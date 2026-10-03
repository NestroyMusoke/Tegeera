import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { compileUniversalScene } from "../llm/universalScene";
import { LiveGlyphResolver } from "./runtimeResolver";
import type { Stroke } from "./strokeGlyph";

const glyph = {
  schemaVersion: "1.0.0", viewBox: "0 0 100 100",
  parts: [{ id: "body", d: "M10 10 L90 10 L90 90 L10 90 Z", fill: "#cad2c5", stroke: "#2f3e46" }],
  anchors: { top: [50, 10], ground: [50, 90], front: [90, 50] }
};

describe("non-blocking glyph resolver", () => {
  it("stages a scene-supplied glyph for review without starting another request", async () => {
    const generator = vi.fn(async () => glyph);
    const resolver = new LiveGlyphResolver({ generator });
    expect(resolver.stageDraft("dragon", glyph)).toBe(true);
    expect(resolver.resolve("dragon")).toMatchObject({ status: "placeholder", source: "generated" });
    await Promise.resolve();
    expect(generator).not.toHaveBeenCalled();
    expect(resolver.approve("dragon")).toEqual(glyph);
    expect(resolver.resolve("dragon").status).toBe("final");
    expect(resolver.stageDraft("dragon", glyph)).toBe(false);
  });

  it("keeps the labeled fallback when a schema-valid generated doodle is structurally unusable", async () => {
    const onGenerationError = vi.fn();
    const resolver = new LiveGlyphResolver({ onGenerationError, generator: async () => ({ strokes: [
      { part: "tiny", color: "#2f3e46", pts: [[20, 20], [24, 20], [24, 24], [20, 20]] }
    ] }) });
    expect(resolver.resolve("griffin").status).toBe("placeholder");
    await vi.waitFor(() => expect(onGenerationError).toHaveBeenCalledWith("griffin", expect.any(Error)));
    expect(resolver.draftFor("griffin")).toBeUndefined();
    expect(resolver.approve("griffin")).toBeUndefined();
    expect(resolver.resolve("griffin")).toMatchObject({ source: "sticker", status: "placeholder" });
  });

  it("keeps a usable draft when an edit collapses it into an unusable mark", async () => {
    const outline: Stroke = { part: "outline", color: "#2f3e46",
      pts: [[8, 8], [42, 8], [42, 42], [8, 8]] };
    const resolver = new LiveGlyphResolver({ generator: async () => ({ strokes: [outline] }) });
    resolver.resolve("griffin");
    await vi.waitFor(() => expect(resolver.draftFor("griffin")).toBeDefined());
    const before = resolver.draftFor("griffin");
    expect(await resolver.editGlyph("griffin", "make it tiny", async () => ({ strokes: [
      { part: "mark", color: "#2f3e46", pts: [[20, 20], [24, 20], [24, 24], [20, 20]] }
    ] }))).toBe(false);
    expect(resolver.draftFor("griffin")).toEqual(before);
    expect(resolver.approve("griffin")).toEqual(before);
  });

  it("keeps a labelled placeholder and reports a rate-limited provider", async () => {
    const onGenerationError = vi.fn();
    const resolver = new LiveGlyphResolver({
      generator: async () => { throw new Error("OpenRouter stroke stream failed (429)."); },
      onGenerationError
    });
    expect(resolver.resolve("dragon").status).toBe("placeholder");
    await vi.waitFor(() => expect(onGenerationError).toHaveBeenCalledOnce());
    expect(onGenerationError.mock.calls[0][0]).toBe("dragon");
    expect(resolver.resolve("dragon").status).toBe("placeholder");
  });
  it("publishes complete strokes before the provider finishes, then permits a bounded edit", async () => {
    const first: Stroke = { part: "body", color: "#2f3e46", pts: [[10, 10], [40, 10], [40, 40], [10, 10]] };
    const second: Stroke = { part: "feature", color: "#52796f", pts: [[15, 20], [20, 20], [25, 20], [30, 20]] };
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    const onGenerated = vi.fn();
    const cache = new Map();
    const persist = vi.fn(async () => true);
    const resolver = new LiveGlyphResolver({ cache, persist, onGenerated, generator: async (_noun, _signal, publish) => {
      publish(first);
      await gate;
      publish(second);
      return { strokes: [first, second] };
    } });
    const changed = vi.fn();
    resolver.subscribe(changed);
    expect(resolver.resolve("new bird").status).toBe("placeholder");
    await vi.waitFor(() => expect(resolver.resolve("new bird").glyph?.parts).toHaveLength(1));
    expect(resolver.resolve("new bird").status).toBe("placeholder");
    finish();
    await vi.waitFor(() => expect(resolver.resolve("new bird").glyph?.parts).toHaveLength(2));
    expect(resolver.resolve("new bird").status).toBe("placeholder");
    expect(cache.has("new bird")).toBe(false);
    expect(persist).not.toHaveBeenCalled();
    expect(onGenerated).toHaveBeenCalledWith("new bird", expect.objectContaining({ parts: expect.any(Array) }));
    expect(resolver.hasEditableStrokes("new bird")).toBe(true);
    expect(await resolver.editGlyph("new bird", "add a line", async (_noun, current) => ({
      strokes: [...current.strokes, { part: "detail", color: "#e9c46a", pts: [[10, 30], [20, 30], [30, 30], [40, 30]] }]
    }))).toBe(true);
    expect(resolver.resolve("new bird").glyph?.parts).toHaveLength(3);
    expect(onGenerated).toHaveBeenCalledTimes(2);
    expect(cache.has("new bird")).toBe(false);
    expect(resolver.approve("new bird")?.parts).toHaveLength(3);
    expect(resolver.resolve("new bird").status).toBe("final");
    expect(cache.has("new bird")).toBe(true);
    await vi.waitFor(() => expect(persist).toHaveBeenCalledOnce());
    resolver.reject("new bird");
    expect(resolver.resolve("new bird").status).toBe("placeholder");
    expect(resolver.hasEditableStrokes("new bird")).toBe(false);
    expect(changed).toHaveBeenCalled();
  });
  it("paints an unseen noun in under 100ms even when generation takes eight seconds", async () => {
    vi.useFakeTimers();
    try {
      const generator = vi.fn(() => new Promise((resolve) => setTimeout(() => resolve(glyph), 8_000)));
      const resolver = new LiveGlyphResolver({ generator, timeoutMs: 12_000 });
      const start = performance.now();
      expect(resolver.resolve("unseen creature").status).toBe("placeholder");
      const script = compileUniversalScene({
        blueprintVersion: "1.0", mode: "replace", confidence: .9,
        objects: [{ id: "creature", label: "unseen creature", kind: "generic", x: 50, y: 50 }],
        connections: []
      }, initialScene, "An unseen creature");
      const html = renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(initialScene, script)} />);
      expect(html).toContain('data-glyph-source="sticker"');
      expect(performance.now() - start).toBeLessThan(100);
      expect(resolver.resolve("unseen creature").status).toBe("placeholder");
      await vi.advanceTimersByTimeAsync(8_000);
      expect(generator).toHaveBeenCalledTimes(1);
      expect(resolver.resolve("unseen creature").status).toBe("placeholder");
      expect(resolver.approve("unseen creature")).toBeDefined();
      expect(resolver.resolve("unseen creature").status).toBe("final");
    } finally { vi.useRealTimers(); }
  });

  it("dedupes speculative nouns and bounds concurrent generation to two", async () => {
    vi.useFakeTimers();
    try {
      let active = 0; let peak = 0;
      const generator = vi.fn(async () => {
        active += 1; peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 100));
        active -= 1;
        return glyph;
      });
      const resolver = new LiveGlyphResolver({ generator });
      resolver.speculativePrefetch("A dragon and a village");
      resolver.prefetch("dragon");
      resolver.prefetch("third noun");
      await vi.advanceTimersByTimeAsync(500);
      expect(peak).toBeLessThanOrEqual(2);
      expect(generator).toHaveBeenCalledTimes(3);
      expect(resolver.resolve("dragon").status).toBe("placeholder");
      expect(resolver.approve("dragon")).toBeDefined();
      expect(resolver.resolve("dragon").status).toBe("final");
    } finally { vi.useRealTimers(); }
  });

  it("prefetches nouns rather than color adjectives while leaving full noun labels untouched", async () => {
    const requested: string[] = [];
    const generator = vi.fn(async (noun: string) => { requested.push(noun); return glyph; });
    const resolver = new LiveGlyphResolver({ generator });
    resolver.speculativePrefetch("A yellow dragon and a purple village. The blue whale swims.");
    await vi.waitFor(() => expect(generator).toHaveBeenCalledTimes(3));
    expect(requested).toEqual(expect.arrayContaining(["dragon", "village", "whale"]));
    expect(requested).not.toContain("yellow");
    expect(requested).not.toContain("purple");
    expect(resolver.resolve("blue whale").status).toBe("placeholder");
  });

  it("preempts speculative work and draws a newly visible noun before the lesson backlog", async () => {
    const started: string[] = [];
    const onGenerated = vi.fn();
    const generator = vi.fn(async (noun: string) => {
      started.push(noun);
      if (noun === "old topic" && started.filter((item) => item === noun).length === 1) {
        // Simulates a provider that ignores AbortSignal. The resolver still frees its slot.
        return new Promise<unknown>(() => undefined);
      }
      return glyph;
    });
    const resolver = new LiveGlyphResolver({ generator, maxConcurrent: 1, onGenerated });
    resolver.prefetch("old topic");
    resolver.prefetch("later topic");
    resolver.prefetch("current object");
    await vi.waitFor(() => expect(started).toEqual(["old topic"]));
    expect(resolver.resolve("current object").status).toBe("placeholder");
    await vi.waitFor(() => expect(started.slice(0, 2)).toEqual(["old topic", "current object"]));
    await vi.waitFor(() => expect(resolver.draftFor("current object")).toBeDefined());
    expect(resolver.approve("current object")).toBeDefined();
    expect(resolver.resolve("current object").status).toBe("final");
    expect(onGenerated).toHaveBeenCalledWith("current object", expect.any(Object));
    expect(started.indexOf("current object")).toBeLessThan(started.indexOf("later topic"));
    resolver.setGenerator(undefined);
  });

  it("cannot resurrect a rejected draft after an in-flight provider ignores cancellation", async () => {
    let finish!: (value: unknown) => void;
    const delayed = new Promise<unknown>((resolve) => { finish = resolve; });
    const cache = new Map();
    const onGenerated = vi.fn();
    const generator = vi.fn(async () => delayed);
    const resolver = new LiveGlyphResolver({ cache, onGenerated, generator });
    resolver.resolve("dragon");
    await vi.waitFor(() => expect(generator).toHaveBeenCalledOnce());
    resolver.reject("dragon");
    finish(glyph);
    await Promise.resolve();
    await Promise.resolve();
    expect(resolver.approve("dragon")).toBeUndefined();
    expect(cache.has("dragon")).toBe(false);
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it("does not publish an old provider's result after the generator changes", async () => {
    let finish!: (value: unknown) => void;
    const delayed = new Promise<unknown>((resolve) => { finish = resolve; });
    const onGenerated = vi.fn();
    const generator = vi.fn(async () => delayed);
    const resolver = new LiveGlyphResolver({ onGenerated, generator });
    resolver.resolve("dragon");
    await vi.waitFor(() => expect(generator).toHaveBeenCalledOnce());
    resolver.setGenerator(undefined);
    finish(glyph);
    await Promise.resolve();
    await Promise.resolve();
    expect(resolver.approve("dragon")).toBeUndefined();
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it("rejects an in-flight edit without letting the old edit become reusable", async () => {
    const initial: Stroke = { part: "outline", color: "#2f3e46", pts: [[8, 8], [42, 8], [42, 42], [8, 8]] };
    const resolver = new LiveGlyphResolver({ generator: async () => ({ strokes: [initial] }) });
    resolver.resolve("griffin");
    await vi.waitFor(() => expect(resolver.hasEditableStrokes("griffin")).toBe(true));
    let finish!: (value: unknown) => void;
    const delayed = new Promise<unknown>((resolve) => { finish = resolve; });
    const editor = vi.fn(async () => delayed);
    const editing = resolver.editGlyph("griffin", "add wings", editor);
    await vi.waitFor(() => expect(editor).toHaveBeenCalledOnce());
    expect(await resolver.editGlyph("griffin", "add horns", editor)).toBe(false);
    resolver.reject("griffin");
    finish({ strokes: [initial] });
    expect(await editing).toBe(false);
    expect(resolver.approve("griffin")).toBeUndefined();
    expect(resolver.hasEditableStrokes("griffin")).toBe(false);
  });
});
