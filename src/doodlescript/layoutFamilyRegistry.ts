import type { RelationFamily } from "./relationRegistry";

export const LAYOUT_FAMILY_REGISTRY_VERSION = "2.18.0";

export type LayoutFamilyId = "group" | "ownership" | "arrow" | "queue" | "contact" | "event-graph" | "visual-flow" | "part-whole-flow" | "force-diagram" | "labelled-container" | "geometric-construction" | "landscape-flow" | "circulation-loop" | "changing-speed-motion" | "call-return-flow" | "fraction-subtraction" | "water-cycle-loop" | "lifecycle-sequence" | "reflection-ray" | "lifo-stack" | "triangle-angle-sum" | "convergent-plates" | "ordered-routine" | "indexed-row" | "linked-chain";
export type LayoutTopology = "cluster" | "grouped-list" | "directed-pair" | "ordered-row" | "ranked-dag" | "directed-graph" | "part-whole" | "force-body" | "nested-container" | "angular-construction" | "elevation-cross-section" | "closed-loop" | "trajectory-profile" | "control-transfer" | "part-removal" | "environmental-cycle" | "stage-sequence" | "ray-reflection" | "top-access-stack" | "triangle-proof" | "plate-convergence" | "routine-sequence" | "indexed-cells" | "pointer-chain";

export interface LayoutFamilyDefinition {
  id: LayoutFamilyId;
  topology: LayoutTopology;
  relationFamilies: readonly RelationFamily[];
  readingDirection: "none" | "left-to-right" | "bidirectional";
  maximumVisibleNodes: number;
  maximumNodesPerRank?: number;
  movementWeight: number;
  connectorCrossingPenalty: number;
}

// These are visual grammar contracts, not lesson templates or coordinates.
export const layoutFamilyRegistry: readonly LayoutFamilyDefinition[] = [
  { id: "group", topology: "cluster", relationFamilies: ["structural"], readingDirection: "none", maximumVisibleNodes: 12, movementWeight: 1, connectorCrossingPenalty: 0 },
  { id: "ownership", topology: "grouped-list", relationFamilies: ["structural"], readingDirection: "none", maximumVisibleNodes: 12, movementWeight: 1, connectorCrossingPenalty: 0 },
  { id: "arrow", topology: "directed-pair", relationFamilies: ["directional"], readingDirection: "bidirectional", maximumVisibleNodes: 2, movementWeight: 0.2, connectorCrossingPenalty: 10_000 },
  { id: "queue", topology: "ordered-row", relationFamilies: ["ordered"], readingDirection: "left-to-right", maximumVisibleNodes: 5, maximumNodesPerRank: 1, movementWeight: 1, connectorCrossingPenalty: 0 },
  { id: "contact", topology: "directed-pair", relationFamilies: ["performance"], readingDirection: "left-to-right", maximumVisibleNodes: 3, movementWeight: 0.15, connectorCrossingPenalty: 10_000 },
  { id: "event-graph", topology: "ranked-dag", relationFamilies: ["event"], readingDirection: "left-to-right", maximumVisibleNodes: 10, maximumNodesPerRank: 3, movementWeight: 1, connectorCrossingPenalty: 10_000 },
  { id: "visual-flow", topology: "directed-graph", relationFamilies: ["visual"], readingDirection: "left-to-right", maximumVisibleNodes: 10, maximumNodesPerRank: 3, movementWeight: 0.18, connectorCrossingPenalty: 10_000 },
  { id: "part-whole-flow", topology: "part-whole", relationFamilies: ["compositional"], readingDirection: "left-to-right", maximumVisibleNodes: 7, maximumNodesPerRank: 3, movementWeight: 0.12, connectorCrossingPenalty: 10_000 },
  { id: "force-diagram", topology: "force-body", relationFamilies: ["mechanical"], readingDirection: "bidirectional", maximumVisibleNodes: 4, maximumNodesPerRank: 3, movementWeight: 0.1, connectorCrossingPenalty: 10_000 },
  { id: "labelled-container", topology: "nested-container", relationFamilies: ["containment"], readingDirection: "none", maximumVisibleNodes: 2, maximumNodesPerRank: 1, movementWeight: 0.1, connectorCrossingPenalty: 0 },
  { id: "geometric-construction", topology: "angular-construction", relationFamilies: ["measurement"], readingDirection: "none", maximumVisibleNodes: 2, maximumNodesPerRank: 1, movementWeight: 0.1, connectorCrossingPenalty: 0 },
  { id: "landscape-flow", topology: "elevation-cross-section", relationFamilies: ["landscape"], readingDirection: "left-to-right", maximumVisibleNodes: 3, maximumNodesPerRank: 1, movementWeight: 0.1, connectorCrossingPenalty: 0 },
  { id: "circulation-loop", topology: "closed-loop", relationFamilies: ["circulation"], readingDirection: "bidirectional", maximumVisibleNodes: 4, maximumNodesPerRank: 2, movementWeight: 0.1, connectorCrossingPenalty: 10_000 },
  { id: "changing-speed-motion", topology: "trajectory-profile", relationFamilies: ["kinematics"], readingDirection: "bidirectional", maximumVisibleNodes: 3, maximumNodesPerRank: 1, movementWeight: 0.1, connectorCrossingPenalty: 0 },
  { id: "call-return-flow", topology: "control-transfer", relationFamilies: ["control-flow"], readingDirection: "bidirectional", maximumVisibleNodes: 3, maximumNodesPerRank: 2, movementWeight: 0.1, connectorCrossingPenalty: 10_000 },
  { id: "fraction-subtraction", topology: "part-removal", relationFamilies: ["arithmetic"], readingDirection: "left-to-right", maximumVisibleNodes: 4, maximumNodesPerRank: 3, movementWeight: 0.1, connectorCrossingPenalty: 0 },
  { id: "water-cycle-loop", topology: "environmental-cycle", relationFamilies: ["hydrology"], readingDirection: "bidirectional", maximumVisibleNodes: 5, maximumNodesPerRank: 2, movementWeight: 0.1, connectorCrossingPenalty: 10_000 },
  { id: "lifecycle-sequence", topology: "stage-sequence", relationFamilies: ["lifecycle"], readingDirection: "left-to-right", maximumVisibleNodes: 3, maximumNodesPerRank: 3, movementWeight: 0.1, connectorCrossingPenalty: 10_000 },
  { id: "reflection-ray", topology: "ray-reflection", relationFamilies: ["optics"], readingDirection: "left-to-right", maximumVisibleNodes: 3, maximumNodesPerRank: 3, movementWeight: 0.1, connectorCrossingPenalty: 10_000 },
  { id: "lifo-stack", topology: "top-access-stack", relationFamilies: ["data-structure"], readingDirection: "none", maximumVisibleNodes: 3, maximumNodesPerRank: 1, movementWeight: 0.1, connectorCrossingPenalty: 0 },
  { id: "triangle-angle-sum", topology: "triangle-proof", relationFamilies: ["angle-sum"], readingDirection: "none", maximumVisibleNodes: 3, maximumNodesPerRank: 1, movementWeight: 0.1, connectorCrossingPenalty: 0 },
  { id: "convergent-plates", topology: "plate-convergence", relationFamilies: ["tectonics"], readingDirection: "bidirectional", maximumVisibleNodes: 3, maximumNodesPerRank: 2, movementWeight: 0.1, connectorCrossingPenalty: 10_000 },
  { id: "ordered-routine", topology: "routine-sequence", relationFamilies: ["routine"], readingDirection: "left-to-right", maximumVisibleNodes: 3, maximumNodesPerRank: 3, movementWeight: 0.1, connectorCrossingPenalty: 10_000 },
  { id: "indexed-row", topology: "indexed-cells", relationFamilies: ["indexed-collection"], readingDirection: "left-to-right", maximumVisibleNodes: 4, maximumNodesPerRank: 4, movementWeight: 0.1, connectorCrossingPenalty: 0 },
  { id: "linked-chain", topology: "pointer-chain", relationFamilies: ["linked-structure"], readingDirection: "left-to-right", maximumVisibleNodes: 4, maximumNodesPerRank: 4, movementWeight: 0.1, connectorCrossingPenalty: 10_000 }
];

const byId = new Map(layoutFamilyRegistry.map((definition) => [definition.id, definition] as const));

export function layoutFamilyFor(id: LayoutFamilyId): LayoutFamilyDefinition {
  return byId.get(id)!;
}

export function layoutFamilySupportsRelation(id: LayoutFamilyId, family: RelationFamily): boolean {
  return layoutFamilyFor(id).relationFamilies.includes(family);
}

export function validateLayoutFamilyRegistry(registry: readonly LayoutFamilyDefinition[] = layoutFamilyRegistry): string[] {
  const issues: string[] = [];
  const ids = new Set<LayoutFamilyId>();
  for (const definition of registry) {
    if (ids.has(definition.id)) issues.push(`Duplicate layout family: ${definition.id}`);
    ids.add(definition.id);
    if (!definition.relationFamilies.length) issues.push(`Missing relation family: ${definition.id}`);
    if (definition.maximumVisibleNodes < 2 || definition.maximumVisibleNodes > 12) issues.push(`Invalid visible-node limit: ${definition.id}`);
    if (definition.maximumNodesPerRank !== undefined
      && (definition.maximumNodesPerRank < 1 || definition.maximumNodesPerRank > definition.maximumVisibleNodes)) {
      issues.push(`Invalid rank limit: ${definition.id}`);
    }
    if (definition.movementWeight < 0 || definition.connectorCrossingPenalty < 0) issues.push(`Invalid layout weight: ${definition.id}`);
  }
  return issues;
}

const startupIssues = validateLayoutFamilyRegistry();
if (startupIssues.length) throw new Error(`Invalid layout family registry: ${startupIssues.join("; ")}`);
