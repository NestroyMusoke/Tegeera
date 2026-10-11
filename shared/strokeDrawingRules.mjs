// Format demonstrations, never noun dispatch or approved artwork. The requested
// subject must be composed by the model; examples teach geometry and pen lifts.
export const STROKE_LANGUAGE_EXAMPLES = [
  { noun: "house", strokes: [
    { part: "walls", color: "#2f3e46", interpolation: "linear", pts: [[10,25],[10,42],[40,42],[40,25]] },
    { part: "roof", color: "#2f3e46", interpolation: "linear", pts: [[7,26],[25,8],[43,26],[7,26]] },
    { part: "door", color: "#52796f", interpolation: "linear", pts: [[22,42],[22,32],[28,32],[28,42]] }
  ] },
  { noun: "fish", strokes: [
    { part: "body", color: "#2f3e46", interpolation: "smooth", pts: [[10,25],[18,17],[33,17],[41,25],[33,33],[18,33],[10,25]] },
    { part: "tail", color: "#2f3e46", interpolation: "linear", pts: [[11,25],[4,17],[4,33],[11,25]] },
    { part: "eye", color: "#2f3e46", interpolation: "smooth", pts: [[31,23],[32,22],[33,23],[32,24],[31,23]] }
  ] },
  { noun: "sun", strokes: [
    { part: "disc", color: "#2f3e46", interpolation: "smooth", pts: [[25,12],[34,16],[38,25],[34,34],[25,38],[16,34],[12,25],[16,16],[25,12]] },
    { part: "ray-top", color: "#2f3e46", interpolation: "linear", pts: [[25,4],[25,9]] },
    { part: "ray-right", color: "#2f3e46", interpolation: "linear", pts: [[41,25],[46,25]] },
    { part: "ray-bottom", color: "#2f3e46", interpolation: "linear", pts: [[25,41],[25,46]] },
    { part: "ray-left", color: "#2f3e46", interpolation: "linear", pts: [[4,25],[9,25]] }
  ] }
];

export function strokeDrawingRules(minimumStrokes = 3) {
  return `Return only JSON {"strokes":[{"part":"short-name","color":"#2f3e46","interpolation":"linear","pts":[[x,y],[x,y]]}]}.
Use ${minimumStrokes}-10 strokes, each with 2-14 integer points on a 50x50 grid: x increases right, y increases down, all coordinates within 3..47. Each stroke is one continuous pen movement; start another stroke when lifting the pen. Repeat the first point only to close a shape. Use interpolation "linear" for straight edges and sharp corners, "smooth" for rounded organic contours. Do not place unrelated parts in one stroke.
Before drawing, choose the subject's recognizable silhouette, orientation, and 2-4 identifying features. Keep attached parts connected at shared coordinates and correctly placed relative to the body. Fill most of the grid, with space between details. Use a coherent dark outline (#2f3e46); optional accent colors are #52796f #84a98c #f4a261 #e9c46a #cad2c5. Do not force every subject into a closed rectangle. No words, arrows, labels, scenery, decorative frames, SVG or extra fields. The subject must remain recognizable at 64px without a caption.
These examples teach the stroke language, not the subject to copy: ${JSON.stringify(STROKE_LANGUAGE_EXAMPLES)}.`;
}
export const STROKE_DRAWING_RULES = strokeDrawingRules();
