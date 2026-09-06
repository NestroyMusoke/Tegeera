import type { EntityKind } from "./schema";

export interface ConceptLexeme {
  kind: EntityKind;
  aliases: readonly string[];
}

// Transitional grammar data. Milestone 2 will promote this into the versioned
// concept registry consumed by both planning and rendering.
export const conceptLexemes: readonly ConceptLexeme[] = [
  { kind: "person", aliases: ["person", "people", "persons"] },
  { kind: "student", aliases: ["student", "students", "learner", "learners"] },
  { kind: "teacher", aliases: ["teacher", "teachers", "lecturer", "lecturers"] },
  { kind: "process", aliases: ["process", "processes"] },
  { kind: "cpu", aliases: ["cpu", "processor", "processors"] },
  { kind: "car", aliases: ["car", "cars", "vehicle", "vehicles"] },
  { kind: "book", aliases: ["book", "books"] },
  { kind: "tree", aliases: ["tree", "trees"] },
  { kind: "building", aliases: ["building", "buildings", "school", "schools", "house", "houses"] }
];

export const numberWords = [
  "zero", "one", "two", "three", "four", "five", "six", "seven",
  "eight", "nine", "ten", "eleven", "twelve"
] as const;

export const ordinalWords = [
  "first", "second", "third", "fourth", "fifth", "sixth", "seventh",
  "eighth", "ninth", "tenth"
] as const;

const aliasToKind = new Map(conceptLexemes.flatMap(({ kind, aliases }) => aliases.map((alias) => [alias, kind] as const)));

export function entityKindForAlias(alias: string): EntityKind | undefined {
  return aliasToKind.get(alias);
}

export function parseCountToken(token: string): number {
  if (/^(?:a|an|another)$/.test(token)) return 1;
  if (/^\d+$/.test(token)) return Number(token);
  return numberWords.indexOf(token as typeof numberWords[number]);
}

export interface ParsedEntityPhrase {
  kind: EntityKind;
  count: number;
  countToken?: string;
  noun: string;
}

export function parseEntityPhrase(phrase: string): ParsedEntityPhrase | null {
  const match = phrase.trim().match(/^(?:(\w+) )?(\w+)$/);
  const kind = match ? entityKindForAlias(match[2]) : undefined;
  if (!match || !kind) return null;
  return {
    kind,
    count: match[1] ? parseCountToken(match[1]) : 1,
    countToken: match[1],
    noun: match[2]
  };
}

export const relationLexemes = [
  { predicate: "shares", words: ["sharing", "share", "shares"] },
  { predicate: "owns", words: ["owns", "own", "has", "have"] }
] as const;
