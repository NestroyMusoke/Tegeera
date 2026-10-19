import { stickerLabel } from "./stickerLabel";

/** Fit text to a known plaque without changing the scene's routing geometry. */
export function BoundedSvgLabel({ value, x, y, width, height, maxFont, fill }: {
  value: string; x: number; y: number; width: number; height: number; maxFont: number; fill: string;
}) {
  const { lines } = stickerLabel(value);
  const longest = Math.max(...lines.map((line) => Array.from(line).length));
  const fontSize = Math.min(maxFont, height / (lines.length * 1.25), width / (longest * 0.65));
  const lineHeight = fontSize * 1.25;
  return <g data-bounded-label="true" data-label-width={width} data-label-height={height} aria-label={value}>
    <title>{value}</title>
    {lines.map((line, index) => <text key={index} x={x}
      y={y + (index - (lines.length - 1) / 2) * lineHeight + fontSize * 0.32}
      textAnchor="middle" fill={fill} fontSize={fontSize} fontWeight="700" aria-hidden="true"
      textLength={Math.min(width, Array.from(line).length * fontSize * 0.6)} lengthAdjust="spacingAndGlyphs">{line}</text>)}
  </g>;
}
