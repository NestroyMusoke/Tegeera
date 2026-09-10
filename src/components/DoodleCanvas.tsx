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
import { geometricConstructionGeometry } from "../doodlescript/geometricConstruction";
import { isLandscapeFlowRelation, landscapeFlowGeometry } from "../doodlescript/landscapeFlow";
import { circulationLoopGeometry, isCirculationRelation } from "../doodlescript/circulationLoop";
import { changingSpeedGeometry, isChangingSpeedRelation } from "../doodlescript/changingSpeedMotion";
import { callReturnGeometry, isCallReturnRelation } from "../doodlescript/callReturnFlow";

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
                <strong>{relation.kind === "handover" ? `gives ${labels(relation.objectIds ?? [])} to →` : `${relationLabel(relation, labels(relation.sourceIds))} →`}</strong>
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
  if (isCallReturnRelation(relation)) {
    if (relation.kind !== "calls") return null;
    const geometry = callReturnGeometry(relations.filter(isCallReturnRelation), entities);
    if (!geometry) return null;
    const functionTop = geometry.functionY - 58;
    const callEndY = functionTop - 8;
    return <g className="call-return-flow-annotation" aria-label={`${geometry.caller.label} calls ${geometry.fn.label}; control returns to the same ${geometry.callSite.label}`}>
      <g data-visual-cue="main-flow-line">
        <path d={`M90 ${geometry.mainY} H900`} fill="none" stroke="#3b4d59" strokeWidth="6" strokeLinecap="round" />
        <path d={`M882 ${geometry.mainY - 11} L900 ${geometry.mainY} L882 ${geometry.mainY + 11}`} fill="none" stroke="#3b4d59" strokeWidth="5" strokeLinecap="round" />
        <rect x={geometry.callerX - 92} y={geometry.mainY - 48} width="184" height="72" rx="18" fill="#d7e7e4" stroke="#315f5a" strokeWidth="4" />
        <text x={geometry.callerX} y={geometry.mainY - 4} textAnchor="middle" fill="#294f4b" fontSize="22" fontWeight="800">{geometry.caller.label}</text>
      </g>
      <g data-visual-cue="same-return-point">
        <circle cx={geometry.callX} cy={geometry.mainY} r="15" fill="#f1c768" stroke="#78571f" strokeWidth="5" />
        <path d={`M${geometry.callX - 7} ${geometry.mainY} h14 M${geometry.callX} ${geometry.mainY - 7} v14`} stroke="#694914" strokeWidth="3" strokeLinecap="round" />
        <text x={geometry.callX + 28} y={geometry.mainY - 22} fill="#6b4d18" fontSize="18" fontWeight="700">{geometry.callSite.label}</text>
      </g>
      <g data-visual-cue="function-block">
        <rect x={geometry.callX - 130} y={functionTop} width="260" height="116" rx="22" fill="#e8dcf0" stroke="#644c78" strokeWidth="5" />
        <path d={`M${geometry.callX - 104} ${functionTop + 31} H${geometry.callX + 104}`} stroke="#8e73a0" strokeWidth="3" strokeLinecap="round" />
        <text x={geometry.callX} y={functionTop + 72} textAnchor="middle" fill="#523d65" fontSize="26" fontWeight="800">{geometry.fn.label}</text>
        <text x={geometry.callX} y={functionTop + 98} textAnchor="middle" fill="#755d86" fontSize="16">runs here</text>
      </g>
      <g data-visual-cue="call-arrow">
        <path className="control-flow control-call" d={`M${geometry.callX} ${geometry.mainY + 16} V${callEndY}`} fill="none" stroke="#2d718b" strokeWidth="6" strokeLinecap="round" />
        <path d={`M${geometry.callX - 11} ${callEndY - 16} L${geometry.callX} ${callEndY} L${geometry.callX + 11} ${callEndY - 16}`} fill="none" stroke="#2d718b" strokeWidth="5" strokeLinecap="round" />
        <text x={geometry.callX - 23} y={(geometry.mainY + callEndY) / 2} textAnchor="end" fill="#255d73" fontSize="19" fontWeight="700">call</text>
      </g>
      <g data-visual-cue="return-arrow">
        <path className="control-flow control-return" d={`M${geometry.callX + 130} ${geometry.functionY} C${geometry.callX + 245} ${geometry.functionY - 25} ${geometry.callX + 230} ${geometry.mainY + 30} ${geometry.callX + 15} ${geometry.mainY}`} fill="none" stroke="#b05235" strokeWidth="6" strokeLinecap="round" />
        <path d={`M${geometry.callX + 31} ${geometry.mainY - 10} L${geometry.callX + 15} ${geometry.mainY} L${geometry.callX + 33} ${geometry.mainY + 9}`} fill="none" stroke="#b05235" strokeWidth="5" strokeLinecap="round" />
        <text x={geometry.callX + 210} y={(geometry.mainY + geometry.functionY) / 2 + 15} textAnchor="middle" fill="#913f29" fontSize="19" fontWeight="700">return</text>
      </g>
    </g>;
  }
  if (isChangingSpeedRelation(relation)) {
    if (relation.kind !== "risesTo") return null;
    const geometry = changingSpeedGeometry(relations.filter(isChangingSpeedRelation), entities);
    if (!geometry) return null;
    const upwardArrows = [
      { x: geometry.centerX - 91, y: geometry.bottomY - 52, length: 72 },
      { x: geometry.centerX - 82, y: geometry.bottomY - 142, length: 49 },
      { x: geometry.centerX - 55, y: geometry.apexY + 82, length: 28 }
    ];
    const downwardArrows = [
      { x: geometry.centerX + 55, y: geometry.apexY + 58, length: 28 },
      { x: geometry.centerX + 82, y: geometry.bottomY - 190, length: 49 },
      { x: geometry.centerX + 91, y: geometry.bottomY - 105, length: 72 }
    ];
    const verticalArrow = (x: number, y: number, length: number, direction: 1 | -1, color: string) => {
      const endY = y + direction * length;
      return <><path d={`M${x} ${y} V${endY}`} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
        <path d={`M${x - 8} ${endY - direction * 11} L${x} ${endY} L${x + 8} ${endY - direction * 11}`} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></>;
    };
    return <g className="changing-speed-motion-annotation" aria-label={`${geometry.object.label} rises to ${geometry.apex.label} while slowing, pauses, then falls while speeding up under ${geometry.force.label}`}>
      <g data-visual-cue="vertical-flight-path">
        <path className="trajectory-flow" d={geometry.path} fill="none" stroke="#315f79" strokeWidth="5" strokeLinecap="round" strokeDasharray="12 10" />
        <circle cx={geometry.centerX - 90} cy={geometry.bottomY} r="25" fill="#e9a94b" stroke="#6d491d" strokeWidth="4" />
        <path d={`M${geometry.centerX - 103} ${geometry.bottomY - 6} q13 -11 26 0 M${geometry.centerX - 99} ${geometry.bottomY + 8} q9 7 18 0`} fill="none" stroke="#8b5c20" strokeWidth="2" strokeLinecap="round" />
        <text x={geometry.centerX - 90} y={geometry.bottomY + 45} textAnchor="middle" fill="#61451f" fontSize="21" fontWeight="800">{geometry.object.label}</text>
      </g>
      <g data-visual-cue="shrinking-upward-velocity">
        {upwardArrows.map(({ x, y, length }) => <g key={`${x}-${y}`}>{verticalArrow(x, y, length, -1, "#2c7b65")}</g>)}
        <text x={geometry.centerX - 155} y={(geometry.bottomY + geometry.apexY) / 2} textAnchor="middle" fill="#256551" fontSize="18" fontWeight="700" transform={`rotate(-90 ${geometry.centerX - 155} ${(geometry.bottomY + geometry.apexY) / 2})`}>slowing</text>
      </g>
      <g data-visual-cue="apex-pause">
        <circle cx={geometry.centerX} cy={geometry.apexY} r="21" fill="#f7d88c" stroke="#7d5b25" strokeWidth="4" />
        <path d={`M${geometry.centerX - 34} ${geometry.apexY - 36} h68 M${geometry.centerX - 12} ${geometry.apexY - 49} v13 M${geometry.centerX + 12} ${geometry.apexY - 49} v13`} fill="none" stroke="#a25635" strokeWidth="4" strokeLinecap="round" />
        <text x={geometry.centerX} y={geometry.apexY - 62} textAnchor="middle" fill="#71411f" fontSize="20" fontWeight="800">{geometry.apex.label}: pause</text>
      </g>
      <g data-visual-cue="growing-downward-velocity">
        {downwardArrows.map(({ x, y, length }) => <g key={`${x}-${y}`}>{verticalArrow(x, y, length, 1, "#b25235")}</g>)}
        <text x={geometry.centerX + 155} y={(geometry.bottomY + geometry.apexY) / 2} textAnchor="middle" fill="#943f29" fontSize="18" fontWeight="700" transform={`rotate(90 ${geometry.centerX + 155} ${(geometry.bottomY + geometry.apexY) / 2})`}>speeding up</text>
      </g>
      <g data-visual-cue="downward-gravity-force">
        {verticalArrow(geometry.force.x * 10, geometry.force.y * 6.2 - 45, 92, 1, "#674e86")}
        <text x={geometry.force.x * 10} y={geometry.force.y * 6.2 + 70} textAnchor="middle" fill="#563f72" fontSize="20" fontWeight="800">{geometry.force.label}</text>
      </g>
    </g>;
  }
  if (isCirculationRelation(relation)) {
    if (relation.kind !== "pumpsTo") return null;
    const geometry = circulationLoopGeometry(relations.filter(isCirculationRelation), entities);
    if (!geometry) return null;
    const heart = /\bheart\b/.test(geometry.source.label ?? "");
    const lungs = /\blungs?\b/.test(geometry.destination.label ?? "");
    const returnVerb = /s$/.test(geometry.destination.label ?? "") ? "return" : "returns";
    const upperPath = `M${geometry.sourceX + 62} ${geometry.sourceY - 25} C${geometry.sourceX + 150} ${geometry.upperY - 35} ${geometry.destinationX - 150} ${geometry.upperY - 35} ${geometry.destinationX - 62} ${geometry.destinationY - 25}`;
    const lowerPath = `M${geometry.destinationX - 62} ${geometry.destinationY + 25} C${geometry.destinationX - 150} ${geometry.lowerY + 35} ${geometry.sourceX + 150} ${geometry.lowerY + 35} ${geometry.sourceX + 62} ${geometry.sourceY + 25}`;
    return <g className="circulation-loop-annotation" aria-label={`${geometry.source.label} pumps ${geometry.payload.label} to ${geometry.destination.label}; ${geometry.destination.label} ${returnVerb} ${geometry.payload.label} carrying ${geometry.enrichment.label} to ${geometry.source.label}`}>
      <g data-visual-cue="heart-shape">
        {heart
          ? <path d={`M${geometry.sourceX} ${geometry.sourceY + 55} C${geometry.sourceX - 90} ${geometry.sourceY - 5} ${geometry.sourceX - 45} ${geometry.sourceY - 100} ${geometry.sourceX} ${geometry.sourceY - 45} C${geometry.sourceX + 45} ${geometry.sourceY - 100} ${geometry.sourceX + 90} ${geometry.sourceY - 5} ${geometry.sourceX} ${geometry.sourceY + 55} Z`} fill="#f3a09a" stroke="#843b3b" strokeWidth="4" />
          : <circle cx={geometry.sourceX} cy={geometry.sourceY} r="62" fill="#f5c2b8" stroke="#843b3b" strokeWidth="4" />}
        <text x={geometry.sourceX} y={geometry.sourceY + 88} textAnchor="middle" fill="#633235" fontSize="22" fontWeight="800">{geometry.source.label}</text>
      </g>
      <g data-visual-cue="paired-lung-shapes">
        {lungs
          ? <><path d={`M${geometry.destinationX - 9} ${geometry.destinationY - 58} C${geometry.destinationX - 78} ${geometry.destinationY - 62} ${geometry.destinationX - 91} ${geometry.destinationY + 43} ${geometry.destinationX - 25} ${geometry.destinationY + 54} Q${geometry.destinationX - 7} ${geometry.destinationY + 12} ${geometry.destinationX - 9} ${geometry.destinationY - 58} Z`} fill="#b9d9dc" stroke="#37656d" strokeWidth="4" /><path d={`M${geometry.destinationX + 9} ${geometry.destinationY - 58} C${geometry.destinationX + 78} ${geometry.destinationY - 62} ${geometry.destinationX + 91} ${geometry.destinationY + 43} ${geometry.destinationX + 25} ${geometry.destinationY + 54} Q${geometry.destinationX + 7} ${geometry.destinationY + 12} ${geometry.destinationX + 9} ${geometry.destinationY - 58} Z`} fill="#b9d9dc" stroke="#37656d" strokeWidth="4" /></>
          : <rect x={geometry.destinationX - 68} y={geometry.destinationY - 56} width="136" height="112" rx="30" fill="#c8e1de" stroke="#37656d" strokeWidth="4" />}
        <text x={geometry.destinationX} y={geometry.destinationY + 88} textAnchor="middle" fill="#315c62" fontSize="22" fontWeight="800">{geometry.destination.label}</text>
      </g>
      <g data-visual-cue="outbound-blood-arrow">
        <path className="circulation-flow circulation-outbound" d={upperPath} fill="none" stroke="#326e9c" strokeWidth="8" strokeLinecap="round" />
        <path d={`M${geometry.destinationX - 78} ${geometry.destinationY - 39} L${geometry.destinationX - 60} ${geometry.destinationY - 25} L${geometry.destinationX - 82} ${geometry.destinationY - 14}`} fill="none" stroke="#326e9c" strokeWidth="6" strokeLinecap="round" />
        <text x={(geometry.sourceX + geometry.destinationX) / 2} y={geometry.upperY - 28} textAnchor="middle" fill="#285a82" fontSize="20" fontWeight="700">{geometry.payload.label}</text>
      </g>
      <g data-visual-cue="oxygenated-return-arrow closed-circulation-loop">
        <path className="circulation-flow circulation-return" d={lowerPath} fill="none" stroke="#b04d4b" strokeWidth="8" strokeLinecap="round" />
        <path d={`M${geometry.sourceX + 80} ${geometry.sourceY + 14} L${geometry.sourceX + 60} ${geometry.sourceY + 25} L${geometry.sourceX + 78} ${geometry.sourceY + 40}`} fill="none" stroke="#b04d4b" strokeWidth="6" strokeLinecap="round" />
        <text x={(geometry.sourceX + geometry.destinationX) / 2} y={geometry.lowerY + 45} textAnchor="middle" fill="#913d3d" fontSize="20" fontWeight="700">{geometry.payload.label} + {geometry.enrichment.label}</text>
      </g>
    </g>;
  }
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
  if (relation.kind === "measures") {
    const geometry = geometricConstructionGeometry(relation, entities);
    if (!geometry) return null;
    const measureRadians = geometry.degrees * Math.PI / 360;
    const measureX = geometry.vertexX + Math.cos(measureRadians) * 76;
    const measureY = geometry.vertexY - Math.sin(measureRadians) * 76;
    const rayCue = geometry.isRightAngle ? "perpendicular-rays" : "angle-rays";
    const measureCue = geometry.isRightAngle ? "ninety-degree-label" : "angle-measure-label";
    const numericLabel = `${Number(geometry.degrees.toFixed(2))}°`;
    return <g className="geometric-construction-annotation" aria-label={`${geometry.subject.label} measures ${numericLabel}`}>
      <g data-visual-cue={rayCue}>
        <path d={`M${geometry.vertexX} ${geometry.vertexY} H${geometry.vertexX + geometry.rayLength}`} fill="none" stroke="#2f302d" strokeWidth="5" strokeLinecap="round" />
        <path d={`M${geometry.vertexX} ${geometry.vertexY} L${geometry.secondX} ${geometry.secondY}`} fill="none" stroke="#2f302d" strokeWidth="5" strokeLinecap="round" />
        <circle cx={geometry.vertexX} cy={geometry.vertexY} r="6" fill="#2f302d" />
      </g>
      {geometry.isRightAngle
        ? <path data-visual-cue="right-angle-square" d={`M${geometry.vertexX + 38} ${geometry.vertexY} V${geometry.vertexY - 38} H${geometry.vertexX}`} fill="none" stroke="#b25b37" strokeWidth="4" />
        : <path data-visual-cue="angle-arc" d={`M${geometry.vertexX + 48} ${geometry.vertexY} A48 48 0 ${geometry.degrees > 180 ? 1 : 0} 0 ${geometry.vertexX + Math.cos(geometry.degrees * Math.PI / 180) * 48} ${geometry.vertexY - Math.sin(geometry.degrees * Math.PI / 180) * 48}`} fill="none" stroke="#b25b37" strokeWidth="3" />}
      <text data-visual-cue={measureCue} x={measureX} y={measureY} textAnchor="middle" fill="#934424" fontSize="31" fontWeight="800">{numericLabel}</text>
      <text x={geometry.vertexX + 105} y={geometry.vertexY + 48} textAnchor="middle" fill="#315f52" fontSize="22" fontWeight="700">{geometry.subject.label}</text>
    </g>;
  }
  if (isLandscapeFlowRelation(relation)) {
    if (relation.kind !== "flowsFrom") return null;
    const geometry = landscapeFlowGeometry(relations.filter(isLandscapeFlowRelation), entities);
    if (!geometry) return null;
    const shoreX = geometry.destinationX - 24;
    const arrowStartX = geometry.riverX - 42;
    const arrowStartY = geometry.riverY - 18;
    const arrowEndX = geometry.riverX + 34;
    const arrowEndY = geometry.riverY + 10;
    const flowVerb = /(?:rivers|streams|creeks|watercourses)$/.test(geometry.watercourse.label ?? "") ? "flow" : "flows";
    return <g className="landscape-flow-annotation" aria-label={`${geometry.watercourse.label} ${flowVerb} from ${geometry.source.label} to ${geometry.destination.label}`}>
      <g data-visual-cue="elevation-cross-section">
        <path d={`M70 485 Q${geometry.sourceX - 95} ${geometry.sourceY + 105} ${geometry.sourceX} ${geometry.sourceY + 18} Q${geometry.sourceX + 72} ${geometry.sourceY + 72} ${geometry.riverX} ${geometry.riverY + 24} Q${geometry.destinationX - 95} ${geometry.destinationY - 12} ${shoreX} ${geometry.destinationY} L${shoreX} 510 H70 Z`}
          fill="#d9d6a6" stroke="#4f5946" strokeWidth="4" strokeLinejoin="round" />
        <path d={`M${geometry.sourceX - 74} ${geometry.sourceY + 88} L${geometry.sourceX} ${geometry.sourceY + 18} L${geometry.sourceX + 51} ${geometry.sourceY + 66}`}
          fill="none" stroke="#69715a" strokeWidth="3" strokeLinecap="round" />
        <path d={`M${geometry.sourceX - 7} ${geometry.sourceY + 25} L${geometry.sourceX} ${geometry.sourceY + 18} L${geometry.sourceX + 10} ${geometry.sourceY + 28}`}
          fill="none" stroke="#fbf7ed" strokeWidth="5" strokeLinecap="round" />
        <path d={`M110 477 q16 -24 32 0 m22 0 q15 -20 30 0 m315 7 q13 -19 27 0 m24 0 q14 -17 28 0`}
          fill="none" stroke="#6f8755" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g data-visual-cue="sea-shape">
        <path d={`M${shoreX} ${geometry.destinationY} Q${shoreX + 34} ${geometry.destinationY - 12} ${shoreX + 68} ${geometry.destinationY} T${shoreX + 136} ${geometry.destinationY} T${shoreX + 204} ${geometry.destinationY} V510 H${shoreX} Z`}
          fill="#a9d8db" stroke="#317584" strokeWidth="4" strokeLinejoin="round" />
        <path d={`M${shoreX + 21} ${geometry.destinationY + 25} q24 -10 48 0 t48 0 m-76 35 q27 -10 54 0`}
          fill="none" stroke="#4f9aa8" strokeWidth="3" strokeLinecap="round" />
      </g>
      <path data-visual-cue="continuous-river-path" className="visual-action-flow"
        d={geometry.riverPath} fill="none" stroke="#3b8fa5" strokeWidth="20" strokeLinecap="round" />
      <path d={geometry.riverPath} fill="none" stroke="#ccebed" strokeWidth="4" strokeLinecap="round" opacity=".9" />
      <g data-visual-cue="downhill-flow-arrow">
        <path d={`M${arrowStartX} ${arrowStartY} L${arrowEndX} ${arrowEndY}`} fill="none" stroke="#1f6679" strokeWidth="5" strokeLinecap="round" />
        <path d={`M${arrowEndX - 16} ${arrowEndY - 14} L${arrowEndX} ${arrowEndY} L${arrowEndX - 20} ${arrowEndY + 5}`} fill="none" stroke="#1f6679" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text x={geometry.sourceX} y={geometry.sourceY - 3} textAnchor="middle" fill="#40503c" fontSize="22" fontWeight="700">{geometry.source.label}</text>
      <text x={geometry.riverX} y={geometry.riverY + 68} textAnchor="middle" fill="#205d70" fontSize="24" fontWeight="800">{geometry.watercourse.label}</text>
      <text x={geometry.destinationX + 75} y={geometry.destinationY + 78} textAnchor="middle" fill="#205d70" fontSize="24" fontWeight="800">{geometry.destination.label}</text>
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

  if (["force", "surface", "container", "contained", "geometry", "measurement", "watercourse", "elevated-source", "water-destination", "circulation-source", "circulation-destination", "circulation-payload", "circulation-enrichment", "trajectory-object", "trajectory-apex", "trajectory-force", "control-caller", "control-function", "control-call-site"].includes(entity.visualRole ?? "")) {
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
