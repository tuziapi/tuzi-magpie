# Layout fixture review and recovery record

Owner: account subagent, independently diagnosing the parent's full GUI run.
Worktree: `/Users/syd08/Documents/tuzi-magpie-account`.
Branch: `codex/tuzi-magpie-layout-fixtures`, based on `dfe25d8`.
Original reference: `2251ca1`. Only five test files and this record change;
production markup, CSS, behavior, scroll guards and animation remain unchanged.

## Source comparison and actual reproduction

The five tests, `reader.cjs`, `fixtures/caller-keys.cjs`, `app.css`, Omarchy
assets and gateway plugin sources are byte-identical between the original
reference and integration base. The relevant `app.js` agent details, status,
Omarchy and scroll-guard functions are also unchanged. The conclusions below
use browser reproduction as well as this static comparison.

Focused original-fixture runs used en, plus both public/no-public phone cases,
against original and current assets in both engines:

| Case | Original and current Chromium | Original and current WebKit |
| --- | --- | --- |
| Omarchy control after wheel 260 | Fails viewport precondition | Fails viewport precondition |
| Pi details overflow at height 330 | Fails overflow precondition | Fails overflow precondition |
| Recovery warning exact class string | Fails with `status warn lift` | Fails with `status warn lift` |
| Provider Try now scroll snapshot | Passes in this focused run | Fails `ebody holds:200` vs `ebody:200` |
| Phone address from page top | Both cases fail at bottom 800.328125 | Both cases pass |

The parent's broader Chromium run found the same Try now class difference at
scrollTop 400. This follow-up does not claim its focused Chromium reproduction
failed; WebKit supplied the real red on both trees.

## Test corrections

- `ad6ba3b`: Omarchy uses the existing reader `reach` helper for the entire bar
  row. A 260px wheel left its control at y457.703–483.703 while the view ended
  at 420. Reaching only the inner option could still clip the enclosing
  segmented control, so the full row is reached. The original complete-control
  visibility, On/Off POSTs and exact no-scroll assertions remain.
- `a9510a5`: page-width sizes the fixture to the folded content's bottom plus
  16px. Pi's details are only 104px tall and ended at y242.5, so the old 330px
  window never overflowed. A fixed 240px replacement was rejected because
  Japanese folded content could already overflow. Both original overflow
  preconditions and exact width/row-edge checks remain, in every language.
- `995868a`: phone applies a 1px bottom scroll margin only to its synthetic
  anchor. The parent authorized this fixture positioning adjustment while
  retaining the original strict visibility assertion. Before the click, the
  original Chromium public/no-public address tops were 1090.328125 and
  1134.328125, both below the 800px window. Corrected nearest scrolling puts
  the address at 755.328125–799.328125. The below-fold precondition, synchronous
  scroll/focus/click sequence, menu-open, full visibility, menu adjacency and
  item selection checks are unchanged. No product tolerance or CSS changes.
- `41bbdbe`: recovered-file ignores only `lift` when requiring exactly
  `status` and `warn`. `status()` deliberately lifts a long message to wrap
  above the footer; this class is placement, not a transient animation or
  severity. Text, backup timestamp, narrow-window fit and once-only checks stay.
- `76582b2`: rest-try-now identifies scroll containers by their DOM position
  up to an ancestor ID, retaining exact scrollTop and window scrollY. The
  provider redraw replaces `.ebody`, while pointer movement toggles `holds`.
  Neither a complete class string nor object identity identifies the same
  logical container across this redraw. All POST, rest-removal, status-text,
  reachability and no-scroll assertions remain.

## Final verification

All runs were serial, one browser and one test worker at a time, under the
parent's lightweight browser slot. Counts below are Node test-runner counts
(Omarchy includes its parent and six subtests).

| Actual repository test | Chromium | WebKit |
| --- | --- | --- |
| Omarchy, full file | 7/7, 12.235s | 7/7, 12.297s |
| Page width, full file | 10/10, 12.540s | 10/10, 13.009s |
| Recovered file, full file | 5/5, 1.707s | 5/5, 3.483s |
| Try now, full file | 20/20, 46.550s | 20/20, 45.699s |
| Phone, two changed scenarios | 2/2, 2.820s | 2/2, 3.002s |

The full files retain their existing languages, widths and platform variants.
The phone file's other scenarios were not rerun in this follow-up. Parent
integration and full-suite gates remain separate.

Each corrected focused test also passes against original `2251ca1` assets in
both engines. Each negative control below fails the intended behavior assertion
in both engines, using copies of assets outside the repository:

| Isolated mutation | Actual failing assertion |
| --- | --- |
| Omarchy POST callback scrolls 20px per pick | `a pick moves nothing`, 40px change |
| View overflow `scroll` changed to `auto` | `the page narrowed by 8px` |
| Recovery severity changed from warn to ok | Exact semantic class comparison |
| Try now callback scrolls editor by -20px | `the click scrolled`, same path 200→180 |
| Every outside scroll closes menus | `the menu stays open`, 0 instead of 1, both phone cases |

Evidence directory:
`/Users/syd08/Documents/tuzi-magpie-evidence/layout-fixtures-01/`.
`baseline-*` and `current-*` are original-fixture diagnostics;
`corrected-baseline-*` are corrected focused comparisons; `negative-*` are
the negative controls. `final-*` are the final full Omarchy/page-width/Try-now
runs. `fixed-*-recovered-file.log` and `fixed-*-phone-connect-menu.log` are
the final unchanged recovery/phone corrections. Other `fixed-*` logs record
the rejected initial smaller-viewport/inner-option/object-identity attempts,
not final green evidence. Temporary diagnostic scripts and the negative
asset copy are retained beside the logs.

Commands use `NODE_PATH=/Users/syd08/Documents/tuzi-magpie-tools/node_modules`,
`PLAYWRIGHT_BROWSERS_PATH=/Users/syd08/Documents/tuzi-magpie-tools/browsers`,
`BROWSER=chromium` or `webkit`, and `node --test --test-concurrency=1` with the
test filename. The focused phone pattern is `address clicked`.

`git diff --check` passed. Requests used synthetic route fixtures. No live
accounts, credentials, inference, external services, Go build or full GUI
suite ran in this follow-up. All test-owned browsers and timers ended; no
listener or port was started. The browser slot was released to the parent
after the last negative control. The worktree has no unrelated edits.
