export const NVIDIA_SCENE_MODEL = "nvidia/nemotron-3-super-120b-a12b";
export const OPENROUTER_FREE_MODELS = [
  "google/gemma-4-26b-a4b-it:free", "google/gemma-4-31b-it:free", "openrouter/free"
];

const kinds = new Set(["person", "teacher", "student", "process", "cpu", "car", "book", "desk", "tree", "building", "generic"]);
const colors = new Set(["red", "orange", "yellow", "green", "blue", "purple", "pink", "brown", "black", "white", "gray"]);
const ink = new Set(["#2f3e46", "#52796f", "#84a98c", "#f4a261", "#e9c46a", "#cad2c5"]);
const typedConnectionLabels = Object.freeze({
  partOf: "part of", flowsInto: "flows into", illuminates: "illuminates",
  before: "before", causes: "causes"
});

export function scenePrompt(text, scene, reusableNouns = []) {
  const prior = {
    entities: (scene.entities || []).slice(0, 8).map(({ id, kind, label, x, y }) => ({ id, kind, label, x, y })),
    relations: (scene.relations || []).slice(0, 12).map(({ sourceIds, targetIds, predicate, kind }) => ({ sourceIds, targetIds, predicate, kind }))
  };
  return `Make one accurate classroom visual plan. Return only a JSON object with this shape:
{"blueprintVersion":"1.0","mode":"replace","confidence":0.9,"objects":[{"id":"source","label":"source","kind":"generic","x":20,"y":50},{"id":"destination","label":"destination","kind":"generic","x":80,"y":50}],"connections":[{"from":"source","to":"destination","label":"flows into","kind":"flowsInto"}]}
Represent every essential named or implied visible part needed to explain the teacher's mechanism. Include inputs, outputs, sources, destinations, containers and part-whole relations when the statement depends on them. Do not invent unsupported facts. Use 1-8 objects, 0-12 connections. If a faithful plan needs more than eight objects or meaning is unclear, set confidence below 0.58. Object IDs must be unique and connections must point to exact object IDs, or existing IDs only in extend mode. Use extend only for an explicit addition to the current scene. Kind is one of ${[...kinds].join(", ")}; use generic for every other noun. Optional color is one of ${[...colors].join(", ")}; omit when not stated. x/y are 0..100 and must preserve above/below and left/right. Each label is 1-4 words. A connection label states the actual relationship. No glyphs, SVG, paths or explanations. Existing artwork labels are only retrieval hints: ${JSON.stringify(reusableNouns)}.
For a connection, use an optional typed kind only when its exact meaning applies: ${Object.entries(typedConnectionLabels).map(([kind, label]) => `${kind}="${label}"`).join(", ")}. Its label must exactly match that quoted text. These are general visual grammar, not special lesson templates. For every other relationship omit kind and use a truthful short label. A typed connection also needs visible space between its endpoints; before/causes must go left to right.
Negated claims cannot be shown safely by this positive-only grammar: never turn "does not" into a positive arrow; lower confidence below 0.58. Put every explicitly stated color on the correct object.
Teacher: ${JSON.stringify(text)}
Current scene: ${JSON.stringify(prior)}`;
}

export function strokePrompt(noun) {
  return `Draw one recognizable ${JSON.stringify(noun)} as a classroom marker doodle. Return only JSON {"strokes":[{"part":"outline","color":"#2f3e46","pts":[[8,8],[42,8],[42,42],[8,42],[8,8]]}]}. Use 3-10 strokes and 4-14 integer points per stroke on a 50x50 grid. Coordinates must stay within 3..47. Use only colors ${[...ink].join(", ")}. Draw the full silhouette first, then 2-4 distinguishing features. No text, SVG, code or unrelated decoration.`;
}

function parseJson(content) {
  if (typeof content !== "string" || !content.trim() || content.length > 24_000) throw new Error("Missing or oversized model output.");
  return JSON.parse((content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? content).trim());
}

export function validScene(candidate, scene = { entities: [] }) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)
    || candidate.blueprintVersion !== "1.0" || !["replace", "extend"].includes(candidate.mode)
    || typeof candidate.confidence !== "number" || candidate.confidence < 0 || candidate.confidence > 1
    || !Array.isArray(candidate.objects) || candidate.objects.length < 1 || candidate.objects.length > 8
    || !Array.isArray(candidate.connections) || candidate.connections.length > 12) return false;
  const ids = new Set(candidate.mode === "extend" ? (scene.entities || []).map(({ id }) => id) : []);
  for (const object of candidate.objects) {
    if (!object || typeof object !== "object" || typeof object.id !== "string" || !/^[a-zA-Z0-9_-]{1,30}$/.test(object.id)
      || ids.has(object.id) || typeof object.label !== "string" || !object.label.trim() || object.label.length > 32
      || !kinds.has(object.kind) || (object.color !== undefined && !colors.has(object.color))
      || !Number.isFinite(object.x) || object.x < 0 || object.x > 100
      || !Number.isFinite(object.y) || object.y < 0 || object.y > 100) return false;
    ids.add(object.id);
  }
  for (const relation of candidate.connections) {
    if (!relation || !ids.has(relation.from) || !ids.has(relation.to) || relation.from === relation.to
      || typeof relation.label !== "string" || !relation.label.trim() || relation.label.length > 32
      || (relation.kind !== undefined && relation.kind !== "relatesTo"
        && (!Object.hasOwn(typedConnectionLabels, relation.kind)
          || relation.label.trim().toLowerCase() !== typedConnectionLabels[relation.kind]))) return false;
  }
  return true;
}

export function validStrokes(candidate) {
  if (!candidate || typeof candidate !== "object" || !Array.isArray(candidate.strokes)
    || candidate.strokes.length < 1 || candidate.strokes.length > 10) return false;
  return candidate.strokes.every((stroke) => stroke && typeof stroke.part === "string"
    && /^[a-z][a-z0-9-]{0,23}$/.test(stroke.part) && ink.has(stroke.color)
    && Array.isArray(stroke.pts) && stroke.pts.length >= 4 && stroke.pts.length <= 14
    && stroke.pts.every((point) => Array.isArray(point) && point.length === 2
      && point.every((coordinate) => Number.isInteger(coordinate) && coordinate >= 3 && coordinate <= 47)));
}

export function modelConfiguration(env = process.env) {
  if (env.NVIDIA_API_KEY?.trim()) return {
    provider: "nvidia", key: env.NVIDIA_API_KEY.trim(),
    model: env.NVIDIA_MODEL?.trim() || NVIDIA_SCENE_MODEL,
    url: "https://integrate.api.nvidia.com/v1/chat/completions"
  };
  if (env.OPENROUTER_API_KEY?.trim()) return {
    provider: "openrouter", key: env.OPENROUTER_API_KEY.trim(),
    model: env.OPENROUTER_MODEL?.trim() || OPENROUTER_FREE_MODELS[0],
    url: "https://openrouter.ai/api/v1/chat/completions"
  };
  return null;
}

export async function callModel(prompt, config, { fetchImpl = fetch, signal, maxTokens = 3200 } = {}) {
  const nvidia = config.provider === "nvidia";
  const body = nvidia ? {
    model: config.model, messages: [{ role: "user", content: prompt }],
    temperature: 1, top_p: 0.95, max_tokens: maxTokens, stream: false, reasoning_effort: "low"
  } : {
    ...(config.model === OPENROUTER_FREE_MODELS[0] ? { models: OPENROUTER_FREE_MODELS } : { model: config.model }),
    messages: [{ role: "user", content: prompt }], temperature: 0, max_tokens: maxTokens,
    reasoning: { enabled: false }, response_format: { type: "json_object" },
    provider: { allow_fallbacks: true, data_collection: "deny" }
  };
  const response = await fetchImpl(config.url, {
    method: "POST",
    headers: { authorization: `Bearer ${config.key}`, "content-type": "application/json", accept: "application/json",
      ...(nvidia ? {} : { "http-referer": "https://nestroymusoke.github.io/Tegeera/", "x-title": "Tegeera" }) },
    body: JSON.stringify(body), signal
  });
  if (!response.ok) throw new Error(`Model provider returned HTTP ${response.status}.`);
  const result = await response.json();
  return { content: result?.choices?.[0]?.message?.content, model: result?.model || config.model };
}

async function validatedCompletion(prompt, config, validate, options = {}) {
  const first = await callModel(prompt, config, options);
  try {
    const candidate = parseJson(first.content);
    if (validate(candidate)) return { candidate, provider: config.provider, model: first.model, repaired: false };
  } catch { /* A bounded correction follows once. */ }
  const correction = `The previous response did not satisfy the required JSON structure. Return ONLY corrected JSON, with every required field and valid references. Original task: ${prompt.slice(0, 6000)}\nPrevious response: ${String(first.content ?? "").slice(0, 4000)}`;
  const second = await callModel(correction, config, options);
  const candidate = parseJson(second.content);
  if (!validate(candidate)) throw new Error("The model did not return a complete, valid visual plan.");
  return { candidate, provider: config.provider, model: second.model, repaired: true };
}

export function interpretScene(body, config, options = {}) {
  return validatedCompletion(scenePrompt(body.text.trim(), body.scene, body.reusableGlyphNouns || []),
    config, (candidate) => validScene(candidate, body.scene), options);
}

export function generateGlyph(body, config, options = {}) {
  return validatedCompletion(strokePrompt(body.noun.trim()), config, validStrokes,
    { ...options, maxTokens: 2200 });
}

export function editGlyph(body, config, options = {}) {
  const prompt = `Edit this classroom marker doodle of ${JSON.stringify(body.noun)} according to ${JSON.stringify(body.instruction)}. Current strokes: ${JSON.stringify(body.current)}. Return only the complete revised JSON {"strokes":[...]}, preserving unaffected strokes. Every stroke needs a short part name, color from ${[...ink].join(", ")}, and 4-14 integer [x,y] points within 3..47. Use 1-10 strokes. No text or SVG.`;
  return validatedCompletion(prompt, config, validStrokes, { ...options, maxTokens: 2200 });
}

export function planLesson(body, config, options = {}) {
  const prompt = `For a classroom lesson about ${JSON.stringify(body.topic)}, return only JSON {"nouns":["..."]} with up to 30 distinct concrete things a teacher may need to draw. Each noun is 2-48 characters. Do not include complete sentences or abstract topics.`;
  const valid = (candidate) => candidate && Array.isArray(candidate.nouns) && candidate.nouns.length >= 1
    && candidate.nouns.length <= 30 && candidate.nouns.every((noun) => typeof noun === "string"
      && noun.trim().length >= 2 && noun.length <= 48);
  return validatedCompletion(prompt, config, valid, { ...options, maxTokens: 1000 });
}
