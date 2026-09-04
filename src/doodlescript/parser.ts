import type {
  Direction,
  DoodleScript,
  EntityKind,
  SceneState
} from "./parserTypes";

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6
};

const kinds: Array<[RegExp, EntityKind]> = [
  [/\b(?:students?|learners?)\b/i, "student"],
  [/\b(?:teachers?|lecturers?)\b/i, "teacher"],
  [/\b(?:people|persons?|girls?|boys?)\b/i, "person"],
  [/\b(?:cars?|vehicles?)\b/i, "car"],
  [/\b(?:books?)\b/i, "book"],
  [/\b(?:trees?)\b/i, "tree"],
  [/\b(?:schools?|houses?|buildings?)\b/i, "building"]
];

const directions: Array<[RegExp, Direction]> = [
  [/\bleft\b/i, "left"],
  [/\bright\b/i, "right"],
  [/\b(?:up|forward)\b/i, "up"],
  [/\b(?:down|back(?:ward)?)\b/i, "down"]
];

const findCount = (text: string): number => {
  const digit = text.match(/\b([1-6])\b/);
  if (digit) return Number(digit[1]);
  const word = Object.entries(numberWords).find(([key]) =>
    new RegExp(`\\b${key}\\b`, "i").test(text)
  );
  return word?.[1] ?? 1;
};

const findDirection = (text: string): Direction | undefined =>
  directions.find(([pattern]) => pattern.test(text))?.[1];

export function parseTeacherText(
  input: string,
  scene: SceneState
): DoodleScript | null {
  const text = input.trim();
  if (!text) return null;

  if (/\b(?:clear|erase everything|start over)\b/i.test(text)) {
    return makeScript(text, scene, [{ action: "clear" }], 0.99);
  }

  if (/\b(?:remove|delete|erase)\b/i.test(text)) {
    const target = [...scene.entities]
      .reverse()
      .find((entity) => text.toLowerCase().includes(entity.kind));
    if (!target) return null;
    return makeScript(
      text,
      scene,
      [{ action: "remove", targetId: target.id }],
      0.91
    );
  }

  if (/\b(?:move|turn|face)\b/i.test(text) && scene.entities.length) {
    const matchedKind = kinds.find(([pattern]) => pattern.test(text))?.[1];
    const target =
      [...scene.entities]
        .reverse()
        .find((entity) => !matchedKind || entity.kind === matchedKind) ??
      scene.entities.at(-1);
    const direction = findDirection(text);
    if (!target || !direction) return null;
    const delta = 12;
    return makeScript(
      text,
      scene,
      [
        {
          action: "move",
          targetId: target.id,
          x:
            direction === "left"
              ? Math.max(8, target.x - delta)
              : direction === "right"
                ? Math.min(92, target.x + delta)
                : undefined,
          y:
            direction === "up"
              ? Math.max(18, target.y - delta)
              : direction === "down"
                ? Math.min(82, target.y + delta)
                : undefined,
          direction
        }
      ],
      0.9
    );
  }

  const kindMatch = kinds.find(([pattern]) => pattern.test(text));
  if (!kindMatch) return null;
  const [, kind] = kindMatch;
  const count = findCount(text);
  const queue = /\b(?:queue|line|waiting)\b/i.test(text);
  const existingCount = scene.entities.length;
  const commands = Array.from({ length: count }, (_, index) => {
    const column = queue ? index : index % 3;
    const row = queue ? 0 : Math.floor(index / 3);
    return {
      action: "create" as const,
      entity: {
        id: `${kind}-${Date.now()}-${existingCount + index}`,
        kind,
        label: count === 1 ? kind : `${kind} ${index + 1}`,
        x: Math.min(86, 18 + column * 18),
        y: Math.min(78, 54 + row * 20),
        scale: 1,
        direction: "right" as const,
        highlighted: false
      }
    };
  });

  return makeScript(text, scene, commands, 0.88);
}

function makeScript(
  sourceText: string,
  scene: SceneState,
  commands: DoodleScript["commands"],
  confidence: number
): DoodleScript {
  return {
    schemaVersion: "1.0.0",
    sceneId: scene.sceneId === "welcome" ? crypto.randomUUID() : scene.sceneId,
    revision: scene.revision + 1,
    confidence,
    sourceText,
    commands
  };
}
