# Recovery record

Updated: 2026-11-02. Active goal TM-LOCAL-1.0. Continue through M0–M3 and delivery; no milestone is the final goal.

| Role | Worktree | Branch / initial HEAD |
|---|---|---|
| root integration | /Users/syd08/Documents/tuzi-magpie-local | codex/tuzi-magpie-local / 2251ca1 |
| baseline read-only | /Users/syd08/Documents/tuzi-magpie-baseline | detached 2251ca1 |
| account | /Users/syd08/Documents/tuzi-magpie-account | codex/tuzi-magpie-account / 2251ca1 |
| ui | /Users/syd08/Documents/tuzi-magpie-ui | codex/tuzi-magpie-ui / 2251ca1 |
| website | /Users/syd08/Documents/tuzi/tuzi-api-magpie-guide | codex/tuzi-magpie-guide / 34063ef |

Original development checkout remains untouched (including .DS_Store); final integration will be delivered on its own branch/worktree. Original website branch and reference repository are untouched.

Completed: read frozen source documents/code standards/lessons and inspected runtime; checked Git state; created isolated worktrees; source snapshots/interface/task/AC tables. Website agent implementing guide compatibility.

Uncommitted ownership: root docs in integration worktree; other agents own changes only in assigned worktrees. No integrated implementation commits yet.

Tests/processes/ports: no app or synthetic service started yet, no tests recorded. Reserve synthetic account 18341, upstream 18342, gateway 18343, desktop test backend 18344 (check free before use).

Next: dispatch account/frontend using README interface, capture baseline with upstream assets and synthetic fixtures; implement identity isolation; queue lines/images when a slot frees. Required full checks and actual Codex/Claude/native desktop flows remain pending. No external blocker identified yet.

## 2026-11-03 continuation

- Baseline docs committed `6a7b9c8`; isolated root branch remains codex/tuzi-magpie-local.
- Website committed `e2ba322b2cd57ef71dc9467ad5107be5f569bb47` in its dedicated guide branch. Root read actual helper/card diff; changes restricted to fixed-source selection, text, delayed-launch cancellation, tests/translations. 142 tests, production build, 8 Chromium/WebKit scenarios passed. Native activation still pending.
- website agent now owns lines worktree `/Users/syd08/Documents/tuzi-magpie-lines`, branch `codex/tuzi-magpie-lines`, base2251ca1. Owns presets and protocol/image compatibility/tests, not provider.go.
- account agent owns Provider.TuziSource optional metadata and provider/tuzi_source.go in addition to prior scope. Source append checks current raw file before atomic replace, retains unknown fields; non-cooperating external writer race remains review topic.
- UI agent has four-tab implementation and paired contract, tests running; no integration yet.
- Root uncommitted work: product identity central constants, config/cache/log/portable names, bundle/launch/service/shortcut/scheme/CLI identity, default gateway3435/browser3440, default update disabled, publication workflows renamed `.yml.disabled`, native clipboard and fixed navigation handler. Runtime APIs/file formats/import paths remain upstream-compatible. Added distribution marker prevents auto-quitting original Magpie even if manually pointed at its port.
- Baseline 64 screenshots (8 pages × en/zh × light/dark ×1100/440) and manifest in evidence/baseline. Uses isolated Playwright fixtures; no external requests. Script scripts/tuzi-magpie/visual-baseline.cjs reusable for integrated comparison. Baseline mock smoke is not native E2E.
- Tools installed only in `/Users/syd08/Documents/tuzi-magpie-tools`: playwright1.56.1 and browsers. Set NODE_PATH=/Users/syd08/Documents/tuzi-magpie-tools/node_modules, PLAYWRIGHT_BROWSERS_PATH=/Users/syd08/Documents/tuzi-magpie-tools/browsers. Bundled runtime browser version was slow; unified fixed version now installed.
- Identity tests first/second runs found expected hardcoded upstream directory/command fixtures; updated relevant test identity literals without removing scenarios. Third run in progress, log evidence/identity-third-test.log. Account three-package Tuzi tests and race passed before subsequent DTO improvements; agent will repeat.
- No app/service process running; only active short tests. Reserve synthetic ports18341–18344 as above. Go cache pinned to /Users/syd08/go{,/pkg/mod} and /Users/syd08/Library/Caches/go-build. scripts/tuzi-magpie/isolated.sh provides disposable HOME for checks; package TestMain also clears agent environment and blocks real agent tools.
- Remaining: finish identity tests/native compile and meaningful red-on-old; integrate/review agents; full Go/vet/platform builds/GUI; independent review; real Wails + real isolated Codex/Claude CLIs against local synthetic account/model servers; screenshot comparison and final bundle startup/delivery. Goal active, no core AC claimed complete.

## 2026-11-03 integrated continuation (13:20)

- Account integrated as `8471bba` (source14e98ad); cancellation follow-up `e7e05cd` (source4d2f27e). Lines/images integrated as `ed1c16a` (sourcea3e8f7b). Website remains e2ba322 on separate guide branch. UI awaiting its five-language/browser suite and commit.
- Independent account-author review of root identified and root repaired: Makefile install overwriting upstream basename, updater asset/bundle/staging names, Windows install location, notes/release-feed defaults, process-name recognition and manual takeover of other distribution. Old staging unregister now stays in own namespace. Updated tests retain original cases with new identity fixtures.
- Root account Handler registration and CLI parity scanner/exceptions now added; fixed deep link uses normal show/discard navigation in warm window, cold opens tuzi. Root shared preset JSON carries fixed TuziLinks; only Tuzi editor gets purchase/query buttons. UI navigation/style/scripts and busy/dirty guard wired; plugin Go import waits UI commit.
- Corrected source interpretation: current api-contract IF-15→PRD77/source-audit C09 overrides old assistant query URLs. Coding query coding.tu-zi.com/reseller; GAC query gaccode.com/subscriptions. Account links were already right; lines commit corrected.
- Identity fourth test exposed old staging-unregister names (now fixed). `identity-integration-test.log`: update/proc/gui Tuzi + staging + process/takeover tests passed. Native production `go build` passed (`native-compile.log`), with existing SDK/link warnings. This compile precedes UI integration and is not final deliverable.
- Added fixture-only GUI constructor and native-window script hook (`tuzi_fixture` tag); production has no origin or script override. Upcoming real Wails run will use isolated HOME/CFFIXED_USER_HOME and loopback synthetic services.
- Active agents: account is tightening endpoint qualification metadata and re-reviewing root; UI running five languages then WebKit; website now owns real official Codex/Claude isolated CLI→gateway tests and reusable synthetic server. Existing claude executable was a third-party launcher; install official CLI only in task tools directory. No real credentials/external model calls.
- Go queue: website CLI test next, then account small protocol suite, then root full validation. Root has no active Go process. No daily app or persistent fixture server started yet.
- Root changes remain uncommitted pending identity red test and final review. Do not discard them or recopy old branches. Full/native end-to-end, full GUI/Go/platform validation, same-condition screenshot comparison and delivery are still pending; goal stays active.

### Latest evidence (13:25)

- Official installed CLI acceptance integrated `b0b3750` from4a3b274; read actual sandbox, native Agent wiring, exact completion-event assertions and synthetic fixture. Account protocol/default-group review integrated `7dac009` from57c050f; read actual metadata and fallback diff.
- Root shared-wire tests initially failed because broader route scanner now sees existing usage/checkin-account wrapper; added its existing usage-only exception. Recheck GUI/CLI route parity passed; see shared-wiring-tests.log and shared-wiring-recheck.log.
- Identity feed mutation produced expected failure before any network request; restored test passed (identity-red-feed.log, identity-restored-feed.log).
- Actual native acceptance runner/script and fixture server command are prepared but NOT run yet. UI final commit pending. No app or server left running. Go queue currently free.

## Native acceptance recovery (2026-11-03 13:43)

- Root HEAD ca96704 after UI auth invalidation fix1580eeb (sourceb5c98db) and independent review4598a51. Cold navigation root patch preserved.
- First fixture desktop run native-01 timed out with no fixture requests/result. Evidence outside repo at /Users/syd08/Documents/tuzi-magpie-evidence/native-01. Own fixture/app PIDs55833/55834, ports18341/18343. Original user's Magpie is running and must not be touched. Root adding fixture-only startup/request diagnostics.
- Account agent repairing automatic Agent maintenance ownership; empty or corrupt isolated applied/stash must never authorize rewriting upstream configs. Explicit Apply creates permission-limited original backup. UI business auth failure repair reviewed/integrated. Website agent adding functional build-time repository configuration (default upstream attribution retained).
- Go queue root native build, then account package regressions. Full suites/platform/visual/native success/final production delivery remain pending. Shared integration/harness still root-owned uncommitted.
