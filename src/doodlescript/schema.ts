import { z } from "zod";

export const entityKindSchema = z.enum([
  "person",
  "teacher",
  "student",
  "car",
  "book",
  "desk",
  "tree",
  "building",
  "generic"
]);

export const directionSchema = z.enum(["left", "right", "up", "down"]);

export const sceneEntitySchema = z.object({
  id: z.string().min(1),
  kind: entityKindSchema,
  label: z.string().max(60).optional(),
  x: z.number().min(6).max(94),
  y: z.number().min(12).max(88),
  scale: z.number().min(0.5).max(2).default(1),
  direction: directionSchema.default("right"),
  highlighted: z.boolean().default(false)
});

export const commandSchema = z.discriminatedUnion("action", [
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
    direction: directionSchema.optional()
  }),
  z.object({
    action: z.literal("remove"),
    targetId: z.string().min(1)
  }),
  z.object({
    action: z.literal("clear")
  })
]);

export const doodleScriptSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
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

export interface SceneState {
  sceneId: string;
  revision: number;
  entities: SceneEntity[];
  message?: string;
}
