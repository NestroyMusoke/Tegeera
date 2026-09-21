import { strokeGlyphSchema, strokeSchema, StrokeStreamParser, type Stroke, type StrokeGlyph } from "../glyphs/strokeGlyph";
import { z } from "zod";

const endpoint = "https://openrouter.ai/api/v1/chat/completions";
const palette = "#2f3e46 #52796f #84a98c #f4a261 #e9c46a #cad2c5";

async function requestJson(prompt: string, key: string, signal: AbortSignal, maxTokens: number): Promise<unknown> {
  if (!key.trim()) throw new Error("AI glyph generation is not enabled.");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key.trim()}`,
      "content-type": "application/json",
      "http-referer": window.location.href,
      "x-title": "Tegeera"
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [{ role: "user", content: prompt }],
      temperature: 0, max_tokens: maxTokens,
      response_format: { type: "json_object" },
      provider: { allow_fallbacks: true, data_collection: "deny" }
    }),
    signal
  });
  if (!response.ok) throw new Error(`OpenRouter glyph request failed (${response.status}).`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("No glyph response.");
  return JSON.parse(content);
}

const strokeExamples = [
  { noun: "house", strokes: [
    { part: "walls", color: "#2f3e46", pts: [[10,25],[10,42],[40,42],[40,25],[10,25]] },
    { part: "roof", color: "#e9c46a", pts: [[7,26],[25,8],[43,26],[7,26]] },
    { part: "door", color: "#52796f", pts: [[22,42],[22,32],[28,32],[28,42]] }
  ] },
  { noun: "sun", strokes: [
    { part: "disc", color: "#e9c46a", pts: [[25,12],[34,16],[38,25],[34,34],[25,38],[16,34],[12,25],[16,16],[25,12]] },
    { part: "ray-top", color: "#2f3e46", pts: [[25,4],[25,7],[25,9],[25,11]] },
    { part: "ray-right", color: "#2f3e46", pts: [[39,25],[42,25],[44,25],[46,25]] },
    { part: "ray-left", color: "#2f3e46", pts: [[4,25],[6,25],[8,25],[11,25]] }
  ] },
  { noun: "fish", strokes: [
    { part: "body", color: "#52796f", pts: [[10,25],[18,17],[33,17],[41,25],[33,33],[18,33],[10,25]] },
    { part: "tail", color: "#52796f", pts: [[11,25],[4,17],[4,33],[11,25]] },
    { part: "eye", color: "#2f3e46", pts: [[31,23],[32,22],[33,23],[31,23]] },
    { part: "fin", color: "#e9c46a", pts: [[20,18],[25,11],[29,18],[20,18]] }
  ] }
];

const strokePrompt = (noun: string) => `Draw ONE original, recognizable classroom doodle of ${JSON.stringify(noun)} on a 50x50 grid (0,0 top-left). Return ONLY one JSON object {"strokes":[{"part":"name","color":"#2f3e46","pts":[[x,y],[x,y],[x,y],[x,y]]}]}. Draw 4-10 ordered strokes, silhouette first, then 2-4 distinguishing features. Each stroke has 4-14 integer points in 3..47. Close a loop by repeating its first point. No words, labels, SVG, markdown or extra fields. Use only ${palette}. Examples of the FORMAT (do not copy their subject for another noun): ${JSON.stringify(strokeExamples)}. Make the requested subject recognizable at 64px, with one coherent body rather than scattered shapes.`;

/** Streams validated complete strokes; a partial JSON token is never shown as artwork. */
export async function generateStrokeGlyphRemotely(
  noun: string, key: string, signal: AbortSignal, onStroke: (stroke: Stroke) => void
): Promise<StrokeGlyph> {
  if (!key.trim()) throw new Error("AI glyph generation is not enabled.");
  const response = await fetch(endpoint, {
    method: "POST", signal,
    headers: { authorization: `Bearer ${key.trim()}`, "content-type": "application/json", "http-referer": window.location.href, "x-title": "Tegeera" },
    body: JSON.stringify({ model: "openrouter/free", stream: true,
      messages: [{ role: "user", content: strokePrompt(noun) }],
      temperature: 0, max_tokens: 1500,
      provider: { allow_fallbacks: true, data_collection: "deny" } })
  });
  if (!response.ok || !response.body) throw new Error(`OpenRouter stroke stream failed (${response.status}).`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = new StrokeStreamParser();
  let lines = "", content = "";
  const acceptLine = (line: string) => {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let delta: unknown;
    try { delta = JSON.parse(data); } catch { return; }
    const chunk = (delta as { choices?: Array<{ delta?: { content?: unknown } }> }).choices?.[0]?.delta?.content;
    if (typeof chunk !== "string") return;
    content += chunk;
    for (const stroke of parser.push(chunk)) onStroke(stroke);
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    lines += decoder.decode(value, { stream: true });
    if (lines.length > 64_000) throw new Error("Oversized stroke stream");
    let newline: number;
    while ((newline = lines.indexOf("\n")) >= 0) {
      acceptLine(lines.slice(0, newline).trimEnd());
      lines = lines.slice(newline + 1);
    }
  }
  if (lines.trim()) acceptLine(lines.trim());
  if (content.length > 32_000) throw new Error("Oversized stroke glyph");
  return strokeGlyphSchema.parse(JSON.parse(content));
}

const editOperation = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), stroke: strokeSchema }).strict(),
  z.object({ op: z.literal("replace"), index: z.number().int().min(0).max(9), stroke: strokeSchema }).strict(),
  z.object({ op: z.literal("remove"), index: z.number().int().min(0).max(9) }).strict()
]);
const editSchema = z.object({ ops: z.array(editOperation).min(1).max(4) }).strict();

/** A bounded semantic edit—not executable code or a raw SVG replacement. */
export async function editStrokeGlyphRemotely(noun: string, current: StrokeGlyph, instruction: string, key: string, signal: AbortSignal): Promise<StrokeGlyph> {
  if (!instruction.trim() || instruction.length > 160) throw new Error("Describe one short doodle change.");
  const candidate = editSchema.parse(await requestJson(
    `Edit this classroom doodle of ${JSON.stringify(noun)}. Current strokes: ${JSON.stringify(current)}. User instruction: ${JSON.stringify(instruction)}. Return ONLY JSON {"ops":[{"op":"add","stroke":{"part":"feature","color":"#2f3e46","pts":[[10,10],[11,11],[12,12],[13,13]]}}]} using 1-4 add, replace, or remove operations. For replace/remove include zero-based index. Preserve unaffected strokes; do not regenerate the whole drawing. Each stroke needs 4-14 integer points in 3..47 and a color from ${palette}.`,
    key, signal, 800
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

export async function planLessonNouns(topic: string, key: string, signal: AbortSignal): Promise<string[]> {
  const result = await requestJson(
    `For a classroom lesson on ${JSON.stringify(topic)}, return only JSON {"nouns":["..."]} with exactly 30 likely concrete nouns that a teacher might need to draw. Each noun must be 2-48 characters, distinct, and no complete lesson sentences or abstract topics.`,
    key, signal, 1000
  );
  if (!result || typeof result !== "object" || !("nouns" in result) || !Array.isArray(result.nouns)) {
    throw new Error("Invalid lesson noun plan.");
  }
  return result.nouns.filter((noun): noun is string => typeof noun === "string").slice(0, 30);
}
