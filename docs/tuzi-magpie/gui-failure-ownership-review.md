# First-suite failure ownership and independent root-test review

Read-only review on 2026-11-03. Integration worktree:
`/Users/syd08/Documents/tuzi-magpie-local`, frozen HEAD
`fdfea5c22f0c467f7953676a9d6754f60bb9ea8b` during Go02. No file in that
worktree was edited and no browser, Go command or build was run for this
review. This record belongs to `/Users/syd08/Documents/tuzi-magpie-lines`.

## Coverage conclusion

All **46 files / 172 failed TAP results** in
`gui-full-suite-first-pass.md` are mapped below. No failed file lacks an
owner. At this snapshot, 35 files have integrated repairs; one has integrated
repairs plus a tested pending follow-up; four root-owned test repairs are
verified but uncommitted; two account and four UI files are still in progress.
This is an ownership and targeted-evidence audit, not a claim that the final
full GUI suites have passed. The original failed complete run remains intact.

The mapping was checked against actual `git log 2a4eb24..fdfea5c -- <file>`,
the product changes used by unchanged guard tests, current worktree status,
repair records, and the named logs. My own earlier repairs are an authorship
status audit here, not an independent review. The four root-owned pending
tests below were reviewed as a non-author.

## Per-file mapping

| Original failed file | TAP failures | Owner | Integration status | Repair | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `agent-disconnect-preview.test.cjs` | 2 | root | Integrated | 20d8c28: approved title/native entry expectations | R |
| `balance-fix.test.cjs` | 17 | website | Integrated | 6f3727d: balance-token locator / post-resize frames | B |
| `brand.test.cjs` | 1 | website | Integrated | d66eb73: approved 32px Tuzi entry + precise header expectations | B |
| `builtins.test.cjs` | 1 | root | Integrated | 20d8c28: approved title/native entry expectations | R |
| `gateway-caller-keys.test.cjs` | 1 | website | Integrated | 6f3727d: balance-token locator / post-resize frames | B |
| `gateway-key-models.test.cjs` | 1 | website | Integrated | 6f3727d: balance-token locator / post-resize frames | B |
| `gateway-mode.test.cjs` | 1 | root | Integrated | 20d8c28: approved title/native entry expectations | R |
| `header-zoom-fit.test.cjs` | 2 | website | Integrated | d66eb73: approved 32px Tuzi entry + precise header expectations | B |
| `i18n-keys.test.cjs` | 1 | root | Integrated | 1cbe810: move synthetic native drivers under tests; guard unchanged | S |
| `menu-input-scroll.test.cjs` | 2 | account | Integrated | dfe25d8: settle opening editor before focus | M |
| `menu-scroll.test.cjs` | 12 | root | Integrated | 20d8c28: approved title/native entry expectations | R |
| `mobile-web.test.cjs` | 4 | root | Integrated | 9b9f56e: normalize approved brand text only | R |
| `model-chip-steady.test.cjs` | 20 | website | Integrated | b2c3575: actual picker/draft-key workflow; preserve assertions | P |
| `model-copy-id.test.cjs` | 2 | website | Integrated | b2c3575: actual picker/draft-key workflow; preserve assertions | P |
| `models-select-all-api.test.cjs` | 5 | website | Integrated | b2c3575: actual picker/draft-key workflow; preserve assertions | P |
| `models-works-only.test.cjs` | 4 | website | Integrated | b2c3575: actual picker/draft-key workflow; preserve assertions | P |
| `nav-timeout.test.cjs` | 1 | root | Integrated | 9b9f56e: three fixture navigation timeouts; guard unchanged | S |
| `old-webkit.test.cjs` | 1 | root | Integrated | 9b9f56e: include existing profilerename dynamic module | S + R |
| `omarchy.test.cjs` | 3 | account | Integrated | c6bc45d: real-wheel reach of complete bar row | L |
| `page-width-steady.test.cjs` | 5 | account | Integrated | 52321e5: derive viewport from folded content | L |
| `page-width.test.cjs` | 6 | root | Integrated | 9b9f56e: Tuzi-only original centered-width formula; test unchanged | R |
| `phone-connect-menu.test.cjs` | 2 | account | Integrated | 2304847: synthetic anchor 1px bottom margin; strict assertion retained | L |
| `plugin-move-unserved.test.cjs` | 2 | website | Integrated | b2c3575: actual picker/draft-key workflow; preserve assertions | P |
| `provider-fetch-again.test.cjs` | 7 | website | Integrated | b2c3575: actual picker/draft-key workflow; preserve assertions | P |
| `provider-models-rest.test.cjs` | 2 | website | Integrated | b2c3575: actual picker/draft-key workflow; preserve assertions | P |
| `provider-picks-stay.test.cjs` | 2 | website | Integrated | b2c3575: actual picker/draft-key workflow; preserve assertions | P |
| `provider-typed.test.cjs` | 2 | website | Integrated | b2c3575: actual picker/draft-key workflow; preserve assertions | P |
| `recovered-file.test.cjs` | 5 | account | Integrated | e2120a8: distinguish lifted placement from warning severity | L |
| `remote-magpie.test.cjs` | 3 | website | Integrated | b2c3575: actual picker/draft-key workflow; preserve assertions | P |
| `rest-try-now.test.cjs` | 1 | account | Integrated | 0db1990: stable logical scroll-container identity | L |
| `routing-row-swap.test.cjs` | 1 | root | Integrated | 15ff5d9: require in-place completion and no row replacement | RR |
| `routing-rule-drag.test.cjs` | 5 | website | Integrated | 2203953: reader navigation and actual animation/frame state | RT |
| `routing-rule-remove.test.cjs` | 3 | website | Integrated | 2203953: reader navigation and actual animation/frame state | RT |
| `routing-stage-routes.test.cjs` | 1 | website | Integrated | 2203953: reader navigation and actual animation/frame state | RT |
| `routing-steady.test.cjs` | 1 | website | Partial; ready to integrate | 2203953 + 43c82d7 integrated; approved 8ccf4fa pending Go02 completion | RT |
| `segs-press-redraw.test.cjs` | 8 | root | Integrated | fdfea5c: usable synthetic search source and enabled precondition | SG |
| `sidebar.test.cjs` | 6 | root | Ready; uncommitted | Current reviewed four-file diff at frozen fdfea5c | NV |
| `tencent-cloud.test.cjs` | 2 | account | In progress | codex/tuzi-magpie-tencent-fixture; Tencent test changed, tray diagnosis assigned | Account active queue |
| `tray-cell-click.test.cjs` | 2 | account | In progress | codex/tuzi-magpie-tencent-fixture; Tencent test changed, tray diagnosis assigned | Account active queue |
| `usage-agents-hide.test.cjs` | 11 | UI | In progress | codex/tuzi-magpie-usage-regressions; all four tests modified, validation queued | UI active queue |
| `usage-fold.test.cjs` | 1 | UI | In progress | codex/tuzi-magpie-usage-regressions; all four tests modified, validation queued | UI active queue |
| `usage-ledger.test.cjs` | 3 | UI | In progress | codex/tuzi-magpie-usage-regressions; all four tests modified, validation queued | UI active queue |
| `usage-overview-fold.test.cjs` | 3 | UI | In progress | codex/tuzi-magpie-usage-regressions; all four tests modified, validation queued | UI active queue |
| `vertex-editor.test.cjs` | 4 | root | Ready; uncommitted | Current reviewed four-file diff at frozen fdfea5c | NV |
| `web-app-standalone.test.cjs` | 1 | root | Ready; uncommitted | Current reviewed four-file diff at frozen fdfea5c | NV |
| `zhipu-team.test.cjs` | 2 | root | Ready; uncommitted | Current reviewed four-file diff at frozen fdfea5c | NV |

## Evidence keys and limits

All short evidence paths below are relative to
`/Users/syd08/Documents/tuzi-magpie-evidence/`.

- **R** — `root-gui-targets-01/{chromium,webkit}.log` and `results.json`:
  46/46 and 52/52. The actual logs include title/native-navigation cases,
  mobile/width cases and WebKit rendering. The manifest records all sources;
  inclusion in the manifest alone is not treated as proof that a test ran.
- **B** — `lines/ui-targeted/`: balance full files 50/50 each engine;
  gateway original/fixed resize logs; `approved32-targeted-chromium.log`,
  `approved32-header-webkit.log` and `final32-targeted-webkit.log`. Approved
  header size and original-navigation control are recorded in
  `navigation-layout-evidence.md`.
- **S** — `legacy-static-guards-{red,green}.log`,
  `old-webkit-static-{baseline-red,green}.log`, and
  `lines/repository-i18n.log`; source moves in `1cbe810` and the three
  fixture timeout additions in `9b9f56e` explain unchanged guard tests.
  Despite its filename, `legacy-static-guards-green.log` is a 6/7 run:
  nav-timeout and five static compatibility checks pass, while actual WebKit
  launch fails because that invocation lacked the pinned browser path. This
  is not counted as a passing runtime case; the later **R** WebKit log is
  the successful real rendering evidence.
- **M** — `menu-scroll-01/fixed-repository-{chromium,webkit}.log`: 2/2 each;
  baseline and exemption-removal negative controls preserved there.
- **P** — `lines/model-targeted/`: ten-file Chromium 73/73; original WebKit
  72/73, followed by the final changed Working-only file 4/4 each engine in
  `works-only-settled-*`. The other nine files are byte-identical to the
  passed run; initial red is not recounted as green.
- **L** — `layout-fixtures-01/`: Omarchy 7/7, page-width-steady 10/10,
  recovered-file 5/5, Try-now 20/20 in each engine. Phone verification
  covers the two changed scenarios, not a claimed full-file rerun. Original,
  corrected-original and negative-control evidence is retained.
- **RR** — `routing-row-01/`: original replacement wait fails both engines;
  corrected in-place completion passes; replaced-row and ignored-update
  mutations each fail both engines.
- **RT** — `lines/routing-targeted/`: drag 5/5 and stage routes 10/10 each
  engine; final remove 10/10 each; `width-final-{chromium,webkit}.log` each
  15/15 Node tests across four files (13 scenarios plus two parents),
  including steady and the additional original WebKit story-shrinks defect.
  `8ccf4fa` closes that follow-up but is not yet in frozen root HEAD.
- **SG** — `settings-segs-01/`: eight sweeps per engine pass; original
  missing-provider fixture and disabled-fallback negative control fail.
- **NV** — `nav-vertex-01/`: the exact pending diff is saved in `source.json`
  at `fdfea5c`, and matches the current four-file diff byte for byte.
  Fixed Chromium 33/33 and WebKit 31/31, zero skips; Vertex baseline fails
  `1 != 0` in both engines; Zhipu baseline fails strict locator matching of
  two password inputs in both engines. Both baseline copies differ from
  `2251ca1` only in their absolute assets path.

The account worktree is `/Users/syd08/Documents/tuzi-magpie-account`, branch
`codex/tuzi-magpie-tencent-fixture`, based on `979033f`. It owns both Tencent
and tray even though only Tencent has a tracked edit at this review's
snapshot. Its assigned targeted browser slot is active; no pass is inferred.
The UI worktree is
`/Users/syd08/.codex/worktrees/tuzi-usage-regressions/tuzi-mapie`, branch
`codex/tuzi-magpie-usage-regressions`; all four assigned Usage test files are
modified and await their assigned browser slot. No pass is inferred there.

## Independent review of the four root-owned test changes

No blocking finding or weakened original guarantee was found.

- **sidebar:** only the exact native navigation array gains the explicitly
  authorized trailing `tuzi` entry. The fixture is `web:false`. Original
  groups, sidebar/header placement, overflow, label clipping, selection,
  color, pressed size, gateway reads and responsive behavior assertions are
  untouched. This does not authorize or test a Tuzi account entry on Web.
- **vertex-editor:** three password-count checks exclude only
  `.proxy-credential`. `proxyLoginRow` and Settings' proxy login renderer are
  the only production assignments of this class; the optional proxy password
  already exists in original source. Vertex still requires zero API-key
  fields and no API-key label, exact four labeled Vertex fields, empty
  submitted key, validation/focus/scroll behavior and exact saved settings.
  The Gemini control still requires one API-key field and zero Vertex fields.
- **web-app-standalone:** only the manifest name expectation changes to the
  approved `tuzi-magpie` product name, matching actual `manifest.json`.
  Standalone display, status-bar behavior, icon existence, scope and all
  surrounding PWA assertions remain unchanged.
- **zhipu-team:** the fill locator excludes the same proxy password and
  remains strict for the unique provider API-key input. It does not use
  `first()` or bypass ambiguity. DeepSeek's absence of team fields, Z.ai's
  new-provider/preset check, exact trimmed team payload and absence of page
  errors remain unchanged.

The full pending diff contains no production file, threshold increase,
assertion deletion, skipped test or error suppression. Its exact runtime
snapshot and baseline copies were inspected, rather than relying only on the
main agent's completion report. New full browser runs were prohibited for
this read-only assignment and were not performed.

## Follow-through

After Go02, root still needs to integrate `8ccf4fa` and commit the reviewed
four-test diff, then integrate and review account/UI results. Any remaining
failures retain their owners above. The final complete suites, final build
and actual native acceptance remain independent gates. The introductory
sentence in `gui-regressions-root.md` still says the first suite has not
completed; that historical wording should be brought in line with the
completed failed-run report when root next updates its documentation.
