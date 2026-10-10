import type { SceneEntity, SceneRelation } from "../doodlescript/schema";
import { linearPropagationGeometry } from "../doodlescript/linearPropagation";

export function LinearPropagationDrawing({ relations, entities }: { relations: SceneRelation[]; entities: SceneEntity[] }) {
  const geometry = linearPropagationGeometry(relations, entities);
  if (!geometry) return null;
  const { source, medium, payload, destination, thermal } = geometry;
  const left = source.x * 10; const right = destination.x * 10; const y = source.y * 6.2;
  const direction = Math.sign(right - left);
  const travel = right - left - direction * 65;
  const gradientId = `propagation-gradient-${source.id}`;
  const label = (text: string | undefined, x: number, atY: number) => {
    const words = (text ?? "").split(" ");
    const lines = (text?.length ?? 0) > 17 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [text];
    return <text x={x} y={atY} textAnchor="middle" fill="#2f3e46" fontSize="25" fontWeight="700">
      {lines.map((line, index) => <tspan key={index} x={x} dy={index ? 30 : 0}>{line}</tspan>)}
    </text>;
  };
  return <g aria-label={`${payload.label} propagates along ${medium.label} from ${source.label} to ${destination.label}`}>
    <defs><linearGradient id={gradientId} x1={direction > 0 ? "0%" : "100%"} x2={direction > 0 ? "100%" : "0%"}><stop offset="0%" stopColor={thermal ? "#f4a261" : "#52796f"} /><stop offset="100%" stopColor="#cad2c5" /></linearGradient></defs>
    {label(payload.label, payload.x * 10, payload.y * 6.2 - 5)}
    <g data-visual-cue="linear-medium"><rect x={Math.min(left, right)} y={y - 26} width={Math.abs(right - left)} height="52" rx="15" fill={medium.color ?? `url(#${gradientId})`} stroke="#2f3e46" strokeWidth="5" />{label(medium.label, medium.x * 10, medium.y * 6.2 + 30)}</g>
    <g data-visual-cue={thermal && !medium.color ? "warm-to-cool-gradient" : "source-to-destination-medium"}>
      {label(thermal ? "hotter end" : "source end", left, y + 70)}
      {label(thermal ? "cooler end" : "destination end", right, y + 70)}
    </g>
    <g data-visual-cue="source-at-one-end">
      {thermal ? <path transform={`translate(${left} ${y}) scale(${direction} 1)`} d="M-15 25 C-67 4 -35 -32 -20 -65 C-21 -20 15 -10 -15 25 Z" fill={source.color ?? "#e9c46a"} stroke="#a85929" strokeWidth="4" />
        : <circle cx={left} cy={y} r="18" fill={source.color ?? "#52796f"} stroke="#2f3e46" strokeWidth="4" />}
      {label(source.label, left, y + 125)}
    </g>
    <g data-visual-cue="forward-propagation-arrow" data-flow-direction={direction > 0 ? "right" : "left"}><path d={`M${left + direction * 70} ${y - 72} H${right - direction * 32} l${-direction * 22} -16 m${direction * 22} 16 l${-direction * 22} 16`} fill="none" stroke="#52796f" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></g>
    <g data-visual-cue="moving-energy-pulses">{[0, 1, 2, 3].map((index) => <circle key={index} className="propagation-pulse" style={{ animationDelay: `${index * -0.7}s`, "--propagation-distance": `${travel}px`, "--propagation-rest": `${index * travel / 4}px` } as React.CSSProperties} cx={left + direction * 35} cy={y} r="7" fill={payload.color ?? (thermal ? "#a85929" : "#2f3e46")} />)}</g>
    <g data-visual-cue="far-end-marker"><path d={`M${right} ${y - 40} V${y + 40}`} stroke={destination.color ?? "#2f3e46"} strokeWidth="5" />{label(destination.label, right, y + 125)}</g>
  </g>;
}
