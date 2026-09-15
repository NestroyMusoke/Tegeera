# Tegeera — Product Hunt launch pack

This file contains draft launch material. Nothing here has been submitted automatically.

## Primary link

`https://nestroymusoke.github.io/Tegeera/`

The GitHub Pages workflow uses Node.js 24, verifies the project in a dedicated job, and only then publishes the `dist` directory. Before the first deployment, open the repository on GitHub and select **Settings → Pages → Build and deployment → Source → GitHub Actions**. This one-time repository setting must exist before `actions/configure-pages` can read the Pages site.

If a run says `Get Pages site failed` or `Not Found`, the application tests did not necessarily fail. Enable Pages using the setting above, open the failed workflow run, and select **Re-run all jobs**. Do not enable the temporary `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION` escape hatch; the workflow and its actions are already Node.js 24 compatible.

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

## X launch identity

Create a dedicated product account so Product Hunt links to Tegeera rather than an empty campaign profile.

**Handle preference:** `@Tegeera`, then `@TegeeraApp`, then `@TegeeraHQ`. Availability must be confirmed inside X during signup.

**Display name:** Tegeera — Speak it. See it.

**Bio:** Speak an idea. See it become a clear, animated doodle. An Android-first, accessibility-minded education tool built by Nestroy Musoke.

**Location:** Kampala, Uganda

**Website:** `https://nestroymusoke.github.io/Tegeera/`

**Profile image:** `public/brand/tegeera-mark-v1.png`

**Pinned launch post:**

> I built Tegeera after watching my Biology teacher teach through arthritis—and later struggling to explain ideas myself. Speak a concept; Tegeera turns it into a live visual story. It is early, imperfect and real. Try the vision ↓
> https://nestroymusoke.github.io/Tegeera/

Use the Product Hunt launch URL as the website link on launch day if its rules require the launch page rather than the product demo. The account should post real progress, demonstrations and limitations; never manufactured engagement.

## Maker comment

I built Tegeera because I remember watching my O-Level Biology teacher teach through arthritis. He knew how to make difficult ideas understandable, but writing and demonstrating them on a chalkboard was physically hard.

Later, I experienced my own difficulty turning ideas into clear explanations during presentations. Tegeera grew from those two experiences.

In Luganda, “Tegeera” means “understand.” The vision is simple to say and difficult to build: speak a concept and see it become a clear visual explanation while you are still speaking.

The current beta does not pretend to understand everything. Supported meanings become deterministic, animated SVG scenes through a constrained visual language called DoodleScript. Uncertain or unsupported meanings preserve the scene and ask for clarification. The repository includes 278 generated supported variations, 65 safe near-misses, and zero false-confident acceptances across 28 gold cases. Broader public visual review and classroom testing remain ahead.

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
