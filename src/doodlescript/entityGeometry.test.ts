import { describe, expect, it } from "vitest";
import { characterPoseFor } from "../components/characterPerformance";
import { actionRegistry } from "./actionRegistry";
import { attentionAnchor, contactAnchor, entityVisualGeometry, shoulderAnchor } from "./entityGeometry";
import type { EntityKind, SceneEntity, SceneRelation } from "./schema";
import { applyTargetedPerformance } from "./targetedPerformance";

const makeEntity = (id: string, kind: EntityKind, x: number, y: number, scale = 1): SceneEntity => ({
  id, kind, x, y, scale, direction: "right", highlighted: false
});

const relation: SceneRelation = {
  id: "aim", kind: "actsOn", predicate: "point", preposition: "at",
  sourceIds: ["teacher-1"], targetIds: ["target-1"]
};

describe("semantic entity geometry", () => {
  it("provides an exhaustive finite geometry contract for every entity kind", () => {
    const kinds: EntityKind[] = ["person", "teacher", "student", "process", "cpu", "car", "book", "desk", "tree", "building", "generic"];
    expect(Object.keys(entityVisualGeometry).sort()).toEqual([...kinds].sort());
    for (const kind of kinds) {
      const geometry = entityVisualGeometry[kind];
      expect([geometry.attention.x, geometry.attention.y, geometry.contact.halfWidth, geometry.contact.y].every(Number.isFinite)).toBe(true);
      expect(geometry.contact.halfWidth).toBeGreaterThan(0);
    }
  });

  it("scales attention anchors with the entity while preserving its scene center", () => {
    const tree = makeEntity("target-1", "tree", 48, 60, 1.5);
    expect(attentionAnchor(tree)).toEqual({ x: 480, y: 315 });
  });

  it("selects the nearest visible contact surface from either side", () => {
    const book = makeEntity("target-1", "book", 50, 28);
    expect(contactAnchor(book, 100).x).toBe(455);
    expect(contactAnchor(book, 900).x).toBe(545);
  });

  it("aims the rendered arm ray through the target's semantic anchor", () => {
    const actor = makeEntity("teacher-1", "teacher", 30, 60);
    const target = makeEntity("target-1", "tree", 48, 60);
    const performed = applyTargetedPerformance(actor, target, relation);
    const pose = characterPoseFor(performed);
    const shoulder = shoulderAnchor(performed, pose.bodyLean);
    const targetPoint = attentionAnchor(target);
    const radians = (pose.bodyLean + pose.rightArm.upper) * Math.PI / 180;
    const facing = performed.direction === "left" ? -1 : 1;
    const ray = { x: Math.cos(radians) * facing, y: Math.sin(radians) };
    const targetVector = { x: targetPoint.x - shoulder.x, y: targetPoint.y - shoulder.y };
    const cross = ray.x * targetVector.y - ray.y * targetVector.x;
    expect(Math.abs(cross) / Math.hypot(targetVector.x, targetVector.y)).toBeLessThan(0.000001);
    expect(ray.x * targetVector.x + ray.y * targetVector.y).toBeGreaterThan(0);
  });

  it("targets a tree canopy rather than its arbitrary entity center", () => {
    const actor = makeEntity("teacher-1", "teacher", 30, 60);
    const tree = makeEntity("target-1", "tree", 48, 60);
    const performed = applyTargetedPerformance(actor, tree, relation);
    expect(performed.performance?.rightArm?.upper).toBeLessThan(-5);
    expect(attentionAnchor(tree).y).toBeLessThan(tree.y * 6.2);
  });

  it("keeps registry geometry independent of action aliases and input objects immutable", () => {
    const actor = makeEntity("teacher-1", "teacher", 70, 40);
    const book = makeEntity("target-1", "book", 30, 40);
    const before = structuredClone({ actor, book });
    const pointed = applyTargetedPerformance(actor, book, relation);
    expect(pointed.direction).toBe("left");
    expect({ actor, book }).toEqual(before);
    expect(actionRegistry.find((action) => action.predicate === "point")?.aliases.length).toBeGreaterThan(1);
  });
});
