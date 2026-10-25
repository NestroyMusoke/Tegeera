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
  continuousActive?: boolean;
  status: SpeechStatus;
  availability?: SpeechAvailability;
  partialTranscript: string;
  stableTranscript: string;
  confidence: number | null;
  message?: string;
}

export interface AcceptedSpeechTranscript {
  finalReceivedAt: number;
  finalizationMs?: number;
}

export const initialSpeechSnapshot: SpeechSnapshot = {
  status: "checking",
  partialTranscript: "",
  stableTranscript: "",
  confidence: null
};

interface SpeechSessionOptions {
  continuous?: boolean;
  minimumConfidence?: number;
  stabilityDelayMs?: number;
  stopTimeoutMs?: number;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
  now?: () => number;
}

export class SpeechSession {
  private snapshot: SpeechSnapshot = initialSpeechSnapshot;
  private readonly listeners = new Set<() => void>();
  private engineUnsubscribe?: () => void;
  private stabilityTimer?: ReturnType<typeof setTimeout>;
  private stopTimer?: ReturnType<typeof setTimeout>;
  private readonly stopTimeoutMs: number;
  private readonly minimumConfidence: number;
  private readonly stabilityDelayMs: number;
  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;
  private readonly now: () => number;
  private stopRequestedAt?: number;
  private keepListening = false;
  private accepting = false;
  private generation = 0;
  private restartTimer?: ReturnType<typeof setTimeout>;
  private quietRetries = 0;
  private readonly continuous: boolean;

  constructor(
    private readonly engine: SpeechEngine,
    private readonly acceptTranscript: (transcript: string, timing: AcceptedSpeechTranscript) => void,
    options: SpeechSessionOptions = {}
  ) {
    this.continuous = options.continuous ?? false;
    this.minimumConfidence = options.minimumConfidence ?? 0.58;
    this.stabilityDelayMs = options.stabilityDelayMs ?? 800;
    this.stopTimeoutMs = options.stopTimeoutMs ?? 5000;
    this.setTimer = options.setTimer ?? setTimeout;
    this.clearTimer = options.clearTimer ?? clearTimeout;
    this.now = options.now ?? (() => performance.now());
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
    if (this.accepting || this.keepListening) return;
    const generation = ++this.generation;
    this.keepListening = this.continuous;
    this.accepting = true;
    this.quietRetries = 0;
    this.update({
      ...this.snapshot,
      status: "requesting-permission",
      message: undefined
    });
    try {
      this.stopRequestedAt = undefined;
      const permission = await this.engine.requestPermission();
      if (generation !== this.generation) return;
      if (permission !== "granted") {
        this.keepListening = false;
        this.accepting = false;
        this.update({
          ...this.snapshot,
          status: "error",
          message: "Microphone permission was not granted. You can keep using typed input."
        });
        return;
      }
      await this.engine.start();
      // Cancel already invalidated the old operation. Never cancel a newer session.
      if (generation !== this.generation) return;
      if (!this.accepting) return; // An asynchronous browser denial/end already updated the status.
      this.update({
        ...this.snapshot,
        status: "listening",
        partialTranscript: "",
        stableTranscript: "",
        confidence: null,
        message: "Listening…"
      });
    } catch (error) {
      if (generation === this.generation) this.fail("Could not start listening", error);
    }
  }

  async stop(): Promise<void> {
    const generation = this.generation;
    this.keepListening = false;
    this.clearRestartTimer();
    if (this.snapshot.status === "requesting-permission") { await this.cancel(); return; }
    if (!this.accepting) {
      this.update({ ...this.snapshot, status: "idle", message: undefined });
      return;
    }
    this.clearStabilityTimer();
    this.stopRequestedAt = this.now();
    this.update({ ...this.snapshot, status: "processing", message: "Finishing…" });
    this.clearStopTimer();
    this.stopTimer = this.setTimer(() => {
      if (generation !== this.generation || !this.accepting) return;
      this.fail("Speech did not finish in time", new Error("Please retry or use typed input"));
      void this.engine.cancel().catch(() => undefined);
    }, this.stopTimeoutMs);
    try {
      await this.engine.stop();
    } catch (error) {
      if (generation === this.generation) this.fail("Could not stop listening", error);
    }
  }

  async cancel(): Promise<void> {
    const generation = ++this.generation;
    this.keepListening = false;
    this.accepting = false;
    this.clearRestartTimer();
    this.clearStabilityTimer();
    this.clearStopTimer();
    let failed = false;
    try {
      await this.engine.cancel();
    } catch (error) {
      failed = true;
      if (generation === this.generation) this.fail("Could not cancel listening", error);
      return;
    } finally {
      if (generation === this.generation && !failed) this.update({
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
    ++this.generation;
    this.keepListening = false;
    const wasAccepting = this.accepting;
    this.accepting = false;
    this.clearRestartTimer();
    this.clearStopTimer();
    if (wasAccepting) void this.engine.cancel().catch(() => undefined);
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
    if (!this.accepting) return;
    if (event.type === "ended") {
      this.clearStopTimer();
      this.accepting = false;
      this.clearStabilityTimer();
      if (this.keepListening && ++this.quietRetries <= 3) this.scheduleRestart();
      else {
        this.keepListening = false;
        this.update({ ...this.snapshot, status: "idle", partialTranscript: "", message: "Listening stopped. Tap Speak to start again." });
      }
      return;
    }
    if (event.type === "error") {
      this.clearStopTimer();
      this.clearStabilityTimer();
      this.accepting = false;
      // Android speech timeout/no match: recover briefly, never loop on permissions/network.
      if (this.keepListening && ["6", "7"].includes(event.code) && ++this.quietRetries <= 3) {
        this.scheduleRestart();
        return;
      }
      this.keepListening = false;
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
    if (!transcript) {
      // Continuous browser recognition can emit an empty final while still live.
      // Wait for its next result/end instead of starting a second recognizer.
      if (event.type === "final" && event.continues) return;
      if (event.type === "final") this.handleEngineEvent({ type: "error", code: "7", message: "No words were recognized." });
      return;
    }

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
    this.accepting = event.continues === true;
    if (!this.accepting) this.clearStopTimer();
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
      if (this.keepListening && !event.continues) this.scheduleRestart();
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
    const finalReceivedAt = this.now();
    const acceptedGeneration = this.generation;
    this.acceptTranscript(transcript, {
      finalReceivedAt,
      ...(this.stopRequestedAt === undefined ? {} : { finalizationMs: finalReceivedAt - this.stopRequestedAt })
    });
    if (acceptedGeneration !== this.generation) return;
    this.stopRequestedAt = undefined;
    this.quietRetries = 0;
    this.update({
      ...this.snapshot,
      status: event.continues && this.keepListening ? "listening" : event.continues ? "processing" : "idle",
      partialTranscript: "",
      message: undefined
    });
    if (this.keepListening && !event.continues) this.scheduleRestart();
  }

  private scheduleRestart(): void {
    this.clearRestartTimer();
    this.update({ ...this.snapshot, status: "listening", message: "Continuing to listen…" });
    const generation = this.generation;
    // Native recognizer releases itself after delivering the final event.
    this.restartTimer = this.setTimer(() => {
      this.restartTimer = undefined;
      if (!this.keepListening || generation !== this.generation) return;
      this.accepting = true;
      void this.engine.start().catch(error => {
        if (generation === this.generation) this.fail("Could not continue listening", error);
      });
    }, 300);
  }

  private clearRestartTimer(): void {
    if (this.restartTimer !== undefined) this.clearTimer(this.restartTimer);
    this.restartTimer = undefined;
  }

  private fail(prefix: string, error: unknown): void {
    this.keepListening = false;
    this.accepting = false;
    this.clearRestartTimer();
    this.clearStabilityTimer();
    this.clearStopTimer();
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

  private clearStopTimer(): void {
    if (this.stopTimer !== undefined) this.clearTimer(this.stopTimer);
    this.stopTimer = undefined;
  }

  private update(snapshot: SpeechSnapshot): void {
    this.snapshot = { ...snapshot, continuousActive: this.keepListening };
    this.listeners.forEach((listener) => listener());
  }
}
