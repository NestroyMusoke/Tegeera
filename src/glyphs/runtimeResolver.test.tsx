import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { compileUniversalScene } from "../llm/universalScene";
import { LiveGlyphResolver } from "./runtimeResolver";

const glyph = {
  schemaVersion: "1.0.0", viewBox: "0 0 100 100",
  parts: [{ id: "body", d: "M10 10 L90 10 L90 90 L10 90 Z", fill: "#cad2c5", stroke: "#2f3e46" }],
  anchors: { top: [50, 10], ground: [50, 90], front: [90, 50] }
};

describe("non-blocking glyph resolver", () => {
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
