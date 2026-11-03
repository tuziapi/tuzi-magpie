# F02/F06: bounded test candidates

Status: dynamic cause confirmation, negative controls and all three files in
both engines passed their required checks. No product source changed. Nonauthor
diff review and root integration remain separate steps.

## Scope and ownership

- Worktree: `/Users/syd08/.codex/worktrees/tuzi-usage-regressions/tuzi-mapie`
- Branch: `codex/tuzi-f02-f06`
- Base: `c7238e14891f917b67d80209857d3d1db4cb4c42`
- Owner: UI subagent; this branch owns the three scoped test changes.
- Files: `agent-failover.test.cjs`, `key-replace.test.cjs`,
  `models-fold.test.cjs`, and this record only.
- Original full-run logs and frozen GUI worktree are untouched.

## Source and failure facts

All three tests are byte-identical between upstream `2251ca1` and the frozen
`c7238e1`. This does not prove runtime parity or exempt failures.

The same two revisions have identical `openModal`, `frame`, and `holds` source:

| Slice | SHA-256 |
| --- | --- |
| `openModal` through before `edAligned` | `3deaac5e336f5eca4859a91bd4e681d7ea99af2d59b6fdb668492153550baef6` |
| `frame` through before `closeModal` | `dcf3694819fb26b90ce42e45f889554e3c20e5ab14224fd17e9c41cce29ec2cc` |
| `holds` declaration | `7570e47ef65fb7951f8cf3a02c87345fd526734421a5187b739ab43a93c037d0` |

The full WebKit run's ten failover cases all time out on the conjunction
`!modal.hidden && modal.innerText.startsWith("Codex")`, after both URL checks.
Dynamic probes on both original and frozen assets confirm the modal is
unhidden, `display:flex`, `visibility:visible`, 980×640; its heading is visible
and exact `Codex`. Chromium modal text starts with `Codex`; WebKit starts with
a newline before `Codex`. The original assertion fails in WebKit on both
revisions for that text condition, with the same visible title. The candidate waits for a visible modal and visible editor heading,
then checks the heading's exact `textContent` equals `Codex`. It keeps the
5000ms timeout, URL checks, selected provider, dialogs and page errors.

Four narrow key replacement cases report actual `0 ebody:200`, expected
`0 ebody holds:200`. Models-fold English reports actual
`0 ebody holds:293`, expected `0 ebody:293`. These recorded samples have equal
scrollTop values. The old snapshot treats transient class names as identity.
`holds` toggles on pointerover/wheel based on actual overflow, and `openModal`
replaces editor children while restoring the body scrollTop.

The candidate snapshots every nonzero scrollTop at a stable logical document
position: an element's fixed id, else its tag and same-tag sibling position
under the parent's position. This survives a class change or replacement of the
editor body in the same place, but catches an actual offset change, a newly
scrolled element, or a previously scrolled element returning to zero. Models'
existing `mchips` exclusion remains exactly as before. No rounding, tolerance,
threshold, scroll-container restriction or pageerror suppression is introduced.

## Bounded validation performed

1. Run one failover scene against frozen and original assets. Record hidden,
   modal/title rectangles, computed visibility/display and raw modal/title text.
   The old condition must fail for the recorded text cause while visible/title
   checks pass. Wrong-title and hidden-modal negative controls must fail.
2. Run the existing key-replacement and models-fold scenes while recording
   scrollTop, class and body replacement. Induce only a transient `holds` class
   change: old snapshot must fail, candidate must pass. Then induce a real
   one-pixel scroll immediately before measurement: candidate must fail with the
   original no-scroll assertion. Verify the measured pixel movement occurred.
3. Run all existing cases in the three files in Chromium and WebKit, serially
   under private HOME/XDG/TMP with synthetic routes and no inherited credentials.
4. Preserve original, candidate and negative-control logs separately. Seek a
   nonauthor diff review before integration. Do not restart the full GUI suite.

## Checks already run

`node --check` passed for the three candidate files. `git diff --check` passed.
Browsers were launched only after the account agent released the exclusive
queue. No product build, Go suite, native app or external service was used.

## Dynamic evidence

Evidence directory:
`/Users/syd08/Documents/tuzi-magpie-evidence/gui-f02-f06/`.
`run.py` and `verify.py` preserve exact commands, generated diagnostic cases,
private environment policy and log hashes in `diagnostic-results.json` and
`validation-results.json`. Diagnostic copies narrow one existing scene only;
the final candidate checks execute all cases of all three original files.
No original full-suite evidence was overwritten.

- F02: original and frozen assets both pass the old condition in Chromium and
  fail it in WebKit. The raw modal text, heading, geometry and visibility are
  logged with `F02_DIAGNOSTIC`. Candidate hidden-modal controls fail at the
  original 5000ms visible wait in both engines. Wrong-title controls fail with
  expected `Codex`, actual `Wrong provider` in both engines.
- F06: changing only `holds` produces the old no-scroll failure on both original
  and frozen assets in both engines. Replacement keeps actual body offsets
  400→400 in Chromium, 200→200 in WebKit; the body node is replaced. Models-fold
  keeps 295→295 in Chromium, 293→293 in WebKit; the same node remains. Both
  candidates pass those same controlled class changes in both engines.
- F06 negative controls move the live editor body exactly one pixel immediately
  inside the second sample, avoiding a later click-guard restoration. Browser
  measurements confirm 400→399 and 295→294 in Chromium, 200→199 and 293→292 in
  WebKit. All four fail the original named no-scroll assertions. No compilation
  error, timeout or unrelated assertion substitutes for these failures.

Every diagnostic and negative-control process has exited and its private
HOME/XDG/TMP tree was removed. No source-level mutation was used for controls.

## Full scoped results

All original cases in the three files were run without case filtering:

| Engine | Tests | Pass | Fail / cancelled / skipped / todo | Duration | Log SHA-256 |
| --- | --- | --- | --- | --- | --- |
| Chromium | 32 | 32 | 0 / 0 / 0 / 0 | 36.246s | `ec4f67be8c27e23d94a16a30634aeb06a30e59671f67ca34b272b4343e8f5bb9` |
| WebKit | 32 | 32 | 0 / 0 / 0 / 0 | 33.989s | `95173ba949c8192ece7be7ad31365dc671e0aa1a781a631ed57bb7f5576c5a18` |

Both complete scoped runs exited 0 and removed their private environment roots.
The original 1135-file frozen full run remains red and is not represented as a
post-fix full green run. No full-suite rerun was started.
