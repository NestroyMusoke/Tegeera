import type { SceneEntity, SceneState } from "../doodlescript/schema";

interface DoodleCanvasProps {
  scene: SceneState;
}

export function DoodleCanvas({ scene }: DoodleCanvasProps) {
  return (
    <section className="canvas-shell" aria-label="Tegeera drawing canvas">
      <svg
        className="doodle-canvas"
        viewBox="0 0 1000 620"
        role="img"
        aria-label={
          scene.entities.length
            ? `Drawing containing ${scene.entities.length} objects`
            : "Empty drawing canvas"
        }
      >
        <defs>
          <filter id="paper-grain">
            <feTurbulence
              baseFrequency="0.7"
              numOctaves="2"
              seed="7"
              type="fractalNoise"
            />
            <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .025 0" />
          </filter>
        </defs>
        <rect width="1000" height="620" fill="#fbf7ed" />
        <rect width="1000" height="620" filter="url(#paper-grain)" opacity=".5" />
        {scene.entities.map((entity, index) => (
          <DoodleEntity entity={entity} index={index} key={entity.id} />
        ))}
      </svg>
      {!scene.entities.length && (
        <div className="empty-canvas">
          <span className="empty-mark" aria-hidden="true">
            ✦
          </span>
          <p>{scene.message}</p>
          <small>Try “Draw three students waiting in a queue.”</small>
        </div>
      )}
      <div className="canvas-status">
        <span>{scene.entities.length} objects</span>
        <span>Revision {scene.revision}</span>
      </div>
    </section>
  );
}

function DoodleEntity({
  entity,
  index
}: {
  entity: SceneEntity;
  index: number;
}) {
  const x = entity.x * 10;
  const y = entity.y * 6.2;
  const transform = `translate(${x} ${y}) scale(${entity.scale})`;
  const className = `doodle-object ${entity.highlighted ? "highlighted" : ""}`;
  const delay = { "--draw-delay": `${index * 90}ms` } as React.CSSProperties;

  return (
    <g className={className} transform={transform} style={delay}>
      {entity.kind === "car" ? <Car direction={entity.direction} /> : null}
      {entity.kind === "tree" ? <Tree /> : null}
      {entity.kind === "book" ? <Book /> : null}
      {entity.kind === "building" ? <Building /> : null}
      {["person", "student", "teacher", "generic"].includes(entity.kind) ? (
        <Person kind={entity.kind} direction={entity.direction} />
      ) : null}
      <text className="entity-label" x="0" y="72" textAnchor="middle">
        {entity.label ?? entity.kind}
      </text>
    </g>
  );
}

function Person({
  kind,
  direction
}: {
  kind: SceneEntity["kind"];
  direction: SceneEntity["direction"];
}) {
  const facing = direction === "left" ? -1 : 1;
  return (
    <g transform={`scale(${facing} 1)`}>
      <circle className="doodle-stroke" cx="0" cy="-39" r="16" />
      <path className="doodle-stroke" d="M0-23 C-2-4 1 11 0 31" />
      <path className="doodle-stroke" d="M0-11 L-24 7 M0-11 L25 1" />
      <path className="doodle-stroke" d="M0 31 L-20 57 M0 31 L21 57" />
      <path className="doodle-detail" d="M4-41 l4 1 M6-33 q6 4 10-1" />
      {kind === "student" ? (
        <path className="accent-stroke" d="M-17-52 Q0-67 17-52" />
      ) : null}
      {kind === "teacher" ? (
        <path className="accent-stroke" d="M22-8 L44-28 M38-32 L48-24" />
      ) : null}
    </g>
  );
}

function Car({ direction }: { direction: SceneEntity["direction"] }) {
  const facing = direction === "left" ? -1 : 1;
  return (
    <g transform={`scale(${facing} 1)`}>
      <path className="doodle-stroke" d="M-48 19 L-42-13 L-21-35 L25-35 L43-10 L50 19 Z" />
      <path className="doodle-detail" d="M-16-30 L-26-10 L30-10 L21-30 Z" />
      <circle className="doodle-stroke" cx="-29" cy="22" r="12" />
      <circle className="doodle-stroke" cx="31" cy="22" r="12" />
      <path className="accent-stroke" d="M52 1 L68 1 M55-9 L70-16" />
    </g>
  );
}

function Tree() {
  return (
    <g>
      <path className="doodle-stroke" d="M-9 54 Q-5 10 0-14 Q8 16 10 54 Z" />
      <path className="accent-stroke" d="M0-9 C-45-7-47-55-12-57 C0-85 38-66 35-38 C57-17 30 4 0-9Z" />
    </g>
  );
}

function Book() {
  return (
    <g>
      <path className="doodle-stroke" d="M-45-25 Q-18-35 0-17 L0 35 Q-22 17-45 25 Z" />
      <path className="doodle-stroke" d="M45-25 Q18-35 0-17 L0 35 Q22 17 45 25 Z" />
      <path className="doodle-detail" d="M-34-12 Q-18-17-7-9 M34-12 Q18-17 7-9" />
    </g>
  );
}

function Building() {
  return (
    <g>
      <path className="doodle-stroke" d="M-48 48 L-48-33 L0-62 L48-33 L48 48 Z" />
      <path className="accent-stroke" d="M-57-28 L0-69 L57-28" />
      <path className="doodle-detail" d="M-25-20 H-8 V0 H-25 Z M10-20 H27 V0 H10 Z M-10 48 V17 H11 V48" />
    </g>
  );
}
