import type { SceneState } from "../doodlescript/schema";

export interface RemoteInterpretation {
  candidate: unknown;
  provider?: string;
  model?: string;
}

const endpoint = (import.meta.env.VITE_TEGEERA_INTERPRETER_URL as string | undefined)?.trim().replace(/\/$/, "");

export function remoteInterpreterEnabled(): boolean {
  return Boolean(endpoint);
}

export async function interpretRemotely(
  text: string,
  scene: SceneState,
  signal?: AbortSignal
): Promise<RemoteInterpretation> {
  if (!endpoint) throw new Error("Remote interpretation is not configured.");
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
