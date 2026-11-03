# F01 side-effort sampling repair and separate evaluation anomaly

2026-11-04. This commit submits the existing, previously exercised candidate
for `internal/gui/tests/side-effort.test.cjs`. It changes only test text
sampling: read the authored visible child label with exact textContent, and
wait for that exact visible label after choosing or clearing effort. No trim,
expected value, timeout, geometry threshold, request assertion, fixture,
shared helper or product behavior changes. The settings-refresh evaluate
which failed in Chromium remains byte-for-byte unchanged.

Candidate SHA-256:
`644187b8afac69ff9a36de474d47f9f71385b8a6a96e62c510a2e5cd6e1ad8a2`.

## Evidence for the text correction

- Original frozen complete WebKit log:
  `/Users/syd08/Documents/tuzi-magpie-evidence/gui-final-c7238e14891f-c4/webkit.log`,
  starting at line 48871. The original side-effort assertion receives
  `Default\n` versus `Default`, likewise the translated labels. The product
  `sideEffortChip` explicitly creates a child span holding the authored label.
- Representative cause/negative controls are in
  `/Users/syd08/Documents/tuzi-magpie-evidence/f01-text-sampling-01/`:
  `prepare-controls.py`, `controls-manifest.json`, `control-results.json`,
  `old-samples.json`, `control-summary.json` and `control-logs/`.
  The direct-label representative is **settings-general**, not a side-effort
  mutation test. Old WebKit samples against both original 2251ca1 and c723
  assets expose a rendered trailing newline; exact visible-leaf sampling
  passes, wrong text and hidden text fail their original exact/visibility
  checks. Other shape controls cover chips, pills, quotas and raw bodies.
  Across all representatives: 70 invocations, 32 target-negative failures,
  14 candidate target passes and 24 old observations. These counts are not
  claimed as 70 side-effort tests or side-effort-specific negative controls.
- `targeted-manifest.json`, `targeted-summary.json` and complete engine logs
  preserve the original full 17-file candidate batch: Chromium **154/155**,
  exit 1; WebKit **155/155**, exit 0; zero skipped/cancelled. All candidate
  source hashes remained unchanged. Thus side-effort's five WebKit language
  cases complete, while Chromium's Japanese case fails later as below.
- The one subsequent complete Chromium side-effort protocol capture is
  recorded by `side-effort-protocol-manifest.json`,
  `side-effort-protocol-result.json` and `side-effort-protocol-once.log`:
  **5/5**, exit 0, 19.28s, all original languages/widths and assertions.
  Only asset/helper paths were relocated. It added no wait, retry or gate.
  This successful run does not repair or explain the earlier exception.

## Separate unresolved Chromium boundary

Read the complete original `targeted-chromium.log` (176 lines), the test,
fixture and reader lifecycle, and installed Playwright error-handling source.
The lone failure is candidate line 166/original line 155, the awaited
GET `/api/settings` → JSON → `renderSettings()` evaluation. That width's two
chip interaction sequences and their save/clear/close/Escape/zero-movement
assertions precede it. The subsequent prefsKeep assertions were not reached.
The original log does not identify the width or include CDP/frame events.

No test-cleanup concurrency path was found: the runner specifies
`--test-concurrency=1`, each language owns a separate browser/page, operations
are awaited, and `t.after` closes only that case's browser after the callback
settles. There is no test timeout/abort and the result has zero cancellations.
Startup already waits for goto and settingsDrawn. The exercised settings and
menu handlers do not navigate. These source facts do not reconstruct the
unrecorded failure-time browser state.

The reported sentence ends with a period, matching Chromium
`crExecutionContext.js:rewriteError`; the actual frames.js context-destruction
messages lack that period. rewriteError converts underlying non-JavaScript,
non-closed/crashed-session errors to the navigation-sounding message. This
supports classifying the observed failure as a rewritten evaluation-layer
error; it does not prove product navigation or a specific browser bug.

The later raw protocol capture contains ten successful target refreshes and
21 `Runtime.releaseObject` failures after explicit navigations, with no target
refresh error. Those release failures are not assigned as the old cause.

The text repair may therefore be integrated independently. The later
Chromium evaluation anomaly remains **unresolved**, with its red batch
preserved separately. This commit does not claim F01's entire validation,
AC-13, the complete GUI suite or the development goal passed. No additional
browser run, speculative wait, retry, skip or product change accompanies it.
