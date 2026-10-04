// Source-grounding checks shared by the hosted service and the browser compiler.
// These are deliberately narrow: only explicit, high-signal relationship language
// is enforced. Unknown prose is left to the planner, not guessed into a diagram.
const words = (value) => String(value).toLowerCase().match(/[a-z]+/g) ?? [];
const forms = (word) => {
  const value = word.toLowerCase();
  return new Set([value, value.replace(/s$/, ""), value.replace(/ies$/, "y")]);
};
const same = (a, b) => [...forms(a)].some((form) => forms(b).has(form));

function matchingObject(noun, objects) {
  const matches = objects.filter((object) => words(object.label).some((part) => same(part, noun)));
  return matches.length === 1 ? matches[0] : null;
}

function matchingPhrase(phrase, objects) {
  const requested = words(phrase);
  if (!requested.length) return null;
  const matches = objects.filter((object) => {
    const label = words(object.label);
    return requested.every((part) => label.some((word) => same(word, part)));
  });
  return matches.length === 1 ? matches[0] : null;
}

function priorMention(prefix, objects, excludedIds) {
  let best = null;
  for (const object of objects) {
    if (excludedIds.has(object.id)) continue;
    for (const part of words(object.label)) {
      const matches = [...prefix.matchAll(/[a-z]+/g)].filter((match) => same(match[0], part));
      const last = matches.at(-1);
      if (last && (!best || last.index > best.index)) best = { object, index: last.index };
    }
  }
  return best?.object ?? null;
}

const movingSubjectName = (prefix) => prefix.match(/^\s*(?:(?:a|an|the)\s+)?([a-z][a-z -]{0,39}?)\s+(?:flows?|moves?|travels?|passes?|goes?|runs?|rises?)\b/)?.[1] ?? null;
function movingSubject(prefix, objects) {
  const subject = movingSubjectName(prefix);
  return subject ? matchingPhrase(subject, objects) : null;
}

function explicitTravelRoute(utterance, objects) {
  const match = utterance.match(/^\s*(?:(?:a|an|the)\s+)?([a-z][a-z -]{0,39}?)\s+(?:carries|transports|brings|takes|moves|pushes|pulls)\b.{1,65}?\bacross\s+(?:(?:a|an|the)\s+)?([a-z][a-z-]*)\b.{0,45}?\bto\s+(?:(?:a|an|the)\s+)?([a-z][a-z-]*)\b/);
  if (!match) return null;
  const actor = matchingPhrase(match[1], objects);
  const passage = matchingObject(match[2], objects);
  const destination = matchingObject(match[3], objects);
  return actor && passage && destination && new Set([actor.id, passage.id, destination.id]).size === 3
    ? { actor, passage, destination } : null;
}

function* explicitPassages(utterance, objects, edges) {
  for (const match of utterance.matchAll(/\bthrough\s+(?:(?:its|their|the|a|an|his|her)\s+)?([a-z][a-z-]*)\b/g)) {
    const passage = matchingObject(match[1], objects);
    const prefix = utterance.slice(Math.max(0, match.index - 75), match.index).split(/[,.!?;]/).at(-1) ?? "";
    const originName = [...prefix.matchAll(/\bfrom\s+(?:(?:its|their|the|a|an|his|her)\s+)?([a-z][a-z-]*)\b/g)].at(-1)?.[1];
    const origin = originName ? matchingObject(originName, objects) : null;
    const excluded = new Set(passage ? [passage.id] : []);
    if (passage) for (const edge of edges) {
      if (edge.from === passage.id && (edge.kind === "partOf" || edge.label?.toLowerCase() === "part of")) excluded.add(edge.to);
    }
    const subjectName = movingSubjectName(prefix);
    const subject = subjectName ? matchingPhrase(subjectName, objects) : null;
    const payloadName = [...prefix.matchAll(/\b(?:pours?|sends?|pushes?|draws?|carries?|moves?|transports?)\s+(?:(?:a|an|the)\s+)?([a-z][a-z-]*)\s+from\b/g)].at(-1)?.[1];
    const payload = payloadName ? matchingObject(payloadName, objects) : null;
    const source = subject ?? payload ?? origin ?? priorMention(prefix, objects, excluded);
    const remainder = utterance.slice(match.index + match[0].length);
    const recipientName = remainder.match(/^\s+into\s+(?:(?:its|their|the|a|an)\s+)?([a-z][a-z-]*)\b/)?.[1]
      ?? [...prefix.matchAll(/\binto\s+(?:(?:its|their|the|a|an)\s+)?([a-z][a-z-]*)\b/g)].at(-1)?.[1];
    yield { passageName: match[1], passage, source, subjectName, subject, payloadName, payload, originName, origin, recipientName,
      recipient: recipientName ? matchingObject(recipientName, objects) : null };
  }
}

/** Add only explicit, unique, missing passage arrows between existing roles. */
export function completeExplicitPassages(text, candidate) {
  if (!candidate || candidate.mode !== "replace" || candidate.confidence < 0.58
    || !Array.isArray(candidate.objects) || !Array.isArray(candidate.connections)) return candidate;
  const specialistKinds = new Set(["calls", "returnsControlTo", "risesTo", "fallsFrom", "accelerates",
    "pumpsTo", "returnsTo", "carries", "appliedTo", "opposes", "contacts"]);
  if (candidate.connections.some((edge) => specialistKinds.has(edge.kind))) return candidate;
  const edges = [...candidate.connections];
  let changed = false;
  const utterance = String(text).toLowerCase().replace(/[’‘]/g, "'");
  const route = explicitTravelRoute(utterance, candidate.objects);
  if (route && edges.some((edge) => edge.from === route.actor.id && edge.to === route.passage.id)
    && edges.some((edge) => edge.from === route.passage.id && edge.to === route.destination.id)) {
    // A complete actor -> passage -> destination path already communicates
    // arrival. A direct shortcut is redundant and often collides with the
    // two essential arrows, so compact only this explicitly grounded route.
    for (let index = edges.length - 1; index >= 0; index -= 1) {
      const edge = edges[index];
      if (edge.from === route.actor.id && edge.to === route.destination.id
        && (!edge.kind || edge.kind === "relatesTo")
        && /^(?:reaches|arrives? at|goes to|travels to)$/i.test(edge.label?.trim() ?? "")) {
        edges.splice(index, 1); changed = true;
      }
    }
  }
  for (const { source, passage, origin, recipient } of explicitPassages(utterance, candidate.objects, edges)) {
    // "Rain from roof" names the moving thing's starting location. A model
    // sometimes invents roof→rain "feeds", or emits a bare "from" arrow.
    // Neither is licensed by that clause; the explicit roof→passage path below
    // carries the location. Keep a specific origin→subject action only when
    // its predicate appears in the teacher's own words.
    if (source && origin && passage && source.id !== origin.id) {
      const spoken = words(utterance);
      for (let index = edges.length - 1; index >= 0; index -= 1) {
        const edge = edges[index];
        if (edge.from !== origin.id || edge.to !== source.id
          || (edge.kind && edge.kind !== "relatesTo") || typeof edge.label !== "string"
          || /\b(?:comes?|originates?|flows?)\s+from\b/i.test(edge.label)) continue;
        const labelWords = words(edge.label);
        const unsupported = edge.label.trim().toLowerCase() === "from"
          || !labelWords.some((word) => spoken.some((said) => same(word, said)));
        if (unsupported) { edges.splice(index, 1); changed = true; }
      }
    }
    if (source && passage && source.id !== passage.id
      && !edges.some((edge) => edge.from === source.id && edge.to === passage.id) && edges.length < 12) {
      edges.push({ from: source.id, to: passage.id, label: "passes through" }); changed = true;
    }
    if (origin && passage && origin.id !== passage.id && origin.id !== source?.id
      && !edges.some((edge) => edge.from === origin.id && edge.to === passage.id) && edges.length < 12) {
      edges.push({ from: origin.id, to: passage.id, label: "leads through" }); changed = true;
    }
    if (passage && recipient && passage.id !== recipient.id
      && !edges.some((edge) => edge.from === passage.id && edge.to === recipient.id) && edges.length < 12) {
      edges.push({ from: passage.id, to: recipient.id, label: "enters" }); changed = true;
    }
  }
  return changed ? { ...candidate, connections: edges } : candidate;
}

/** @returns {string | null} A repairable general constraint, or no proven omission. */
export function sourceConstraintIssue(text, candidate) {
  if (!candidate || !Array.isArray(candidate.objects) || !Array.isArray(candidate.connections)) return null;
  const objects = candidate.objects;
  const edges = candidate.connections;
  const utterance = String(text).toLowerCase().replace(/[’‘]/g, "'");
  // Old planner prompts contained illustrative source/destination objects.
  // A model can copy their labels and pass JSON validation while representing
  // none of the teacher's nouns. IDs may be arbitrary; visible labels may not.
  const spoken = new Set(words(utterance));
  const copiedPlaceholder = objects.find((object) => ["source", "destination", "target"].includes(object.label?.trim().toLowerCase())
    && !spoken.has(object.label.trim().toLowerCase()));
  if (copiedPlaceholder && candidate.confidence >= 0.58) {
    return `The visible label ${copiedPlaceholder.label} was not in the teacher's explanation; use grounded participants, not schema placeholders.`;
  }
  // An arrow labelled "originates from" is grammatical from the moving item
  // back to its origin. The reverse arrow asserts the opposite fact, even if
  // endpoint-only graph scoring would call the scene complete.
  for (const match of utterance.matchAll(/\b(?:flows?|comes?|originates?|moves?|travels?|runs?|rises?)\s+from\s+(?:(?:a|an|the)\s+)?([a-z][a-z-]*)\b/g)) {
    const clause = utterance.slice(0, match.index + match[0].length).split(/[,.!?;]/).at(-1) ?? "";
    const mover = movingSubject(clause, objects);
    const origin = matchingObject(match[1], objects);
    if (mover && origin && mover.id !== origin.id && edges.some((edge) =>
      edge.from === origin.id && edge.to === mover.id
      && /\b(?:originates?|comes?|flows?)\s+from\b/i.test(edge.label ?? ""))) {
      return `The link says ${origin.id} originates from ${mover.id}, reversing the stated source ${origin.id}.`;
    }
  }
  // A named passage is not equivalent to a direct source-to-whole arrow.
  // Resolve the nearest *named* source in the same clause; if either role is
  // uncertain, avoid imposing a relation that the teacher may not have meant.
  for (const { passageName, passage, source, subjectName, subject, payloadName, payload, originName, origin, recipientName, recipient } of explicitPassages(utterance, objects, edges)) {
    if (subjectName && !subject && candidate.confidence >= 0.58) {
      return `The explanation names ${subjectName} as the moving subject, but that visible role is missing.`;
    }
    if (payloadName && !payload && candidate.confidence >= 0.58) {
      return `The explanation names ${payloadName} as the moving payload, but that visible role is missing.`;
    }
    if (!source && !origin) continue;
    if (!passage) return `The explanation names a passage through ${passageName}, but that visible part is missing.`;
    if (originName && !origin) return `The explanation starts from ${originName}, but that visible origin is missing.`;
    if (source && !edges.some((edge) => (edge.from === source.id && edge.to === passage.id)
      || (edge.to === passage.id && edge.via === source.id && edge.kind === "pumpsTo"))) {
      return `The explanation sends ${source.id} through ${passage.id}; draw a directed link to the passage, not only to the whole.`;
    }
    if (originName && origin && origin.id !== source?.id && !edges.some((edge) => edge.from === origin.id && edge.to === passage.id)) {
      return `The explanation starts from ${origin.id} before passing through ${passage.id}; connect the origin to the named passage.`;
    }
    if (recipientName) {
      if (!recipient) return `The explanation continues through ${passageName} into ${recipientName}, but the final recipient is missing.`;
      if (!edges.some((edge) => edge.from === passage.id && edge.to === recipient.id)) {
        return `The explanation continues through ${passage.id} into ${recipient.id}; complete the directed path to the final recipient.`;
      }
    }
  }
  // An applied action plus an explicitly opposing physical effect needs two
  // distinguishable force arrows, not just a generic actor-to-object caption.
  // This recognizes the diagram *relationship family*, never particular actors.
  const applied = /\b(?:push(?:es|ed|ing)?|pull(?:s|ed|ing)?)\b/.test(utterance);
  const opposition = /\b(?:friction|drag|resistance|oppos(?:e|es|ed|ing)|push(?:es|ed|ing)?\s+back|pull(?:s|ed|ing)?\s+back)\b/.test(utterance);
  if (applied && opposition && candidate.mode === "replace") {
    const required = ["appliedTo", "opposes", "contacts"];
    if (required.some((kind) => !edges.some((edge) => edge.kind === kind))) {
      return "The explanation has an applied action and an opposing effect; use a complete appliedTo/opposes/contacts force diagram with distinct force arrows and a contacted surface.";
    }
  }
  // These source contracts require an explicit multi-part relation in the
  // teacher's words. They do not infer objects from a vocabulary: the model
  // still chooses the nouns and can abstain when the utterance is ambiguous.
  // A confident generic arrow is not a substitute for the described graph.
  if (candidate.mode !== "replace" || candidate.confidence < 0.58
    || /\b(?:not|never|without|cannot|can't|doesn't|didn't)\b/.test(utterance)) return null;
  // With an explicit agent and route, a carried/transported object's own
  // movement does not replace the named agent's path. Resolve only unique
  // visible noun phrases; ambiguous clauses remain for the model to judge.
  const route = explicitTravelRoute(utterance, objects);
  if (route) {
    const { actor, passage, destination } = route;
      if (!edges.some((edge) => edge.from === actor.id && edge.to === passage.id)) {
        return `The named actor ${actor.id} travels across ${passage.id}; the carried object alone cannot replace its route.`;
      }
      if (!edges.some((edge) => edge.to === destination.id
        && (edge.from === actor.id || edge.from === passage.id))) {
        return `The named actor ${actor.id} goes to ${destination.id}; show its destination either directly or through the named passage.`;
      }
  }
  const has = (kind) => edges.some((edge) => edge.kind === kind);
  const labelledHolder = /\b(?:is|acts as|behaves like)\b.{0,60}\b(?:labeled|labelled)\b.{0,35}\b(?:holds?|contains?|stores?)\b/.test(utterance);
  if (labelledHolder && !has("contains")) {
    return "The explanation explicitly describes a labelled holder and its content; show a distinct holder→content contains relation, not a generic arrow or caption.";
  }
  if (labelledHolder) {
    const subject = utterance.match(/^(?:an?|the)\s+([a-z][a-z -]{0,39}?)\s+(?:is|acts as|behaves like)\b/)?.[1];
    if (subject) {
      const holder = matchingPhrase(subject, objects);
      if (!holder) return `The explanation names ${subject} as the labelled holder, but that visible role is missing.`;
      if (!edges.some((edge) => edge.kind === "contains" && edge.from === holder.id)) {
        return `The explanation names ${subject} as the holder; the contains link must start from that role.`;
      }
    }
  }
  const callAndReturn = /\bcall(?:s|ed|ing)?\b/.test(utterance)
    && /\b(?:comes?|returns?)\s+back\b/.test(utterance)
    && /\b(?:where\s+it\s+left\s+off|call\s+site|return\s+point)\b/.test(utterance);
  if (callAndReturn && (!has("calls") || !has("returnsControlTo"))) {
    return "The explanation describes a call and return to the original point; show distinct caller, called operation, and return point with calls and returnsControlTo links.";
  }
  if (callAndReturn) {
    // When the source explicitly names who transfers control, a structurally
    // valid call graph with a different caller is still a wrong diagram.
    const subject = utterance.match(/\bthe\s+([a-z][a-z-]*)\s+(?:jumps?|transfers?|goes?)\s+to\b/)?.[1];
    if (subject) {
      const caller = matchingObject(subject, objects);
      if (!caller) return `The explanation names ${subject} as the caller, but that distinct visible role is missing.`;
      if (!edges.some((edge) => edge.kind === "calls" && edge.from === caller.id)) {
        return `The explanation names ${subject} as the caller; the calls link must start from that role.`;
      }
    }
  }
  const changingSpeed = /\b(?:thrown|tossed|launched|shot)\b.{0,45}\bup\b/.test(utterance)
    && /\b(?:slows? down|decelerates?)\b/.test(utterance)
    && /\b(?:falls?|drops?)\s+back\b/.test(utterance)
    && /\b(?:faster|speeds? up|increasingly fast)\b/.test(utterance);
  if (changingSpeed && (!["risesTo", "fallsFrom", "accelerates"].every(has))) {
    return "The explanation describes ascent, a turning point, and accelerating descent; show a moving object, apex, and force with risesTo, fallsFrom, and accelerates links.";
  }
  return null;
}
