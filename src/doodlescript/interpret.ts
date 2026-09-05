import type { DoodleCommand, DoodleScript, EntityKind, SceneEntity, SceneState } from "./schema";
import { applyDoodleScript } from "./scene";
import { nextPosition } from "./layout";

export type Interpretation =
  | { ok: true; script: DoodleScript }
  | { ok: false; message: string; clause: string };
const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const nouns: Record<string, EntityKind> = {
  person: "person", people: "person", persons: "person",
  student: "student", students: "student", learner: "student", learners: "student",
  teacher: "teacher", teachers: "teacher", lecturer: "teacher", lecturers: "teacher",
  car: "car", cars: "car", vehicle: "car", vehicles: "car",
  book: "book", books: "book", tree: "tree", trees: "tree",
  building: "building", buildings: "building", school: "building", schools: "building",
  house: "building", houses: "building"
};
const ordinals = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
const count = (word: string) => /^(a|an|another)$/.test(word) ? 1 : /^\d+$/.test(word) ? Number(word) : words.indexOf(word);
class Clarification extends Error {}

function nounPhrase(phrase: string): { kind: EntityKind; count: number } {
  const match = phrase.trim().match(/^(?:(\w+) )?(\w+)$/);
  const kind = match && nouns[match[2]];
  if (!match || !kind) throw new Clarification(`I cannot yet represent “${phrase}”. Please describe its objects separately.`);
  const amount = match[1] ? count(match[1]) : 1;
  if (amount < 1 || amount > 12) throw new Clarification("Use a count from one to twelve; I have not changed the scene.");
  if (!match[1] && (match[2].endsWith("s") || match[2] === "people")) throw new Clarification(`How many ${match[2]} should I draw?`);
  return { kind, count: amount };
}

function resolve(phrase: string, scene: SceneState): SceneEntity {
  const normalized = phrase.replace(/^the /, "");
  const exact = scene.entities.filter((entity) => entity.label?.toLowerCase() === normalized);
  if (exact.length === 1) return exact[0];
  const tokens = normalized.split(" ");
  const ordinal = ordinals.indexOf(tokens[0]);
  const kind = nouns[tokens.at(-1) ?? ""];
  const candidates = kind ? scene.entities.filter((entity) => entity.kind === kind) : [];
  if (ordinal >= 0 && tokens.length === 2 && candidates[ordinal]) return candidates[ordinal];
  if (tokens.length === 1 && candidates.length === 1) return candidates[0];
  if (/^(it|that)$/.test(normalized) && scene.entities.length === 1) return scene.entities[0];
  throw new Clarification(candidates.length > 1
    ? `Which ${kind}? Say “the first ${kind}” or “the second ${kind}”.`
    : `I cannot identify “${phrase}” in this scene. Name an existing object.`);
}

export function interpretTeacherText(input: string, scene: SceneState): Interpretation {
  const commands: DoodleCommand[] = [];
  let working = scene;
  let currentClause = input;
  const makeScript = (): DoodleScript => ({
    schemaVersion: "1.1.0", sceneId: scene.sceneId, revision: scene.revision + 1,
    confidence: 1, sourceText: input, commands
  });
  const append = (command: DoodleCommand) => {
    commands.push(command);
    working = applyDoodleScript(scene, makeScript());
  };
  const create = (phrase: string): string[] => {
    const spec = nounPhrase(phrase);
    const ids: string[] = [];
    for (let i = 0; i < spec.count; i++) {
      const position = nextPosition(working.entities);
      if (!position) throw new Clarification("There is no readable space left. Remove an object or start a new scene.");
      let number = 1;
      while (working.entities.some((entity) => entity.id === `${spec.kind}-${number}`)) number++;
      const id = `${spec.kind}-${number}`;
      append({ action: "create", entity: {
        id, kind: spec.kind, label: `${spec.kind} ${number}`, ...position,
        scale: 1, direction: "right", highlighted: false
      } });
      ids.push(id);
    }
    return ids;
  };
  const relate = (kind: "shares" | "owns", sourceIds: string[], targetIds: string[]) => {
    append({ action: "relate", relation: {
      id: `relation-${scene.revision + 1}-${commands.length}`, kind, sourceIds, targetIds
    } });
  };
  try {
    if (!input.trim() || input.length > 500) throw new Clarification("Explain one short scene or change, up to 500 characters.");
    const clauses = input.toLowerCase().trim().replace(/[.!?]+$/, "").split(/\s*(?:[.;]|,?\s+then\s+)\s*/);
    for (const clause of clauses) {
      currentClause = clause;
      const text = clause.replace(/^(?:please |imagine |draw |add |show )/, "").trim();
      if (/^(?:clear(?: everything| the scene)?|erase everything|start over)$/.test(clause)) {
        append({ action: "clear" }); continue;
      }
      const move = clause.match(/^(move|turn|face) (.+?) (?:to the )?(left|right|up|down)$/);
      if (move) {
        const target = resolve(move[2], working);
        const direction = move[3] as "left" | "right" | "up" | "down";
        if (move[1] !== "move") append({ action: "update", targetId: target.id, direction });
        else append({ action: "move", targetId: target.id, direction,
          x: target.x + (direction === "left" ? -18 : direction === "right" ? 18 : 0),
          y: target.y + (direction === "up" ? -32 : direction === "down" ? 32 : 0)
        });
        continue;
      }
      const remove = clause.match(/^(?:remove|delete|erase) (.+)$/);
      if (remove) { append({ action: "remove", targetId: resolve(remove[1], working).id }); continue; }
      const highlight = clause.match(/^highlight (.+)$/);
      if (highlight) { append({ action: "update", targetId: resolve(highlight[1], working).id, highlighted: true }); continue; }
      const rename = clause.match(/^rename (.+?) to (.{1,60})$/);
      if (rename) { append({ action: "update", targetId: resolve(rename[1], working).id, label: rename[2] }); continue; }
      const arrival = text.match(/^another (\w+) (?:arrives|joins)(?:,? but (?:she|he|they) already (?:has|have) (?:her|his|their) own (\w+)| with (?:her|his|their|an?) (?:own )?(\w+))?$/);
      if (arrival) {
        const owners = create(`one ${arrival[1]}`);
        const object = arrival[2] ?? arrival[3];
        if (object) relate("owns", owners, create(`one ${object}`));
        continue;
      }
      const relationship = text.match(/^(.+?) (?:are )?(sharing|share|shares|owns|own|has|have) (.+)$/);
      if (relationship) {
        const source = relationship[1].startsWith("the ")
          ? [resolve(relationship[1], working).id] : create(relationship[1]);
        const kind = /^(sharing|share|shares)$/.test(relationship[2]) ? "shares" : "owns";
        if (kind === "owns" && source.length !== 1) throw new Clarification("Does each person own an item, or do they share the items?");
        relate(kind, source, create(relationship[3])); continue;
      }
      const description = text.replace(/ (?:waiting )?in a (?:queue|line)$/, "");
      for (const phrase of description.split(/\s+and\s+/)) create(phrase);
    }
    return { ok: true, script: makeScript() };
  } catch (error) {
    if (!(error instanceof Clarification)) throw error;
    return { ok: false, message: error.message, clause: currentClause };
  }
}
