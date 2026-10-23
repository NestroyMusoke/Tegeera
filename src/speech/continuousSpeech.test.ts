import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SpeechSession } from "./SpeechSession";
import { TestSpeechEngine } from "./testEngine";
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
it.each([false, true])("ignores stale start completion (reject=%s) after a new session starts", async reject => {
  const engine = new TestSpeechEngine();
  let finish!: () => void;
  const pending = new Promise<void>((resolve, fail) => { finish = () => reject ? fail(new Error("old failure")) : resolve(); });
  engine.start = vi.fn().mockReturnValueOnce(pending).mockResolvedValue(undefined);
  const session = new SpeechSession(engine, vi.fn(), { continuous: true });
  await session.initialize();
  const oldStart = session.start();
  await Promise.resolve();
  await session.cancel();
  await session.start();
  finish(); await oldStart;
  expect(session.getSnapshot().status).toBe("listening");
  expect(engine.calls.filter(call => call === "cancel")).toHaveLength(1);
  session.destroy();
});
it("does not let delayed cancellation erase a new session", async () => {
  const engine = new TestSpeechEngine();
  let finish!: () => void;
  engine.cancel = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; })).mockResolvedValue(undefined);
  const session = new SpeechSession(engine, vi.fn(), { continuous: true });
  await session.initialize(); await session.start();
  const cancelling = session.cancel();
  await session.start(); finish(); await cancelling;
  expect(session.getSnapshot().status).toBe("listening");
  session.destroy();
});
it("keeps browser recognition live after an empty continuous final", async () => {
  const engine = new TestSpeechEngine();
  const accept = vi.fn();
  const session = new SpeechSession(engine, accept, { continuous: true });
  await session.initialize(); await session.start();
  engine.emit({ type: "final", transcript: " ", confidence: null, continues: true });
  engine.emit({ type: "final", transcript: "Two satellites orbit a planet", confidence: .9, continues: true });
  expect(accept).toHaveBeenCalledOnce();
  expect(session.getSnapshot().status).toBe("listening");
  expect(engine.calls.filter(call => call === "start")).toHaveLength(1);
  session.destroy();
});
it("handles cancellation failure without an unhandled rejection", async () => {
  const engine = new TestSpeechEngine();
  engine.cancel = vi.fn().mockRejectedValue(new Error("microphone unavailable"));
  const session = new SpeechSession(engine, vi.fn());
  await session.initialize(); await session.start();
  await expect(session.cancel()).resolves.toBeUndefined();
  expect(session.getSnapshot().status).toBe("error");
  session.destroy();
});
it("ignores a delayed stop failure after restarting", async () => {
  const engine = new TestSpeechEngine();
  let rejectStop!: (error: Error) => void;
  engine.stop = () => new Promise<void>((_resolve, reject) => { rejectStop = reject; });
  const session = new SpeechSession(engine, vi.fn(), { continuous: true });
  await session.initialize(); await session.start();
  const stopping = session.stop();
  await session.cancel(); await session.start();
  rejectStop(new Error("old stop failure")); await stopping;
  expect(session.getSnapshot().status).toBe("listening");
  session.destroy();
});
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
