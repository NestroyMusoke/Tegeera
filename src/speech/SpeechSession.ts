import type { SpeechAvailability, SpeechEngine, SpeechEvent } from "./types";

export type SpeechStatus =
  | "checking"
  | "unavailable"
  | "idle"
  | "requesting-permission"
  | "listening"
  | "processing"
  | "needs-clarification"
  | "error";

export interface SpeechSnapshot {
  status: SpeechStatus;
  availability?: SpeechAvailability;
  partialTranscript: string;
  stableTranscript: string;
  confidence: number | null;
  message?: string;
}

export const initialSpeechSnapshot: SpeechSnapshot = {
  status: "checking",
  partialTranscript: "",
  stableTranscript: "",
  confidence: null
};

interface SpeechSessionOptions {
  minimumConfidence?: number;
  stabilityDelayMs?: number;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
}

export class SpeechSession {
  private snapshot: SpeechSnapshot = initialSpeechSnapshot;
  private readonly listeners = new Set<() => void>();
  private engineUnsubscribe?: () => void;
  private stabilityTimer?: ReturnType<typeof setTimeout>;
  private readonly minimumConfidence: number;
  private readonly stabilityDelayMs: number;
  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;

  constructor(
    private readonly engine: SpeechEngine,
    private readonly acceptTranscript: (transcript: string) => void,
    options: SpeechSessionOptions = {}
  ) {
    this.minimumConfidence = options.minimumConfidence ?? 0.58;
    this.stabilityDelayMs = options.stabilityDelayMs ?? 800;
    this.setTimer = options.setTimer ?? setTimeout;
    this.clearTimer = options.clearTimer ?? clearTimeout;
  }

  readonly getSnapshot = (): SpeechSnapshot => this.snapshot;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async initialize(): Promise<void> {
    this.ensureEngineSubscription();
    try {
      const availability = await this.engine.initialize();
      this.update({
        ...initialSpeechSnapshot,
        availability,
        status: availability.supported ? "idle" : "unavailable",
        message: availability.reason
      });
    } catch (error) {
      this.fail("Speech setup failed", error);
    }
  }

  async start(): Promise<void> {
    if (!this.snapshot.availability?.supported) return;
    this.update({
      ...this.snapshot,
      status: "requesting-permission",
      message: undefined
    });
    try {
      const permission = await this.engine.requestPermission();
      if (permission !== "granted") {
        this.update({
          ...this.snapshot,
          status: "error",
          message: "Microphone permission was not granted. You can keep using typed input."
        });
        return;
      }
      await this.engine.start();
      this.update({
        ...this.snapshot,
        status: "listening",
        partialTranscript: "",
        stableTranscript: "",
        confidence: null,
        message: "Listening…"
      });
    } catch (error) {
      this.fail("Could not start listening", error);
    }
  }

  async stop(): Promise<void> {
    if (this.snapshot.status !== "listening") return;
    this.clearStabilityTimer();
    this.update({ ...this.snapshot, status: "processing", message: "Finishing…" });
    try {
      await this.engine.stop();
    } catch (error) {
      this.fail("Could not stop listening", error);
    }
  }

  async cancel(): Promise<void> {
    this.clearStabilityTimer();
    try {
      await this.engine.cancel();
    } finally {
      this.update({
        ...this.snapshot,
        status: this.snapshot.availability?.supported ? "idle" : "unavailable",
        partialTranscript: "",
        stableTranscript: "",
        confidence: null,
        message: undefined
      });
    }
  }

  destroy(): void {
    this.clearStabilityTimer();
    this.engineUnsubscribe?.();
    this.engineUnsubscribe = undefined;
  }

  private ensureEngineSubscription(): void {
    if (!this.engineUnsubscribe) {
      this.engineUnsubscribe = this.engine.subscribe((event) =>
        this.handleEngineEvent(event)
      );
    }
  }

  private handleEngineEvent(event: SpeechEvent): void {
    if (event.type === "error") {
      this.clearStabilityTimer();
      this.update({
        ...this.snapshot,
        status: "error",
        message: `${event.message} Typed input is still available.`
      });
      return;
    }

    if (event.type === "listening") {
      if (event.listening) {
        this.update({ ...this.snapshot, status: "listening", message: "Listening…" });
      } else if (this.snapshot.status === "listening") {
        this.update({ ...this.snapshot, status: "processing", message: "Finishing…" });
      }
      return;
    }

    const transcript = event.transcript.trim().replace(/\s+/g, " ");
    if (!transcript) return;

    if (event.type === "partial") {
      this.clearStabilityTimer();
      this.update({
        ...this.snapshot,
        status: "listening",
        partialTranscript: transcript,
        confidence: event.confidence,
        message: "Listening…"
      });
      this.stabilityTimer = this.setTimer(() => {
        this.update({ ...this.snapshot, stableTranscript: transcript });
      }, this.stabilityDelayMs);
      return;
    }

    this.clearStabilityTimer();
    if (
      event.confidence !== null &&
      event.confidence < this.minimumConfidence
    ) {
      this.update({
        ...this.snapshot,
        status: "needs-clarification",
        partialTranscript: transcript,
        stableTranscript: transcript,
        confidence: event.confidence,
        message: "I am not certain I heard that correctly. Please try again or type the command."
      });
      return;
    }

    this.update({
      ...this.snapshot,
      status: "processing",
      partialTranscript: transcript,
      stableTranscript: transcript,
      confidence: event.confidence,
      message: "Updating the drawing…"
    });
    this.acceptTranscript(transcript);
    this.update({
      ...this.snapshot,
      status: "idle",
      partialTranscript: "",
      message: undefined
    });
  }

  private fail(prefix: string, error: unknown): void {
    const detail = error instanceof Error ? `: ${error.message}` : ".";
    this.update({
      ...this.snapshot,
      status: "error",
      message: `${prefix}${detail} Typed input is still available.`
    });
  }

  private clearStabilityTimer(): void {
    if (this.stabilityTimer !== undefined) {
      this.clearTimer(this.stabilityTimer);
      this.stabilityTimer = undefined;
    }
  }

  private update(snapshot: SpeechSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
}
