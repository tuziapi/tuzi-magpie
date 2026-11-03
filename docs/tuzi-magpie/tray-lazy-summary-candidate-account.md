# Tray lazy-summary investigation and approved implementation

Owner: account subagent; worktree `/Users/syd08/Documents/tuzi-magpie-account`.
Source base: `979033f`; original reference: `2251ca1`. The initial candidate
was isolated until approval. On 2026-11-03 the parent relayed the user’s
explicit instruction: “采用托盘定位时序修复”. This approves the minimal
`quotaAllJS`/`focusQuotaCard` timing change described below, with the existing
five-second expiry and reader-scroll cancellation preserved. It does not
authorize unrelated layout or behavior changes. The approved source patch
and controlled module regressions are now applied in this independent
worktree; integration remains the parent’s responsibility.

## Observed defect

`tray-cell-click.test.cjs` and its relevant product functions are unchanged
from the original reference. The original full test fails in both languages
with both original and current assets in Chromium and WebKit.

The delayed quota response first draws without the account summary. Its
`quotaAllOf` call starts a lazy import of `quotaall.js`. `focusQuotaCard` then
scrolls Kimi into view. Import completion calls `renderQuotas` and inserts
the account summary above Kimi. `keepQuotaFlash` preserves the old scrollTop,
so the new content pushes the requested target out of view.

Current Chromium/en trace:

- Before the requested scroll, Codex group height is 259.39px, Kimi bottom
  651.64px, view bottom 264.59px, maximum scroll 431px.
- The requested scroll sets scrollTop to 387; Kimi bottom becomes 264.64px,
  within the test's existing 1px whole-card tolerance.
- Lazy import inserts a 58.78px summary plus 8px gap. Codex group becomes
  326.17px tall; maximum scroll becomes 498px. ScrollTop stays 387 and
  Kimi bottom becomes 331.34px. The original and current trees have the same
  sequence; this is not a newly introduced Tuzi style or navigation change.

## Approved behavior change

The isolated patch is
`/Users/syd08/Documents/tuzi-magpie-evidence/tencent-tray-01/tray-candidate.patch`.
It changes only `quotaAllJS` and `focusQuotaCard` in `app.js`:

1. Mark the lazy summary module settled after either success or failure.
2. Keep the explicit pending card-navigation request while this module loads.
3. On success, the existing `renderQuotas` queues navigation after drawing
   the summary. On failure, queue navigation against the layout without it.

This delays the requested scroll until the known pending layout change is
finished. It does not remove or change the account summary, selected tab,
card highlight, page styles, or keyboard focus. The existing five-second
deadline and `readerScrolls` cancellation remain in force. A request whose
module never settles before expiry does not scroll late. The change is shared
by tray Allowances and explicit navigation into the main window's Usage page;
it does not authorize automatic scrolling on ordinary quota refreshes.

Alternatives considered: preloading the module in this fixture would conceal
the actual first-load race; allowing partially visible targets would weaken
the intended behavior. Keeping a target pinned across all later redraws would
have a much broader interaction with the reader's scroll guard. The proposed
bounded wait is the smallest change tested here.

## Isolated verification, not production integration

Evidence directory:
`/Users/syd08/Documents/tuzi-magpie-evidence/tencent-tray-01/`.

| Check | Chromium | WebKit |
| --- | --- | --- |
| Original full fixture, original assets | 0/2, 16.586s | 0/2, 19.736s |
| Original full fixture, current assets | 0/2, 17.573s | 0/2, 19.483s |
| Full original scenarios against candidate, en/zh | 2/2, 14.196s | 2/2, 14.477s |
| Held module: load, wheel, expire, failure, each en/zh | 2/2 groups, 4.079s | 2/2 groups, 3.510s |
| Controlled cold import, original/current/candidate, en | 0/1, 0/1, 1/1 | Not rerun |

The candidate's complete original scenarios retain delayed quota responses,
focus-refresh highlight timing, repeated openings, main-window/account
navigation, empty accounts, expiry, and real wheel cancellation assertions.
The additional held-module scenarios explicitly keep the module response
pending, then verify its success, a real wheel before completion, deadline
expiry, and HTTP 404 failure. Success scrolls to Kimi once; wheel and expiry
scroll to no card; failure still reveals Kimi once. Keyboard focus remains
on BODY in every scenario. No visibility threshold was changed.

Candidate Chromium/en: one `kimi` scroll, scrollTop 454, target bottom
264.33px within view bottom 264.50px. WebKit/en: one scroll, scrollTop 450,
target and view bottoms 265.69px. Candidate screenshots for en/zh and both
engines are under `candidate-shots/`. These are synthetic fixture screenshots;
the fixture's missing Kimi icon is not changed by the candidate.

`*-tray-original.log` contains original and current failures;
`current-chromium-tray-groups.log` identifies the inserted summary and its
geometry. `candidate-*-tray.log` contains the full original scenarios and
focus/geometry traces; `candidate-*-tray-lazy.log` records all four controlled
module outcomes. `tray-candidate-assets/` holds the isolated proposed source.
Later `*-failure-shot.log` repeats are additional diagnostics, not the gate
results in the table; load timing can expose a later main-window visibility
failure instead of the original delayed-panel failure. The controlled module
comparison and `controlled-shots/` deliberately hold its response to make the
original race reproducible without relying on wall-clock delays.

All browser work was serial, one browser and one worker, under the parent's
lightweight slot. Requests used synthetic route fixtures, with no real
account, credential, service, or model. No Go/build command or listener ran.
The parent retains independent review and integration/full-suite verification
responsibilities.

The initial candidate browsers finished and the slot was handed to the UI
subagent. After the explicit approval, the UI subagent explicitly returned
the slot before final repository verification. No browser or Go/build command
was run out of queue.


## Approved repository change and final verification

The actual source diff is exactly the reviewed isolated patch. Four controlled
module scenarios now live in `internal/gui/tests/tray-cell-click.test.cjs`,
under each existing language test: load success, reader wheel, request expiry,
and HTTP 404 failure. They hold the module response itself, retain all original
scenarios, assert no early scroll, require exactly one requested scroll on
success/failure, require no scroll after cancellation/expiry, and preserve
BODY keyboard focus. A finally block releases the held response, waits for route handlers with
`unrouteAll({ behavior: "wait" })`, and closes its context even on assertion
failure. No visibility tolerance is relaxed.
The GUI shell subsystem reference records the shared tray/main-window timing.

Final actual-repository tests were run serially, one browser/worker at a time:

| Actual repository file | Chromium | WebKit |
| --- | --- | --- |
| `tray-cell-click.test.cjs` | 10/10, 16.815s | 10/10, 16.902s |
| `panel-quota-lazy.test.cjs` | 10/10, 6.736s | 10/10, 6.194s |
| `panel-quota-refresh.test.cjs` | 10/10, 8.512s | 10/10, 7.303s |
| `allowance-open-read.test.cjs` | 4/4, 4.377s | 4/4, 3.581s |

That is 34/34 per engine. The tray count includes two parent language cases
and eight controlled subtests. The adjacent tests cover prompt quota drawing
without history, stable refreshes and focus, and opening/refresh request rates.
No earlier complete scenario was removed or weakened.

The four new scenario bodies were also extracted verbatim from the actual
repository test into an isolated diagnostic. They pass against final assets
in both engines, 10/10 each including parents. Removing only the new pending
module guard in an isolated asset copy makes every one of the eight subtests
fail its real “loading the summary must defer the requested scroll” assertion
in each engine (parents included: 0/10). The failure path finishes without
route-fulfillment/context-close errors, exercising the added cleanup too.
Original-code failures and visual/root-cause evidence remain in the earlier
evidence directory; no original production source was changed for the red run.

Final evidence is in
`/Users/syd08/Documents/tuzi-magpie-evidence/tray-approved-01/`:
`final-<engine>-<test>.log` contains the actual file runs,
`controlled-final-<engine>.log` the extracted controlled cases, and
`negative-no-wait-<engine>.log` the real guard-removal negative control.
The extracted script, isolated assets, and source/approval manifest are kept
beside them. Commands use the runtime paths recorded above, `BROWSER` set to
one engine, and `node --test --test-concurrency=1` with one file at a time.

Syntax and `git diff --check` pass. All owned browsers and test processes
finished, no listener/port remains, and the browser slot was explicitly
released to the parent. No Go/build command ran in this follow-up. The final
product diff is limited to the approved two functions; the remaining files
are this test, this evidence/approval record and the GUI subsystem reference.
Parent review, integration and full-suite verification remain separate.
