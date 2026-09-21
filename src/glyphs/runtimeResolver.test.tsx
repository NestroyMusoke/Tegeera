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
    const resolver = new LiveGlyphResolver({ generator: async (_noun, _signal, publish) => {
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
    await vi.waitFor(() => expect(resolver.resolve("new bird").status).toBe("final"));
    expect(resolver.hasEditableStrokes("new bird")).toBe(true);
    expect(await resolver.editGlyph("new bird", "add a line", async (_noun, current) => ({
      strokes: [...current.strokes, { part: "detail", color: "#e9c46a", pts: [[10, 30], [20, 30], [30, 30], [40, 30]] }]
    }))).toBe(true);
    expect(resolver.resolve("new bird").glyph?.parts).toHaveLength(3);
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
      expect(resolver.resolve("dragon").status).toBe("final");
    } finally { vi.useRealTimers(); }
  });
});
