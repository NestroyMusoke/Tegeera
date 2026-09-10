import type { SceneEntity, SceneRelation, SceneState } from "../doodlescript/schema";
import { isMotion, motionGeometry, relationLabel } from "../doodlescript/motion";
import { ownershipBadges, type OwnershipBadge } from "./ownership";
import { useLayoutEffect, useRef, useState } from "react";
import { isQueue, queueGeometry } from "../doodlescript/queue";
import { EntityGlyph } from "./entityRenderers";
import { applyTargetedPerformance, isAttachedPerformance, isTargetedPerformance } from "../doodlescript/targetedPerformance";
import { actionForPredicate } from "../doodlescript/actionRegistry";
import { applyHandoverPerformance, handoverParticipants, isHandover } from "../doodlescript/handover";
import { eventFlowGeometry, isEventRelation } from "../doodlescript/eventRelations";
import { isVisualAction, visualPhraseGeometry } from "../doodlescript/visualPhrase";
import { RELATION_REGISTRY_VERSION, relationForKind } from "../doodlescript/relationRegistry";
import { LAYOUT_FAMILY_REGISTRY_VERSION, layoutFamilyFor } from "../doodlescript/layoutFamilyRegistry";
import { isPartWholeFlowRelation, partWholeFlowGeometry } from "../doodlescript/partWholeFlow";
import { resolveVisualSymbol } from "../doodlescript/symbolOntology";
import { forceDiagramGeometry, isForceRelation } from "../doodlescript/forceDiagram";
import { labelledContainerGeometry } from "../doodlescript/labelledContainer";

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
        {scene.relations?.map((relation) => {
          const definition = relationForKind(relation.kind);
          const layout = layoutFamilyFor(definition.layout);
          return <g key={relation.id}
            data-relation-family={definition.family}
            data-relation-kind={definition.kind}
            data-relation-predicate={relation.predicate}
            data-relation-layout={definition.layout}
            data-relation-registry-version={RELATION_REGISTRY_VERSION}
            data-layout-topology={layout.topology}
            data-layout-registry-version={LAYOUT_FAMILY_REGISTRY_VERSION}>
            <Relationship relation={relation} relations={scene.relations ?? []} entities={scene.entities} />
          </g>;
        })}
        {scene.entities.map((entity, index) => {
          const motion = scene.relations?.find((relation) => isMotion(relation) && relation.sourceIds[0] === entity.id);
          const target = scene.entities.find((item) => item.id === motion?.targetIds[0]);
          const geometry = motion && target ? motionGeometry(entity, target, motion.kind as "toward" | "away") : null;
          const targeting = scene.relations?.find((relation) => isTargetedPerformance(relation) && relation.sourceIds[0] === entity.id);
          const performanceTarget = scene.entities.find((item) => item.id === targeting?.targetIds[0]);
          const attachment = scene.relations?.find((relation) => isAttachedPerformance(relation) && relation.targetIds[0] === entity.id);
          const carrier = scene.entities.find((item) => item.id === attachment?.sourceIds[0]);
          const attachmentPerformance = carrier?.performance ?? actionForPredicate(attachment?.predicate)?.performance;
          const handover = scene.relations?.find((relation) => isHandover(relation)
            && [...relation.sourceIds, ...relation.targetIds].includes(entity.id));
          const handoverObject = scene.entities.find((item) => item.id === handover?.objectIds?.[0]);
          const directed = geometry ? { ...entity, direction: geometry.direction } : entity;
          const targeted = targeting && performanceTarget ? applyTargetedPerformance(directed, performanceTarget, targeting) : directed;
          const performed = handover && handoverObject ? applyHandoverPerformance(targeted, handoverObject) : targeted;
          return <DoodleEntity
            entity={performed}
            forceBody={scene.relations?.some((relation) => relation.kind === "appliedTo" && relation.targetIds.includes(entity.id))}
            badges={ownership.get(entity.id) ?? []}
            moving={!!geometry}
            attachment={attachment && attachmentPerformance ? {
              actorId: attachment.sourceIds[0],
              loop: attachmentPerformance.loop ?? "none",
              intensity: attachmentPerformance.intensity ?? 0
            } : undefined}
            handoverObject={scene.relations?.some((relation) => relation.kind === "handover" && relation.objectIds?.includes(entity.id))}
            index={index}
            key={entity.id}
          />;
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
              <div key={relation.id} className={`relationship-${relation.kind}`}
                data-relation-family={relationForKind(relation.kind).family}
                data-relation-registry-version={RELATION_REGISTRY_VERSION}>
                <span>{labels(relation.sourceIds)}</span>
                <strong>{relation.kind === "handover" ? `gives ${labels(relation.objectIds ?? [])} to →` : `${relationLabel(relation)} →`}</strong>
                <span>{labels(relation.targetIds)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Relationship({ relation, relations, entities }: { relation: SceneRelation; relations: SceneRelation[]; entities: SceneEntity[] }) {
  const members = [...relation.sourceIds, ...relation.targetIds, ...(relation.objectIds ?? [])]
    .map((id) => entities.find((entity) => entity.id === id))
    .filter((entity): entity is SceneEntity => !!entity);
  if (!members.length) return null;
  // Ownership uses matching badges, avoiding brackets through unrelated objects.
  if (relation.kind === "owns") return null;
  if (relation.kind === "contains") {
    const geometry = labelledContainerGeometry(relation, entities);
    if (!geometry) return null;
    const left = geometry.centerX - geometry.width / 2;
    const top = geometry.centerY - geometry.height / 2;
    return <g className="labelled-container-annotation" aria-label={`${geometry.container.label} contains ${geometry.content.label}`}>
      <path data-visual-cue="container-outline" className="container-outline"
        d={`M${left + 18} ${top} H${left + geometry.width - 18} Q${left + geometry.width} ${top} ${left + geometry.width} ${top + 18} V${top + geometry.height - 18} Q${left + geometry.width} ${top + geometry.height} ${left + geometry.width - 18} ${top + geometry.height} H${left + 18} Q${left} ${top + geometry.height} ${left} ${top + geometry.height - 18} V${top + 18} Q${left} ${top} ${left + 18} ${top}`} fill="none" stroke="#302e29" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path className="doodle-detail" d={`M${left + 12} ${top + 48} Q${geometry.centerX} ${top + 42} ${left + geometry.width - 12} ${top + 48}`} />
      <g data-visual-cue="variable-label">
        <path d={`M${geometry.centerX - 90} ${top - 15} Q${geometry.centerX} ${top - 25} ${geometry.centerX + 90} ${top - 15} V${top + 31} H${geometry.centerX - 90} Z`} fill="#fbf7ed" stroke="#32735d" strokeWidth="3" />
        <text x={geometry.centerX} y={top + 15} textAnchor="middle" fill="#245c4b" fontSize="25" fontWeight="700">{geometry.container.label}</text>
      </g>
      <g data-visual-cue="value-inside-container">
        <path d={`M${geometry.centerX - 98} ${geometry.centerY - 2} Q${geometry.centerX} ${geometry.centerY - 16} ${geometry.centerX + 98} ${geometry.centerY - 2} V${geometry.centerY + 60} Q${geometry.centerX} ${geometry.centerY + 72} ${geometry.centerX - 98} ${geometry.centerY + 60} Z`} fill="#f4dfaa" stroke="#9b6a22" strokeWidth="3" />
        <text x={geometry.centerX} y={geometry.centerY + 41} textAnchor="middle" fill="#694512" fontSize="29" fontWeight="700">{geometry.content.label}</text>
      </g>
    </g>;
  }
  if (isForceRelation(relation)) {
    if (relation.kind !== "appliedTo") return null;
    const geometry = forceDiagramGeometry(relations.filter(isForceRelation), entities);
    if (!geometry) return null;
    const arrowHead = (endX: number, direction: 1 | -1, y: number) =>
      `M${endX - direction * 12} ${y - 9} L${endX} ${y} L${endX - direction * 12} ${y + 9}`;
    const appliedY = geometry.bodyY - 4;
    const frictionY = geometry.bodyY + 52;
    return <g className="force-diagram-annotation" aria-label={`${geometry.appliedForce.label} acts on ${geometry.body.label}; ${geometry.opposingForce.label} opposes it on ${geometry.surface.label}`}>
      <g data-visual-cue="surface-line">
        <path d={`M${geometry.bodyX - 205} ${geometry.contactY} Q${geometry.bodyX} ${geometry.contactY - 6} ${geometry.bodyX + 205} ${geometry.contactY}`} fill="none" stroke="#514e47" strokeWidth="4" strokeLinecap="round" />
        <path d={`M${geometry.bodyX - 190} ${geometry.contactY + 13} l18 -9 m10 9 l18 -9 m10 9 l18 -9 m10 9 l18 -9 m10 9 l18 -9 m10 9 l18 -9 m10 9 l18 -9`} fill="none" stroke="#8b8173" strokeWidth="2" />
        <text x={geometry.bodyX} y={geometry.contactY + 31} textAnchor="middle" fill="#514e47" fontSize="15">{geometry.surface.label}</text>
      </g>
      <g data-visual-cue="forward-force-arrow" className="force-applied">
        <path d={`M${geometry.appliedStartX} ${appliedY} H${geometry.appliedEndX}`} fill="none" stroke="#2e6f91" strokeWidth="5" strokeLinecap="round" />
        <path d={arrowHead(geometry.appliedEndX, geometry.direction, appliedY)} fill="none" stroke="#2e6f91" strokeWidth="5" strokeLinecap="round" />
        <text x={(geometry.appliedStartX + geometry.appliedEndX) / 2} y={appliedY - 15} textAnchor="middle" fill="#245a76" fontSize="17" fontWeight="700">{geometry.appliedForce.label}</text>
      </g>
      <g data-visual-cue="opposing-friction-arrow friction-arrow-smaller" className="force-opposing">
        <path d={`M${geometry.opposingStartX} ${frictionY} H${geometry.opposingEndX}`} fill="none" stroke="#b35b37" strokeWidth="4" strokeLinecap="round" />
        <path d={arrowHead(geometry.opposingEndX, -geometry.direction as 1 | -1, frictionY)} fill="none" stroke="#b35b37" strokeWidth="4" strokeLinecap="round" />
        <text x={(geometry.opposingStartX + geometry.opposingEndX) / 2} y={frictionY + 24} textAnchor="middle" fill="#944526" fontSize="16" fontWeight="700">{geometry.opposingForce.label}</text>
      </g>
      <path data-visual-cue="slowing-motion" d={`M${geometry.bodyX + 55} ${geometry.bodyY - 69} h56 m-47 -12 h38`} fill="none" stroke="#777168" strokeWidth="2" strokeDasharray="7 6" />
    </g>;
  }
  if (isTargetedPerformance(relation)) return null;
  if (relation.kind === "handover") {
    const participants = handoverParticipants(relation, entities);
    if (!participants) return null;
    const startX = participants.giver.x * 10;
    const endX = participants.recipient.x * 10;
    const direction = Math.sign(endX - startX) || 1;
    const centerX = participants.object.x * 10;
    const y = Math.min(participants.giver.y, participants.recipient.y) * 6.2 - 92;
    return (
      <g className="handover-annotation" aria-label={`${participants.giver.label} gives ${participants.object.label} to ${participants.recipient.label}`}>
        <path className="handover-flow" d={`M${startX} ${y} Q${centerX} ${y - 34} ${endX} ${y}`} fill="none" stroke="#b95f37" strokeWidth="3" strokeLinecap="round" />
        <path d={`M${endX - direction * 11} ${y - 8} L${endX} ${y} L${endX - direction * 11} ${y + 8}`} fill="none" stroke="#b95f37" strokeWidth="3" strokeLinecap="round" />
        <text x={centerX} y={y - 25} textAnchor="middle" fill="#8f4026" fontSize="15">handover</text>
      </g>
    );
  }
  if (isEventRelation(relation)) {
    const geometry = eventFlowGeometry(relation, entities);
    if (!geometry) return null;
    const color = relation.kind === "causes" ? "#a44a2a" : "#315f79";
    const label = relation.kind === "causes" ? "causes" : "before";
    return (
      <g className={`event-annotation event-${relation.kind}`} aria-label={`${geometry.source.label} ${label} ${geometry.target.label}`}>
        <path className="event-flow" data-route={geometry.route} d={geometry.path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M${geometry.endX - 11} ${geometry.endY - 8} L${geometry.endX} ${geometry.endY} L${geometry.endX - 11} ${geometry.endY + 8}`} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        {relation.kind === "causes" && <path d={`M${geometry.startX - 7} ${geometry.startY - 10} V${geometry.startY + 10} M${geometry.startX - 13} ${geometry.startY - 6} L${geometry.startX - 2} ${geometry.startY + 6}`} stroke={color} strokeWidth="2" />}
        <text x={geometry.labelX} y={geometry.labelY} textAnchor="middle" fill={color} fontSize="15">{label}</text>
      </g>
    );
  }
  if (isVisualAction(relation)) {
    const geometry = visualPhraseGeometry(relation, entities);
    if (!geometry) return null;
    const color = geometry.definition.cue === "transform" ? "#8d4c83"
      : geometry.definition.cue === "intake" ? "#28745a" : "#b45b32";
    return (
      <g className={`visual-action-annotation visual-action-cue-${geometry.definition.cue}`}
        data-action={geometry.definition.predicate}
        aria-label={`${geometry.subject.label} ${geometry.definition.label} ${geometry.object.label}`}>
        <path className="visual-action-flow" data-route={geometry.route} data-cue={geometry.definition.cue}
          d={geometry.path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d={geometry.arrow} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle className="visual-action-particle" cx={(geometry.startX * 2 + geometry.endX) / 3} cy={(geometry.startY * 2 + geometry.endY) / 3} r="4" fill={color} />
        <circle className="visual-action-particle particle-late" cx={(geometry.startX + geometry.endX * 2) / 3} cy={(geometry.startY + geometry.endY * 2) / 3} r="3" fill={color} />
        <text x={geometry.labelX} y={geometry.labelY} textAnchor="middle" fill={color} fontSize="15">{geometry.definition.label}</text>
      </g>
    );
  }
  if (isPartWholeFlowRelation(relation)) {
    const geometry = partWholeFlowGeometry(relation, entities);
    if (!geometry) return null;
    const isPart = relation.kind === "partOf";
    const color = isPart ? "#66715a" : relation.kind === "illuminates" ? "#c58a20" : "#28745a";
    const arrow = !isPart;
    const arrowX = geometry.endX - geometry.unitX * 11;
    const arrowY = geometry.endY - geometry.unitY * 11;
    const normalX = -geometry.unitY * 7;
    const normalY = geometry.unitX * 7;
    const sourceCues = resolveVisualSymbol(geometry.source.label ?? geometry.source.kind).visualCues;
    return <g className={`part-whole-annotation relation-${relation.kind}`}
      data-visual-cue={relation.kind === "flowsInto" ? "water-entry-arrow" : relation.kind === "illuminates" ? "leaf-targeted-ray" : undefined}
      aria-label={`${geometry.source.label} ${relationLabel(relation)} ${geometry.target.label}`}>
      {isPart && sourceCues.includes("visible-roots") && <path data-visual-cue="soil-boundary" className="doodle-detail" d={`M${geometry.source.x * 10 - 65} ${geometry.source.y * 6.2 + 48} Q${geometry.source.x * 10} ${geometry.source.y * 6.2 + 40} ${geometry.source.x * 10 + 65} ${geometry.source.y * 6.2 + 48}`} />}
      <path className={relation.kind === "illuminates" ? "accent-stroke" : "visual-action-flow"}
        d={`M${geometry.startX} ${geometry.startY} L${geometry.endX} ${geometry.endY}`}
        fill="none" stroke={color} strokeWidth={isPart ? 2 : 3} strokeDasharray={isPart ? "7 6" : undefined} />
      {arrow && <path d={`M${arrowX + normalX} ${arrowY + normalY} L${geometry.endX} ${geometry.endY} L${arrowX - normalX} ${arrowY - normalY}`}
        fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />}
      <text x={(geometry.startX + geometry.endX) / 2} y={(geometry.startY + geometry.endY) / 2 - 10}
        textAnchor="middle" fill={color} fontSize="14">{relationLabel(relation)}</text>
    </g>;
  }
  if (isQueue(relation)) {
    const geometry = queueGeometry(relation, entities);
    if (!geometry) return null;
    const { members, target, y, startX, endX } = geometry;
    const targetLabel = target.label ?? target.kind;
    return (
      <g className="queue-annotation" fill="none" stroke="#355f78" strokeWidth="3" aria-label={`Ordered queue: ${members.map((member) => member.label).join(", ")}, then ${targetLabel}`}>
        <path d={`M${startX} ${y} H${endX}`} />
        <path d={`M${endX - 11} ${y - 8} L${endX} ${y} L${endX - 11} ${y + 8}`} />
        {members.map((member, index) => <g key={member.id}>
          <path d={`M${member.x * 10} ${y - 7} V${y + 7}`} />
          <text x={member.x * 10} y={y - 13} textAnchor="middle" stroke="none" fill="#355f78" fontSize="14">{index + 1}</text>
        </g>)}
        <text x={(startX + endX) / 2} y={y + 24} textAnchor="middle" stroke="none" fill="#355f78" fontSize="14">queue → {targetLabel}</text>
      </g>
    );
  }
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
  const y = Math.max(...members.map((entity) => entity.y * 6.2 + 110 * entity.scale)) + 18;
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
  badges,
  attachment,
  handoverObject,
  forceBody
}: {
  entity: SceneEntity;
  index: number;
  moving: boolean;
  badges: OwnershipBadge[];
  attachment?: { actorId: string; loop: string; intensity: number };
  handoverObject?: boolean;
  forceBody?: boolean;
}) {
  const x = entity.x * 10;
  const y = entity.y * 6.2;
  const transform = `translate(${x} ${y}) scale(${entity.scale})`;
  const className = `doodle-object ${entity.highlighted ? "highlighted" : ""}${handoverObject ? " handover-object" : ""}`;
  const delay = { "--draw-delay": `${index * 90}ms` } as React.CSSProperties;
  const attachmentStyle = attachment ? {
    "--performance-travel": `${-(2 + attachment.intensity * 4)}px`,
    "--performance-breathe": `${-(1 + attachment.intensity * 2)}px`
  } as React.CSSProperties : undefined;

  if (["force", "surface", "container", "contained"].includes(entity.visualRole ?? "")) {
    return <g data-entity-id={entity.id} data-visual-role={entity.visualRole} aria-label={entity.label ?? entity.kind} />;
  }

  return (
    <g className={className} data-entity-id={entity.id} data-attached-to={attachment?.actorId} data-handover-object={handoverObject || undefined} transform={transform} style={delay}>
      <g className={attachment ? `attached-object motion-${attachment.loop}` : undefined} style={attachmentStyle}>
        <EntityGlyph entity={entity} moving={moving} />
      </g>
      <text className="entity-label" x="0" y={forceBody ? -68 : 84} textAnchor="middle">
        {entity.label ?? entity.kind}
      </text>
      {badges.map((badge, index) => (
        <g key={`${badge.role}-${badge.code}`} className="ownership-badge" aria-label={badge.role === "owner" ? `Owner ${badge.code}` : `Belongs to ${badge.code}`} transform={`translate(${(index - (badges.length - 1) / 2) * 62} 0)`}>
          <rect x="-29" y="91" width="58" height="12" rx="4" fill="#fbf7ed" stroke={badge.color} />
          <text x="0" y="100" textAnchor="middle" fill={badge.color} fontSize="10" fontFamily="sans-serif">{badge.role === "owner" ? `Owner ${badge.code}` : `Item ${badge.code}`}</text>
        </g>
      ))}
    </g>
  );
}

function EntityThumbnail({ entity }: { entity: SceneEntity }) {
  return <svg className="entity-thumbnail" viewBox="-80 -90 160 160" aria-hidden="true"><EntityGlyph entity={entity} /></svg>;
}
