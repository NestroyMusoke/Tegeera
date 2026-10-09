import { describe, expect, it } from "vitest";
import corpus from "../../evaluation/independent-teacher-corpus.md?raw";
import gold from "../../evaluation/independent-scene-gold-v1.json";
import { measuredRatio, measureReadiness, metricChange } from "./readiness";

describe("reproducible readiness reporting", () => {
  it("calculates percentages and does not count unknown denominators as zero", () => {
    expect(measuredRatio(25, 60).percent).toBe(41.67);
    expect(measuredRatio(0, 0).percent).toBeNull();
    expect(() => measuredRatio(3, 2)).toThrow();
    expect(() => measuredRatio(-1, 2)).toThrow();
    expect(() => measuredRatio(1.5, 2)).toThrow();
  });
  it("keeps drawing checks, controls and missing visual evidence separate", () => {
    const result = measureReadiness(corpus, gold);
    expect(result.outcomes).toHaveLength(60);
    expect(result.metrics.annotationCoverage).toEqual(measuredRatio(gold.cases.length, 60));
    expect(result.metrics.annotatedDrawingChecks.denominator + result.metrics.annotatedControlChecks.denominator)
      .toBe(result.metrics.annotatedAllChecks.denominator);
    expect(result.metrics.annotatedDrawingChecks.numerator + result.metrics.annotatedControlChecks.numerator)
      .toBe(result.metrics.annotatedAllChecks.numerator);
    expect(result.overallCompletionPercent).toBeNull();
    expect(result.annotatedCases.filter(({ expectedIntent, passed }) => expectedIntent === "draw" && passed)).toHaveLength(0);
    expect(result.missingEvidence.visualQuality).toContain("unknown");
  });
  it("reports percentage-point changes without pretending a changed denominator is comparable", () => {
    expect(metricChange(measuredRatio(26, 60), measuredRatio(25, 60)))
      .toEqual({ status: "comparable", percentagePoints: 1.67 });
    expect(metricChange(measuredRatio(26, 30), measuredRatio(25, 26)).status).toBe("denominator-changed");
    expect(metricChange(measuredRatio(0, 0), measuredRatio(0, 0)).percentagePoints).toBeNull();
    expect(metricChange(measuredRatio(25, 60)).status).toBe("no-baseline");
  });
});
