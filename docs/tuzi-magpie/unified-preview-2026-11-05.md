# Unified local preview — 2026-11-05

## Source and behavior

All work is consolidated in `/Users/syd08/Documents/tuzi-magpie-local`, branch
`codex/tuzi-magpie-local`, based on `9585a49`. This preview was initially
uncommitted; the user subsequently authorized uploading it to
`https://github.com/tuziapi/tuzi-magpie` on 2026-11-05.
The eight changed frontend assets match the polished worktree byte for byte;
that worktree remains a backup. The original checkout's unset-language default
of Simplified Chinese and its explicit-language preservation remain in place.

The native window now starts on Tuzi account when no valid last page exists.
Explicit links win, then a saved page (including Agents). Web and tray defaults
are unchanged, and unavailable Tuzi falls back to Agents. A fresh window starts
at 1200×800 points. Valid saved sizes, position and maximisation still win.
These are startup presentation defaults; account, gateway and billing behavior
was not changed by this consolidation.

## Build and native inspection

Built with `make app TAGS=production VERSION=tuzi-unified-local-20261105`.
Output: `/Users/syd08/Documents/tuzi-magpie-local/tuzi-magpie.app`.
Executable SHA256 before signing the preview copy:
`e668f45d1248a6d21703fa2d3bc76e2db0a7847c288522f7f2b131243f28cd0e`.
Existing Objective-C enum and duplicate-library warnings remain.

Fresh isolated production check passed on loopback port 18563. Native inspection
confirmed Chinese, Tuzi as the first page, all navigation items visible, the
original Magpie bird and the one-line title. The captured window is 1199×799
pixels in this capture, consistent with the existing documented macOS one-point
window sizing difference. Selecting Agents, quitting and reopening restored
Agents. No account was connected in this fresh check.

Evidence: `/private/tmp/tuzi-magpie-unified-20261105-01/` (`result.json`,
`visual-verification.json`, `first-launch.png`). The automated startup result's
`uiVisuallyVerified:false` describes that script alone; visual inspection is
recorded separately. The fresh verification process was then closed.

The existing preview at
`/private/tmp/tuzi-magpie-preview-20261104-02/tuzi-magpie-production-acceptance.app`
was updated with this binary and reopened. Its launcher and configuration were
preserved; native inspection confirmed the existing account still connected.
Its old binary was saved as `tuzi-magpie-before-unified-20261105` beside the app.
The existing preview respects its saved window dimensions.

## Validation

Before implementation, the new startup regression failed on Agents instead of
Tuzi; the window regression failed on 660×600 instead of 1200×800. Both pass
with the implementation. Targeted GUI asset budgets and settings tests pass;
JavaScript syntax, Go formatting, `git diff --check` and macOS `go vet ./...`
pass. `last-page`, `tuzi-account`, `brand` and `i18n-keys` browser tests passed
30/30 in Chromium and WebKit, including account interactions in all five
languages and both wide/light and narrow/dark layouts. Linux and Windows
cross-platform `go vet` also passed, as did Linux nogui and Windows builds.
The additional navigation/language run passed 31 tests; its two failures were
the gateway-mode fixture still expecting Agents on a fresh native window.
That expectation now distinguishes native Tuzi from Web Agents; all six tests
in its final rerun passed in both engines. This gives 63 distinct passing
browser checks across the selected files.

The full `go test -tags nogui ./...` run finished **red**. `internal/gui` and
`internal/settings` passed. `internal/davsync`'s `TestSync` assumed an unset
language differed from Chinese; its conflict fixture now explicitly selects
`system` and checks that exact result, keeping it independent of the product
default. An intermediate `en` fixture collided with a later `en` stage and
was corrected to `system`. The final full `internal/davsync` package rerun
passed (34.6 seconds).
`internal/gateway` failed `TestUnroutedHeldReportSaved` (the report omitted
`(under way)`) and hit the package's ten-minute timeout while
`TestDSMLBlockClosedWithCalls` was running. These gateway failures have not
been diagnosed or repaired in this frontend task; no full-suite green claim
is made. Account API and routing code were not changed.

Logs are retained in
`/Users/syd08/Documents/tuzi-magpie-tools/ui-polish-preview/validation/unified-20261105/`.

This is a local preview, not a release. The historical full GUI acceptance
blockers remain documented in `closing-blockers.md`; no full GUI suite or
cross-platform native runtime acceptance is claimed here. The API website is a
separate checkout and was not modified by this consolidation.
