import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { matchPartWholeFlow, partWholeFlowGeometry } from "./partWholeFlow";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";

function run(text: string) {
  const interpreted = interpretTeacherText(text, initialScene);
  if (!interpreted.ok) throw new Error(interpreted.message);
  const checked = validateDoodleScript(interpreted.script, initialScene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return { script: checked.script, scene: applyDoodleScript(initialScene, checked.script) };
}

describe("registered part-whole flow grammar", () => {
  it("extracts open whole, input and conduit-part slots rather than a stored lesson", () => {
    expect(matchPartWholeFlow("a machine takes in fuel through its inlet and air through its vent")).toEqual({
      wholeText: "a machine",
      channels: [
        { inputText: "fuel", partText: "inlet", flowPredicate: "flowsInto" },
        { inputText: "air", partText: "vent", flowPredicate: "flowsInto" }
      ]
    });
    expect(matchPartWholeFlow("a plant takes in water and sunlight")).toBeNull();
  });

  it("builds case 1 as five identities and four DoodleScript 2 relations", () => {
    const { script, scene } = run("A plant takes in water through its roots and sunlight through its leaves.");
    expect(script.schemaVersion).toBe("2.0.0");
    expect(scene.entities.map(({ label }) => label).sort()).toEqual(["leaves", "plant", "roots", "sunlight", "water"]);
    expect(scene.relations?.map(({ kind }) => kind)).toEqual(["partOf", "flowsInto", "partOf", "illuminates"]);
    expect(scene.relations?.every((relation) => partWholeFlowGeometry(relation, scene.entities))).toBe(true);
    const at = (label: string) => scene.entities.find((entity) => entity.label === label)!;
    expect(at("water").x).toBeLessThan(at("roots").x);
    expect(at("roots").x).toBeLessThan(at("plant").x);
  });

  it("renders the semantic parts, flow directions and required reusable cues", () => {
    const { scene } = run("A plant absorbs water via its roots and sunlight via its leaves.");
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    for (const cue of ["visible-roots", "soil-boundary", "water-entry-arrow", "sun-symbol", "leaf-targeted-ray"]) {
      expect(html).toContain(`data-visual-cue="${cue}"`);
    }
    expect(html).toContain('data-relation-layout="part-whole-flow"');
    expect(html).toContain('data-layout-topology="part-whole"');
    expect(html).toContain('aria-label="water flows into roots"');
    expect(html).toContain('aria-label="sunlight illuminates leaves"');
  });

  it("rejects pre-v2 scripts while leaving ordinary unrouted intake available", () => {
    const { script } = run("A plant takes in water through its roots and sunlight through its leaves.");
    expect(validateDoodleScript({ ...script, schemaVersion: "1.9.0" }, initialScene).ok).toBe(false);
    expect(interpretTeacherText("A plant takes in water and sunlight", initialScene).ok).toBe(true);
  });
});
