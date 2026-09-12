import { describe, expect, it } from "vitest";
import { acceptedConstructionProbes } from "./constructionProbes";
import { acceptedFoundationalConstructionProbes } from "./foundationalConstructionProbes";
import { measureLocalRenderEnvelope } from "./runtimeEnvelope";

const allConstructionProbes = [...acceptedConstructionProbes, ...acceptedFoundationalConstructionProbes];

describe("generalized local render-time envelope", () => {
  it("keeps every accepted construction inside a coarse anti-regression budget", () => {
    const result = measureLocalRenderEnvelope(allConstructionProbes, 3);
    console.info(
      `Local SVG-ready pipeline: probes=${result.probeCount}, n=${result.sampleCount}, `
      + `decision p50=${result.decision.p50Ms.toFixed(2)}ms p95=${result.decision.p95Ms.toFixed(2)}ms, `
      + `SVG p50=${result.svgSerialization.p50Ms.toFixed(2)}ms p95=${result.svgSerialization.p95Ms.toFixed(2)}ms, `
      + `ready p50=${result.localReady.p50Ms.toFixed(2)}ms p95=${result.localReady.p95Ms.toFixed(2)}ms, `
      + `max=${result.localReady.maximumMs.toFixed(2)}ms (${result.slowestProbeId}). `
      + "Excludes speech, browser commit/paint and device scheduling."
    );

    expect(result.probeCount).toBe(246);
    expect(result.sampleCount).toBe(738);
    expect(result.decision.p95Ms).toBeLessThan(75);
    expect(result.svgSerialization.p95Ms).toBeLessThan(100);
    expect(result.localReady.p95Ms).toBeLessThan(150);
    expect(result.localReady.maximumMs).toBeLessThan(500);
  }, 45_000);

  it("rejects an empty or invalid benchmark configuration", () => {
    expect(() => measureLocalRenderEnvelope([], 3)).toThrow(/needs probes/);
    expect(() => measureLocalRenderEnvelope(allConstructionProbes, 0)).toThrow(/one repetition/);
  });
});
