# Full GUI suite: original Chromium run

This is the preserved first run, before the resulting repairs. It is a failed run and is not final GUI acceptance.

- Source: `2a4eb246fb7b4b8d99d591d4c935930918929f70`, clean `codex/tuzi-magpie-gui-suite` at `/Users/syd08/Documents/tuzi-magpie-ui`.
- All 1,135 `internal/gui/tests/*.test.cjs` files, Node v24.21.0 / Playwright 1.56.1, `BROWSER=chromium`, `--test-concurrency=2`, TAP reporter. Some original files hardcode both engines and ran them regardless of BROWSER.
- Pinned browser cache: `/Users/syd08/Documents/tuzi-magpie-tools/browsers`; dependencies: `/Users/syd08/Documents/tuzi-magpie-tools/node_modules`.
- Started 2026-11-03 06:52:20 UTC; ended 09:37:15 UTC. Duration 9,894.8 seconds. Exit 1.
- TAP: 9,525 tests, 9,353 pass, 172 fail, 0 cancelled/skipped/todo. Counts include parent tests and failed child tests; there are 111 failed top-level results and 61 nested failed results, across 46 files.
- No running source/test file changed: every recorded SHA-256 still matched, and final Git status was clean.
- Original WebKit full run was deliberately not started: the root agent owns the queue for integration, Go, CLI and native checks before final GUI runs.

## Evidence

External evidence directory: `/Users/syd08/Documents/tuzi-magpie-evidence/gui-suite/`. `run-manifest.json` records the exact test list and source file hashes; `chromium.log` is the complete unedited TAP output; `chromium-state.json` records PIDs, command, timestamps and exit code; `chromium-summary.json` records final source verification and failures by file; `chromium-failures.txt` preserves every failure diagnostic.

- Source-manifest aggregate SHA-256: `e3cf0fd07a9173ed29ee330982313dddf4a65f4b28eca0549b01e127b00a3b18`.
- Complete TAP log SHA-256: `3ff9171fb7bffd56fbd2a56c8772d31d434dd75ebe87e2e21c9496a597062b92`.

## Failure inventory

This inventory records observed results, not root-cause conclusions. Each repair requires its own original-state reproduction, meaningful verification and review. Original-page layout expectations and pixel thresholds must not be weakened to hide regressions. The root agent has separate repair ownership records.

| Test file | Failed TAP results including nested parents |
| --- | ---: |
| `agent-disconnect-preview.test.cjs` | 2 |
| `balance-fix.test.cjs` | 17 |
| `brand.test.cjs` | 1 |
| `builtins.test.cjs` | 1 |
| `gateway-caller-keys.test.cjs` | 1 |
| `gateway-key-models.test.cjs` | 1 |
| `gateway-mode.test.cjs` | 1 |
| `header-zoom-fit.test.cjs` | 2 |
| `i18n-keys.test.cjs` | 1 |
| `menu-input-scroll.test.cjs` | 2 |
| `menu-scroll.test.cjs` | 12 |
| `mobile-web.test.cjs` | 4 |
| `model-chip-steady.test.cjs` | 20 |
| `model-copy-id.test.cjs` | 2 |
| `models-select-all-api.test.cjs` | 5 |
| `models-works-only.test.cjs` | 4 |
| `nav-timeout.test.cjs` | 1 |
| `old-webkit.test.cjs` | 1 |
| `omarchy.test.cjs` | 3 |
| `page-width-steady.test.cjs` | 5 |
| `page-width.test.cjs` | 6 |
| `phone-connect-menu.test.cjs` | 2 |
| `plugin-move-unserved.test.cjs` | 2 |
| `provider-fetch-again.test.cjs` | 7 |
| `provider-models-rest.test.cjs` | 2 |
| `provider-picks-stay.test.cjs` | 2 |
| `provider-typed.test.cjs` | 2 |
| `recovered-file.test.cjs` | 5 |
| `remote-magpie.test.cjs` | 3 |
| `rest-try-now.test.cjs` | 1 |
| `routing-row-swap.test.cjs` | 1 |
| `routing-rule-drag.test.cjs` | 5 |
| `routing-rule-remove.test.cjs` | 3 |
| `routing-stage-routes.test.cjs` | 1 |
| `routing-steady.test.cjs` | 1 |
| `segs-press-redraw.test.cjs` | 8 |
| `sidebar.test.cjs` | 6 |
| `tencent-cloud.test.cjs` | 2 |
| `tray-cell-click.test.cjs` | 2 |
| `usage-agents-hide.test.cjs` | 11 |
| `usage-fold.test.cjs` | 1 |
| `usage-ledger.test.cjs` | 3 |
| `usage-overview-fold.test.cjs` | 3 |
| `vertex-editor.test.cjs` | 4 |
| `web-app-standalone.test.cjs` | 1 |
| `zhipu-team.test.cjs` | 2 |

## Tuzi-specific outcomes in this run

The five Tuzi browser flows passed (account tabs and Key operations; unknown writes and Web exclusion; filters, metadata and prefill lifecycle; authentication invalidation; initial-open/connect ordering). The three money/pricing tests and four native navigation guard tests also passed. This does not substitute for the actual desktop / Go / gateway synthetic end-to-end acceptance or the final complete GUI runs.
