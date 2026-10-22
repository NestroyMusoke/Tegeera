export type SpeechPermission = "granted" | "denied" | "prompt";

export interface SpeechAvailability {
  supported: boolean;
  engine: "android" | "browser" | "unsupported" | "test";
  reason?: string;
}

export type SpeechEvent =
  | {
      type: "partial" | "final";
      transcript: string;
      confidence: number | null;
      continues?: boolean;
    }
  | { type: "listening"; listening: boolean }
  | { type: "ended" }
  | { type: "error"; code: string; message: string };

export type SpeechEventListener = (event: SpeechEvent) => void;

export interface SpeechEngine {
  initialize(): Promise<SpeechAvailability>;
  requestPermission(): Promise<SpeechPermission>;
  start(): Promise<void>;
  stop(): Promise<void>;
  cancel(): Promise<void>;
  subscribe(listener: SpeechEventListener): () => void;
}
