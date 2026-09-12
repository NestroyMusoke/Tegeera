import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { indexedCollectionGeometry, matchIndexedCollection } from "./indexedCollection";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript } from "./scene";
import type { DoodleScript, SceneState } from "./schema";
import { analyzeTeacherInput } from "./semanticFrame";
import { validateDoodleScript } from "./validator";

const empty: SceneState = { sceneId: "indexed", revision: 0, entities: [], relations: [] };
const build = (text: string) => {
  const interpretation = interpretTeacherText(text, empty);
  expect(interpretation.ok).toBe(true);
  if (!interpretation.ok) throw new Error(interpretation.message);
  expect(validateDoodleScript(interpretation.script, empty).ok).toBe(true);
  const scene = applyDoodleScript(empty, interpretation.script);
  return { script: interpretation.script, scene, html: renderToStaticMarkup(<DoodleCanvas scene={scene} />) };
};

describe("general indexed-collection construction", () => {
  it("extracts domain-independent rows, values, and zero- or one-based indices", () => {
    expect(matchIndexedCollection("an array is a row of boxes, each one holding a value, numbered starting from zero")).toMatchObject({ collectionText: "array", cellsText: "array boxes", valuesText: "value", startIndex: 0 });
    expect(matchIndexedCollection("a register is a row of cells, each storing a bit, indexed starting at one")).toMatchObject({ collectionText: "register", cellsText: "register cells", valuesText: "bit", startIndex: 1 });
    expect(matchIndexedCollection("an array holds values")).toBeNull();
    expect(matchIndexedCollection("a row is numbered starting from two")).toBeNull();
  });

  it("builds, validates, and renders the complete indexed topology", () => {
    const { script, scene, html } = build("An array is a row of boxes, each one holding a value, numbered starting from zero.");
    expect(script.schemaVersion).toBe("2.17.0");
    expect(indexedCollectionGeometry(scene.relations ?? [], scene.entities)).toMatchObject({ startIndex: 0 });
    for (const cue of ["indexed-box-row", "cell-values", "zero-based-indices", "left-to-right-indexing"]) expect(html).toContain(`data-visual-cue="${cue}"`);
    expect(html).toContain('data-layout-topology="indexed-cells"');
    expect(html.match(/indexed-collection-annotation/g)).toHaveLength(1);
    expect(html).not.toContain('class="doodle-object');
  });

  it("keeps arbitrary readable terminology and rejects incomplete or forged graphs", () => {
    const { script, html } = build("A register is a row of cells, each storing a bit, indexed starting at one.");
    expect(html).toContain("register");
    expect(html).toContain("bit 1");
    expect(html).toContain(">1</text>");
    expect(validateDoodleScript({ ...script, schemaVersion: "2.16.0" }, empty).ok).toBe(false);
    const forged: DoodleScript = { ...script, commands: script.commands.filter((command) => command.action !== "relate" || command.relation.kind !== "startsIndexAt") };
    expect(validateDoodleScript(forged, empty).ok).toBe(false);
  });

  it("publishes the complete meaning at the semantic boundary", () => {
    const frame = analyzeTeacherInput("An array is a row of boxes, each one holding a value, numbered starting from zero.").frames[0];
    expect(frame.meaningCandidates).toEqual([{ family: "indexed-collection", predicate: "indexed-collection" }]);
    expect(frame.indexedCollections[0]).toMatchObject({ construction: "indexed-collection", startIndex: 0 });
  });
});
