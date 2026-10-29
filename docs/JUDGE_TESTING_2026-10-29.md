# Fresh judge walkthrough and live observations

29 October 2026. Tested in the public Render application through its normal typed-input UI. These are one-run observations, not an accuracy benchmark. No application code or production prompt was changed to make these statements pass. Exact-text searches found none of the five accepted statements below in the existing source, evaluation, server, scripts or docs before this record was added. This establishes new wording, not new visual primitives or proof against training-data overlap.

## How to try it

Open https://geera-y7hb.onrender.com/#canvas and choose **Open canvas** if the landing page is visible. The free Render instance can take about a minute to wake after inactivity. The ribbon animation is optional branding, not generated classroom output; you can go straight to the canvas.

Use **Speak**, allow microphone access, and say one complete explanation with brief pauses. Recognized final phrases are processed while capture continues; **Stop** ends listening. This is not word-by-word finished drawing. Browser speech support, recognition, networking and model latency affect the result. These tests used typed input; they do not verify a physical microphone or phone speech session. Paste into **Your explanation** and choose **Draw it** if speech is unavailable.

Use **Read details** for larger labels and **Undo** to return to the previous scene. Inspect arrow direction and meaning. Repeat requests can vary. Do not enter sensitive information.

## Five fresh explorations

### Energy engineering: explain a small solar installation

> A solar panel supplies electricity to a battery, and the battery powers a lamp.

Observed: three entities and the intended two directed relationships. The solar panel and lamp remained labelled placeholders; the battery had a device-style preview. Relationship structure accepted, not polished doodle quality.

### Computer science: present the path of a data request

> A browser sends a request to a server, and the server queries a database.

Observed: browser → request → server → database with the corresponding relationship labels. The scene used labelled placeholders. A useful process map, not a detailed network architecture.

### Civics: distinguish three institutional roles

> Parliament makes laws, the executive implements laws, and the judiciary interprets laws.

Observed: four entities with makes, implements and interprets links to Laws. The executive artwork request failed without removing its label. This illustrates the stated roles; it is not legal advice or a claim about any country's actual independence of institutions.

### Agriculture and economics: explain a value chain

> A farmer sells maize to a mill, the mill supplies flour to a bakery, and the bakery sells bread to a shop.

Observed: four actors and three directed links preserving maize, flour and bread in the captions. The farmer used a procedural figure; other actors remained labelled placeholders. The commodities were not separate drawings.

### Ecology: distinguish who eats whom

> A caterpillar eats a leaf, and a bird eats the caterpillar.

Observed: leaf, caterpillar and bird, with eater → food relationships. The caterpillar artwork request failed and retained its label; other art included provisional sketches. These arrows mean **eats**, not the reverse energy-flow convention of a food-web diagram.

## Two failed explorations, retained as evidence

- “A bee carries pollen from a flower to another flower, helping the second flower produce seeds.” Rejected because an arrow or caption could not be placed clearly. The earlier scene remained.
- “A student pushes a trolley to the right while friction acts to the left along the floor.” Rejected because the model did not produce a valid drawing plan. The earlier scene remained.

All seven requests were entered consecutively in one session. Five changed the scene and two were rejected. This is an observed session outcome, not a representative success rate. Precise request timings were not instrumented. Generated-art approval buttons were not clicked. The drawings are not being presented as independently approved or universally reproducible.

## Explore beyond these prompts

The app's **Explore examples by subject** collection contains previously exercised examples and can provide a quicker first look at established visual families. It is a showcase, not a generalization benchmark. You can speak, paste, paraphrase or invent your own explanation. The system uses reusable local grammars and hosted entity/relation planning, not one pre-rendered image per judge prompt. This architecture supports broader input; it does not guarantee that every new explanation will work.

## What these tests tell us to improve

The graph path can preserve useful unfamiliar relationships while artwork remains unfinished. Future work must improve consistent, recognizable doodles as well as semantic coverage. Reviewed artwork should resolve quickly; slow generation should remain outside the scene's critical path. Model-generated drafts must not be promoted merely because the JSON is valid.
