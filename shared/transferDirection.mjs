const phrase = (value) => String(value).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(?:a|an|the) /, '');

/** A narrowly provable active/passive reversal in an explicit transfer clause.
 * Do not rewrite edges or infer recipients from vague/pronominal descriptions. */
export function transferDirectionIssue(text, candidate) {
  if (candidate?.mode !== 'replace' || !(candidate.confidence >= 0.58)
    || !Array.isArray(candidate.objects) || !Array.isArray(candidate.connections)) return null;
  const source = String(text).toLowerCase();
  if (source.length > 4000 || /\b(?:not|never|no|without|maybe|perhaps|if|unless|might|could)\b|n't|\?/.test(source)) return null;
  const unique = (name) => {
    const matches = candidate.objects.filter((object) => phrase(object.label) === phrase(name));
    return matches.length === 1 ? matches[0] : undefined;
  };
  for (const match of source.matchAll(/\b(?:sends?|delivers?|transmits?|passes?)\s+([^.!?;]{1,100}?)\s+to\s+([^.!?;]{1,100})(?=[.!?;]|$)/g)) {
    const payload = unique(match[1]), recipient = unique(match[2]);
    if (!payload || !recipient || payload.id === recipient.id) continue;
    const reversedVerb = candidate.connections.find((edge) => edge.from === payload.id && edge.to === recipient.id
      && /^(?:receives?|receives? from)$/.test(String(edge.label).trim().toLowerCase()));
    if (reversedVerb) return `The transfer sends ${payload.id} to ${recipient.id}, but its arrow says the payload receives the recipient. Use payload→recipient "received by"/"reaches", or recipient→payload "receives", preserving the stated meaning.`;
  }
  return null;
}
