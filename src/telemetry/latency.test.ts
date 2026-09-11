import { describe, expect, it } from "vitest";
import { makeLatencySample, retainLatencyWindow, summarizeLatency } from "./latency";

describe("runtime latency evidence", () => {
  it("keeps decision, commit, paint, and speech-finalization clocks separate", () => {
    expect(makeLatencySample(1, "speech", "draw", 100, 102.126, 107.5, 116.789, 38.456)).toEqual({
      id: 1, source: "speech", outcome: "draw", decisionMs: 2.13, commitMs: 7.5, paintMs: 16.79,
      speechFinalizationMs: 38.46
    });
  });

  it("computes stable nearest-rank p50 and p95 summaries", () => {
    const samples = Array.from({ length: 20 }, (_, index) => makeLatencySample(index, "typed", "draw", 0, index + 1, index + 2, index + 3));
    expect(summarizeLatency(samples)).toEqual({ count: 20, decisionP50Ms: 10, paintP50Ms: 12, paintP95Ms: 21 });
  });

  it("bounds retained device evidence without reordering it", () => {
    const samples = Array.from({ length: 55 }, (_, id) => makeLatencySample(id, "typed", "draw", 0, 1, 2, 3));
    expect(retainLatencyWindow(samples.slice(0, 54), samples[54])).toHaveLength(50);
    expect(retainLatencyWindow(samples.slice(0, 54), samples[54])[0].id).toBe(5);
  });
});
