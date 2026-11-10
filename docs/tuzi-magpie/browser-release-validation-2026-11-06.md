# Desktop prerelease browser regression

The frozen full regression uses source
`2f57bda27fdcf82d9de21711ad155853e5a17a06`, assets tree
`d239a35e0ac65d17925ad9d04ae591150c89a610`, and all 1,135 browser test files.
It runs with an isolated HOME, four concurrent files, and separate sequential
`BROWSER=chromium` and `BROWSER=webkit` batches. Some older files explicitly run
both engines regardless of `BROWSER`; the batch totals include those checks.
This is a failing full regression, not a green result for the later candidate.

| Batch | Tests | Passed | Failed | Duration |
| --- | ---: | ---: | ---: | ---: |
| Chromium | 9,551 | 9,482 | 69 | 6,209.76 s |
| WebKit | 9,536 | 9,463 | 73 | 6,060.72 s |

Each engine has 18 failing files; their union is 21 files. Both batches have
zero cancelled, skipped or todo checks. Node's failure total includes failed
parent tests. Its spec reporter prints failures again in the final summary;
those repeated lines are not additional failures.

## Confirmed corrections

The following changes preserve application navigation behavior and the original
functional/layout assertions:

- Agent-page tests now open `?view=agents` explicitly: `agent-layout`,
  `cli-update`, `import-row`, `plugin-actions`, `plugin-panels`,
  `popover-mac-chrome`, `refresh-page` and `view-no-sideways`. First native
  startup intentionally opens Tuzi. The old tests waited for hidden Agent
  controls. Original cases fail and explicit-page candidates pass.
- `header-zoom-fit` also selects Agents. Its original-navigation control removes
  the Tuzi button from a synthetic document, so it cannot wait for an active
  default Tuzi button. Both navigation variants retain their zoom, width,
  monotonic-collapse and no-overflow assertions.
- `builtins` expects Tuzi before Agents, including when Library returns.
  A disabled feature still falls back to Agents; that assertion is unchanged.
- `phone-web` and `mobile-web` select the visible Agent button when inspecting
  navigation. The first DOM button is now Tuzi and is hidden in a browser.
- `whats-new` compares the URL before and after opening an external release-note
  link. The current native page is `?view=tuzi`, not the root URL. The no-navigation
  requirement, link handling and hostile-note checks remain intact.

Two scoped style corrections address actual layout differences:

- Tuzi's minimum page gutter is 16px, matching the other desktop pages instead
  of moving the content edge by 4px when switching pages. The original
  `page-width` test fails with `20 !== 16`; the candidate passes its original
  centring and width checks.
- A hidden first Tuzi button no longer gives Work the 14px padding intended for
  later sidebar groups. It keeps the first visible group's 2px padding. Before
  this correction, the browser sidebar moved down by 12px. Desktop screenshots
  detect that movement. For comparison with upstream, `mobile-web` normalizes
  the approved distribution brand typography as well as its existing name
  normalization. It retains the actual icon, content and pixel tolerance.
  `brand` separately checks the distribution's intended appearance.

## Header measurement boundary

In the full run, `header-centre` read a 4.78125px gap at English 125%, before
the header had fitted the newly visible Update button. Its two independent
animation frames did not guarantee delivery of the header ResizeObserver and
the application's queued fitting frame.

A controlled diagnostic holds actual header observer deliveries after showing
Update. The old sampling point reads a -23.765625px gap. A test observer remains
pending while those deliveries are held; after their release and the queued
frame, the original assertion reads 14.765625px. Nine observer deliveries were
held. This demonstrates the missing completion boundary, without claiming to
reconstruct the exact unrecorded schedule of the original failure.

The candidate waits for a real resize when dimensions change, then the header
observer and its following frame. The initial same-size measurement also waits
for that observer/frame boundary. It does not poll for a passing gap or alter
the geometry thresholds, and cleans up listeners, observers and frames.
The complete external candidate passed all 14 checks across both engines.
A permanent 80px navigation displacement still fails the original assertions.

## Update-notice measurement correction

`update-stuck` also sampled before the header observer's fitting frame. WebKit
German at 1000px captured the preference button's right edge at 1015.734px;
after actual observer delivery and the queued frame it had zero overflow.
Commit `eb2490a53` adds that completion boundary after fonts are ready, retaining
all zero-overflow, text, download and update assertions. It changes no product
code and adds no retries, skips, threshold relaxation or timeout increases.
The complete file passes 62/62 across Chromium and WebKit. A permanent 2000px
`.actions` displacement fails all 31 WebKit results, including failed parents.

## Classification of all failing files

| Files | Classification and disposition |
| --- | --- |
| agent-layout, cli-update, import-row, plugin-actions, plugin-panels, popover-mac-chrome, refresh-page, view-no-sideways | Tuzi default-page change exposed outdated Agent-page fixtures; explicit target page corrected, complete affected files passed. |
| builtins, header-zoom-fit, phone-web, whats-new | Approved navigation/default-route changes exposed old fixture assumptions; corrected without relaxing behavior checks. |
| mobile-web, page-width | Introduced visible spacing regressions fixed in candidate product CSS; approved brand normalization retained in screenshot control. |
| header-centre, update-stuck | Header render-completion measurement races, not proven persistent product overflow; actual observer/frame completion now measured, original geometry checks and negative controls retained. |
| market-have, plugin-page, routing-rule-columns, nav-sub-unroll, view-open-wheel | Unresolved below. Historical overlap is not a waiver. |

## Unresolved failures and release impact

All five remain open release gates under the current acceptance criteria.
No issue is classified as a harmless environment failure merely because a
standalone run passed. Each needs the stated evidence or a cause-based fix;
this report does not authorize shipping past it.

| Test | Evidence, classification and user impact | Remaining action |
| --- | --- | --- |
| market-have | Post-failure WebKit capture sent `name="fetchuvx mcp-server-fetch"`, empty command and args. The existing new-server rAF autofocus can steal focus after the command field is focused. A controlled queued-microtask release reproduces the same wrong payload in en/zh. Library client is identical to upstream `2251ca1`; upstream [4620](https://github.com/yetone/magpie/issues/4620) records the symptom. This is a historical input race, not evidence of stale market rendering. Real `SaveServer` calls `s.check()` before mutation and rejects an empty stdio command: rapid entry can fail and require re-entry, rather than demonstrating persisted corrupt data. | Separate scoped focus fix and red/green coverage; no speculative market rendering or test-delay change applied. |
| plugin-page | Chromium zh-TW at 420px retained `$0.50` after Hide. Post-failure trace has no options-save request, while the iframe is visible and active. This does not prove a slow response. Relevant plugin page/client source matches upstream; [3220](https://github.com/yetone/magpie/issues/3220) records the same timeout. Historical symptom overlap; exact event-loss cause and relation to this PR remain unconfirmed. Potential user impact: setting click not applied. | Capture click hit target and iframe event/bridge delivery at failure; fix demonstrated cause. |
| routing-rule-columns | Chromium en at 390px found an `rt-cond` outside its editor. [4461](https://github.com/yetone/magpie/issues/4461) records similar layout failure. Later post-failure instrumentation passed 6/6 and captured no failing geometry. This does not establish environment-only failure or exclude the candidate's other layout changes. Potential user impact: narrow editor clipping/overflow. | Capture failing editor, animation and child geometry; compare the exact state to upstream. |
| nav-sub-unroll | Full WebKit ja at 1024px timed out observing a running `.nav-sub` animation. Complete focused file passes both engines. A transient animation-observation boundary is plausible but unproven; no wrong final highlight was captured. User impact remains unconfirmed. | Record animation start/end and highlight geometry in the failing sequence; retain final highlight checks. |
| view-open-wheel | Full WebKit ja at 420px, routing view, recorded backwards scroll 270→240 at frame 34 while wheeling down. Exact-case diagnostics passed 4/4 on both candidate and upstream assets; these are bounded diagnostics, not a full-file pass or a fix. Possible user impact: visible scroll jank. Cause and introduction remain unknown. | Capture wheel delta, scroll-protection state and animation timeline during the backwards movement. |

Upstream issues were read including comments; no proposed patches were available.
The earlier `side-effort` and `click-scroll` anomalies did not fail the new full
runs, but their original causes remain unproven. This does not close F01/F11 in
[closing-blockers.md](closing-blockers.md).

## Evidence and candidate validation

Evidence root:
`/Users/syd08/Documents/tuzi-magpie-tools/release-20261106/`.
`gui-full-results.json`, both full logs and both extracted failure inventories
preserve the completed failing frozen runs. The earlier interrupted diagnostic
is retained separately and is not a completed regression.

`candidate-validation/results.json` records the base, patch, file hashes and
22 complete changed/affected files. Chromium passes 159/159 (849.50s); WebKit
passes 159/159 (951.63s), 318 total. These contents were committed through
`c0dc27135`. `acceptance-followup/update-stuck-fixed.tap` adds 62 passing checks
for `eb2490a53`, with the failing negative control in `update-stuck-negative.tap`.
Neither result constitutes a final full-suite green run.

The five-file diagnostic batch in `acceptance-followup` failed: WebKit 55/59
(market and pre-fix update-stuck, including parents), Chromium 57/59 (plugin and
routing). `postmortem.tap`, `market-focus-evidence.json`, `market-focus-control.tap`,
`routing-postmortem.tap`, `wheel-diagnostic-results.json`, `diagnostic.tap` and
`boundary.tap` support the classifications above. Earlier passing traced market
runs did not reproduce the issue; the later post-failure/control evidence does.
No production fix was inferred from a diagnostic passing by itself.

See [final acceptance and manual checks](prerelease-acceptance-2026-11-06.md)
for package/native validation, missing platforms and the decision to keep PR #1
a draft. GitHub Actions billing is a confirmed environment blocker; API-site
and real-account integration remain outside this execution scope.
