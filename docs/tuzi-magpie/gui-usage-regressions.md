# Usage GUI test preconditions

These repairs change tests only. The original full GUI suite remains a failed run; its immutable evidence is recorded in [the first-pass report](gui-full-suite-first-pass.md). Final full-suite acceptance is separate.

## Source and scope

The four original tests were byte-identical at upstream baseline `2251ca1` and the first-suite source `2a4eb246fb7b4b8d99d591d4c935930918929f70`. Evidence is `source-comparison.json` under `/Users/syd08/Documents/tuzi-magpie-evidence/gui-suite/usage-regressions/`. The repair checkout is `/Users/syd08/.codex/worktrees/tuzi-usage-regressions/tuzi-mapie`, branch `codex/tuzi-magpie-usage-regressions`, based on integration `979033f9f6c61b3b9e94b671ed7b1afc6bd1e8ab`.

No production JavaScript, CSS, layout, navigation or API behavior changes. The owning [GUI shell reference](../subsystems/gui-shell.md) contracts remain unchanged. Its linked source was checked: `hold` in `assets/app.js`, `loadUsage` / `renderUsageLoading` in `assets/plugins/usage/page.js`, and `poll` / `openRoute` in `assets/plugins/routing/client.js`.

## Repairs and falsification

| Test | Observed baseline and repair | Preserved guarantee / negative control |
| --- | --- | --- |
| `usage-agents-hide.test.cjs` | At 1200px, the original fixture reaches Unhide at scrollTop 0. Existing `hold` deliberately retains the top when insertion is smaller than its surviving anchor: 50.28125px insertion versus 101.5625px hidden-list height. Wheel the control into the middle first and assert positive scroll before testing a scrolled hold. | All hide/unhide, totals, persistence and overflow checks remain, including the original less-than-1.5px bound. Baseline with this scroll precondition passes; replacing only `hold` with a no-op in an external diagnostic copy fails with 50.28125px movement. |
| `usage-fold.test.cjs` | At 1280px the original sidebar leaves 1036px, three columns and 12 accounts on the first screen. Closing the existing sidebar gives 1200px, four columns and 15. Check all 29 accounts before and after the toggle; explicitly wait for four columns for density. | The density bound remains at least 15. The original baseline diagnostic still applies it to three columns and fails at 12. No assumption about unavailable historical commits is used to justify the repair. |
| `usage-ledger.test.cjs` | Routing intentionally stops polling when hidden after its first response. Installing a live trace fixture while staying on Usage never loads that route; its link enters history. Visit Routing and wait for the live route, then return to Usage. The wait allows 12s for the prior offline response's 5s backoff and the first live response's up-to-3s empty-agent discovery wait; it asserts rendered state rather than sleeping for that duration. Drain route handlers before closing, using a Node timer rather than a timer on the closing page. | Original en/zh baseline cases fail with a Back to live button and an unhandled closed-page rejection. The repaired test retains the zero-button assertion and adds zero history requests for the already-live route. |
| `usage-overview-fold.test.cjs` | Restoring Usage can overlap a state refresh. Loading leaves old Accounts attached but temporarily hides Keys. Wait for `load.done` and removal of the Usage loading class. | All fold, persisted-state, key visibility and cache assertions remain. External baseline diagnostics delay every Usage read after the first by 1500ms: old attached-row readiness fails the reopened Keys assertion; new readiness passes. Delaying only the second read was insufficient because later reads can supersede it; those earlier diagnostic results are retained. |

## Runs and evidence

Every runner invocation uses an explicit minimal environment with private mode-0700 HOME, CFFIXED_USER_HOME, XDG directories and TMP directories. No real account credentials are inherited. All API responses are intercepted synthetic fixtures. Browser files are the pinned Playwright 1.56.1 cache, Node is v24.21.0, and one browser/worker runs at a time. Each `*-state.json` records the command, test hashes, environment, PIDs, times, exit and isolation cleanup. Each `*.log` is unedited TAP. External probe copies are diagnostics, not suite acceptance.

| Run label | Engine | Result |
| --- | --- | --- |
| `baseline-agents-probe` | Chromium | Expected red, 0/2; top-of-page precondition confirmed. |
| `baseline-fold-probe` | Chromium | Expected red, 0/1; default 3-column count 12, closed sidebar 4-column count 15. |
| `baseline-ledger-probe` | Chromium | Expected red, 14/17; both live route cases and parent teardown fail. |
| `baseline-overview-probe` | Chromium | 5/5 diagnostic; observes loading with attached Accounts; second-read-only delay is insufficient. |
| `overview-delayed-old` | Chromium | 5/5 diagnostic; longer second-read-only delay is still insufficient. |
| `agents-scrolled-control` | Chromium | 2/2, baseline source with scroll precondition. |
| `agents-no-hold-negative` | Chromium | Expected red, 0/2; unchanged pixel threshold catches disabled hold. |
| `overview-all-delayed-old` | Chromium | Expected red, 3/5; reopened Keys still loading. |
| `overview-all-delayed-ready` | Chromium | 5/5 under the same delayed responses. |

The first unfiltered Chromium candidate run (`candidate-four-chromium`) returned 61/64: the three other files passed all 47 results; the ledger live checks timed out at its inherited 5s default (two child failures plus the parent). No teardown rejection remained. An external narrowed diagnostic confirmed the fixture still showed the prior offline response; allowing the existing backoff/discovery interval and waiting for the rendered route passed. That first probe initially had an unresolved relative helper import; the failed diagnostic launch is retained too. The complete ledger Chromium rerun (`candidate-ledger-chromium-2`) passes 17/17, with zero failures/cancellations/skips/todos and successful isolation cleanup. The other three files remain unchanged from their 47 passing results above. The full four-file WebKit run (`candidate-four-webkit`) passes 64/64, with zero failures/cancellations/skips/todos and successful isolation cleanup. `candidate-results.json` records log hashes and confirms the three earlier Chromium-passing files, the rerun ledger, and all WebKit test files still match their recorded source hashes. `git diff --check` also passes. These targeted results do not replace the later full GUI suite or native end-to-end acceptance.

Final candidate TAP SHA-256:

- Chromium complete ledger: `bdbc7258bf0725f387d6d519a5e224160015bf33cd3a00174e9db11cf0465e3b`.
- WebKit complete four-file run: `9194e3bf1195094575736781be198275318e1913d306a0c3351d6afbfdd14847`.

The single-browser slot was handed to the account agent after WebKit exited and isolation cleanup completed. No browser, build or Go process remains owned by this task. Final whole-repository GUI runs wait for the root agent's final source SHA and explicit queue release.
