import type { SceneEntity, SceneRelation, SceneState } from "../doodlescript/schema";
import { isMotion, motionGeometry, relationLabel } from "../doodlescript/motion";

interface DoodleCanvasProps {
  scene: SceneState;
}

export function DoodleCanvas({ scene }: DoodleCanvasProps) {
  return (
    <div className="visual-scene">
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
        {scene.relations?.map((relation) => (
          <Relationship relation={relation} entities={scene.entities} key={relation.id} />
        ))}
        {scene.entities.map((entity, index) => {
          const motion = scene.relations?.find((relation) => isMotion(relation) && relation.sourceIds[0] === entity.id);
          const target = scene.entities.find((item) => item.id === motion?.targetIds[0]);
          const geometry = motion && target ? motionGeometry(entity, target, motion.kind as "toward" | "away") : null;
          return <DoodleEntity entity={geometry ? { ...entity, direction: geometry.direction } : entity} moving={!!geometry} index={index} key={entity.id} />;
        })}
      </svg>
      {!scene.entities.length && (
        <div className="empty-canvas">
          <span className="empty-mark" aria-hidden="true">✦</span>
          <p>{scene.message}</p>
          <small>Try “Draw three students waiting in a queue.”</small>
        </div>
      )}
      <div className="canvas-status">
        <span>{scene.entities.length} objects</span>
        <span>Revision {scene.revision}</span>
      </div>
    </section>
      {!!scene.relations?.length && (
        <div className="relationship-key" aria-label="Scene relationships">
          {scene.relations.map((relation) => {
            const labels = (ids: string[]) => ids.map((id) => {
              const entity = scene.entities.find((item) => item.id === id);
              return entity?.label ?? id;
            }).join(", ");
            return (
              <div key={relation.id} className={`relationship-${relation.kind}`}>
                <span>{labels(relation.sourceIds)}</span>
                <strong>{relationLabel(relation)} →</strong>
                <span>{labels(relation.targetIds)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Relationship({ relation, entities }: { relation: SceneRelation; entities: SceneEntity[] }) {
  const members = [...relation.sourceIds, ...relation.targetIds]
    .map((id) => entities.find((entity) => entity.id === id))
    .filter((entity): entity is SceneEntity => !!entity);
  if (!members.length) return null;
  if (isMotion(relation)) {
    const actor = entities.find((entity) => entity.id === relation.sourceIds[0]);
    const target = entities.find((entity) => entity.id === relation.targetIds[0]);
    const geometry = actor && target ? motionGeometry(actor, target, relation.kind as "toward" | "away") : null;
    if (!geometry) return null;
    const { startX, endX, y } = geometry;
    const sign = Math.sign(endX - startX);
    return (
      <g className="motion-annotation" aria-label={relationLabel(relation)}>
        <path className="motion-flow" d={`M${startX} ${y} H${endX}`} fill="none" stroke="#275a78" strokeWidth="3" />
        <path d={`M${endX - sign * 10} ${y - 7} L${endX} ${y} L${endX - sign * 10} ${y + 7}`} fill="none" stroke="#275a78" strokeWidth="3" />
        <text x={(startX + endX) / 2} y={y - 13} textAnchor="middle" fill="#275a78" fontSize="14">{relation.kind === "toward" ? "toward" : "away"}</text>
      </g>
    );
  }
  // Mixed-row relations remain in the explicit key until routed connectors exist.
  if (members.some((entity) => entity.y !== members[0].y)) return null;
  const y = Math.max(...members.map((entity) => entity.y * 6.2 + 85 * entity.scale)) + 18;
  const left = Math.min(...members.map((entity) => entity.x * 10));
  const right = Math.max(...members.map((entity) => entity.x * 10));
  const color = relation.kind === "shares" ? "#2f7159" : "#ad7021";
  return (
    <g fill="none" stroke={color} strokeWidth="2" aria-label={relation.kind === "shares" ? "Shared resources" : "Personal ownership"}>
      <path d={`M${left} ${y} H${right}`} />
      {members.map((entity) => (
        <path key={entity.id} d={`M${entity.x * 10} ${entity.y * 6.2 + 85 * entity.scale} V${y}`} />
      ))}
      <text x={(left + right) / 2} y={y + 19} textAnchor="middle" stroke="none" fill={color} fontSize="14">
        {relation.kind === "shares" ? "shared" : "personal ownership"}
      </text>
    </g>
  );
}

function DoodleEntity({
  entity,
  index,
  moving
}: {
  entity: SceneEntity;
  index: number;
  moving: boolean;
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
        <Person kind={entity.kind} direction={entity.direction} moving={moving} />
      ) : null}
      <text className="entity-label" x="0" y="72" textAnchor="middle">
        {entity.label ?? entity.kind}
      </text>
    </g>
  );
}

function Person({
  kind,
  direction,
  moving
}: {
  kind: SceneEntity["kind"];
  direction: SceneEntity["direction"];
  moving: boolean;
}) {
  const facing = direction === "left" ? -1 : 1;
  return (
    <g transform={`scale(${facing} 1)`}>
      <circle className="doodle-stroke" cx="0" cy="-39" r="16" />
      <path className="doodle-stroke" d="M0-23 C-2-4 1 11 0 31" />
      <path className="doodle-stroke" d="M0-11 L-24 7 M0-11 L25 1" />
      <path className="doodle-stroke" d={moving ? "M0 31 L-23 45 L-12 57 M0 31 L20 51 L31 51" : "M0 31 L-20 57 M0 31 L21 57"} />
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
