import type { SceneState } from "../doodlescript/schema";
import type { RemoteInterpretation } from "./remoteInterpreter";

// Session-only replay of the exact request context. This is a latency optimization
// for repeats, never a claim that schema validation proves visual correctness.
export class AcceptedPlanCache {
  private readonly entries = new Map<string, RemoteInterpretation>();

  constructor(private readonly capacity = 24) {}

  private key(text: string, scene: SceneState): string {
    return JSON.stringify({
      text: text.trim().replace(/\s+/g, " "),
      sceneId: scene.sceneId,
      revision: scene.revision,
      entities: scene.entities.map(({ id, kind, label, x, y, color }) => ({ id, kind, label, x, y, color })),
      relations: (scene.relations ?? []).map(({ sourceIds, targetIds, predicate, kind }) =>
        ({ sourceIds, targetIds, predicate, kind }))
    });
  }

  get(text: string, scene: SceneState): RemoteInterpretation | undefined {
    const key = this.key(text, scene);
    const value = this.entries.get(key);
    if (value) {
      this.entries.delete(key);
      this.entries.set(key, value);
    }
    return value;
  }

  put(text: string, scene: SceneState, value: RemoteInterpretation): void {
    if (this.capacity < 1) return;
    const key = this.key(text, scene);
    this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > this.capacity) this.entries.delete(this.entries.keys().next().value!);
  }

  clear(): void { this.entries.clear(); }
}
