import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle
} from "@capacitor/core";
import type {
  SpeechAvailability,
  SpeechEngine,
  SpeechEvent,
  SpeechEventListener,
  SpeechPermission
} from "./types";
import { UnsupportedSpeechEngine } from "./unsupportedEngine";

interface TranscriptPayload {
  transcript: string;
  confidence?: number;
}

interface ErrorPayload {
  code: string;
  message: string;
}

interface ListeningPayload {
  listening: boolean;
}

interface TegeeraSpeechPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestMicrophonePermission(): Promise<{ state: SpeechPermission }>;
  start(options: { language: string }): Promise<void>;
  stop(): Promise<void>;
  cancel(): Promise<void>;
  addListener(
    eventName: "partialResult" | "finalResult",
    listener: (payload: TranscriptPayload) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "recognitionError",
    listener: (payload: ErrorPayload) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "listeningState",
    listener: (payload: ListeningPayload) => void
  ): Promise<PluginListenerHandle>;
}

const NativeSpeech = registerPlugin<TegeeraSpeechPlugin>("TegeeraSpeech");

export class AndroidSpeechEngine implements SpeechEngine {
  private readonly listeners = new Set<SpeechEventListener>();
  private nativeListeners: PluginListenerHandle[] = [];
  private wired = false;

  async initialize(): Promise<SpeechAvailability> {
    await this.wireNativeEvents();
    const { available } = await NativeSpeech.isAvailable();
    return {
      supported: available,
      engine: "android",
      reason: available
        ? undefined
        : "This Android device does not provide a speech recognition service."
    };
  }

  async requestPermission(): Promise<SpeechPermission> {
    const result = await NativeSpeech.requestMicrophonePermission();
    return result.state;
  }

  async start(): Promise<void> {
    await NativeSpeech.start({ language: "en-UG" });
  }

  async stop(): Promise<void> {
    await NativeSpeech.stop();
  }

  async cancel(): Promise<void> {
    await NativeSpeech.cancel();
  }

  subscribe(listener: SpeechEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async dispose(): Promise<void> {
    await Promise.all(this.nativeListeners.map((listener) => listener.remove()));
    this.nativeListeners = [];
    this.wired = false;
  }

  private emit(event: SpeechEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  private async wireNativeEvents(): Promise<void> {
    if (this.wired) return;
    this.wired = true;
    this.nativeListeners = await Promise.all([
      NativeSpeech.addListener("partialResult", (payload) =>
        this.emit({
          type: "partial",
          transcript: payload.transcript,
          confidence: payload.confidence ?? null
        })
      ),
      NativeSpeech.addListener("finalResult", (payload) =>
        this.emit({
          type: "final",
          transcript: payload.transcript,
          confidence: payload.confidence ?? null
        })
      ),
      NativeSpeech.addListener("recognitionError", (payload) =>
        this.emit({ type: "error", ...payload })
      ),
      NativeSpeech.addListener("listeningState", (payload) =>
        this.emit({ type: "listening", listening: payload.listening })
      )
    ]);
  }
}

let defaultEngine: SpeechEngine | undefined;

export function getDefaultSpeechEngine(): SpeechEngine {
  if (!defaultEngine) {
    defaultEngine =
      Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android"
        ? new AndroidSpeechEngine()
        : new UnsupportedSpeechEngine();
  }
  return defaultEngine;
}
