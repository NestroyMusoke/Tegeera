// Removes only well-defined conversational framing. Meaning-bearing words stay
// intact so the normal parser and validation gates still decide what is safe.
export function normalizeTeacherClause(clause: string): string {
  let text = clause.trim();
  text = text.replace(/^(?:actually|okay|ok|well),?\s+/, "");
  text = text.replace(/^no,?\s+(?=(?:make that|change (?:that|it) to)\b)/, "");
  text = text.replace(/^(?:can|could|would|will) you\s+(?:please\s+)?/, "");
  text = text.replace(/^please\s+/, "");
  text = text.replace(/^i (?:want|would like) (?:you )?to\s+(?:draw|show)\s+(?:me\s+)?/, "");
  text = text.replace(/^let(?:'|’)s\s+(?:draw|show|have)\s+/, "");
  text = text.replace(/^(?:draw|add|show|put)\s+(?:me\s+)?/, "");
  text = text.replace(/^there (?:is|are)\s+/, "");
  text = text.replace(/^we (?:have|can see)\s+/, "");
  text = text.replace(/^make\s+(.+?)\s+(?=(?:move|walk|drive)(?:s|ing)?\s+(?:toward|towards|away from)\b)/, "$1 ");
  text = text.replace(/^(.+?)\s+(?:is|are)\s+(?=(?:approaching|moving|walking|driving)\b)/, "$1 ");
  return text.trim();
}
