import type { SceneState } from "../doodlescript/schema";

export interface OwnershipBadge { code: string; color: string; role: "owner" | "item" }
const colors = ["#275a78", "#79512c", "#6d4679", "#2f7159"];

// Derive codes from scene order, not relationship order: transfers must not
// renumber other owners. No position or semantic state is changed for display.
export function ownershipBadges(scene: SceneState): Map<string, OwnershipBadge[]> {
  const badges = new Map<string, OwnershipBadge[]>();
  const add = (id: string, badge: OwnershipBadge) => {
    const previous = badges.get(id) ?? [];
    if (!previous.some((item) => item.code === badge.code && item.role === badge.role)) badges.set(id, [...previous, badge]);
  };
  for (const relation of scene.relations ?? []) {
    if (relation.kind !== "owns" || relation.sourceIds.length !== 1) continue;
    const owner = relation.sourceIds[0];
    const index = scene.entities.findIndex((entity) => entity.id === owner);
    if (index < 0) continue;
    const badge = { code: `O${index + 1}`, color: colors[index % colors.length] };
    add(owner, { ...badge, role: "owner" });
    for (const id of relation.targetIds) {
      if (scene.entities.some((entity) => entity.id === id)) add(id, { ...badge, role: "item" });
    }
  }
  return badges;
}
