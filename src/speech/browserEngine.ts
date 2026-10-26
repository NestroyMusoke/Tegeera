import type { SpeechAvailability, SpeechEngine, SpeechEvent, SpeechEventListener, SpeechPermission } from "./types";

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
}
export interface BrowserRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => BrowserRecognition;
type SpeechWindow = Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };

/** Browser-owned recognition; no audio recording, upload endpoint or saved audio in Tegeera. */
export class BrowserSpeechEngine implements SpeechEngine {
  private listeners = new Set<SpeechEventListener>();
  private current?: BrowserRecognition;
  private settleStart?: () => void;
  private startTimer?: ReturnType<typeof setTimeout>;
  constructor(private readonly host: SpeechWindow = window) {}

  private constructorForBrowser(): RecognitionConstructor | undefined {
    return this.host.SpeechRecognition ?? this.host.webkitSpeechRecognition;
  }
  async initialize(): Promise<SpeechAvailability> {
    const supported = this.host.isSecureContext && Boolean(this.constructorForBrowser());
    return { supported, engine: supported ? "browser" : "unsupported", reason: supported
      ? "Browser speech may send audio to your browser's speech provider. Tap Speak to grant microphone access."
      : !this.host.isSecureContext ? "Microphone access requires HTTPS or localhost. Typed input still works."
        : "This browser does not provide speech recognition. You can type your explanation or try another browser." };
  }
  async requestPermission(): Promise<SpeechPermission> {
    // Recognition.start owns the browser permission prompt; do not open a second audio stream.
    return (await this.initialize()).supported ? "granted" : "denied";
  }
  async start(): Promise<void> {
    if (this.current) return;
    const Constructor = this.constructorForBrowser();
    if (!Constructor || !this.host.isSecureContext) throw new Error("Browser speech requires a supported browser and HTTPS.");
    const recognition = new Constructor();
    this.current = recognition;
    // English service locale supported more widely than en-UG.
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    const delivered = new Set<number>();
    let terminalError = false;
    const live = () => this.current === recognition;
    return new Promise<void>((resolve, reject) => {
      const settle = () => { clearTimeout(this.startTimer); this.startTimer = undefined; resolve(); };
      this.settleStart = settle;
      recognition.onstart = () => { if (live()) { this.emit({ type: "listening", listening: true }); settle(); } };
      recognition.onresult = event => {
        if (!live() || terminalError) return;
        const partial: string[] = [];
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result?.[0]) continue;
          if (result.isFinal && !delivered.has(i)) {
            delivered.add(i);
            const confidence = result[0].confidence;
            this.emit({ type: "final", transcript: result[0].transcript,
              // Some implementations report 0 when confidence is unavailable.
              confidence: Number.isFinite(confidence) && confidence > 0 && confidence <= 1 ? confidence : null,
              continues: true });
          } else if (!result.isFinal) partial.push(result[0].transcript);
          if (!live()) return; // Consumer may cancel in response to backpressure.
        }
        if (partial.length) this.emit({ type: "partial", transcript: partial.join(" "), confidence: null });
      };
      recognition.onerror = event => {
        if (!live()) return;
        terminalError = true;
        const messages: Record<string, string> = {
          "not-allowed": "Microphone permission was denied. Enable it in your browser's site settings to try again.",
          "service-not-allowed": "Your browser blocked its speech recognition service.",
          "audio-capture": "No working microphone was found.",
          "language-not-supported": "This browser's speech service does not support English. Try Chrome with speech services enabled.",
          "start-timeout": "The microphone did not start. Allow microphone access in this site's browser settings, then tap Speak again. If it still fails, open this page directly in Chrome.",
          network: "The browser speech service could not connect. Check your connection.",
          "no-speech": "No speech was recognized.",
          aborted: "Speech recognition was interrupted."
        };
        // Release before notifying: a retry must not reuse an ended recognizer.
        this.current = undefined;
        this.settleStart = undefined;
        this.emit({ type: "error", code: event.error === "no-speech" ? "6" : event.error,
          message: messages[event.error] ?? "Browser speech recognition stopped unexpectedly." });
        settle();
        try { recognition.abort(); } catch { /* already ended */ }
      };
      recognition.onend = () => {
        if (!live()) return;
        this.current = undefined;
        this.settleStart = undefined;
        settle();
        if (!terminalError) this.emit({ type: "ended" });
      };
      this.startTimer = setTimeout(() => {
        if (live()) recognition.onerror?.({ error: "start-timeout" });
      }, 15000);
      try { recognition.start(); }
      catch (error) { clearTimeout(this.startTimer); this.current = undefined; this.settleStart = undefined; reject(error); }
    });
  }
  async stop(): Promise<void> { this.current?.stop(); }
  async cancel(): Promise<void> {
    const recognition = this.current;
    this.current = undefined;
    this.settleStart?.(); this.settleStart = undefined;
    recognition?.abort();
  }
  subscribe(listener: SpeechEventListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private emit(event: SpeechEvent): void { this.listeners.forEach(listener => listener(event)); }
}
