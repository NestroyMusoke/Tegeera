import { useEffect, useRef, useSyncExternalStore } from "react";
import { getDefaultSpeechEngine } from "./androidEngine";
import { SpeechSession } from "./SpeechSession";
import type { SpeechEngine } from "./types";

export function useSpeechSession(
  acceptTranscript: (transcript: string) => void,
  engine: SpeechEngine = getDefaultSpeechEngine()
) {
  const acceptTranscriptRef = useRef(acceptTranscript);
  acceptTranscriptRef.current = acceptTranscript;

  const sessionRef = useRef<SpeechSession | null>(null);
  const engineRef = useRef<SpeechEngine | null>(null);
  if (!sessionRef.current || engineRef.current !== engine) {
    engineRef.current = engine;
    sessionRef.current = new SpeechSession(engine, (transcript) =>
      acceptTranscriptRef.current(transcript)
    );
  }
  const session = sessionRef.current;
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot
  );

  useEffect(() => {
    void session.initialize();
    return () => session.destroy();
  }, [session]);

  return {
    ...snapshot,
    start: () => session.start(),
    stop: () => session.stop(),
    cancel: () => session.cancel()
  };
}
