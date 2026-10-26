# Geera immersive web redesign

Status, 26 October 2026: revised production build passes. The verification update below supersedes the initial implementation notes.

## Verified revision

- Live film uses the original 1280x720 MP4, not enlarged compressed frame arrays. Frame assets remain for static fallbacks. No autoplay or controls. Scroll advances to the end at 88 percent; reverse scroll seeks backward.
- Separate grid tracks keep text outside the film. An alpha edge mask blends the source background into the page. It does not restore detail absent from the 720p source.
- Transparent vector g replaces the cropped bitmap letter and old favicon. Developer setup/performance panels and the raw probe library are hidden in the embedded product. Examples are closed by default and grouped by subject. Skip film and decorative button arrows are removed; the keyboard-only accessibility skip link remains.
- Production web defaults to same-origin /api. Native defaults are unchanged. The old port 8193 process was unconfigured; npm run start:web:local loads the ignored server/.env.local. Static hosting alone does not provide an API.
- Network failures return 503 and timeouts return 504, with specific safe messages instead of an inaccurate invalid-plan error.
- Production build and bundle budgets pass. 24 focused React tests and 14 HTTP/media tests pass. These are not a full-suite or universal visual-quality certification.
- Live Nebius: A car and a mouse produced a valid two-object plan in 3618 ms. In the real browser, that input reached revision 1; a heart/lungs/blood/oxygen explanation then reached revision 2 without reloading. Some glyph generations failed and retained labels, so neither result is claimed as perfect artwork.
- Desktop and phone screenshots inspected; tablet DOM measured without horizontal overflow. Forward scroll advanced film time to 3.09 seconds and reverse returned to zero. Film and captions had disjoint bounds.
- Taste's standalone browser inspector was not run. Browser checks used the controlled browser tool. Minimal content requirements override the skill's imagery-count and motion-count floors.

Remaining limits: runtime doodle quality is uneven; physical-phone speech testing is outstanding; genuinely sharper film needs a higher-resolution source. Do not advertise universal interpretation or production readiness from these checks.

## Direction

Taste Skill: type-only-statement, seed 1046421441. Retain ivory, charcoal and muted teal. No stock photographs or invented testimonials. The user-supplied films take precedence over the skill's generic imagery suggestions. Minimal content takes precedence over its image-count floor.

Idea: the explanation a teacher struggled to put on a chalkboard becomes a visible line unfolding through the page.

## Visitor journey

- Opening: Geera. Give your words shape. Supporting sentence: Speak or type an explanation. Watch it draw itself. Primary action: Open canvas.
- Film: a single short scroll-linked reveal, normal browser scrolling, visible playback controls and a reduced-motion still. Inspect the actual supplied clips before deciding crops, timing or poster frames.
- Product: link into the existing working canvas, not a simulated demonstration. Keep microphone opt-in, typed input, Undo and error recovery intact. Clearly distinguish brand animation from real app output.
- Origin: the founder's O-level biology teacher struggled to write on the chalkboard. No medical details or identifying teacher details are published. No founder byline is displayed.
- Close: Open canvas. Short development-status statement without claims of universal accuracy.

## Media inventory

- gemini_generated_video_d7d66601.mp4: 1,452,222 bytes, supplied by user. Not yet visually inspected.
- IMG_7128.MOV: 44,834,353 bytes, supplied by user. Treat as reference until inspected; do not publish automatically.

## Acceptance checks

No preload gate, scroll hijacking, autoplay audio or compulsory motion. Keyboard-operable navigation and controls. Readable first frame. Responsive checks at 1440, 768 and 390 pixels. Lazy-load film away from primary interaction; retain an accessible fallback if video fails. Run existing workflow tests before and after integration. Do not change Android identifiers, storage keys or backend protocols for the visual rename.

## Next implementation steps

The supplied HTML frame arrays were parsed as data, never executed, and extracted into 120 desktop and 60 mobile WebP files. Only four requests/decodes are in flight and up to 35 frames retained. The film ends at 88% of the sticky scene; scrolling reverses it. Reduced motion shows stills. The reference MOV is not published. The Gemini MP4 remains an original media asset, not a visible player. The film’s actual g is cropped by CSS into the wordmark.

Rebuild and inspect the revised scene at 1440, 768 and 390px, including reverse scrolling, fast skipping, reduced motion and unavailable frames. Rerun GeeraExperience and existing App workflow tests. The earlier player version built successfully and was visually inspected, but that is not evidence of the revised scroll scene passing. Backend rate limits and the durable daily provider budget protect spending; the landing form's 3/minute and 10-second spacing are only a UX throttle.
