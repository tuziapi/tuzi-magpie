# Tencent region-scroll fixture review

Owner: account subagent. Worktree: `/Users/syd08/Documents/tuzi-magpie-account`.
Branch: `codex/tuzi-magpie-tencent-fixture`, based on `979033f`.
Original reference: `2251ca1`. Only the Tencent GUI test and this record change.

## Finding and correction

The original test, `app.css`, and relevant region rendering are unchanged
between the original reference and integration base. The editor's existing
`.editor .segs { flex-wrap: wrap; }` makes its choices wrap instead of overflow.
The original scrollbar scenario therefore fails its `most > 40` precondition
before any of its 50 clicks. Original and current assets reproduce this in
Chromium and WebKit, in English and Chinese: every measured overflow is zero.
Option rectangles show three rows in English and two in Chinese.

The test now first checks the actual default: computed `flex-wrap` is `wrap`
and there is no horizontal overflow. It then sets `flex-wrap: nowrap` only on
that test's region strip, explicitly constructing the historical scrollbar
scenario. The existing in-window check, overflow greater than 40px, 50 real
mouse clicks immediately after scrolling, exact selected labels, empty missed
list and no page errors remain. This synthetic overflow scenario is not the
default product layout; no product CSS, markup, or behavior changes.

## Verification

Runs used one browser and one worker, serial engines, in the parent-managed
lightweight browser slot. All API and asset requests were served by local
synthetic routes. No Go build, external service, account, credential, or model
call was used.

| Run | Chromium | WebKit |
| --- | --- | --- |
| Original fixture, original assets, en/zh | 0/2 | 0/2 |
| Original fixture, current assets, en/zh | 0/2 | 0/2 |
| Corrected actual repository, full file | 6/6, 9.468s | 6/6, 9.122s |
| Corrected fixture, original assets, scrollbar cases | 2/2, 5.361s | 2/2, 5.568s |
| Real CSS negative control, scrollbar cases | 2/2, 5.348s | 0/2 |

The negative control removes only the region selector from the two existing
Mac scrollbar-hiding rules in an isolated asset copy. WebKit then really
misses clicks in both languages and fails the original `missed == []`
assertion. Chromium does not reproduce that overlay behavior in this
environment; its passing negative run is recorded rather than claimed red.
No artificial missed-click handler or weakened expected result was used.

Evidence: `/Users/syd08/Documents/tuzi-magpie-evidence/tencent-tray-01/`.
`*-tencent-original.log` contains original-fixture geometry and failures;
`fixed-repository-*-tencent.log` is the complete corrected file;
`fixed-baseline-*-tencent.log` is the original-assets comparison;
`negative-overlay-*-tencent.log` is the real CSS negative control.
The diagnostic and corrected copies, source manifest and isolated negative
assets are retained beside the logs. Tray diagnostics in the same directory
are a separate investigation and are not Tencent verification.

Commands use `NODE_PATH=/Users/syd08/Documents/tuzi-magpie-tools/node_modules`,
`PLAYWRIGHT_BROWSERS_PATH=/Users/syd08/Documents/tuzi-magpie-tools/browsers`,
`BROWSER=chromium` or `webkit`, and `node --test --test-concurrency=1`.
Focused runs use `--test-name-pattern='right after the strip'`.
`node --check` and `git diff --check` pass. Tencent-owned browsers closed;
no listener or port was started. The same slot continues with the separately
assigned tray investigation. Parent integration and full-suite gates remain.
