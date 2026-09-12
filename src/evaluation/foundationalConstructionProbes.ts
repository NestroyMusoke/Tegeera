import type { ConstructionProbe } from "./constructionProbes";

const partWholeScenarios = [
  { whole: "A tree", first: "water", firstPart: "roots", second: "sunlight", secondPart: "leaves" },
  { whole: "A machine", first: "coolant", firstPart: "inlet", second: "energy", secondPart: "panel" }
];
const partWholeProbes: ConstructionProbe[] = partWholeScenarios.flatMap((scenario, scenarioIndex) =>
  ["takes in", "absorbs"].flatMap((verb) => [["through", "through"], ["via", "via"], ["through", "via"]].map((routes, routeIndex) => ({
    id: `foundation-part-part-${scenarioIndex}-${verb}-${routeIndex}`,
    text: `${scenario.whole} ${verb} ${scenario.first} ${routes[0]} its ${scenario.firstPart} and ${scenario.second} ${routes[1]} its ${scenario.secondPart}.`,
    layout: "part-whole-flow"
  }))));

const circulationScenarios = [
  { source: "The heart", payload: "blood", destination: "lungs", enrichment: "oxygen" },
  { source: "A pump", payload: "coolant", destination: "radiator", enrichment: "heat" }
];
const circulationProbes: ConstructionProbe[] = circulationScenarios.flatMap((scenario, scenarioIndex) =>
  ["pumps", "sends"].flatMap((outbound) => ["returns", "moves"].flatMap((returning) => ["with", "carrying"].map((carrier) => ({
    id: `foundation-circulation-${scenarioIndex}-${outbound}-${returning}-${carrier}`,
    text: `${scenario.source} ${outbound} ${scenario.payload} to ${scenario.destination}, and ${scenario.destination} ${returning} it back ${carrier} ${scenario.enrichment}.`,
    layout: "circulation-loop"
  })))));

const forceScenarios = [
  { body: "a crate", surface: "a rough floor" },
  { body: "the sled", surface: "the track" }
];
const forceProbes: ConstructionProbe[] = forceScenarios.flatMap((scenario, scenarioIndex) =>
  ["pushes", "pulls"].flatMap((verb) => ["friction", "drag"].flatMap((resistance) => ["slows", "decelerates"].map((slowing) => ({
    id: `foundation-force-${scenarioIndex}-${verb}-${resistance}-${slowing}`,
    text: `Someone ${verb} ${scenario.body} across ${scenario.surface}, ${resistance} ${slowing} it down.`,
    layout: "force-diagram"
  })))));

const motionScenarios = ["A ball", "The stone"];
const motionProbes: ConstructionProbe[] = motionScenarios.flatMap((object, objectIndex) =>
  ["thrown", "launched"].flatMap((launch) => ["slows down", "decelerates"].flatMap((slowing) => [
    "falls back down faster and faster", "drops back and speeds up"
  ].map((ending, endingIndex) => ({
    id: `foundation-motion-${objectIndex}-${launch}-${slowing}-${endingIndex}`,
    text: `${object} ${launch} straight up in the air ${slowing}, stops for a moment, then ${ending}.`,
    layout: "changing-speed-motion"
  })))));

const containerScenarios = [
  { name: "A cache", content: "recent results" },
  { name: "The nucleus", content: "genetic material" }
];
const containerProbes: ConstructionProbe[] = containerScenarios.flatMap((scenario, scenarioIndex) =>
  ["labeled", "named"].flatMap((label) => ["box", "container"].flatMap((shape) => ["holds", "stores"].map((verb) => ({
    id: `foundation-container-${scenarioIndex}-${label}-${shape}-${verb}`,
    text: `${scenario.name} is a ${label} ${shape} that ${verb} ${scenario.content}.`,
    layout: "labelled-container"
  })))));

const callReturnProbes: ConstructionProbe[] = ["helper function", "sorting routine"].flatMap((fn, fnIndex) =>
  ["jumps", "moves"].flatMap((transfer) => ["runs", "executes"].flatMap((execution) => ["left off", "stopped"].map((returnPoint, returnIndex) => ({
    id: `foundation-call-${fnIndex}-${transfer}-${execution}-${returnIndex}`,
    text: `When we call a ${fn}, the control ${transfer} to that ${fn}, ${execution} it, then returns back to where it ${returnPoint}.`,
    layout: "call-return-flow"
  })))));

const geometryProbes: ConstructionProbe[] = ["An acute angle", "The right angle", "An obtuse angle"].flatMap((subject, subjectIndex) =>
  ["measures", "is exactly"].flatMap((verb) => [["45°", 0], ["ninety degrees", 1]].map(([measure, measureIndex]) => ({
    id: `foundation-geometry-${subjectIndex}-${verb}-${measureIndex}`,
    text: `${subject} ${verb} ${measure}.`,
    layout: "geometric-construction"
  }))));

const fractionProbes: ConstructionProbe[] = [
  "If we have three quarters of a pizza and remove one quarter, how much is left?",
  "If you start with 5/6 of a cake and eat two slices, how much is left?",
  "Take one third away from two thirds of a ribbon.",
  "Subtract 2/8 from 7/8 of a chocolate bar.",
  "If we have four fifths of a tank and use one fifth, how much is left?",
  "If you start with 9/10 of a rope and take away three tenths, how much is left?",
  "Take one quarter from three quarters of a field.",
  "Subtract 3/12 from 11/12 of a journey."
].map((text, index) => ({ id: `foundation-fraction-${index}`, text, layout: "fraction-subtraction" }));

const landscapeScenarios = [
  { water: "A river", source: "higher ground", destination: "the sea" },
  { water: "The stream", source: "mountains", destination: "a lake" },
  { water: "A creek", source: "hills", destination: "the ocean" }
];
const landscapeProbes: ConstructionProbe[] = landscapeScenarios.flatMap((scenario, scenarioIndex) =>
  ["flows", "runs"].flatMap((verb) => ["", "usually "].map((modifier, modifierIndex) => ({
    id: `foundation-landscape-${scenarioIndex}-${verb}-${modifierIndex}`,
    text: `${scenario.water} ${modifier}${verb} downhill from ${scenario.source} into ${scenario.destination}.`,
    layout: "landscape-flow"
  }))));

const waterCycleProbes: ConstructionProbe[] = ["Rain", "Rainfall"].flatMap((rain, rainIndex) =>
  ["falls", "comes down"].flatMap((fall) => ["soaks", "seeps", "sinks"].map((infiltration, infiltrationIndex) => ({
    id: `foundation-water-${rainIndex}-${fall}-${infiltrationIndex}`,
    text: `${rain} ${fall}, ${infiltration} into the soil, and some of it later rises back up as evaporation.`,
    layout: "water-cycle-loop"
  }))));

export const acceptedFoundationalConstructionProbes = [
  ...partWholeProbes, ...circulationProbes, ...forceProbes, ...motionProbes, ...containerProbes,
  ...callReturnProbes, ...geometryProbes, ...fractionProbes, ...landscapeProbes, ...waterCycleProbes
] as const;

export const unsafeFoundationalNearMisses = [
  "A tree might absorb water through its roots.",
  "The heart pumps blood to the lungs.",
  "The lungs return different fluid back with oxygen.",
  "Someone pushes a crate across a floor.",
  "Friction does not slow the crate down.",
  "A ball is thrown upward.",
  "Something launched up slows and falls.",
  "A cache is a box.",
  "A cache is a labeled box that stores itself.",
  "When we call a helper, control jumps away.",
  "When we maybe call a helper, control jumps to it.",
  "The temperature measures ninety degrees.",
  "An angle measures 400 degrees.",
  "Subtract three quarters from one quarter of a pizza.",
  "Subtract one third from one half of a cake.",
  "A car runs from hills into the sea.",
  "A river flows from a station to a school.",
  "Rain falls into soil.",
  "Rain does not soak into soil and return as evaporation."
] as const;
