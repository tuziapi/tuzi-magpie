# F03 — Account eye detached style sampling

Owner: account subagent. Worktree `/Users/syd08/Documents/tuzi-magpie-account`,
branch `codex/tuzi-account-eye-detach`, based on frozen full-suite source
`c7238e14891f917b67d80209857d3d1db4cb4c42`. Original reference: `2251ca1`.
The full GUI run remains exclusive. No browser, test, Go/build or native
process has been started for this investigation. No frozen/root file changes.

## Observed failure and static evidence

The parent supplied the first full Chromium failure at
`/Users/syd08/Documents/tuzi-magpie-evidence/gui-final-c7238e14891f-c4/chromium-observed-failures.txt`:
Traditional Chinese Usage account-eye test, initial `opacity` assertion at
line 294, actual empty string versus expected `none`. The run did not record
node attachment state; a detached-node explanation remains to be dynamically
confirmed, not assumed proven by the symptom alone.

`account-eye.test.cjs`, `app.css`, `quotaall.js` and Usage `page.js` are
byte-identical between `2251ca1` and `c7238e14891f`. The CSS explicitly gives
`.acct-eye` `display:none` and `opacity:0`; masking changes display to
`inline-flex`, and hover/focus/shown state changes opacity to 1. A connected
eye should therefore return `none`, `0` or `1` in these assertions.

The installed Playwright implementation was read: `Locator.evaluate` resolves
an attached ElementHandle through `waitForSelector`, then evaluates the
callback on that handle in another request. The unchanged `renderQuotas`
replaces the Usage card container's children. Its two-account fixture starts
the lazy `quotaall.js` import, which calls `renderQuotas` on completion; quota
history/refresh callbacks can also redraw. The earlier tray change retains
the import's same success redraw, adding only requested-navigation gating.
Initial `load.done` cannot exclude all subsequent redraws.

The repository's `reader.cjs` already documents replacement between locator
resolution and element evaluation. Merely replacing this call with
`evaluateAll` is not claimed atomic: this installed Playwright's server also
obtains an array handle and evaluates it separately. The candidate instead
checks the exact condition that invalidates a sampled style.

## Prepared candidate and deterministic checks

Only the `opacity` test helper changes. At most ten attempts resolve the same
strict locator. The callback returns null only when `e.isConnected` is false,
causing a new locator resolution. Any connected node's actual display/opacity
is returned immediately to the unchanged assertion, including an incorrect or
empty value. Selector/strictness errors propagate. There is no sleep, no wait
for a desired style, no catch-all retry and no production change.

Ten is a hard sampling-attempt budget, not a claim about how many redraws the
application will perform. The controlled single redraw needs only one fresh
sample; the extra bounded attempts permit a finite burst of independent
refreshes. Ten consecutive detached samples still fail explicitly. This cannot
wait out a real opacity/display defect: on the first connected node the helper
returns its actual value, and the original assertion fails immediately if it is
wrong. Attachment checking and style reading share one synchronous page callback,
with no await through which a normal redraw task could interleave.

Prepared external evidence is under
`/Users/syd08/Documents/tuzi-magpie-evidence/account-eye-01/`:

- `account-eye-forced-redraw.cjs`: frozen original test with exactly one real
  `renderQuotas()` call inserted after the first Usage eye has been resolved
  but before its style is read. Log whether the old handle is attached before
  and after, whether the current corresponding eye differs, and both styles.
  The original strict expected result remains.
- `account-eye-forced-redraw-candidate.cjs`: same insertion in the candidate
  helper. It must discard the detached sample, query the new live eye and
  satisfy the same exact expectations. The inserted redraw is once per page,
  so the retry cannot manufacture the expected result.
- `visible-unmasked-eye-assets/`: copied assets changing only the unmasked
  `.acct-eye` display from `none` to `inline-flex`. A real connected node then
  has opacity 0; the candidate must fail the unchanged expected `none`
  assertion. This protects against accidentally accepting wrong styles.
- `investigation.json`: source, worktree, branch and candidate test hash.

Once the parent releases the queue, planned validation is original/current
assets with the controlled redraw, candidate controlled redraw in both engines,
the real CSS negative control in both engines, and the entire actual account-eye
file in both engines. The full file retains English, Simplified and Traditional
Chinese, Japanese and German; provider editor, tray and Usage scenarios; and
their existing two viewport widths. No assertion or language/scenario is removed.

## Recovery state

Current changes are this record and the candidate helper, not yet committed
as verified. Static `git diff --check` passes. Dynamic causality, corrected
behavior and negative-control results are pending; none is represented as
passed. The full-suite processes are owned by the parent and remain untouched.

The user subsequently requested a finishing freeze. This candidate is retained
only on the independent branch: no execution or integration is authorized while
the full dual-engine result is still pending. Root will classify the finite
remaining blockers and relevant acceptance impact before deciding whether to
validate or adopt it. The structural sampling gap predates this task, but the
particular failed sample is not proven detached until the planned browser
evidence exists; no new failure is excused as a flake or marked passed here.

For the final blocker inventory, this is an unresolved AC-13 GUI regression
result, with a suspected pre-existing test sampling defect and no confirmed
new product-style regression. The minimum candidate scope is one test helper
plus its evidence record. It changes no AC-16 product appearance or workflow,
and retains the privacy eye's strict behavior assertions. Its verification
scope, if later authorized, is this file's existing two-engine coverage and
the deterministic redraw/CSS controls; this candidate alone does not justify
another complete GUI-suite run.


## Authorized closing verification (2026-11-03)

After both full engines finished, root explicitly assigned the exclusive browser
slot for F03/F04. The earlier pending/freeze paragraphs above record the prior
state; this section supersedes their execution status.

All commands used Node's test runner, the isolated tools/node_modules and
Playwright browser cache. Runs were serial, with no Go/build/native processes.
Evidence prefix: `/Users/syd08/Documents/tuzi-magpie-evidence/account-eye-01/`.

| Check | Chromium | WebKit | Log suffix |
| --- | --- | --- | --- |
| Frozen helper with one real renderQuotas redraw, en Usage | expected failure 0/1 | expected failure 0/1 | `forced-original.log` |
| Candidate with the same real redraw, en Usage and both widths | 1/1 | 1/1 | `forced-candidate.log` |
| Candidate with real wrong unmasked display CSS | expected failure 0/1 | expected failure 0/1 | `wrong-css.log` |
| Entire actual account-eye file, all five languages/scenarios/widths | 15/15 | 15/15 | `complete.log` |

Logs are named `<engine>-<suffix>`. Both original-control logs report
`before:true`, `after:false`, `replaced:true`, stale display/opacity empty,
and live replacement display `none`, opacity `0`. The original assertion fails
with empty string versus `none`. Both wrong-CSS controls fail with `0` versus
`none`: a connected but incorrect style is not retried or accepted. No cleanup
failure occurred. Controlled redraw passes keep the original behavior assertions.

This deterministically establishes the stale-handle failure mechanism. It does
not retroactively prove attachment state of the uninstrumented full-suite sample.
The product CSS/rendering and original test are unchanged from baseline; the
accepted correction is test-only and does not change AC-16 appearance/workflow.
The sole test diff is the bounded detached-sample helper. No full suite rerun was
started. The earlier original-full-suite failure remains recorded, with this
scoped correction and verification supplied for F03 closure review.
