import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { linkedChainGeometry, matchLinkedChain } from "./linkedChain";
import { applyDoodleScript } from "./scene";
import type { DoodleScript, SceneState } from "./schema";
import { analyzeTeacherInput } from "./semanticFrame";
import { validateDoodleScript } from "./validator";

const empty: SceneState = { sceneId: "linked", revision: 0, entities: [], relations: [] };
const build = (text: string) => {
  const interpretation = interpretTeacherText(text, empty);
  expect(interpretation.ok).toBe(true);
  if (!interpretation.ok) throw new Error(interpretation.message);
  expect(validateDoodleScript(interpretation.script, empty).ok).toBe(true);
  const scene = applyDoodleScript(empty, interpretation.script);
  return { script: interpretation.script, scene, html: renderToStaticMarkup(<DoodleCanvas scene={scene} />) };
};

describe("general linked-chain construction", () => {
  it("extracts pointer topology without rendering a literal chain analogy", () => {
    expect(matchLinkedChain("a linked list is like a chain — each item points to the next one")).toMatchObject({ collectionText: "linked list", itemText: "item", firstText: "item 1" });
    expect(matchLinkedChain("a playlist is a linked sequence where each track links to the next one")).toMatchObject({ collectionText: "playlist", itemText: "track" });
    expect(matchLinkedChain("a route forms a chain, each stop pointing to the next node")).toMatchObject({ collectionText: "route", itemText: "stop" });
    expect(matchLinkedChain("a chain has three links")).toBeNull();
  });

  it("builds and renders a complete forward pointer chain", () => {
    const { script, scene, html } = build("A linked list is like a chain — each item points to the next one.");
    expect(script.schemaVersion).toBe("2.18.0");
    expect(linkedChainGeometry(scene.relations ?? [], scene.entities)).not.toBeNull();
    for (const cue of ["head-marker", "separate-node-boxes", "next-pointer-arrows", "null-tail-marker", "left-to-right-pointer-order"]) expect(html).toContain(`data-visual-cue="${cue}"`);
    expect(html).toContain('data-layout-topology="pointer-chain"');
    expect(html.match(/linked-chain-annotation/g)).toHaveLength(1);
    expect(html).not.toContain('class="doodle-object');
  });

  it("preserves open vocabulary and rejects downgraded or incomplete graphs", () => {
    const { script, html } = build("A playlist is a linked sequence where each track links to the next one.");
    expect(html).toContain("playlist");
    expect(html).toContain("track 1");
    expect(validateDoodleScript({ ...script, schemaVersion: "2.17.0" }, empty).ok).toBe(false);
    const incomplete: DoodleScript = { ...script, commands: script.commands.filter((command) => command.action !== "relate" || command.relation.sourceIds[0] !== command.relation.targetIds[0] && command.relation.kind !== "hasFirstNode") };
    expect(validateDoodleScript(incomplete, empty).ok).toBe(false);
  });

  it("exposes linked structure at the semantic boundary", () => {
    const frame = analyzeTeacherInput("A linked list is like a chain — each item points to the next one.").frames[0];
    expect(frame.meaningCandidates).toEqual([{ family: "linked-structure", predicate: "linked-chain" }]);
    expect(frame.linkedChains).toHaveLength(1);
  });
});
