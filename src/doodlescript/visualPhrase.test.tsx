import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { analyzeTeacherInput } from "./semanticFrame";
import type { DoodleScript, SceneEntity, SceneRelation, SceneState } from "./schema";
import { validateDoodleScript } from "./validator";
import { planVisualPhrase, planVisualPhraseGraph, visualPhraseGeometry } from "./visualPhrase";
import { validateVisualActionRegistry, visualActionRegistry } from "./visualActionRegistry";

function interpret(text: string, scene = initialScene): DoodleScript {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  return result.script;
}

function run(text: string, scene = initialScene): SceneState {
  const script = interpret(text, scene);
  const checked = validateDoodleScript(script, scene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return applyDoodleScript(scene, checked.script);
}

describe("evidence-backed visual phrases", () => {
  it("keeps a valid data-driven action registry", () => {
    expect(visualActionRegistry.length).toBeGreaterThanOrEqual(7);
    expect(validateVisualActionRegistry()).toEqual([]);
  });

  it("extracts subject, action, object and evidence without choosing coordinates", () => {
    const frame = analyzeTeacherInput("A plant absorbs sunlight").frames[0];
    expect(frame.intent).toBe("describe");
    expect(frame.resolutionStatus).toBe("resolved");
    expect(frame.entities.map((mention) => mention.text)).toEqual(["a plant", "sunlight"]);
    expect(frame.visualActions).toEqual([{
      predicate: "absorb",
      subjectMentionId: frame.entities[0].mentionId,
      objectMentionId: frame.entities[1].mentionId,
      preposition: undefined
    }]);
    expect(frame.evidence[0].text).toBe("A plant absorbs sunlight");
  });

  it("canonicalizes direct and prepositional paraphrases through registry data", () => {
    const project = (text: string) => {
      const action = analyzeTeacherInput(text).frames[0].visualActions[0];
      return { predicate: action.predicate, preposition: action.preposition };
    };
    expect(project("A plant absorbs sunlight")).toEqual(project("A plant takes in sunlight"));
    expect(project("Water transforms into vapor")).toEqual(project("Water changes into vapor"));
  });

  it("emits DoodleScript 1.9 with one identity per semantic role", () => {
    const script = interpret("A plant absorbs sunlight");
    expect(script.schemaVersion).toBe("1.9.0");
    expect(script.commands.filter((command) => command.action === "create")).toHaveLength(2);
    expect(script.commands).toContainEqual(expect.objectContaining({
      action: "relate",
      relation: expect.objectContaining({
        kind: "visualAction", predicate: "absorb",
        sourceIds: ["concept-1"], targetIds: ["concept-2"]
      })
    }));
  });

  it("aims an absorption arrow from the object into the subject", () => {
    const scene = run("A plant absorbs sunlight");
    const relation = scene.relations![0];
    const geometry = visualPhraseGeometry(relation, scene.entities)!;
    expect(geometry.definition.direction).toBe("object-to-subject");
    expect(geometry.from.label).toBe("sunlight");
    expect(geometry.to.label).toBe("plant");
    expect(Math.sign(geometry.endX - geometry.startX)).toBe(1);
  });

  it("aims output and transformation arrows from subject to object", () => {
    for (const text of ["A plant produces oxygen", "Water evaporates into a cloud"]) {
      const scene = run(text);
      const geometry = visualPhraseGeometry(scene.relations![0], scene.entities)!;
      expect(geometry.from.id).toBe(scene.relations![0].sourceIds[0]);
      expect(geometry.to.id).toBe(scene.relations![0].targetIds[0]);
    }
  });

  it("reuses a matching concept across phrases without cloning it", () => {
    const absorbed = run("A plant absorbs sunlight");
    const plantBefore = structuredClone(absorbed.entities.find((entity) => entity.label === "plant"));
    const produced = run("The plant produces oxygen", absorbed);
    expect(produced.entities.filter((entity) => entity.label === "plant")).toHaveLength(1);
    expect(produced.entities.find((entity) => entity.label === "plant")).toEqual(plantBefore);
    expect(produced.entities).toHaveLength(3);
    expect(produced.relations).toHaveLength(2);
    const output = produced.relations!.find((relation) => relation.predicate === "produce")!;
    const geometry = visualPhraseGeometry(output, produced.entities)!;
    const sunlight = produced.entities.find((entity) => entity.label === "sunlight")!;
    expect(Math.abs(geometry.labelX - sunlight.x * 10)).toBeGreaterThan(80);
  });

  it("keeps unknown concepts labelled instead of inventing literal glyphs", () => {
    const scene = run("Inflation affects employment");
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html.match(/data-symbol-fallback="true"/g)).toHaveLength(2);
    expect(html).toContain("inflation");
    expect(html).toContain("employment");
    expect(html).toContain("inflation affects employment");
  });

  it("renders an accessible animated connector with a meaningful static arrow", () => {
    const scene = run("Water flows into a plant");
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html).toContain('class="visual-action-annotation visual-action-cue-flow"');
    expect(html).toContain('data-action="flow"');
    expect(html).toContain('data-cue="flow"');
    expect(html).toContain('aria-label="water flows to plant"');
    expect(html).toContain("visual-action-particle");
  });

  it("rejects duplicate and malformed visual-action claims", () => {
    const scene = run("A plant absorbs sunlight");
    expect(interpretTeacherText("The plant absorbs sunlight", scene).ok).toBe(false);
    const valid = interpret("A plant absorbs sunlight");
    expect(validateDoodleScript({ ...valid, schemaVersion: "1.8.0" }, initialScene).ok).toBe(false);
    const malformed = structuredClone(valid);
    const command = malformed.commands.find((candidate) => candidate.action === "relate");
    if (command?.action === "relate") command.relation.predicate = "hallucinate";
    expect(validateDoodleScript(malformed, initialScene).ok).toBe(false);
  });

  it("refuses a connector through an unrelated fixed object", () => {
    const make = (id: string, x: number): SceneEntity => ({ id, kind: "generic", label: id, x, y: 28, scale: 1, direction: "right", highlighted: false });
    const scene: SceneState = { sceneId: "blocked", revision: 0, entities: [make("source", 12), make("blocker", 48), make("target", 84)], relations: [] };
    const relation: SceneRelation = { id: "phrase", kind: "visualAction", predicate: "affect", sourceIds: ["source"], targetIds: ["target"] };
    expect(visualPhraseGeometry(relation, scene.entities)).toBeNull();
    expect(planVisualPhrase(scene, relation, new Set())).toBeNull();
  });

  it("is deterministic and preserves unrelated established entities", () => {
    const build = () => run("A plant absorbs sunlight", run("A tree"));
    expect(build()).toEqual(build());
    const base = run("A tree");
    expect(build().entities.find((entity) => entity.id === "tree-1")).toEqual(base.entities[0]);
  });

  it("keeps unsafe or unsupported claims outside the mutation boundary", () => {
    for (const text of ["A plant does not absorb sunlight", "Maybe water flows into a cloud", "A dragon devours a planet"]) {
      expect(interpretTeacherText(text, initialScene).ok, text).toBe(false);
      expect(initialScene.entities).toEqual([]);
    }
  });

  it("cleans the relationship when either identity is removed", () => {
    const scene = run("A plant absorbs sunlight");
    const removed = run("Remove sunlight", scene);
    expect(removed.entities.map((entity) => entity.label)).toEqual(["plant"]);
    expect(removed.relations).toEqual([]);
  });

  it("plans multiple inputs and an inherited output as one atomic graph", () => {
    const source = "A plant absorbs sunlight and water, then produces oxygen";
    const script = interpret(source);
    expect(script.schemaVersion).toBe("1.9.0");
    expect(script.commands.filter((command) => command.action === "create")).toHaveLength(4);
    expect(script.commands.filter((command) => command.action === "relate")).toHaveLength(3);
    const scene = run(source);
    expect(scene.revision).toBe(1);
    expect(scene.entities.filter((entity) => entity.label === "plant")).toHaveLength(1);
    const byLabel = new Map(scene.entities.map((entity) => [entity.label, entity]));
    expect(byLabel.get("sunlight")?.x).toBe(byLabel.get("water")?.x);
    expect(byLabel.get("sunlight")!.x).toBeLessThan(byLabel.get("plant")!.x);
    expect(byLabel.get("plant")!.x).toBeLessThan(byLabel.get("oxygen")!.x);
    expect(scene.relations?.every((relation) => visualPhraseGeometry(relation, scene.entities))).toBe(true);
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html.match(/class="visual-action-annotation/g)).toHaveLength(3);
    expect(html.match(/data-relation-family="visual"/g)).toHaveLength(6);
    expect(html.match(/data-relation-layout="visual-flow"/g)).toHaveLength(3);
    expect(html).toContain('data-relation-registry-version="2.7.0"');
    expect(html.match(/data-layout-topology="directed-graph"/g)).toHaveLength(3);
    expect(html).toContain('data-layout-registry-version="2.7.0"');
    expect(html).toContain("plant absorbs sunlight");
    expect(html).toContain("plant absorbs water");
    expect(html).toContain("plant produces oxygen");
  });

  it("rejects a fourth simultaneous graph lane instead of overlapping it", () => {
    const entities = ["plant", "alpha", "beta", "gamma", "delta"].map((label, index): SceneEntity => ({
      id: label, kind: "generic", label, x: 12 + index * 18, y: 28, scale: 1, direction: "right", highlighted: false
    }));
    const scene: SceneState = { sceneId: "wide-star", revision: 0, entities, relations: [] };
    const relations: SceneRelation[] = ["alpha", "beta", "gamma", "delta"].map((target, index) => ({
      id: `edge-${index}`, kind: "visualAction", predicate: "absorb", sourceIds: ["plant"], targetIds: [target]
    }));
    expect(planVisualPhraseGraph(scene, relations, new Set(entities.map((entity) => entity.id)))).toBeNull();
    expect(interpretTeacherText("A plant absorbs sunlight and water and minerals and carbon dioxide", initialScene).ok).toBe(false);
    expect(initialScene.entities).toEqual([]);
  });
});
