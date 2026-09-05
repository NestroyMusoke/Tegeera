import { useMemo, useState } from "react";
import { DoodleCanvas } from "./components/DoodleCanvas";
import { parseTeacherText } from "./doodlescript/parser";
import { applyDoodleScript, initialScene } from "./doodlescript/scene";
import type { SceneState } from "./doodlescript/schema";
import {
  validateDoodleScript,
  type GateIssue
} from "./doodlescript/validator";
import { useSpeechSession } from "./speech/useSpeechSession";

const suggestions = [
  "Draw three students waiting in a queue",
  "Add a teacher",
  "Draw a car",
  "Move the car left"
];

function App() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<SceneState[]>([initialScene]);
  const [issues, setIssues] = useState<GateIssue[]>([]);
  const scene = history.at(-1) ?? initialScene;
  const canUndo = history.length > 1;

  const spokenSummary = useMemo(
    () =>
      scene.entities.length
        ? scene.entities.map((entity) => entity.label ?? entity.kind).join(", ")
        : "Nothing drawn yet",
    [scene.entities]
  );

  const submit = (text = input) => {
    const script = parseTeacherText(text, scene);
    if (!script) {
      setIssues([
        {
          gate: "confidence",
          message:
            "I heard you, but I need a clearer object or action. Try a person, student, teacher, car, book, tree, or building."
        }
      ]);
      return;
    }
    const result = validateDoodleScript(script, scene);
    if (!result.ok) {
      setIssues(result.issues);
      return;
    }
    setHistory((current) => [...current, applyDoodleScript(scene, result.script)]);
    setInput("");
    setIssues([]);
  };

  const undo = () => {
    if (!canUndo) return;
    setHistory((current) => current.slice(0, -1));
    setIssues([]);
  };

  const speech = useSpeechSession((transcript) => submit(transcript));
  const isListening = speech.status === "listening";
  const speechBusy =
    speech.status === "checking" ||
    speech.status === "requesting-permission" ||
    speech.status === "processing";

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

      <DoodleCanvas scene={scene} />

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

        {issues.length ? (
          <div className="clarification" role="status">
            <strong>Help me understand</strong>
            <span>{issues[0].message}</span>
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
      <p className="sr-only" aria-live="polite">
        {spokenSummary}
      </p>
    </main>
  );
}

export default App;
