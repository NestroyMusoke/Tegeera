import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { entityKindSchema, type SceneEntity } from "../doodlescript/schema";
import { characterPoseFor } from "./characterPerformance";
import { EntityGlyph } from "./entityRenderers";

const entity = (kind: SceneEntity["kind"], id = `${kind}-1`): SceneEntity => ({
  id, kind, x: 30, y: 40, scale: 1, direction: "right", highlighted: false
});

describe("entity renderer registry", () => {
  it("renders unknown prototype-like nouns as labels without invalid React children", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const html = renderToStaticMarkup(<EntityGlyph entity={{ ...entity("generic"), label: "constructor" }} />);
      expect(html).toContain('data-glyph-source="sticker"');
      expect(html).not.toContain('data-symbol-id="emoji-preview"');
      expect(html).toContain("constructor");
      expect(error).not.toHaveBeenCalled();
    } finally { error.mockRestore(); }
  });
  it("does not misclassify a declared human using an inherited nature-index key", () => {
    const html = renderToStaticMarkup(<EntityGlyph entity={{ ...entity("person"), label: "constructor" }} />);
    expect(html).toContain("character-rig");
    expect(html).not.toContain('data-symbol-id="emoji-preview"');
  });
  it("tints temporary emoji with independent local filters and preserves their alpha", () => {
    const html = renderToStaticMarkup(<svg>{(["purple", "green"] as const).map((color, index) =>
      <EntityGlyph key={color} entity={{ ...entity("generic", `preview-${index}`), label: "octopus", color }} />)}</svg>);
    const document = new DOMParser().parseFromString(html, "image/svg+xml");
    const filters = [...document.querySelectorAll("filter")];
    expect(filters).toHaveLength(2);
    expect(new Set(filters.map((filter) => filter.id)).size).toBe(2);
    for (const filter of filters) {
      const values = filter.querySelector("feColorMatrix")!.getAttribute("values")!.split(" ").map(Number);
      expect(values).toHaveLength(20);
      expect(values.every(Number.isFinite)).toBe(true);
      expect(values.slice(-5)).toEqual([0, 0, 0, 1, 0]);
      expect(values[4]).toBeGreaterThan(0);
      expect(values[9]).toBeGreaterThan(0);
      expect(values[14]).toBeGreaterThan(0);
      expect(html).toContain(`url(#${filter.id})`);
    }
    expect(html).toContain("temporary emoji preview");
    expect(html).not.toContain("grayscale(1)");
    expect(filters[0].textContent).toBe("");
  });

  it("keeps unspecified emoji monochrome without allocating a colour filter", () => {
    const html = renderToStaticMarkup(<EntityGlyph entity={{ ...entity("generic"), label: "octopus" }} />);
    expect(html).toContain("grayscale(1)");
    expect(html).not.toContain("feColorMatrix");
  });
  it("exposes versioned concept metadata selected from the shared registry", () => {
    const html = renderToStaticMarkup(<EntityGlyph entity={entity("desk")} />);
    expect(html).toContain('data-concept-id="desk"');
    expect(html).toContain('data-concept-category="furniture"');
    expect(html).toContain('data-concept-registry-version="1.0.0"');
    expect(html).toContain('data-renderer="desk"');
  });

  it("has a renderer for every schema entity kind", () => {
    for (const kind of entityKindSchema.options) {
      expect(renderToStaticMarkup(<EntityGlyph entity={entity(kind)} />)).toContain(`data-renderer="${kind}"`);
    }
  });

  it("uses one articulated rig for people, students and teachers", () => {
    for (const kind of ["person", "student", "teacher"] as const) {
      const html = renderToStaticMarkup(<EntityGlyph entity={entity(kind)} />);
      expect(html).toContain("character-rig");
      expect(html.match(/rig-arm/g)).toHaveLength(4);
      expect(html.match(/rig-leg/g)).toHaveLength(4);
      expect(html).toContain("rig-mouth");
    }
  });

  it("never turns an exact CLDR nature subject into a stick person when the model mis-types it", () => {
    const animal = renderToStaticMarkup(<EntityGlyph entity={{ ...entity("person"), label: "bee" }} />);
    expect(animal).toContain('data-symbol-id="emoji-preview"');
    expect(animal).toContain("🐝");
    expect(animal).not.toContain("character-rig");
    const human = renderToStaticMarkup(<EntityGlyph entity={{ ...entity("person"), label: "child" }} />);
    expect(human).toContain("character-rig");
  });

  it("selects deterministic varied poses without random scene drift", () => {
    expect(characterPoseFor(entity("student", "student-1"))).toEqual(characterPoseFor(entity("student", "student-1")));
    expect(characterPoseFor(entity("teacher")).name).toBe("explain");
    expect(characterPoseFor(entity("person"), true).name).toMatch(/^step-/);
  });

  it("marks moving characters for animation while keeping static characters still", () => {
    expect(renderToStaticMarkup(<EntityGlyph entity={entity("person")} moving />)).toContain("motion-walk is-moving");
    expect(renderToStaticMarkup(<EntityGlyph entity={entity("person")} />)).not.toContain("is-moving");
  });

  it("renders known open concepts as deterministic composed symbols", () => {
    const rainfall = renderToStaticMarkup(<EntityGlyph entity={{ ...entity("generic", "rain-1"), label: "heavy rainfall" }} />);
    expect(rainfall).toContain('data-symbol-id="rain"');
    expect(rainfall).toContain('data-symbol-version="1.1.0"');
    expect(rainfall).toContain('data-primitive="cloud"');
    expect(rainfall).toContain('data-primitive="droplet"');
    expect(rainfall).toContain("symbol-cue");
    expect(rainfall).not.toContain("symbol-frame");
    const plant = renderToStaticMarkup(<EntityGlyph entity={{ ...entity("generic", "plant-1"), label: "plant" }} />);
    expect(plant).toContain('data-primitive="plant"');
    expect(plant).toContain("scale(1.05)");
    expect(plant).not.toContain("symbol-frame");
    const sunlight = renderToStaticMarkup(<EntityGlyph entity={{ ...entity("generic", "sun-1"), label: "sunlight" }} />);
    expect(sunlight).toContain('data-primitive="sun"');
    expect(sunlight).toContain('data-primitive="rays"');
    expect(sunlight).not.toContain("symbol-frame");
  });

  it("keeps unsupported concepts as honest neutral stickers", () => {
    const html = renderToStaticMarkup(<EntityGlyph entity={{ ...entity("generic"), label: "constitutional legitimacy" }} />);
    expect(html).toContain('data-symbol-id="honest-sticker"');
    expect(html).toContain('data-glyph-source="sticker"');
    expect(html).toContain('data-symbol-fallback="true"');
    expect(html).toContain('class="unknown-glyph-outline"');
    expect(html).toContain('class="unknown-glyph-mark"');
    expect(html).toContain(">constitutional</text>");
    expect(html).toContain(">legitimacy</text>");
    expect(html).toContain('textLength="80"');
    expect(html).not.toContain("…");
    expect(html).not.toContain('>?</text>');
    expect(html).not.toContain(">C</text>");
  });

  it("shows an immediate exact-name emoji preview for an unseen concrete noun", () => {
    const html = renderToStaticMarkup(<EntityGlyph entity={{ ...entity("generic"), label: "dragon" }} />);
    expect(html).toContain('data-symbol-id="emoji-preview"');
    expect(html).toContain("🐉");
    expect(html).toContain("temporary emoji preview");
    expect(renderToStaticMarkup(<EntityGlyph entity={{ ...entity("generic"), label: "cell" }} />))
      .toContain('data-symbol-id="honest-sticker"');
  });
});
