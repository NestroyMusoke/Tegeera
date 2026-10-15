import { afterEach, describe, expect, it, vi } from "vitest";
import { editStrokeGlyphRemotely, generateStrokeGlyphRemotely } from "./generateGlyph";
import { strokeGlyphSchema } from "../glyphs/strokeGlyph";
import { STROKE_DRAWING_RULES } from "../../shared/strokeDrawingRules.mjs";

const strokes = { strokes: [
  { part: "outline", color: "#2f3e46", interpolation: "linear", pts: [[10, 10], [40, 10], [40, 40], [10, 10]] },
  { part: "detail", color: "#52796f", pts: [[12, 20], [20, 20], [30, 20], [38, 20]] }
] };

afterEach(() => vi.unstubAllGlobals());

describe("remote stroke boundary", () => {
  it("cancels an oversized open stream instead of leaving the reader running", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new TextEncoder().encode("x".repeat(64_001)));
    }, cancel });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream)));
    await expect(generateStrokeGlyphRemotely("telescope", "test-key", new AbortController().signal, () => undefined))
      .rejects.toThrow("Oversized stroke stream");
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });

  it("bounds total traffic even when every comment line is short", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ pull(controller) {
      controller.enqueue(new TextEncoder().encode(": heartbeat\n".repeat(1000)));
    }, cancel });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream)));
    await expect(generateStrokeGlyphRemotely("telescope", "test-key", new AbortController().signal, () => undefined))
      .rejects.toThrow("Oversized stroke stream");
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });

  it("aborts a stalled reader even when the mocked transport ignores the signal", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ cancel });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream)));
    const controller = new AbortController();
    const seen = vi.fn();
    const pending = generateStrokeGlyphRemotely("watering can", "test-key", controller.signal, seen);
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(stream.locked).toBe(true));
    controller.abort();
    await rejected;
    expect(cancel).toHaveBeenCalledOnce();
    expect(seen).not.toHaveBeenCalled();
    expect(stream.locked).toBe(false);
  });

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
    expect(body.messages[0].content).toContain(STROKE_DRAWING_RULES);
    expect(result.strokes[0].interpolation).toBe("linear");
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
