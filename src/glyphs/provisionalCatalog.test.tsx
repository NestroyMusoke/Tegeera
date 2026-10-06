import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { initialScene } from "../doodlescript/scene";
import type { SceneEntity } from "../doodlescript/schema";
import { provisionalCatalog, provisionalPackSchema, withProvisionalPreviews } from "./provisionalCatalog";
import data from "./provisional-pack.json";

const subject = (label: string, kind: SceneEntity["kind"]): SceneEntity => ({
  id: label, label, kind, x: 50, y: 50, scale: 1, direction: "right", highlighted: false
});

describe("provisional Quick, Draw! previews", () => {
  it("keeps machine screening distinct from human approval and retains source credits", () => {
    expect(provisionalPackSchema.parse(data).entries).toHaveLength(3);
    expect(data.entries.every((entry) => entry.screening.humanReviewed === false)).toBe(true);
    expect(provisionalCatalog.attributions.every((entry) => entry.sourceUrl.includes("quickdraw_dataset"))).toBe(true);
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
