# F05 header rendering boundary and final F11 observation

Account branch `codex/tuzi-header-resize-boundary`, based on root commit
`189b91eba8e20423d89ec9c8069d613e18dc3b00`. The only code change is in
`internal/gui/tests/gateway-key-cycle.test.cjs`. Product source is unchanged.

## Why the fixed100ms read was not an input-completion boundary

The original test resizes1000→500 and checks the limit editor's one-column
CSS and field geometry, then resizes500→560 and reads document overflow100ms
later. CSS reads can precede native media/ResizeObserver delivery. Existing
`frozen-controls-03/gateway-original/gateway-final.json` already observed a
500px editor confirmation before any500 native resize/header delivery; the
760px media change subsequently arrived at560. A500 editor fitting does not
establish header fitting.

Current F14 applies header ResizeObserver notifications in one coalesced
animation frame. Waiting for an independent observer alone is insufficient:
the application callback can have returned while its frame is still queued.
The correction listens for the actual560 resize, creates a test observer of
`.top` in that callback, and waits for that observer's following animation
frame. The application's observer was created earlier, so its active delivery
and queued frame precede the test's frame; earlier queued work is also ahead.
The first observer notification cannot be an initial500 notification because
the observer is created only after the560 resize callback. The media path's
fitTop is synchronous when its change is delivered.

The test waits only for this delivery/frame completion flag, under the same
6000ms timeout. It does not poll document width, header classes or a desired
overflow result, and does not access application internal variables. The
unchanged strict document-overflow assertion still reads once after completion.
Its resize listener, observer and frame are removed/disconnected/cancelled on
success and in finally on failure; the test-only window state is deleted.

## Exactly three controlled/observational cases

External evidence: `/Users/syd08/Documents/tuzi-magpie-evidence/finite-boundaries-04/`.
All3 commands ran once, serially. No diagnostic was retried. The source snapshot
was root's clean `d5daff2cbc132816eb0d07bb22419ccfdf09d815`, including F14;
every asset and script hash is retained in manifests and each command record.

| Case | Actual result | What it establishes |
| --- | --- | --- |
| Full1000→500→560 delivery gate |24 actual resize/media/header-RO callbacks held and released; original100ms overflowtrue; native resize→RO→frame completed with pendingHeaderFrame0 and overflowfalse | Delaying the real header input deliveries across both resizes makes the old sampling condition fail and the new boundary fit. |
| Same gate plus permanent `.top` min-width100vw+40px |25 actual callbacks held/released; old overflowtrue; new boundary completed with pending0 but overflowtrue; original strict assertion fails true!==false | A real persistent layout defect remains red; the new boundary does not wait for correct geometry. |
| Original WebKit click-scroll sequence with prewheel metadata |12/12 including parent; exact714→674 under original single-40 input | No F11 reproduction or attribution. No F11 code/test change. |

The first case's **overall exit is1**, not a full test pass. Its target results
and all gate items were written to the raw log; its final after-hook failed
because shared capture called `d?.guard()` while the gateway-only diagnostic
had no guard method. The next browser-close hook did not run. Only its own
Chromium PID26207 was terminated; the runner then exited1. The missing final
JSON was not reconstructed or represented as present. The original script,
manifest, exit and log remain preserved. This was repaired to `d?.guard?.()`
only for the two not-yet-run cases; no input, wait, assertion or gate changed.
`capture-fix.json` records hashes and cleanup. Root explicitly accepted the
first raw target evidence as causal evidence, without calling the case passed.

The control holds callbacks of actual browser events/entries rather than
synthetic events or a manual fitTop call. It verifies no pre-existing header
frame or loading font before arming, holds the760px media path as well as both
actual resize/header observer deliveries, preserves the original100ms read,
and releases in recorded order irrespective of whether overflow is correct.
It demonstrates the source boundary defect under a reachable delivery type;
it does not reconstruct the exact unrecorded schedule of the historical full
suite failure. The independent permanent-overflow negative and complete-file
validation are necessary alongside this evidence.

## F11 stops as unlocated

The only additional instrumentation replaced the original helper's existing
prewheel evaluation with the same count return plus metadata. Evaluate count,
wait count, wheel inputs, code-200 stimulus and40±1 assertion were unchanged.
At1100ms before the final-40, actual=readerAt=714, pin was connected rt-gsec at
offset174, pending0 and only code-200@960 existed. The trusted wheel timestamp
was1112; its actual handler completed1175 with pending0. Final1437 sample674
equals714-40. Neither a shifted pre-input baseline, third negative record nor
pending listener was found. No more diagnostics or altered waits are proposed;
the previously controlled two-input guard weakness remains outside frozen
repair scope and is not claimed to explain F11.

## Verification and review

The changed full gateway-key-cycle file runs all5 languages in each engine,
with no filtering or reduced assertions. Evidence directories are
`complete-chromium/` and `complete-webkit/`, including test/application hashes,
raw logs and exits. Chromium passed5/5, exit0,21.04s; WebKit passed5/5, exit0,
14.58s. Languages were en/zh/zh-TW/ja/de. Both runs used the final test change
including success/failure cleanup. Neither is a rerun of the external gate
case; both are the complete actual repository test file without instrumentation.
JavaScript syntax and git diff whitespace checks pass. No Go/native build is
needed for this test-only change; root owns the overall already-run production
verification and integration review.

All three diagnostic runners and both complete-file runners have exited. The
browser queue was returned to root. No additional experiment is queued. The
account worktree's uncommitted ownership before this commit was only this
report and the gateway test. Earlier account diagnosis commits remain on
`codex/tuzi-account-frozen-scroll`; this branch starts at the committed root
integration above, preserving its F14 source and other fixes. Root's unrelated
delivery-doc changes were neither copied nor edited.
