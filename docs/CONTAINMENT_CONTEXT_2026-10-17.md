# Containment with two surrounding objects

## Reproduced problems

The saved live butterfly/case/two-observers statement was graph-complete but
painted containment as an arrow. A regression confirmed that the four-object
plan had no typed containment relation. The compiler previously downgraded it
because the enclosure planner supported only one surrounding object.

After extending placement, inspecting PNGs exposed another problem: connectors
to the enclosure ended inside its outline, at the holder's logical object slot.
A second regression reproduced that mismatch.

## General changes

- One holder, one content item and up to two connected surrounding objects can
  retain the enclosure layout. Candidate positions are bounded (at most 90),
  noun-independent, collision-checked and constrained by explicit spatial order.
- Both opposite-side and same-side placements are tested. Contradictory left/right
  requirements return no layout; deterministic output and immutability are tested.
- Generic connectors use the displayed enclosure rectangle for their endpoints
  and obstacle bounds. Links explicitly targeting contained content may enter
  that enclosure; unrelated links treat it as an obstacle. Scene IDs and logical
  positions remain unchanged. Existing directed motion semantics are preserved.
- The border regression permits any correctly clipped border, not only left/right
  borders: routing above an object is valid when caption clearance requires it.

No noun-specific production rules, assets, dependencies, provider changes or
additional runtime model requests. Five-plus-object mixed containment, multiple
containers, nested containers and arbitrary scene composition are not solved.

## Live and visual evidence

Two fresh statements in `evaluation/containment-context-oct17.json` used two paid
provider attempts total. Expected roles/endpoints were withheld from the planner.

| Input | Live time | Inspected drawing |
| --- | ---: | --- |
| Basket contains duck, child left, farmer right pointing at duck | 6,551 ms | Duck inside schematic enclosure; two people outside; farmer's arm aimed at duck. Border connectors no longer enter the enclosure. |
| Box contains key, lamp left, book right | 7,127 ms | Key inside box; book right; lamp remains a labelled placeholder. |

The prior butterfly scene was replayed without a model call: butterfly inside
the labelled case, biologist left pointing, student right looking. The initial
and final static PNGs were inspected. Containers remain labelled schematics,
not depictions of a real basket or glass case. Gaze is subtle. These are not
human-approved artwork, browser/phone screenshots, animation checks, or proof
of universal visual accuracy. Live inference is still seconds, not real time.

Ignored local evidence includes `.visual-check/containment-context-oct17.json`,
its render folder, and the final `basket-border-fixed.png`, `observers-final.png`,
and `box-final.png`. Saved-response replays consumed no further model calls.

Final verification is recorded in `NVIDIA_BUILD_STATUS.md`.

## Verification

- Before fixes: containment regression failed (zero typed containment relations);
  border regression failed (endpoint inside the box). The border test was refined
  to check any valid rectangle boundary, including a top-routed connector.
- Final full client suite: 718 passed, three optional live smoke tests skipped.
- Isolated performance: two passed, 278 probes / 834 samples, local SVG-ready
  p95 16.46 ms and maximum 29.33 ms; excludes inference and screen paint.
- Cold unseen-noun test: 32.52 ms, unchanged 100 ms limit. Prior 137–145 ms
  failures remain evidence of variability; no causal speedup claim.
- Lint, TypeScript, production build, bundle budget and Android web sync passed.
  Main chunk 507.33 kB; advisory size warning remains. Backend unchanged/not rerun.
