import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { interpretRemotely, remoteInterpreterEnabled } from "./llm/remoteInterpreter";
import { compileUniversalScene } from "./llm/universalScene";
import { loadGlyphCache, rememberGlyph } from "./glyphs/cache";
import { glyphKey, type TegeeraGlyph } from "./glyphs/glyph";
import { offlineGlyphCatalog } from "./glyphs/catalog";
import { extractEmojiPreviews } from "./glyphs/emojiPreview";
import { LiveGlyphResolver } from "./glyphs/runtimeResolver";
import { DEFAULT_FREE_GLYPH_MODEL, editStrokeGlyphRemotely, generateStrokeGlyphRemotely, planLessonNouns } from "./llm/generateGlyph";
import { allTestedPhrases, showcaseGroups } from "./evaluation/showcaseExamples";
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
const localDevelopment = import.meta.env.MODE === "development";

function App() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<SceneState[]>([initialScene]);
  const [issues, setIssues] = useState<GateIssue[]>([]);
  const [clarification, setClarification] = useState<ClarificationRequest | null>(null);
  const [holdNotice, setHoldNotice] = useState<string | null>(null);
  const [remoteBusy, setRemoteBusy] = useState(false);
  const [openRouterKeyDraft, setOpenRouterKeyDraft] = useState("");
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [localAiEnabled, setLocalAiEnabled] = useState(false);
  const [aiStatus, setAiStatus] = useState("Not enabled");
  const [lastRemoteModel, setLastRemoteModel] = useState<string | null>(null);
  const [glyphIssue, setGlyphIssue] = useState("");
  const glyphCache = useRef(new Map<string, TegeeraGlyph>());
  const glyphResolver = useRef<LiveGlyphResolver | null>(null);
  if (!glyphResolver.current) glyphResolver.current = new LiveGlyphResolver({
    ...offlineGlyphCatalog, cache: glyphCache.current, persist: rememberGlyph,
    onGenerationError: (noun, error) => setGlyphIssue(
      error instanceof Error && error.message.includes("(429)")
        ? `OpenRouter is rate-limiting doodle generation. ${noun} remains labelled; try again later.`
        : `Could not finish the ${noun} doodle. Its label remains visible; you can try again later.`
    )
  });
  const [glyphRevision, setGlyphRevision] = useState(0);
  const [lessonTopic, setLessonTopic] = useState("");
  const [lessonPrepStatus, setLessonPrepStatus] = useState("");
  const [editNoun, setEditNoun] = useState("");
  const [editInstruction, setEditInstruction] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [pendingGlyphReview, setPendingGlyphReview] = useState<Array<{ noun: string; glyph: TegeeraGlyph }>>([]);
  const [exampleSearch, setExampleSearch] = useState("");
  const [exampleLimit, setExampleLimit] = useState(24);
  const [latencySamples, setLatencySamples] = useState<LatencySample[]>([]);
  const pendingLatency = useRef<PendingLatency | null>(null);
  const latencySequence = useRef(0);
  const remoteRequest = useRef<AbortController | null>(null);
  const remoteRequestSequence = useRef(0);
  const scene = history.at(-1) ?? initialScene;
  const visualScene = useMemo<SceneState>(() => ({
    ...scene,
    entities: scene.entities.map((entity) => {
      if (entity.kind !== "generic" || entity.glyph || !entity.label) return entity;
      const resolution = glyphResolver.current!.resolve(entity.label);
      return resolution.glyph ? { ...entity, glyph: resolution.glyph,
        glyphSource: resolution.status === "placeholder" ? "streaming" : resolution.source === "cache" ? "deferred" : resolution.source === "glyph-pack" ? "glyph-pack" : "emoji" } : entity;
    })
  // The service emits only after a validated glyph replaces a placeholder.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [scene, glyphRevision]);
  const canUndo = history.length > 1;
  const filteredTestedPhrases = useMemo(() => {
    const query = exampleSearch.trim().toLowerCase();
    return query
      ? allTestedPhrases.filter(({ text, layout }) => `${text} ${layout}`.toLowerCase().includes(query))
      : allTestedPhrases;
  }, [exampleSearch]);

  useEffect(() => {
    let active = true;
    const unsubscribe = glyphResolver.current!.subscribe(() => setGlyphRevision((current) => current + 1));
    void loadGlyphCache().then((persisted) => {
      if (!active) return;
      glyphResolver.current!.seedCache(persisted);
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!localDevelopment) return;
    const controller = new AbortController();
    void fetch("/api/tegeera-ai/health", { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ configured?: boolean }> : null)
      .then((health) => {
        if (controller.signal.aborted || !health?.configured) return;
        setLocalAiEnabled(true);
        setAiStatus("Connected automatically (local)");
      }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    glyphResolver.current!.setGenerator(openRouterKey
      ? (noun, signal, publishStroke) => generateStrokeGlyphRemotely(noun, openRouterKey, signal, publishStroke)
      : localAiEnabled ? (noun, signal, publishStroke) => generateStrokeGlyphRemotely(noun, "", signal, publishStroke, DEFAULT_FREE_GLYPH_MODEL, true)
      : undefined);
  }, [openRouterKey, localAiEnabled]);

  useEffect(() => () => {
    remoteRequestSequence.current += 1;
    remoteRequest.current?.abort();
  }, []);

  const cancelPendingRemote = () => {
    remoteRequestSequence.current += 1;
    remoteRequest.current?.abort();
    remoteRequest.current = null;
    setRemoteBusy(false);
  };

  // The resolver update event triggers a rerender when a noun becomes editable.
  const editableNouns = [...new Set(scene.entities.filter((entity) => entity.label && glyphResolver.current!.hasEditableStrokes(entity.label))
    .map((entity) => entity.label!))];

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

  const submit = (
    text = input,
    speechTiming?: AcceptedSpeechTranscript,
    targetScene = scene,
    replaceScene = false
  ) => {
    // An older model response must never replace a newer explanation or demo.
    cancelPendingRemote();
    setPendingGlyphReview([]);
    const receivedAt = speechTiming?.finalReceivedAt ?? performance.now();
    const source: InputSource = speechTiming ? "speech" : "typed";
    const markDecision = (outcome: PipelineOutcome) => {
      pendingLatency.current = {
        id: ++latencySequence.current, source, outcome, receivedAt,
        decisionAt: performance.now(), speechFinalizationMs: speechTiming?.finalizationMs
      };
    };
    const interpretation = interpretTeacherText(text, targetScene);
    if (!interpretation.ok) {
      if (remoteInterpreterEnabled(openRouterKey, localAiEnabled)) {
        const requestId = remoteRequestSequence.current;
        const controller = new AbortController();
        remoteRequest.current = controller;
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 20_000);
        setRemoteBusy(true);
        setHoldNotice(null);
        setClarification(null);
        setIssues([{ gate: "confidence", message: "Understanding your explanation…" }]);
        const reusableNouns = [...offlineGlyphCatalog.pack.keys(), ...glyphCache.current.keys()]
          .filter((noun) => text.toLowerCase().includes(noun)).slice(0, 12);
        void interpretRemotely(text, targetScene, openRouterKey, controller.signal, reusableNouns, localAiEnabled).then(({ candidate, model }) => {
          if (requestId !== remoteRequestSequence.current || controller.signal.aborted) return;
          setLastRemoteModel(model ?? "OpenRouter-selected free model");
          setAiStatus("Enabled and working");
          const compiled = compileUniversalScene(candidate, targetScene, text, {
            ...offlineGlyphCatalog, cache: glyphCache.current
          });
          const result = validateDoodleScript(compiled, targetScene);
          if (!result.ok) {
            markDecision("reject");
            setAiStatus("Enabled, but the last visual plan was rejected safely");
            setClarification(null);
            setIssues(result.issues.slice(0, 1));
            return;
          }
          const isHold = result.script.commands.length === 1 && result.script.commands[0].action === "hold";
          const nextScene = isHold ? targetScene : applyDoodleScript(targetScene, result.script);
          markDecision(isHold ? "hold" : "draw");
          setPendingGlyphReview(result.script.commands.flatMap((command) =>
            command.action === "create" && command.entity.glyphSource === "generated"
              && command.entity.glyph && command.entity.label
              ? [{ noun: glyphKey(command.entity.label), glyph: command.entity.glyph }] : []
          ));
          if (!isHold) setHistory((current) => replaceScene ? [initialScene, nextScene] : [...current, nextScene]);
          setInput("");
          setIssues([]);
          setClarification(null);
          setHoldNotice(isHold ? "Break recognized. The current drawing is unchanged." : null);
        }).catch((error: unknown) => {
          if (requestId !== remoteRequestSequence.current) return;
          setAiStatus("Enabled, but the last request failed safely");
          markDecision("clarify");
          setClarification(null);
          setIssues([{ gate: "confidence", message: timedOut
            ? "AI understanding took too long. The previous drawing is safe; try again or shorten the explanation."
            : `AI understanding could not complete: ${error instanceof Error ? error.message : "unknown service error"}` }]);
        }).finally(() => {
          clearTimeout(timer);
          if (requestId !== remoteRequestSequence.current) return;
          remoteRequest.current = null;
          setRemoteBusy(false);
        });
        return;
      }
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
    const result = validateDoodleScript(interpretation.script, targetScene);
    if (!result.ok) {
      markDecision("reject");
      setHoldNotice(null);
      setClarification(null);
      setIssues(result.issues);
      return;
    }
    const isHold = result.script.commands.length === 1 && result.script.commands[0].action === "hold";
    const nextScene = isHold ? targetScene : applyDoodleScript(targetScene, result.script);
    markDecision(isHold ? "hold" : "draw");
    if (!isHold) setHistory((current) => replaceScene ? [initialScene, nextScene] : [...current, nextScene]);
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
  const liveVisualHints = useMemo(() => extractEmojiPreviews(speech.partialTranscript || input), [speech.partialTranscript, input]);
  useEffect(() => {
    if ((!openRouterKey && !localAiEnabled) || !speech.partialTranscript.trim()) return;
    const timer = setTimeout(() => glyphResolver.current!.speculativePrefetch(speech.partialTranscript), 400);
    return () => clearTimeout(timer);
  }, [openRouterKey, localAiEnabled, speech.partialTranscript]);
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
            <img src="./brand/tegeera-mark-v1.png" alt="" />
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

      <aside className="development-note" role="note">
        <strong>You are seeing the vision in active development.</strong>
        <span>Tegeera is not fully ready yet and has only reached a small early group of testers. These demonstrations are backed by automated semantic and rendering checks. Try them, challenge them, and help the vision of accessible real-time explanation grow.</span>
      </aside>

      <DoodleCanvas scene={visualScene}>

      <section className="control-card">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor="teacher-input">Your explanation</label>
          <div className={`input-row ${remoteBusy ? "has-stop-ai" : ""}`}>
            <input
              id="teacher-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Imagine three students waiting in a queue…"
              autoComplete="off"
            />
            <button className="draw-button" type="submit">
              {remoteBusy ? "Update drawing" : "Draw it"}
            </button>
            {remoteBusy ? <button className="stop-ai-button" type="button" onClick={() => {
              cancelPendingRemote();
              setIssues([]);
              setHoldNotice("AI request stopped. The previous drawing is unchanged.");
            }}>Stop AI</button> : null}
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

        {liveVisualHints.length ? <div className="live-visual-hints" role="note" aria-label="Unverified instant visual hints">
          <strong>Instant visual hints</strong>
          <span>These are offline previews, not the checked drawing or its relationships.</span>
          <div className="live-visual-hint-list">{liveVisualHints.map(({ label, emoji }) => <span className="live-visual-hint" key={label}><span aria-hidden="true">{emoji}</span>{label}</span>)}</div>
        </div> : null}

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

        {editableNouns.length && (openRouterKey || localAiEnabled) ? <details className="latency-panel">
          <summary>Refine a doodle (optional)</summary>
          <label htmlFor="edit-glyph-noun">Drawing</label>
          <select id="edit-glyph-noun" value={editableNouns.includes(editNoun) ? editNoun : editableNouns[0]} onChange={(event) => setEditNoun(event.target.value)}>
            {editableNouns.map((noun) => <option key={noun} value={noun}>{noun}</option>)}
          </select>
          <label htmlFor="edit-glyph-instruction">One visual change</label>
          <input id="edit-glyph-instruction" value={editInstruction} onChange={(event) => setEditInstruction(event.target.value)} maxLength={160} placeholder="For example, add two small wings" />
          <button type="button" disabled={editBusy || !editInstruction.trim()} onClick={() => {
            const noun = editableNouns.includes(editNoun) ? editNoun : editableNouns[0];
            setEditBusy(true);
            setEditStatus("Applying a bounded stroke edit…");
            void glyphResolver.current!.editGlyph(noun, editInstruction,
              (name, current, instruction, signal) => editStrokeGlyphRemotely(name, current, instruction, openRouterKey, signal, DEFAULT_FREE_GLYPH_MODEL, localAiEnabled)
            ).then((ok) => {
              setEditStatus(ok ? "Doodle updated. Other scene objects stayed unchanged." : "The edit was rejected or timed out; the drawing is unchanged.");
              if (ok) setEditInstruction("");
            }).finally(() => setEditBusy(false));
          }}>Refine drawing</button>
          {editStatus ? <output>{editStatus}</output> : null}
          <small>This sends the selected generated strokes and your short instruction to the configured model. Edits are validated before replacing the cached doodle.</small>
        </details> : null}

        <details className="latency-panel">
          <summary>Prepare a lesson (optional)</summary>
          <label htmlFor="lesson-topic">Lesson topic</label>
          <input id="lesson-topic" value={lessonTopic} onChange={(event) => setLessonTopic(event.target.value)} placeholder="For example, plant reproduction" />
          <button type="button" disabled={(!openRouterKey && !localAiEnabled) || !lessonTopic.trim()} onClick={() => {
            setLessonPrepStatus("Planning likely drawings…");
            void glyphResolver.current!.prepareLesson(lessonTopic,
              (topic, signal) => planLessonNouns(topic, openRouterKey, signal, DEFAULT_FREE_GLYPH_MODEL, localAiEnabled)
            ).then((count) => setLessonPrepStatus(count ? `Queued up to ${count} noun doodles. The lesson remains usable while they load.` : "No nouns were queued. Check AI understanding or try a narrower topic."));
          }}>Prepare lesson nouns</button>
          <small>This asks the configured model for up to 30 likely nouns and may make up to 30 more requests. Start it explicitly only when your provider budget allows.</small>
          {lessonPrepStatus ? <output>{lessonPrepStatus}</output> : null}
        </details>

        <details className="latency-panel">
          <summary>AI understanding (optional)</summary>
          <label htmlFor="openrouter-key">OpenRouter key for this session</label>
          <input
            id="openrouter-key"
            type="password"
            value={openRouterKeyDraft}
            onChange={(event) => setOpenRouterKeyDraft(event.target.value)}
            placeholder="Paste a newly generated key"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            disabled={!openRouterKeyDraft.trim()}
            onClick={() => {
              cancelPendingRemote();
              setOpenRouterKey(openRouterKeyDraft.trim());
              setOpenRouterKeyDraft("");
              setAiStatus("Enabled for this session");
              setLastRemoteModel(null);
              setGlyphIssue("");
            }}
          >Enable AI understanding</button>
          {openRouterKey ? <button type="button" onClick={() => { cancelPendingRemote(); setOpenRouterKey(""); setAiStatus(localAiEnabled ? "Connected automatically (local)" : "Not enabled"); setLastRemoteModel(null); setGlyphIssue(""); }}>Forget key</button> : null}
          <div className="ai-connection-status" role="status" data-ai-enabled={Boolean(openRouterKey || localAiEnabled)}><strong>{aiStatus}</strong>{lastRemoteModel ? ` · Last scene model: ${lastRemoteModel}` : " · Scene router: openrouter/free"}{` · Doodle model: ${DEFAULT_FREE_GLYPH_MODEL}`}</div>
          {glyphIssue ? <p role="alert">{glyphIssue}</p> : null}
          <small>{localAiEnabled && !openRouterKey ? "Local development uses the private key from .env.local automatically; it never reaches the browser. " : "The pasted key stays in browser memory only and disappears when this page closes. "}Unsupported explanations use OpenRouter; familiar instructions remain local and fast.</small>
        </details>

        {pendingGlyphReview.length ? <section className="glyph-review" aria-label="Review generated doodles">
          <strong>Are these doodles worth reusing?</strong>
          <p>Model-made artwork is a draft. Keep only the noun drawings you recognize at a glance; they will be saved on this device, not sent to the public offline pack.</p>
          <div className="glyph-review-list">{pendingGlyphReview.map(({ noun, glyph }) => <div className="glyph-review-item" key={noun}>
            <svg viewBox="0 0 100 100" role="img" aria-label={`Generated doodle for ${noun}`}>
              {glyph.parts.map((part) => <path key={part.id} d={part.d} fill={part.fill} stroke={part.stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
            </svg>
            <span>{noun}</span>
            <button type="button" onClick={() => {
              glyphCache.current.set(noun, glyph);
              void rememberGlyph(noun, glyph);
              setPendingGlyphReview((current) => current.filter((item) => item.noun !== noun));
            }}>Keep this doodle</button>
            <button type="button" onClick={() =>
              setPendingGlyphReview((current) => current.filter((item) => item.noun !== noun))
            }>Do not reuse</button>
          </div>)}</div>
        </section> : null}

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

        <section className="showcase" aria-labelledby="showcase-title">
          <div>
            <p className="eyebrow">Demonstrated visual grammars</p>
            <h2 id="showcase-title">Try everything Tegeera can currently demonstrate</h2>
            <p>Each example below is automatically tested for interpretation and validator safety. Early public testing is still limited, so your visual feedback matters.</p>
          </div>
          {showcaseGroups.map((group) => (
            <details key={group.subject} open>
              <summary>{group.subject} · {group.examples.length}</summary>
              <div className="showcase-grid">
                {group.examples.map((example) => <button key={example} type="button" onClick={() => { setInput(example); submit(example, undefined, initialScene, true); }}>{example}</button>)}
              </div>
            </details>
          ))}
          <details>
            <summary>All {allTestedPhrases.length} accepted language probes</summary>
            <p className="architecture-note"><strong>These are not phrase-to-picture shortcuts.</strong> Every sentence is interpreted through shared semantic frames, typed relation registries, reusable layout planners and one validator. The variations deliberately change subjects, verbs and wording to test whether the same visual grammar generalizes.</p>
            <label htmlFor="example-search">Find a tested explanation</label>
            <input id="example-search" type="search" value={exampleSearch} onChange={(event) => { setExampleSearch(event.target.value); setExampleLimit(24); }} placeholder="Search plants, queues, fractions…" />
            <small>Showing {Math.min(exampleLimit, filteredTestedPhrases.length)} of {filteredTestedPhrases.length} matching probes.</small>
            <div className="showcase-grid full-library">
              {filteredTestedPhrases.slice(0, exampleLimit)
                .map(({ id, text, layout }) => <button key={id} title={`Reusable visual grammar: ${layout}`} type="button" onClick={() => { setInput(text); submit(text, undefined, initialScene, true); }}><span>{text}</span><small>{layout}</small></button>)}
            </div>
            {exampleLimit < filteredTestedPhrases.length ? <button className="load-more" type="button" onClick={() => setExampleLimit((current) => current + 24)}>Show 24 more</button> : null}
          </details>
        </section>
      </section>
      </DoodleCanvas>
      <p className="sr-only" aria-live="polite">
        {spokenSummary}
      </p>
    </main>
  );
}

export default App;
