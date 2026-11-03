# Acceptance evidence

Status values: 未开始 / 进行中 / 待验证 / 通过 / 阻塞. A passed build or browser mock is not native E2E or live service validation.

| AC | Requirement | Status | Implementation / evidence / commit |
|---|---|---|---|
| 01 | Independent identity, data, process, ports, original icon | 进行中 | Original SHA recorded; implementation pending |
| 02 | Desktop navigation, four tabs, summaries, lifecycle | 进行中 | UI implementation under review; native validation pending |
| 03 | Connect/check/restore/disconnect/switch/failures | 待验证 | 8471bba/e7e05cd; synthetic/race tests pass, native pending |
| 04 | Credential separation, atomic storage, access boundaries | 未开始 | |
| 05 | Complete key CRUD/limits/unknown-write recovery | 未开始 | |
| 06 | Server summaries/currency/timezone/logs/refunds | 未开始 | |
| 07 | Model catalog/filter/detail/group prices/configure | 未开始 | |
| 08 | Service status windows/page/batch/unknown samples | 未开始 | |
| 09 | Account key to Provider to actual isolated Agent | 未开始 | |
| 10 | Three independent presets and fixed web links | 待验证 | ed1c16a; GUI link integration awaiting end-to-end check |
| 11 | Gateway protocols/streams/tools/cancel/images | 待验证 | ed1c16a: seven protocol paths + existing image MCP synthetic/race pass; integrated verification pending |
| 12 | Website source/return/login/copy/fallback | 待验证 | e2ba322; 142 tests + 8 browser flows pass; native callback pending |
| 13 | Formatting/vet/build/Go/GUI/languages/regressions | 未开始 | |
| 14 | Native macOS bundle and synthetic desktop E2E | 未开始 | |
| 15 | License/history/update/release/migration preparation | 未开始 | |
| 16 | Same-condition original UI/behavior comparison | 进行中 | Untouched baseline worktree created |

External gates (not this local goal): real-service testing, Windows/Linux installation, user acceptance, signing/release/deployment. All pending and unauthorized here.
