# Acceptance evidence

Status values: 未开始 / 进行中 / 待验证 / 通过 / 阻塞. A passed build or browser mock is not native E2E or live service validation.

| AC | Requirement | Status | Implementation / evidence / commit |
|---|---|---|---|
| 01 | Independent identity, data, process, ports, original icon | 待验证 | dd2ca47 identity; d354eae Agent ownership isolation + independent review; actual parallel original app preserved, final platform/full-suite gates pending |
| 02 | Desktop navigation, four tabs, summaries, lifecycle | 待验证 | ee15ceb/1580eeb/9c23725; real Wails native10 four tabs, authored five-language dual-engine tests; final full GUI suite pending |
| 03 | Connect/check/restore/disconnect/switch/failures | 待验证 | 8471bba/e7e05cd + native10 connect/native11 actual restart+disconnect; synthetic invalid/offline/switch/save-failure tests, final suite pending |
| 04 | Credential separation, atomic storage, access boundaries | 待验证 | native-only ownWindow context + origin/frame guards; private atomic store and backup/sync exclusions tested; native sandbox denies real HOME/keychain/off-loopback |
| 05 | Complete key CRUD/limits/unknown-write recovery | 待验证 | native10 create/reveal/close; backend projection/mutation/uncertain-write tests and dual-engine full CRUD scenarios pass; integrated regression pending |
| 06 | Server summaries/currency/timezone/logs/refunds | 待验证 | native10 actual logs/statistics; decimal money/timezone/refunds/missing-source tests; native summary assertion added for final rerun |
| 07 | Model catalog/filter/detail/group prices/configure | 待验证 | native10 marketplace; directory/group pricing/filter/configure browser scenarios pass; final GUI suite pending |
| 08 | Service status windows/page/batch/unknown samples | 待验证 | native10 status; 1/6/24h/six-model batch/unknown samples browser and backend tests; no active inference probes |
| 09 | Account key to Provider to actual isolated Agent | 待验证 | native10 saves actual Provider then real gateway synthetic response; native11 disconnect preserves Provider and model use; installed Codex/Claude passed before final ownership change, rerun pending |
| 10 | Three independent presets and fixed web links | 待验证 | ed1c16a +445b718; independent main/Coding/GAC presets, fixed links and native save endpoint tests pass |
| 11 | Gateway protocols/streams/tools/cancel/images | 待验证 | ed1c16a: seven protocol paths + existing image generate/edit HTTP/stdio MCP synthetic/race pass; integrated race passes in full-go-01; complete Go regression repair ongoing |
| 12 | Website source/return/login/copy/fallback | 待验证 | website e2ba322; 142 tests+8 browser flows; native12 actual fixed URL argument reaches mounted account page, actual LaunchServices cold/warm navigation passes (90adcd9) |
| 13 | Formatting/vet/build/Go/GUI/languages/regressions | 进行中 | macOS/Linux/Windows vet/build pass; full-go-01 uncovered regression fixture and isolation failures, repairs in progress; integrated Tuzi race passes; full GUI and complete Go rerun pending |
| 14 | Native macOS bundle and synthetic desktop E2E | 进行中 | fixture native10/11 pass actual window/account/provider/gateway/model and restart/disconnect; final untagged production bundle and startup still pending |
| 15 | License/history/update/release/migration preparation | 待验证 | caa1096 repository/feed controls; 5cc8655 redacted source/reachable-history audit; original license/history preserved; final SHA scan pending |
| 16 | Same-condition original UI/behavior comparison | 待验证 | 521eec4/b85d770 independent same-engine 64 page+8 provider editor+16 Settings comparisons pass; original content/layout/API calls preserved; final broad GUI tests pending |

External gates (not this local goal): real-service testing, Windows/Linux installation, user acceptance, signing/release/deployment. All pending and unauthorized here.
