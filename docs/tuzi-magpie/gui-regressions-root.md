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

Node syntax checks pass. These four files still need dual-engine execution
on the integrated source. The initial original expectation failures are in
chromium-failures.txt; no application source was changed for these fixtures.

The production i18n ownership guard failed because fixture DOM drivers sat
outside a tests directory. Commit1cbe810 moves them into the existing test
exclusion convention, leaving the guard and production translations intact.
All four i18n-keys guards pass after that move.

Website agent separately owns the balance-field test locator, resize-stable
gateway assertions and new Tuzi navigation size adaptation. Any unavoidable
original header behavior difference requires user approval before acceptance.
