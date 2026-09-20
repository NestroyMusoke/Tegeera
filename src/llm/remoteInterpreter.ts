import type { SceneState } from "../doodlescript/schema";

export interface RemoteInterpretation {
  candidate: unknown;
  provider?: string;
  model?: string;
}

const endpoint = (import.meta.env.VITE_TEGEERA_INTERPRETER_URL as string | undefined)?.trim().replace(/\/$/, "");

export function remoteInterpreterEnabled(sessionKey = ""): boolean {
  return Boolean(endpoint || sessionKey.trim());
}

export const plannerPrompt = (text: string, scene: SceneState) => `You are Tegeera's visual scene architect. Translate the teacher's meaning into a simple, lively 2D doodle blueprint. Return exactly one JSON object, with no markdown.

Output shape:
{"blueprintVersion":"1.0","mode":"replace","confidence":0.0,"objects":[{"id":"short-id","label":"short visible label","kind":"generic","color":"green","x":50,"y":50,"visual":{"motion":"none","primitives":[{"shape":"ellipse","x":0,"y":0,"width":60,"height":40,"rotation":0,"tone":"primary"}]}}],"connections":[{"from":"short-id","to":"other-id","label":"short action"}]}

Rules:
- Show the meaning, not every word. Use 1-8 distinct objects and 0-12 connections.
- mode is "replace" unless the teacher explicitly asks to extend the current scene.
- kinds are person, teacher, student, process, cpu, car, book, desk, tree, building, generic. Use generic for anything else.
- colors are red, orange, yellow, green, blue, purple, pink, brown, black, white, gray; omit color when unstated.
- x and y are semantic positions from 0..100: above/below/inside direction must agree with the explanation. Tegeera will solve exact spacing.
- Every object needs a visual made from 1-12 primitives. Primitive shapes: circle, ellipse, rect, line, arc, triangle, wave. Primitive x=-50..50, y=-55..55, width=2..100, height=2..110, rotation=-180..180, tone=outline|primary|accent|muted.
- Build recognizable silhouettes from primitives. Prefer an outline/body plus 2-6 meaningful details. Do not use a single letter as the drawing.
- motion is none, pulse, float, or spin. Use subtle motion only when meaning benefits.
- Connections must reference object ids and use a short visible action label. Do not invent semantic facts.
- Labels are at most 4 words. IDs are unique. confidence below .58 when essential meaning is genuinely ambiguous.

Teacher: ${JSON.stringify(text)}
Current scene, for reference only: ${JSON.stringify({ entities: scene.entities.map(({ id, kind, label, x, y }) => ({ id, kind, label, x, y })), relations: scene.relations ?? [] })}`;

function parseModelJson(content: unknown): unknown {
  if (typeof content !== "string") throw new Error("The model returned no plan.");
  return JSON.parse((content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? content).trim());
}

export async function interpretRemotely(
  text: string,
  scene: SceneState,
  sessionKey = "",
  signal?: AbortSignal
): Promise<RemoteInterpretation> {
  if (!endpoint && !sessionKey.trim()) throw new Error("Remote interpretation is not configured.");
  if (!endpoint) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${sessionKey.trim()}`,
        "content-type": "application/json",
        "http-referer": window.location.href,
        "x-title": "Tegeera"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [{ role: "user", content: plannerPrompt(text, scene) }],
        temperature: 0,
        max_tokens: 2200,
        response_format: { type: "json_object" },
        provider: { allow_fallbacks: true, data_collection: "deny" }
      }),
      signal
    });
    const payload = await response.json().catch(() => null) as { error?: { message?: string }; model?: string; choices?: Array<{ message?: { content?: string } }> } | null;
    if (!response.ok) throw new Error(payload?.error?.message ?? `OpenRouter failed (${response.status}).`);
    return { candidate: parseModelJson(payload?.choices?.[0]?.message?.content), provider: "openrouter", model: payload?.model };
  }
  const response = await fetch(`${endpoint}/v1/interpret`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text,
      scene: {
        sceneId: scene.sceneId,
        revision: scene.revision,
        entities: scene.entities,
        relations: scene.relations ?? [],
        context: scene.context
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
