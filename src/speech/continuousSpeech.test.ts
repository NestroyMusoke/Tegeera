import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SpeechSession } from "./SpeechSession";
import { TestSpeechEngine } from "./testEngine";
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
it("recovers from an empty final instead of becoming stuck processing", async () => {
  const engine = new TestSpeechEngine();
  const accept = vi.fn();
  const session = new SpeechSession(engine, accept, { continuous: true });
  await session.initialize(); await session.start();
  engine.emit({ type: "final", transcript: "  ", confidence: null });
  await vi.advanceTimersByTimeAsync(300);
  expect(engine.calls.filter(call => call === "start")).toHaveLength(2);
  expect(accept).not.toHaveBeenCalled();
  session.destroy();
});
it("continues across final results and stops between phrases", async () => {
  const engine = new TestSpeechEngine();
  const accept = vi.fn();
  const session = new SpeechSession(engine, accept, { continuous: true });
  await session.initialize(); await session.start();
  engine.emit({ type: "final", transcript: "A car moves", confidence: .9 });
  engine.emit({ type: "final", transcript: "A car moves", confidence: .9 });
  expect(accept).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(300);
  engine.emit({ type: "final", transcript: "A book is on a table", confidence: .9 });
  expect(accept).toHaveBeenCalledTimes(2);
  await session.stop(); await vi.runAllTimersAsync();
  expect(engine.calls.filter(call => call === "start")).toHaveLength(2);
  expect(session.getSnapshot().continuousActive).toBe(false);
});
it("ignores late results after cancel and does not retry permission errors", async () => {
  const engine = new TestSpeechEngine();
  const accept = vi.fn();
  const session = new SpeechSession(engine, accept, { continuous: true });
  await session.initialize(); await session.start(); await session.cancel();
  engine.emit({ type: "final", transcript: "clear everything", confidence: .9 });
  expect(accept).not.toHaveBeenCalled();
  await session.start();
  engine.emit({ type: "error", code: "9", message: "Permission denied" });
  await vi.runAllTimersAsync();
  expect(engine.calls.filter(call => call === "start")).toHaveLength(2);
  expect(session.getSnapshot().status).toBe("error");
});
it("bounds silence retries", async () => {
  const engine = new TestSpeechEngine();
  const session = new SpeechSession(engine, vi.fn(), { continuous: true });
  await session.initialize(); await session.start();
  for (let i = 0; i < 4; i++) {
    engine.emit({ type: "error", code: "6", message: "No speech" });
    await vi.advanceTimersByTimeAsync(300);
  }
  expect(engine.calls.filter(call => call === "start")).toHaveLength(4);
  expect(session.getSnapshot().continuousActive).toBe(false);
});
it("cancel during permission request prevents late microphone start", async () => {
  const engine = new TestSpeechEngine();
  let grant!: (permission: "granted") => void;
  engine.requestPermission = () => new Promise(resolve => { grant = resolve; });
  const session = new SpeechSession(engine, vi.fn(), { continuous: true });
  await session.initialize();
  const starting = session.start();
  await session.cancel(); grant("granted"); await starting;
  expect(engine.calls).not.toContain("start");
});
