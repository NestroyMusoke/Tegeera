import { entityColorSchema, type EntityColor, type EntityKind } from "./schema";
import { conceptForAlias, type ConceptCategory } from "./conceptRegistry";

export const numberWords = [
  "zero", "one", "two", "three", "four", "five", "six", "seven",
  "eight", "nine", "ten", "eleven", "twelve"
] as const;

export const ordinalWords = [
  "first", "second", "third", "fourth", "fifth", "sixth", "seventh",
  "eighth", "ninth", "tenth"
] as const;

export function entityKindForAlias(alias: string): EntityKind | undefined {
  return conceptForAlias(alias)?.kind;
}

export function parseCountToken(token: string): number {
  if (/^(?:a|an|another)$/.test(token)) return 1;
  if (/^\d+$/.test(token)) return Number(token);
  return numberWords.indexOf(token as typeof numberWords[number]);
}

export interface ParsedEntityPhrase {
  kind: EntityKind;
  conceptId: string;
  category: ConceptCategory;
  count: number;
  countToken?: string;
  color?: EntityColor;
  noun: string;
}

export function parseEntityPhrase(phrase: string): ParsedEntityPhrase | null {
  const tokens = phrase.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;
  let countToken: string | undefined;
  const possibleCount = parseCountToken(tokens[0]);
  if (possibleCount >= 0 || /^(?:a|an|another)$/.test(tokens[0])) countToken = tokens.shift();
  const color = entityColorSchema.safeParse(tokens[0]);
  const parsedColor = color.success ? color.data : undefined;
  if (parsedColor) tokens.shift();
  if (tokens.length !== 1) return null;
  const noun = tokens[0];
  const concept = conceptForAlias(noun);
  if (!concept) return null;
  return {
    kind: concept.kind,
    conceptId: concept.id,
    category: concept.category,
    count: countToken ? parseCountToken(countToken) : 1,
    countToken,
    color: parsedColor,
    noun
  };
}
