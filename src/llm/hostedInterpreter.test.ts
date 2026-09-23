import { afterEach, describe, expect, it, vi } from "vitest";
import { initialScene } from "../doodlescript/scene";
import { strokeGlyphSchema } from "../glyphs/strokeGlyph";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

const strokes = strokeGlyphSchema.parse({ strokes: [
  { part: "outline", color: "#2f3e46", pts: [[10, 10], [40, 10], [40, 40], [10, 10]] }
] });

describe("private hosted model boundary", () => {
  it("sends only a compact scene and no API credential", async () => {
    vi.stubEnv("VITE_TEGEERA_INTERPRETER_URL", "https://tegeera.example/");
    vi.resetModules();
    const fetchMock = vi.fn(async (...args: [string, RequestInit?]) => {
      void args;
      return new Response(JSON.stringify({ candidate: { blueprintVersion: "1.0" }, provider: "nvidia", model: "nvidia/test" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { interpretRemotely, remoteInterpreterEnabled } = await import("./remoteInterpreter");
    expect(remoteInterpreterEnabled()).toBe(true);
    const result = await interpretRemotely("A plant absorbs water through its roots", initialScene);
    expect(result.provider).toBe("nvidia");
    expect(fetchMock.mock.calls[0][0]).toBe("https://tegeera.example/v1/interpret");
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.headers).not.toHaveProperty("authorization");
    expect(JSON.parse(request.body as string).scene).toEqual({ sceneId: initialScene.sceneId, revision: initialScene.revision, entities: [], relations: [] });
  });

  it("generates, edits and plans nouns through private routes while validating strokes", async () => {
    vi.stubEnv("VITE_TEGEERA_INTERPRETER_URL", "https://tegeera.example");
    vi.resetModules();
    const fetchMock = vi.fn(async (...args: [string, RequestInit?]) => new Response(JSON.stringify({ candidate:
      args[0].endsWith("/v1/lesson-nouns") ? { nouns: ["plant", "roots"] } : strokes
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { generateStrokeGlyphRemotely, editStrokeGlyphRemotely, planLessonNouns } = await import("./generateGlyph");
    const seen: string[] = [];
    const generated = await generateStrokeGlyphRemotely("plant", "", new AbortController().signal, (stroke) => seen.push(stroke.part));
    expect(generated).toEqual(strokes);
    expect(seen).toEqual(["outline"]);
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty("authorization");
    const edited = await editStrokeGlyphRemotely("plant", generated, "add one leaf", "", new AbortController().signal);
    expect(edited).toEqual(strokes);
    const nouns = await planLessonNouns("plant biology", "", new AbortController().signal);
    expect(nouns).toEqual(["plant", "roots"]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://tegeera.example/v1/glyph", "https://tegeera.example/v1/glyph/edit", "https://tegeera.example/v1/lesson-nouns"
    ]);
  });

  it("rejects malformed hosted artwork without drawing it", async () => {
    vi.stubEnv("VITE_TEGEERA_INTERPRETER_URL", "https://tegeera.example");
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ candidate: { strokes: [{
      part: "unsafe", color: "#2f3e46", pts: [[1, 1], [2, 2], [3, 3], [4, 4]]
    }] } }), { status: 200 })));
    const { generateStrokeGlyphRemotely } = await import("./generateGlyph");
    const seen: string[] = [];
    await expect(generateStrokeGlyphRemotely("plant", "", new AbortController().signal, (stroke) => seen.push(stroke.part))).rejects.toThrow();
    expect(seen).toEqual([]);
  });
});
