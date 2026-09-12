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
import { fractionSubtractionGeometry, isFractionSubtractionRelation } from "../doodlescript/fractionSubtraction";
import { isWaterCycleRelation, waterCycleGeometry } from "../doodlescript/waterCycleLoop";
import { isLifecycleRelation, lifecycleSequenceGeometry } from "../doodlescript/lifecycleSequence";
import { isReflectionRelation, reflectionRayGeometry } from "../doodlescript/reflectionRay";
import { convergentPlatesGeometry, isConvergentRelation, isLifoRelation, isRoutineRelation, isTriangleRelation, lifoStackGeometry, orderedRoutineGeometry, triangleAngleSumGeometry } from "../doodlescript/advancedConstructions";
import { indexedCollectionGeometry, isIndexedCollectionRelation } from "../doodlescript/indexedCollection";
import { isLinkedChainRelation, linkedChainGeometry } from "../doodlescript/linkedChain";
import { conditionFlowGeometry, isConditionFlowRelation } from "../doodlescript/conditionFlow";

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
  if (isConditionFlowRelation(relation)) {
    const controlRelations = relations.filter(isConditionFlowRelation);
    if (relation.id !== controlRelations.find(({ kind }) => kind === "checksCondition")?.id) return null;
    const geometry = conditionFlowGeometry(controlRelations, entities);
    if (!geometry) return null;
    const diamond = "M500 185 L625 300 L500 415 L375 300 Z";
    const arrow = (d: string, tip: string, color: string, className = "condition-flow") => <g><path className={className} d={d} fill="none" stroke={color} strokeWidth="8" strokeDasharray="14 10" strokeLinecap="round" /><path d={tip} fill="none" stroke={color} strokeWidth="7" strokeLinejoin="round" /></g>;
    if (geometry.mode === "loop") return <g className="condition-flow-annotation" aria-label={`${geometry.entry.label} repeat while ${geometry.condition.label} is true; exit when false`}>
      <g data-visual-cue="repeated-step"><rect x="90" y="230" width="230" height="140" rx="34" fill="#b9ded2" stroke="#405c59" strokeWidth="7" /><path d="M132 278 h145 M132 310 h110 M132 342 h75" stroke="#517a73" strokeWidth="8" strokeLinecap="round" /><text x="205" y="415" textAnchor="middle" fontSize="24" fontWeight="900" fill="#334f4c">{geometry.entry.label}</text></g>
      <g data-visual-cue="condition-diamond"><path d={diamond} fill="#f5d591" stroke="#5c5544" strokeWidth="8" strokeLinejoin="round" /><text x="500" y="294" textAnchor="middle" fontSize="23" fontWeight="950" fill="#554b36">{geometry.condition.label}</text><text x="500" y="326" textAnchor="middle" fontSize="18" fontWeight="850" fill="#79683e">condition?</text></g>
      <g data-visual-cue="loop-back-arrow">{arrow("M375 300 H322 M205 230 V145 Q205 105 250 105 H500 Q690 105 690 265 Q690 300 625 300", "M647 282 L625 300 L647 318", "#43806f", "condition-flow condition-loop")}</g>
      <text x="658" y="268" fontSize="22" fontWeight="950" fill="#347261">TRUE</text>
      <g data-visual-cue="false-exit-path">{arrow("M500 415 V505 H790", "M765 487 L790 505 L765 523", "#a35263")}<rect x="790" y="458" width="145" height="94" rx="28" fill="#e9b8c8" stroke="#664652" strokeWidth="7" /><text x="862" y="515" textAnchor="middle" fontSize="25" fontWeight="950" fill="#65404d">{geometry.falseTarget.label}</text><text x="525" y="488" fontSize="22" fontWeight="950" fill="#96465a">FALSE</text></g>
    </g>;
    return <g className="condition-flow-annotation" aria-label={`${geometry.entry.label} checks ${geometry.condition.label}; true goes to ${geometry.trueTarget.label}; false goes to ${geometry.falseTarget.label}`}>
      <g data-visual-cue="control-entry"><rect x="70" y="245" width="220" height="110" rx="34" fill="#c5dcef" stroke="#405c59" strokeWidth="7" /><text x="180" y="311" textAnchor="middle" fontSize="25" fontWeight="950" fill="#334f4c">{geometry.entry.label}</text></g>
      <g data-visual-cue="condition-diamond"><path d={diamond} fill="#f5d591" stroke="#5c5544" strokeWidth="8" strokeLinejoin="round" /><text x="500" y="294" textAnchor="middle" fontSize="23" fontWeight="950" fill="#554b36">{geometry.condition.label}</text><text x="500" y="326" textAnchor="middle" fontSize="18" fontWeight="850" fill="#79683e">condition?</text></g>
      <g data-visual-cue="true-branch">{arrow("M290 300 H375 M625 260 Q690 260 715 205", "M693 220 L715 205 L710 231", "#43806f")}<rect x="715" y="120" width="220" height="110" rx="34" fill="#b9ded2" stroke="#405c59" strokeWidth="7" /><text x="825" y="185" textAnchor="middle" fontSize="24" fontWeight="950" fill="#334f4c">{geometry.trueTarget.label}</text><text x="650" y="235" fontSize="21" fontWeight="950" fill="#347261">TRUE</text></g>
      <g data-visual-cue="false-branch">{arrow("M625 340 Q690 340 715 395", "M710 369 L715 395 L693 380", "#a35263")}<rect x="715" y="370" width="220" height="110" rx="34" fill="#e9b8c8" stroke="#664652" strokeWidth="7" /><text x="825" y="435" textAnchor="middle" fontSize="24" fontWeight="950" fill="#65404d">{geometry.falseTarget.label}</text><text x="650" y="380" fontSize="21" fontWeight="950" fill="#96465a">FALSE</text></g>
    </g>;
  }
  if (isLinkedChainRelation(relation)) {
    const linkedRelations = relations.filter(isLinkedChainRelation);
    if (relation.id !== linkedRelations.find(({ kind }) => kind === "hasFirstNode")?.id) return null;
    const geometry = linkedChainGeometry(linkedRelations, entities);
    if (!geometry) return null;
    const starts = [120, 405, 690]; const rowY = 235; const nodeWidth = 190; const dataWidth = 130;
    return <g className="linked-chain-annotation" aria-label={`${geometry.collection.label} starts with ${geometry.first.label}; ${geometry.first.label} points to ${geometry.middle.label}; ${geometry.middle.label} points to ${geometry.final.label}`}>
      <text x="500" y="118" textAnchor="middle" fontSize="31" fontWeight="950" fill="#334f4c">{geometry.collection.label}</text>
      <g data-visual-cue="head-marker"><path d={`M500 138 Q350 165 ${starts[0] + 65} ${rowY - 18}`} fill="none" stroke="#91607a" strokeWidth="5" strokeDasharray="10 8" /><path d={`M${starts[0] + 51} ${rowY - 29} l14 11 2 -18`} fill="none" stroke="#91607a" strokeWidth="5" /><text x={starts[0] + 65} y={rowY - 33} textAnchor="middle" fontSize="19" fontWeight="900" fill="#7f4b68">HEAD</text></g>
      <g data-visual-cue="separate-node-boxes">
        {geometry.nodes.map((node, index) => { const x = starts[index]; return <g key={node.id}><rect x={x} y={rowY} width={nodeWidth} height="125" rx="16" fill={["#b9ded2", "#f2cf91", "#c8d8ef"][index]} stroke="#405c59" strokeWidth="6" /><path d={`M${x + dataWidth} ${rowY} V${rowY + 125}`} stroke="#405c59" strokeWidth="5" /><text x={x + dataWidth / 2} y={rowY + 72} textAnchor="middle" fontSize="24" fontWeight="900" fill="#314744">{node.label}</text><circle cx={x + dataWidth + 30} cy={rowY + 62} r="10" fill={index === 2 ? "#9a5470" : "#427b70"} /></g>; })}
      </g>
      <g data-visual-cue="next-pointer-arrows">
        {[0, 1].map((index) => { const from = starts[index] + nodeWidth; const to = starts[index + 1]; const y = rowY + 62; return <g key={index}><path className="linked-flow" d={`M${from + 3} ${y} H${to - 8}`} stroke="#427b70" strokeWidth="8" strokeDasharray="14 10" strokeLinecap="round" /><path d={`M${to - 27} ${y - 14} L${to - 8} ${y} L${to - 27} ${y + 14}`} fill="none" stroke="#427b70" strokeWidth="7" strokeLinejoin="round" /></g>; })}
      </g>
      <g data-visual-cue="null-tail-marker"><path d={`M${starts[2] + nodeWidth - 38} ${rowY + 43} l27 38 M${starts[2] + nodeWidth - 11} ${rowY + 43} l-27 38`} stroke="#7f4b68" strokeWidth="6" strokeLinecap="round" /></g>
      <g data-visual-cue="left-to-right-pointer-order"><text x="500" y={rowY + 190} textAnchor="middle" fontSize="22" fontWeight="850" fill="#3f6d65">each pointer leads to the next node</text></g>
    </g>;
  }
  if (isIndexedCollectionRelation(relation)) {
    const indexedRelations = relations.filter(isIndexedCollectionRelation);
    if (relation.id !== indexedRelations.find(({ kind }) => kind === "containsCells")?.id) return null;
    const geometry = indexedCollectionGeometry(indexedRelations, entities);
    if (!geometry) return null;
    const startX = 140; const rowY = 235; const cellWidth = 180; const gap = 8;
    return <g className="indexed-collection-annotation" aria-label={`${geometry.collection.label} contains ${geometry.cells.label} holding ${geometry.values.label}, indexed starting at ${geometry.startIndex}`}>
      <text x="500" y="128" textAnchor="middle" fontSize="30" fontWeight="950" fill="#334f4c">{geometry.collection.label}</text>
      <g data-visual-cue="indexed-box-row">
        {[0, 1, 2, 3].map((offset) => { const x = startX + offset * (cellWidth + gap); return <g key={offset}><rect x={x} y={rowY} width={cellWidth} height="120" rx="18" fill={["#b9ded2", "#f2cf91", "#c8d8ef", "#e8b8c8"][offset]} stroke="#405c59" strokeWidth="6" /><text x={x + cellWidth / 2} y={rowY + 72} textAnchor="middle" fontSize="24" fontWeight="900" fill="#314744">{geometry.values.label} {offset + 1}</text></g>; })}
      </g>
      <g data-visual-cue="cell-values"><path d={`M${startX} ${rowY + 142} H${startX + 4 * cellWidth + 3 * gap}`} stroke="#67807b" strokeWidth="4" strokeLinecap="round" /></g>
      <g data-visual-cue={geometry.startIndex === 0 ? "zero-based-indices" : "one-based-indices"}>
        {[0, 1, 2, 3].map((offset) => { const x = startX + offset * (cellWidth + gap) + cellWidth / 2; return <g key={offset}><path d={`M${x} ${rowY + 128} v28`} stroke="#8e4d67" strokeWidth="5" /><text x={x} y={rowY + 190} textAnchor="middle" fontSize="25" fontWeight="950" fill="#7d405b">{geometry.startIndex + offset}</text></g>; })}
      </g>
      <g data-visual-cue="left-to-right-indexing"><path d={`M${startX + 20} ${rowY + 225} H${startX + 4 * cellWidth + 3 * gap - 20}`} stroke="#4f8277" strokeWidth="8" strokeDasharray="14 10" /><path d={`M${startX + 4 * cellWidth + 3 * gap - 45} ${rowY + 209} l25 16 -25 16`} fill="none" stroke="#4f8277" strokeWidth="7" /><text x="500" y={rowY + 270} textAnchor="middle" fontSize="22" fontWeight="850" fill="#3f6d65">indices increase left to right</text></g>
    </g>;
  }
  if (isLifoRelation(relation)) {
    const geometry = lifoStackGeometry(relations.filter(isLifoRelation), entities);
    if (!geometry) return null;
    const x = geometry.centerX; const base = geometry.baseY;
    return <g className="lifo-stack-annotation" aria-label={`${geometry.items.label} are accessed only at the ${geometry.top.label} of the ${geometry.stack.label}`}>
      <g data-visual-cue="vertical-stack">
        <path d={`M${x - 118} ${base - 245} V${base} H${x + 118} V${base - 245}`} fill="none" stroke="#3d5554" strokeWidth="8" strokeLinecap="round" />
        {[0, 1, 2, 3].map((level) => <g key={level}><rect x={x - 96} y={base - 58 - level * 58} width="192" height="48" rx="11" fill={["#d6e8a8", "#f1c783", "#9fd6d2", "#e9b5c7"][level]} stroke="#405b59" strokeWidth="4" /><text x={x} y={base - 27 - level * 58} textAnchor="middle" fontSize="19" fontWeight="850" fill="#324644">item {level + 1}</text></g>)}
        <text x={x} y={base + 42} textAnchor="middle" fontSize="24" fontWeight="900" fill="#334d4b">{geometry.stack.label}</text>
      </g>
      <g data-visual-cue="top-marker"><path d={`M${x + 125} ${base - 229} h65`} stroke="#8e4c67" strokeWidth="6" /><path d={`M${x + 176} ${base - 241} l14 12 -14 12`} fill="none" stroke="#8e4c67" strokeWidth="6" /><text x={x + 158} y={base - 251} textAnchor="middle" fontSize="21" fontWeight="900" fill="#7a4058">TOP</text></g>
      <g data-visual-cue="push-at-top"><path className="stack-flow" d={`M${x - 190} ${base - 330} Q${x - 80} ${base - 345} ${x - 35} ${base - 282}`} fill="none" stroke="#4c8b68" strokeWidth="8" strokeDasharray="13 9" /><path d={`M${x - 52} ${base - 291} l17 9 -4 -19`} fill="none" stroke="#4c8b68" strokeWidth="7" /><text x={x - 145} y={base - 350} fontSize="23" fontWeight="900" fill="#3b7153">PUSH</text></g>
      <g data-visual-cue="pop-at-top"><path className="stack-flow stack-flow-pop" d={`M${x + 35} ${base - 282} Q${x + 95} ${base - 350} ${x + 198} ${base - 326}`} fill="none" stroke="#b35d55" strokeWidth="8" strokeDasharray="13 9" /><path d={`M${x + 179} ${base - 338} l19 12 -21 5`} fill="none" stroke="#b35d55" strokeWidth="7" /><text x={x + 122} y={base - 350} fontSize="23" fontWeight="900" fill="#934a45">POP</text></g>
    </g>;
  }
  if (isTriangleRelation(relation)) {
    const triangleRelations = relations.filter(isTriangleRelation);
    if (relation.id !== triangleRelations[0]?.id) return null;
    const geometry = triangleAngleSumGeometry(triangleRelations, entities);
    if (!geometry) return null;
    const x = geometry.centerX; const y = geometry.centerY;
    const left = { x: x - 205, y: y + 125 }; const right = { x: x + 205, y: y + 125 }; const apex = { x, y: y - 150 };
    return <g className="triangle-angle-sum-annotation" aria-label={`the three angles of the triangle sum to ${geometry.total.label}`}>
      <g data-visual-cue="three-sided-triangle"><path d={`M${left.x} ${left.y} L${apex.x} ${apex.y} L${right.x} ${right.y} Z`} fill="#fff2bd" stroke="#3f5e62" strokeWidth="9" strokeLinejoin="round" /></g>
      <g data-visual-cue="three-angle-marks">
        <path d={`M${left.x + 48} ${left.y} A48 48 0 0 0 ${left.x + 29} ${left.y - 38} M${right.x - 48} ${right.y} A48 48 0 0 1 ${right.x - 29} ${right.y - 38} M${apex.x - 26} ${apex.y + 35} A43 43 0 0 0 ${apex.x + 26} ${apex.y + 35}`} fill="none" stroke="#b25d70" strokeWidth="7" strokeLinecap="round" />
        <text x={left.x + 55} y={left.y - 21} fontSize="24" fontWeight="900" fill="#8f4359">A</text><text x={right.x - 67} y={right.y - 21} fontSize="24" fontWeight="900" fill="#8f4359">B</text><text x={apex.x} y={apex.y + 67} textAnchor="middle" fontSize="24" fontWeight="900" fill="#8f4359">C</text>
      </g>
      <g data-visual-cue="angle-sum-180"><rect x={x - 190} y={y + 165} width="380" height="62" rx="25" fill="#dceee8" stroke="#426d65" strokeWidth="5" /><text x={x} y={y + 206} textAnchor="middle" fontSize="27" fontWeight="950" fill="#315c55">A + B + C = {geometry.total.label}</text></g>
    </g>;
  }
  if (isConvergentRelation(relation)) {
    const plateRelations = relations.filter(isConvergentRelation);
    if (relation.id !== plateRelations[0]?.id) return null;
    const geometry = convergentPlatesGeometry(plateRelations, entities);
    if (!geometry) return null;
    const x = geometry.mountainX; const ground = geometry.groundY;
    return <g className="convergent-plates-annotation" aria-label={`${geometry.left.label} and ${geometry.right.label} push toward each other, forming a ${geometry.mountain.label}`}>
      <g data-visual-cue="opposing-landmasses">
        <path className="plate-shift plate-shift-left" d={`M65 ${ground - 48} Q180 ${ground - 72} ${x - 25} ${ground - 35} L${x - 5} ${ground + 80} H65 Z`} fill="#cfb178" stroke="#5d5039" strokeWidth="7" /><path className="plate-shift plate-shift-right" d={`M935 ${ground - 48} Q820 ${ground - 72} ${x + 25} ${ground - 35} L${x + 5} ${ground + 80} H935 Z`} fill="#d5b982" stroke="#5d5039" strokeWidth="7" />
        <text x="195" y={ground + 28} textAnchor="middle" fontSize="22" fontWeight="850" fill="#51452f">{geometry.left.label}</text><text x="805" y={ground + 28} textAnchor="middle" fontSize="22" fontWeight="850" fill="#51452f">{geometry.right.label}</text>
      </g>
      <g data-visual-cue="inward-force-arrows"><path className="plate-force" d={`M160 ${ground - 105} H${x - 105} M${x + 105} ${ground - 105} H840`} fill="none" stroke="#b95445" strokeWidth="11" strokeLinecap="round" /><path d={`M${x - 132} ${ground - 123} l27 18 -27 18 M${x + 132} ${ground - 123} l-27 18 27 18`} fill="none" stroke="#b95445" strokeWidth="9" /></g>
      <g data-visual-cue="central-mountain-uplift"><path className="mountain-uplift" d={`M${x - 190} ${ground - 35} L${x - 82} ${ground - 188} L${x - 30} ${ground - 130} L${x + 35} ${ground - 255} L${x + 190} ${ground - 35} Z`} fill="#8ea27d" stroke="#465a45" strokeWidth="8" strokeLinejoin="round" /><path d={`M${x - 8} ${ground - 175} l43 -80 48 70 -36 -17 -19 24 -19 -22 Z`} fill="#f4f0df" /><path d={`M${x} ${ground - 15} V${ground - 105}`} stroke="#d18b3e" strokeWidth="7" strokeDasharray="10 8" /><path d={`M${x - 14} ${ground - 89} L${x} ${ground - 112} L${x + 14} ${ground - 89}`} fill="none" stroke="#d18b3e" strokeWidth="7" /><text x={x} y={ground - 275} textAnchor="middle" fontSize="25" fontWeight="950" fill="#38503d">{geometry.mountain.label} uplift</text></g>
    </g>;
  }
  if (isRoutineRelation(relation)) {
    const routineRelations = relations.filter(isRoutineRelation);
    if (relation.id !== routineRelations[0]?.id) return null;
    const geometry = orderedRoutineGeometry(routineRelations, entities);
    if (!geometry) return null;
    const stages = [geometry.first, geometry.middle, geometry.final]; const y = geometry.middle.y * 6.2;
    const cues = ["wake-up-stage", "ready-stage", "school-stage"];
    return <g className="ordered-routine-annotation" aria-label={`${geometry.first.label}, then ${geometry.middle.label}, then ${geometry.final.label}`}>
      <g data-visual-cue="ordered-arrows">{[0, 1].map((index) => { const from = stages[index].x * 10 + 108; const to = stages[index + 1].x * 10 - 108; return <g key={index}><path className="routine-flow" d={`M${from} ${y} H${to}`} stroke="#4e7e75" strokeWidth="8" strokeDasharray="12 9" /><path d={`M${to - 20} ${y - 13} L${to} ${y} L${to - 20} ${y + 13}`} fill="none" stroke="#4e7e75" strokeWidth="7" /></g>; })}</g>
      {stages.map((stage, index) => { const sx = stage.x * 10; return <g key={stage.id} data-visual-cue={cues[index]}><rect x={sx - 105} y={y - 88} width="210" height="176" rx="40" fill={["#e7c8a0", "#b9ded2", "#c7d7ef"][index]} stroke="#425b58" strokeWidth="6" /><circle cx={sx - 76} cy={y - 60} r="22" fill="#3f645d" /><text x={sx - 76} y={y - 52} textAnchor="middle" fill="white" fontSize="20" fontWeight="900">{index + 1}</text><path d={`M${sx - 45} ${y - 20} H${sx + 45} M${sx - 45} ${y + 8} H${sx + 28} M${sx - 45} ${y + 36} H${sx + 10}`} stroke="#52736d" strokeWidth="7" strokeLinecap="round" opacity=".72" /><circle cx={sx + 59} cy={y + 36} r="15" fill="none" stroke="#52736d" strokeWidth="5" /><path d={`M${sx + 59} ${y + 36} v-9 M${sx + 59} ${y + 36} l7 5`} stroke="#52736d" strokeWidth="4" strokeLinecap="round" /><text x={sx} y={y + 127} textAnchor="middle" fontSize="22" fontWeight="900" fill="#344a47">{stage.label}</text></g>; })}
    </g>;
  }
  if (isReflectionRelation(relation)) {
    const optics = relations.filter(isReflectionRelation);
    if (relation.id !== optics.find(({ kind }) => kind === "travelsTo")?.id) return null;
    const geometry = reflectionRayGeometry(optics, entities);
    if (!geometry) return null;
    const { incidentStart: start, impact, reflectedEnd: end, normalEnd } = geometry;
    const arrow = (tip: { x: number; y: number }, from: { x: number; y: number }, color: string) => {
      const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
      const wing = (offset: number) => ({ x: tip.x - 25 * Math.cos(angle + offset), y: tip.y - 25 * Math.sin(angle + offset) });
      const a = wing(0.55); const b = wing(-0.55);
      return <path d={`M${a.x} ${a.y} L${tip.x} ${tip.y} L${b.x} ${b.y}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />;
    };
    const surfaceY = impact.y + 8;
    return <g className="reflection-ray-annotation" aria-label={`${geometry.incident.label} travels to ${geometry.surface.label}; ${geometry.reflected.label} reflects from ${geometry.surface.label}`}>
      <g data-visual-cue="straight-incident-ray">
        <path className="reflection-flow" d={`M${start.x} ${start.y} L${impact.x} ${impact.y}`} fill="none" stroke="#e4a72d" strokeWidth="11" strokeLinecap="round" />
        {arrow(impact, start, "#a96f0b")}
        <circle cx={start.x} cy={start.y} r="18" fill="#ffe796" stroke="#a96f0b" strokeWidth="5" />
        <text x={start.x} y={start.y - 34} textAnchor="middle" fill="#71500f" fontSize="23" fontWeight="850">{geometry.incident.label}</text>
      </g>
      <g data-visual-cue="angled-reflected-ray">
        <path className="reflection-flow reflection-flow-out" d={`M${impact.x} ${impact.y} L${end.x} ${end.y}`} fill="none" stroke="#42a4b5" strokeWidth="11" strokeLinecap="round" />
        {arrow(end, impact, "#216f81")}
        <text x={end.x} y={end.y - 34} textAnchor="middle" fill="#245e6b" fontSize="23" fontWeight="850">{geometry.reflected.label}</text>
      </g>
      <g data-visual-cue="surface-normal equal-angle-cues">
        <path d={`M${impact.x} ${surfaceY} V${normalEnd.y}`} stroke="#66706d" strokeWidth="4" strokeDasharray="10 10" />
        <path d={`M${impact.x - 55} ${impact.y - 33} Q${impact.x - 31} ${impact.y - 65} ${impact.x} ${impact.y - 72} M${impact.x} ${impact.y - 72} Q${impact.x + 31} ${impact.y - 65} ${impact.x + 55} ${impact.y - 33}`} fill="none" stroke="#8b6d47" strokeWidth="4" />
        <text x={impact.x - 52} y={impact.y - 70} textAnchor="middle" fill="#725b3c" fontSize="18" fontWeight="800">θᵢ</text>
        <text x={impact.x + 52} y={impact.y - 70} textAnchor="middle" fill="#725b3c" fontSize="18" fontWeight="800">θᵣ</text>
      </g>
      <g data-visual-cue="impact-point">
        <circle cx={impact.x} cy={impact.y} r="15" fill="#fff6ba" stroke="#8a6416" strokeWidth="5" />
        <path d={`M${impact.x - 24} ${impact.y} H${impact.x + 24} M${impact.x} ${impact.y - 24} V${impact.y + 24}`} stroke="#c78814" strokeWidth="4" />
      </g>
      <g data-visual-cue="reflective-surface">
        <path d={`M${impact.x - 170} ${surfaceY} Q${impact.x} ${surfaceY - 8} ${impact.x + 170} ${surfaceY}`} fill="none" stroke="#354b50" strokeWidth="10" strokeLinecap="round" />
        {[-140, -100, -60, -20, 20, 60, 100, 140].map((offset) => <path key={offset} d={`M${impact.x + offset} ${surfaceY + 5} l-18 25`} stroke="#83999d" strokeWidth="4" />)}
        <text x={impact.x} y={surfaceY + 64} textAnchor="middle" fill="#354b50" fontSize="24" fontWeight="850">{geometry.surface.label}</text>
      </g>
    </g>;
  }
  if (isLifecycleRelation(relation)) {
    const lifecycleRelations = relations.filter(isLifecycleRelation);
    if (relation.id !== lifecycleRelations[0]?.id) return null;
    const geometry = lifecycleSequenceGeometry(lifecycleRelations, entities);
    if (!geometry) return null;
    const stage = (entity: SceneEntity, index: number) => {
      const x = entity.x * 10;
      const y = entity.y * 6.2;
      const label = (entity.label ?? entity.kind).toLowerCase();
      if (index === 0 && /caterpillar|larva/.test(label)) return <g data-visual-cue="caterpillar-stage" className="lifecycle-creature">
        <path d={`M${x - 88} ${y + 50} Q${x - 40} ${y + 82} ${x + 52} ${y + 48}`} fill="none" stroke="#76934d" strokeWidth="9" strokeLinecap="round" />
        {[-58, -30, -2, 26, 52].map((offset, part) => <circle key={offset} cx={x + offset} cy={y + (part % 2 ? 7 : 0)} r={25 - part * 1.5} fill={part % 2 ? "#8fc765" : "#a7d977"} stroke="#476b3e" strokeWidth="4" />)}
        <circle cx={x + 60} cy={y - 5} r="4" fill="#26392a" /><path d={`M${x + 48} ${y - 26} q-4 -24 -18 -30 M${x + 66} ${y - 27} q7 -24 22 -28`} fill="none" stroke="#476b3e" strokeWidth="4" strokeLinecap="round" />
      </g>;
      if (index === 1 && /cocoon|chrysalis/.test(label)) return <g data-visual-cue="wrapped-cocoon" className="lifecycle-cocoon">
        <path d={`M${x - 78} ${y - 92} Q${x} ${y - 112} ${x + 80} ${y - 92}`} fill="none" stroke="#72583b" strokeWidth="10" strokeLinecap="round" />
        <path d={`M${x} ${y - 94} v28`} stroke="#72583b" strokeWidth="5" />
        <path d={`M${x} ${y - 68} C${x - 53} ${y - 54} ${x - 48} ${y + 58} ${x} ${y + 83} C${x + 48} ${y + 58} ${x + 53} ${y - 54} ${x} ${y - 68} Z`} fill="#d8b773" stroke="#705631" strokeWidth="5" />
        <path d={`M${x - 31} ${y - 20} Q${x} ${y - 2} ${x + 31} ${y - 20} M${x - 30} ${y + 20} Q${x} ${y + 38} ${x + 30} ${y + 20}`} fill="none" stroke="#a77f42" strokeWidth="4" />
      </g>;
      if (index === 2 && /butterfly|moth/.test(label)) return <g data-visual-cue="emerging-butterfly" className="lifecycle-creature lifecycle-butterfly">
        <path d={`M${x - 8} ${y - 5} C${x - 45} ${y - 100} ${x - 132} ${y - 80} ${x - 91} ${y + 4} C${x - 138} ${y + 72} ${x - 47} ${y + 86} ${x - 8} ${y + 22} Z`} fill="#e8a8bd" stroke="#844c6a" strokeWidth="5" />
        <path d={`M${x + 8} ${y - 5} C${x + 45} ${y - 100} ${x + 132} ${y - 80} ${x + 91} ${y + 4} C${x + 138} ${y + 72} ${x + 47} ${y + 86} ${x + 8} ${y + 22} Z`} fill="#efc56f" stroke="#844c6a" strokeWidth="5" />
        <ellipse cx={x} cy={y + 7} rx="12" ry="61" fill="#57435a" /><path d={`M${x - 4} ${y - 50} q-24 -35 -44 -22 M${x + 4} ${y - 50} q24 -35 44 -22`} fill="none" stroke="#57435a" strokeWidth="4" strokeLinecap="round" />
        <circle cx={x - 69} cy={y - 23} r="12" fill="#fff4c7" opacity=".8" /><circle cx={x + 69} cy={y - 23} r="12" fill="#fff4c7" opacity=".8" />
      </g>;
      return <g data-visual-cue={`lifecycle-stage-${index + 1}`}>
        <rect x={x - 104} y={y - 72} width="208" height="144" rx="42" fill={index === 0 ? "#dcebb7" : index === 1 ? "#f0dca6" : "#efd0df"} stroke="#5a6555" strokeWidth="5" />
        <path d={`M${x - 52} ${y + 5} q52 -62 104 0 q-52 62 -104 0`} fill="none" stroke="#718060" strokeWidth="5" />
      </g>;
    };
    const positions = [geometry.start, geometry.intermediate, geometry.final];
    const [startX, middleX, finalX] = positions.map(({ x }) => x * 10);
    const y = geometry.intermediate.y * 6.2;
    return <g className="lifecycle-sequence-annotation" data-visual-cue="left-to-right-stages" aria-label={`${geometry.start.label} transforms to ${geometry.intermediate.label}, then ${geometry.intermediate.label} transforms to ${geometry.final.label}`}>
      <path className="lifecycle-flow" d={`M${startX + 112} ${y} C${startX + 150} ${y - 42} ${middleX - 150} ${y - 42} ${middleX - 112} ${y}`} fill="none" stroke="#4d7f78" strokeWidth="8" strokeLinecap="round" strokeDasharray="14 10" />
      <path d={`M${middleX - 139} ${y - 12} L${middleX - 112} ${y} L${middleX - 137} ${y + 17}`} fill="none" stroke="#4d7f78" strokeWidth="7" strokeLinecap="round" />
      <path className="lifecycle-flow lifecycle-flow-late" d={`M${middleX + 112} ${y} C${middleX + 150} ${y - 42} ${finalX - 150} ${y - 42} ${finalX - 112} ${y}`} fill="none" stroke="#9a657f" strokeWidth="8" strokeLinecap="round" strokeDasharray="14 10" />
      <path d={`M${finalX - 139} ${y - 12} L${finalX - 112} ${y} L${finalX - 137} ${y + 17}`} fill="none" stroke="#9a657f" strokeWidth="7" strokeLinecap="round" />
      {positions.map((entity, index) => <g key={entity.id}>{stage(entity, index)}<circle cx={entity.x * 10 - 90} cy={y - 105} r="20" fill="#3e5e56" /><text x={entity.x * 10 - 90} y={y - 98} textAnchor="middle" fill="white" fontSize="20" fontWeight="900">{index + 1}</text><text x={entity.x * 10} y={y + 122} textAnchor="middle" fill="#343b36" fontSize="24" fontWeight="850">{entity.label}</text></g>)}
    </g>;
  }
  if (isWaterCycleRelation(relation)) {
    if (relation.kind !== "fallsTo") return null;
    const geometry = waterCycleGeometry(relations.filter(isWaterCycleRelation), entities);
    if (!geometry) return null;
    const cloudX = geometry.cloud.x * 10;
    const cloudY = geometry.cloud.y * 6.2;
    const soilY = geometry.soil.y * 6.2;
    const waterX = geometry.water.x * 10;
    const waterY = geometry.water.y * 6.2;
    const evaporationX = geometry.evaporation.x * 10;
    const evaporationY = geometry.evaporation.y * 6.2;
    return <g className="water-cycle-loop-annotation" aria-label={`${geometry.rain.label} falls to ${geometry.soil.label}; ${geometry.water.label} infiltrates ${geometry.soil.label}; ${geometry.evaporation.label} rises to ${geometry.cloud.label}`}>
      <g data-visual-cue="cloud-symbol">
        <path d={`M${cloudX - 112} ${cloudY + 26} C${cloudX - 132} ${cloudY - 20} ${cloudX - 72} ${cloudY - 48} ${cloudX - 42} ${cloudY - 16} C${cloudX - 20} ${cloudY - 78} ${cloudX + 70} ${cloudY - 65} ${cloudX + 78} ${cloudY - 10} C${cloudX + 132} ${cloudY - 16} ${cloudX + 148} ${cloudY + 43} ${cloudX + 102} ${cloudY + 53} H${cloudX - 76} C${cloudX - 103} ${cloudY + 53} ${cloudX - 118} ${cloudY + 43} ${cloudX - 112} ${cloudY + 26} Z`} fill="#dce9ec" stroke="#466b73" strokeWidth="5" />
        <text x={cloudX + 8} y={cloudY + 20} textAnchor="middle" fill="#385c64" fontSize="23" fontWeight="800">{geometry.cloud.label}</text>
      </g>
      <g data-visual-cue="rain-arrow-down">
        <path className="water-cycle-flow" d={`M${cloudX} ${cloudY + 58} V${soilY - 42}`} fill="none" stroke="#397d9d" strokeWidth="8" strokeLinecap="round" strokeDasharray="13 12" />
        <path d={`M${cloudX - 14} ${soilY - 62} L${cloudX} ${soilY - 42} L${cloudX + 14} ${soilY - 62}`} fill="none" stroke="#397d9d" strokeWidth="7" strokeLinecap="round" />
        <path d={`M${cloudX - 48} ${cloudY + 78} q-12 18 0 29 q12 -11 0 -29 M${cloudX + 48} ${cloudY + 94} q-12 18 0 29 q12 -11 0 -29`} fill="#79b7ca" stroke="#397d9d" strokeWidth="2" />
        <text x={cloudX + 24} y={(cloudY + soilY) / 2} fill="#2f6b88" fontSize="21" fontWeight="800">{geometry.rain.label}</text>
      </g>
      <g data-visual-cue="soil-infiltration">
        <path d={`M90 ${soilY} Q300 ${soilY - 18} 510 ${soilY} T930 ${soilY} V570 H90 Z`} fill="#d7bd83" stroke="#685335" strokeWidth="5" />
        <path d={`M110 ${soilY + 45} q75 -32 150 0 t150 0 t150 0 t150 0 t150 0`} fill="none" stroke="#9b7748" strokeWidth="4" strokeDasharray="18 12" />
        <path className="water-cycle-flow" d={`M${cloudX} ${soilY + 8} C${cloudX + 20} ${soilY + 55} ${waterX - 38} ${waterY - 35} ${waterX} ${waterY - 12}`} fill="none" stroke="#438ca8" strokeWidth="7" strokeDasharray="10 11" />
        <text x={cloudX - 92} y={soilY + 31} fill="#604b30" fontSize="22" fontWeight="800">{geometry.soil.label}</text>
        <text x={cloudX + 55} y={soilY + 65} fill="#326f87" fontSize="18" fontWeight="700">soaks in</text>
      </g>
      <g data-visual-cue="underground-water">
        <path d={`M${waterX - 92} ${waterY} q23 -22 46 0 t46 0 t46 0 t46 0 v34 h-184 Z`} fill="#8bc7d6" stroke="#397d9d" strokeWidth="4" />
        <text x={waterX} y={waterY + 27} textAnchor="middle" fill="#285f78" fontSize="21" fontWeight="800">{geometry.water.label}</text>
      </g>
      <g data-visual-cue="evaporation-arrow-up closed-water-loop">
        <path className="water-cycle-flow water-cycle-return" d={`M${waterX - 88} ${waterY + 5} C${evaporationX - 15} ${waterY + 40} ${evaporationX - 70} ${cloudY + 110} ${cloudX - 98} ${cloudY + 38}`} fill="none" stroke="#a05b88" strokeWidth="8" strokeLinecap="round" strokeDasharray="15 11" />
        <path d={`M${cloudX - 112} ${cloudY + 61} L${cloudX - 98} ${cloudY + 38} L${cloudX - 75} ${cloudY + 51}`} fill="none" stroke="#a05b88" strokeWidth="7" strokeLinecap="round" />
        <path d={`M${evaporationX - 18} ${evaporationY + 22} q18 -25 0 -50 M${evaporationX + 15} ${evaporationY + 12} q18 -25 0 -50`} fill="none" stroke="#bd79a3" strokeWidth="5" strokeLinecap="round" />
        <text x={evaporationX} y={evaporationY + 55} textAnchor="middle" fill="#84476f" fontSize="21" fontWeight="800">{geometry.evaporation.label}</text>
      </g>
    </g>;
  }
  if (isFractionSubtractionRelation(relation, entities)) {
    if (relation.kind !== "subtracts") return null;
    const geometry = fractionSubtractionGeometry(relations, entities);
    if (!geometry) return null;
    const initial = geometry.initial.fraction!;
    const removed = geometry.removed.fraction!;
    const remainder = geometry.remainder.fraction!;
    const centers = [215, 505, 795];
    const cy = 315;
    const radius = 105;
    const sector = (cx: number, index: number, denominator: number, fill: string, opacity = 1) => {
      const start = -Math.PI / 2 + index * Math.PI * 2 / denominator;
      const end = start + Math.PI * 2 / denominator;
      const x1 = cx + Math.cos(start) * radius;
      const y1 = cy + Math.sin(start) * radius;
      const x2 = cx + Math.cos(end) * radius;
      const y2 = cy + Math.sin(end) * radius;
      return <path key={`${cx}-${index}`} d={`M${cx} ${cy} L${x1} ${y1} A${radius} ${radius} 0 ${denominator === 2 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={fill} opacity={opacity} stroke="#614a2a" strokeWidth="3" />;
    };
    return <g className="fraction-subtraction-annotation" aria-label={`${geometry.initial.label} of ${geometry.whole.label} minus ${geometry.removed.label} leaves ${geometry.remainder.label}`}>
      <g data-visual-cue="quartered-circle three-initially-shaded">
        {Array.from({ length: initial.denominator }, (_, index) => sector(centers[0], index, initial.denominator, index < initial.numerator ? "#e8ad4f" : "#f8f1df"))}
        <text x={centers[0]} y={cy + 145} textAnchor="middle" fill="#63481f" fontSize="24" fontWeight="800">start: {geometry.initial.label}</text>
      </g>
      <g data-visual-cue="one-slice-removed">
        {Array.from({ length: removed.denominator }, (_, index) => sector(centers[1], index, removed.denominator, index < removed.numerator ? "#d8785e" : "#f8f1df", index < removed.numerator ? .95 : .35))}
        <path d={`M${centers[1] - 27} ${cy - 27} l54 54 M${centers[1] + 27} ${cy - 27} l-54 54`} stroke="#812f28" strokeWidth="8" strokeLinecap="round" />
        <text x={centers[1]} y={cy + 145} textAnchor="middle" fill="#853a2c" fontSize="24" fontWeight="800">remove: {geometry.removed.label}</text>
      </g>
      <g data-visual-cue="two-quarters-remain remainder-label">
        {Array.from({ length: initial.denominator }, (_, index) => sector(centers[2], index, initial.denominator, index < initial.numerator - removed.numerator ? "#71b79d" : "#f8f1df"))}
        <text x={centers[2]} y={cy + 145} textAnchor="middle" fill="#285f50" fontSize="26" fontWeight="900">left: {geometry.remainder.label}</text>
        <text x={centers[2]} y={cy + 177} textAnchor="middle" fill="#477568" fontSize="18">{remainder.numerator}/{remainder.denominator} of {geometry.whole.label}</text>
      </g>
      <text x="360" y={cy + 8} textAnchor="middle" fill="#6f4e28" fontSize="44" fontWeight="800">−</text>
      <text x="650" y={cy + 8} textAnchor="middle" fill="#366b5c" fontSize="44" fontWeight="800">=</text>
    </g>;
  }
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

  if (["force", "surface", "container", "contained", "geometry", "measurement", "watercourse", "elevated-source", "water-destination", "circulation-source", "circulation-destination", "circulation-payload", "circulation-enrichment", "trajectory-object", "trajectory-apex", "trajectory-force", "control-caller", "control-function", "control-call-site", "fraction-whole", "fraction-initial", "fraction-removed", "fraction-remainder", "cycle-cloud", "cycle-rain", "cycle-soil", "cycle-water", "cycle-evaporation", "lifecycle-start", "lifecycle-intermediate", "lifecycle-final", "optics-incident", "optics-surface", "optics-reflected", "stack-container", "stack-items", "stack-top", "triangle-shape", "triangle-angles", "triangle-sum", "plate-left", "plate-right", "plate-mountain", "routine-first", "routine-middle", "routine-final", "indexed-collection", "indexed-cells", "indexed-values", "indexed-start", "linked-collection", "linked-first", "linked-middle", "linked-final", "control-entry", "control-condition", "control-true", "control-false", "control-step", "control-exit"].includes(entity.visualRole ?? "")) {
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
