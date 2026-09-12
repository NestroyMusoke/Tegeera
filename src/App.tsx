import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { DoodleCanvas } from "./components/DoodleCanvas";
import { interpretTeacherText } from "./doodlescript/interpret";
import { applyDoodleScript, initialScene } from "./doodlescript/scene";
import type { SceneState } from "./doodlescript/schema";
import {
  validateDoodleScript,
  type GateIssue
} from "./doodlescript/validator";
import { useSpeechSession } from "./speech/useSpeechSession";
import { relationLabel } from "./doodlescript/motion";
import type { ClarificationRequest } from "./doodlescript/clarification";
import type { AcceptedSpeechTranscript } from "./speech/SpeechSession";
import {
  makeLatencySample,
  createLatencyEvidence,
  retainLatencyWindow,
  summarizeLatency,
  type InputSource,
  type LatencySample,
  type PipelineOutcome
} from "./telemetry/latency";

interface PendingLatency {
  id: number;
  source: InputSource;
  outcome: PipelineOutcome;
  receivedAt: number;
  decisionAt: number;
  speechFinalizationMs?: number;
}

const suggestions = [
  "Three students share two books",
  "Another student arrives with her own book",
  "Highlight the second student",
  "Draw a car"
];

function App() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<SceneState[]>([initialScene]);
  const [issues, setIssues] = useState<GateIssue[]>([]);
  const [clarification, setClarification] = useState<ClarificationRequest | null>(null);
  const [holdNotice, setHoldNotice] = useState<string | null>(null);
  const [latencySamples, setLatencySamples] = useState<LatencySample[]>([]);
  const pendingLatency = useRef<PendingLatency | null>(null);
  const latencySequence = useRef(0);
  const scene = history.at(-1) ?? initialScene;
  const canUndo = history.length > 1;

  const spokenSummary = useMemo(
    () => {
      if (!scene.entities.length) return "Nothing drawn yet";
      const labels = (ids: string[]) => ids.map((id) => scene.entities.find((entity) => entity.id === id)?.label ?? id).join(", ");
      return [scene.entities.map((entity) => entity.label ?? entity.kind).join(", "),
        ...(scene.relations ?? []).map((relation) => {
          const source = labels(relation.sourceIds);
          return `${source} ${relationLabel(relation, source)} ${labels(relation.targetIds)}`;
        })
      ].join(". ");
    },
    [scene.entities, scene.relations]
  );

  const submit = (text = input, speechTiming?: AcceptedSpeechTranscript) => {
    const receivedAt = speechTiming?.finalReceivedAt ?? performance.now();
    const source: InputSource = speechTiming ? "speech" : "typed";
    const markDecision = (outcome: PipelineOutcome) => {
      pendingLatency.current = {
        id: ++latencySequence.current, source, outcome, receivedAt,
        decisionAt: performance.now(), speechFinalizationMs: speechTiming?.finalizationMs
      };
    };
    const interpretation = interpretTeacherText(text, scene);
    if (!interpretation.ok) {
      markDecision("clarify");
      setHoldNotice(null);
      setClarification(interpretation.clarification);
      setIssues([
        {
          gate: "confidence",
          message: interpretation.message
        }
      ]);
      return;
    }
    const result = validateDoodleScript(interpretation.script, scene);
    if (!result.ok) {
      markDecision("reject");
      setHoldNotice(null);
      setClarification(null);
      setIssues(result.issues);
      return;
    }
    const isHold = result.script.commands.length === 1 && result.script.commands[0].action === "hold";
    const nextScene = isHold ? scene : applyDoodleScript(scene, result.script);
    markDecision(isHold ? "hold" : "draw");
    if (!isHold) setHistory((current) => [...current, nextScene]);
    setInput("");
    setIssues([]);
    setClarification(null);
    setHoldNotice(isHold ? "Break recognized. The current drawing is unchanged." : null);
  };

  useLayoutEffect(() => {
    const pending = pendingLatency.current;
    if (!pending) return;
    pendingLatency.current = null;
    const commitAt = performance.now();
    let cancelled = false;
    let frameOne = 0;
    let frameTwo = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (cancelled) return;
      const sample = makeLatencySample(
        pending.id, pending.source, pending.outcome, pending.receivedAt,
        pending.decisionAt, commitAt, performance.now(), pending.speechFinalizationMs
      );
      setLatencySamples((current) => retainLatencyWindow(current, sample));
    };
    if (typeof requestAnimationFrame === "function") {
      frameOne = requestAnimationFrame(() => { frameTwo = requestAnimationFrame(finish); });
    } else {
      timer = setTimeout(finish, 0);
    }
    return () => {
      cancelled = true;
      if (frameOne) cancelAnimationFrame(frameOne);
      if (frameTwo) cancelAnimationFrame(frameTwo);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [scene.revision, issues, clarification, holdNotice]);

  const undo = () => {
    if (!canUndo) return;
    setHistory((current) => current.slice(0, -1));
    setIssues([]);
    setClarification(null);
    setHoldNotice(null);
  };

  const speech = useSpeechSession((transcript, timing) => submit(transcript, timing));
  const isListening = speech.status === "listening";
  const speechBusy =
    speech.status === "checking" ||
    speech.status === "requesting-permission" ||
    speech.status === "processing";
  const latestLatency = latencySamples.at(-1);
  const latencySummary = useMemo(() => summarizeLatency(latencySamples), [latencySamples]);
  const downloadLatencyEvidence = () => {
    if (!latencySamples.length) return;
    const capturedAt = new Date().toISOString();
    const evidence = createLatencyEvidence(latencySamples, capturedAt, {
      userAgent: navigator.userAgent,
      ...(navigator.hardwareConcurrency ? { hardwareConcurrency: navigator.hardwareConcurrency } : {})
    });
    const url = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tegeera-performance-${capturedAt.replace(/[:.]/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            T
          </span>
          <div>
            <strong>Tegeera</strong>
            <span>Speak it. See it. Understand it.</span>
          </div>
        </div>
        <div className="offline-pill">
          <span aria-hidden="true" />
          Ready offline
        </div>
      </header>

      <section className="hero-copy">
        <p className="eyebrow">A thought, made visible</p>
        <h1>What should we help them see?</h1>
        <p>
          Explain it naturally. Tegeera builds a drawing you can correct,
          continue and teach from.
        </p>
      </section>

      <DoodleCanvas scene={scene}>

      <section className="control-card">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor="teacher-input">Your explanation</label>
          <div className="input-row">
            <input
              id="teacher-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Imagine three students waiting in a queue…"
              autoComplete="off"
            />
            <button className="draw-button" type="submit">
              Draw it
            </button>
            <button
              aria-label={isListening ? "Stop listening" : "Start listening"}
              aria-pressed={isListening}
              className={`mic-button ${isListening ? "listening" : ""}`}
              disabled={speech.status === "unavailable" || speechBusy}
              onClick={() => void (isListening ? speech.stop() : speech.start())}
              type="button"
            >
              <span aria-hidden="true">{isListening ? "■" : "●"}</span>
              {isListening ? "Stop" : "Speak"}
            </button>
          </div>
        </form>

        <div className={`speech-status speech-${speech.status}`} role="status">
          <div>
            <strong>
              {isListening
                ? "Listening"
                : speech.status === "unavailable"
                  ? "Typed input ready"
                  : "Speech input"}
            </strong>
            <span>
              {speech.partialTranscript ||
                speech.message ||
                "Tap Speak, then explain one change at a time."}
            </span>
          </div>
          {(isListening || speech.status === "processing") && (
            <button onClick={() => void speech.cancel()} type="button">
              Cancel
            </button>
          )}
        </div>

        <details className="latency-panel">
          <summary>Device performance evidence</summary>
          {latestLatency ? (
            <output
              data-input-source={latestLatency.source}
              data-outcome={latestLatency.outcome}
              data-decision-ms={latestLatency.decisionMs}
              data-commit-ms={latestLatency.commitMs}
              data-paint-ms={latestLatency.paintMs}
            >
              Last {latestLatency.source} update: decision {latestLatency.decisionMs.toFixed(2)} ms · painted {latestLatency.paintMs.toFixed(2)} ms
              {latestLatency.speechFinalizationMs === undefined ? null : ` · speech finalization ${latestLatency.speechFinalizationMs.toFixed(2)} ms`}
            </output>
          ) : <span>Submit an explanation to record this device.</span>}
          <small>
            Rolling {latencySummary.count}/50: decision p50 {latencySummary.decisionP50Ms.toFixed(2)} ms · paint p50 {latencySummary.paintP50Ms.toFixed(2)} ms · paint p95 {latencySummary.paintP95Ms.toFixed(2)} ms. Speech finalization is reported separately.
          </small>
          <button disabled={!latencySamples.length} onClick={downloadLatencyEvidence} type="button">
            Download performance evidence
          </button>
          <small>The evidence contains timings and device capability only—never lesson text or transcripts.</small>
        </details>

        {issues.length ? (
          <div className="clarification" role="status" data-clarification-code={clarification?.code}>
            <strong>Help me understand</strong>
            <span>{issues[0].message}</span>
            {clarification?.alternatives.length ? (
              <small>{clarification.alternatives.join(" · ")}</small>
            ) : null}
          </div>
        ) : null}

        {holdNotice ? (
          <div className="hold-notice" role="status" data-hold-reason="non-visual-speech">
            <strong>Scene held</strong>
            <span>{holdNotice}</span>
          </div>
        ) : null}

        <div className="control-footer">
          <div className="suggestions" aria-label="Example commands">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setInput(suggestion);
                  submit(suggestion);
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <button
            className="undo-button"
            disabled={!canUndo}
            onClick={undo}
            type="button"
          >
            Undo
          </button>
        </div>
      </section>
      </DoodleCanvas>
      <p className="sr-only" aria-live="polite">
        {spokenSummary}
      </p>
    </main>
  );
}

export default App;
