import { interpretTeacherText } from "../doodlescript/interpret";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import type { SceneState } from "../doodlescript/schema";
import { validateDoodleScript } from "../doodlescript/validator";
import type { ArgumentPanel } from "./sourceMap";

/** Illustrate a complete supported statement, never a noun extracted out of scope.
 * Questions, hypotheticals and negations must not become asserted scenes.
 * The original wording remains visible whether interpretation succeeds or not.
 */
export function illustratePanel(panel: ArgumentPanel): SceneState | undefined {
  if (panel.roles.some(role => role !== "statement")) return;
  if (/\b(?:no|not|never|none|neither|without|cannot|can't|isn't|aren't|wasn't|weren't|doesn't|didn't|would|could|might|may|imagine|suppose|claims?|believes?|says?|said)\b/i.test(panel.text)) return;
  try {
    const base = { ...initialScene, sceneId: `explanation-${panel.id}` };
    const interpretation = interpretTeacherText(panel.text.trim(), base);
    if (!interpretation.ok) return;
    const checked = validateDoodleScript(interpretation.script, base);
    if (!checked.ok) return;
    const scene = applyDoodleScript(base, checked.script);
    return scene.entities.length ? scene : undefined;
  } catch {
    // A failed illustration must never remove a speaker's statement.
    return undefined;
  }
}
