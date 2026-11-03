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

The original2251ca1 nav-timeout guard failed because account-rows-fit,
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
