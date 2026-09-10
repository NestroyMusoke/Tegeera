export const SAFETY_INTENT_VERSION = "1.0.0";

export type SafetyIntent =
  | { kind: "ambiguous-comparison" }
  | { kind: "unresolved-prior-context" }
  | { kind: "non-visual-hold" };

function normalized(text: string): string {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9']+/g, " ").replace(/\s+/g, " ").trim();
}

/** Classifies safety-critical discourse patterns without storing complete utterances. */
export function classifySafetyIntent(text: string): SafetyIntent | null {
  const value = normalized(text);
  const genericParticipants = /\b(?:things?|something|one thing|two things)\b/.test(value);
  const simultaneous = /\b(?:at once|at the same time|simultaneously|in parallel)\b/.test(value);
  const relativeRate = /\b(?:faster|slower|quicker|more quickly|different speeds?)\b/.test(value);
  if (genericParticipants && simultaneous && relativeRate) return { kind: "ambiguous-comparison" };

  const unavailableLesson = /\b(?:yesterday|last lesson|previous lesson|earlier lesson|what we did before)\b/.test(value);
  const dependentReference = /\b(?:it|that|what|opposite|same idea|same concept)\b/.test(value);
  if (unavailableLesson && dependentReference) return { kind: "unresolved-prior-context" };

  const collaborativePause = /^(?:let's|let us|we can|we should|shall we)\b/.test(value);
  const pauseAction = /\b(?:(?:take|have)\b.*\b(?:break|pause|rest)|pause|rest)\b/.test(value);
  const resumeContext = /\b(?:before we continue|then continue|resume|continue afterwards?|continue later)\b/.test(value);
  if (collaborativePause && pauseAction && resumeContext) return { kind: "non-visual-hold" };
  return null;
}
