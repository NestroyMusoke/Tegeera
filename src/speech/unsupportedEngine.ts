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
      reason: "Live speech is available in the Android app. Typed input still works here."
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
