import { describe, expect, it } from "vitest";
import { buildArgumentMap, shouldUseArgumentMap, wordingSegments } from "./sourceMap";

export const lawStatement = "Rule of Law refers to when no one in the country is above the law. In Uganda, this is a very different case because of lack of separation of powers in the different arms of the government. None is independent of each other but then this also very different from Montesqueu's ideology. Is there really seperation if the Judiciary is not independent.";

describe("source-preserving argument maps", () => {
  it.each([
    lawStatement,
    "Privacy refers to control over personal information. However, consent is not always freely given. Is consent enough?",
    "An experiment does not prove every explanation. Unlike a guess, a hypothesis can be tested. What evidence would change it?",
    "The shop has no cash reserve. If sales fall, can it pay its workers?",
    "No student should be excluded. However, the entrance has stairs. Is access equal?"
  ])("preserves the entire explanation without inferring facts: %s", text => {
    const map = buildArgumentMap(text);
    expect(shouldUseArgumentMap(text)).toBe(true);
    expect(map.panels.map(panel => panel.text).join("")).toBe(text);
    for (const panel of map.panels) expect(text.slice(panel.start, panel.end)).toBe(panel.text);
    expect(map.links.every(link => link.kind === "reading-order")).toBe(true);
    expect(map.links).toHaveLength(map.panels.length - 1);
  });
  it("recognizes question wording without inventing an answer or changing punctuation", () => {
    const map = buildArgumentMap("No one is exempt. Is the court independent?");
    expect(map.panels[1].roles).toContain("question");
    expect(map.panels[1].text).toBe("Is the court independent?");
    const law = buildArgumentMap(lawStatement);
    expect(law.source).toBe(lawStatement);
    expect(law.panels.at(-1)?.roles).toContain("question");
  });
  it.each(["Draw a car", "Could you not clear everything", "A lion and a car", "What if the second process goes first", "Water enters roots. Sunlight reaches leaves."])("does not reroute an ordinary object request: %s", text => {
    expect(shouldUseArgumentMap(text)).toBe(false);
  });
  it("allows a single abstract statement in explicit mode", () => {
    expect(buildArgumentMap("Justice is not revenge.").panels[0].text).toBe("Justice is not revenge.");
  });
  it("caps panels without truncating source, including quotes, punctuation and whitespace", () => {
    const source = '  "Not true!"\n' + "No claim is proven. ".repeat(12);
    const map = buildArgumentMap(source);
    expect(map.panels.length).toBeLessThanOrEqual(8);
    expect(map.panels.map(panel => panel.text).join("")).toBe(source);
  });
  it("bounds input and never silently shortens it", () => {
    for (const input of ["", "  ", "x".repeat(501)]) expect(() => buildArgumentMap(input)).toThrow();
    expect(buildArgumentMap("x".repeat(500)).source).toHaveLength(500);
  });
  it("preserves negation and HTML-looking text as plain wording", () => {
    const text = "<script>not a fact</script> No claim isn't uncertain.";
    const parts = wordingSegments(text);
    expect(parts.map(part => part.text).join("")).toBe(text);
    expect(parts.filter(part => part.negative).map(part => part.text)).toEqual(["not", "No", "isn't"]);
  });
});
