import type {
  SpeechAvailability,
  SpeechEngine,
  SpeechEvent,
  SpeechEventListener,
  SpeechPermission
} from "./types";

export class TestSpeechEngine implements SpeechEngine {
  readonly calls: string[] = [];
  availability: SpeechAvailability = { supported: true, engine: "test" };
  permission: SpeechPermission = "granted";
  private readonly listeners = new Set<SpeechEventListener>();

  async initialize(): Promise<SpeechAvailability> {
    this.calls.push("initialize");
    return this.availability;
  }

  async requestPermission(): Promise<SpeechPermission> {
    this.calls.push("requestPermission");
    return this.permission;
  }

  async start(): Promise<void> {
    this.calls.push("start");
  }

  async stop(): Promise<void> {
    this.calls.push("stop");
  }

  async cancel(): Promise<void> {
    this.calls.push("cancel");
  }

  subscribe(listener: SpeechEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: SpeechEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}
