import { afterEach, describe, expect, it, vi } from "vitest";
import { editStrokeGlyphRemotely, generateStrokeGlyphRemotely } from "./generateGlyph";
import { strokeGlyphSchema } from "../glyphs/strokeGlyph";

const strokes = { strokes: [
  { part: "outline", color: "#2f3e46", pts: [[10, 10], [40, 10], [40, 40], [10, 10]] },
  { part: "detail", color: "#52796f", pts: [[12, 20], [20, 20], [30, 20], [38, 20]] }
] };

afterEach(() => vi.unstubAllGlobals());

describe("remote stroke boundary", () => {
  it("streams only completed strokes from split SSE frames", async () => {
    const text = JSON.stringify(strokes);
    const split = text.indexOf('},{"part":"detail"') + 1;
    const messages = [text.slice(0, 22), text.slice(22, split), text.slice(split)];
    const stream = new ReadableStream<Uint8Array>({ start(controller) {
      for (const content of messages) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`));
      controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      controller.close();
    } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } })));
    const seen: string[] = [];
    const result = await generateStrokeGlyphRemotely("bird", "test-key", new AbortController().signal, (stroke) => seen.push(stroke.part));
    expect(seen).toEqual(["outline", "detail"]);
    expect(result.strokes).toHaveLength(2);
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(body.stream).toBe(true);
    expect(body.messages[0].content).toContain("50x50 grid");
  });

  it("streams through the local bridge without putting the key in the browser request", async () => {
    const stream = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: JSON.stringify(strokes) } }] })}\n\n`));
      controller.close();
    } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream, { status: 200 })));
    const glyph = await generateStrokeGlyphRemotely("bird", "", new AbortController().signal, () => undefined, undefined, true);
    expect(glyph.strokes).toHaveLength(2);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/tegeera-ai/chat/completions");
    expect((vi.mocked(fetch).mock.calls[0][1] as RequestInit).headers).not.toHaveProperty("authorization");
  });

  it("applies a bounded model edit instead of replacing unaffected strokes", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      ops: [{ op: "replace", index: 1, stroke: { part: "new-detail", color: "#e9c46a", pts: [[12, 21], [20, 21], [30, 21], [38, 21]] } }]
    }) } }] }), { status: 200 })));
    const edited = await editStrokeGlyphRemotely("bird", strokeGlyphSchema.parse(strokes), "make the detail yellow", "test-key", new AbortController().signal);
    expect(edited.strokes[0]).toEqual(strokes.strokes[0]);
    expect(edited.strokes[1].part).toBe("new-detail");
  });
});
