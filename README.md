# Tegeera

### Speak it. See it. Understand it.

[Try the live web demo](https://nestroymusoke.github.io/Tegeera/) · [See the current NVIDIA build gates](NVIDIA_BUILD_STATUS.md) · [Review the no-cost doodle intake](QUICKDRAW_INTAKE.md) · [See the engineering evidence](ENGINEERING_STATUS.md) · [Read the path to broad visualization](OPEN_VISUALIZATION_ARCHITECTURE.md)

Tegeera turns supported spoken or typed explanations into simple, animated visual stories. For unfamiliar explanations, it can show unverified concept hints immediately while an optional AI planner works toward a validated scene.

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
- composable object colors across singular objects, counted groups, ownership, and actions;
- cause-and-effect graphs and multi-step visual flows;
- plant intake through roots and leaves;
- circulation, water cycles, life cycles, and food chains;
- forces, reflection, changing speed, landscapes, angles, and fraction subtraction;
- stacks, arrays, linked lists, conditions, loops, binary search, processor-memory communication, routines, and doubling growth.

With a **hosted AI service** configured, NVIDIA's Nemotron 3 Super model is the preferred planner for language the local interpreter cannot handle; the existing OpenRouter path remains a fallback when only an OpenRouter key is configured. The model produces a bounded semantic blueprint, not a finished image. The validated scene appears after the planner returns—not instantly. Noun drawing is a separate, non-blocking step: the accepted scene can show labelled placeholders while approved offline artwork or validated cached artwork appears synchronously. For an unseen noun, the model can emit coarse-grid strokes; the hosted service returns the complete validated stroke set, then the client reveals it with write-on motion. Direct OpenRouter mode can stream complete strokes progressively. Tegeera smooths those points into bounded SVG paths locally. A short instruction can edit a runtime doodle without regenerating its whole scene. This is a general noun mechanism, not a bank of scripted classroom sentences.

Validated runtime strokes remain session drafts until the user explicitly keeps
them; shape validation alone cannot prove that they resemble the requested noun.
Only approved drafts are saved on that device. Previously auto-saved, unreviewed
artwork is ignored on upgrade. The shipped offline pack has a separate provenance
and visual-approval gate and is still empty while curation begins. Model-generated
strokes and editing require a reachable model; the existing scene remains usable
without one.

The NVIDIA path is implemented and tested with a simulated provider, but it has **not** been tested against a live NVIDIA endpoint or deployed: no NVIDIA API key is configured. The public demo and APK do not gain hosted AI merely by merging this code. The secret must be set only on a separately hosted backend, and the public backend URL must be supplied to the client builds. See [server setup](server/README.md). NVIDIA's API Catalog free endpoint is a prototyping path, not a guaranteed free production host. Tegeera's local drawing remains available without a backend; arbitrary-speech understanding and high-quality long-tail artwork do not.

Related work: [SketchAgent (CVPR 2025)](https://openaccess.thecvf.com/content/CVPR2025/html/Vinker_SketchAgent_Language-Driven_Sequential_Sketch_Generation_CVPR_2025_paper.html) demonstrates sequential, language-driven sketching and conversational refinement. Tegeera takes inspiration from that research direction but uses its own stroke schema and rendering code; no SketchAgent code or artwork is copied. Tegeera's focus is a validated, offline-first classroom scene with immediate placeholders and explicit ambiguity handling. The paper is evidence that the method is promising, not evidence that Tegeera can yet draw every requested concept accurately.

Try explanations such as:

```text
A plant takes in water through its roots and sunlight through its leaves.

A yellow book. Then say: Make the book green.

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
Fast local semantic frame ── or ── AI visual blueprint for unfamiliar language
          ↓
Local blueprint compiler: safe IDs, density-aware layout and validated glyphs
          ↓
DoodleScript: a small, versioned visual language (current: 2.27)
          ↓
Schema → meaning → layout → confidence safety gates
          ↓
Deterministic, style-normalized SVG scene
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
| Automated tests | **454 passing**, 3 optional live-provider tests skipped |
| Generated supported variations | **278** |
| Incomplete, unsafe, or structurally wrong near-misses | **65 safely clarified** |
| Independent teacher corpus | **25/60 drawn**, 1 held, 34 clarified |
| Gold semantic-scene cases | **28/29 automated-ready** |
| False-confident gold acceptances | **0** |
| Strict gold result | **3/29** |
| Formal external classroom review | **Pending**; local visual fixtures are ready |
| Local SVG-ready benchmark | **47.28 ms p95** over 834 warmed samples in the latest full run; excludes speech, browser paint, and Android scheduling |
| Production JavaScript | Guardrailed at **500 KiB** per chunk; largest current chunk **389.34 KiB** |
| Visual-review output | **47 fixtures**, including a 25-scene implemented-case review station and an unseen-noun procedural scene |

The strict score is intentionally lower than the automated-ready score. Code can prove that required concepts, relationships, visual cues, and validation gates exist. It cannot declare its own drawings beautiful or classroom-ready. Formal external classroom review remains a release gate.

The 60-statement corpus is kept outside production grammar so the product cannot secretly read its answers. The full methodology is documented in [evaluation/README.md](evaluation/README.md).

## Accessibility is a direction and a test obligation

Today, Tegeera includes:

- typed input that remains available when speech recognition fails;
- semantic accessibility labels for rendered relationships and specialist diagrams;
- keyboard-readable controls and a detail view for larger labels;
- reduced-motion behavior that preserves the meaning of animated scenes;
- color descriptions repeated in visible labels and accessibility summaries, so color is never the only cue;
- offline-first deterministic rendering for supported lessons;
- privacy-safe performance reports that exclude lesson text and transcripts.

The vision is broader: screen-reader narration of scene changes, switch and voice navigation, tactile and high-contrast representations, multilingual explanation, and testing led by people with disabilities.

Those features are not claimed as complete. In particular, physical Android accessibility testing and human visual approval are still outstanding.

## Built for openness, not sixty hard-coded answers

Tegeera separates five things that are often mixed together:

- **language understanding** identifies the meaning;
- **DoodleScript** represents the meaning without deciding its art style;
- **GlyphResolver** selects a trusted rig, pack/retrieval glyph, cached glyph, or validated model glyph;
- **layout grammars** decide how relationships should be arranged;
- **procedural SVG rigs** decide how the scene looks and moves.

New nouns occupy open semantic slots. New visual families are registered as reusable structures rather than complete classroom sentences. Open Peeps and DiceBear informed only the study of pose coverage and modular component architecture; no artwork, paths, proportions, or style definitions were imported. Tegeera's visual identity and procedural rig are original.

See [TEGEERA_POSE_EXPRESSION_SPEC.md](TEGEERA_POSE_EXPRESSION_SPEC.md) for the character contract, [GLYPH_PACK_GUIDE.md](GLYPH_PACK_GUIDE.md) for noun-art curation, and [OPEN_VISUALIZATION_ARCHITECTURE.md](OPEN_VISUALIZATION_ARCHITECTURE.md) for the long-term system design.

## Test it in a browser

Requirements: Node.js 20 or newer.

### Optional broad-language interpreter

Tegeera always attempts its fast deterministic interpreter first. For local development, put a private `OPENROUTER_API_KEY=...` in the root `.env.local` file and run `npm run dev`. The app detects the private local bridge automatically; you do **not** have to paste or enable anything in the interface. The browser never receives that key. The bridge is development-only, bound by Vite's local server and rate-limited. Never commit `.env.local`.

The public GitHub Pages site and installed APK cannot safely bundle a shared API key. They still need a private hosted backend for automatic AI access. Until one exists, the static website offers a personal session-key field; that field is an optional demo fallback, not an automatic public deployment. A GitHub Actions variable or `VITE_` variable is **not** a safe place for the key.

Unsupported language then falls through to an OpenRouter visual planner. The model returns a small semantic blueprint—not HTML, executable code, or unrestricted SVG. The current free-model preference is Gemma 4 26B, then Gemma 4 31B, then the OpenRouter free router when an upstream model errors. Free availability and latency are variable: a recent live semantic request took about 23 seconds, and later requests encountered invalid plans and HTTP 429. Immediate hints are not proof of a real-time accepted scene. A separate noun-stroke request never blocks an already accepted scene. It can emit at most ten strokes with 4–14 bounded grid points apiece and Tegeera's six-color palette. Tegeera compiles each stroke into its allowlisted SVG path format, then handles spacing and scene identities locally. The semantic DoodleScript must pass the same schema, confidence, and layout gates. The interface reports the exact model OpenRouter selected for the semantic request; the doodle model is shown separately. Speculative and lesson prefetch can make additional API calls. See [the interpreter deployment guide](server/README.md) and [glyph pack guide](GLYPH_PACK_GUIDE.md).

For exact concrete-noun matches, a compact offline Unicode emoji index can show an immediate recognizable **preview** while a Tegeera doodle is prepared. Typed words and partial speech can surface up to four such hints before the scene is accepted; they are marked unverified and do not change the canvas. This adds no network call and does not pretend emoji font art is finished Tegeera artwork. The label stays visible; unknown or ambiguous nouns remain honest stickers. See [the third-party notice](THIRD_PARTY_NOTICES.md).

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

The web application and Android assets currently build and synchronize successfully. Native Gradle execution on this Windows machine is still blocked by `Unable to establish loopback connection` before Android compilation. The first Linux GitHub Actions run reached Java compilation, then failed because its Java 17 setup could not compile Capacitor's Java 21 source. The workflow now installs Java 21; this correction needs a new run before an APK can be claimed. If it succeeds, open **Actions → Build Tegeera Android debug APK → latest successful run → Artifacts** to download `tegeera-debug-apk`. A debug APK is not a release-signed APK. Physical-device and accessibility verification remain release work.

## What comes next

1. Evaluate validated glyph generation on frozen unseen explanations and add automatic repair only where failures are measurable.
2. Build and curate the offline teaching-noun glyph pack, then add licensed icon/stroke retrieval without adding lesson-specific production branches.
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
