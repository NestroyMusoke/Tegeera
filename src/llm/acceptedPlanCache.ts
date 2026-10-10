import type { SceneState } from "../doodlescript/schema";
import type { RemoteInterpretation } from "./remoteInterpreter";

// Session-only replay. Context-dependent requests need identical scene state;
// self-contained replacements learned on an empty canvas can cross revisions.
// This is a latency optimization, never proof of visual correctness.
export class AcceptedPlanCache {
  private readonly entries = new Map<string, RemoteInterpretation>();
  private readonly standalone = new Map<string, RemoteInterpretation>();

  constructor(private readonly capacity = 24) {}

  private key(text: string, scene: SceneState): string {
    return JSON.stringify({
      text: text.trim().replace(/\s+/g, " "),
      sceneId: scene.sceneId,
      revision: scene.revision,
      // Include all semantic state, not just positions: payload IDs, roles and
      // ownership can change what the exact same follow-up means.
      entities: scene.entities,
      relations: scene.relations ?? [],
      context: scene.context
    });
  }

  get(text: string, scene: SceneState): RemoteInterpretation | undefined {
    const key = this.key(text, scene);
    const value = this.entries.get(key);
    if (value) {
      this.entries.delete(key);
      this.entries.set(key, value);
    }
    if (value) return value;
    const standaloneKey = this.standaloneKey(text);
    const replay = this.standalone.get(standaloneKey);
    if (replay) { this.standalone.delete(standaloneKey); this.standalone.set(standaloneKey, replay); }
    return replay;
  }

  put(text: string, scene: SceneState, value: RemoteInterpretation): void {
    if (this.capacity < 1) return;
    const key = this.key(text, scene);
    this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > this.capacity) this.entries.delete(this.entries.keys().next().value!);
    if (this.isStandalone(text, scene, value)) {
      const standaloneKey = this.standaloneKey(text);
      this.standalone.delete(standaloneKey);
      this.standalone.set(standaloneKey, value);
      if (this.standalone.size > this.capacity) this.standalone.delete(this.standalone.keys().next().value!);
    }
  }

  private standaloneKey(text: string): string { return text.trim().replace(/\s+/g, " "); }

  private isStandalone(text: string, scene: SceneState, value: RemoteInterpretation): boolean {
    if (scene.entities.length || scene.relations?.length || scene.context?.subjectIds.length || scene.context?.objectIds.length) return false;
    if (/\b(?:it|its|they|them|their|this|that|these|those|he|she|his|her|same|previous|existing|again|another|also|add|include|instead|then|now|here|there|move|remove|change|make)\b/i.test(text)) return false;
    const candidate = value.candidate as { blueprintVersion?: unknown; mode?: unknown; objects?: { id?: unknown }[];
      connections?: { from?: unknown; to?: unknown; via?: unknown }[] } | null;
    if (!candidate || candidate.blueprintVersion !== "1.0" || candidate.mode !== "replace"
      || !Array.isArray(candidate.objects) || !candidate.objects.length || !Array.isArray(candidate.connections)) return false;
    const ids = new Set(candidate.objects.map((object) => object?.id));
    if (ids.size !== candidate.objects.length || [...ids].some((id) => typeof id !== "string")) return false;
    return candidate.connections.every((edge) => edge && ids.has(edge.from) && ids.has(edge.to)
      && (edge.via === undefined || ids.has(edge.via)));
  }

  clear(): void { this.entries.clear(); this.standalone.clear(); }
}
