import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "../doodlescript/interpret";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { parseIndependentTeacherCorpus } from "./independentCorpus";
import { evaluateIndependentGold, independentGoldCorpusSchema, type IndependentGoldObservation } from "./independentGold";

export function measuredRatio(numerator: number, denominator: number) {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || numerator < 0 || denominator < numerator) {
    throw new Error("A measured ratio needs integer counts with 0 <= numerator <= denominator.");
  }
  return { numerator, denominator, percent: denominator ? Math.round(numerator / denominator * 10000) / 100 : null };
}

export function metricChange(current: ReturnType<typeof measuredRatio>, previous?: ReturnType<typeof measuredRatio>) {
  if (!previous) return { status: "no-baseline", percentagePoints: null };
  if (current.denominator !== previous.denominator) return { status: "denominator-changed", percentagePoints: null };
  if (current.percent === null || previous.percent === null) return { status: "unknown", percentagePoints: null };
  return { status: "comparable", percentagePoints: Math.round(
    (current.numerator / current.denominator - previous.numerator / previous.denominator) * 10000) / 100 };
}

/** Re-runs current code; no saved test totals, paid calls or inferred approvals. */
export function measureReadiness(markdown: string, input: unknown) {
  const cases = parseIndependentTeacherCorpus(markdown);
  const gold = independentGoldCorpusSchema.parse(input);
  const observations: Record<number, IndependentGoldObservation> = {};
  const outcomes = cases.map((item) => {
    const parsed = interpretTeacherText(item.statement, initialScene);
    if (!parsed.ok) return { id: item.id, outcome: "clarified" as const, reason: parsed.message };
    const checked = validateDoodleScript(parsed.script, initialScene);
    if (!checked.ok) return { id: item.id, outcome: "invalid" as const, reason: checked.issues.map(({ message }) => message).join("; ") };
    if (checked.script.commands.length === 1 && checked.script.commands[0].action === "hold") {
      return { id: item.id, outcome: "held" as const };
    }
    try {
      const scene = applyDoodleScript(initialScene, checked.script);
      const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
      observations[item.id] = {
        visualCueIds: [...html.matchAll(/data-visual-cue="([^"]+)"/g)].flatMap((match) => match[1].split(/\s+/)),
        visualGrammarId: html.match(/data-relation-layout="([^"]+)"/)?.[1]
      };
      return { id: item.id, outcome: "drawn" as const };
    } catch (error) {
      return { id: item.id, outcome: "invalid" as const, reason: error instanceof Error ? error.message : "Render failed" };
    }
  });
  const scored = evaluateIndependentGold(cases, gold, observations);
  const drawings = scored.results.filter(({ expectedIntent }) => expectedIntent === "draw");
  const controls = scored.results.filter(({ expectedIntent }) => expectedIntent !== "draw");
  const metrics = {
    localDrawingCoverage: measuredRatio(outcomes.filter(({ outcome }) => outcome === "drawn").length, cases.length),
    annotationCoverage: measuredRatio(gold.cases.length, cases.length),
    annotatedDrawingChecks: measuredRatio(drawings.filter(({ automatedReady }) => automatedReady).length, drawings.length),
    annotatedControlChecks: measuredRatio(controls.filter(({ passed }) => passed).length, controls.length),
    annotatedAllChecks: measuredRatio(scored.automatedReady, scored.total),
    strictRecordedPasses: measuredRatio(scored.passed, scored.total)
  };
  return { schemaVersion: "1.0.0", scope: "Local interpreter and development-conformance annotations; not held-out generalization or hosted accuracy",
    overallCompletionPercent: null,
    overallCompletionReason: "No fixed, fully measured product acceptance specification. Do not average unrelated denominators.",
    formula: "percent = round(100 * numerator / denominator, 2); empty denominators are unknown, not zero",
    metrics, outcomes, annotatedCases: scored.results,
    missingEvidence: {
      visualQuality: "unknown: this command does not load or invent human approvals; pending records do not mean nobody has tested Tegeera",
      phoneReadiness: "unknown: requires end-to-end device evidence",
      hostedRealtime: "unknown: requires a separately measured representative live latency distribution",
      hostedAccuracy: "unknown: local-corpus metrics do not measure the hosted model"
    }
  };
}
