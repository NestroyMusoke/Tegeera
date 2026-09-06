import type { DoodleCommand, DoodleScript, EntityKind, SceneEntity, SceneState, SceneContext } from "./schema";
import { applyDoodleScript } from "./scene";
import { nextPosition } from "./layout";
import { isMotion, motionGeometry } from "./motion";
import { analyzeTeacherInput } from "./semanticFrame";
import { entityKindForAlias, ordinalWords, parseCountToken, parseEntityPhrase } from "./lexicon";

export type Interpretation =
  | { ok: true; script: DoodleScript }
  | { ok: false; message: string; clause: string };
class Clarification extends Error {}

function nounPhrase(phrase: string): { kind: EntityKind; count: number } {
  const parsed = parseEntityPhrase(phrase);
  if (!parsed) throw new Clarification(`I cannot yet represent “${phrase}”. Please describe its objects separately.`);
  if (parsed.count < 1 || parsed.count > 12) throw new Clarification("Use a count from one to twelve; I have not changed the scene.");
  if (!parsed.countToken && (parsed.noun.endsWith("s") || parsed.noun === "people")) throw new Clarification(`How many ${parsed.noun} should I draw?`);
  return { kind: parsed.kind, count: parsed.count };
}

function resolve(phrase: string, scene: SceneState): SceneEntity {
  const normalized = phrase.replace(/^the /, "");
  if (/^(she|he|her|him|they|them|it|that)$/.test(normalized)) {
    const ids = /^(it|that)$/.test(normalized)
      ? (scene.context?.objectIds.length ? scene.context.objectIds : scene.context?.subjectIds ?? [])
      : scene.context?.subjectIds ?? [];
    const candidates = scene.entities.filter((entity) => ids.includes(entity.id));
    if (candidates.length === 1 && (/^(it|that)$/.test(normalized) || ["student", "teacher", "person"].includes(candidates[0].kind))) return candidates[0];
  }
  const exact = scene.entities.filter((entity) => entity.label?.toLowerCase() === normalized);
  if (exact.length === 1) return exact[0];
  const tokens = normalized.split(" ");
  const ordinal = ordinalWords.indexOf(tokens[0] as typeof ordinalWords[number]);
  const kind = entityKindForAlias(tokens.at(-1) ?? "");
  const candidates = kind ? scene.entities.filter((entity) => entity.kind === kind) : [];
  if (ordinal >= 0 && tokens.length === 2 && candidates[ordinal]) return candidates[ordinal];
  if (tokens.length === 1 && candidates.length === 1) return candidates[0];
  if (/^(it|that)$/.test(normalized) && scene.entities.length === 1) return scene.entities[0];
  throw new Clarification(candidates.length > 1
    ? `Which ${kind}? Say “the first ${kind}” or “the second ${kind}”.`
    : `I cannot identify “${phrase}” in this scene. Name an existing object.`);
}

export function interpretTeacherText(input: string, scene: SceneState): Interpretation {
  const commands: DoodleCommand[] = [];
  let working = scene;
  let currentClause = input;
  let context: SceneContext | undefined = scene.context;
  const makeScript = (): DoodleScript => ({
    schemaVersion: "1.4.0", sceneId: scene.sceneId, revision: scene.revision + 1, context,
    confidence: 1, sourceText: input, commands
  });
  const append = (command: DoodleCommand) => {
    commands.push(command);
    working = applyDoodleScript(scene, makeScript());
  };
  const create = (phrase: string): string[] => {
    const spec = nounPhrase(phrase);
    const ids: string[] = [];
    for (let i = 0; i < spec.count; i++) {
      const position = nextPosition(working.entities);
      if (!position) throw new Clarification("There is no readable space left. Remove an object or start a new scene.");
      let number = 1;
      while (working.entities.some((entity) => entity.id === `${spec.kind}-${number}`)) number++;
      const id = `${spec.kind}-${number}`;
      append({ action: "create", entity: {
        id, kind: spec.kind, label: `${spec.kind} ${number}`, ...position,
        scale: 1, direction: "right", highlighted: false
      } });
      ids.push(id);
    }
    return ids;
  };
  const focus = (subjectIds: string[], objectIds: string[] = []) => {
    context = { subjectIds, objectIds };
    working = applyDoodleScript(scene, makeScript());
  };
  const relate = (kind: "shares" | "owns" | "toward" | "away" | "queuedFor", sourceIds: string[], targetIds: string[]) => {
    append({ action: "relate", relation: {
      id: `relation-${scene.revision + 1}-${commands.length}`, kind, sourceIds, targetIds
    } });
  };
  const stopMotion = (actorId: string) => {
    for (const relation of (working.relations ?? []).filter((item) => isMotion(item) && item.sourceIds.includes(actorId))) {
      append({ action: "unrelate", relationId: relation.id });
    }
  };
  try {
    if (!input.trim() || input.length > 500) throw new Clarification("Explain one short scene or change, up to 500 characters.");
    const semanticInput = analyzeTeacherInput(input);
    if (!semanticInput.frames.length) throw new Clarification("Explain one short scene or change, up to 500 characters.");
    for (const frame of semanticInput.frames) {
      currentClause = frame.sourceText.toLowerCase();
      const text = frame.normalizedText;
      if (/^(?:clear(?: everything| the scene)?|erase everything|start over)$/.test(text)) {
        append({ action: "clear" }); focus([]); continue;
      }
      const queue = text.match(/^(.+?) (?:are )?waiting in (?:a|the) cpu (?:ready )?queue$/)
        ?? text.match(/^(?:a|the) cpu (?:ready )?queue (?:has|contains) (.+)$/);
      if (queue) {
        const spec = nounPhrase(queue[1]);
        if (spec.kind !== "process") throw new Clarification("A CPU ready queue contains processes. Say how many processes are waiting.");
        if (spec.count > 4) throw new Clarification("Show one to four processes so the CPU queue stays readable.");
        const processes = create(queue[1]);
        const cpu = create("a cpu");
        relate("queuedFor", processes, cpu);
        focus(processes, cpu);
        continue;
      }
      const motion = text.match(/^(.+?) (approaches|approaching|moves? towards?|moving towards?|drives? towards?|driving towards?|walks? towards?|walking towards?|moves? away from|moving away from|drives? away from|driving away from|walks? away from|walking away from) (.+)$/);
      if (motion) {
        const participant = (phrase: string, actor: boolean) => {
          if (/^(a|an|one) /.test(phrase)) return create(phrase)[0];
          if (actor && phrase === "it" && context?.subjectIds.length === 1) return context.subjectIds[0];
          return resolve(phrase, working).id;
        };
        const actorId = participant(motion[1], true);
        const targetId = participant(motion[3], false);
        if (actorId === targetId) throw new Clarification("An object cannot approach itself. Name the other object.");
        const actor = working.entities.find((entity) => entity.id === actorId)!;
        if (/^driv/.test(motion[2]) && actor.kind !== "car") throw new Clarification("Which car is moving? Name the vehicle.");
        if (/^walk/.test(motion[2]) && !["person", "student", "teacher"].includes(actor.kind)) throw new Clarification("Which person is walking?");
        stopMotion(actorId);
        relate(motion[2].includes("away") ? "away" : "toward", [actorId], [targetId]);
        focus([actorId], [targetId]);
        continue;
      }
      const reverse = text.match(/^(?:make )?(.+?) (?:go|goes|move|moves) (?:the )?other way$/);
      if (reverse) {
        const actorId = reverse[1] === "it" && context?.subjectIds.length === 1 ? context.subjectIds[0] : resolve(reverse[1], working).id;
        const previous = (working.relations ?? []).filter((relation) => isMotion(relation) && relation.sourceIds[0] === actorId);
        if (previous.length !== 1) throw new Clarification("Which direction is being reversed? First describe what it is moving toward or away from.");
        stopMotion(actorId);
        relate(previous[0].kind === "toward" ? "away" : "toward", [actorId], previous[0].targetIds);
        focus([actorId], previous[0].targetIds);
        continue;
      }
      const first = text.match(/^(?:what if )?(.+?) (?:goes|went) first$/)
        ?? text.match(/^move (.+?) to (?:the )?(?:front|first position)$/);
      if (first) {
        const process = resolve(first[1], working);
        const queues = (working.relations ?? []).filter((relation) => relation.kind === "queuedFor" && relation.sourceIds.includes(process.id));
        if (process.kind !== "process" || queues.length !== 1) throw new Clarification("Which queued process should go first? Name its position in the CPU queue.");
        const previous = queues[0];
        const ordered = [process.id, ...previous.sourceIds.filter((id) => id !== process.id)];
        const row = working.entities.find((entity) => entity.id === previous.sourceIds[0])!.y;
        ordered.forEach((targetId, index) => append({ action: "move", targetId, x: 12 + index * 18, y: row, direction: "right" }));
        append({ action: "unrelate", relationId: previous.id });
        append({ action: "relate", relation: { ...previous, sourceIds: ordered } });
        focus(ordered, previous.targetIds);
        continue;
      }
      const stop = text.match(/^stop (.+)$/);
      if (stop) {
        const actorId = stop[1] === "it" && context?.subjectIds.length === 1 ? context.subjectIds[0] : resolve(stop[1], working).id;
        const previous = (working.relations ?? []).find((relation) => isMotion(relation) && relation.sourceIds[0] === actorId);
        if (!previous) throw new Clarification("That object has no current motion to stop.");
        const actor = working.entities.find((entity) => entity.id === actorId)!;
        const target = working.entities.find((entity) => entity.id === previous.targetIds[0]);
        const geometry = target ? motionGeometry(actor, target, previous.kind as "toward" | "away") : null;
        if (geometry) append({ action: "update", targetId: actorId, direction: geometry.direction });
        stopMotion(actorId); focus([actorId]); continue;
      }
      const correction = text.match(/^(?:make that|make it|change (?:that|it) to) (\w+)(?: (\w+))?$/);
      if (correction) {
        const amount = parseCountToken(correction[1]);
        if (amount < 1 || amount > 10) throw new Clarification("Choose a count from one to ten for this scene.");
        const explicitKind = correction[2] ? entityKindForAlias(correction[2]) : undefined;
        if (correction[2] && !explicitKind) throw new Clarification("Which existing type of object should change?");
        const subjects = working.entities.filter((entity) => context?.subjectIds.includes(entity.id));
        const objects = working.entities.filter((entity) => context?.objectIds.includes(entity.id));
        const members = explicitKind
          ? subjects.some((entity) => entity.kind === explicitKind)
            ? subjects.filter((entity) => entity.kind === explicitKind)
            : objects.filter((entity) => entity.kind === explicitKind)
          : subjects;
        if (!members.length || new Set(members.map((entity) => entity.kind)).size !== 1) throw new Clarification("Which group should change? Name the objects in the last explanation.");
        if (amount === members.length) throw new Clarification(`That group already has ${amount} objects.`);
        const ids = members.map((entity) => entity.id);
        const affected = (working.relations ?? []).filter((relation) => [...relation.sourceIds, ...relation.targetIds].some((id) => ids.includes(id)));
        if (affected.some((relation) => relation.kind === "queuedFor") && amount > 4) throw new Clarification("Show one to four processes so the CPU queue stays readable.");
        if (affected.length > 1 || affected.some((relation) => {
          const side = relation.sourceIds.some((id) => ids.includes(id)) ? relation.sourceIds : relation.targetIds;
          return side.length !== ids.length || side.some((id) => !ids.includes(id)) || (relation.kind === "owns" && side === relation.sourceIds);
        })) throw new Clarification("Those objects have different roles or owners. Change one explicitly instead.");
        const retained = ids.slice(0, amount);
        if (amount > ids.length) retained.push(...create(`${amount - ids.length} ${members[0].kind}`));
        for (const id of ids.slice(amount)) append({ action: "remove", targetId: id });
        for (const relation of affected) {
          append({ action: "unrelate", relationId: relation.id });
          const sourceChanged = relation.sourceIds.some((id) => ids.includes(id));
          const updated = { ...relation,
            sourceIds: sourceChanged ? retained : relation.sourceIds,
            targetIds: relation.targetIds.some((id) => ids.includes(id)) ? retained : relation.targetIds
          };
          append({ action: "relate", relation: updated });
          if (updated.kind === "queuedFor" && sourceChanged) {
            const row = members[0].y;
            retained.forEach((targetId, index) => append({ action: "move", targetId, x: 12 + index * 18, y: row, direction: "right" }));
            append({ action: "move", targetId: updated.targetIds[0], x: 12 + retained.length * 18, y: row, direction: "right" });
          }
        }
        focus(context?.subjectIds.some((id) => ids.includes(id)) ? retained : context?.subjectIds ?? [],
          context?.objectIds.some((id) => ids.includes(id)) ? retained : context?.objectIds ?? []);
        continue;
      }
      const transfer = text.match(/^(.+?) gives (.+?) to (.+)$/);
      if (transfer) {
        const giver = resolve(transfer[1], working);
        const recipient = resolve(transfer[3], working);
        if (giver.id === recipient.id) throw new Clarification("The giver and recipient are the same person.");
        const possession = transfer[2].match(/^(her|his|their) (\w+)$/);
        let object: SceneEntity;
        if (possession) {
          if (resolve(possession[1] === "their" ? "they" : possession[1], working).id !== giver.id) throw new Clarification("Whose object is being given?");
          const ownedIds = (working.relations ?? []).filter((relation) => relation.kind === "owns" && relation.sourceIds[0] === giver.id).flatMap((relation) => relation.targetIds);
          const matches = working.entities.filter((entity) => entity.kind === entityKindForAlias(possession[2]) && ownedIds.includes(entity.id));
          if (matches.length !== 1) throw new Clarification("Which owned object should be given? Name it explicitly.");
          object = matches[0];
        } else object = resolve(transfer[2], working);
        const links = (working.relations ?? []).filter((relation) => relation.targetIds.includes(object.id));
        if (links.length !== 1 || links[0].kind !== "owns" || links[0].sourceIds[0] !== giver.id) throw new Clarification("That object is not solely owned by the giver. Clarify its ownership first.");
        const old = links[0];
        append({ action: "unrelate", relationId: old.id });
        const remaining = old.targetIds.filter((id) => id !== object.id);
        if (remaining.length) append({ action: "relate", relation: { ...old, targetIds: remaining } });
        relate("owns", [recipient.id], [object.id]);
        focus([giver.id], [object.id]);
        continue;
      }
      const move = text.match(/^(move|turn|face) (.+?) (?:to the )?(left|right|up|down)$/);
      if (move) {
        const target = resolve(move[2], working);
        stopMotion(target.id);
        const direction = move[3] as "left" | "right" | "up" | "down";
        if (move[1] !== "move") append({ action: "update", targetId: target.id, direction });
        else append({ action: "move", targetId: target.id, direction,
          x: target.kind === "cpu" && direction === "right" ? Math.min(92, target.x + 18) : target.x + (direction === "left" ? -18 : direction === "right" ? 18 : 0),
          y: target.y + (direction === "up" ? -32 : direction === "down" ? 32 : 0)
        });
        focus([target.id]);
        continue;
      }
      const remove = text.match(/^(?:remove|delete|erase) (.+)$/);
      if (remove) {
        append({ action: "remove", targetId: resolve(remove[1], working).id });
        focus(working.context?.subjectIds ?? [], working.context?.objectIds ?? []); continue;
      }
      const highlight = text.match(/^highlight (.+)$/);
      if (highlight) {
        const targets = /^(they|them)$/.test(highlight[1]) ? context?.subjectIds ?? [] : [resolve(highlight[1], working).id];
        if (!targets.length) throw new Clarification("Which group should I highlight?");
        for (const targetId of targets) append({ action: "update", targetId, highlighted: true });
        focus(targets);
        continue;
      }
      const rename = text.match(/^rename (.+?) to (.{1,60})$/);
      if (rename) {
        const targetId = resolve(rename[1], working).id;
        append({ action: "update", targetId, label: rename[2] }); focus([targetId]); continue;
      }
      const arrival = text.match(/^another (\w+) (?:arrives|joins)(?:,? but (?:she|he|they) already (?:has|have) (?:her|his|their) own (\w+)| with (?:her|his|their|an?) (?:own )?(\w+))?$/);
      if (arrival) {
        const owners = create(`one ${arrival[1]}`);
        const object = arrival[2] ?? arrival[3];
        if (object) relate("owns", owners, create(`one ${object}`));
        focus(owners, object ? working.relations?.at(-1)?.targetIds ?? [] : []);
        continue;
      }
      const distributed = text.match(/^(.+?) each (?:has|have|owns|own|having|with) (.+)$/)
        ?? text.match(/^(.+?) (?:has|have|owns|own) (.+?) each$/);
      if (distributed) {
        const phrase = distributed[1];
        let owners: string[];
        if (phrase === "they") owners = context?.subjectIds ?? [];
        else if (phrase.startsWith("the ")) {
          const noun = phrase.slice(4);
          const kind = entityKindForAlias(noun);
          if (!kind || !(noun.endsWith("s") || noun === "people")) throw new Clarification("Name the group, for example ‘the students each have a book’.");
          owners = working.entities.filter((entity) => entity.kind === kind).map((entity) => entity.id);
        } else owners = create(phrase);
        const members = working.entities.filter((entity) => owners.includes(entity.id));
        if (!members.length || new Set(members.map((entity) => entity.kind)).size !== 1) throw new Clarification("Which group has an item each? Name one type of object.");
        const spec = nounPhrase(distributed[2]);
        if (working.entities.length + owners.length * spec.count > 10) throw new Clarification("Those individual items would exceed the ten-object scene limit. Use a smaller group or fewer items each.");
        const objects: string[] = [];
        for (const owner of owners) {
          const owned = create(distributed[2]);
          relate("owns", [owner], owned);
          objects.push(...owned);
        }
        focus(owners, objects);
        continue;
      }
      const semanticRelation = frame.relations[0];
      if (semanticRelation && (semanticRelation.predicate === "shares" || semanticRelation.predicate === "owns")) {
        const sourceMentionId = semanticRelation.sourceMentionIds[0];
        const targetMentionId = semanticRelation.targetMentionIds[0];
        const mentionText = (mentionId: string) => frame.entities.find((mention) => mention.mentionId === mentionId)?.text
          ?? frame.references.find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const sourcePhrase = mentionText(sourceMentionId);
        const targetPhrase = mentionText(targetMentionId);
        const source = /^(they|them)$/.test(sourcePhrase) ? context?.subjectIds ?? []
          : /^(she|he)$/.test(sourcePhrase) ? [resolve(sourcePhrase, working).id]
          : sourcePhrase.startsWith("the ")
          ? [resolve(sourcePhrase, working).id] : create(sourcePhrase);
        const kind = semanticRelation.predicate;
        if (!source.length || (/^(they|them)$/.test(sourcePhrase) && new Set(working.entities.filter((entity) => source.includes(entity.id)).map((entity) => entity.kind)).size !== 1)) throw new Clarification("Which group does that refer to?");
        if (kind === "owns" && source.length !== 1) throw new Clarification("Does each person own an item, or do they share the items?");
        const targets = create(targetPhrase);
        relate(kind, source, targets); focus(source, targets); continue;
      }
      const descriptionPhrases = frame.intent === "describe" && !frame.relations.length
        ? frame.entities.map((mention) => mention.text)
        : text.replace(/ (?:waiting )?in a (?:queue|line)$/, "").split(/\s+and\s+/);
      const created = descriptionPhrases.flatMap((phrase) => create(phrase));
      focus(created);
    }
    return { ok: true, script: makeScript() };
  } catch (error) {
    if (!(error instanceof Clarification)) throw error;
    return { ok: false, message: error.message, clause: currentClause };
  }
}
