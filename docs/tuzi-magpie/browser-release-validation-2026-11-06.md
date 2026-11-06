# Desktop prerelease browser regression

The frozen full regression uses source
`2f57bda27fdcf82d9de21711ad155853e5a17a06`, assets tree
`d239a35e0ac65d17925ad9d04ae591150c89a610`, and all 1,135 browser test files.
It runs with an isolated HOME, four concurrent files, and separate sequential
`BROWSER=chromium` and `BROWSER=webkit` batches. Some older files explicitly run
both engines regardless of `BROWSER`; the batch totals include those checks.
This is a failing full regression, not a green result for the later candidate.

| Batch | Tests | Passed | Failed | Duration |
| --- | ---: | ---: | ---: | ---: |
| Chromium | 9,551 | 9,482 | 69 | 6,209.76 s |
| WebKit | Running | — | — | — |

The Chromium failures cover 18 files. Node's failure total includes failed
parent tests. Its spec reporter prints failures again in the final summary;
those repeated lines are not additional failures.

## Confirmed corrections

The following changes preserve application navigation behavior and the original
functional/layout assertions:

- Agent-page tests now open `?view=agents` explicitly: `agent-layout`,
  `cli-update`, `import-row`, `plugin-actions`, `plugin-panels`,
  `popover-mac-chrome`, `refresh-page` and `view-no-sideways`. First native
  startup intentionally opens Tuzi. The old tests waited for hidden Agent
  controls. Original cases fail and explicit-page candidates pass.
- `header-zoom-fit` also selects Agents. Its original-navigation control removes
  the Tuzi button from a synthetic document, so it cannot wait for an active
  default Tuzi button. Both navigation variants retain their zoom, width,
  monotonic-collapse and no-overflow assertions.
- `builtins` expects Tuzi before Agents, including when Library returns.
  A disabled feature still falls back to Agents; that assertion is unchanged.
- `phone-web` and `mobile-web` select the visible Agent button when inspecting
  navigation. The first DOM button is now Tuzi and is hidden in a browser.
- `whats-new` compares the URL before and after opening an external release-note
  link. The current native page is `?view=tuzi`, not the root URL. The no-navigation
  requirement, link handling and hostile-note checks remain intact.

Two scoped style corrections address actual layout differences:

- Tuzi's minimum page gutter is 16px, matching the other desktop pages instead
  of moving the content edge by 4px when switching pages. The original
  `page-width` test fails with `20 !== 16`; the candidate passes its original
  centring and width checks.
- A hidden first Tuzi button no longer gives Work the 14px padding intended for
  later sidebar groups. It keeps the first visible group's 2px padding. Before
  this correction, the browser sidebar moved down by 12px. Desktop screenshots
  detect that movement. For comparison with upstream, `mobile-web` normalizes
  the approved distribution brand typography as well as its existing name
  normalization. It retains the actual icon, content and pixel tolerance.
  `brand` separately checks the distribution's intended appearance.

## Header measurement boundary

In the full run, `header-centre` read a 4.78125px gap at English 125%, before
the header had fitted the newly visible Update button. Its two independent
animation frames did not guarantee delivery of the header ResizeObserver and
the application's queued fitting frame.

A controlled diagnostic holds actual header observer deliveries after showing
Update. The old sampling point reads a -23.765625px gap. A test observer remains
pending while those deliveries are held; after their release and the queued
frame, the original assertion reads 14.765625px. Nine observer deliveries were
held. This demonstrates the missing completion boundary, without claiming to
reconstruct the exact unrecorded schedule of the original failure.

The candidate waits for a real resize when dimensions change, then the header
observer and its following frame. The initial same-size measurement also waits
for that observer/frame boundary. It does not poll for a passing gap or alter
the geometry thresholds, and cleans up listeners, observers and frames.
The complete external candidate passed all 14 checks across both engines.
A permanent 80px navigation displacement still fails the original assertions.

## Unresolved failures

These are not considered fixed by focused passes:

- `market-have`: both Chromium and WebKit Chinese did not show Fetch's Added
  marker after a manual add. The same failure is recorded in upstream
  [4620](https://github.com/yetone/magpie/issues/4620).
- `plugin-page`: the plugin's Hide button did not clear its cost within 8s.
  Upstream [3220](https://github.com/yetone/magpie/issues/3220) records the same
  whole-suite/standalone distinction.
- `routing-rule-columns`: the narrow-page measurement found one `rt-cond`
  beyond its editor. Upstream [4461](https://github.com/yetone/magpie/issues/4461)
  includes this file, but does not establish the cause of this exact failure.

The linked issues and their comments were read; none supplied a patch for these
cases. Focused original runs passed. An additional bounded market/plugin run
with input-event and request diagnostics also passed, so it captured no failure
to attribute. No retry, timeout increase, assertion relaxation or speculative
production change was used to clear these failures.

The earlier `side-effort` and `click-scroll` anomalies also remain unlocated;
the bounded passes and this run's protocol logs do not close F01/F11 in
[closing-blockers.md](closing-blockers.md).

## Evidence and candidate validation

Evidence is under
`/Users/syd08/Documents/tuzi-magpie-tools/release-20261106/`:
`gui-full-results.json`, full engine logs, the extracted Chromium summary,
per-file diagnosis directories, `header-boundary-diagnosis`, and
`interaction-diagnosis`. The aborted initial instrumentation run is retained
separately and is not counted as a completed regression.

The confirmed corrections are being checked in a separate candidate checkout,
while the full regression continues reading the untouched frozen checkout.
`candidate-validation/results.json` records the source patch, file hashes,
complete changed test files and affected Tuzi/navigation/layout cases in both
engines. The 22-file Chromium candidate batch passed 159/159 checks in 849.50 seconds.
The WebKit candidate batch and the remaining frozen full batch are still running.
The candidate source is committed through `c0dc27135`; the recorded base plus
patch and hashes identify the same tested file contents.

Additional market diagnostics retained under `interaction-diagnosis` include
eight Chinese WebKit runs with input/focus/request tracing (32/32 checks passed),
and a held-initial-focus experiment (8/8 passed). Neither reproduced the full
run failure, so neither is a fix or a reason to clear it.

Publication remains blocked by unresolved browser failures and the confirmed
GitHub Actions billing failure. Native Windows installation checks have not
run. See [release validation](release-validation-2026-11-06.md).
