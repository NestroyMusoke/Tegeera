import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "./DoodleCanvas";
import { interpretTeacherText } from "../doodlescript/interpret";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { motionGeometry } from "../doodlescript/motion";

function run(text: string, scene = initialScene) {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  const checked = validateDoodleScript(result.script, scene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return applyDoodleScript(scene, checked.script);
}

describe("motion SVG rendering", () => {
  for (const kind of ["toward", "away"] as const) {
    it(`renders the ${kind} arrow and matching accessible relationship`, () => {
      const scene = run(`A car moves ${kind === "away" ? "away from" : "toward"} a person`);
      const geometry = motionGeometry(scene.entities[0], scene.entities[1], kind)!;
      const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
      expect(html).toContain(`d="M${geometry.startX} ${geometry.y} H${geometry.endX}"`);
      expect(html).toContain(`aria-label="moves ${kind === "away" ? "away from" : "toward"}"`);
      expect(html).toContain("Drawing containing 2 objects");
    });
  }
  it("removes the motion annotation when stopped and can render the prior revision", () => {
    const moving = run("A car approaches a person");
    const stopped = run("Stop it", moving);
    const html = renderToStaticMarkup(<DoodleCanvas scene={stopped} />);
    expect(html).not.toContain('class="motion-annotation"');
    expect(html).toContain("Drawing containing 2 objects");
    expect(renderToStaticMarkup(<DoodleCanvas scene={moving} />)).toContain('class="motion-annotation"');
  });
});
