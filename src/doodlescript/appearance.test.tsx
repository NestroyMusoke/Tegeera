import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { parseEntityPhrase } from "./lexicon";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";

const interpret = (text: string, scene = initialScene) => {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  const validated = validateDoodleScript(result.script, scene);
  if (!validated.ok) throw new Error(JSON.stringify(validated.issues));
  return { script: validated.script, scene: applyDoodleScript(scene, validated.script) };
};

describe("composable object appearance", () => {
  it("parses quantity, color and noun independently", () => {
    expect(parseEntityPhrase("a yellow book")).toMatchObject({ kind: "book", count: 1, color: "yellow", noun: "book" });
    expect(parseEntityPhrase("three blue cars")).toMatchObject({ kind: "car", count: 3, color: "blue", noun: "cars" });
    expect(parseEntityPhrase("yellow book")).toMatchObject({ kind: "book", count: 1, color: "yellow" });
  });

  it("creates and visibly renders a colored object through DoodleScript 2.25", () => {
    const result = interpret("A yellow book.");
    expect(result.script.schemaVersion).toBe("2.25.0");
    expect(result.scene.entities[0]).toMatchObject({ kind: "book", color: "yellow", label: "yellow book 1" });
    const html = renderToStaticMarkup(<DoodleCanvas scene={result.scene} />);
    expect(html).toContain('data-entity-color="yellow"');
    expect(html).toContain('--entity-color:#f3cf55');
    expect(html).toContain("entity-color-fill");
  });

  it("applies one descriptor to every member of an open counted group", () => {
    const { script, scene } = interpret("Three blue cars.");
    expect(script.commands.filter(({ action }) => action === "create")).toHaveLength(3);
    expect(scene.entities).toHaveLength(3);
    expect(scene.entities.every(({ kind, color }) => kind === "car" && color === "blue")).toBe(true);
  });

  it("recolors an existing object without recreating it", () => {
    const before = interpret("A yellow book.").scene;
    const after = interpret("Make the book green.", before);
    expect(after.scene.entities).toHaveLength(1);
    expect(after.scene.entities[0]).toMatchObject({ id: before.entities[0].id, kind: "book", color: "green" });
    expect(after.script.commands).toContainEqual(expect.objectContaining({ action: "update", targetId: before.entities[0].id, color: "green" }));
  });

  it("composes color with relationships and performance in the newest version", () => {
    const ownership = interpret("A yellow student owns a blue book.");
    expect(ownership.script.schemaVersion).toBe("2.25.0");
    expect(ownership.scene.relations?.[0]).toMatchObject({ kind: "owns" });
    expect(ownership.scene.entities.map(({ color }) => color)).toEqual(["yellow", "blue"]);

    const performance = interpret("A purple teacher waves.");
    expect(performance.script.schemaVersion).toBe("2.25.0");
    expect(performance.scene.entities[0]).toMatchObject({ color: "purple", performance: expect.any(Object) });
  });

  it("keeps appearance bounded and versioned instead of accepting arbitrary style fields", () => {
    const { script } = interpret("A yellow book.");
    expect(validateDoodleScript({ ...script, schemaVersion: "2.24.0" }, initialScene)).toMatchObject({ ok: false });
    const create = script.commands.find(({ action }) => action === "create");
    if (!create || create.action !== "create") throw new Error("Expected a create command");
    expect(validateDoodleScript({
      ...script,
      commands: [{ ...create, entity: { ...create.entity, color: "ultraviolet" } }]
    }, initialScene)).toMatchObject({ ok: false });
    expect(interpretTeacherText("A striped book.", initialScene)).toMatchObject({ ok: false });
  });
});
