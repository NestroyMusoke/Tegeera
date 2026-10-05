import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import type { TegeeraGlyph } from "../glyphs/glyph";
import { compileUniversalScene } from "./universalScene";

const dragonGlyph: TegeeraGlyph = {
  schemaVersion: "1.0.0", viewBox: "0 0 100 100",
  parts: [
    { id: "body", d: "M23 57 C26 39 47 34 65 43 C75 48 79 62 69 71 C55 80 31 75 23 57 Z", fill: "#84a98c", stroke: "#2f3e46" },
    { id: "neck-head", d: "M58 49 C63 35 73 28 85 34 C94 39 93 50 84 55 C76 59 69 54 62 59 Z", fill: "#84a98c", stroke: "#2f3e46" },
    { id: "snout", d: "M83 39 L97 44 L84 51 Z", fill: "#84a98c", stroke: "#2f3e46" },
    { id: "wing", d: "M48 43 Q42 14 23 18 L35 37 Q23 28 17 39 Q32 43 48 57 Z", fill: "#e9c46a", stroke: "#2f3e46" },
    { id: "tail", d: "M26 54 C15 51 13 39 5 36 Q13 59 29 66", fill: "none", stroke: "#2f3e46" },
    { id: "horn", d: "M72 33 L76 23 L80 35 Z", fill: "#f4a261", stroke: "#2f3e46" },
    { id: "leg-front", d: "M61 70 Q64 82 73 87", fill: "none", stroke: "#2f3e46" },
    { id: "leg-back", d: "M39 72 Q37 84 30 89", fill: "none", stroke: "#2f3e46" },
    { id: "eye", d: "M82 39 C85 39 86 42 84 44 C81 45 79 43 80 40 C80 39 81 39 82 39 Z", fill: "#2f3e46", stroke: "#2f3e46" }
  ],
  anchors: { top: [48, 18], ground: [52, 89], front: [97, 44] }
};

const villageGlyph: TegeeraGlyph = {
  schemaVersion: "1.0.0", viewBox: "0 0 100 100",
  parts: [
    { id: "ground", d: "M5 88 Q49 84 95 88", fill: "none", stroke: "#52796f" },
    { id: "center-house", d: "M35 43 L66 43 L66 86 L35 86 Z", fill: "#cad2c5", stroke: "#2f3e46" },
    { id: "center-roof", d: "M29 45 L50 25 L72 45 Z", fill: "#f4a261", stroke: "#2f3e46" },
    { id: "door", d: "M47 65 L57 65 L57 86 L47 86 Z", fill: "#52796f", stroke: "#2f3e46" },
    { id: "left-house", d: "M8 58 L34 58 L34 86 L8 86 Z", fill: "#e9c46a", stroke: "#2f3e46" },
    { id: "left-roof", d: "M5 60 L21 45 L38 60 Z", fill: "#84a98c", stroke: "#2f3e46" },
    { id: "right-house", d: "M67 62 L92 62 L92 86 L67 86 Z", fill: "#cad2c5", stroke: "#2f3e46" },
    { id: "right-roof", d: "M63 64 L79 49 L96 64 Z", fill: "#e9c46a", stroke: "#2f3e46" }
  ],
  anchors: { top: [50, 25], ground: [50, 88], front: [92, 72] }
};

const cloudGlyph: TegeeraGlyph = {
  schemaVersion: "1.0.0", viewBox: "0 0 100 100",
  parts: [{ id: "cloud", d: "M16 67 C7 53 18 39 32 42 C36 24 62 20 70 40 C88 37 96 55 85 68 C67 77 34 77 16 67 Z", fill: "#cad2c5", stroke: "#2f3e46" }],
  anchors: { top: [52, 23], ground: [52, 74], front: [89, 55] }
};

const blueprint = {
  blueprintVersion: "1.0", mode: "replace", confidence: 0.91,
  objects: [
    { id: "flying-dragon", label: "flying dragon", kind: "generic", color: "green", x: 18, y: 42, glyph: dragonGlyph },
    { id: "tiny-village", label: "tiny village", kind: "generic", x: 82, y: 60, glyph: villageGlyph }
  ],
  connections: [{ from: "flying-dragon", to: "tiny-village", label: "flies over" }]
};

describe("universal visual scene compiler", () => {
  it("corrects contradictory upward-motion coordinates and keeps a directed arrow", () => {
    const plan = { blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
      objects: [
        { id: "cup", label: "cup", kind: "generic", x: 40, y: 25 },
        { id: "steam", label: "steam", kind: "generic", x: 40, y: 72 }
      ], connections: [{ from: "steam", to: "cup", label: "rises from" }] };
    const script = compileUniversalScene(plan, initialScene, "Steam rises from a cup.");
    const scene = applyDoodleScript(initialScene, script);
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    expect(scene.entities.find((item) => item.id === "steam")!.y)
      .toBeLessThan(scene.entities.find((item) => item.id === "cup")!.y);
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html).toContain('aria-label="steam rises from cup"');
    expect(html).toContain('class="universal-relation-flow"');
  });

  it("honours explicit spatial relations even when model coordinates say the opposite", () => {
    const plan = { blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
      objects: [
        { id: "s1", label: "snail", kind: "generic", x: 30, y: 50 },
        { id: "st1", label: "stone", kind: "generic", x: 50, y: 50 },
        { id: "m1", label: "mushroom", kind: "generic", x: 50, y: 80 }
      ], connections: [
        { from: "s1", to: "st1", label: "crosses" },
        { from: "st1", to: "m1", label: "beneath" }
      ] };
    const script = compileUniversalScene(plan, initialScene, "A snail crosses a wet stone beneath a mushroom.");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const entities = applyDoodleScript(initialScene, script).entities;
    expect(entities.find((entity) => entity.label === "stone")!.y)
      .toBeGreaterThan(entities.find((entity) => entity.label === "mushroom")!.y);
    const html = renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(initialScene, script)} />);
    expect(html).toContain('class="universal-relation-spatial"');
    expect(html).toContain('aria-label="stone beneath mushroom"');
  });

  it("searches another safe slot arrangement when a dense five-role route blocks captions", () => {
    const labels = ["stream", "arch", "mound", "pool", "hut"];
    const plan = { blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
      objects: labels.map((label, index) => ({ id: `n${index}`, label, kind: "generic",
        x: [20, 20, 60, 80, 100][index], y: [40, 80, 40, 20, 20][index] })),
      connections: [
        { from: "n0", to: "n1", label: "passes beneath" },
        { from: "n0", to: "n2", label: "turns around" },
        { from: "n0", to: "n3", label: "empties into" },
        { from: "n3", to: "n4", label: "beside" }
      ] };
    const script = compileUniversalScene(plan, initialScene,
      "A stream passes beneath an arch, turns around a mound, then empties into a pool beside a hut.");
    const scene = applyDoodleScript(initialScene, script);
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    expect(scene.entities.find(({ label }) => label === "stream")!.y)
      .toBeGreaterThan(scene.entities.find(({ label }) => label === "arch")!.y);
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html.match(/data-visual-cue="semantic-connection"/g)).toHaveLength(4);
    expect(html).toContain('aria-label="pool beside hut"');
    expect(html).toContain('class="universal-relation-spatial"');
  });

  it("keeps a moving payload and named passage in a six-role containment explanation", () => {
    const labels = ["teacher", "sack", "flour", "sieve", "bowl", "gauge"];
    const plan = { blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: labels.map((label, index) => ({ id: `n${index}`, label, kind: "generic",
        x: [10, 25, 40, 55, 70, 85][index], y: 50 })),
      connections: [
        { from: "n1", to: "n2", label: "contains", kind: "contains" },
        { from: "n0", to: "n2", label: "pours" },
        { from: "n2", to: "n3", label: "through" },
        { from: "n3", to: "n4", label: "into" },
        { from: "n5", to: "n4", label: "measures" }
      ] };
    const text = "A teacher pours flour from a sack through a sieve into a bowl while a gauge measures the bowl.";
    const script = compileUniversalScene(plan, initialScene, text);
    const scene = applyDoodleScript(initialScene, script);
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    expect(scene.relations?.some(({ sourceIds, targetIds }) => sourceIds[0] === "n1" && targetIds[0] === "n3")).toBe(true);
    expect(scene.relations?.some(({ sourceIds, targetIds }) => sourceIds[0] === "n2" && targetIds[0] === "n3")).toBe(true);
  });

  it("does not silently draw mutually contradictory directional relationships", () => {
    const plan = { blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "a", label: "object A", kind: "generic", x: 20, y: 50 },
        { id: "b", label: "object B", kind: "generic", x: 80, y: 50 }
      ], connections: [
        { from: "a", to: "b", label: "above" },
        { from: "a", to: "b", label: "below" }
      ] };
    expect(() => compileUniversalScene(plan, initialScene, "Object A is above and below object B"))
      .toThrow(/spatial relationships cannot fit/);
  });
  it("rejects a plan whose directed arrows necessarily cross instead of claiming a complete diagram", () => {
    const plan = { blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "northwest", label: "northwest", kind: "generic", x: 20, y: 18 },
        { id: "northeast", label: "northeast", kind: "generic", x: 80, y: 18 },
        { id: "southwest", label: "southwest", kind: "generic", x: 20, y: 75 },
        { id: "southeast", label: "southeast", kind: "generic", x: 80, y: 75 }
      ], connections: [
        { from: "northwest", to: "southeast", label: "points to" },
        { from: "northeast", to: "southwest", label: "points to" }
      ] };
    expect(() => compileUniversalScene(plan, initialScene, "Connect the opposite corners"))
      .toThrow(/cannot be placed clearly/);
  });

  it("completes an explicit passage locally but rejects a missing force topology", () => {
    const bypassed = {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: ["machine", "fuel", "inlet"].map((id, index) => ({ id, label: id, kind: "generic", x: 20 + index * 30, y: 50 })),
      connections: [
        { from: "fuel", to: "machine", label: "flows into", kind: "flowsInto" },
        { from: "inlet", to: "machine", label: "part of", kind: "partOf" }
      ]
    };
    const completed = compileUniversalScene(bypassed, initialScene, "Fuel enters a machine through its inlet");
    expect(validateDoodleScript(completed, initialScene).ok).toBe(true);
    expect(completed.commands.some((command) => command.action === "relate"
      && command.relation.sourceIds[0] === "fuel" && command.relation.targetIds[0] === "inlet")).toBe(true);
    const force = {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: ["sled", "snow", "pull", "drag"].map((id, index) => ({ id, label: id, kind: "generic", x: 10 + index * 20, y: 50 })),
      connections: [{ from: "pull", to: "sled", label: "pulls" }, { from: "drag", to: "sled", label: "slows" }]
    };
    expect(() => compileUniversalScene(force, initialScene, "Pull a sled over snow; drag opposes the motion"))
      .toThrow(/appliedTo\/opposes\/contacts/);
  });
  it("keeps an unseen origin-passage-recipient graph while rejecting a reversed origin claim", () => {
    const text = "Juice flows from a tank into a cup through a pipe";
    const plan = { blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: ["juice", "tank", "cup", "pipe"].map((id, index) => ({
        id, label: id, kind: "generic", x: 15 + index * 20, y: 50
      })), connections: [] };
    const completed = compileUniversalScene(plan, initialScene, text);
    expect(validateDoodleScript(completed, initialScene).ok).toBe(true);
    expect(completed.commands.filter((command) => command.action === "relate")).toHaveLength(3);
    expect(() => compileUniversalScene({ ...plan, connections: [
      { from: "tank", to: "juice", label: "originates from" }
    ] }, initialScene, text)).toThrow(/reversing the stated source/);
  });
  it("does not turn a bare from edge into a false process arrow in a complete passage graph", () => {
    const text = "Ink flows from a bottle into a cup through a nozzle";
    const plan = { blueprintVersion: "1.0", mode: "replace", confidence: 0.91,
      objects: ["bottle", "ink", "nozzle", "cup"].map((id, index) => ({
        id, label: id, kind: "generic", x: 15 + index * 22, y: 50
      })), connections: [
        { from: "bottle", to: "ink", label: "from" },
        { from: "ink", to: "nozzle", label: "through" },
        { from: "nozzle", to: "cup", label: "into" },
        { from: "bottle", to: "nozzle", label: "leads through" }
      ] };
    const script = compileUniversalScene(plan, initialScene, text);
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const relations = applyDoodleScript(initialScene, script).relations ?? [];
    expect(relations.some((relation) => relation.predicate === "from")).toBe(false);
    expect(relations).toHaveLength(3);
    expect(relations.some((relation) => relation.sourceIds[0] === "bottle"
      && relation.targetIds[0] === "nozzle")).toBe(true);
  });
  it("rejects a confident passage plan that silently drops the named moving subject", () => {
    const plan = { blueprintVersion: "1.0", mode: "replace", confidence: 0.91,
      objects: ["bottle", "nozzle", "cup"].map((id, index) => ({
        id, label: id, kind: "generic", x: 20 + index * 30, y: 50
      })), connections: [
        { from: "bottle", to: "nozzle", label: "leads through" },
        { from: "nozzle", to: "cup", label: "enters" }
      ] };
    expect(() => compileUniversalScene(plan, initialScene,
      "Ink flows from a bottle into a cup through a nozzle"))
      .toThrow(/ink as the moving subject.*missing/);
  });
  it("preserves an ordinary verb when the model attaches an incompatible optional link type", () => {
    const script = compileUniversalScene({
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "a", label: "rotor", kind: "generic", x: 20, y: 50 },
        { id: "b", label: "blade", kind: "generic", x: 80, y: 50 }
      ], connections: [{ from: "a", to: "b", label: "spins", kind: "flowsInto" }]
    }, initialScene, "A rotor spins a blade");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    expect(applyDoodleScript(initialScene, script).relations?.[0]).toMatchObject({
      kind: "relatesTo", predicate: "spins"
    });
  });
  it("does not draw a labelled holder under a different named subject", () => {
    const incorrect = {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "vessel", label: "vessel", kind: "generic", x: 48, y: 32 },
        { id: "sample", label: "sample", kind: "generic", x: 48, y: 62 }
      ],
      connections: [{ from: "vessel", to: "sample", label: "contains", kind: "contains" }]
    };
    expect(() => compileUniversalScene(incorrect, initialScene,
      "A specimen jar is a labelled vessel that holds a sample"))
      .toThrow(/specimen jar as the labelled holder.*missing/);
  });
  it("rejects copied schema placeholders that the teacher did not say", () => {
    const copied = {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "source", label: "source", kind: "generic", x: 20, y: 50 },
        { id: "destination", label: "destination", kind: "generic", x: 80, y: 50 }
      ],
      connections: [{ from: "source", to: "destination", label: "flows into", kind: "flowsInto" }]
    };
    expect(() => compileUniversalScene(copied, initialScene, "A robot carries a box across a bridge"))
      .toThrow(/schema placeholders/);
  });
  it("keeps an ordinary carry action without requiring a closed circulation loop", () => {
    const ordinary = {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: ["porter", "parcel", "market"].map((label, index) => ({
        id: `n${index}`, label, kind: "generic", x: 15 + index * 35, y: 50
      })),
      connections: [{ from: "n0", to: "n1", label: "carries parcel", kind: "carries" },
        { from: "n0", to: "n2", label: "travels to" }]
    };
    const script = compileUniversalScene(ordinary, initialScene, "A porter carries a parcel to a market");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    expect(script.commands.some((command) => command.action === "relate"
      && command.relation.kind === "relatesTo" && command.relation.predicate === "carries parcel")).toBe(true);
  });
  it("refuses to turn a negated teacher claim into an affirmative scene", () => {
    for (const text of ["A dragon does not fly over a village", "A dragon never flies over a village", "A dragon can't fly over a village"]) {
      expect(() => compileUniversalScene(blueprint, initialScene, text)).toThrow(/negated claim/);
    }
    expect(() => compileUniversalScene(blueprint, initialScene, "A dragon flies over a village")).not.toThrow();
  });

  it("requires explicit colours to survive the model plan and catches swapped assignments", () => {
    const book = { blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [{ id: "book", label: "book", kind: "book", x: 50, y: 50 }], connections: [] };
    expect(() => compileUniversalScene(book, initialScene, "A yellow book")).toThrow(/omitted the stated yellow colour/);
    expect(() => compileUniversalScene({ ...book, objects: [{ ...book.objects[0], color: "blue" }] }, initialScene, "A yellow book"))
      .toThrow(/omitted the stated yellow colour/);
    expect(() => compileUniversalScene({ ...book, objects: [{ ...book.objects[0], color: "yellow" }] }, initialScene, "A yellow book"))
      .not.toThrow();

    const swapped = { ...book, objects: [
      { id: "ball", label: "ball", kind: "generic", x: 20, y: 50, color: "blue" },
      { id: "box", label: "box", kind: "generic", x: 80, y: 50, color: "red" }
    ] };
    expect(() => compileUniversalScene(swapped, initialScene, "A red ball and a blue box"))
      .toThrow(/wrong colour/);
  });

  it("requires a bounded blueprint instead of accepting direct model-supplied scene commands", () => {
    const script = compileUniversalScene(blueprint, initialScene, "A dragon flies over a village");
    expect(() => compileUniversalScene(script, initialScene, "A dragon flies over a village"))
      .toThrow(/incomplete visual blueprint/);
  });

  it("routes composable typed relations into the real part-whole visual grammar", () => {
    const candidate = {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.91,
      objects: [
        { id: "plant", label: "plant", kind: "generic", x: 78, y: 48 },
        { id: "roots", label: "roots", kind: "generic", x: 45, y: 72 },
        { id: "leaves", label: "leaves", kind: "generic", x: 45, y: 26 },
        { id: "water", label: "water", kind: "generic", x: 15, y: 72 },
        { id: "sunlight", label: "sunlight", kind: "generic", x: 15, y: 26 }
      ],
      connections: [
        { from: "roots", to: "plant", label: "part of", kind: "partOf" },
        { from: "leaves", to: "plant", label: "part of", kind: "partOf" },
        { from: "water", to: "roots", label: "flows into", kind: "flowsInto" },
        { from: "sunlight", to: "leaves", label: "illuminates", kind: "illuminates" }
      ]
    };
    const script = compileUniversalScene(candidate, initialScene, "A plant takes in water through its roots and sunlight through its leaves.");
    expect(script.commands.filter((command) => command.action === "create").every((command) =>
      command.action === "create" && command.entity.scale === 1)).toBe(true);
    expect(script.commands.filter((command) => command.action === "relate").map((command) =>
      command.action === "relate" ? command.relation.kind : null)).toEqual(["partOf", "partOf", "flowsInto", "illuminates"]);
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const staged = applyDoodleScript(initialScene, script);
    const at = (label: string) => staged.entities.find((entity) => entity.label === label)!;
    expect(at("water").x).toBeLessThan(at("roots").x);
    expect(at("roots").x).toBeLessThan(at("plant").x);
    expect(at("sunlight").x).toBeLessThan(at("leaves").x);
    expect(at("leaves").x).toBeLessThan(at("plant").x);
    const html = renderToStaticMarkup(<DoodleCanvas scene={staged} />);
    for (const cue of ["visible-roots", "soil-boundary", "water-entry-arrow", "sun-symbol", "leaf-targeted-ray", "attached-part"]) {
      expect(html).toContain(cue);
    }
    expect(html).toContain('data-relation-layout="part-whole-flow"');

    const other = compileUniversalScene({
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "wheel", label: "wheel", kind: "generic", x: 20, y: 45 },
        { id: "vehicle", label: "vehicle", kind: "generic", x: 80, y: 45 }
      ],
      connections: [{ from: "wheel", to: "vehicle", label: "part of", kind: "partOf" }]
    }, initialScene, "A wheel is part of a vehicle");
    expect(validateDoodleScript(other, initialScene).ok).toBe(true);
    const genericHtml = renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(initialScene, other)} />);
    expect(genericHtml).toContain('data-relation-layout="part-whole-flow"');
    expect(genericHtml).not.toContain('data-composition="attached-part"');
  });

  it("stages the same complete topology for unfamiliar input, part, and whole nouns", () => {
    const plan = {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.88,
      objects: [
        { id: "unit", label: "machine", kind: "generic", x: 50, y: 50 },
        { id: "port-a", label: "inlet", kind: "generic", x: 20, y: 30 },
        { id: "port-b", label: "vent", kind: "generic", x: 80, y: 70 },
        { id: "feed-a", label: "fuel", kind: "generic", x: 80, y: 30 },
        { id: "feed-b", label: "air", kind: "generic", x: 20, y: 70 }
      ],
      connections: [
        { from: "port-a", to: "unit", label: "part of", kind: "partOf" },
        { from: "port-b", to: "unit", label: "part of", kind: "partOf" },
        { from: "feed-a", to: "port-a", label: "flows into", kind: "flowsInto" },
        { from: "feed-b", to: "port-b", label: "flows into", kind: "flowsInto" }
      ]
    };
    const script = compileUniversalScene(plan, initialScene, "A machine takes in fuel through its inlet and air through its vent");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const byLabel = new Map(applyDoodleScript(initialScene, script).entities.map((entity) => [entity.label, entity]));
    expect(byLabel.get("fuel")!.x).toBeLessThan(byLabel.get("inlet")!.x);
    expect(byLabel.get("air")!.x).toBeLessThan(byLabel.get("vent")!.x);
    expect(byLabel.get("inlet")!.x).toBeLessThan(byLabel.get("machine")!.x);
    expect(byLabel.get("vent")!.x).toBeLessThan(byLabel.get("machine")!.x);
  });

  it("never paints an unsupported typed meaning over the model's ordinary verb", () => {
    const ordinary = compileUniversalScene({ ...blueprint,
      connections: [{ from: "flying-dragon", to: "tiny-village", label: "eats", kind: "partOf" }]
    }, initialScene, "A dragon eats a village");
    expect(applyDoodleScript(initialScene, ordinary).relations?.[0]).toMatchObject({
      kind: "relatesTo", predicate: "eats"
    });
    expect(() => compileUniversalScene({ ...blueprint,
      connections: [{ from: "flying-dragon", to: "tiny-village", label: "flies over", kind: "unsupported" }]
    }, initialScene, "A dragon flies over a village")).toThrow(/incomplete visual blueprint/);
  });

  it("renders causal and temporal links as event flow, while rejecting a cycle", () => {
    const events = {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "spark", label: "spark", kind: "generic", x: 15, y: 35 },
        { id: "fire", label: "fire", kind: "generic", x: 50, y: 35 },
        { id: "smoke", label: "smoke", kind: "generic", x: 85, y: 35 }
      ],
      connections: [
        { from: "spark", to: "fire", label: "causes", kind: "causes" },
        { from: "fire", to: "smoke", label: "before", kind: "before" }
      ]
    };
    const script = compileUniversalScene(events, initialScene, "A spark causes fire before smoke appears");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const html = renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(initialScene, script)} />);
    expect(html.match(/data-relation-layout="event-graph"/g)).toHaveLength(2);
    expect(html).toContain("event-causes");
    const cycle = compileUniversalScene({ ...events, connections: [...events.connections,
      { from: "smoke", to: "spark", label: "causes", kind: "causes" }]
    }, initialScene, "A cycle");
    expect(validateDoodleScript(cycle, initialScene).ok).toBe(false);
  });

  it("compiles unfamiliar subjects from validated coherent glyphs into DoodleScript", () => {
    const script = compileUniversalScene(blueprint, initialScene, "A dragon flies over a tiny village");
    expect(script.schemaVersion).toBe("2.27.0");
    expect(script.commands.filter(({ action }) => action === "create")).toHaveLength(2);
    expect(validateDoodleScript(script, initialScene)).toMatchObject({ ok: true });
    expect(validateDoodleScript({ ...script, schemaVersion: "2.26.0" }, initialScene)).toMatchObject({ ok: false });

    const scene = applyDoodleScript(initialScene, script);
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    const root = document.createElement("div");
    root.innerHTML = html;
    expect(root.querySelectorAll(".doodle-canvas .validated-glyph")).toHaveLength(2);
    expect(html).toContain("data-glyph-parts=\"9\"");
    expect(html).toContain("data-glyph-source=\"generated\"");
    expect(html).toContain("data-visual-cue=\"semantic-connection\"");
    expect(html).toContain("flies over");
  });

  it("can extend a compiled scene without clearing established identities", () => {
    const first = compileUniversalScene(blueprint, initialScene, "A dragon flies over a tiny village");
    const scene = applyDoodleScript(initialScene, first);
    const extension = compileUniversalScene({
      blueprintVersion: "1.0", mode: "extend", confidence: 0.9,
      objects: [{ id: "storm-cloud", label: "storm cloud", kind: "generic", x: 50, y: 10, glyph: cloudGlyph }],
      connections: [{ from: "storm-cloud", to: "flying-dragon", label: "above" }]
    }, scene, "Add a storm cloud above the dragon");
    expect(extension.commands.some(({ action }) => action === "clear")).toBe(false);
    expect(validateDoodleScript(extension, scene)).toMatchObject({ ok: true });
    expect(applyDoodleScript(scene, extension).entities).toHaveLength(3);
    const extended = applyDoodleScript(scene, extension).entities;
    expect(extended.find((entity) => entity.id === "storm-cloud")!.y)
      .toBeLessThan(extended.find((entity) => entity.id === "flying-dragon")!.y);
  });

  it("rejects unsafe vector instructions before they reach SVG", () => {
    expect(() => compileUniversalScene({
      ...blueprint,
      objects: [{ ...blueprint.objects[0], glyph: { ...dragonGlyph, parts: [
        { id: "unsafe", d: "M10 10 L190 90 Z", fill: "#84a98c", stroke: "#2f3e46" }
      ] } }]
    }, initialScene, "unsafe")).toThrow();
  });

  it("reuses a validated cached glyph over a new model glyph and accepts omitted glyphs", () => {
    const cached = new Map([["flying dragon", dragonGlyph]]);
    const replaced = compileUniversalScene({
      ...blueprint,
      objects: [{ ...blueprint.objects[0], glyph: cloudGlyph }], connections: []
    }, initialScene, "A flying dragon", { cache: cached });
    const create = replaced.commands.find((command) => command.action === "create");
    expect(create?.action).toBe("create");
    if (create?.action !== "create") return;
    expect(create.entity.glyph).toEqual(dragonGlyph);
    expect(create.entity.glyphSource).toBe("cache");

    const omitted = compileUniversalScene({
      ...blueprint,
      objects: [{ id: "flying-dragon", label: "flying dragon", kind: "generic", x: 50, y: 50 }], connections: []
    }, initialScene, "A flying dragon", { cache: cached });
    expect(validateDoodleScript(omitted, initialScene).ok).toBe(true);
    const placeholderScript = compileUniversalScene({
      ...blueprint,
      objects: [{ id: "unseen", label: "unseen thing", kind: "generic", x: 50, y: 50 }], connections: []
    }, initialScene, "unseen thing", { cache: cached });
    expect(validateDoodleScript(placeholderScript, initialScene).ok).toBe(true);
    expect(renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(initialScene, placeholderScript)} />))
      .toContain('data-glyph-source="sticker"');
  });

  it("preserves a relation when the model refers to unique visible labels instead of IDs", () => {
    const script = compileUniversalScene({
      ...blueprint,
      connections: [{ from: "flying dragon", to: "tiny village", label: "flies over" }]
    }, initialScene, "A dragon flies over a tiny village");
    expect(script.commands.filter(({ action }) => action === "relate")).toHaveLength(1);
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, script);
    expect(scene.relations?.[0]).toMatchObject({ sourceIds: ["flying-dragon"], targetIds: ["tiny-village"] });
  });

  it("never accepts a partially connected or ambiguous visual plan", () => {
    const missing = { ...blueprint, connections: [{ from: "flying-dragon", to: "missing-object", label: "flies over" }] };
    expect(() => compileUniversalScene(missing, initialScene, "A dragon flies over a tiny village"))
      .toThrow(/missing or ambiguous/);
    expect(() => compileUniversalScene({ ...blueprint, connections: [
      { from: "flying-dragon", to: "tiny-village", label: "flies over" },
      { from: "flying-dragon", to: "unknown", label: "guards" }
    ] }, initialScene, "Two relationships"))
      .toThrow(/missing or ambiguous/);
    expect(() => compileUniversalScene({ ...blueprint, connections: [
      { from: "flying-dragon", to: "flying-dragon", label: "flies over" }
    ] }, initialScene, "Self relationship"))
      .toThrow(/missing or ambiguous/);
    expect(() => compileUniversalScene({ ...blueprint, objects: [
      { id: "first", label: "same label", kind: "generic", x: 20, y: 40 },
      { id: "second", label: "same label", kind: "generic", x: 80, y: 40 }
    ], connections: [{ from: "same label", to: "first", label: "follows" }] }, initialScene, "Ambiguous labels"))
      .toThrow(/missing or ambiguous/);
    expect(() => compileUniversalScene({ ...blueprint, objects: [
      blueprint.objects[0], { ...blueprint.objects[1], id: blueprint.objects[0].id }
    ] }, initialScene, "Duplicate IDs"))
      .toThrow(/object ID more than once/);
  });

  it("connects an extension to an established object without losing its identity", () => {
    const first = compileUniversalScene(blueprint, initialScene, "A dragon flies over a tiny village");
    const scene = applyDoodleScript(initialScene, first);
    const extension = compileUniversalScene({
      blueprintVersion: "1.0", mode: "extend", confidence: 0.9,
      objects: [{ id: "storm-cloud", label: "storm cloud", kind: "generic", x: 50, y: 10 }],
      connections: [{ from: "storm cloud", to: "flying dragon", label: "above" }]
    }, scene, "Add a storm cloud above the dragon");
    expect(validateDoodleScript(extension, scene).ok).toBe(true);
    expect(extension.commands.find((command) => command.action === "relate"))
      .toMatchObject({ relation: { sourceIds: ["storm-cloud"], targetIds: ["flying-dragon"] } });
    expect(() => compileUniversalScene({
      blueprintVersion: "1.0", mode: "extend", confidence: 0.9,
      objects: [{ id: "flying-dragon", label: "another dragon", kind: "generic", x: 50, y: 10 }],
      connections: []
    }, scene, "Add another dragon"))
      .toThrow(/object ID more than once/);
  });

  it("keeps model-supplied left/right and above/below order when assigning safe slots", () => {
    const horizontal = compileUniversalScene({
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "right", label: "orb", kind: "generic", x: 25, y: 30 },
        { id: "left", label: "star", kind: "generic", x: 15, y: 30 }
      ], connections: [{ from: "left", to: "right", label: "left of" }]
    }, initialScene, "A star is left of an orb");
    const horizontalScene = applyDoodleScript(initialScene, horizontal);
    expect(horizontalScene.entities.find(({ id }) => id === "left")!.x)
      .toBeLessThan(horizontalScene.entities.find(({ id }) => id === "right")!.x);
    expect(validateDoodleScript(horizontal, initialScene).ok).toBe(true);

    const vertical = compileUniversalScene({
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "lower", label: "orb", kind: "generic", x: 50, y: 46 },
        { id: "upper", label: "star", kind: "generic", x: 50, y: 38 }
      ], connections: [{ from: "upper", to: "lower", label: "above" }]
    }, initialScene, "A star is above an orb");
    const verticalScene = applyDoodleScript(initialScene, vertical);
    expect(verticalScene.entities.find(({ id }) => id === "upper")!.y)
      .toBeLessThan(verticalScene.entities.find(({ id }) => id === "lower")!.y);
    expect(validateDoodleScript(vertical, initialScene).ok).toBe(true);
  });

  it("renders a three-level source, material, destination without flattening or a U-turn", () => {
    const plan = { blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
      objects: [
        { id: "lower", label: "vessel", kind: "generic", x: 30, y: 70 },
        { id: "middle", label: "vapor", kind: "generic", x: 30, y: 40 },
        { id: "upper", label: "cover", kind: "generic", x: 30, y: 10 }
      ], connections: [
        { from: "lower", to: "middle", label: "releases" },
        { from: "middle", to: "upper", label: "collects on" }
      ] };
    const script = compileUniversalScene(plan, initialScene,
      "Vapor rises from a vessel and collects on a cover.");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, script);
    const byId = new Map(scene.entities.map((entity) => [entity.id, entity]));
    expect(byId.get("upper")!.y).toBeLessThan(byId.get("middle")!.y);
    expect(byId.get("middle")!.y).toBeLessThan(byId.get("lower")!.y);
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html).toContain("collects on");
    expect(html).toContain("releases");
  });

  it("fits a four-role vertical attachment graph without discarding its stated height order", () => {
    const plan = { blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
      objects: [
        { id: "floating", label: "balloon", kind: "generic", x: 50, y: 30 },
        { id: "landmark", label: "tower", kind: "building", x: 50, y: 50 },
        { id: "part", label: "tether", kind: "generic", x: 50, y: 40 },
        { id: "holder", label: "operator", kind: "person", x: 30, y: 50 }
      ], connections: [
        { from: "part", to: "floating", label: "part of", kind: "partOf" },
        { from: "part", to: "holder", label: "attachedTo" },
        { from: "floating", to: "landmark", label: "floatsAbove" }
      ] };
    const script = compileUniversalScene(plan, initialScene,
      "A balloon floats above a tower while its tether stays attached to an operator.");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, script);
    const byId = new Map(scene.entities.map((entity) => [entity.id, entity]));
    expect(byId.get("floating")!.y).toBeLessThan(byId.get("landmark")!.y);
    expect(byId.get("floating")!.y).toBeLessThan(byId.get("part")!.y);
  });

  it("assigns a full eight-object blueprint deterministically", () => {
    const full = {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: Array.from({ length: 8 }, (_, index) => ({
        id: `node-${index + 1}`, label: `node ${index + 1}`, kind: "generic",
        x: 14 + (index % 4) * 24, y: index < 4 ? 30 : 68
      })), connections: []
    };
    const first = compileUniversalScene(full, initialScene, "Eight nodes");
    const second = compileUniversalScene(full, initialScene, "Eight nodes");
    expect(first).toEqual(second);
    expect(validateDoodleScript(first, initialScene).ok).toBe(true);
  });

  it("compiles a complete transport topology into a closed diagram for unrelated nouns", () => {
    const plan = {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "pump", label: "pump", kind: "generic", x: 20, y: 50 },
        { id: "filter", label: "filter", kind: "generic", x: 80, y: 50 },
        { id: "water", label: "water", kind: "generic", x: 50, y: 30 },
        { id: "minerals", label: "minerals", kind: "generic", x: 50, y: 70 }
      ],
      connections: [
        { from: "pump", to: "filter", via: "water", label: "pumps to", kind: "pumpsTo" },
        { from: "filter", to: "pump", via: "water", label: "returns to", kind: "returnsTo" },
        { from: "water", to: "minerals", label: "carries", kind: "carries" }
      ]
    };
    const script = compileUniversalScene(plan, initialScene, "A pump circulates water through a filter and back with minerals");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const html = renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(initialScene, script)} />);
    expect(html).toContain('data-relation-layout="circulation-loop"');
    expect(html).toContain('data-visual-cue="oxygenated-return-arrow closed-circulation-loop"');
    expect(html).not.toContain('data-symbol-id="honest-sticker"');
    expect(() => compileUniversalScene({ ...plan, connections: plan.connections.slice(0, 2) }, initialScene,
      "A pump circulates water through a filter and back with minerals")).toThrow(/complete three-link topology/);
  });

  it("compiles an opposing-force topology into physical arrows and rejects reversed roles", () => {
    const plan = {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "sled", label: "sled", kind: "generic", x: 50, y: 40 },
        { id: "snow", label: "packed snow", kind: "generic", x: 50, y: 70 },
        { id: "pull", label: "pull", kind: "generic", x: 85, y: 40 },
        { id: "drag", label: "drag", kind: "generic", x: 15, y: 40 }
      ],
      connections: [
        { from: "pull", to: "sled", label: "applied to", kind: "appliedTo" },
        { from: "drag", to: "pull", label: "opposes", kind: "opposes" },
        { from: "sled", to: "snow", label: "contacts", kind: "contacts" }
      ]
    };
    const script = compileUniversalScene(plan, initialScene, "A pull moves a sled across packed snow while drag opposes the pull");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const html = renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(initialScene, script)} />);
    expect(html).toContain('data-relation-layout="force-diagram"');
    expect(html).toContain('data-visual-cue="surface-line"');
    expect(html).toContain('data-visual-cue="opposing-friction-arrow friction-arrow-smaller"');
    expect(() => compileUniversalScene({ ...plan, connections: [plan.connections[0],
      { ...plan.connections[1], to: "sled" }, plan.connections[2]] }, initialScene,
    "A pull moves a sled across packed snow while drag opposes the pull")).toThrow(/roles do not connect/);
  });
});
