# Mixed explanations and continuous speech — 22 October 2026

## What changed

- Argument maps now attempt an independent, locally interpreted and validated drawing for each complete statement. They reuse the existing renderer; no new noun/scenario-specific drawing rules were added.
- Each drawing stays beside its original sentence. Unsupported parts retain their wording. Links mean reading order, not inferred cause or proof.
- Questions, conditional/uncertain claims, reported claims and negative wording are conservatively kept as text rather than turned into asserted scenes.
- Multiple canvases use unique paper-filter identifiers.
- Android speech sessions restart after a final result, without repeatedly asking permission. Stop ends capture; Cancel also clears queued drawing work. Late results after cancellation and duplicates before restart are ignored.
- Silence/no-match retries are bounded to three; permission/network errors stop capture. Empty final results follow the same bounded recovery path.
- Accepted phrases enter an eight-waiting-phrase FIFO instead of canceling the previous interpretation. If full, capture pauses and the extra phrase stays in the input. The last 20 accepted phrases remain visible for the current session.

## Verification and limits

Focused tests cover mixed rendering, exact source retention, Undo, late AI responses, sequential processing behind a mocked eight-second provider, backpressure, microphone cancellation, and bounded restart. Production build/bundle checks and lint are also run. These are not evidence that arbitrary speech is now perfectly understood.

Final targeted results: 79 distinct tests passed across the argument, speech and App regression suites (51 focused checks, 27 additional App checks, plus one empty-final recovery regression). The first concurrent build/test run hit a five-second test timeout; the isolated rerun passed without increasing the timeout. The full repository suite was not rerun. Production build, bundle budget and Android web sync passed; no APK or physical-phone verification is claimed. No paid model calls were made for these checks.

Browser checks: plant lifecycle + an open question + shared books + another question; array diagram + an abstract importance question; switch to a car drawing and Undo back to the mixed explanation. Drawings and text appear together in reading order.

Known gap found during testing: `A book is on a table.` is not supported by the local interpreter, so its panel remains text. Per-panel hosted interpretation is not implemented in this patch. Clauses inside a single complex sentence are not independently extracted. Cross-phrase references continue to depend on the accepted scene, not a complete conversation model.

Continuous recognition is enabled for the existing Android speech engine, not browser microphone support. Native recognizer restarts include a 300 ms delay and can miss speech during a restart. A physical-phone continuous-speech test is required. Provider latency can still make drawing fall behind speech; the queue is bounded to prevent unlimited cost/memory. This is not gapless real-time transcription or a claim of zero failures.

## Phone checks still required

1. Tap Speak once. Say two supported statements with a brief pause; both should process in order.
2. Say an unclear phrase, then a clear one; capture should continue without guessing the unclear words.
3. Tap Stop during recognition and between phrases; the microphone must not reopen.
4. Tap Cancel while AI is busy; no queued phrase or late response should change the scene.
5. Test network failure, permission denial, long silence and rapid speech. Verify readable notices and the recent-speech record.
