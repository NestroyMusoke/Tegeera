## What if understanding were enough preparation?

Imagine explaining an idea and watching it take shape while you speak. No slide deck prepared the night before. No drawing skills needed. Just your understanding, becoming something another person can see.

**That is Geera's destination. Version one is a working speech-and-text canvas: a foundation for making explanations visible, built with NVIDIA Nemotron on Nebius Token Factory.**

[Open Geera](https://geera-y7hb.onrender.com/#canvas) · [Watch the story and demo](https://www.youtube.com/watch?v=R_VkPubjWnQ) · [Inspect the code](https://github.com/NestroyMusoke/Tegeera)

## Why this deserves to exist

My O-level Biology teacher in Uganda understood his subject deeply but struggled to write on the chalkboard. Later, during my own university presentations, I encountered the same gap between what I understood and what I could show. Geera takes its name from the Luganda *tegeera*: to understand.

The personal story needs no statistic to be real. Research supports the design direction: in Mayer's **13 reported tests**, learners receiving words with pictures outperformed words-only groups on transfer tasks, with a **median effect size of 1.35**. This is evidence for carefully designed multimedia learning, not a measured benefit of Geera or proof that everyone has a “visual learning style.” [Cambridge, 2021](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/multimedia-principle/D09A773C7C5C214FA19D4C9841FBC83B)

Our focus is one task: help someone make an explanation visible. Its possibilities stretch from a nursery learner showing an idea before learning to write, to a teacher with one phone and a projector, to a university student explaining an unfamiliar system.

## Judges: try the product first

**Open the app and choose Open canvas.** Our free Render instance can take about a minute to wake after inactivity. Please let the loading screen finish. The scroll-driven ribbon animation is optional branding; the canvas is the product. [Render's startup behavior](https://render.com/docs/free)

Tap **Speak**, allow microphone access, and give one complete explanation with brief pauses. Geera processes recognized final phrases while listening continues. **Stop** ends listening. If your browser does not support speech, paste into **Your explanation** and press **Draw it**. Use **Read details** for larger labels and **Undo** to return to the previous scene.

Here are five fresh explorations, typed through the deployed app on 29 October without changing application code to make them pass. They produced the stated relationship structures in that session; several nouns remained labelled placeholders. **They demonstrate interpretation, not finished artwork or guaranteed repeatability.** Physical-phone speech was not verified in this session.

**Imagine you are an energy student explaining a small solar installation:**
> A solar panel supplies electricity to a battery, and the battery powers a lamp.

**Imagine you are a computing student presenting a data request:**
> A browser sends a request to a server, and the server queries a database.

**Imagine you are a civics student distinguishing institutional roles:**
> Parliament makes laws, the executive implements laws, and the judiciary interprets laws.

**Imagine you are explaining how a harvest reaches a customer:**
> A farmer sells maize to a mill, the mill supplies flour to a bakery, and the bakery sells bread to a shop.

**Imagine you are a biology student explaining who eats whom:**
> A caterpillar eats a leaf, and a bird eats the caterpillar.

For the ecology example, arrows labelled **eats** run from eater to food; they are not energy-flow arrows. Try paraphrasing, changing the objects, or explaining something from your own field. These prompts were not installed as sentence-specific scenarios. Reusable visual grammars and hosted entity/relation planning do the work.

For established visual examples, open **Explore examples by subject** in the app. You can select or speak those too. New explanations may still need clarification.

## The engineering behind the experience

**NVIDIA Nemotron 3 Super (120B A12B), through Nebius Token Factory, handles unfamiliar language.** Hosted access made that model practical without a local inference GPU.

Words pass through local interpretation or the private hosted planner, then a checked blueprint, DoodleScript, layout, and SVG rendering. The model proposes meaning; the application checks and composes the scene. Supported local explanations avoid model calls. Exact-context caching, bounded repair and durable usage reservations help conserve the shared credit budget.

This is a deliberate set of trade-offs:

- **Reasoning versus speed:** faster settings sometimes lost essential relationships in small development probes. We retained the tested approach rather than choosing the shortest response time.
- **Structure versus certainty:** schema-constrained output is inspectable, but valid JSON can still omit meaning. Rejected changes preserve the previous scene.
- **Available art versus visual polish:** procedural figures, retrieved sketches and placeholders keep scene rendering independent of slow generation. The price is uneven style and recognizability.
- **Access versus infrastructure cost:** browser SVG and hosted inference avoid requiring a powerful user device. Unfamiliar explanations still need connectivity; free hosting introduces cold starts.

We used Token Factory's hosted API. We did not provision Nebius GPU instances or train a new model.

## What the failures taught us

Early plans lost relationships, arrows attached incorrectly, and generated sketches passed structural checks while remaining unrecognizable. These failures shaped the compiler and the evaluation approach. The README contains implementation details and dated evidence; a passing test is never presented as proof of universal accuracy.

The latest fresh session also rejected a pollination explanation and an opposing-forces explanation. Keeping those failures visible is how we know what to improve next.

## The next versions

**Geera is not yet word-by-word real-time drawing.** Model calls take seconds, repairs can take longer, and continuous speech can build a backlog. Complex meaning, unfamiliar artwork and browser speech remain uneven.

1. **Keep pace with the explanation:** measured phone latency, fewer avoidable requests, and safe incremental scene updates.
2. **Give the drawings a consistent character:** reviewed original and licensed artwork, clearer silhouettes and expressions, and better background generation for unfamiliar nouns. Improve recognition without delaying the scene.
3. **Prove usefulness with people:** classroom and presentation trials, then stronger multilingual input, scene narration, and assistive-technology testing.

The vision is that your understanding becomes enough preparation. Version one gives us a concrete system to improve toward it.

Created by **Musoke Nestroy**, with occasional help from **Carol Naddunga**. Gallery drawings are actual application output. The Gemini-generated ribbon-to-g film is brand identity.
