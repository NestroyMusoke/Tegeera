export type IndependentDifficulty = "E" | "M" | "H";

export interface IndependentTeacherCase {
  id: number;
  subject: string;
  difficulty: IndependentDifficulty;
  statement: string;
  intendedVisual: string;
}

const headingPattern = /^## (.+?) \(10\)$/;
const statementPattern = /^(\d+)\. \*\*\[([EMH])\]\*\* "(.+)"$/;
const visualPattern = /^\s+Intended visual: (.+)$/;

/** Parses evaluation prose without exposing it to any production language registry. */
export function parseIndependentTeacherCorpus(markdown: string): IndependentTeacherCase[] {
  const cases: IndependentTeacherCase[] = [];
  let subject = "";
  let pending: Omit<IndependentTeacherCase, "intendedVisual"> | undefined;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(headingPattern);
    if (heading) { subject = heading[1]; continue; }
    const statement = line.match(statementPattern);
    if (statement) {
      pending = { id: Number(statement[1]), subject, difficulty: statement[2] as IndependentDifficulty, statement: statement[3] };
      continue;
    }
    const visual = line.match(visualPattern);
    if (visual && pending) {
      cases.push({ ...pending, intendedVisual: visual[1] });
      pending = undefined;
    }
  }
  return cases;
}
