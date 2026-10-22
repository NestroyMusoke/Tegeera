import type {
  SpeechAvailability,
  SpeechEngine,
  SpeechPermission
} from "./types";

export class UnsupportedSpeechEngine implements SpeechEngine {
  async initialize(): Promise<SpeechAvailability> {
    return {
      supported: false,
      engine: "unsupported",
      reason: "Speech recognition is unavailable in this environment. Typed input still works."
    };
  }

  async requestPermission(): Promise<SpeechPermission> {
    return "denied";
  }

  async start(): Promise<void> {
    throw new Error("Speech recognition is not available in this environment.");
  }

  async stop(): Promise<void> {}

  async cancel(): Promise<void> {}

  subscribe(): () => void {
    return () => undefined;
  }
}
