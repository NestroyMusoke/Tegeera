import { glyphSchema, type TegeeraGlyph } from "../glyphs/glyph";

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

export async function generateGlyphRemotely(noun: string, key: string, signal: AbortSignal): Promise<TegeeraGlyph> {
  const prompt = `Draw ONE original, recognizable classroom doodle of ${JSON.stringify(noun)}.
Return only JSON: {"schemaVersion":"1.0.0","viewBox":"0 0 100 100","parts":[{"id":"body","d":"M10 10 L90 10 L90 90 L10 90 Z","fill":"#cad2c5","stroke":"#2f3e46"}],"anchors":{"top":[50,10],"ground":[50,90],"front":[90,50]}}.
Use 1-12 joined paths; first make a coherent silhouette, then 2-4 unmistakable signature features. Prefer a clear side view and visual character over generic geometric icons. Only absolute M, L, C, Q, Z commands; repeat a command before every coordinate group; all numbers 0..100. No markup, text, relative paths, filters, images or event attributes. Fill is none or one of ${palette}; stroke is one of those six colors. Keep three anchors on visible parts of the drawing. The result must be readable at 64px.`;
  return glyphSchema.parse(await requestJson(prompt, key, signal, 1700));
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
