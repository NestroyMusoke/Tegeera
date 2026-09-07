import type { CharacterPerformance } from "./schema";

export interface ActionDefinition {
  predicate: string;
  aliases: readonly string[];
  performance: CharacterPerformance;
}

// Actions describe reusable performances, not complete scenes or sentences.
// New aliases and performances are registered here without changing the parser.
export const actionRegistry: readonly ActionDefinition[] = [
  {
    predicate: "wave",
    aliases: ["wave", "waves", "waving"],
    performance: {
      rightArm: { upper: -72, joint: 18 },
      expression: { smile: 0.8, browLift: 0.25, gazeX: 0.45 },
      loop: "wave", intensity: 0.8
    }
  },
  {
    predicate: "celebrate",
    aliases: ["celebrate", "celebrates", "celebrating", "cheer", "cheers", "cheering"],
    performance: {
      leftArm: { upper: 220, joint: 0 }, rightArm: { upper: -40, joint: 0 },
      expression: { smile: 1, mouthOpen: 0.65, browLift: 0.6 },
      loop: "celebrate", intensity: 1
    }
  },
  {
    predicate: "explain",
    aliases: ["explain", "explains", "explaining", "present", "presents", "presenting"],
    performance: {
      bodyLean: 5, headTilt: -4,
      leftArm: { upper: 140, joint: 20 }, rightArm: { upper: -34, joint: 4 },
      expression: { smile: 0.45, mouthOpen: 0.4, gazeX: 0.65 },
      loop: "talk", intensity: 0.55
    }
  },
  {
    predicate: "talk",
    aliases: ["talk", "talks", "talking", "speak", "speaks", "speaking"],
    performance: {
      expression: { smile: 0.3, mouthOpen: 0.45, browLift: 0.1 },
      loop: "talk", intensity: 0.45
    }
  },
  {
    predicate: "walk",
    aliases: ["walk", "walks", "walking"],
    performance: {
      bodyLean: 6, leftArm: { upper: 205, joint: -12 }, rightArm: { upper: 18, joint: 18 },
      leftLeg: { upper: 135, joint: -28 }, rightLeg: { upper: 48, joint: 22 },
      expression: { gazeX: 0.55 }, loop: "walk", intensity: 0.65
    }
  },
  {
    predicate: "run",
    aliases: ["run", "runs", "running"],
    performance: {
      bodyLean: 16, leftArm: { upper: 215, joint: -35 }, rightArm: { upper: 5, joint: 35 },
      leftLeg: { upper: 145, joint: -45 }, rightLeg: { upper: 30, joint: 35 },
      expression: { mouthOpen: 0.3, gazeX: 0.8 }, loop: "run", intensity: 1
    }
  },
  {
    predicate: "think",
    aliases: ["think", "thinks", "thinking"],
    performance: {
      headTilt: 9, rightArm: { upper: -76, joint: 62 },
      expression: { smile: 0, browLift: 0.25, gazeX: 0.3, gazeY: -0.7 },
      loop: "breathe", intensity: 0.25
    }
  }
];

const aliasToAction = new Map(actionRegistry.flatMap((action) => action.aliases.map((alias) => [alias, action] as const)));

export function actionForAlias(alias: string): ActionDefinition | undefined {
  return aliasToAction.get(alias);
}

export function actionAliases(): string[] {
  return [...aliasToAction.keys()].sort((a, b) => b.length - a.length);
}
