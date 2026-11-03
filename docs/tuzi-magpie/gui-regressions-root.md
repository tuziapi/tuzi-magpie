# Root-owned full GUI regression repairs

The complete initial Chromium run uses frozen source2a4eb24. Its raw TAP
and source/file hashes are retained under
/Users/syd08/Documents/tuzi-magpie-evidence/gui-suite. It has not completed
or passed yet. Corrections are made in the integration worktree, separate
from the frozen running worktree.

- agent-disconnect-preview and menu-scroll now expect the explicitly
  approved product title tuzi-magpie. All layout and interaction assertions
  remain unchanged.
- builtins expects the new Tuzi entry at the end of the native navigation.
- gateway-mode expects that entry only in the native window; the web list
  remains exactly the original list.

Node syntax checks and dual-engine execution now pass on the integrated
source. The root target batch passed Chromium46/46 (301.37s) and WebKit52/52
(324.43s), including actual old-WebKit built-in compatibility rendering. The initial original expectation failures are in
chromium-failures.txt; no application source was changed for these fixtures.

The production i18n ownership guard failed because fixture DOM drivers sat
outside a tests directory. Commit1cbe810 moves them into the existing test
exclusion convention, leaving the guard and production translations intact.
All four i18n-keys guards pass after that move.

Website agent separately owns the balance-field test locator, resize-stable
gateway assertions and new Tuzi navigation size adaptation. Any unavoidable
original header behavior difference requires user approval before acceptance.

## Wide account page and exact visual comparison

The existing page-width regression detected that the new Tuzi view lacked
the original built-in pages' centred1200px reading area at1920/2560 widths.
Only body.window #view-tuzi now uses the exact original padding formula,
including scrollbar compensation. All original page rules are unchanged.
The unchanged page-width test passes in both engines across all five
languages, wide, ordinary and narrow windows.

The mobile-web screenshot comparison now normalizes only the exact approved
brand text tuzi-magpie to magpie before comparing against origin/main. It
does not mask icons or page content, change geometry rules, increase the
300-pixel limit, or change the per-channel48 threshold. All original desktop
page comparisons and phone interactions pass in both engines.

Evidence: /Users/syd08/Documents/tuzi-magpie-evidence/root-gui-targets-01
contains both complete logs, results.json, source-manifest.json and the
uncommitted test/source patch at run start. The complete GUI suite remains
a separate pending gate.

## Inherited static test omissions

The original 2251ca1 nav-timeout guard failed because account-rows-fit,
profile-rename and window-visibility gave their pages a5s interaction timeout
but no separate navigation timeout. They now set60000ms for navigation, as
the unchanged guard requires; interaction timeouts and assertions remain.

The original old-webkit static script inventory failed because profilerename.js
was already dynamically imported by app.js but omitted from the explicit
dynamic-module list. The inventory now names that module, while syntax,
built-in and CSS compatibility still scan it. Original failure is recorded
in old-webkit-static-baseline-red.log; all five static guards pass in
old-webkit-static-green.log, and the actual WebKit drawing case passes in
the root target batch. An initial broad diagnostic lacked the explicit
browser installation path; its launch error is retained and is not treated
as a baseline behavior failure or successful runtime check.

## Routing request rows update in place

The first complete Chromium run found `routing-row-swap.test.cjs` waiting
for a row to be replaced. At original 2251ca1 and integrated b2c3575, both this
test and the complete `plugins/routing/client.js` are byte-identical. The
existing `rowOf` now uses `morphRow` to retain the row and its pulse (#3731);
the old test still required the older replacement behavior (#3164).

The corrected test waits for the one pending request to finish, then requires
all 30 original row nodes to remain and the observer to see zero row insertions
or removals. It also requires the original pending row to be connected, have
the success class, and show changed content. The production renderer is
unchanged. This keeps the original no-unnecessary-row-reconstruction purpose
and matches its existing stronger implementation.

Serial single-browser evidence is in
`/Users/syd08/Documents/tuzi-magpie-evidence/routing-row-01/`:

- Original fixture against original assets: both engines fail the old
  replacement wait (6.68s Chromium, 6.90s WebKit).
- Corrected fixture: 1/1 passes in each engine (1.96s,1.94s).
- Fixture-only mutation replaces the completed row instead of morphing it:
  both engines fail with 29 retained nodes instead of 30.
- Fixture-only mutation ignores the row update: both engines fail to reach
  the required 30 success rows, while the initial pending-row precondition
  passes. No application file was changed for these mutations.

`sources.json` retains the tested patch and source HEAD; `results.json` and
engine/case logs retain every initial red, final green and negative control.
Full integrated suites remain separate pending gates.

The account agent independently reviewed the pending test, `rowOf` through
`morphRow` and `placeRows`, and the exact diagnostic copies. It found no
blocking issue: node identity plus the mutation observer still catches the
original row-movement regression, while success/content assertions reject
a skipped update. Product assets have no changes from the recorded b2c3575
through the reviewed d80262b integration head.

## Settings redraw sweep and disabled search controls

The original `segs-press-redraw` sweep provided no search provider and an
empty search API list. `plugins/search/settings.js` intentionally disables
Search ownership in that state. The test nonetheless expected its disabled
button to dispatch a click after redraw. Both the fixture and search renderer
are byte-identical to2251ca1; representative original tests fail in both
engines with no click for `own|magpie@searchAllRow:0`.

Only the sweep fixture now supplies a synthetic search provider, and an
enabled-button precondition makes that requirement explicit. Its original
click-once/live-target, no-save, all-controls and page-error assertions remain.
All eight English/Chinese/Japanese/German wide/narrow sweeps pass per engine
(124.57s Chromium,123.56s WebKit). A fixture-only mutation disables the
existing replacement-button click fallback; both engines fail with an empty
click list where one live Theme option click is required. No product code
changed. Evidence: `/Users/syd08/Documents/tuzi-magpie-evidence/settings-segs-01/`,
including tested-source.json and all baseline/fixed/negative logs.
