# Tegeera — Product Hunt launch pack

This file contains draft launch material. Nothing here has been submitted automatically.

## Primary link

`https://nestorymusoke.github.io/Tegeera/`

The GitHub Pages workflow verifies the project before publishing the `dist` directory. In the repository settings, select **Pages → Source → GitHub Actions** once, then push the deployment commit.

## Listing

**Name**

Tegeera

**Tagline**

Speak an explanation. Watch it become a visual story.

**Short description**

Tegeera is an Android-first teaching instrument that turns spoken or typed explanations into clear, animated visual scenes in real time—and asks before drawing when meaning is uncertain.

**Suggested topics**

Education · Accessibility · Artificial Intelligence · Productivity

**Status**

Beta / active development

## Maker comment

I built Tegeera because I remember watching my O-Level Biology teacher teach through arthritis. He knew how to make difficult ideas understandable, but writing and demonstrating them on a chalkboard was physically hard.

Later, I experienced my own difficulty turning ideas into clear explanations during presentations. Tegeera grew from those two experiences.

In Luganda, “Tegeera” means “understand.” The vision is simple to say and difficult to build: speak a concept and see it become a clear visual explanation while you are still speaking.

The current beta does not pretend to understand everything. Supported meanings become deterministic, animated SVG scenes through a constrained visual language called DoodleScript. Uncertain or unsupported meanings preserve the scene and ask for clarification. The repository currently has 405 passing tests, 278 generated supported variations, 65 safe near-misses, and zero false-confident acceptances across 28 gold cases. Human visual review and wider classroom testing remain ahead.

I am building Tegeera for teachers whose movement makes drawing difficult, students who struggle to present an idea, visual learners, and eventually people who need richer screen-reader, voice, switch, tactile, or multilingual ways to communicate.

Tegeera is created and developed by me, Nestroy Musoke. GPT-6 Astra has been an engineering collaborator, but the lived problem, product direction, decisions, and ownership are mine.

I would value feedback on three things: which explanation you tried, whether the drawing helped, and where Tegeera should have asked a better question.

## Three-minute demo sequence

1. Start with the empty canvas and say the product promise in one sentence.
2. Speak the plant example and show water, roots, sunlight, and leaves remain distinct.
3. Speak the food-chain example and point out that arrows run from food to eater.
4. Try an uncertain or incomplete statement and show that the previous scene remains safe.
5. Use Undo or a correction to prove the scene is editable rather than generated as a flat image.
6. End with the teacher story, current evidence, and the inclusive long-term vision.

## Gallery plan

Use at least four 1270 × 760 assets:

1. Hero: “Speak it. See it. Understand it.” with the live canvas.
2. Biology: plant intake and food-chain scenes.
3. Across subjects: physics, mathematics, and computer-science scenes.
4. Trust: clarification, Undo, accessibility, and the measured evidence.

Add a short video showing real input becoming a scene. Do not use mock output that the current build cannot reproduce.

## Launch-day checklist

- Confirm the live URL works in a private browser window and on a phone.
- Run `npm test`, `npm run lint`, and `npm run build` from the launch commit.
- Record the final commit hash and deployment run URL.
- Upload the gallery and a public YouTube demo.
- Mark the product as beta / active development.
- Publish the maker comment immediately after launch.
- Respond to every comment and record unsupported examples for the evaluation corpus.
- Never describe generated development probes as classroom accuracy.

## RevenueCat boundary

The Product Hunt web demo does not replace or restructure the Android product. RevenueCat remains Android-first in the New Gen category, with a release-signed APK as its direct deliverable and no Play Store dependency.
