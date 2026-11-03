# F05/F11 controlled results

Four authorized commands each ran once and serially. No retries or product
changes. Both gateway runs exited0; both wheel runs exited1 at child10's
unchanged assertion (and the aggregate parent). Each wheel run has10 passing
children, one failing child,12 tests including the parent. Test-owned browser
close completed before each process exit. Root received the browser queue
immediately after the fourth command exited. Account worktree remains clean
at `8af352a69124728990ddae77574213cedcc9dfb6`.

| Control | Frozen | Original | Interpretation |
| --- | --- | --- | --- |
| F05 actual fitTop RO gate | held1, delivered1; firstfalse, afterfalse | held1, delivered1; firstfalse, afterfalse | Valid gate, no overflow. This imposed lateness alone does not reproduce F05. |
| F11 two trusted-20 inputs | 714→474, expected674, pending0 at sample | 714→474, expected674, pending0 at sample | Valid gate and scroll preconditions; extra-200 replay occurs in both sources under the changed input partition. |

## F05 timings

Frozen: gate armed2630.9ms at500px, callback held2641.7 at560px,
original100ms sample2741.0, explicit release2741.6, after-delivery2772.5.
Original: armed1957.0, held1973.8, sample2070.6, release2071.1,
after-delivery2091.7. Document width is560 in all four samples. Fonts loaded;
header classes are `top tight cramped inrow crowded packed` in all samples.
The original first samples are preserved in raw JSON and cannot be replaced
by the later observations. No timing correction is justified by this result.

## F11 event sequence and branch evidence

Frozen before control1094ms: actual714, pending0, only code-200 putBack from946ms.
First native-20 at1114ms: native view694 then restoration714, -20 record1133ms.
First timer held1175ms; step1 completes1183ms with [-200,-20], pending1.
Second native-20 at1199ms: native view694 at1211ms, then474 at1229ms;
`deaf` changesfalse→true and putBack becomesempty before either handler runs.
Step2 completes1265ms with pending2. Both real handlers release1268ms,
pending reaches0; final sample1538ms remains474, versus expected674.

Original before control1136ms: actual714, pending0, only code-200 from993ms.
Step1 completes1211ms with [-200,-20], pending1; step2 completes1295ms
at474 with deaftrue and empty putBack. Handlers release1298ms. Final exact
714→474 result is preserved in `WHEEL_RESULT` and child10 JSON.

Each step's native scroll counter rose by2 (9→11→13) and two genuine trusted
wheel events reached the gate. This establishes the experimental precondition;
there was no timeout, missing gate or desired-scrollTop polling. The transition
to deaftrue with all negative records consumed before handler delivery matches
the `puttingBack`3-same-sign branch. It is stronger evidence than displacement
alone. The branch includes old code-200 because it is within1000ms; the first
input's timestamp would have excluded it from givesBack's50ms rule.

### Connection to the original frozen scene, and its limit

The original scene creates the same code-200 entry then waits100ms, so that
entry is a demonstrated shared precondition. Both earlier+300 inputs in all
observed boundary/control traces are returned by their own genuine handlers;
putBack is empty after each. Moreover, puttingBack filters by sign: even a
remaining+300 cannot count toward a later negative3-entry threshold. A stale
positive run likewise cannot directly satisfy the negative-direction shortcut.
Child reset navigates to a new document; in the relevant traces deaf isfalse.

The changed control provides the two later negative entries by two distinct
trusted-20 inputs and withholds both application callbacks. The unmodified
scene sends **one** trusted-40 input. In both boundary traces it produces only
one negative restoration, leaving two negative entries in total, so the3-entry
branch does not fire. There is no historical trace proving that the failing
single-40 scene had an extra negative restoration or other negative entry.
The historical failure also did not preserve its exact actual displacement.

Thus this is an existing guard weakness reachable under a specifically imposed
input/order, reproduced equally in original and frozen source. It is not an
identified cause of historical F11 and must not be silently added to the
finite frozen repair scope. Report it to root; no product change is made and
F11 is not closed. A generic scrollend/pending wait cannot fix this control:
the wrong value is already474 before release and remains so after pending0.

## F05 floating element static follow-up, no extra execution

The requested historical all-overlay rect/display/position snapshot is not
available. The existing100ms capture stores only nonzero-size nodes whose
right edge exceeds560.5px, not all DOM nodes or computed display/position.
All four boundary/control100ms snapshots are under the40-node cap (frozen12,
original6), and contain only unclipped geometry of navigation descendants:
buttons/spans, plus the frozen extra nav icon's SVG descendants. None is a
`.pop`, `.proto-menu`, `.status`, `.rail-tip`, `.mask-tip`, `#modal` or dialog.
Document width is560. This rules out a right-overflowing nonzero overlay in
those observed samples, but neither establishes hidden overlay rects nor
rules out an overlay in the unrecorded historical failure. No values are
fabricated and no additional tooltip scenario was executed.

Relevant frozen source paths under `internal/gui/assets`:

- `app.js:14917` holdMenu registers resize→closeProtoMenu. At14926 the close
  removes the menu synchronously, unregistering resize. At15013 a single
  choice calls closeProtoMenu before choose. The tested limit menu is single
  choice (`plugins/gateway/keys.js:751`), has no delayed tooltip, and removes
  itself on the actual Every-N-days click. Its width340px comes from `.sess-menu`;
  placeMenu clamps left to8..innerWidth-width-8. No leaving clone is created
  by this close path.
- `app.js:8846` closeModal finishes animations, sets hidden=true and empties
  content. Before opening the work limit editor, the original test explicitly
  waits for the last Reset modal to be hidden. `.modal` is fixed/inset0 with a
  dialog width capped to100%. There is no later modal open before500→560.
- `app.js:400` status writes text immediately; its timer only clears text.
  Reset usage can leave a status message. `.status.lift` is fixed and centered;
  CSS2231 caps width to min(560px,100vw-32px) and wraps. No delayed show or JS
  resize callback is present for status. Its exact rect/display at historical
  failure is unknown; observed overflow-node lists contain no status.
- `app.js:5179` railTip's initial450ms show requires a connected rail button
  and an active model picker; pointerleave/blur/scroll cancel it. The gateway
  limit-window path opens a proto menu, not that picker, and no railTip nodes
  appear in captured overflow lists. `maskTip` belongs to masked-value chips,
  not this limit editor. Neither path is implicated by observed evidence.
- Limit-editor button title strings are native browser tooltips, not a custom
  title-to-DOM tooltip system. A native title tooltip is not part of the page's
  document scrollWidth. An unchanged pointer position alone does not establish
  an overflowing page element.

F05 remains unexplained. This static follow-up supplies specific exclusions
and observability limits; it does not justify an overlay fix or a new defect.

Raw evidence remains in all four run directories. `results.json` extracts
events without altering raw files. `*.from-*.diff` and static-check hashes
remain available for review. F05/F11 are both still open.

## Recovery and source pointers

This report is a documentation-only account-agent handoff, saved2026-11-04
Asia/Shanghai. Source branch: `codex/tuzi-account-frozen-scroll`, based on
account commit `8af352a69124728990ddae77574213cedcc9dfb6`. Root owns integration
and the browser queue. No browser/server/build/Go process remains owned by
this assignment after all four runner processes exited and the queue returned.
No product or repository test was modified by this round.

External bundle: `/Users/syd08/Documents/tuzi-magpie-evidence/frozen-controls-03/`.
It contains preparation script, runner, immutable generated diagnostic CJS,
script manifest, syntax checks, incremental/frozen diffs, README and raw four
command logs/exit codes/traces. Previous natural boundary evidence is retained
in `frozen-boundaries-02/`; original frozen failure logs are retained in
`gui-final-c7238e14891f-c4/`. No failed run was overwritten or reclassified.

Root's disposition: keep F05 and F11 unknown. The two-input controlled guard
weakness is not a proven cause of the historical single-input F11 and is not
added to frozen product repair scope. No candidate is being prepared, no wait
correction proposed for integration, and no further browser experiment starts
without root's specific scheduling instruction. An external proposal sketch
written before that final disposition remains only as a rejected/unimplemented
discussion: it identifies the ambiguity between true unread input and earlier
code scroll and recommends no production patch. It is not acceptance evidence.

Archived report inputs (SHA256):

- `RESULTS.md`: `34750c51849fd581fd5865bbf899dff391c80c7db23161b147eec0792a1b5318`
- `results.json`: `e2d41c145c60b16a0e63144df000ab991c84839add9dd493cdf37aaa091a2f41`
- `README.md`: `ca6b22f1bfa0b4ba24dde1365690675043d8f67e9ce095c087b4ec0bda506960`
- `manifest.json`: `9ca8ace5003776f9cd3ff1a488d3f4dccd07f5842ba204f5147282798905f8bc`
- `static-checks.json`: `45a047c7ef7bcb4ae33aad23096406d72227ee94ae839d9e5c8ae741c3479885`
