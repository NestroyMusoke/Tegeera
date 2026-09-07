import type { ComponentType, CSSProperties } from "react";
import type { EntityKind, SceneEntity } from "../doodlescript/schema";
import { characterPoseFor, type LimbPose } from "./characterPerformance";

export interface EntityRendererProps {
  entity: SceneEntity;
  moving?: boolean;
}

function Limb({ pose, length = 22, lowerLength = 21, className }: {
  pose: LimbPose;
  length?: number;
  lowerLength?: number;
  className: string;
}) {
  return <g className={className}>
    <g transform={`rotate(${pose.upper})`}>
      <path className="doodle-stroke" d={`M0 0 Q${length / 2} -1 ${length} 0`} />
      <g transform={`translate(${length} 0) rotate(${pose.joint})`}>
        <path className="doodle-stroke" d={`M0 0 Q${lowerLength / 2} 1 ${lowerLength} 0`} />
        <circle className="doodle-detail rig-hand" cx={lowerLength + 2} cy="0" r="2.5" />
      </g>
    </g>
  </g>;
}

function Character({ entity, moving = false }: EntityRendererProps) {
  const pose = characterPoseFor(entity, moving);
  const facing = entity.direction === "left" ? -1 : 1;
  const mouthDepth = 2 + pose.smile * 5;
  const animated = pose.loop !== "none";
  const style = {
    "--performance-travel": `${-(2 + pose.intensity * 4)}px`,
    "--performance-breathe": `${-(1 + pose.intensity * 2)}px`,
    "--performance-wave": `${8 + pose.intensity * 10}deg`
  } as CSSProperties;
  return <g className={`character-rig motion-${pose.loop}${animated ? " is-moving" : ""}`} data-pose={pose.name} data-motion={pose.loop} transform={`scale(${facing} 1)`} style={style}>
    <g className="rig-motion-layer">
      {(pose.loop === "walk" || pose.loop === "run") && <path className="rig-speed-lines" d="M-43 0 h13 M-48 10 h17" />}
      <g className="rig-torso" transform={`rotate(${pose.bodyLean} 0 4)`}>
        <path className="doodle-stroke" d="M0-24 Q-3-2 0 27" />
        <g transform="translate(0 -12)">
          <Limb className="rig-arm rig-arm-left" pose={pose.leftArm} />
          <Limb className="rig-arm rig-arm-right" pose={pose.rightArm} />
        </g>
        <g transform="translate(0 26)">
          <Limb className="rig-leg rig-leg-left" pose={pose.leftLeg} length={25} lowerLength={22} />
          <Limb className="rig-leg rig-leg-right" pose={pose.rightLeg} length={25} lowerLength={22} />
        </g>
      </g>
      <g className="rig-head" transform={`rotate(${pose.headTilt} 0 -42)`}>
        <circle className="doodle-stroke" cx="0" cy="-42" r="17" />
        <path className="doodle-detail rig-brows" d={`M-9 ${-50 - pose.browLift * 2} h7 M4 ${-50 - pose.browLift * 2} h7`} />
        <circle className="doodle-detail rig-eye" cx={-5 + pose.gazeX * 2} cy={-45 + pose.gazeY * 2} r="1.7" />
        <circle className="doodle-detail rig-eye" cx={7 + pose.gazeX * 2} cy={-45 + pose.gazeY * 2} r="1.7" />
        {pose.mouthOpen > 0.2
          ? <ellipse className="doodle-detail rig-mouth" cx="1" cy="-36" rx={4 + pose.mouthOpen * 2} ry={1.5 + pose.mouthOpen * 4} />
          : <path className="doodle-detail rig-mouth" d={`M-6-37 Q1 ${-37 + mouthDepth} 8-38`} />}
        {entity.kind === "student" && <path className="accent-stroke" d="M-16-54 Q0-68 17-53" />}
      </g>
      {entity.kind === "teacher" && !entity.performance && <g className="rig-prop" transform="translate(38 -35) rotate(-8)">
        <path className="accent-stroke" d="M0 0 L17-9" />
        <path className="accent-stroke" d="M14-12 L20-7" />
      </g>}
    </g>
  </g>;
}

function Process() {
  return <g><circle className="doodle-stroke" cx="0" cy="-42" r="15" /><rect className="doodle-stroke" x="-25" y="-19" width="50" height="54" rx="10" /><text x="0" y="15" textAnchor="middle" fill="#302e29" fontSize="27" fontWeight="700">P</text><path className="accent-stroke" d="M-18 45 H18 M-10 35 V45 M10 35 V45" /></g>;
}

function Cpu() {
  return <g><rect className="doodle-stroke" x="-42" y="-42" width="84" height="84" rx="9" /><rect className="doodle-detail" x="-27" y="-25" width="54" height="50" rx="5" /><text x="0" y="8" textAnchor="middle" fill="#302e29" fontSize="21" fontWeight="700">CPU</text><path className="accent-stroke" d="M-52-27 H-42 M-52-9 H-42 M-52 9 H-42 M-52 27 H-42 M42-27 H52 M42-9 H52 M42 9 H52 M42 27 H52 M-27-52 V-42 M-9-52 V-42 M9-52 V-42 M27-52 V-42 M-27 42 V52 M-9 42 V52 M9 42 V52 M27 42 V52" /></g>;
}

function Car({ entity }: EntityRendererProps) {
  const facing = entity.direction === "left" ? -1 : 1;
  return <g transform={`scale(${facing} 1)`}><path className="doodle-stroke" d="M-48 19 L-42-13 L-21-35 L25-35 L43-10 L50 19 Z" /><path className="doodle-detail" d="M-16-30 L-26-10 L30-10 L21-30 Z" /><circle className="doodle-stroke" cx="-29" cy="22" r="12" /><circle className="doodle-stroke" cx="31" cy="22" r="12" /><path className="accent-stroke" d="M52 1 L68 1 M55-9 L70-16" /></g>;
}

function Tree() {
  return <g><path className="doodle-stroke" d="M-9 54 Q-5 10 0-14 Q8 16 10 54 Z" /><path className="accent-stroke" d="M0-9 C-45-7-47-55-12-57 C0-85 38-66 35-38 C57-17 30 4 0-9Z" /></g>;
}

function Book() {
  return <g><path className="doodle-stroke" d="M-45-25 Q-18-35 0-17 L0 35 Q-22 17-45 25 Z" /><path className="doodle-stroke" d="M45-25 Q18-35 0-17 L0 35 Q22 17 45 25 Z" /><path className="doodle-detail" d="M-34-12 Q-18-17-7-9 M34-12 Q18-17 7-9" /></g>;
}

function Building() {
  return <g><path className="doodle-stroke" d="M-48 48 L-48-33 L0-62 L48-33 L48 48 Z" /><path className="accent-stroke" d="M-57-28 L0-69 L57-28" /><path className="doodle-detail" d="M-25-20 H-8 V0 H-25 Z M10-20 H27 V0 H10 Z M-10 48 V17 H11 V48" /></g>;
}

function Desk() {
  return <g><path className="doodle-stroke" d="M-48 4 Q0-3 48 4 L43 16 H-43 Z M-35 16 L-39 52 M35 16 L39 52" /><path className="doodle-detail" d="M-24 27 H24" /></g>;
}

function Generic({ entity }: EntityRendererProps) {
  const initial = (entity.label ?? entity.kind).trim().charAt(0).toUpperCase() || "?";
  return <g><path className="doodle-stroke" d="M0-55 C34-55 47-34 43-4 C47 27 24 45 0 42 C-28 47-47 25-43-4 C-47-34-31-55 0-55Z" /><text x="0" y="5" textAnchor="middle" fill="#302e29" fontSize="30" fontWeight="700">{initial}</text></g>;
}

const entityRendererRegistry: Record<EntityKind, ComponentType<EntityRendererProps>> = {
  person: Character,
  teacher: Character,
  student: Character,
  process: Process,
  cpu: Cpu,
  car: Car,
  book: Book,
  desk: Desk,
  tree: Tree,
  building: Building,
  generic: Generic
};

export function EntityGlyph({ entity, moving = false }: EntityRendererProps) {
  const Renderer = entityRendererRegistry[entity.kind] ?? Generic;
  return <g data-renderer={entity.kind}><Renderer entity={entity} moving={moving} /></g>;
}
