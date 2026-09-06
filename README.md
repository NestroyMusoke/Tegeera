# Tegeera

**Speak it. See it. Understand it.**

Tegeera is an offline-first visual teaching instrument that turns explanations into persistent, editable, hand-drawn scenes. It began with a simple experience at Uganda Christian University: sometimes words are not enough, and drawing the idea is what finally makes it understandable.

## First working slice

The current foundation includes:

- DoodleScript v1 with schema, semantic, layout and confidence gates;
- deterministic animated SVG people and objects;
- typed natural-language commands;
- in-session scene revisions and undo;
- safe clarification instead of guessed drawings;
- Capacitor configuration for the Android application.
- swappable live-speech engine with Android support, safe confidence handling and typed fallback.

Try commands such as:

- `Draw three students waiting in a queue`
- `Add a teacher`
- `Draw a car`
- `Move the car left`
- `Remove the car`
- `Clear everything`

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

## Test and build

```bash
npm test
npm run build
```

Run `node scripts/visual-check.mjs` to generate ignored local visual fixtures.
Open `.visual-check/app-phone.html` or `.visual-check/app-small-phone.html` in a
browser for the real typed-input workflow check. Each ends with PASS or FAIL.
These checks do not substitute for Android touch, keyboard and speech testing.

On a populated scene, **Read details** enlarges the unchanged SVG inside a
scrollable canvas so labels remain readable on narrow screens. **Overview** returns
to the complete scene and resets the scroll position. Switching view does not add
a revision or consume Undo.

## Android

The native Android project is added after installing dependencies:

```bash
npx cap add android
npm run android:sync
npm run android:open
```

The Android speech bridge requests microphone permission only when the user taps
**Speak**. It asks Android to prefer an offline recognizer. Availability still
depends on the recognition service and offline language pack installed on the
device; when neither is available, Tegeera preserves the current scene and keeps
typed input enabled.

## Safety contract

The first visual-understanding increment supports composable sharing and ownership
scenes. Try `Three students share two books`, followed by
`Another student arrives with her own book` and `Highlight the second student`.
Unsupported or ambiguous clauses preserve the previous scene and show a specific
clarification. This is currently a bounded grammar, not arbitrary language understanding.
Follow-up corrections include `Make that four students` and, after the arrival,
`She gives her book to the first student`. Undo restores ownership and conversation
context. Count changes and transfers keep the surviving objects' identities.
Common classroom framing is accepted too, including `Could you please show me
three students sharing two books?`, `There are three students sharing two books`,
and `A car is moving toward a person`. Meaning-bearing words are preserved:
negation, uncertainty and unsupported trailing actions still request clarification.
See `ENGINEERING_STATUS.md` for evaluation methods, limitations and the next work.

Individual quantities are distinct from sharing: `Three students each have two
books` creates six books with two assigned to each student. `Three students share
two books` creates only two shared books. Existing groups support `They each have
a book` or `The students have a book each`. These add new possessions; they do not
distribute existing books. The ten-object layout limit still applies.
Matching O-codes beneath owners and items show personal ownership across rows;
readable “Who owns what” cards group the same doodles with their owner. Transfers update the codes without
moving the drawings. Shared resources keep their separate shared relationship.

Directed motion examples: `A car approaches a person`, `Make it go the other way`,
and `Stop it`. Human figures also support `A student walks toward a school`.
These show direction with arrows and facing/pose changes, not physical movement
or collision simulation. Objects must share a row with room for an arrow.

No language model draws directly onto the canvas. Every parser or model must produce DoodleScript, and every script must pass four gates before it changes a lesson:

1. schema validity;
2. semantic reference validity;
3. safe, readable layout;
4. minimum interpretation confidence.

## Licence

Tegeera is available under the MIT License.
