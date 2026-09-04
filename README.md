# Tegeera

**Speak it. See it. Understand it.**

Tegeera is an offline-first visual teaching instrument that turns explanations into persistent, editable, hand-drawn scenes. It began with a simple experience at Uganda Christian University: sometimes words are not enough, and drawing the idea is what finally makes it understandable.

## First working slice

The current foundation includes:

- DoodleScript v1 with schema, semantic, layout and confidence gates;
- deterministic animated SVG people and objects;
- typed natural-language commands;
- persistent scene revisions and undo;
- safe clarification instead of guessed drawings;
- Capacitor configuration for the Android application.

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

## Safety contract

No language model draws directly onto the canvas. Every parser or model must produce DoodleScript, and every script must pass four gates before it changes a lesson:

1. schema validity;
2. semantic reference validity;
3. safe, readable layout;
4. minimum interpretation confidence.

## Licence

Tegeera is available under the MIT License.
