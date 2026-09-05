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
See `ENGINEERING_STATUS.md` for evaluation methods, limitations and the next work.

No language model draws directly onto the canvas. Every parser or model must produce DoodleScript, and every script must pass four gates before it changes a lesson:

1. schema validity;
2. semantic reference validity;
3. safe, readable layout;
4. minimum interpretation confidence.

## Licence

Tegeera is available under the MIT License.
