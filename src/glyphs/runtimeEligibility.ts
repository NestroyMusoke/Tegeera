import type { SceneEntity } from "../doodlescript/schema";
import { natureEmojiPreviewFor } from "./emojiPreview";

/** A model's broad "person" type must not suppress a known animal doodle. */
export function needsRuntimeGlyph(entity: SceneEntity): boolean {
  if (!entity.label || entity.glyph) return false;
  return entity.kind === "generic"
    || (entity.kind === "person" && Boolean(natureEmojiPreviewFor(entity.label)));
}
