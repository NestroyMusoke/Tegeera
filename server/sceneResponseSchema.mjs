// Provider-side shape guidance. This does not prove that a blueprint means the
// right thing: sceneValidationIssue and the browser compiler remain mandatory.
export const SCENE_RESPONSE_SCHEMA = Object.freeze({
  name: "tegeera_scene",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["blueprintVersion", "mode", "confidence", "objects", "connections"],
    properties: {
      blueprintVersion: { type: "string", const: "1.0" },
      mode: { type: "string", enum: ["replace", "extend"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      objects: { type: "array", minItems: 1, maxItems: 8, items: {
        type: "object", additionalProperties: false,
        required: ["id", "label", "kind", "x", "y"],
        properties: {
          id: { type: "string", pattern: "^[a-zA-Z0-9_-]{1,30}$" },
          label: { type: "string", minLength: 1, maxLength: 32 },
          kind: { type: "string", enum: ["person", "teacher", "student", "process", "cpu", "car", "book", "desk", "tree", "building", "generic"] },
          x: { type: "number", minimum: 0, maximum: 100 },
          y: { type: "number", minimum: 0, maximum: 100 },
          color: { type: "string", enum: ["red", "orange", "yellow", "green", "blue", "purple", "pink", "brown", "black", "white", "gray"] }
        }
      } },
      connections: { type: "array", maxItems: 12, items: {
        type: "object", additionalProperties: false,
        required: ["from", "to", "label"],
        properties: {
          from: { type: "string" }, to: { type: "string" },
          label: { type: "string", minLength: 1, maxLength: 32 },
          kind: { type: "string", enum: ["emits", "enters", "propagatesThrough", "reaches", "partOf", "flowsInto", "illuminates", "before", "causes", "contains", "calls", "returnsControlTo", "risesTo", "fallsFrom", "accelerates", "pumpsTo", "returnsTo", "carries", "appliedTo", "opposes", "contacts", "relatesTo"] },
          via: { type: "string" }
        }
      } }
    }
  }
});
