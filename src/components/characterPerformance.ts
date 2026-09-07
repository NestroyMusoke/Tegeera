import type { CharacterPerformance, SceneEntity } from "../doodlescript/schema";

export interface LimbPose {
  upper: number;
  joint: number;
}

export interface CharacterPose {
  name: "stand" | "open" | "explain" | "step-left" | "step-right" | "custom";
  bodyLean: number;
  headTilt: number;
  leftArm: LimbPose;
  rightArm: LimbPose;
  leftLeg: LimbPose;
  rightLeg: LimbPose;
  smile: number;
  mouthOpen: number;
  browLift: number;
  gazeX: number;
  gazeY: number;
  loop: NonNullable<CharacterPerformance["loop"]>;
  intensity: number;
}

type PresetName = Exclude<CharacterPose["name"], "custom">;
const poses: Record<PresetName, CharacterPose> = {
  stand: {
    name: "stand", bodyLean: 0, headTilt: 0,
    leftArm: { upper: 145, joint: -8 }, rightArm: { upper: 35, joint: 8 },
    leftLeg: { upper: 112, joint: -5 }, rightLeg: { upper: 68, joint: 5 }, smile: 0.45,
    mouthOpen: 0, browLift: 0, gazeX: 0, gazeY: 0, loop: "none", intensity: 0.45
  },
  open: {
    name: "open", bodyLean: -2, headTilt: -5,
    leftArm: { upper: 205, joint: -18 }, rightArm: { upper: -25, joint: 18 },
    leftLeg: { upper: 108, joint: 5 }, rightLeg: { upper: 72, joint: -5 }, smile: 0.8,
    mouthOpen: 0.1, browLift: 0.35, gazeX: 0, gazeY: 0, loop: "none", intensity: 0.65
  },
  explain: {
    name: "explain", bodyLean: 3, headTilt: 4,
    leftArm: { upper: 135, joint: 25 }, rightArm: { upper: -36, joint: 3 },
    leftLeg: { upper: 105, joint: 8 }, rightLeg: { upper: 70, joint: 9 }, smile: 0.5,
    mouthOpen: 0.15, browLift: 0.15, gazeX: 0.25, gazeY: 0, loop: "none", intensity: 0.55
  },
  "step-left": {
    name: "step-left", bodyLean: -7, headTilt: 3,
    leftArm: { upper: 210, joint: -15 }, rightArm: { upper: 20, joint: 22 },
    leftLeg: { upper: 137, joint: -32 }, rightLeg: { upper: 48, joint: 24 }, smile: 0.35,
    mouthOpen: 0, browLift: 0, gazeX: 0.3, gazeY: 0, loop: "walk", intensity: 0.6
  },
  "step-right": {
    name: "step-right", bodyLean: 7, headTilt: -3,
    leftArm: { upper: 160, joint: 18 }, rightArm: { upper: -28, joint: -12 },
    leftLeg: { upper: 126, joint: 24 }, rightLeg: { upper: 38, joint: -30 }, smile: 0.35,
    mouthOpen: 0, browLift: 0, gazeX: 0.3, gazeY: 0, loop: "walk", intensity: 0.6
  }
};

function stableVariant(id: string): number {
  return [...id].reduce((value, character) => value + character.charCodeAt(0), 0);
}

export function characterPoseFor(entity: SceneEntity, moving = false): CharacterPose {
  const base = moving ? poses[stableVariant(entity.id) % 2 ? "step-left" : "step-right"]
    : entity.kind === "teacher" ? poses.explain
    : entity.kind === "student" && stableVariant(entity.id) % 3 === 0 ? poses.open
    : poses.stand;
  const performance = entity.performance;
  if (!performance) return base;
  return {
    ...base,
    name: "custom",
    bodyLean: performance.bodyLean ?? base.bodyLean,
    headTilt: performance.headTilt ?? base.headTilt,
    leftArm: performance.leftArm ?? base.leftArm,
    rightArm: performance.rightArm ?? base.rightArm,
    leftLeg: performance.leftLeg ?? base.leftLeg,
    rightLeg: performance.rightLeg ?? base.rightLeg,
    smile: performance.expression?.smile ?? base.smile,
    mouthOpen: performance.expression?.mouthOpen ?? base.mouthOpen,
    browLift: performance.expression?.browLift ?? base.browLift,
    gazeX: performance.expression?.gazeX ?? base.gazeX,
    gazeY: performance.expression?.gazeY ?? base.gazeY,
    loop: performance.loop ?? base.loop,
    intensity: performance.intensity ?? base.intensity
  };
}
