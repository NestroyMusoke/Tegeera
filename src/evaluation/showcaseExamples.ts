export interface ShowcaseGroup {
  subject: string;
  examples: readonly string[];
}

export const showcaseGroups: readonly ShowcaseGroup[] = [
  {
    subject: "Science",
    examples: [
      "A tree takes in water through its roots and sunlight through its leaves.",
      "The heart pumps blood to the lungs, and the lungs return it back carrying oxygen.",
      "Someone pushes a crate across a rough floor, friction slows it down.",
      "A ball thrown straight up in the air slows down, stops for a moment, then falls back down faster and faster.",
      "A light ray travels toward a mirror and reflects off it.",
      "Rain falls, soaks into the soil, and some of it later rises back up as evaporation.",
      "A seed becomes a seedling, then becomes a plant.",
      "The population doubles from one to two to four to eight.",
      "Grass is eaten by grasshopper, which is eaten by frog, which is eaten by snake."
    ]
  },
  {
    subject: "Computing",
    examples: [
      "A cache is a labeled box that stores recent results.",
      "When we call a helper function, the control jumps to that helper function, runs it, then returns back to where it left off.",
      "In a stack, you push and pop items only at the top.",
      "An array is a row of boxes, each holding a value, numbered starting from zero.",
      "A linked list is a linked chain where each item points to the next one.",
      "If-else means the program checks a condition and takes one of two paths.",
      "A loop keeps repeating the same steps until a condition becomes false.",
      "In a binary search, you keep cutting the list in half until you find the target item.",
      "In a print queue, the first task in is the first processed.",
      "A processor communicates with nearby cache to respond quickly."
    ]
  },
  {
    subject: "Mathematics, geography and sequences",
    examples: [
      "The right angle measures ninety degrees.",
      "If we have three quarters of a pizza and remove one quarter, how much is left?",
      "A triangle has three angles that add up to 180 degrees.",
      "A river usually flows downhill from higher ground into the sea.",
      "Mountains form where two tectonic plates push into each other.",
      "First collect data, then compare results, then write conclusions."
    ]
  }
] as const;

export const showcaseExamples = showcaseGroups.flatMap((group) => group.examples);
