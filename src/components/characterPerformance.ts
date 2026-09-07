import type { SceneEntity } from "../doodlescript/schema";

export interface LimbPose {
  upper: number;
  joint: number;
}

export interface CharacterPose {
  name: "stand" | "open" | "explain" | "step-left" | "step-right";
  bodyLean: number;
  headTilt: number;
  leftArm: LimbPose;
  rightArm: LimbPose;
  leftLeg: LimbPose;
  rightLeg: LimbPose;
  smile: number;
}

const poses: Record<CharacterPose["name"], CharacterPose> = {
  stand: {
    name: "stand", bodyLean: 0, headTilt: 0,
    leftArm: { upper: 145, joint: -8 }, rightArm: { upper: 35, joint: 8 },
    leftLeg: { upper: 112, joint: -5 }, rightLeg: { upper: 68, joint: 5 }, smile: 0.45
  },
  open: {
    name: "open", bodyLean: -2, headTilt: -5,
    leftArm: { upper: 205, joint: -18 }, rightArm: { upper: -25, joint: 18 },
    leftLeg: { upper: 108, joint: 5 }, rightLeg: { upper: 72, joint: -5 }, smile: 0.8
  },
  explain: {
    name: "explain", bodyLean: 3, headTilt: 4,
    leftArm: { upper: 135, joint: 25 }, rightArm: { upper: -36, joint: 3 },
    leftLeg: { upper: 105, joint: 8 }, rightLeg: { upper: 70, joint: 9 }, smile: 0.5
  },
  "step-left": {
    name: "step-left", bodyLean: -7, headTilt: 3,
    leftArm: { upper: 210, joint: -15 }, rightArm: { upper: 20, joint: 22 },
    leftLeg: { upper: 137, joint: -32 }, rightLeg: { upper: 48, joint: 24 }, smile: 0.35
  },
  "step-right": {
    name: "step-right", bodyLean: 7, headTilt: -3,
    leftArm: { upper: 160, joint: 18 }, rightArm: { upper: -28, joint: -12 },
    leftLeg: { upper: 126, joint: 24 }, rightLeg: { upper: 38, joint: -30 }, smile: 0.35
  }
};

function stableVariant(id: string): number {
  return [...id].reduce((value, character) => value + character.charCodeAt(0), 0);
}

export function characterPoseFor(entity: SceneEntity, moving = false): CharacterPose {
  if (moving) return poses[stableVariant(entity.id) % 2 ? "step-left" : "step-right"];
  if (entity.kind === "teacher") return poses.explain;
  if (entity.kind === "student" && stableVariant(entity.id) % 3 === 0) return poses.open;
  return poses.stand;
}
