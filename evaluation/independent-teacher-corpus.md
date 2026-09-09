# Tegeera Independent Evaluation Corpus
### 60 natural teacher statements, each paired with the intended visual

Purpose: an independent test set for Tegeera's language-to-visual understanding. These sentences are written the way a teacher would actually say them out loud in a classroom — not written to match Tegeera's supported grammar. The "intended visual" is a plain description of what should end up on screen, written separately from the sentence, so it can be used to score whether Tegeera's output matches intent.

Difficulty tags: **[E]** easy/canonical, **[M]** medium, **[H]** hard/ambiguous — deliberately included to stress-test the system rather than flatter it.

---

## Biology (10)

1. **[E]** "A plant takes in water through its roots and sunlight through its leaves."
   Intended visual: a simple plant with roots underground, an arrow going up from the soil into the roots, and a sun with a ray hitting a leaf.

2. **[E]** "The heart pumps blood to the lungs, and the lungs send it back full of oxygen."
   Intended visual: a heart shape with two arrows — one going out to lungs, one returning from lungs to heart, looping.

3. **[M]** "When a caterpillar is ready, it wraps itself up and comes out later as a butterfly."
   Intended visual: three-stage sequence — caterpillar, cocoon, butterfly emerging — shown left to right or as a small timeline.

4. **[M]** "Bacteria multiply so fast that one becomes two, two becomes four, and it just keeps doubling."
   Intended visual: a doubling/branching diagram — one circle splitting into two, then four, then eight.

5. **[H]** "Think of a cell like a small factory where everything has its own department."
   Intended visual: ambiguous — could be a single labeled cell diagram (nucleus, mitochondria, etc.) styled as "rooms," or a literal factory metaphor scene. Correct behavior is to draw the cell with organelle labels using the factory framing loosely, not draw an actual factory building.

6. **[M]** "The food chain starts with grass, then a grasshopper eats it, then a frog eats the grasshopper, then a snake eats the frog."
   Intended visual: a horizontal chain of four organisms connected by arrows pointing from eaten to eater.

7. **[E]** "Our skeleton holds up our whole body, like a frame."
   Intended visual: a simple stick figure with a visible internal skeleton outline.

8. **[H]** "The kidneys filter your blood the way a sieve filters stones out of rice."
   Intended visual: ambiguous dual-domain analogy — likely wants a kidney diagram with an arrow showing "waste out, clean blood back," optionally with a small sieve icon as the explanatory analogy, not a literal rice-sieve scene replacing the kidney.

9. **[M]** "In photosynthesis, the plant takes in carbon dioxide and gives out oxygen."
   Intended visual: a leaf with one arrow labeled CO2 going in and one arrow labeled O2 going out.

10. **[E]** "Fish breathe through gills, not lungs."
    Intended visual: a fish with gills highlighted/labeled, maybe a small water-flow arrow through the gill area.

---

## Physics (10)

11. **[E]** "If you push a box on a rough floor, friction slows it down."
    Intended visual: a box on a surface with a push arrow on one side and a smaller opposing arrow (friction) at the base.

12. **[M]** "A ball thrown up in the air slows down, stops for a moment, then falls back faster and faster."
    Intended visual: a curved path (or vertical up-down path) of a ball with velocity arrows shrinking toward the top and growing on the way down.

13. **[E]** "Light travels in a straight line until it hits something and bounces off."
    Intended visual: a straight line (light ray) hitting a surface and reflecting at an angle, like a mirror bounce.

14. **[H]** "Electricity is like water flowing through a pipe — the wire is the pipe and the current is the water."
    Intended visual: an analogy scene — likely a simple circuit diagram (battery, wire, bulb) drawn as the primary content, with the water-pipe framing used only as a spoken analogy, not literally drawn as a pipe with water unless the teacher is doing the intro-only comparison slide.

15. **[M]** "When you heat a metal rod at one end, the heat slowly moves along to the other end."
    Intended visual: a horizontal rod with a flame/heat source at one end and a gradient or arrow showing heat spreading toward the other end.

16. **[E]** "Two magnets with the same pole facing each other will push apart."
    Intended visual: two magnets (N-N or S-S facing) with a small gap and outward-pointing arrows between them.

17. **[M]** "A see-saw balances when the heavier person sits closer to the middle."
    Intended visual: a seesaw with two figures of different sizes, the larger one positioned closer to the pivot to show balance.

18. **[H]** "Sound is just something vibrating, and that vibration travels through the air to your ear."
    Intended visual: a vibrating source (e.g., a drum or speaker) with wavy concentric lines traveling outward to a simple ear icon — ambiguous whether "vibrating" should animate the source itself or just show wave rings.

19. **[E]** "A shadow forms on the opposite side of the object from the light source."
    Intended visual: a light source, an object, and a shadow shape cast on the ground on the far side of the object.

20. **[M]** "The Earth spins on its axis once a day, which is why we have day and night."
    Intended visual: a rotating Earth with an axis line, half in light (labeled day) and half in shadow (labeled night).

---

## Computer Science (10)

21. **[E]** "A variable is just a labeled box that holds a value."
    Intended visual: a labeled box/container shape with a value written inside it.

22. **[M]** "When you call a function, the program jumps to that function, runs it, then comes back to where it left off."
    Intended visual: a flow arrow leaving the main line down to a separate function block, then a return arrow back up to the same point on the main line.

23. **[H]** "Think of a stack like a pile of plates — you can only add or remove from the top."
    Intended visual: ambiguous between literal plate-pile drawing and abstract stack boxes; correct default should be a vertical stack of labeled blocks with "push/pop" arrows only at the top, using the plate framing as a verbal aid.

24. **[M]** "A loop just keeps repeating the same steps until a condition becomes false."
    Intended visual: a circular/looping arrow back to a step, with a small diamond (condition check) breaking out of the loop.

25. **[E]** "An array is a row of boxes, each one holding a value, numbered starting from zero."
    Intended visual: a horizontal row of numbered boxes (index 0, 1, 2, ...) each with a value inside.

26. **[M]** "In a binary search, you keep cutting the list in half until you find what you're looking for."
    Intended visual: a horizontal list that visually splits/shrinks in successive steps, narrowing toward a highlighted found element.

27. **[H]** "A queue works like a line at the bank — first come, first served."
    Intended visual: ambiguous between literal bank-queue-of-people scene and abstract queue boxes; default should be labeled boxes entering from one end and exiting from the other (FIFO), analogy used verbally only.

28. **[E]** "If-else means the program checks a condition and takes one of two paths."
    Intended visual: a diamond (condition) branching into two separate paths/boxes, one for true and one for false.

29. **[M]** "A linked list is like a chain — each item points to the next one."
    Intended visual: a horizontal series of boxes each connected to the next by an arrow, not physically touching.

30. **[H]** "The CPU is the brain of the computer, but it needs memory nearby to work fast."
    Intended visual: ambiguous — likely a simple block diagram of CPU and Memory boxes connected by a bus/arrow, not a literal brain drawing; "brain" is a spoken analogy for role, not a shape to render.

---

## Mathematics (10)

31. **[E]** "A right angle is exactly ninety degrees, like the corner of a square."
    Intended visual: a right-angle mark (small square) at the corner of two perpendicular lines.

32. **[M]** "If you have three-quarters of a pizza and eat one slice, how much is left?"
    Intended visual: a circle divided into quarters, three shaded as "have," then one of those removed to show the remainder.

33. **[E]** "A triangle has three sides and three angles that always add up to 180 degrees."
    Intended visual: a triangle with its three angles labeled, summing annotation optional.

34. **[H]** "Multiplying by a fraction less than one makes the number smaller, not bigger."
    Intended visual: ambiguous — could be a number line showing a value shrinking toward zero, or a bar/area model shrinking; either is acceptable, but must show a shrink, not a generic multiplication diagram.

35. **[M]** "A graph of y equals x squared makes a U shape that gets steeper as you move away from zero."
    Intended visual: a parabola on x-y axes, symmetric about the y-axis, opening upward.

36. **[E]** "The perimeter is the distance all the way around the shape."
    Intended visual: a closed shape (e.g., rectangle) with its outer boundary highlighted/traced.

37. **[M]** "As one variable goes up, the other one goes down — that's an inverse relationship."
    Intended visual: two curves or a single downward-sloping line/curve on a simple x-y graph, with one axis increasing while the plotted value decreases.

38. **[H]** "Probability is like guessing which cup the ball is under, except you know the odds."
    Intended visual: ambiguous game-analogy; likely wants a simple probability bar or fraction-of-outcomes diagram (e.g., 1 out of 3 cups highlighted) rather than a literal magician's-cup animation.

39. **[E]** "A circle's diameter is twice its radius."
    Intended visual: a circle with the radius drawn from center to edge, and the diameter drawn as the full line across, both labeled.

40. **[M]** "Negative numbers are just numbers on the other side of zero on the number line."
    Intended visual: a horizontal number line with zero marked in the middle, positive numbers to the right, negative to the left, at least one negative value highlighted.

---

## Geography (10)

41. **[E]** "Rivers usually flow from higher ground down to the sea."
    Intended visual: a simple landscape cross-section with a river line running from a hill/mountain down to a sea shape.

42. **[M]** "Rain falls, soaks into the soil, and some of it later comes back up as evaporation."
    Intended visual: a basic water-cycle loop — cloud, rain arrow down, ground absorption, an evaporation arrow back up to a cloud.

43. **[H]** "A country's economy is a bit like a household budget, just much bigger."
    Intended visual: ambiguous cross-domain analogy — likely a simple income/expense bar diagram labeled generically (income in, spending out), not a literal household scene; scale/labels should hint "national," not "family."

44. **[E]** "Mountains form where two large landmasses slowly push into each other."
    Intended visual: two large plate/landmass shapes pushing together with an upward bulge (mountain) forming between them.

45. **[M]** "The equator divides the Earth into a northern half and a southern half."
    Intended visual: a globe/circle with a horizontal line through the middle, top half labeled north, bottom half labeled south.

46. **[E]** "A delta forms where a river meets the sea and spreads out into smaller channels."
    Intended visual: a single river line splitting into multiple smaller branching channels as it reaches a sea/coastline shape.

47. **[M]** "Deserts get very hot during the day but can be surprisingly cold at night."
    Intended visual: a desert landscape shown twice (or split-panel), one side with a sun and heat lines, the other with a moon/stars and a cold indicator.

48. **[H]** "Trade winds are like invisible highways that ships used to rely on."
    Intended visual: ambiguous — likely wants directional arrows over an ocean/globe representing wind patterns, with a small ship icon along one arrow; "invisible highway" is descriptive language, not literal road markings.

49. **[E]** "A peninsula is land that is surrounded by water on three sides."
    Intended visual: a landmass shape with water bordering it on three sides and connected to the mainland on the fourth.

50. **[M]** "Population density is how many people live in a given area — a city is dense, a village is not."
    Intended visual: two equal-sized area boxes, one filled with many small dot/figures (city), one with few (village), for direct visual contrast.

---

## Everyday / cross-cutting / deliberately ambiguous (10)

51. **[E]** "First you wake up, then you get ready, then you go to school."
    Intended visual: a simple three-step horizontal sequence with basic icons or labeled boxes in order.

52. **[M]** "It's like when you're baking — you can't rush it, or it comes out wrong."
    Intended visual: ambiguous standalone analogy with no clear subject; without prior context, a reasonable fallback is a simple process-with-time-arrow diagram (steps must happen in sequence, one is marked "too fast → bad result"), not a literal baking scene unless baking is the lesson topic.

53. **[H]** "So basically, um, it's kind of like — okay, imagine two things happening at once, but one is way faster."
    Intended visual: hesitant, under-specified speech; correct behavior is to ask a clarifying question or draw a minimal placeholder (two parallel tracks/arrows, one clearly faster) rather than invent specific labeled content.

54. **[E]** "A team works better when everyone does their own part."
    Intended visual: several small figures each doing a distinct small task, arranged together (e.g., around a shared object or goal).

55. **[M]** "Saving money now means you'll have more later, even if it feels slow."
    Intended visual: a small growing stack/bar over two or three time points, showing gradual increase.

56. **[H]** "It's kind of the opposite of what we did yesterday, but with the same idea."
    Intended visual: deliberately under-specified without conversation history; correct behavior depends entirely on scene memory of the previous lesson — if no prior scene exists, Tegeera should ask what "yesterday" refers to rather than guess.

57. **[E]** "You can't build the roof before you build the walls."
    Intended visual: a simple house under construction shown in the correct order — walls first, roof added after, possibly as a two-step sequence.

58. **[M]** "A habit is something small you repeat so often it becomes automatic."
    Intended visual: a small repeating loop icon around a simple action, with repeated cycles shown getting "easier" or effortless over iterations (e.g., fading effort indicator).

59. **[H]** "Wait — no, not that one, I meant the other diagram, the one from before with the arrows going the other way."
    Intended visual: a live correction/undo scenario, not a new drawing — tests whether Tegeera can retrieve and modify the correct prior scene (reverse arrow directions) rather than starting fresh.

60. **[E]** "Let's take a short break before we continue."
    Intended visual: no new content should be drawn — Tegeera should recognize this as non-instructional speech and pause/hold the current scene rather than attempting to visualize "a break."

---

## Notes for scoring

- Items marked **[H]** are intentionally the highest-value cases: analogy sentences (kidney/sieve, CPU/brain, electricity/water), under-specified speech, and non-instructional or correction utterances. These are where "clarify instead of invent" behavior should be tested most strictly.
- None of these sentences were written with Tegeera's supported grammar in mind — they're phrased the way the listed subject would actually be taught out loud.
- For a real evaluation run, each sentence should be scored independently on: (1) correct semantic frame identified, (2) correct visual elements chosen, (3) whether a false-confident guess was made on an [H] item instead of a clarification request.
