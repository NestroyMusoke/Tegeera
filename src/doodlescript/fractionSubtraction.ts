import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

export const FRACTION_SUBTRACTION_VERSION = "1.0.0";

const numbers: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const denominatorWords: Record<string, number> = { half: 2, halves: 2, third: 3, thirds: 3, quarter: 4, quarters: 4, fourth: 4, fourths: 4, fifth: 5, fifths: 5, sixth: 6, sixths: 6, eighth: 8, eighths: 8, tenth: 10, tenths: 10, twelfth: 12, twelfths: 12 };
const singularDenominator: Record<number, string> = { 2: "half", 3: "third", 4: "quarter", 5: "fifth", 6: "sixth", 8: "eighth", 10: "tenth", 12: "twelfth" };
const inputPattern = /^if (?:you|we) (?:have|start with) (.+?) of (?:a|an|the) (.+?) and (?:eat|remove|take away|use) (.+?),? how much is left$/;
const directPattern = /^(?:subtract|take) (.+?) (?:from|away from) (.+?) of (?:a|an|the) (.+)$/;

export interface FractionValue { numerator: number; denominator: number }
export interface FractionSubtractionMatch {
  wholeText: string;
  initial: FractionValue;
  removed: FractionValue;
  remainder: FractionValue;
  initialText: string;
  removedText: string;
  remainderText: string;
}

function parseFraction(text: string, inheritedDenominator?: number): FractionValue | null {
  const normalized = text.trim().toLowerCase().replace(/-/g, " ");
  const numeric = normalized.match(/^(\d{1,2})\s*\/\s*(\d{1,2})$/);
  if (numeric) return { numerator: Number(numeric[1]), denominator: Number(numeric[2]) };
  const words = normalized.match(/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve) (half|halves|thirds?|quarters?|fourths?|fifths?|sixths?|eighths?|tenths?|twelfths?)$/);
  if (words) return { numerator: numbers[words[1]], denominator: denominatorWords[words[2]] };
  const slices = normalized.match(/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve) slices?$/);
  return slices && inheritedDenominator ? { numerator: numbers[slices[1]], denominator: inheritedDenominator } : null;
}

function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }
function labelFraction(value: FractionValue): string {
  const unit = singularDenominator[value.denominator];
  if (!unit) return `${value.numerator}/${value.denominator}`;
  const numerator = Object.entries(numbers).find(([, number]) => number === value.numerator)?.[0] ?? String(value.numerator);
  const denominator = value.numerator === 1 ? unit : unit === "half" ? "halves" : `${unit}s`;
  return `${numerator} ${denominator}`;
}

export function matchFractionSubtraction(text: string): FractionSubtractionMatch | null {
  const contextual = text.match(inputPattern);
  const direct = text.match(directPattern);
  if (!contextual && !direct) return null;
  const initialRaw = contextual?.[1] ?? direct![2];
  const wholeText = (contextual?.[2] ?? direct![3]).trim().replace(/^(?:a|an|the) /, "");
  const removedRaw = contextual?.[3] ?? direct![1];
  const initial = parseFraction(initialRaw);
  const removed = initial ? parseFraction(removedRaw, initial.denominator) : null;
  if (!initial || !removed || !wholeText || initial.denominator < 2 || initial.denominator > 12
    || initial.numerator < 1 || initial.numerator > initial.denominator
    || removed.denominator !== initial.denominator || removed.numerator < 1 || removed.numerator > initial.numerator) return null;
  const remaining = initial.numerator - removed.numerator;
  if (!remaining) return null;
  const divisor = gcd(remaining, initial.denominator);
  const remainder = { numerator: remaining / divisor, denominator: initial.denominator / divisor };
  return {
    wholeText, initial, removed, remainder,
    initialText: labelFraction(initial), removedText: labelFraction(removed), remainderText: labelFraction(remainder)
  };
}

export function isFractionSubtractionRelation(relation: SceneRelation, entities: readonly SceneEntity[]): boolean {
  if (relation.kind === "subtracts" || relation.kind === "resultsIn") return true;
  const source = entities.find(({ id }) => id === relation.sourceIds[0]);
  return relation.kind === "partOf" && source?.visualRole === "fraction-initial";
}

export function fractionSubtractionGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const part = relations.filter(({ kind }) => kind === "partOf").find((relation) => entities.find(({ id }) => id === relation.sourceIds[0])?.visualRole === "fraction-initial");
  const subtract = relations.filter(({ kind }) => kind === "subtracts");
  const result = relations.filter(({ kind }) => kind === "resultsIn");
  if (!part || subtract.length !== 1 || result.length !== 1 || subtract[0].targetIds[0] !== part.sourceIds[0]
    || result[0].sourceIds[0] !== part.sourceIds[0]) return null;
  const whole = entities.find(({ id }) => id === part.targetIds[0]);
  const initial = entities.find(({ id }) => id === part.sourceIds[0]);
  const removed = entities.find(({ id }) => id === subtract[0].sourceIds[0]);
  const remainder = entities.find(({ id }) => id === result[0].targetIds[0]);
  if (!whole || !initial || !removed || !remainder || whole.visualRole !== "fraction-whole"
    || initial.visualRole !== "fraction-initial" || removed.visualRole !== "fraction-removed" || remainder.visualRole !== "fraction-remainder"
    || !initial.fraction || !removed.fraction || !remainder.fraction) return null;
  const rawRemainder = initial.fraction.numerator - removed.fraction.numerator;
  if (initial.fraction.denominator !== removed.fraction.denominator || rawRemainder <= 0
    || remainder.fraction.numerator / remainder.fraction.denominator !== rawRemainder / initial.fraction.denominator
    || !(initial.x + 18 <= removed.x && removed.x + 18 <= remainder.x)) return null;
  return { whole, initial, removed, remainder, denominator: initial.fraction.denominator };
}

export function planFractionSubtraction(scene: SceneState, ids: { wholeId: string; initialId: string; removedId: string; remainderId: string }, movableIds: ReadonlySet<string>) {
  if (new Set(Object.values(ids)).size !== 4) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (Object.values(ids).some((id) => !byId.has(id))) return null;
  const position = (id: string, x: number, y: number) => ({ ...byId.get(id)!, x, y });
  const candidates = [[position(ids.initialId, 18, 45), position(ids.removedId, 46, 45), position(ids.remainderId, 76, 45), position(ids.wholeId, 76, 75)]];
  const relations: SceneRelation[] = [
    { id: "planned-part", kind: "partOf", sourceIds: [ids.initialId], targetIds: [ids.wholeId], predicate: "partOf" },
    { id: "planned-subtract", kind: "subtracts", sourceIds: [ids.removedId], targetIds: [ids.initialId], predicate: "subtracts" },
    { id: "planned-result", kind: "resultsIn", sourceIds: [ids.initialId], targetIds: [ids.remainderId], predicate: "resultsIn" }
  ];
  const selected = selectLayoutCandidate(scene, candidates, { family: "fraction-subtraction", validate: (projected) => Boolean(fractionSubtractionGeometry(relations, projected)) })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
