# F07 — Put sync controls in sight through reader input

Owner: account subagent. Worktree `/Users/syd08/Documents/tuzi-magpie-account`,
branch `codex/tuzi-account-frozen-scroll`, base c7238e14891f917b67d80209857d3d1db4cb4c42.
Reference2251ca1. Root granted one exclusive browser slot after the frozen
full runs ended. Runs below were serial; the slot was released after completion.
Only usage-computers.test.cjs and s3-sync.test.cjs change. No production change.

## Original failures and source comparison

Full Chromium Usage child4 at line207: scroll416 versus259 (top5639 repeats
one child failure). Full WebKit English S3 at line102:0 versus129. Both test
files, reader.cjs, app.css and the complete sync/rendering and reader guard
sections are byte-identical2251ca1..c7238e14891f. These are two different test
positioning faults; they are not one unexplained generic timing failure.

## Usage: programmatic position is rejected

The existing test wheels to the Settings foot, then calls
scrollIntoView(center) and immediately samples its scroll baseline. The real
reader guard rejects this programmatic position. Instrumented frozen/original
runs both passed naturally because the rejected position was already restored
before the baseline was read. Their traces nonetheless record the mechanism:
readerAt416, programmatic259, putBack entry-157, restoration416.

A controlled external copy captures scrollTop synchronously in that same real
scrollIntoView callback, before the browser can deliver its scroll event. It
then performs the original real checkbox click and retains the original exact
zero-movement equality. Frozen and original both fail with416 versus259, exactly
the full-run values. This narrows the ambiguous timing boundary without fake
styles, fake checkbox behavior, or a manufactured assertion result. It does
not claim retrospective attachment/timing instrumentation of the full run.

The correction replaces only programmatic positioning with the existing
reader.reach(p,tick), which uses real wheel input and checks full visibility
and target-center hit testing. The default unchecked state, unchanged scroll,
one save and usage:true assertions are retained.

## S3: target behind Settings' sticky header

Both frozen and original single English WebKit scenarios naturally fail0
versus129. At the sampled baseline, the segmented control is at y67 in a view
beginning y50; the fixed15ms wheel loop only checks its top is at least10px
below the view top. This does not establish the button is clear of the sticky
Settings row. The trace records automatic scroll attempts0 ->129 repeatedly;
the real pointerdown/click finally arrives only once the page is at0, with
the segment aty196. Selection changes fields after that. Thus the movement
preceded the actual selection, rather than being caused by the S3 fields.

The correction uses existing reader.reach for the first S3 pick and later
return to WebDAV, replacing the two identical top-only positioning loops.
Both strictly-positive starting-scroll assertions remain, as do all three
exact no-movement checks, draft retention, validation, precise posted payload,
saved fields, narrow-width layout and no page errors. It introduces no sleep,
force click, global helper change, tolerance or CSS change.

## Verification and negative controls

All evidence is under
`/Users/syd08/Documents/tuzi-magpie-evidence/frozen-scroll-01/`.
Natural/controlled diagnostics use the actual script/fixture and archived
original/frozen assets; final complete runs execute actual worktree tests.

| Check | Result | Evidence directory |
| --- | --- | --- |
| Usage natural diagnostic, frozen/original Chromium | both pass; trace captures rejected-157 move | usage-frozen, usage-original |
| Usage synchronous pre-guard baseline, frozen/original Chromium | both fail416!=259 | usage-sync-frozen, usage-sync-original |
| S3 original test, frozen/original WebKit | both fail0!=129 | s3-frozen, s3-original |
| Usage/S3 focused corrected scene | both pass | usage-candidate-frozen, s3-candidate-frozen |
| Actual full Usage file | Chromium9/9 and WebKit9/9 (8 children+parent each) | chromium-usage-complete, webkit-usage-complete |
| Actual full S3 file | Chromium2/2 and WebKit2/2 | chromium-s3-complete, webkit-s3-complete |
| Real incorrect checkbox scrolling | Chromium336!=376; WebKit329!=369 | chromium-usage-moving-negative, webkit-usage-moving-negative |
| Real incorrect S3 selection scrolling | Chromium136!=96; WebKit129!=89 | chromium-s3-moving-negative, webkit-s3-moving-negative |

Negative copied assets add an actual change handler to the checkbox that
moves Settings up40px, and an actual S3 show path that moves it down40px.
They request the scroll through the app's readerScrolls permission window so
the guard does not repair the injected bug before observation. The candidate
must catch these real resulting movements. Both engines fail the original
exact no-scroll assertion, not cleanup or unrelated failures. The mutation
exists only under external moving-sync-assets and is never integrated.

Focused Usage diagnostics explicitly skip its other3 English children; the
single leaf failure plus parent counts as2 failed results, not two causes.
The final full-file runs contain both languages and all8 children, no skips.
Original frozen full-suite failures remain in their original log; no complete
GUI rerun or claim that the original full suite was green is made.

## Remaining assigned blockers

F05 gateway Japanese560px: frozen/original diagnostic both passed, with
width560 and no overflow. F11 delayed-wheel: both isolated source variants
passed; frozen full-file sequence also12/12 with714 ->674. These results are
not fixes. Neither file is changed and both remain unresolved with root.
See frozen-scroll-diagnosis-account.md for bounded next diagnostic suggestions.
