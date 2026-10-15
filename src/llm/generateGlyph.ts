import { strokeGlyphSchema, strokeSchema, StrokeStreamParser, type Stroke, type StrokeGlyph } from "../glyphs/strokeGlyph";
import { z } from "zod";
import { hostedInterpreterUrl } from "./remoteInterpreter";
import { STROKE_DRAWING_RULES } from "../../shared/strokeDrawingRules.mjs";

const endpoint = "https://openrouter.ai/api/v1/chat/completions";
const palette = "#2f3e46 #52796f #84a98c #f4a261 #e9c46a #cad2c5";
export const DEFAULT_FREE_GLYPH_MODEL = "google/gemma-4-31b-it:free";

async function hostedJson(path: string, body: object, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`${hostedInterpreterUrl}${path}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal
  });
  const payload = await response.json().catch(() => null) as { candidate?: unknown; error?: string } | null;
  if (!response.ok || !payload || !("candidate" in payload)) {
    throw new Error(payload?.error ?? `Hosted doodle request failed (${response.status}).`);
  }
  return payload.candidate;
}

async function requestJson(prompt: string, key: string, signal: AbortSignal, maxTokens: number, model = DEFAULT_FREE_GLYPH_MODEL, localBridge = false): Promise<unknown> {
  if (!key.trim() && !localBridge) throw new Error("AI glyph generation is not enabled.");
  const response = await fetch(localBridge && !key.trim() ? "/api/tegeera-ai/chat/completions" : endpoint, {
    method: "POST",
    headers: {
      ...(key.trim() ? { authorization: `Bearer ${key.trim()}` } : {}),
      "content-type": "application/json",
      "http-referer": window.location.href,
      "x-title": "Tegeera"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0, max_tokens: maxTokens,
      response_format: { type: "json_object" },
      provider: { allow_fallbacks: true, data_collection: "deny" }
    }),
    signal
  });
  const payload = await response.json().catch(() => null) as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> } | null;
  if (!response.ok) throw new Error(`OpenRouter glyph request failed (${response.status}): ${payload?.error?.message ?? 'no detail'}`);
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No glyph response.");
  return JSON.parse(content);
}

const strokePrompt = (noun: string) => `Draw one original classroom marker doodle of ${JSON.stringify(noun)}. ${STROKE_DRAWING_RULES}`;

/** Streams validated complete strokes; a partial JSON token is never shown as artwork. */
export async function generateStrokeGlyphRemotely(
  noun: string, key: string, signal: AbortSignal, onStroke: (stroke: Stroke) => void,
  model = DEFAULT_FREE_GLYPH_MODEL,
  localBridge = false
): Promise<StrokeGlyph> {
  if (hostedInterpreterUrl && !key.trim()) {
    const strokes = strokeGlyphSchema.parse(await hostedJson("/v1/glyph", { noun, strokeFormat: "1.1" }, signal));
    for (const stroke of strokes.strokes) onStroke(stroke);
    return strokes;
  }
  if (!key.trim() && !localBridge) throw new Error("AI glyph generation is not enabled.");
  const response = await fetch(localBridge && !key.trim() ? "/api/tegeera-ai/chat/completions" : endpoint, {
    method: "POST", signal,
    headers: { ...(key.trim() ? { authorization: `Bearer ${key.trim()}` } : {}), "content-type": "application/json", "http-referer": window.location.href, "x-title": "Tegeera" },
    body: JSON.stringify({ model, stream: true,
      messages: [{ role: "user", content: strokePrompt(noun) }],
      temperature: 0, max_tokens: 2600,
      response_format: { type: "json_object" },
      provider: { allow_fallbacks: true, data_collection: "deny" } })
  });
  if (!response.ok || !response.body) throw new Error(`OpenRouter stroke stream failed (${response.status}).`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = new StrokeStreamParser();
  let lines = "", content = "", responseModel = "unknown", finish = "unknown";
  const acceptLine = (line: string) => {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let delta: unknown;
    try { delta = JSON.parse(data); } catch { return; }
    const event = delta as { model?: string; choices?: Array<{ finish_reason?: string; delta?: { content?: unknown } }> };
    if (event.model) responseModel = event.model;
    if (event.choices?.[0]?.finish_reason) finish = event.choices[0].finish_reason;
    const chunk = event.choices?.[0]?.delta?.content;
    if (typeof chunk !== "string") return;
    content += chunk;
    for (const stroke of parser.push(chunk)) onStroke(stroke);
  };
  let wireBytes = 0;
  const cancelRead = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", cancelRead, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      wireBytes += value.byteLength;
      if (wireBytes > 512_000) throw new Error("Oversized stroke stream");
      lines += decoder.decode(value, { stream: true });
      if (lines.length > 64_000) throw new Error("Oversized stroke stream");
      let newline: number;
      while ((newline = lines.indexOf("\n")) >= 0) {
        acceptLine(lines.slice(0, newline).trimEnd());
        lines = lines.slice(newline + 1);
      }
    }
    lines += decoder.decode();
    if (lines.trim()) acceptLine(lines.trim());
  } finally {
    signal.removeEventListener("abort", cancelRead);
    // Release the upstream response on parse errors, size limits and aborts,
    // not only on successful EOF. Never wait for an uncooperative cancel hook.
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  if (content.length > 32_000) throw new Error("Oversized stroke glyph");
  try { return strokeGlyphSchema.parse(JSON.parse(content)); }
  catch {
    throw new Error(`Invalid stroke stream (model ${responseModel}; finish ${finish}; ${content.length} chars; ${parser.count} completed strokes).`);
  }
}

const editOperation = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), stroke: strokeSchema }).strict(),
  z.object({ op: z.literal("replace"), index: z.number().int().min(0).max(9), stroke: strokeSchema }).strict(),
  z.object({ op: z.literal("remove"), index: z.number().int().min(0).max(9) }).strict()
]);
const editSchema = z.object({ ops: z.array(editOperation).min(1).max(4) }).strict();

/** A bounded semantic edit—not executable code or a raw SVG replacement. */
export async function editStrokeGlyphRemotely(noun: string, current: StrokeGlyph, instruction: string, key: string, signal: AbortSignal, model = DEFAULT_FREE_GLYPH_MODEL, localBridge = false): Promise<StrokeGlyph> {
  if (!instruction.trim() || instruction.length > 160) throw new Error("Describe one short doodle change.");
  if (hostedInterpreterUrl && !key.trim()) {
    return strokeGlyphSchema.parse(await hostedJson("/v1/glyph/edit", { noun, current, instruction, strokeFormat: "1.1" }, signal));
  }
  const candidate = editSchema.parse(await requestJson(
    `Edit this classroom doodle of ${JSON.stringify(noun)}. Current strokes: ${JSON.stringify(current)}. User instruction: ${JSON.stringify(instruction)}. Return ONLY JSON {"ops":[{"op":"add","stroke":{"part":"feature","color":"#2f3e46","pts":[[10,10],[13,13]]}}]} using 1-4 add, replace, or remove operations. For replace/remove include zero-based index. Preserve unaffected strokes and their interpolation; do not regenerate the whole drawing. Each stroke needs 2-14 integer points in 3..47 and a color from ${palette}. Use interpolation "linear" for straight edges or "smooth" for curves.`,
    key, signal, 800, model, localBridge
  ));
  const strokes: Stroke[] = [...current.strokes];
  for (const operation of candidate.ops) {
    if (operation.op === "add") strokes.push(operation.stroke);
    else if (operation.index >= strokes.length) throw new Error("Edit referenced a missing stroke.");
    else if (operation.op === "replace") strokes[operation.index] = operation.stroke;
    else strokes.splice(operation.index, 1);
  }
  return strokeGlyphSchema.parse({ strokes });
}

export async function planLessonNouns(topic: string, key: string, signal: AbortSignal, model = DEFAULT_FREE_GLYPH_MODEL, localBridge = false): Promise<string[]> {
  if (hostedInterpreterUrl && !key.trim()) {
    const response = await hostedJson("/v1/lesson-nouns", { topic }, signal);
    if (!response || typeof response !== "object" || !("nouns" in response) || !Array.isArray(response.nouns)) {
      throw new Error("Invalid hosted lesson noun plan.");
    }
    return response.nouns.filter((noun): noun is string => typeof noun === "string").slice(0, 30);
  }
  const result = await requestJson(
    `For a classroom lesson on ${JSON.stringify(topic)}, return only JSON {"nouns":["..."]} with exactly 30 likely concrete nouns that a teacher might need to draw. Each noun must be 2-48 characters, distinct, and no complete lesson sentences or abstract topics.`,
    key, signal, 1000, model, localBridge
  );
  if (!result || typeof result !== "object" || !("nouns" in result) || !Array.isArray(result.nouns)) {
    throw new Error("Invalid lesson noun plan.");
  }
  return result.nouns.filter((noun): noun is string => typeof noun === "string").slice(0, 30);
}
