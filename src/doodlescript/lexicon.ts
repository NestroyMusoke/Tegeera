import type { EntityKind } from "./schema";
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
  noun: string;
}

export function parseEntityPhrase(phrase: string): ParsedEntityPhrase | null {
  const match = phrase.trim().match(/^(?:(\w+) )?(\w+)$/);
  const concept = match ? conceptForAlias(match[2]) : undefined;
  if (!match || !concept) return null;
  return {
    kind: concept.kind,
    conceptId: concept.id,
    category: concept.category,
    count: match[1] ? parseCountToken(match[1]) : 1,
    countToken: match[1],
    noun: match[2]
  };
}
