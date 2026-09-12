import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "../doodlescript/interpret";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import type { ConstructionProbe } from "./constructionProbes";

export interface RuntimePhaseSummary {
  p50Ms: number;
  p95Ms: number;
  maximumMs: number;
}

export interface LocalRenderEnvelope {
  probeCount: number;
  sampleCount: number;
  decision: RuntimePhaseSummary;
  validation: RuntimePhaseSummary;
  sceneApplication: RuntimePhaseSummary;
  svgSerialization: RuntimePhaseSummary;
  localReady: RuntimePhaseSummary;
  slowestProbeId: string;
}

interface RuntimeSample {
  probeId: string;
  decisionMs: number;
  validationMs: number;
  sceneApplicationMs: number;
  svgSerializationMs: number;
  localReadyMs: number;
}

const nearestRank = (sorted: readonly number[], fraction: number) =>
  sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? 0;

function summarize(samples: readonly number[]): RuntimePhaseSummary {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    p50Ms: nearestRank(sorted, 0.5),
    p95Ms: nearestRank(sorted, 0.95),
    maximumMs: sorted.at(-1) ?? 0
  };
}

function measureProbe(probe: ConstructionProbe): RuntimeSample {
  const startedAt = performance.now();
  const interpretation = interpretTeacherText(probe.text, initialScene);
  const interpretedAt = performance.now();
  if (!interpretation.ok) throw new Error(`${probe.id}: ${interpretation.message}`);

  const validation = validateDoodleScript(interpretation.script, initialScene);
  const validatedAt = performance.now();
  if (!validation.ok) throw new Error(`${probe.id}: ${validation.issues.map(({ message }) => message).join("; ")}`);

  const scene = applyDoodleScript(initialScene, validation.script);
  const appliedAt = performance.now();
  const markup = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
  const serializedAt = performance.now();
  if (!markup.includes(`data-relation-layout="${probe.layout}"`)) {
    throw new Error(`${probe.id}: specialized SVG layout was not serialized`);
  }

  return {
    probeId: probe.id,
    decisionMs: interpretedAt - startedAt,
    validationMs: validatedAt - interpretedAt,
    sceneApplicationMs: appliedAt - validatedAt,
    svgSerializationMs: serializedAt - appliedAt,
    localReadyMs: serializedAt - startedAt
  };
}

/**
 * Measures the deterministic local path through serialized SVG. Browser commit, paint,
 * speech finalization and physical-device scheduling are deliberately outside this envelope.
 */
export function measureLocalRenderEnvelope(probes: readonly ConstructionProbe[], repetitions = 3): LocalRenderEnvelope {
  if (!probes.length || !Number.isInteger(repetitions) || repetitions < 1) throw new Error("A runtime envelope needs probes and at least one repetition.");
  probes.forEach(measureProbe); // Warm parser, schemas, renderer and JavaScript engine.
  const samples = Array.from({ length: repetitions }, () => probes.map(measureProbe)).flat();
  const slowest = [...samples].sort((a, b) => b.localReadyMs - a.localReadyMs)[0];
  return {
    probeCount: probes.length,
    sampleCount: samples.length,
    decision: summarize(samples.map(({ decisionMs }) => decisionMs)),
    validation: summarize(samples.map(({ validationMs }) => validationMs)),
    sceneApplication: summarize(samples.map(({ sceneApplicationMs }) => sceneApplicationMs)),
    svgSerialization: summarize(samples.map(({ svgSerializationMs }) => svgSerializationMs)),
    localReady: summarize(samples.map(({ localReadyMs }) => localReadyMs)),
    slowestProbeId: slowest.probeId
  };
}
