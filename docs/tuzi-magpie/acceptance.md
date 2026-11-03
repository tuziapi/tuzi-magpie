# Acceptance evidence

Status values: 未开始 / 进行中 / 待验证 / 通过 / 阻塞. A passed build or browser mock is not native E2E or live service validation.

| AC | Requirement | Status | Implementation / evidence / commit |
|---|---|---|---|
| 01 | Independent identity, data, process, ports, original icon | 待验证 | dd2ca47 identity; d354eae Agent ownership isolation + independent review; actual parallel original app preserved; production-start-02 validates independent LaunchServices/gateway identity; complete GUI gate open |
| 02 | Desktop navigation, four tabs, summaries, lifecycle | 待验证 | ee15ceb/1580eeb/9c23725; real Wails native-visibility-fixed-01 four tabs/four summaries, authored five-language dual-engine tests; final full GUI suite pending |
| 03 | Connect/check/restore/disconnect/switch/failures | 待验证 | 8471bba/e7e05cd + native-visibility-fixed-01 connect/native-final-lifecycle-02 actual restart+disconnect; deterministic old-code visibility failure repaired in0963a8b; synthetic invalid/offline/switch/save-failure tests, final suite pending |
| 04 | Credential separation, atomic storage, access boundaries | 待验证 | native-only ownWindow context + origin/frame guards; private atomic store and backup/sync exclusions tested; production-start-02 HTTP404/no account file; native sandbox denies real HOME/keychain/off-loopback |
| 05 | Complete key CRUD/limits/unknown-write recovery | 待验证 | native-visibility-fixed-01 create/reveal/close; backend projection/mutation/uncertain-write tests and dual-engine full CRUD scenarios pass; integrated regression pending |
| 06 | Server summaries/currency/timezone/logs/refunds | 待验证 | native-visibility-fixed-01 verifies four populated summaries and actual logs/statistics; decimal money/timezone/refunds/missing-source tests pass |
| 07 | Model catalog/filter/detail/group prices/configure | 待验证 | native-visibility-fixed-01 marketplace; 979033f complex-price website fallback; directory/group pricing/filter/configure browser scenarios pass; final GUI suite pending |
| 08 | Service status windows/page/batch/unknown samples | 待验证 | native-visibility-fixed-01 status; 1/6/24h/six-model batch/unknown samples browser and backend tests; no active inference probes |
| 09 | Account key to Provider to actual isolated Agent | 待验证 | native-visibility-fixed-01 saves actual Provider and reaches synthetic model through its exact gateway PID; native-final-lifecycle-02 restart/disconnect preserves Provider use; installed-cli-ownership-02 actual Codex/Claude pass with public Apply and race |
| 10 | Three independent presets and fixed web links | 待验证 | ed1c16a +445b718; independent main/Coding/GAC presets, fixed links and native save endpoint tests pass |
| 11 | Gateway protocols/streams/tools/cancel/images | 待验证 | ed1c16a: seven protocol paths + existing image generate/edit HTTP/stdio MCP synthetic/race pass; complete nogui and integrated race pass in full-go-02 at fdfea5c plus recorded GUI test edits |
| 12 | Website source/return/login/copy/fallback | 待验证 | website e2ba322; 142 tests+8 browser flows; native12 actual fixed URL argument reaches mounted account page, actual LaunchServices cold/warm navigation passes (90adcd9) |
| 13 | Formatting/vet/build/Go/GUI/languages/regressions | 进行中 | full-go-02 all platform vet/build, complete nogui suite745.82s and eight-package targeted race77.84s pass; full source is fdfea5c plus recorded GUI test edits; c7238e1 supplemental GUI Go/fixture vet/platform build pass; complete Chromium/WebKit running, account-eye failure unresolved |
| 14 | Native macOS bundle and synthetic desktop E2E | 进行中 | native-visibility-fixed-01 and native-final-lifecycle-02 pass actual desktop/gateway flow on c7238e1; final-source-checks-03 and production-start-02 pass production build/LaunchServices; production visual inspection unclaimed while Mac locked; complete GUI gate open |
| 15 | License/history/update/release/migration preparation | 待验证 | caa1096 repository/feed controls; 5cc8655 redacted source/reachable-history audit; original license/history preserved; final-main-c7238e1 scans current source and locally available142reachable commits (shallow history), no new fingerprint; not a scan of unavailable upstream history |
| 16 | Same-condition original UI/behavior comparison | 待验证 | 521eec4/b85d770 independent same-engine 64 page+8 provider editor+16 Settings comparisons pass; original content/layout/API calls preserved; approved source wording, NO_PROXY,32px header, routing timing/width and tray focus exceptions recorded; complete broad GUI tests running |

External gates (not this local goal): real-service testing, Windows/Linux installation, user acceptance, signing/release/deployment. All pending and unauthorized here.

Closing freeze: no feature/optimization expansion. Finish the active complete dual-engine run, then enumerate a finite blocker list with cause, introduction status, AC and minimum repair scope. Further verification follows actual change impact; acceptance requirements are unchanged.
