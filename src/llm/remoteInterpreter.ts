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

const plannerPrompt = (text: string, scene: SceneState) => `You are Tegeera's conservative semantic planner. Return one JSON object only, with no markdown and no invented facts. Produce DoodleScript schemaVersion "2.24.0", sceneId ${JSON.stringify(scene.sceneId)}, revision ${scene.revision + 1}, confidence 0..1, sourceText exactly ${JSON.stringify(text)}, and 1-30 commands. Entity kinds: person, teacher, student, process, cpu, car, book, desk, tree, building, generic. Create entity fields: id, kind, optional label, x from 6-94, y from 12-88, scale from .5-2, direction left/right/up/down, highlighted boolean. Other commands: relate, move, update, remove, unrelate, clear. Use generic with a concise descriptive label for an unknown concrete object. Use unique IDs and only references that exist in the current scene or are created first. Do not emit fields outside DoodleScript. Current scene: ${JSON.stringify({ sceneId: scene.sceneId, revision: scene.revision, entities: scene.entities, relations: scene.relations ?? [], context: scene.context })}`;

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
