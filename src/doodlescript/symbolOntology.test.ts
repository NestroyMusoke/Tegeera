import { describe, expect, it } from "vitest";
import { resolveVisualSymbol, SYMBOL_ONTOLOGY_VERSION, symbolOntology, validateSymbolOntology } from "./symbolOntology";

describe("visual symbol ontology", () => {
  it("has a valid versioned registry without duplicate identities or aliases", () => {
    expect(SYMBOL_ONTOLOGY_VERSION).toBe("1.1.0");
    expect(symbolOntology.length).toBeGreaterThan(10);
    expect(validateSymbolOntology()).toEqual([]);
  });

  it("composes rainfall from a cloud, falling droplets, and capability evidence", () => {
    const plan = resolveVisualSymbol("heavy rainfall");
    expect(plan).toMatchObject({ symbolId: "rain", category: "weather", fallback: false });
    expect(plan.primitives).toEqual(["cloud", "droplet"]);
    expect(plan.capabilities).toContain("falls");
  });

  it("composes scientific processes from reusable primitives and cues", () => {
    expect(resolveVisualSymbol("evaporation")).toMatchObject({ primitives: ["water", "droplet"], capabilities: ["rises"] });
    expect(resolveVisualSymbol("photosynthesis")).toMatchObject({ primitives: ["leaf", "rays"], capabilities: ["cycles", "radiates"] });
    expect(resolveVisualSymbol("soil erosion")).toMatchObject({ primitives: ["ground", "crack"], capabilities: ["flows", "breaks"] });
  });

  it("retrieves concepts from descriptive capability tags rather than sentence patterns", () => {
    expect(resolveVisualSymbol("thermal energy").symbolId).toBe("heat");
    expect(resolveVisualSymbol("electric charge").symbolId).toBe("electricity");
    expect(resolveVisualSymbol("plant energy using chlorophyll").symbolId).toBe("photosynthesis");
  });

  it("is deterministic for repeated requests", () => {
    expect(resolveVisualSymbol("solar energy")).toEqual(resolveVisualSymbol("solar energy"));
  });

  it("uses an honest fallback when no mapping is supported", () => {
    expect(resolveVisualSymbol("constitutional legitimacy")).toEqual({
      ontologyVersion: "1.1.0",
      symbolId: "labelled-node",
      category: "unknown",
      primitives: [],
      capabilities: [],
      visualCues: [],
      matchedTerms: [],
      confidence: 0,
      fallback: true
    });
  });

  it("exposes composable plant-part cues without sentence knowledge", () => {
    expect(resolveVisualSymbol("roots")).toMatchObject({ symbolId: "roots", primitives: ["roots"], visualCues: ["visible-roots"] });
    expect(resolveVisualSymbol("leaves")).toMatchObject({ symbolId: "leaf", primitives: ["leaf"] });
    expect(resolveVisualSymbol("sunlight").visualCues).toContain("sun-symbol");
  });

  it("does not turn one generic context word into a confident pictorial claim", () => {
    expect(resolveVisualSymbol("energy").fallback).toBe(true);
    expect(resolveVisualSymbol("force").fallback).toBe(true);
    expect(resolveVisualSymbol("liquid state").fallback).toBe(true);
  });

  it("falls back instead of guessing when retrieval is tied", () => {
    expect(resolveVisualSymbol("liquid gas").fallback).toBe(true);
  });
});
