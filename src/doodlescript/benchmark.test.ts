import { expect, it } from "vitest";
import { interpretTeacherText } from "./interpret";
import { validateDoodleScript } from "./validator";
import { applyDoodleScript, initialScene } from "./scene";

it("measures interpretation, validation and scene application separately from speech and painting", () => {
  const times: number[] = [];
  for (let i = 0; i < 250; i++) {
    const start = performance.now();
    const result = interpretTeacherText("Three students share two books. Another student arrives with her own book.", initialScene);
    if (!result.ok) throw new Error(result.message);
    const checked = validateDoodleScript(result.script, initialScene);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const scene = applyDoodleScript(initialScene, checked.script);
    times.push(performance.now() - start);
    expect(scene.entities).toHaveLength(7);
  }
  times.sort((a, b) => a - b);
  console.info(`Meaning pipeline: n=250, median=${times[125].toFixed(2)}ms, p95=${times[237].toFixed(2)}ms. Excludes speech, DOM and SVG painting.`);
});
