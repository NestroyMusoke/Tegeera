import type { DoodleScript, SceneState } from "./schema";
import { interpretTeacherText } from "./interpret";

export function parseTeacherText(input: string, scene: SceneState): DoodleScript | null {
  const result = interpretTeacherText(input, scene);
  return result.ok ? result.script : null;
}
