export type InputSource = "typed" | "speech";
export type PipelineOutcome = "draw" | "hold" | "clarify" | "reject";

export interface LatencySample {
  id: number;
  source: InputSource;
  outcome: PipelineOutcome;
  decisionMs: number;
  commitMs: number;
  paintMs: number;
  speechFinalizationMs?: number;
}

export interface LatencySummary {
  count: number;
  decisionP50Ms: number;
  paintP50Ms: number;
  paintP95Ms: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function makeLatencySample(
  id: number,
  source: InputSource,
  outcome: PipelineOutcome,
  receivedAt: number,
  decisionAt: number,
  commitAt: number,
  paintAt: number,
  speechFinalizationMs?: number
): LatencySample {
  return {
    id, source, outcome,
    decisionMs: round(Math.max(0, decisionAt - receivedAt)),
    commitMs: round(Math.max(0, commitAt - receivedAt)),
    paintMs: round(Math.max(0, paintAt - receivedAt)),
    ...(speechFinalizationMs === undefined ? {} : { speechFinalizationMs: round(Math.max(0, speechFinalizationMs)) })
  };
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

export function summarizeLatency(samples: readonly LatencySample[]): LatencySummary {
  const decision = samples.map(({ decisionMs }) => decisionMs).sort((a, b) => a - b);
  const paint = samples.map(({ paintMs }) => paintMs).sort((a, b) => a - b);
  return {
    count: samples.length,
    decisionP50Ms: percentile(decision, 0.5),
    paintP50Ms: percentile(paint, 0.5),
    paintP95Ms: percentile(paint, 0.95)
  };
}

export function retainLatencyWindow(samples: readonly LatencySample[], sample: LatencySample, maximum = 50): LatencySample[] {
  return [...samples, sample].slice(-maximum);
}
