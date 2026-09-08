import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { eventFlowGeometry, hasDirectedCycle } from "./eventRelations";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { analyzeTeacherInput } from "./semanticFrame";
import type { DoodleScript, SceneState } from "./schema";
import { validateDoodleScript } from "./validator";

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

describe("general event relationships", () => {
  it("extracts reusable temporal and causal semantic roles", () => {
    for (const [text, predicate] of [
      ["Evaporation happens before condensation", "before"],
      ["Condensation occurs after evaporation", "after"],
      ["Heavy rain leads to soil erosion", "causes"]
    ]) {
      const frame = analyzeTeacherInput(text).frames[0];
      expect(frame.relations[0].predicate, text).toBe(predicate);
      expect(frame.resolutionStatus, text).toBe("resolved");
      expect(frame.relations[0].sourceMentionIds, text).toHaveLength(1);
      expect(frame.relations[0].targetMentionIds, text).toHaveLength(1);
      expect(frame.evidence[0].text, text).toBe(text);
    }
  });

  it("keeps natural article-led event clauses as open concept nodes", () => {
    const scene = run("The sun rises happens before the moon appears");
    expect(scene.entities.map((entity) => entity.label)).toEqual(["sun rises", "moon appears"]);
    expect(scene.relations?.[0].kind).toBe("before");
  });

  it("creates arbitrary readable concept labels only inside a registered relation", () => {
    const script = interpret("Heavy rain causes soil erosion");
    expect(script.schemaVersion).toBe("1.8.0");
    expect(script.commands.filter((command) => command.action === "create").map((command) => command.action === "create" && command.entity))
      .toEqual([
        expect.objectContaining({ id: "concept-1", kind: "generic", label: "heavy rain" }),
        expect.objectContaining({ id: "concept-2", kind: "generic", label: "soil erosion" })
      ]);
    expect(script.commands).toContainEqual(expect.objectContaining({
      action: "relate",
      relation: expect.objectContaining({ kind: "causes", sourceIds: ["concept-1"], targetIds: ["concept-2"] })
    }));
  });

  it("canonicalizes after into an earlier-to-later edge and layout", () => {
    const scene = run("Condensation happens after evaporation");
    const relation = scene.relations![0];
    expect(relation).toMatchObject({ kind: "before", sourceIds: ["concept-1"], targetIds: ["concept-2"] });
    expect(scene.entities.map((entity) => entity.label)).toEqual(["evaporation", "condensation"]);
    expect(eventFlowGeometry(relation, scene.entities)).not.toBeNull();
  });

  it("reuses matching nodes to build a chain instead of duplicating concepts", () => {
    const first = run("Evaporation happens before condensation");
    const chain = run("Condensation comes before rainfall", first);
    expect(chain.entities.map((entity) => entity.label)).toEqual(["evaporation", "condensation", "rainfall"]);
    expect(chain.relations?.filter((relation) => relation.kind === "before")).toHaveLength(2);
    expect(hasDirectedCycle(chain.relations ?? [], "before")).toBe(false);
    const html = renderToStaticMarkup(<DoodleCanvas scene={chain} />);
    expect(html.match(/class="event-annotation event-before"/g)).toHaveLength(2);
    expect(html).toContain("evaporation before condensation");
    expect(html).toContain("condensation before rainfall");
  });

  it("uses the same causal plan for causes, leads to, and results in", () => {
    const project = (text: string) => {
      const scene = run(text);
      return {
        labels: scene.entities.map((entity) => entity.label),
        relation: scene.relations?.map(({ kind, sourceIds, targetIds }) => ({ kind, sourceIds, targetIds }))
      };
    };
    expect(project("Heat causes expansion")).toEqual(project("Heat leads to expansion"));
    expect(project("Heat causes expansion")).toEqual(project("Heat results in expansion"));
  });

  it("rejects cycles and duplicate claims without mutating the accepted scene", () => {
    const chain = run("Condensation happens before rainfall", run("Evaporation happens before condensation"));
    const saved = structuredClone(chain);
    for (const text of ["Rainfall happens before evaporation", "Evaporation happens before condensation"]) {
      const checked = validateDoodleScript(interpret(text, chain), chain);
      expect(checked.ok, text).toBe(false);
      if (!checked.ok) expect(checked.issues.some((issue) => issue.gate === "semantic"), text).toBe(true);
      expect(chain).toEqual(saved);
    }
  });

  it("rejects old-version, multi-source, and self-referential event scripts", () => {
    const valid = interpret("Heat causes expansion");
    expect(validateDoodleScript({ ...valid, schemaVersion: "1.7.0" }, initialScene).ok).toBe(false);
    const relationIndex = valid.commands.findIndex((command) => command.action === "relate");
    const malformed = structuredClone(valid);
    const command = malformed.commands[relationIndex];
    if (command.action === "relate") command.relation.sourceIds.push(command.relation.targetIds[0]);
    expect(validateDoodleScript(malformed, initialScene).ok).toBe(false);
    const self = structuredClone(valid);
    const selfCommand = self.commands[relationIndex];
    if (selfCommand.action === "relate") selfCommand.relation.targetIds = [...selfCommand.relation.sourceIds];
    expect(validateDoodleScript(self, initialScene).ok).toBe(false);
  });

  it("keeps negation, uncertainty, and unrelated unknown verbs outside the scene", () => {
    for (const text of ["Rain does not cause erosion", "Maybe heat causes expansion", "A dragon eats books"]) {
      expect(interpretTeacherText(text, initialScene).ok, text).toBe(false);
      expect(initialScene.entities, text).toEqual([]);
    }
  });

  it("cleans an event edge when either endpoint is removed", () => {
    const scene = run("Heat causes expansion");
    const removed = run("Remove heat", scene);
    expect(removed.entities.map((entity) => entity.label)).toEqual(["expansion"]);
    expect(removed.relations).toEqual([]);
  });

  it("allows a later schema version to compose with handover commands", () => {
    const before = run("Three students each have a book");
    const handover = interpret("The first student gives book 1 to the second student", before);
    expect(validateDoodleScript({ ...handover, schemaVersion: "1.8.0" }, before).ok).toBe(true);
  });
});
