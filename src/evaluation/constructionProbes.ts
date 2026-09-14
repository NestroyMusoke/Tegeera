export interface ConstructionProbe { id: string; text: string; layout: string }

const stackProbes: ConstructionProbe[] = ["add", "push", "adding", "pushing"].flatMap((add) =>
  ["remove", "pop", "removing", "popping"].map((remove, index) => ({
    id: `stack-${add}-${index}`, text: `In a stack, you ${add} and ${remove} items only at the top.`, layout: "lifo-stack"
  })));

const triangleProbes: ConstructionProbe[] = [
  "A triangle has three angles that", "The three angles in a triangle", "A triangle's three angles"
].flatMap((opening, openingIndex) => ["add up to", "sum to", "sum up to", "total"].flatMap((verb, verbIndex) =>
  ["180 degrees", "180°"].map((total, totalIndex) => ({
    id: `triangle-${openingIndex}-${verbIndex}-${totalIndex}`, text: `${opening} ${verb} ${total}.`, layout: "triangle-angle-sum"
  }))));

const plateProbes: ConstructionProbe[] = ["landmasses", "tectonic plates"].flatMap((noun) => [
  "converge", "push into each other", "move toward each other"
].map((motion, index) => ({ id: `plates-${noun}-${index}`, text: `Mountains form where two ${noun} ${motion}.`, layout: "convergent-plates" })));

const routines = [
  ["mix flour", "add water", "bake bread"],
  ["collect data", "compare results", "write conclusions"],
  ["open the valve", "heat the water", "measure temperature"],
  ["read the question", "solve the problem", "check the answer"]
];
const routineTemplates = [
  (a: string, b: string, c: string) => `First ${a}, then ${b}, then ${c}.`,
  (a: string, b: string, c: string) => `First ${a}, next ${b}, finally ${c}.`,
  (a: string, b: string, c: string) => `Begin by ${a}, then ${b}, and finally ${c}.`
];
const routineProbes: ConstructionProbe[] = routines.flatMap((steps, stepIndex) => routineTemplates.map((template, templateIndex) => ({
  id: `routine-${stepIndex}-${templateIndex}`, text: template(steps[0], steps[1], steps[2]), layout: "ordered-routine"
})));

const reflectionProbes: ConstructionProbe[] = [
  "A light ray travels toward a mirror and reflects off it.",
  "A beam hits glass and bounces off it.",
  "Light moves towards a wall and reflects off it.",
  "The ray shines toward a surface and bounces off it."
].map((text, index) => ({ id: `reflection-${index}`, text, layout: "reflection-ray" }));

const lifecycleProbes: ConstructionProbe[] = [
  "A seed becomes a seedling, then becomes a plant.",
  "An egg develops into a larva, then develops into a beetle.",
  "Ice changes into water, then changes into vapor.",
  "A bud turns into a flower, then turns into fruit."
].map((text, index) => ({ id: `lifecycle-${index}`, text, layout: "lifecycle-sequence" }));

const indexedCollections = [
  ["array", "boxes", "value"],
  ["register", "cells", "bit"],
  ["memory bank", "slots", "reading"],
  ["seat map", "boxes", "student name"]
] as const;
const indexedTemplates = [
  (collection: string, cells: string, value: string) => `A ${collection} is a row of ${cells}, each holding a ${value}, numbered starting from zero.`,
  (collection: string, cells: string, value: string) => `The ${collection} is a horizontal row of ${cells}, each containing a ${value}, indexed starting at one.`,
  (collection: string, cells: string, value: string) => `A ${collection} is a row of ${cells}, each storing the ${value}, numbered starting at 0.`
];
const indexedProbes: ConstructionProbe[] = indexedCollections.flatMap(([collection, cells, value], setIndex) =>
  indexedTemplates.map((template, templateIndex) => ({
    id: `indexed-${setIndex}-${templateIndex}`, text: template(collection, cells, value), layout: "indexed-row"
  })));

const linkedCollections = [
  ["linked list", "item"], ["playlist", "track"], ["route", "stop"], ["dependency list", "task"]
] as const;
const linkedTemplates = [
  (collection: string, item: string) => `A ${collection} is a linked chain where each ${item} points to the next one.`,
  (collection: string, item: string) => `The ${collection} is a sequence where each ${item} references the next node.`,
  (collection: string, item: string) => `A ${collection} forms a linked chain, each ${item} linking to the next entry.`
];
const linkedProbes: ConstructionProbe[] = linkedCollections.flatMap(([collection, item], setIndex) =>
  linkedTemplates.map((template, templateIndex) => ({
    id: `linked-${setIndex}-${templateIndex}`, text: template(collection, item), layout: "linked-chain"
  })));

const conditionBranches: ConstructionProbe[] = [
  ["if-else", "program", "condition", "takes", "paths"],
  ["a conditional", "controller", "rule", "follows", "branches"],
  ["a decision", "router", "signal", "chooses", "paths"],
  ["if else", "validator", "test", "takes", "branches"],
  ["a decision", "workflow", "approval", "follows", "paths"],
  ["a conditional", "game", "collision", "chooses", "branches"]
].map(([opening, actor, condition, verb, routes], index) => ({
  id: `condition-branch-${index}`, text: `${opening} means the ${actor} checks a ${condition} and ${verb} one of two ${routes}.`, layout: "condition-flow"
}));

const conditionLoops: ConstructionProbe[] = [
  ["loop", "same steps", "condition", "keeps"],
  ["practice cycle", "exercise", "difficulty condition", "continues"],
  ["animation loop", "frame update", "running condition", "continues"],
  ["retry loop", "request", "retry condition", "keeps"],
  ["search cycle", "next comparison", "search condition", "continues"],
  ["training loop", "learning step", "training condition", "keeps"]
].map(([loop, step, condition, verb], index) => ({
  id: `condition-loop-${index}`, text: `A ${loop} ${verb} repeating the ${step} until a ${condition} becomes false.`, layout: "condition-flow"
}));

const narrowingProbes: ConstructionProbe[] = [
  ["binary search", "list", "target item", "cutting", "in"],
  ["candidate search", "options", "best option", "reducing", "by"],
  ["diagnostic search", "possible causes", "actual cause", "halving", "in"],
  ["record search", "records", "matching record", "reducing", "by"],
  ["location search", "search area", "location", "cutting", "in"],
  ["answer search", "answers", "correct answer", "halving", "in"],
  ["fault search", "suspects", "fault", "reducing", "by"],
  ["range search", "number range", "chosen number", "cutting", "in"]
].map(([process, collection, target, verb, preposition], index) => ({ id: `narrowing-${index}`, text: `In a ${process}, you keep ${verb} the ${collection} ${preposition} half until you find the ${target}.`, layout: "progressive-narrowing" }));

const fifoProbes: ConstructionProbe[] = [
  ["print queue", "task", "in", "processed"],
  ["message queue", "item", "to arrive", "out"],
  ["request queue", "request", "in", "served"],
  ["job queue", "entry", "to arrive", "processed"],
  ["support queue", "request", "to arrive", "served"],
  ["packet queue", "item", "in", "out"],
  ["checkout queue", "entry", "in", "served"],
  ["task queue", "task", "to arrive", "processed"]
].map(([queue, item, arrival, outcome], index) => ({
  id: `fifo-${index}`, text: `In a ${queue}, the first ${item} ${arrival} is the first ${outcome}.`, layout: "fifo-queue"
}));

const processorMemoryProbes: ConstructionProbe[] = [
  ["processor", "communicates with", "cache", "respond", "quickly"],
  ["controller", "exchanges data with", "storage", "run", "fast"],
  ["graphics unit", "passes data back and forth with", "video memory", "work", "quickly"],
  ["compute unit", "communicates with", "local memory", "work", "fast"],
  ["signal engine", "exchanges data with", "buffer", "respond", "quickly"],
  ["network engine", "passes data back and forth with", "packet memory", "run", "fast"],
  ["control unit", "communicates with", "register bank", "respond", "fast"],
  ["render engine", "exchanges data with", "frame buffer", "work", "quickly"]
].map(([processor, verb, memory, outcome, speed], index) => ({
  id: `processor-memory-${index}`, text: `A ${processor} ${verb} nearby ${memory} to ${outcome} ${speed}.`, layout: "processor-memory-link"
}));

const doublingGrowthProbes: ConstructionProbe[] = [
  ["cell division", "population"],
  ["viral spread", "amount"],
  ["user growth", "number"],
  ["message replication", "group"],
  ["task expansion", "number"],
  ["colony growth", "population"],
  ["sample replication", "amount"],
  ["branching process", "group"]
].map(([subject, quantity], index) => ({
  id: `doubling-${index}`, text: `In ${subject}, the ${quantity} doubles from one to two to four to eight.`, layout: "doubling-growth"
}));

export const acceptedConstructionProbes = [
  ...stackProbes, ...triangleProbes, ...plateProbes, ...routineProbes, ...reflectionProbes, ...lifecycleProbes, ...indexedProbes, ...linkedProbes, ...conditionBranches, ...conditionLoops, ...narrowingProbes, ...fifoProbes, ...processorMemoryProbes, ...doublingGrowthProbes
] as const;

export const unsafeConstructionNearMisses = [
  "A stack has several items.",
  "Only remove items from a stack.",
  "A pile of plates is on the table.",
  "A triangle has three angles.",
  "A square has three angles that sum to 180 degrees.",
  "A triangle might have angles totaling 180 degrees.",
  "Two cars push into each other and form a traffic jam.",
  "One tectonic plate creates a mountain.",
  "Mountains do not form when plates converge.",
  "First wash the cup, then dry it.",
  "First read, next read, finally write.",
  "Maybe first mix flour, then add water, then bake bread.",
  "An array is a row of boxes holding values.",
  "An array is a row of boxes, each holding a value, numbered starting from two.",
  "An array might be a row of boxes, each holding a value, numbered starting from zero.",
  "An array is not a row of boxes, each holding a value, numbered starting from zero.",
  "A linked list contains three items.",
  "A linked list is a chain where each item points somewhere.",
  "A linked list might be a chain where each item points to the next one.",
  "A linked list is not a chain where each item points to the next one.",
  "If-else has two paths.",
  "The program checks a condition.",
  "If-else might mean the program checks a condition and takes one of two paths.",
  "If-else does not mean the program checks a condition and takes one of two paths.",
  "A loop keeps repeating steps.",
  "A loop stops when something changes.",
  "A binary search uses a list.",
  "In a binary search, you keep cutting the list until you find the target.",
  "In a binary search, you might keep cutting the list in half until you find the target.",
  "In a binary search, you do not keep cutting the list in half until you find the target.",
  "A queue contains several items.",
  "In a task queue, the last task in is the first processed.",
  "In a print queue, the first task might be the first processed.",
  "In a message queue, the first item to arrive is not the first out.",
  "A processor has memory.",
  "A processor communicates with cache.",
  "A processor might communicate with nearby cache to respond quickly.",
  "A processor does not communicate with nearby cache to respond quickly.",
  "A population grows quickly.",
  "A population doubles from one to two.",
  "A population might double from one to two to four to eight.",
  "A population does not double from one to two to four to eight."
] as const;
