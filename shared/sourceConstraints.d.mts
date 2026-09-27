export interface SourceConstraintBlueprint {
  mode?: string;
  objects: Array<{ id: string; label: string }>;
  connections: Array<{ from: string; to: string; kind?: string; via?: string; label?: string }>;
}
export function sourceConstraintIssue(text: string, candidate: SourceConstraintBlueprint): string | null;
