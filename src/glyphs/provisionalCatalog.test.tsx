import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { initialScene } from "../doodlescript/scene";
import type { SceneEntity } from "../doodlescript/schema";
import { provisionalCatalog, provisionalPackSchema, withProvisionalPreviews, provisionalPreviewFor } from "./provisionalCatalog";
import data from "./provisional-pack.json";
import { LiveGlyphResolver } from "./runtimeResolver";

const subject = (label: string, kind: SceneEntity["kind"]): SceneEntity => ({
  id: label, label, kind, x: 50, y: 50, scale: 1, direction: "right", highlighted: false
});

describe("provisional Quick, Draw! previews", () => {
  it("does not substitute unrelated head-noun artwork for compounds", () => {
    const bee = provisionalCatalog.preview.get("bee")!;
    const pack = new Map([["hand", bee], ["lion", bee], ["key", bee]]);
    for (const noun of ["clock hand", "sea lion", "encryption key", "second encryption key"]) {
      expect(provisionalPreviewFor(noun, pack)).toBeUndefined();
    }
    expect(provisionalPreviewFor("second key", pack)).toBe(bee);
  });
  it("keeps machine screening distinct from human approval and retains source credits", () => {
    expect(provisionalPackSchema.parse(data).entries).toHaveLength(17);
    expect(data.entries.every((entry) => entry.screening.humanReviewed === false)).toBe(true);
    expect(provisionalCatalog.attributions.every((entry) => entry.sourceUrl.includes("quickdraw_dataset"))).toBe(true);
  });

  it("makes every shipped preview available offline without promoting it to approved art", () => {
    for (const entry of data.entries) {
      const scene = withProvisionalPreviews({ ...initialScene, entities: [subject(entry.noun, "generic")] });
      expect(scene.entities[0].glyph).toEqual(entry.glyph);
      expect(scene.entities[0].glyphSource).toBe("provisional");
    }
  });

  it("resolves the expanded pack immediately without provider calls or persistence", async () => {
    const generator = vi.fn();
    const persist = vi.fn();
    const resolver = new LiveGlyphResolver({ preview: provisionalCatalog.preview, generator, persist });
    for (const noun of ["bird", "key", "birds", "keys"]) {
      expect(resolver.resolve(noun)).toMatchObject({ source: "provisional", status: "placeholder" });
      expect(resolver.resolve(noun).glyph).toBeDefined();
    }
    await Promise.resolve();
    expect(generator).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
    expect(resolver.approve("bird")).toBeUndefined();
  });

  it("shows a preview for a generic noun or animal mistyped as a person", () => {
    const scene = withProvisionalPreviews({ ...initialScene, entities: [subject("second bee", "person"),
      subject("cup", "generic"), subject("child", "person")] });
    expect(scene.entities.map((entity) => entity.glyphSource)).toEqual(["provisional", "provisional", undefined]);
    const markup = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(markup).toContain('data-glyph-source="provisional"');
    expect(markup).toContain("2 provisional sketches · not human-reviewed");
  });
});
