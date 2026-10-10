import type { SceneState } from "../doodlescript/schema";
import { CORE_SCENE_RULES } from "../../shared/scenePlanningRules.mjs";

export interface RemoteInterpretation {
  candidate: unknown;
  provider?: string;
  model?: string;
  providerAttempts?: number;
  providerAttemptMs?: number[];
}

export const hostedInterpreterUrl = (import.meta.env.VITE_TEGEERA_INTERPRETER_URL as string | undefined)?.trim().replace(/\/$/, "");
export const FREE_SCENE_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "openrouter/free"
] as const;
export const DEFAULT_FREE_SCENE_MODEL = FREE_SCENE_MODELS[0];

export function remoteInterpreterEnabled(sessionKey = "", localBridge = false): boolean {
  return Boolean(hostedInterpreterUrl || sessionKey.trim() || localBridge);
}

export const plannerPrompt = (text: string, scene: SceneState, reusableNouns: readonly string[] = []) => `Translate a teacher's explanation into a small, accurate 2D visual plan. Return ONLY one JSON object, no markdown. It has blueprintVersion "1.0", mode "replace" or "extend", numeric confidence, objects array, and connections array. Each object has id, label, kind, x, y and optional color. Each connection has from, to, label and optional kind or via. Choose labels and IDs from the teacher's actual explanation; no example objects are supplied for copying.

Rules:
${CORE_SCENE_RULES}
- Preserve meaning, not just nouns. Include every essential visible part, input, output, source, and stated relationship. Never invent facts. If the limit prevents a faithful plan, set confidence below 0.58.
- 1-8 objects, 0-12 connections. Distinct objects have distinct IDs. A connection endpoint must be an exact object ID, or an existing scene ID in extend mode. Never reference an omitted object.
- Use mode "extend" only when explicitly adding to the current scene; otherwise "replace". Never reuse an existing ID for a new object.
- Kinds: person, teacher, student, process, cpu, car, book, desk, tree, building, generic. Use generic for every other noun.
- Optional colors: red, orange, yellow, green, blue, purple, pink, brown, black, white, gray. Omit when not stated.
- x and y are 0..100. Preserve above/below and left/right order; Tegeera handles exact spacing. Labels are 1-4 words.
- Do not emit glyphs, SVG, paths, pixels, explanations, or extra fields. Artwork is resolved separately while the labelled scene remains usable.
- For continuous propagation, use four distinct roles and exactly source→payload emits="emits", payload→medium propagatesThrough="propagates through", payload→destination reaches="reaches". The travelling payload, not the medium, reaches the destination. Use only for a complete propagation explanation, not ordinary arrival; the medium is schematic. Preserve stated left/right order.
- The current visual grammar cannot safely show negated claims. If the teacher says something does not happen, never convert it to an affirmative connection; set confidence below 0.58. Preserve every explicitly stated colour on the correct object.
- If the teacher says an input passes through a named part, connect the input to that part, not just the larger whole. When an applied push/pull is opposed by friction, drag, or resistance, represent distinct applied and opposing force arrows and the contacted surface; do not replace this with a generic actor caption.
- Typed visual links: partOf="part of", flowsInto="flows into", illuminates="illuminates", contains="contains", calls="calls", returnsControlTo="returnsTo", risesTo="risesTo", fallsFrom="fallsFrom", accelerates="accelerates", pumpsTo="pumps to", returnsTo="returns to", carries="carries", appliedTo="applied to", opposes="opposes", contacts="contacts". A container with content needs a distinct container→content contains link; other connected context is allowed. A call-return needs caller→function calls and function→call site returnsControlTo with three distinct roles. An ascent/apex/descent needs moving object→apex risesTo and fallsFrom plus force→moving object accelerates, with three roles. For a closed transport loop, use source→destination pumpsTo via payload, destination→source returnsTo via the same payload, and payload→enrichment carries. For applied force plus explicit opposition, use four distinct roles and exactly three links: applied force→body appliedTo, opposing force→applied force opposes, body→surface contacts. Forces are arrows, not people. Only pumpsTo and returnsTo use a via ID.
- Existing artwork labels (do not change meaning to favor them): ${JSON.stringify(reusableNouns)}.
Teacher: ${JSON.stringify(text)}
Current scene: ${JSON.stringify({ entities: scene.entities.map(({ id, kind, label, x, y }) => ({ id, kind, label, x, y })), relations: scene.relations ?? [] })}`;

function parseModelJson(content: unknown): unknown {
  const text = typeof content === "string" ? content
    : Array.isArray(content) ? content.filter((part): part is { type: "text"; text: string } =>
      part?.type === "text" && typeof part.text === "string").map((part) => part.text).join("") : "";
  if (!text.trim()) throw new Error("The model returned no plan.");
  return JSON.parse((text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text).trim());
}

export async function interpretRemotely(
  text: string,
  scene: SceneState,
  sessionKey = "",
  signal?: AbortSignal,
  reusableNouns: readonly string[] = [],
  localBridge = false
): Promise<RemoteInterpretation> {
  if (!hostedInterpreterUrl && !sessionKey.trim() && !localBridge) throw new Error("Remote interpretation is not configured.");
  if (!hostedInterpreterUrl) {
    const useLocalBridge = localBridge && !sessionKey.trim();
    const response = await fetch(useLocalBridge ? "/api/tegeera-ai/chat/completions" : "https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        ...(useLocalBridge ? {} : { authorization: `Bearer ${sessionKey.trim()}` }),
        "content-type": "application/json",
        "http-referer": window.location.href,
        "x-title": "Tegeera"
      },
      body: JSON.stringify({
        models: FREE_SCENE_MODELS,
        messages: [{ role: "user", content: plannerPrompt(text, scene, reusableNouns) }],
        temperature: 0,
        max_tokens: 3600,
        reasoning: { enabled: false },
        response_format: { type: "json_object" },
        provider: { allow_fallbacks: true, data_collection: "deny" }
      }),
      signal
    });
    const payload = await response.json().catch(() => null) as { error?: { message?: string }; model?: string; choices?: Array<{ finish_reason?: string; message?: { content?: unknown } }> } | null;
    if (!response.ok) throw new Error(`OpenRouter scene request failed (${response.status}): ${payload?.error?.message ?? "no detail"}`);
    let candidate: unknown;
    try { candidate = parseModelJson(payload?.choices?.[0]?.message?.content); }
    catch (error) {
      if (error instanceof Error && error.message === "The model returned no plan.") {
        throw new Error(`OpenRouter returned no visual plan (model ${payload?.model ?? "unknown"}; finish ${payload?.choices?.[0]?.finish_reason ?? "unknown"}).`);
      }
      throw error;
    }
    return { candidate, provider: "openrouter", model: payload?.model };
  }
  const response = await fetch(`${hostedInterpreterUrl}/v1/interpret`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text,
      reusableGlyphNouns: reusableNouns,
      scene: {
        sceneId: scene.sceneId,
        revision: scene.revision,
        entities: scene.entities.map(({ id, kind, label, x, y }) => ({ id, kind, label, x, y })),
        relations: (scene.relations ?? []).map(({ sourceIds, targetIds, predicate, kind }) => ({ sourceIds, targetIds, predicate, kind }))
      }
    }),
    signal
  });
  const payload = await response.json().catch(() => null) as (RemoteInterpretation & { error?: string }) | null;
  if (!response.ok || !payload || !("candidate" in payload)) {
    throw new Error(payload?.error ?? `Remote interpreter failed (${response.status}).`);
  }
  return payload;
}
