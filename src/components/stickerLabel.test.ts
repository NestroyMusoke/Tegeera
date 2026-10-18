import { describe, expect, it } from "vitest";
import { stickerLabel } from "./stickerLabel";

describe("bounded placeholder labels", () => {
  it.each(["thermostat", "microcontroller", "temperature sensor", "ventilation fan", "portable weather station", "a very unusual classroom instrument"])("preserves readable words in %s", (label) => {
    const result = stickerLabel(label);
    expect(result.lines.join(" ")).toBe(label);
    expect(result.lines.length).toBeLessThanOrEqual(3);
    expect(result.fontSize).toBeGreaterThanOrEqual(11);
  });
  it("normalizes whitespace and handles empty labels", () => {
    expect(stickerLabel(" \t ").lines).toEqual(["object"]);
    expect(stickerLabel(" weather   station ").lines).toEqual(["weather station"]);
  });
  it("bounds very long labels without splitting Unicode surrogate pairs", () => {
    const result = stickerLabel("🧪".repeat(60));
    expect(result.lines).toHaveLength(3);
    expect(result.lines[2].endsWith("…")).toBe(true);
    expect(result.lines.every((line) => Array.from(line).length <= 16)).toBe(true);
    expect(result.lines.join("")).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
  });
});
