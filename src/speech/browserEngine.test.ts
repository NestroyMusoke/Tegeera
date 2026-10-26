import { afterEach, expect, it, vi } from "vitest";
import { BrowserSpeechEngine, type BrowserRecognition } from "./browserEngine";
import { SpeechSession } from "./SpeechSession";

class Recognition implements BrowserRecognition {
  static instances: Recognition[] = [];
  lang = ""; continuous = false; interimResults = false; maxAlternatives = 0;
  onstart: BrowserRecognition["onstart"] = null;
  onresult: BrowserRecognition["onresult"] = null;
  onerror: BrowserRecognition["onerror"] = null;
  onend: BrowserRecognition["onend"] = null;
  constructor() { Recognition.instances.push(this); }
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn(() => this.onend?.());
  result(text: string, index = 0, final = true, confidence = .9) {
    const results = Array.from({ length: index + 1 }, () => ({ isFinal: final, 0: { transcript: text, confidence } }));
    this.onresult?.({ resultIndex: index, results });
  }
}
const host = (extra = {}) => ({ isSecureContext: true, SpeechRecognition: Recognition, ...extra }) as unknown as Window;
afterEach(() => { Recognition.instances = []; vi.useRealTimers(); });

it("releases a recognizer that never starts and allows a retry", async () => {
  vi.useFakeTimers();
  class Silent extends Recognition { start = vi.fn(); }
  const engine = new BrowserSpeechEngine(host({ SpeechRecognition: Silent }));
  const events = vi.fn(); engine.subscribe(events);
  const pending = engine.start();
  await vi.advanceTimersByTimeAsync(15000); await pending;
  expect(events).toHaveBeenCalledWith(expect.objectContaining({ type: "error", code: "start-timeout" }));
  expect(Recognition.instances[0].abort).toHaveBeenCalledOnce();
  const retry = engine.start();
  Recognition.instances[1].onstart?.(); await retry;
  expect(events).toHaveBeenLastCalledWith({ type: "listening", listening: true });
  await engine.cancel();
});

it("cancelling before permission resolves clears the startup deadline", async () => {
  vi.useFakeTimers();
  class Silent extends Recognition { start = vi.fn(); }
  const engine = new BrowserSpeechEngine(host({ SpeechRecognition: Silent }));
  const events = vi.fn(); engine.subscribe(events);
  const pending = engine.start(); await engine.cancel(); await pending;
  await vi.advanceTimersByTimeAsync(16000);
  expect(events).not.toHaveBeenCalled();
});

it("detects missing APIs and insecure contexts without prompting", async () => {
  expect((await new BrowserSpeechEngine(host({ SpeechRecognition: undefined })).initialize()).supported).toBe(false);
  expect((await new BrowserSpeechEngine(host({ isSecureContext: false })).initialize()).supported).toBe(false);
  expect(Recognition.instances).toHaveLength(0);
});
it("supports prefixed browsers and configures continuous recognition", async () => {
  const engine = new BrowserSpeechEngine(host({ SpeechRecognition: undefined, webkitSpeechRecognition: Recognition }));
  expect((await engine.initialize()).engine).toBe("browser");
  await engine.start();
  expect(Recognition.instances[0]).toMatchObject({ continuous: true, interimResults: true, lang: "en-US" });
});
it("deduplicates cumulative finals, emits interim text, and accepts a repeated phrase at a new index", async () => {
  const engine = new BrowserSpeechEngine(host());
  const events = vi.fn(); engine.subscribe(events); await engine.start();
  const recognition = Recognition.instances[0];
  recognition.result("a car", 0, false); recognition.result("a car"); recognition.result("a car"); recognition.result("a car", 1);
  expect(events.mock.calls.filter(([event]) => event.type === "partial")).toHaveLength(1);
  expect(events.mock.calls.filter(([event]) => event.type === "final")).toHaveLength(2);
});
it("cancel ignores late callbacks and ends the microphone", async () => {
  const engine = new BrowserSpeechEngine(host());
  const events = vi.fn(); engine.subscribe(events); await engine.start();
  const recognition = Recognition.instances[0]; await engine.cancel();
  recognition.result("clear everything"); recognition.onerror?.({ error: "network" });
  expect(recognition.abort).toHaveBeenCalledOnce();
  expect(events.mock.calls.map(([event]) => event.type)).toEqual(["listening"]);
});
it("processes many finals without restarting the recognizer, then Stop ends capture", async () => {
  const engine = new BrowserSpeechEngine(host()); const accept = vi.fn();
  const session = new SpeechSession(engine, accept, { continuous: true });
  await session.initialize(); await session.start();
  Recognition.instances[0].result("Draw a car"); Recognition.instances[0].result("Draw a book", 1);
  expect(accept).toHaveBeenCalledTimes(2);
  expect(Recognition.instances).toHaveLength(1);
  expect(session.getSnapshot().status).toBe("listening");
  await session.stop(); expect(session.getSnapshot().status).toBe("idle"); session.destroy();
});
it("does not restart on denied permission and preserves the error status", async () => {
  const engine = new BrowserSpeechEngine(host()); const session = new SpeechSession(engine, vi.fn(), { continuous: true });
  await session.initialize(); await session.start(); Recognition.instances[0].onerror?.({ error: "not-allowed" });
  expect(session.getSnapshot()).toMatchObject({ status: "error", continuousActive: false });
  session.destroy();
});
it("a denial before onstart cannot be overwritten by the pending start promise", async () => {
  class Denied extends Recognition { start = vi.fn(() => this.onerror?.({ error: "not-allowed" })); }
  const engine = new BrowserSpeechEngine(host({ SpeechRecognition: Denied }));
  const session = new SpeechSession(engine, vi.fn(), { continuous: true });
  await session.initialize(); await session.start();
  expect(session.getSnapshot()).toMatchObject({ status: "error", continuousActive: false });
  session.destroy();
});
it("recovers from unexpected end with a bounded restart", async () => {
  vi.useFakeTimers(); const engine = new BrowserSpeechEngine(host());
  const session = new SpeechSession(engine, vi.fn(), { continuous: true });
  await session.initialize(); await session.start();
  for (let i = 0; i < 4; i++) { Recognition.instances.at(-1)!.onend?.(); await vi.advanceTimersByTimeAsync(300); }
  expect(Recognition.instances).toHaveLength(4); expect(session.getSnapshot().continuousActive).toBe(false);
  session.destroy();
});
it("a low-confidence final does not close continuous recognition", async () => {
  const engine = new BrowserSpeechEngine(host()); const accept = vi.fn();
  const session = new SpeechSession(engine, accept, { continuous: true });
  await session.initialize(); await session.start();
  Recognition.instances[0].result("clear", 0, true, .1);
  Recognition.instances[0].result("Draw a book", 1);
  expect(accept).toHaveBeenCalledTimes(1); session.destroy();
});
