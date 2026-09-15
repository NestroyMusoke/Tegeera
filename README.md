# Tegeera

### Speak it. See it. Understand it.

[Try the live web demo](https://nestorymusoke.github.io/Tegeera/) · [See the engineering evidence](ENGINEERING_STATUS.md) · [Read the path to broad visualization](OPEN_VISUALIZATION_ARCHITECTURE.md)

Tegeera turns a spoken or typed explanation into a simple, animated visual story while the explanation is still happening.

It is an Android-first education product in active development, created and developed by **Nestroy Musoke**.

## The name

**Tegeera** means **“understand”** in Luganda.

That is not branding added after the product was built. It is the reason the product exists.

## Why I started building it

When I was studying Biology during my O Levels, one of my teachers had arthritis. He understood the subject deeply, but writing and demonstrating ideas on a chalkboard was physically difficult for him. I watched him work through that pain while trying to help us picture roots absorbing water, food chains, life cycles, and systems inside the body.

Years later, I found myself facing a different version of the same problem. During presentations, I sometimes knew what I meant but struggled to turn the explanation in my head into something an audience could immediately see.

Tegeera grew from both experiences.

It is for the teacher whose hands make drawing difficult. It is for the student who has an idea but cannot explain it confidently. It is for the learner who understands better through pictures than paragraphs. Its long-term vision includes people who are blind or have low vision, people with mobility or dexterity impairments, and anyone whose way of communicating does not fit the tools already in the classroom.

Tegeera is not a cool demo looking for a problem. It is a personal attempt to make understanding easier to reach.

## The problem is larger than one classroom

- The World Health Organization estimates that **1.3 billion people—about 16% of the world—experience significant disability**. [WHO: Disability and health](https://www.who.int/news-room/fact-sheets/detail/disability-and-health)
- Around **1.71 billion people live with musculoskeletal conditions**, which can limit mobility and dexterity. [WHO: Musculoskeletal health](https://www.who.int/news-room/fact-sheets/detail/musculoskeletal-conditions)
- UNICEF estimates that **nearly 240 million children live with disabilities**, and says they remain among the children most likely to be excluded from education. [UNICEF: Inclusive education](https://www.unicef.org/education/inclusive-education)

These numbers do not prove that Tegeera is the answer. They explain why presentation and teaching tools should not assume that everyone can draw quickly, see clearly, speak confidently, or interact in the same way.

## What Tegeera can do today

Tegeera already accepts speech or typed input and turns supported explanations into deterministic, editable SVG scenes. It can currently visualize structures including:

- queues, ownership, sharing, movement, gestures, contact, carrying, and handovers;
- cause-and-effect graphs and multi-step visual flows;
- plant intake through roots and leaves;
- circulation, water cycles, life cycles, and food chains;
- forces, reflection, changing speed, landscapes, angles, and fraction subtraction;
- stacks, arrays, linked lists, conditions, loops, binary search, processor-memory communication, routines, and doubling growth.

Try explanations such as:

```text
A plant takes in water through its roots and sunlight through its leaves.

The food chain starts with grass, then a grasshopper eats it,
then a frog eats the grasshopper, then a snake eats the frog.

A ball thrown upward slows down, stops for a moment,
then speeds up as it falls because of gravity.

In a print queue, the first task to arrive is the first one processed.
```

When Tegeera cannot support the meaning safely, it preserves the current scene and asks for clarification. A confident-looking wrong diagram is worse than an honest pause.

## What happens after you speak

```text
Speech or typed explanation
          ↓
Semantic frame: entities, actions, quantities and relationships
          ↓
DoodleScript: a small, versioned visual language
          ↓
Schema → meaning → layout → confidence safety gates
          ↓
Deterministic procedural SVG scene
```

The language model does not draw pixels directly. Every interpretation must become constrained DoodleScript and pass independent validation before it can change the lesson. Direct edits and prepared lessons can remain local and fast.

This architecture gives Tegeera three properties that matter in a classroom:

1. **Speed:** common supported meanings do not wait for image generation.
2. **Consistency:** the same meaning produces the same visual structure.
3. **Safety:** unsupported or contradictory meaning cannot silently mutate the scene.

## Evidence, not inflated accuracy

The current checkpoint is reproducible from this repository:

| Check | Current evidence |
| --- | ---: |
| Automated tests | **405/405 passing** across 57 files |
| Generated supported variations | **278** |
| Incomplete, unsafe, or structurally wrong near-misses | **65 safely clarified** |
| Independent teacher corpus | **25/60 drawn**, 1 held, 34 clarified |
| Gold semantic-scene cases | **28/28 automated-ready** |
| False-confident gold acceptances | **0** |
| Strict gold result | **3/28** |
| Human-approved drawing cases | **0/25 so far** |
| Local SVG-ready benchmark | **56.62 ms p95** over 834 warmed samples in the latest full run |
| Production JavaScript | Largest chunk **298.28 KiB**, below the 500 KiB guardrail |
| Visual-review output | **44 fixtures**, including a 25-scene human-review station |

The strict score is intentionally lower than the automated-ready score. Code can prove that required concepts, relationships, visual cues, and validation gates exist. It cannot declare its own drawings beautiful or classroom-ready. Every drawing case remains behind a real human-review gate.

The 60-statement corpus is kept outside production grammar so the product cannot secretly read its answers. The full methodology is documented in [evaluation/README.md](evaluation/README.md).

## Accessibility is a direction and a test obligation

Today, Tegeera includes:

- typed input that remains available when speech recognition fails;
- semantic accessibility labels for rendered relationships and specialist diagrams;
- keyboard-readable controls and a detail view for larger labels;
- reduced-motion behavior that preserves the meaning of animated scenes;
- offline-first deterministic rendering for supported lessons;
- privacy-safe performance reports that exclude lesson text and transcripts.

The vision is broader: screen-reader narration of scene changes, switch and voice navigation, tactile and high-contrast representations, multilingual explanation, and testing led by people with disabilities.

Those features are not claimed as complete. In particular, physical Android accessibility testing and human visual approval are still outstanding.

## Built for openness, not sixty hard-coded answers

Tegeera separates four things that are often mixed together:

- **language understanding** identifies the meaning;
- **DoodleScript** represents the meaning without deciding its art style;
- **layout grammars** decide how relationships should be arranged;
- **procedural SVG rigs** decide how the scene looks and moves.

New nouns occupy open semantic slots. New visual families are registered as reusable structures rather than complete classroom sentences. Open Peeps and DiceBear informed only the study of pose coverage and modular component architecture; no artwork, paths, proportions, or style definitions were imported. Tegeera's visual identity and procedural rig are original.

See [TEGEERA_POSE_EXPRESSION_SPEC.md](TEGEERA_POSE_EXPRESSION_SPEC.md) for the character contract and [OPEN_VISUALIZATION_ARCHITECTURE.md](OPEN_VISUALIZATION_ARCHITECTURE.md) for the long-term system design.

## Test it in a browser

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/NestroyMusoke/Tegeera.git
cd Tegeera
npm install
npm run dev
```

Then open the local URL printed by Vite and try the example explanations above.

Run the complete engineering checks:

```bash
npm test
npm run lint
npm run build
node scripts/visual-check.mjs
```

The visual-review command generates ignored local fixtures in `.visual-check/`. Open `human-visual-review.html` to inspect and record real drawing decisions.

## Android remains the product architecture

The hosted demo is a second delivery target, not a replacement for the Android application. Both targets use the same React, DoodleScript, renderer, and test suite.

```bash
npm run android:sync
cd android
gradlew.bat assembleDebug
```

The Android speech bridge requests microphone permission only after the user presses **Speak**, prefers an offline recognizer, and preserves typed input when speech is unavailable.

The web application and Android assets currently build and synchronize successfully. Native Gradle execution on the development machine is still blocked by a local `Unable to establish loopback connection` error; a release-signed APK and physical-device verification remain release work.

## What comes next

1. Expand from registered constructions to retrieval over reusable semantic visual templates.
2. Add a constrained planner for uncovered language, with DoodleScript validation still mandatory.
3. Collect consented teacher speech covering Ugandan English, different accents, classroom noise, and real corrections.
4. Complete assistive-technology testing with blind, low-vision, and mobility-impaired participants.
5. Add multilingual narration, prepared offline lessons, teacher-authored templates, and tactile/export formats.
6. Publish separate measurements for transcription, meaning, coverage, clarification, visual readability, latency, and memory.

The goal is ambitious: say almost anything teachable and watch it become a clear visual explanation in real time. The current system does not claim to have reached that goal. It proves that the path can be engineered carefully, measured honestly, and expanded without turning into a collection of hard-coded demos.

## Two launches, one product

Tegeera remains Android-first for the RevenueCat hackathon's New Gen category. Its deliverable will be a directly downloadable, release-signed APK—not a Play Store listing.

The same product is presented through a hosted browser demo for the GPT-6 Astra Challenge on Product Hunt, allowing judges and early users to experience the core interaction immediately. GPT-6 Astra has served as an engineering collaborator; the lived problem, product vision, direction, decisions, and ownership belong to Nestroy Musoke.

## Maker

**Created and developed by Nestroy Musoke.**

Tegeera began with a teacher who kept teaching through pain, a student who remembered, and a belief that understanding should not depend on how easily someone can fill a chalkboard.

## License

MIT
