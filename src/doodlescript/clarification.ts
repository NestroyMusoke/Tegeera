export type ClarificationCode =
  | "empty-input"
  | "negated-claim"
  | "conditional-claim"
  | "uncertain-claim"
  | "ambiguous-meaning"
  | "ambiguous-reference"
  | "missing-quantity"
  | "layout-limit"
  | "conflicting-scene"
  | "unsupported-meaning";

export interface ClarificationRequest {
  code: ClarificationCode;
  question: string;
  alternatives: string[];
  evidenceText: string;
}

export class Clarification extends Error {
  constructor(
    message: string,
    readonly code: ClarificationCode = "unsupported-meaning",
    readonly alternatives: string[] = []
  ) {
    super(message);
    this.name = "Clarification";
  }
}
