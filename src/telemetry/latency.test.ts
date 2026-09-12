import { describe, expect, it } from "vitest";
import { createLatencyEvidence, makeLatencySample, retainLatencyWindow, summarizeLatency } from "./latency";

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

  it("exports privacy-safe versioned evidence grouped by input source", () => {
    const samples = [
      makeLatencySample(1, "typed", "draw", 0, 2, 4, 8),
      makeLatencySample(2, "speech", "clarify", 0, 3, 5, 12, 30)
    ];
    const evidence = createLatencyEvidence(samples, "2026-09-12T06:00:00.000Z", {
      userAgent: "Tegeera test device", hardwareConcurrency: 4
    });
    expect(evidence).toMatchObject({
      schemaVersion: "1.0.0",
      capturedAt: "2026-09-12T06:00:00.000Z",
      environment: { userAgent: "Tegeera test device", hardwareConcurrency: 4 },
      summary: { count: 2, paintP95Ms: 12 },
      bySource: { typed: { count: 1 }, speech: { count: 1 } }
    });
    expect(JSON.stringify(evidence)).not.toMatch(/teacher|explanation|transcript/i);
    expect(() => createLatencyEvidence([], "2026-09-12T06:00:00.000Z", { userAgent: "test" })).toThrow(/one sample/);
  });
});
