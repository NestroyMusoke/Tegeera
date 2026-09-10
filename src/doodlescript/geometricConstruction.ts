import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

export const GEOMETRIC_CONSTRUCTION_VERSION = "1.0.0";

const ones: Readonly<Record<string, number>> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19
};
const tens: Readonly<Record<string, number>> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
};

export function parseDegreeMeasure(text: string): number | null {
  const normalized = text.toLowerCase().replace(/°/g, " degrees").replace(/-/g, " ").replace(/\s+/g, " ").trim();
  const phrase = normalized.replace(/ degrees?$/, "").trim();
  if (phrase === normalized) return null;
  if (/^\d+(?:\.\d+)?$/.test(phrase)) {
    const value = Number(phrase);
    return value > 0 && value < 360 ? value : null;
  }
  const words = phrase.split(" ").filter((word) => word !== "and");
  let value = 0;
  for (const word of words) {
    if (word in ones) value += ones[word];
    else if (word in tens) value += tens[word];
    else if (word === "hundred" && value > 0) value *= 100;
    else return null;
  }
  return value > 0 && value < 360 ? value : null;
}

export interface GeometricConstructionMatch {
  subjectText: string;
  measureText: string;
  degrees: number;
}

const constructionPattern = /^(.+?) (?:is (?:exactly )?|measures? )(.+?(?:\s+degrees?|°))(?:,? (?:like|such as) .+)?$/;
const stripArticle = (text: string) => text.trim().replace(/^(?:a|an|the) /, "");

/** Open angle and measurement slots; optional analogy text never becomes a scene node. */
export function matchGeometricConstruction(text: string): GeometricConstructionMatch | null {
  const match = text.match(constructionPattern);
  if (!match || !/\bangle\b/.test(match[1])) return null;
  const degrees = parseDegreeMeasure(match[2]);
  if (degrees === null) return null;
  const subjectText = stripArticle(match[1]);
  const measureText = match[2].replace(/°$/, " degrees");
  return subjectText && subjectText !== measureText ? { subjectText, measureText, degrees } : null;
}

export interface GeometricConstructionGeometry {
  subject: SceneEntity;
  measurement: SceneEntity;
  degrees: number;
  vertexX: number;
  vertexY: number;
  rayLength: number;
  secondX: number;
  secondY: number;
  isRightAngle: boolean;
}

export function geometricConstructionGeometry(relation: SceneRelation, entities: readonly SceneEntity[]): GeometricConstructionGeometry | null {
  if (relation.kind !== "measures" || relation.sourceIds.length !== 1 || relation.targetIds.length !== 1) return null;
  const subject = entities.find(({ id }) => id === relation.sourceIds[0]);
  const measurement = entities.find(({ id }) => id === relation.targetIds[0]);
  const degrees = parseDegreeMeasure(measurement?.label ?? "");
  if (!subject || !measurement || degrees === null || subject.visualRole !== "geometry" || measurement.visualRole !== "measurement") return null;
  if (Math.abs(subject.x - measurement.x) > 4 || measurement.y - subject.y < 24 || measurement.y - subject.y > 38) return null;
  const vertexX = subject.x * 10 - 90;
  const vertexY = subject.y * 6.2 + 105;
  const rayLength = 190;
  const radians = degrees * Math.PI / 180;
  return {
    subject, measurement, degrees, vertexX, vertexY, rayLength,
    secondX: vertexX + Math.cos(radians) * rayLength,
    secondY: vertexY - Math.sin(radians) * rayLength,
    isRightAngle: Math.abs(degrees - 90) < 0.001
  };
}

export function planGeometricConstruction(
  scene: SceneState,
  subjectId: string,
  measurementId: string,
  movableIds: ReadonlySet<string>
): { targetId: string; x: number; y: number }[] | null {
  if (subjectId === measurementId) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (!byId.has(subjectId) || !byId.has(measurementId)) return null;
  const position = (id: string, x: number, y: number) => ({ ...byId.get(id)!, x, y });
  const candidates = [52, 45, 59].map((x) => [position(subjectId, x, 28), position(measurementId, x, 58)]);
  const relation: SceneRelation = { id: "planned-measure", kind: "measures", sourceIds: [subjectId], targetIds: [measurementId] };
  const selected = selectLayoutCandidate(scene, candidates, {
    family: "geometric-construction",
    validate: (projected) => Boolean(geometricConstructionGeometry(relation, projected))
  })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
