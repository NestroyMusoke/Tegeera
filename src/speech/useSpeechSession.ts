import { useEffect, useRef, useSyncExternalStore } from "react";
import { getDefaultSpeechEngine } from "./androidEngine";
import { SpeechSession, type AcceptedSpeechTranscript } from "./SpeechSession";
import type { SpeechEngine } from "./types";

export function useSpeechSession(
  acceptTranscript: (transcript: string, timing: AcceptedSpeechTranscript) => void,
  engine: SpeechEngine = getDefaultSpeechEngine()
) {
  const acceptTranscriptRef = useRef(acceptTranscript);
  acceptTranscriptRef.current = acceptTranscript;

  const sessionRef = useRef<SpeechSession | null>(null);
  const engineRef = useRef<SpeechEngine | null>(null);
  if (!sessionRef.current || engineRef.current !== engine) {
    engineRef.current = engine;
    sessionRef.current = new SpeechSession(engine, (transcript, timing) =>
      acceptTranscriptRef.current(transcript, timing)
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
