import { z } from "zod";

export const entityKindSchema = z.enum([
  "person",
  "teacher",
  "student",
  "process",
  "cpu",
  "car",
  "book",
  "desk",
  "tree",
  "building",
  "generic"
]);

export const directionSchema = z.enum(["left", "right", "up", "down"]);

export const limbPerformanceSchema = z.object({
  upper: z.number().min(-240).max(240),
  joint: z.number().min(-160).max(160)
});

export const expressionPerformanceSchema = z.object({
  smile: z.number().min(-1).max(1).optional(),
  mouthOpen: z.number().min(0).max(1).optional(),
  browLift: z.number().min(-1).max(1).optional(),
  gazeX: z.number().min(-1).max(1).optional(),
  gazeY: z.number().min(-1).max(1).optional()
});

export const characterPerformanceSchema = z.object({
  bodyLean: z.number().min(-30).max(30).optional(),
  headTilt: z.number().min(-35).max(35).optional(),
  leftArm: limbPerformanceSchema.optional(),
  rightArm: limbPerformanceSchema.optional(),
  leftLeg: limbPerformanceSchema.optional(),
  rightLeg: limbPerformanceSchema.optional(),
  expression: expressionPerformanceSchema.optional(),
  loop: z.enum(["none", "breathe", "walk", "run", "wave", "talk", "celebrate"]).optional(),
  intensity: z.number().min(0).max(1).optional()
});

export const sceneEntitySchema = z.object({
  id: z.string().min(1),
  kind: entityKindSchema,
  label: z.string().max(60).optional(),
  x: z.number().min(6).max(94),
  y: z.number().min(12).max(88),
  scale: z.number().min(0.5).max(2).default(1),
  direction: directionSchema.default("right"),
  highlighted: z.boolean().default(false),
  performance: characterPerformanceSchema.optional()
});

export const relationSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["shares", "owns", "toward", "away", "queuedFor", "actsOn", "handover", "before", "causes", "visualAction", "partOf", "flowsInto", "illuminates"]),
  sourceIds: z.array(z.string().min(1)).min(1).max(12),
  targetIds: z.array(z.string().min(1)).min(1).max(12),
  objectIds: z.array(z.string().min(1)).min(1).max(12).optional(),
  predicate: z.string().min(1).max(40).optional(),
  preposition: z.string().min(1).max(20).optional()
});

export const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("unrelate"), relationId: z.string().min(1) }),
  z.object({ action: z.literal("relate"), relation: relationSchema }),
  z.object({
    action: z.literal("create"),
    entity: sceneEntitySchema
  }),
  z.object({
    action: z.literal("move"),
    targetId: z.string().min(1),
    x: z.number().min(6).max(94).optional(),
    y: z.number().min(12).max(88).optional(),
    direction: directionSchema.optional()
  }),
  z.object({
    action: z.literal("update"),
    targetId: z.string().min(1),
    label: z.string().max(60).optional(),
    highlighted: z.boolean().optional(),
    direction: directionSchema.optional(),
    performance: characterPerformanceSchema.nullable().optional()
  }),
  z.object({
    action: z.literal("remove"),
    targetId: z.string().min(1)
  }),
  z.object({
    action: z.literal("clear")
  })
]);

export const contextSchema = z.object({
  subjectIds: z.array(z.string().min(1)).max(12),
  objectIds: z.array(z.string().min(1)).max(12)
});

export const doodleScriptSchema = z.object({
  schemaVersion: z.enum(["1.0.0", "1.1.0", "1.2.0", "1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0", "1.8.0", "1.9.0", "2.0.0"]),
  context: contextSchema.optional(),
  sceneId: z.string().min(1),
  revision: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  sourceText: z.string().max(500),
  commands: z.array(commandSchema).min(1).max(30)
});

export type EntityKind = z.infer<typeof entityKindSchema>;
export type SceneEntity = z.infer<typeof sceneEntitySchema>;
export type DoodleCommand = z.infer<typeof commandSchema>;
export type DoodleScript = z.infer<typeof doodleScriptSchema>;
export type SceneRelation = z.infer<typeof relationSchema>;
export type SceneContext = z.infer<typeof contextSchema>;
export type CharacterPerformance = z.infer<typeof characterPerformanceSchema>;

export interface SceneState {
  sceneId: string;
  revision: number;
  entities: SceneEntity[];
  relations?: SceneRelation[];
  context?: SceneContext;
  message?: string;
}
