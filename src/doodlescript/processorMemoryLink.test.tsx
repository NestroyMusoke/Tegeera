import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { matchProcessorMemoryLink, processorMemoryGeometry } from "./processorMemoryLink";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";

describe("analogy-aware processor-memory communication", () => {
  const text = "The CPU is the brain of the computer, but it needs memory nearby to work fast.";

  it("extracts system roles while discarding the brain metaphor", () => {
    expect(matchProcessorMemoryLink(text.toLowerCase().replace(/\.$/, ""))).toEqual({ processorText: "cpu", memoryText: "memory" });
  });

  it("builds a bidirectional nearby data path and specialist SVG", () => {
    const result = interpretTeacherText(text, initialScene); expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.script.schemaVersion).toBe("2.22.0");
    expect(validateDoodleScript(result.script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, result.script);
    expect(scene.relations?.map(({ kind }) => kind)).toEqual(["exchangesWith", "keptNear"]);
    expect(processorMemoryGeometry(scene.relations ?? [], scene.entities)).not.toBeNull();
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html.match(/class="processor-memory-annotation"/g)).toHaveLength(1);
    for (const cue of ["processor-block", "memory-block", "bidirectional-data-bus", "speed-pulses", "nearby-spacing"]) expect(html).toContain(`data-visual-cue="${cue}"`);
    expect(html).not.toContain('class="doodle-object');
    expect(html.toLowerCase()).not.toContain("brain");
  });

  it("supports open component names and safely rejects incomplete claims", () => {
    for (const direct of [
      "A processor communicates with nearby cache to respond quickly.",
      "The controller exchanges data with nearby storage to run fast.",
      "A graphics unit passes data back and forth with video memory to work quickly."
    ]) expect(interpretTeacherText(direct, initialScene).ok, direct).toBe(true);
    for (const unsafe of [
      "The CPU is the brain of the computer.",
      "The CPU might need memory nearby to work fast.",
      "The CPU does not need memory nearby to work fast.",
      "Memory is nearby."
    ]) expect(interpretTeacherText(unsafe, initialScene).ok, unsafe).toBe(false);
  });
});
