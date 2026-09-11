import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { matchReflectionRay, reflectVector, reflectionRayGeometry } from "./reflectionRay";
import { applyDoodleScript } from "./scene";
import type { SceneState } from "./schema";
import { analyzeTeacherInput } from "./semanticFrame";
import { validateDoodleScript } from "./validator";

const empty: SceneState = { sceneId: "optics", revision: 0, entities: [], relations: [] };

describe("open reflection-ray construction", () => {
  it("computes reflection from the vector and surface normal", () => {
    expect(reflectVector({ x: 3, y: 4 }, { x: 0, y: -1 })).toEqual({ x: 3, y: -4 });
    expect(reflectVector({ x: 1, y: 0 }, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("matches controlled optical slots without accepting arbitrary bouncing objects", () => {
    expect(matchReflectionRay("light travels in a straight line until it hits something and bounces off")).toEqual({ incidentText: "light", surfaceText: "surface", reflectedText: "reflected light" });
    expect(matchReflectionRay("a light ray shines toward a mirror and reflects off it")).toEqual({ incidentText: "light ray", surfaceText: "mirror", reflectedText: "reflected light" });
    expect(matchReflectionRay("a ball hits a wall and bounces off it")).toBeNull();
  });

  it("preserves three identities, typed relations, geometry and complete visual cues", () => {
    const result = interpretTeacherText("Light travels in a straight line until it hits something and bounces off.", empty);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.script.schemaVersion).toBe("2.12.0");
    expect(result.script.commands.filter(({ action }) => action === "create")).toHaveLength(3);
    expect(result.script.commands.filter(({ action }) => action === "relate").map((command) => command.action === "relate" && command.relation.kind)).toEqual(["travelsTo", "reflectsFrom"]);
    expect(validateDoodleScript(result.script, empty).ok).toBe(true);
    const scene = applyDoodleScript(empty, result.script);
    expect(reflectionRayGeometry(scene.relations ?? [], scene.entities)).not.toBeNull();
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    for (const cue of ["straight-incident-ray", "impact-point", "angled-reflected-ray", "surface-normal", "equal-angle-cues", "reflective-surface"]) expect(html).toContain(cue);
    expect(html).toContain('data-layout-topology="ray-reflection"');
    expect(html.match(/class="reflection-ray-annotation"/g)).toHaveLength(1);
    expect(html).not.toContain('class="doodle-object');
  });

  it("rejects incomplete, disconnected, wrong-role and impossible-angle scripts", () => {
    const result = interpretTeacherText("A light ray hits a mirror and reflects off it.", empty);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const reflectedCreate = result.script.commands.find((command) => command.action === "create" && command.entity.visualRole === "optics-reflected");
    const reflectedId = reflectedCreate?.action === "create" ? reflectedCreate.entity.id : "";
    const mutations = [
      { ...result.script, commands: result.script.commands.filter((command) => command.action !== "relate" || command.relation.kind !== "reflectsFrom") },
      { ...result.script, commands: result.script.commands.map((command) => command.action === "create" && command.entity.visualRole === "optics-surface" ? { ...command, entity: { ...command.entity, visualRole: "object" as const } } : command) },
      { ...result.script, commands: result.script.commands.map((command) => command.action === "move" && command.targetId === reflectedId ? { ...command, y: 80 } : command) }
    ];
    for (const candidate of mutations) expect(validateDoodleScript(candidate, empty).ok).toBe(false);
  });

  it("exposes an inspectable optics semantic frame", () => {
    const frame = analyzeTeacherInput("Light travels in a straight line until it hits something and bounces off.").frames[0];
    expect(frame.reflectionRays).toHaveLength(1);
    expect(frame.meaningCandidates).toEqual([{ family: "optics", predicate: "reflection-ray" }]);
    expect(frame.resolutionStatus).toBe("resolved");
  });
});
