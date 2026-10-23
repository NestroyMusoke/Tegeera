# Web speech reliability check — 23 October 2026

## Changes

- Ignore stale start/stop failures after cancellation or a newer microphone session.
- A delayed cancellation must not reset a newer session's status.
- Empty continuous browser finals do not terminate a still-running recognizer.
- Cancellation failures become visible errors rather than unhandled promise rejections.
- Clear pending transcript-stability timers on failure.
- Propagation repair feedback now identifies competing origin links. Validation remains strict; no scenario-specific drawing rule was added.

## Live model observations

Random seed 20261023 selected three existing mixed-topic probes. These are not a new independent benchmark. Four statement submissions, including one retry, consumed six provider attempts total.

| Statement | Result |
| --- | --- |
| A librarian places a book on a shelf while a student watches. | Expected four roles and three directed links present; rendered with one labelled placeholder; 6.086 seconds. |
| Rain flows from a roof into a barrel through a gutter. | Rejected after two attempts; retry also rejected after two attempts. Model mixed propagation origin forms. Still unresolved. |
| A clock hand moves clockwise around a dial. | Expected two roles and one directed link present; both objects were labelled placeholders; 6.073 seconds. |

Graph coverage is not visual approval or full semantic verification. Exact relation meaning was not automatically scored by this probe. The local HTML visual review could not be opened because browser policy disallowed file URLs; no visual approval is claimed. No real microphone or physical-phone verification was performed in this pass.

Ignored raw reports: `.visual-check/reliability-20261023.json` and `.visual-check/reliability-20261023-retry.json`.

## Verification

- Final unchanged-source client run: 807 passed, 3 optional live-provider tests skipped.
- Backend: 77 passed.
- Glyph tooling: 26 passed; evaluation tooling: 31 passed; local startup: 3 passed.
- Focused continuous speech regressions: 11 passed.
- Lint, production web build, bundle budget, and whitespace checks passed.
- An earlier full run overlapped a source edit and failed the newly added stop-race test; the final full rerun above passed.

## Remaining gaps

- Long-tail artwork quality and placeholder frequency.
- Faithful handling of mixed specialist and ordinary relationships.
- Hosted responses measured here take seconds, not instantaneous realtime.
- Physical-phone microphone, permission, interruption, and long-session checks.
- Public HTTPS deployment and durable abuse/cost controls.

This is a reliability patch, not a finished-product declaration or a completion percentage.
