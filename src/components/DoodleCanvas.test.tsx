import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "./DoodleCanvas";
import { interpretTeacherText } from "../doodlescript/interpret";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { motionGeometry } from "../doodlescript/motion";
import { ownershipBadges } from "./ownership";

function run(text: string, scene = initialScene) {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  const checked = validateDoodleScript(result.script, scene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return applyDoodleScript(scene, checked.script);
}

describe("motion SVG rendering", () => {
  for (const kind of ["toward", "away"] as const) {
    it(`renders the ${kind} arrow and matching accessible relationship`, () => {
      const scene = run(`A car moves ${kind === "away" ? "away from" : "toward"} a person`);
      const geometry = motionGeometry(scene.entities[0], scene.entities[1], kind)!;
      const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
      expect(html).toContain(`d="M${geometry.startX} ${geometry.y} H${geometry.endX}"`);
      expect(html).toContain(`aria-label="moves ${kind === "away" ? "away from" : "toward"}"`);
      expect(html).toContain("Drawing containing 2 objects");
    });
  }
  it("removes the motion annotation when stopped and can render the prior revision", () => {
    const moving = run("A car approaches a person");
    const stopped = run("Stop it", moving);
    const html = renderToStaticMarkup(<DoodleCanvas scene={stopped} />);
    expect(html).not.toContain('class="motion-annotation"');
    expect(html).toContain("Drawing containing 2 objects");
    expect(renderToStaticMarkup(<DoodleCanvas scene={moving} />)).toContain('class="motion-annotation"');
  });
});

describe("phone overview framing", () => {
  it("centers a lone subject but keeps a multi-object relationship entirely in view", () => {
    const single = {
      ...initialScene, revision: 1,
      entities: [{ id: "book-1", kind: "book" as const, label: "yellow book", x: 50, y: 50,
        scale: 1, direction: "right" as const, highlighted: false }]
    };
    const lone = renderToStaticMarkup(<DoodleCanvas scene={single} />);
    expect(lone).toContain('data-overview-framing="single-subject"');
    expect(lone).toContain('viewBox="340 228.8 320 198.4"');
    expect(lone).toContain("yellow book");
    const related = renderToStaticMarkup(<DoodleCanvas scene={run("A car moves toward a person")} />);
    expect(related).toContain('data-overview-framing="full-scene"');
    expect(related).toContain('viewBox="0 0 1000 620"');
  });

  it("clamps edge subjects inside the original board without changing their coordinates", () => {
    for (const x of [6, 94]) {
      const scene = { ...initialScene, revision: 1, entities: [{ id: `edge-${x}`, kind: "generic" as const,
        label: "unknown device", x, y: 12, scale: 1, direction: "right" as const, highlighted: false }] };
      const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
      expect(html).toContain('data-overview-framing="single-subject"');
      expect(html).toContain(`transform="translate(${x * 10} 74.4) scale(1)"`);
      expect(html).toContain(`viewBox="${x === 6 ? 0 : 680} 0 320 198.4"`);
    }
  });
});

describe("visible ownership groups", () => {
  it("renders one readable card per owner with the exact items, outside the clipped canvas", () => {
    const scene = run("Three students each have two books");
    const root = document.createElement("div");
    root.innerHTML = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(root.querySelector(".canvas-shell .ownership-details")).toBeNull();
    expect(root.querySelectorAll(".ownership-card")).toHaveLength(3);
    expect(root.querySelectorAll("[data-owned-id]")).toHaveLength(6);
    expect(root.querySelector('[data-owner-id="student-2"]')?.textContent).toContain("Owns 2 items");
    expect(Array.from(root.querySelectorAll('[data-owner-id="student-2"] [data-owned-id]')).map((item) => item.getAttribute("data-owned-id"))).toEqual(["book-3", "book-4"]);
  });
  it("merges transferred possessions into one recipient card and restores the old grouping", () => {
    const before = run("Three students each have a book");
    const after = run("The first student gives book 1 to the second student", before);
    const root = document.createElement("div");
    root.innerHTML = renderToStaticMarkup(<DoodleCanvas scene={after} />);
    expect(root.querySelectorAll('[data-owner-id="student-2"]')).toHaveLength(1);
    expect(root.querySelectorAll('[data-owner-id="student-2"] [data-owned-id]')).toHaveLength(2);
    expect(root.querySelector('[data-owner-id="student-1"]')).toBeNull();
    root.innerHTML = renderToStaticMarkup(<DoodleCanvas scene={before} />);
    expect(root.querySelectorAll('[data-owner-id="student-1"] [data-owned-id]')).toHaveLength(1);
  });
  it("keeps shared items out of personal ownership cards in a mixed scene", () => {
    const scene = run("Another student arrives with her own book", run("Three students share two books"));
    const root = document.createElement("div");
    root.innerHTML = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(root.querySelectorAll(".ownership-card")).toHaveLength(1);
    expect(root.querySelector('[data-owned-id="book-1"]')).toBeNull();
    expect(root.querySelector('[data-owned-id="book-3"]')).not.toBeNull();
    expect(root.querySelector(".relationship-key")?.textContent).toContain("share");
  });
  it("assigns distinct owner codes to six individual books across rows", () => {
    const scene = run("Three students each have two books");
    const saved = structuredClone(scene);
    const badges = ownershipBadges(scene);
    for (let owner = 1; owner <= 3; owner++) {
      expect(badges.get(`student-${owner}`)?.[0]).toMatchObject({ code: `O${owner}`, role: "owner" });
      for (const book of [owner * 2 - 1, owner * 2]) expect(badges.get(`book-${book}`)?.[0]).toMatchObject({ code: `O${owner}`, role: "item" });
    }
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html.match(/class="ownership-badge"/g)).toHaveLength(9);
    expect(html).not.toContain('aria-label="Personal ownership"');
    expect(scene).toEqual(saved);
  });
  it("updates a transferred book without changing unrelated codes or positions", () => {
    const before = run("Three students each have a book");
    const after = run("The first student gives book 1 to the second student", before);
    expect(ownershipBadges(after).get("book-1")?.[0].code).toBe("O2");
    expect(ownershipBadges(after).get("book-3")).toEqual(ownershipBadges(before).get("book-3"));
    expect(ownershipBadges(after).get("student-2")).toHaveLength(1);
    expect(after.entities.map((entity) => entity.id)).toEqual(before.entities.map((entity) => entity.id));
    expect(after.entities.filter((entity) => !["student-1", "student-2", "book-1"].includes(entity.id)))
      .toEqual(before.entities.filter((entity) => !["student-1", "student-2", "book-1"].includes(entity.id)));
    expect(ownershipBadges(before).get("book-1")?.[0].code).toBe("O1");
  });
  it("does not mark shared books as individually owned", () => {
    const scene = run("Three students share two books");
    expect(ownershipBadges(scene).size).toBe(0);
    expect(renderToStaticMarkup(<DoodleCanvas scene={scene} />)).toContain("Shared resources");
  });
  it("cleans badges when an owner is removed", () => {
    const scene = run("Remove the student", run("A student owns a book"));
    expect(ownershipBadges(scene).size).toBe(0);
  });
});
