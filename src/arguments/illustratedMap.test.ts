import { describe, expect, it } from "vitest";
import { buildArgumentMap } from "./sourceMap";
import { illustratePanel } from "./illustratedMap";

describe("mixed explanation illustrations", () => {
  it.each(["Draw a car.", "Draw three students.", "Draw a book.", "Three students share two books."])("illustrates a supported full statement: %s", text => {
    const map = buildArgumentMap(`${text} Is that fair?`);
    expect(illustratePanel(map.panels[0])?.entities.length).toBeGreaterThan(0);
    expect(illustratePanel(map.panels[1])).toBeUndefined();
    expect(map.panels.map(panel => panel.text).join("")).toBe(map.source);
  });
  it("retains a concrete statement the local interpreter still cannot draw", () => {
    const map = buildArgumentMap("A book is on a table. Is the table stable?");
    expect(illustratePanel(map.panels[0])).toBeUndefined();
    expect(map.panels[0].text.trim()).toBe("A book is on a table.");
  });
  it.each([
    "Do not draw a car.", "If a car moves, is it safe?", "A person might carry a book.",
    "The witness said a car hit a person.", "There is no car.", "Imagine three students.",
    "Fairness refers to equal opportunity.", "Is there a book?"
  ])("does not assert uncertain or abstract wording: %s", text => {
    expect(illustratePanel(buildArgumentMap(text).panels[0])).toBeUndefined();
  });
});
