# Tray lazy-summary investigation — isolated candidate only

Owner: account subagent; worktree `/Users/syd08/Documents/tuzi-magpie-account`.
Source base: `979033f`; original reference: `2251ca1`. Product code has not
been changed. This candidate needs the user's original-behavior exception
approval through the parent before implementation or integration.

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

## Reviewable proposed behavior change

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
The parent retains approval, actual product implementation, independent
review and integration/full-suite verification responsibilities.

All owned browser processes finished and the browser slot was handed to the UI
subagent by the parent’s explicit instruction. No product source or tests are
uncommitted in this worktree; only this investigation document was added.
