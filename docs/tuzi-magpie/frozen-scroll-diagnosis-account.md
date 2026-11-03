# F05, F07, F11 — static diagnosis and bounded next checks

Owner: account subagent; worktree `/Users/syd08/Documents/tuzi-magpie-account`;
branch `codex/tuzi-account-frozen-scroll`, freshly based on
`c7238e14891f917b67d80209857d3d1db4cb4c42`. F03/F04 remain on their separate
branch/commits. Root assigned only these frozen blockers. This record does not
approve a product change. No browser/test/build/server process was run; UI owns
the browser slot. All dynamic conclusions below remain pending.

Evidence input: `tuzi-magpie-evidence/gui-final-c7238e14891f-c4/` full Chromium
and WebKit logs. Tests are under `internal/gui/tests/`; product source under
`internal/gui/assets/`. Compared source is 2251ca1 versus c7238e14891f.

## F05 — gateway-key-cycle

Chromium Japanese top test 1330 fails at gateway-key-cycle.test.cjs:131:
`document.documentElement.scrollWidth > innerWidth` is true at 560px. The
previous 500px checks passed: one grid column, editor not overflowing, days
field width >100 and its right edge <=500. Thus do not claim the days editor
itself overflows: only the entire document's boolean was captured.

The test resizes 1000 -> 500 -> 560, waits 100ms at 560, then samples. The
fixture, test, entire gateway plugin directory, app.css and fitTop function
are unchanged. fitTop runs synchronously within a ResizeObserver, tries
header classes tight/cramped/inrow/crowded/packed, and also runs on font-ready.
But index.html changes brand text and adds the account nav entry, and the
account stylesheet gives only its own entry special width. Their impact on
headroom must be measured despite unchanged fitTop source.

Minimal diagnostic: preserve the original Japanese scenario and all actions;
record pre/post-resize viewport/document widths, visible overflow elements,
header/nav/brand/actions/editor rectangles, header classes, active animations,
fonts status, resize/fitTop callback order and timestamps. Compare the same
scenario on original assets, including the fixture assets path and i18n input.
Do not call fitTop manually to make the check pass. If a frame-delayed layout
is established, replace only the 100ms pause with bounded measured layout
settlement (not a wait for zero overflow), retaining exact zero overflow and
all existing field/API checks. Negative: real fixed overflowing element must
remain red after settlement. Persistent overflow or changed required layout
is a product decision for root/user, not permission to alter CSS here.

## F07 — Usage tick and S3 sync

Usage: Chromium en child 4 at usage-computers:207, top 5639 is only the parent
failure; 259 ->416. S3: WebKit en top 4836 at s3-sync:102, 129 ->0. These are
two distinct observed movements; no evidence yet establishes one cause.
The tests, reader.cjs, CSS, entire syncView/renderSync/davForm section and
complete reader scroll guard are byte-identical to the original.

Usage uses fixed-step wheel-to-end with 15ms delays, then directly calls
scrollIntoView(center) before reading the baseline. The guard expressly
rejects unrequested programmatic scrolling and may put it back in click
capture before taking a new hold. S3 also uses 15ms wheel steps; it wheels
up while the segmented control's top is <10px below the view top, without
checking the entire button or center hit-test. Its 300ms pause does not prove
all wheel motion landed. S3 selection itself hides/unhides fields in the
same form and can change height; it does not fetch or rebuild the form.
Usage tick is an ordinary checkbox with no app change handler. These facts
make timing/positioning candidates stronger than a sync write failure.

Minimal traces: wheel sent/native timestamp/arrival; scrollTop and readerAt;
purposeUntil, held anchor and guard restoration; target/view/sticky-header
rectangles and elementFromPoint; focus; form identity and Settings redraws.
Take snapshots before programmatic positioning, before pointerdown, before
and after click capture, after the field visibility change, and on subsequent
scroll events. Compare only the failing en scenario against original assets.

If traces establish invalid pre-click positioning, replace only the faulty
positioning with existing reader.reach or reader.wheelTo (real wheel inputs),
retain strictly positive starting scroll for S3, all exact zero-movement
checks, draft preservation, exact submitted fields and request counts. Do not
accept changing a nonzero baseline to zero. Negative: a real post-click
movement must fail the unchanged equality. If the same valid reader click
moves the original/current form, report the product behavior and alternatives;
do not patch the guard or hide the symptom in the test.

## F11 — click-scroll late wheel

WebKit top 736 has one failing child 10 at click-scroll:331. Child11 passes;
the parent repeats subtestsFailed. Actual delta was not printed: only false
for `abs(actual-(was-40)) <=1`. This is not evidence for a specific excess,
missing wheel step, or desired threshold change.

The fixture wraps window wheel listeners, delaying the genuine trusted event
by 60ms; it increments __wheelsHeard after invoking the actual callback. Its
wheel helper already waits for that counter to increase AND purposeUntil to
expire. The guard's single window wheel callback calls holds/flings/givesBack;
flings opens 250ms and scroll events extend it while coasting. After earlier
+300 checks, code subtracts200; three frames pass; exact restoration to was
passes;100ms separate that code scroll from the final real -40 wheel. The
50ms givesBack timestamp allowance should therefore exclude that code scroll,
but only timestamps/putBack records can confirm it. Do not replace this with
a longer sleep or outcome polling without identifying the missed boundary.

Minimal diagnostic, preserving the scenario: log each trusted wheel's delta,
timeStamp, delivery time, listener count, purpose/fling deadlines; each native
scroll and putBack/givesBack entry (by/at/held), readerAt, held anchor, view
height/layout and the final actual/expected delta. Check whether late native
scroll follows helper completion, whether the earlier code scroll is wrongly
given back, or whether layout changes the baseline. Original/current single
scenario comparison must preserve init-script registration and reset order.
The subsequent child11 relies on that init script; filtering it alone would
not reproduce the same setup. Do not expand to other click-scroll scenarios
until diagnosis needs them. Candidate boundary is this delayed-wheel fixture
only if its input/completion synchronization is demonstrably invalid; keep the
40px expected step and1px tolerance. Any actual guard change goes to root for
explicit behavior review, not implementation by this assignment.

## Recovery / next action

Wait for root to grant a browser slot. No test-file candidate or product
change is justified yet. Planned first dynamic targets are F05 Chromium ja,
F07 Chromium en Usage and WebKit en S3, F11 WebKit child10 with required parent
setup. After a proven test correction, full corresponding files in both
engines plus meaningful controls; no automatic full-suite run. All three
blockers remain unresolved AC-13 (potential AC-16 product impact).

## Reviewable external diagnostic bundle

Prepared `/Users/syd08/Documents/tuzi-magpie-evidence/frozen-scroll-01/`:
`prepare.py`, `diagnostic.cjs`, four test copies, copied `caller-keys.cjs`,
`run.py`, README command list and manifest, plus git-archive original/frozen
asset trees. All original assertions remain. Explicit scope selection skips
unrelated Usage/click-scroll children in diagnostic copies only; this is not
reported as whole-file validation. No product source is edited.

The recorder saves bounded event/geometry/guard traces and after-hook captures
on both pass/fail. It never writes scroll position/styles or invokes fitTop.
Geometry inspection itself can affect timing, so natural success is not root
cause proof. Each command runs exactly one designated scene/source, refuses
existing output directories, and retains logs, exit code, state and screenshot.
The external README lists eight individual commands for the four frozen scenes
and their original counterparts. Review frozen evidence before deciding the
next comparison; no automatic repeated sampling.

Validation so far: `node --check` succeeded for six CJS files; Python source
compile succeeded. Neither command executes a browser test. Browser queue is
still assigned elsewhere; all dynamic entries remain unrun.

## Executed slot and remaining cause gaps

Root later granted the exclusive slot. The four first diagnostics and original
counterparts ran once. F07 now has deterministic/natural cause evidence and a
separate test-only correction record, sync-click-position-review-account.md.
F05 frozen/original both passed at560 with document/header width560; no
persistent overflow was observed. F11 both isolated child10 versions passed,
and a single frozen full-file sequence (to retain possible shared-context
state) passed12/12 with final714 ->674. These are not corrections and do not
close either original blocker. No randomized stress/retry loop was run.

The sequence diagnostic re-navigates for child11, so the after-hook's state
file contains that last page; child10's exact actual/expected numbers are
preserved by its WHEEL_RESULT line in run.log. Do not mislabel the final state
file as child10's full event trace. Isolated child10 traces are separate.

### Smallest next F05 diagnostic

First use low-overhead timestamps for actual resize delivery, .top observer
callback entry/exit and document.fonts loading/loadingdone/status. Do not
assume fonts were asynchronous if no load event/request exists. Capture a
single geometry snapshot at the existing100ms boundary and after the observed
last required layout boundary; do not wait for documentWidth==innerWidth.
A controlled fixture may hold/release an actually observed font resource or
observer delivery around the viewport transition, without changing CSS/text
or inventing a font the real fixture never loads. Compare the old100ms read
against viewport/media-rule/observer/font completion, keeping original zero
overflow. If those boundaries have completed while overflow remains, that is
a product layout issue to report, not a test wait to add. Do not call fitTop
manually, trim labels, hide the new entry, or repeatedly rerun hoping for red.

### Smallest next F11 diagnostic

The current instrumentation reads full geometry on events and may change
scheduling. Prefer a bounded lightweight trace containing timestamps, native
wheel sequence/delta and scrollTop, plus explicit delayed-callback begin/end,
pending callback count and purpose/fling deadlines; take full geometry only
at the original final assertion. Record native scroll events and, when the
browser exposes it, scrollend before and after delayed app delivery. A wheel
callback reaching JS is not automatically the compositor's last scroll.
Test whether helper completion precedes the input's final native scroll,
a guard restoration, or unrelated layout. Track actual input delivery and
pending callback completion independently of its final number: never wait
for expected was-40 or change1px tolerance. A controlled delivery gate can
release the real trusted event after its first native scroll to vary only
the relative ordering; retain genuine browser wheel input and the unchanged
handler. If final native input has completed and the guard still miscounts,
report that product behavior and alternatives rather than adding waits.

All browser processes launched here have ended and the queue is released to
root. F05/F11 scripts and tests remain unchanged in the worktree; only F07's
two test files plus these evidence records are candidates for integration.
