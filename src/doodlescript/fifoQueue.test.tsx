import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { fifoGeometry, matchFifoQueue } from "./fifoQueue";
import { validateDoodleScript } from "./validator";

describe("analogy-aware FIFO queue construction", () => {
  const text = "A queue works like a line at the bank — first come, first served.";

  it("extracts FIFO structure without turning the analogy into literal scenery", () => {
    expect(matchFifoQueue(text.toLowerCase().replace(/\.$/, ""))).toEqual({
      queueText: "queue", serviceText: "service", firstText: "item 1", secondText: "item 2", thirdText: "item 3"
    });
  });

  it("creates typed FIFO order, safe geometry, and one specialist SVG", () => {
    const result = interpretTeacherText(text, initialScene); expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.script.schemaVersion).toBe("2.21.0");
    expect(validateDoodleScript(result.script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, result.script);
    expect(scene.relations?.map(({ kind }) => kind)).toEqual(["fifoBefore", "fifoBefore", "servedBy"]);
    expect(fifoGeometry(scene.relations ?? [], scene.entities)?.members.map(({ label }) => label)).toEqual(["item 3", "item 2", "item 1"]);
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html.match(/class="fifo-queue-annotation"/g)).toHaveLength(1);
    for (const cue of ["fifo-box-lane", "rear-marker", "front-marker", "enqueue-arrow", "dequeue-arrow", "first-served-cue"]) expect(html).toContain(`data-visual-cue="${cue}"`);
    expect(html).not.toContain('class="doodle-object');
    expect(html.toLowerCase()).not.toContain("bank");
    expect(html).not.toContain("character-rig");
  });

  it("generalizes to named queues while rejecting incomplete or unsafe claims", () => {
    expect(interpretTeacherText("In a print queue, the first task in is the first processed.", initialScene).ok).toBe(true);
    for (const value of ["A queue has items.", "A queue might be first come, first served.", "A queue is not first come, first served.", "A stack is last come, first served."]) {
      expect(interpretTeacherText(value, initialScene).ok, value).toBe(false);
    }
  });
});
