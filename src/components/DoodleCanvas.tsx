import type { SceneEntity, SceneRelation, SceneState } from "../doodlescript/schema";
import { isMotion, motionGeometry, relationLabel } from "../doodlescript/motion";
import { ownershipBadges, type OwnershipBadge } from "./ownership";
import { useLayoutEffect, useRef, useState } from "react";

interface DoodleCanvasProps {
  scene: SceneState;
  children?: React.ReactNode;
}

export function DoodleCanvas({ scene, children }: DoodleCanvasProps) {
  const ownership = ownershipBadges(scene);
  const [detail, setDetail] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const inspecting = detail && scene.entities.length > 0;
  const focusedId = scene.context?.subjectIds[0];
  const focused = scene.entities.find((entity) => entity.id === focusedId) ?? scene.entities[0];
  const focusedX = focused?.x;
  const focusedY = focused?.y;
  useLayoutEffect(() => {
    if (!inspecting) return;
    const panel = viewport.current;
    if (!panel || focusedX === undefined || focusedY === undefined) return;
    panel.scrollLeft = Math.max(0, focusedX * 12 - panel.clientWidth / 2);
    panel.scrollTop = Math.max(0, focusedY * 7.44 - panel.clientHeight / 2 + 50);
  }, [focusedX, focusedY, inspecting, scene.revision]);
  return (
    <div className="visual-scene">
      <div className="canvas-view-controls" aria-label="Drawing view">
        <button type="button" aria-pressed={!inspecting} onClick={() => {
          setDetail(false);
          if (viewport.current) { viewport.current.scrollLeft = 0; viewport.current.scrollTop = 0; }
        }}>Overview</button>
        <button type="button" aria-pressed={inspecting} disabled={!scene.entities.length} onClick={() => setDetail(true)}>Read details</button>
        <span>{inspecting ? "Scroll inside the drawing to explore. Overview shows everything." : "The whole scene. Use Read details for larger labels."}</span>
      </div>
    <section className={`canvas-shell${inspecting ? " is-detail" : ""}`} aria-label="Tegeera drawing canvas">
      <div ref={viewport} className="canvas-viewport" tabIndex={inspecting ? 0 : undefined} role={inspecting ? "region" : undefined} aria-label={inspecting ? "Scrollable drawing detail" : undefined}>
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
          return <DoodleEntity entity={geometry ? { ...entity, direction: geometry.direction } : entity} badges={ownership.get(entity.id) ?? []} moving={!!geometry} index={index} key={entity.id} />;
        })}
      </svg>
      </div>
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
      {children}
      {ownership.size > 0 && (
        <section className="ownership-details" aria-label="Who owns what">
          <header><h2>Who owns what</h2><p>The same scene, grouped by owner. No extra objects.</p></header>
          <div className="ownership-cards">
            {scene.entities.filter((owner) => ownership.get(owner.id)?.some((badge) => badge.role === "owner")).map((owner) => {
              const badge = ownership.get(owner.id)!.find((item) => item.role === "owner")!;
              const itemIds = new Set(scene.relations?.filter((relation) => relation.kind === "owns" && relation.sourceIds[0] === owner.id).flatMap((relation) => relation.targetIds));
              const items = scene.entities.filter((entity) => itemIds.has(entity.id));
              return <article className="ownership-card" key={owner.id} data-owner-id={owner.id} style={{ "--owner-color": badge.color } as React.CSSProperties}>
                <header><EntityThumbnail entity={owner} /><div><h3>{owner.label ?? owner.kind}</h3><p>Owns {items.length} {items.length === 1 ? "item" : "items"}</p></div><span className="owner-code">{badge.code}</span></header>
                <ul>{items.map((item) => <li key={item.id} data-owned-id={item.id}><EntityThumbnail entity={item} /><span>{item.label ?? item.kind}</span></li>)}</ul>
              </article>;
            })}
          </div>
        </section>
      )}
      {scene.relations?.some((relation) => relation.kind !== "owns") && (
        <div className="relationship-key" aria-label="Scene relationships">
          {scene.relations.filter((relation) => relation.kind !== "owns").map((relation) => {
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
  // Ownership uses matching badges, avoiding brackets through unrelated objects.
  if (relation.kind === "owns") return null;
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
  moving,
  badges
}: {
  entity: SceneEntity;
  index: number;
  moving: boolean;
  badges: OwnershipBadge[];
}) {
  const x = entity.x * 10;
  const y = entity.y * 6.2;
  const transform = `translate(${x} ${y}) scale(${entity.scale})`;
  const className = `doodle-object ${entity.highlighted ? "highlighted" : ""}`;
  const delay = { "--draw-delay": `${index * 90}ms` } as React.CSSProperties;

  return (
    <g className={className} data-entity-id={entity.id} transform={transform} style={delay}>
      <EntityGlyph entity={entity} moving={moving} />
      <text className="entity-label" x="0" y="72" textAnchor="middle">
        {entity.label ?? entity.kind}
      </text>
      {badges.map((badge, index) => (
        <g key={`${badge.role}-${badge.code}`} className="ownership-badge" aria-label={badge.role === "owner" ? `Owner ${badge.code}` : `Belongs to ${badge.code}`} transform={`translate(${(index - (badges.length - 1) / 2) * 62} 0)`}>
          <rect x="-29" y="75" width="58" height="12" rx="4" fill="#fbf7ed" stroke={badge.color} />
          <text x="0" y="84" textAnchor="middle" fill={badge.color} fontSize="10" fontFamily="sans-serif">{badge.role === "owner" ? `Owner ${badge.code}` : `Item ${badge.code}`}</text>
        </g>
      ))}
    </g>
  );
}

function EntityGlyph({ entity, moving = false }: { entity: SceneEntity; moving?: boolean }) {
  if (entity.kind === "car") return <Car direction={entity.direction} />;
  if (entity.kind === "tree") return <Tree />;
  if (entity.kind === "book") return <Book />;
  if (entity.kind === "building") return <Building />;
  return <Person kind={entity.kind} direction={entity.direction} moving={moving} />;
}

function EntityThumbnail({ entity }: { entity: SceneEntity }) {
  return <svg className="entity-thumbnail" viewBox="-80 -90 160 160" aria-hidden="true"><EntityGlyph entity={entity} /></svg>;
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
