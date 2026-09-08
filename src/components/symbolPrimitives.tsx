import type { SymbolPrimitive, VisualCapability, VisualCategory } from "../doodlescript/symbolOntology";

type PrimitiveRenderer = () => React.ReactNode;

const primitiveRenderers: Readonly<Record<SymbolPrimitive, PrimitiveRenderer>> = {
  cloud: () => <path className="doodle-stroke" d="M-28 10 C-42 7-42-14-27-17 C-22-37 6-42 16-24 C38-27 44-1 29 10 Z" />,
  crack: () => <path className="doodle-stroke" d="M-8-38 L5-17 L-6-2 L11 14 L1 36 M5-17 L21-25 M-6-2 L-24 7" />,
  droplet: () => <path className="doodle-detail" d="M0-12 C-14 5-14 15 0 18 C14 15 14 5 0-12 Z" />,
  flame: () => <path className="doodle-stroke" d="M2 34 C-26 25-28-3-9-20 C-7-7 0-3 4-18 C7-31 1-40 13-50 C14-31 35-19 31 7 C29 24 17 35 2 34 Z M4 25 C-7 18-5 7 5-4 C4 8 17 10 13 22" />,
  gear: () => <g><circle className="doodle-stroke" cx="0" cy="0" r="28" /><circle className="doodle-detail" cx="0" cy="0" r="10" /><path className="doodle-stroke" d="M0-39 V-28 M28-28 L20-20 M39 0 H28 M28 28 L20 20 M0 39 V28 M-28 28 L-20 20 M-39 0 H-28 M-28-28 L-20-20" /></g>,
  ground: () => <g><path className="doodle-stroke" d="M-38 12 Q-23 4-8 13 T22 11 T40 13" /><path className="doodle-detail" d="M-31 21 L-18 18 M-7 25 L7 20 M18 24 L32 19" /></g>,
  leaf: () => <g><path className="doodle-stroke" d="M-3 33 C-37 17-38-23 30-38 C30 2 18 29-3 33 Z" /><path className="doodle-detail" d="M-18 20 Q2 0 25-30 M-3 7 L-19-3 M7-3 L19 5" /></g>,
  lightning: () => <path className="doodle-stroke" d="M8-45 L-20 4 L0 1 L-9 43 L27-12 L6-8 Z" />,
  rays: () => <path className="accent-stroke" d="M0-49 V-39 M35-35 L27-27 M49 0 H39 M35 35 L27 27 M0 49 V39 M-35 35 L-27 27 M-49 0 H-39 M-35-35 L-27-27" />,
  snowflake: () => <path className="doodle-stroke" d="M0-39 V39 M-34-20 L34 20 M-34 20 L34-20 M-8-31 L0-23 L8-31 M-8 31 L0 23 L8 31 M-31-11 L-23-8 L-25 1 M31 11 L23 8 L25-1 M-31 11 L-23 8 L-25-1 M31-11 L23-8 L25 1" />,
  sun: () => <circle className="doodle-stroke" cx="0" cy="0" r="25" />,
  water: () => <g><path className="doodle-stroke" d="M-37-6 Q-25-17-13-6 T11-6 T35-6 M-37 10 Q-25-1-13 10 T11 10 T35 10 M-30 26 Q-18 16-6 26 T18 26" /></g>
};

function categoryFrame(category: VisualCategory) {
  if (category === "energy") return <path className="symbol-frame" d="M0-52 L12-42 L28-45 L34-30 L49-22 L43-6 L51 8 L38 20 L36 38 L18 39 L4 51 L-10 42 L-28 46 L-35 30 L-49 22 L-43 5 L-51-9 L-38-20 L-35-38 L-17-39 Z" />;
  if (category === "nature" || category === "weather") return <path className="symbol-frame" d="M0-52 C34-55 50-28 44-3 C51 24 25 48-2 43 C-31 50-51 24-44-5 C-51-31-27-52 0-52Z" />;
  if (category === "force") return <path className="symbol-frame" d="M0-53 L47-28 L42 28 L0 49 L-42 28 L-47-28 Z" />;
  if (category === "state") return <path className="symbol-frame" d="M-42-44 L43-38 L38 42 L-45 37 Z" />;
  return <rect className="symbol-frame" x="-45" y="-48" width="90" height="91" rx="19" />;
}

function CapabilityCue({ capability }: { capability: VisualCapability }) {
  if (capability === "rises") return <path className="symbol-cue" d="M-25 43 V22 M-32 29 L-25 21 L-18 29 M24 43 V17 M17 24 L24 16 L31 24" />;
  if (capability === "falls") return <path className="symbol-cue" d="M-22 20 V42 M-29 35 L-22 43 L-15 35 M23 17 V42 M16 35 L23 43 L30 35" />;
  if (capability === "flows") return <path className="symbol-cue" d="M-39 37 Q0 48 39 33 M30 27 L40 33 L31 40" />;
  if (capability === "cycles") return <path className="symbol-cue" d="M-41 1 A42 42 0 0 1 29-31 M24-40 L32-30 L20-26 M41 2 A42 42 0 0 1-29 32 M-24 41 L-32 31 L-20 27" />;
  if (capability === "compresses") return <path className="symbol-cue" d="M-54 0 H-35 M-43-9 L-34 0 L-43 9 M54 0 H35 M43-9 L34 0 L43 9" />;
  if (capability === "spreads") return <path className="symbol-cue" d="M-12 36 H-43 M-35 28 L-44 36 L-35 44 M12 36 H43 M35 28 L44 36 L35 44" />;
  if (capability === "breaks") return <path className="symbol-cue" d="M-39-36 L-30-28 M39-36 L30-28" />;
  return null;
}

export function ComposedSymbol({
  category,
  primitives,
  capabilities,
  rotation = 0
}: {
  category: VisualCategory;
  primitives: SymbolPrimitive[];
  capabilities: VisualCapability[];
  rotation?: number;
}) {
  const overlays = primitives.filter((primitive) => primitive === "rays");
  const contents = primitives.filter((primitive) => primitive !== "rays");
  const placements = contents.length === 1
    ? [{ x: 0, y: -2, scale: 0.76 }]
    : contents.length === 2
      ? [{ x: -17, y: -4, scale: 0.53 }, { x: 20, y: -4, scale: 0.45 }]
      : [{ x: 0, y: -18, scale: 0.45 }, { x: -22, y: 18, scale: 0.36 }, { x: 22, y: 18, scale: 0.36 }];
  return <g className={`composed-symbol symbol-${category}`} transform={`rotate(${rotation})`}>
    {categoryFrame(category)}
    {overlays.map((primitive, index) => {
      const Renderer = primitiveRenderers[primitive];
      return <g key={`${primitive}-overlay-${index}`} data-primitive={primitive} data-primitive-role="overlay" transform="translate(0 -2) scale(.78)"><Renderer /></g>;
    })}
    {contents.map((primitive, index) => {
      const placement = placements[index];
      const Renderer = primitiveRenderers[primitive];
      return <g key={`${primitive}-${index}`} data-primitive={primitive} data-primitive-role="content" transform={`translate(${placement.x} ${placement.y}) scale(${placement.scale})`}><Renderer /></g>;
    })}
    {capabilities.map((capability) => <CapabilityCue capability={capability} key={capability} />)}
  </g>;
}
