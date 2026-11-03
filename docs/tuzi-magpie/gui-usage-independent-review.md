# Independent review of Usage test repairs

Reviewer: the lines/website agent, not the author of these four repairs.
Review date: 2026-11-03. This is a read-only source and evidence review;
the reviewer did not launch browsers, Go tests, builds or native apps.

Reviewed checkout:
`/Users/syd08/.codex/worktrees/tuzi-usage-regressions/tuzi-mapie`,
branch `codex/tuzi-magpie-usage-regressions`, based on `979033f9f6c61b3b9e94b671ed7b1afc6bd1e8ab`.
The pending implementation diff contains four test files only: 36 additions,
7 deletions. Production JavaScript and CSS are unchanged by this repair.
The author's report is [Usage GUI test preconditions](gui-usage-regressions.md).

## Verdict and scope

No blocking finding in the reviewed diff. The changes establish the UI state
needed by the existing assertions, preserve their numeric limits, and retain
failure reporting. The density case explicitly changes the layout under test
from the default sidebar to four columns using the existing sidebar control;
it must not be described as proving 15 visible accounts with the default
sidebar. Both layouts still assert that all 29 accounts are unfolded.

This verdict does not turn the original failed full suite into a pass or
replace final integrated GUI, visual comparison, or native acceptance.

## Source-path review

| Test | Checked production path and resulting coverage |
| --- | --- |
| `usage-agents-hide.test.cjs` | `hold` in `assets/app.js` intentionally leaves a view at scrollTop 0 when insertion moves its surviving anchor by less than that anchor's height. `reader.wheelTo` uses real wheel input followed by `reach`; the added positive-scroll assertion makes the subsequent scrolled-hold expectation explicit. Original hide/unhide order, totals, persistence, overflow, and less-than-1.5px checks remain. |
| `usage-fold.test.cjs` | `packUsage` derives its maximum column count from available content width and the existing minimum card width. Evidence records 1036px/three columns/12 visible accounts with the sidebar and 1200px/four columns/15 without. The test uses `#sideToggle`, waits for the actual four-column grid, and keeps the original at-least-15 bound. It changes no width, font, card style, viewport or production packing rule. The retained historical comment is not independent evidence about the unavailable older layout. |
| `usage-ledger.test.cjs` | `poll` in `assets/plugins/routing/client.js` pauses after its first reply while Routing is hidden. Visiting Routing is necessary to obtain the synthetic live trace. `openRoute` first checks `routes.get(id)` and only fetches `/api/gateway/route` when absent; `pick` leaves the newest live route unpinned. Waiting for the rendered model row, returning to Usage, and following the link tests this live path. The original zero Back to live assertion remains, and the new zero history-request assertion verifies the intended path. |
| `usage-overview-fold.test.cjs` | `load` marks `load.done` after reading state and then refreshes an open Usage view. `loadUsage` calls `renderUsageLoading`, which hides Keys while leaving the previous Account rows attached. Therefore attached Account rows alone do not establish readiness. The added conjunction waits for initial state and completion of the Usage loading phase; all fold persistence, key visibility and token/cache assertions remain. |

The [GUI shell reference](../subsystems/gui-shell.md), code standards and
lessons were checked against these source paths. No documented product
contract changes require a subsystem prose update for these test repairs.

### Ledger wait and teardown

The 12-second timeout is a maximum readiness wait, not a fixed sleep or an
assertion retry after failure. The fixture's initial trace has `mine:false`,
which causes the production poll to wait **5000ms** before another iteration.
On the first live response, an empty `state.agents` makes it wait up to
**30 × 100ms** before rendering the main route. The trace fixture itself adds
100ms. Twelve seconds gives these existing waits and browser scheduling room;
the rendered `.rt-req .m` row still must appear or the test fails.

The subtest registers teardown before installing its replacement trace
handler. `page.unrouteAll({ behavior: "wait" })` drains active handlers before
`page.close()`. The fixture's short delay uses a Node timer, so closing the
page cannot reject a page-owned timeout. The former catch on `route.fulfill`
is removed: fulfillment errors are not suppressed. Existing `pageerror`
collection and its empty-error assertion are retained. The final Chromium
ledger run reports no unhandled rejection, failed, cancelled or skipped test.

## Evidence inspected

Evidence root:
`/Users/syd08/Documents/tuzi-magpie-evidence/gui-suite/usage-regressions/`.
Inspected raw TAP, state JSON, diagnostic source copies, source comparison and
the author's report, rather than relying on the report's pass claims alone.

- Original agent diagnostic fails at scrollTop 0 with a 50.28125px insertion
  and 101.5625px surviving anchor, matching `hold`'s top exception. Scrolled
  control passes 2/2; its derivative disables only `hold` before Unhide and
  fails the preserved pixel bound with the same 50.28125px movement.
- Original density diagnostic records 12 and 15 under the two layouts and
  remains red at its original 15-account assertion on three columns.
- Original ledger diagnostic fails both language live checks and has the
  closed-page timeout rejection. The first four-file Chromium candidate
  remains recorded as 61/64, with the two live checks exceeding their then
  inherited 5-second timeout; no teardown rejection remained.
- The complete final ledger Chromium rerun passes 17/17. Its state JSON has
  exit 0 and successful isolation cleanup. The other three unchanged files
  contributed 47 passing results in the first candidate run. This is combined
  targeted evidence, not a claim that the initial 64-test invocation passed.
- Overview diagnostics delaying every Usage read after the first by 1500ms
  fail 3/5 with old readiness and pass 5/5 with the new readiness. Their source
  copies use the same delay. The insufficient second-read-only experiments
  remain visible and are not counted as negative proof.
- The four-file WebKit invocation was still running at the review snapshot;
  its state JSON had no exit code yet. Final completion belongs in the author's
  report and the integration acceptance record before claiming WebKit green.

The reviewed files match the recorded final WebKit invocation's SHA-256 values:

| File under `internal/gui/tests/` | SHA-256 |
| --- | --- |
| `usage-agents-hide.test.cjs` | `ed3feb389375e341e9d0b13b6ed46728486cb7dcf40e4ec60c5115faf2c78718` |
| `usage-fold.test.cjs` | `450bf4ed2d6ca7cbddab5ef54533341094de15a9aa5b5eede5664af72e54522f` |
| `usage-ledger.test.cjs` | `cef0b18d55fb91c840e9e998a15eac43f85182236a0ac48cae3d6c3e48e19f91` |
| `usage-overview-fold.test.cjs` | `2b0ceb0ffe93e4277b1d01e573f272fbe4cc9e7f07c74316321614fbc6803ae6` |
