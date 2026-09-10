import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { callReturnGeometry, matchCallReturnFlow } from "./callReturnFlow";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";

function build(text: string) {
  const interpreted = interpretTeacherText(text, initialScene);
  if (!interpreted.ok) throw new Error(interpreted.message);
  const checked = validateDoodleScript(interpreted.script, initialScene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return { script: checked.script, scene: applyDoodleScript(initialScene, checked.script) };
}

describe("open call-and-return flow construction", () => {
  it("binds reusable caller and callee nouns while verifying the repeated destination", () => {
    expect(matchCallReturnFlow("when you call a function, the program jumps to that function, runs it, then comes back to where it left off")).toEqual({
      callerText: "program", functionText: "function", callSiteText: "call site"
    });
    expect(matchCallReturnFlow("when we call a subroutine, the application moves to that subroutine, executes it, then returns back to where it stopped")?.callerText).toBe("application");
    expect(matchCallReturnFlow("the app calls a service, control moves to that service, executes it, then returns to the same return point")?.functionText).toBe("service");
    expect(matchCallReturnFlow("when you call a function, the program jumps to that procedure, runs it, then comes back to where it left off")).toBeNull();
    expect(matchCallReturnFlow("when you call a function, the program jumps to that function and runs it")).toBeNull();
  });

  it("builds three identities and a complete two-edge control flow", () => {
    const { script, scene } = build("When you call a function, the program jumps to that function, runs it, then comes back to where it left off.");
    expect(script.schemaVersion).toBe("2.8.0");
    expect(scene.entities.map(({ label, visualRole }) => [label, visualRole])).toEqual([
      ["program", "control-caller"], ["function", "control-function"], ["call site", "control-call-site"]
    ]);
    expect(scene.relations).toEqual([
      expect.objectContaining({ kind: "calls", predicate: "calls", sourceIds: [scene.entities[0].id], targetIds: [scene.entities[1].id] }),
      expect.objectContaining({ kind: "returnsControlTo", predicate: "returnsTo", sourceIds: [scene.entities[1].id], targetIds: [scene.entities[2].id] })
    ]);
    expect(callReturnGeometry(scene.relations!, scene.entities)).not.toBeNull();
  });

  it("renders one accessible round trip that returns to the exact marked call site", () => {
    const { scene } = build("When you call a function, the program jumps to that function, runs it, then comes back to where it left off.");
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html).toContain('data-relation-layout="call-return-flow"');
    expect(html).toContain('data-layout-topology="control-transfer"');
    for (const cue of ["main-flow-line", "function-block", "call-arrow", "return-arrow", "same-return-point"]) expect(html).toContain(`data-visual-cue="${cue}"`);
    expect(html).toContain('aria-label="program calls function; control returns to the same call site"');
    expect(html.match(/class="call-return-flow-annotation"/g)).toHaveLength(1);
    expect(html).not.toContain('class="doodle-object');
  });

  it("rejects old-version, incomplete, wrong-role, and wrong-return-point graphs", () => {
    const { script } = build("The app calls a service, control moves to that service, executes it, then returns to the same return point.");
    expect(validateDoodleScript({ ...script, schemaVersion: "2.7.0" }, initialScene).ok).toBe(false);
    const incomplete = { ...script, commands: script.commands.filter((command) => command.action !== "relate" || command.relation.kind !== "returnsControlTo") };
    expect(validateDoodleScript(incomplete, initialScene).ok).toBe(false);
    const wrongRole = structuredClone(script);
    const firstCreate = wrongRole.commands.find((command) => command.action === "create");
    if (firstCreate?.action === "create") firstCreate.entity.visualRole = "object";
    expect(validateDoodleScript(wrongRole, initialScene).ok).toBe(false);
    const wrongReturn = structuredClone(script);
    const returning = wrongReturn.commands.find((command) => command.action === "relate" && command.relation.kind === "returnsControlTo");
    const caller = wrongReturn.commands.find((command) => command.action === "create" && command.entity.visualRole === "control-caller");
    if (returning?.action === "relate" && caller?.action === "create") returning.relation.targetIds = [caller.entity.id];
    expect(validateDoodleScript(wrongReturn, initialScene).ok).toBe(false);
  });
});
