import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpeechSession } from "./SpeechSession";
import { TestSpeechEngine } from "./testEngine";

describe("SpeechSession", () => {
  beforeEach(() => vi.useFakeTimers());

  it("reports an unsupported engine while preserving typed fallback", async () => {
    const engine = new TestSpeechEngine();
    engine.availability = {
      supported: false,
      engine: "test",
      reason: "No recognizer"
    };
    const session = new SpeechSession(engine, vi.fn());

    await session.initialize();

    expect(session.getSnapshot()).toMatchObject({
      status: "unavailable",
      message: "No recognizer"
    });
  });

  it("requests permission before it starts listening", async () => {
    const engine = new TestSpeechEngine();
    const session = new SpeechSession(engine, vi.fn());
    await session.initialize();

    await session.start();

    expect(engine.calls).toEqual(["initialize", "requestPermission", "start"]);
    expect(session.getSnapshot().status).toBe("listening");
  });

  it("does not start when microphone permission is denied", async () => {
    const engine = new TestSpeechEngine();
    engine.permission = "denied";
    const session = new SpeechSession(engine, vi.fn());
    await session.initialize();

    await session.start();

    expect(engine.calls).not.toContain("start");
    expect(session.getSnapshot().status).toBe("error");
  });

  it("shows partial speech and marks it stable without changing the scene", async () => {
    const engine = new TestSpeechEngine();
    const accept = vi.fn();
    const session = new SpeechSession(engine, accept);
    await session.initialize();
    await session.start();

    engine.emit({
      type: "partial",
      transcript: "draw three students",
      confidence: null
    });
    expect(session.getSnapshot().partialTranscript).toBe("draw three students");
    expect(session.getSnapshot().stableTranscript).toBe("");

    await vi.advanceTimersByTimeAsync(800);

    expect(session.getSnapshot().stableTranscript).toBe("draw three students");
    expect(accept).not.toHaveBeenCalled();
  });

  it("accepts one confident final transcript", async () => {
    const engine = new TestSpeechEngine();
    const accept = vi.fn();
    const session = new SpeechSession(engine, accept);
    await session.initialize();
    await session.start();

    engine.emit({
      type: "final",
      transcript: "  Draw   a car  ",
      confidence: 0.91
    });

    expect(accept).toHaveBeenCalledOnce();
    expect(accept).toHaveBeenCalledWith("Draw a car");
    expect(session.getSnapshot().status).toBe("idle");
  });

  it("stops listening without applying an unfinished partial result", async () => {
    const engine = new TestSpeechEngine();
    const accept = vi.fn();
    const session = new SpeechSession(engine, accept);
    await session.initialize();
    await session.start();
    engine.emit({ type: "partial", transcript: "remove the", confidence: 0.8 });

    await session.stop();

    expect(engine.calls).toContain("stop");
    expect(accept).not.toHaveBeenCalled();
    expect(session.getSnapshot().status).toBe("processing");
  });

  it("rejects a low-confidence final transcript", async () => {
    const engine = new TestSpeechEngine();
    const accept = vi.fn();
    const session = new SpeechSession(engine, accept);
    await session.initialize();
    await session.start();

    engine.emit({
      type: "final",
      transcript: "clear everything",
      confidence: 0.2
    });

    expect(accept).not.toHaveBeenCalled();
    expect(session.getSnapshot().status).toBe("needs-clarification");
  });

  it("cancels without accepting the partial transcript", async () => {
    const engine = new TestSpeechEngine();
    const accept = vi.fn();
    const session = new SpeechSession(engine, accept);
    await session.initialize();
    await session.start();
    engine.emit({ type: "partial", transcript: "clear", confidence: 0.9 });

    await session.cancel();
    await vi.runAllTimersAsync();

    expect(engine.calls).toContain("cancel");
    expect(accept).not.toHaveBeenCalled();
    expect(session.getSnapshot()).toMatchObject({
      status: "idle",
      partialTranscript: "",
      stableTranscript: ""
    });
  });

  it("reports engine errors without losing the last accepted scene", async () => {
    const engine = new TestSpeechEngine();
    const accept = vi.fn();
    const session = new SpeechSession(engine, accept);
    await session.initialize();
    await session.start();

    engine.emit({
      type: "error",
      code: "no_match",
      message: "I could not understand that phrase."
    });

    expect(accept).not.toHaveBeenCalled();
    expect(session.getSnapshot()).toMatchObject({
      status: "error",
      message: expect.stringContaining("Typed input is still available")
    });
  });
});
