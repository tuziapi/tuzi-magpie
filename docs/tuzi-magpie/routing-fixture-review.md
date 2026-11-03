# Routing test timing and reader input

Worktree `/Users/syd08/Documents/tuzi-magpie-lines`, branch
`codex/tuzi-routing-fixture-regressions`, base
`b2c35752e82ea44b95beeff325fa4af8fd197219`.

No product source changes. All four original tests and routing's `client.js`
and `routing.css` are byte-identical between `2251ca1` and this batch's base.
The GUI full-suite failures are retained in
`/Users/syd08/Documents/tuzi-magpie-evidence/gui-suite/chromium-failures.txt`.
Targeted evidence and derivative diagnostics live at
`/Users/syd08/Documents/tuzi-magpie-evidence/lines/routing-targeted/`;
`static-source-verified.json` records the hashes. The frozen baseline assets
remain under the sibling `ui-regression-baseline/internal/gui/assets` directory.

## Observed failures and changes

- **Rule drag:** original Chromium English fails the `0,1,0` hover-grip
  assertion. The pointer is at y1128 over a hint; `scrollTop` is 0, while
  the three rules start at y1496, y1533 and y1576 and none is hovered.
  Playwright automatically scrolls to hover, but the original application's
  scroll guard puts that scroll back. Move the test's existing real-wheel
  block before its grip checks. All grip, drag, keyboard, menu, focus,
  scroll-equality and saved-rule assertions stay unchanged. The baseline
  with only this operation ordering corrected passes.
  Evidence: `drag-baseline-diagnostic-2.log`, `drag-baseline-wheel-first.log`.
  The earlier diagnostic log is retained too; its pointer-name collision
  was a diagnostic error, not product evidence.
- **Rule remove:** original Chromium Japanese 1100 fails waiting for the
  condition-required status. Its actual click on the image condition lands
  on `.view`, while the editor's opening animation is only 8.45ms into
  570ms; Save consequently sends `images:true` instead of producing the
  expected validation. Raw coordinates were sampled during the opening
  animation. The local `reach` now uses the existing `reader.settled` before
  scrolling and before returning a fresh bounding box. Save, validation,
  keyboard, focus, overflow and no-save assertions are unchanged. The same
  original diagnostic run's English 390 and Traditional Chinese 1100
  happened to pass; they are not claimed as new reproduced failures.
  Evidence: `remove-baseline-diagnostic.log`, including actual click targets,
  animation times and synthetic POST bodies.
- **Stage routes:** `sync` creates route headings, while `renderAll` schedules
  `drawAll` on an animation frame (`client.js`); `render` lights headings
  from their answering rows. The test checked presence then immediately
  required `.on`. A diagnostic delays that existing draw callback by
  1200ms: all three headings exist but are unlit, giving the original
  `false !== true` failure. Waiting for exactly three lit headings passes
  with the same injected delay. The committed test waits for this semantic
  state then keeps its three original `.on` assertions. Wire counts, route
  grouping, translated titles, pointer target and overflow checks remain.
  Evidence: `stage-baseline-delayed.log`, `stage-baseline-delayed-wait.log`.
- **Steady:** the original 300ms sleep captures the opening spring at
  356.6/570ms, while its height overshoots. The lower group then moves
  1399.64→1383.98px; head/editor differ only 0.08px. This is the editor's
  own opening motion, recorded before requests arrive. Replace only that
  sleep with existing `reader.settled`; retain all incoming requests, the
  live observer, position tolerance (1.5px), scroll tolerance (<2px), focus
  and typed-input assertions.
  Evidence: `steady-baseline-diagnostic.log` records the actual animation
  keyframes and before/after positions with a real assertion failure.

## Verification and recovery

The four-file batch used one worker and one browser at a time, Chromium
then WebKit, with every request intercepted by synthetic fixtures. Chromium
initially passed 26/26; WebKit initially passed 22/26, as detailed below.
After the narrow-keyboard correction, the final remove test passed 10/10 in
Chromium and 10/10 in WebKit (`remove-final-{engine}.log`); the unchanged
drag and stage tests already passed 5/5 and 10/10 in each engine. The steady
test's remaining WebKit product error is documented below, without filtering
or weakening its assertion. `git diff --check` passed. No Go test, full GUI
suite, native app or user config was used by this batch.

### WebKit follow-up

The first four-file run passed Chromium 26/26. WebKit passed 22/26, with
three narrow-screen keyboard-menu failures and a real ResizeObserver
error in steady. `fixed-webkit.log` is retained as that initial red result.

The keyboard fixture focused a rule while the editor was still clipped by
its opening animation. A diagnostic two-frame gap after opening its menu
makes the original failure deterministic: `Enter` opens the menu at
10731ms, a native `.rt-gedit` scroll arrives at 10732ms and closes it, then
`ArrowUp` reaches the body at 10751ms. Bring the rule into sight with the
existing real-wheel `reach` before keyboard focus; the same two-frame gap
then passes. No key is replaced by a programmatic menu action. Evidence:
`remove-keyboard-frame-baseline.log`, `remove-keyboard-frame-reach.log`.
The final remove test passed all ten cases in each engine.

### Approved product repair and neighboring checks

After the steady fixture's spring wait is corrected, WebKit exposes an
original product ResizeObserver error. The `steps` observer in
`client.js:2952` calls `holdStory` synchronously. That clears and restores
minimum heights and lays out the observed element within its own callback.
Runtime traces show two callbacks in one notification round with the steps
height changing from 200 to 126px, or from 200 to 64px, followed by
`ResizeObserver loop completed with undelivered notifications.`

At the main agent's request, the candidate was first isolated in the evidence
folder, in `story-candidate-assets/plugins/routing/client.js`, with its
reviewable diff in `story-resize-candidate.patch`. After the explicit approval
recorded below, that exact patch was applied to the working tree. It coalesces that callback's
layout writes into one animation frame, as the neighboring stage and column
observers already do. All width, font/height and header recalculation remains;
it does not discard height notifications. Routing creates this observer once
for the long-lived page, as it does the adjacent observers; the candidate
adds no new listener or persistent timer.

- Original WebKit: real page-error assertion failure in
  `story-original-webkit.log`.
- Candidate WebKit and Chromium: all original steady assertions pass,
  including empty `pageerror`, live position observer, 1.5px screen
  tolerance, <2px scroll tolerance, field focus and continued input.
- No recurring animation-frame loop: over a further 1200ms quiet interval,
  WebKit's story observer calls stay 9→9 and queued/completed frames stay
  9/9→9/9; Chromium stays 3→3 and 3/3→3/3.
- WebKit original/candidate 1100×760 final screenshots are pixel-identical
  (`ImageChops.difference(...).getbbox() is None`). Final step/editor/group
  geometry, focus and both scroll samples are identical. Chromium's final
  geometry, focus and scroll samples also match exactly. JSON evidence:
  `story-candidate-geometry.json`; screenshots: `steady-original/` and
  `steady-candidate/`; logs: `story-{original,candidate}-{engine}.log`.

This candidate changes when the existing page writes layout. The main agent
presented that precise change and the alternative of retaining the original
behavior with the failing acceptance check. The user explicitly approved
“采用下一帧合并修复” on 2026-11-03. The approval covers this frozen minimal
candidate; it does not authorize unrelated old-page changes. The tests commit
contains no product code. Application and neighboring regression checks are
recorded in a subsequent separate product-fix commit.


After application, `story-final-chromium.log` reports 15/15 Node tests
(including two parent tests) across `routing-ctx-still`, `routing-steady`,
`routing-steps-cap` and `routing-story-shrinks`. WebKit passes all seven
context scenarios, steady, and steps-cap; its four story-shrinks scenarios
fail the held-height assertions (`story-final-webkit.log`, 10 pass, 5 fail
including the failed parent). The same four cases fail against original
`2251ca1` assets (`story-shrinks-original-webkit.log`). These failures are
retained and assigned for investigation; they are not waived as pre-existing.
The approved observer-timing repair is committed independently of this
remaining height defect: its causal error is reproduced on the original and
removed by the patch, with unchanged final geometry. At that stage the outstanding
story-shrinks failure still blocked full-goal acceptance. No page error or
geometry assertion has been filtered. The following diagnostic recorded the story width key, client/outer width
and retained history before a second product change was proposed.


### Approved scrollbar height-history repair

The user explicitly approved “修复滚动条导致的高度跳动” on 2026-11-03,
after review of `story-width-candidate.patch` and the shared effect on
`holdMode`. The exact frozen patch is applied in this worktree. It changes
only the observer's cached width from `clientWidth` to `offsetWidth`, with
an explanatory comment. Both `holdStory` and `holdMode` use this value only
as a history key and zero/hidden check, never as an absolute content width
or a rendered size; including the border cannot enlarge a rendered element.

`story-width-current.log` proves the cause: English content width changes
822→812→822 and Chinese 354→344→354 as the steps box's internal vertical
scrollbar appears and disappears. Outside widths remain 822 and 354. Each
content-width change wrongly discards retained heights, so the 200px long
story collapses to 64px (English) or 82px (Chinese, while answering) on the
next short request. Using the outside-width key retains the intended
three-story window and also stops that scrollbar from clearing the mode
paragraph's height history. Real width, font and height changes still
remeasure the current story.

The isolated candidate passes all four original WebKit story-shrinks
scenarios, 5/5 Node tests including the parent (`story-width-candidate.log`).
A separate real-resize check changes the viewport 1100→1180: outside
width/key 822→902, old measurements 3→1, in both completed-request and
always-under-way scenarios (3/3 including the parent,
`story-width-real-resize.log`). Assertions were not removed or relaxed.
The final applied product passes the full neighboring four-file batch in
Chromium **15/15** (67.18s) and WebKit **15/15** (66.77s), including two parent
tests per engine and 13 actual scenarios, with no skips or filtered errors.
The files are `routing-story-shrinks.test.cjs`, `routing-ctx-still.test.cjs`,
`routing-steps-cap.test.cjs`, and `routing-steady.test.cjs`. Final logs are
`width-final-chromium.log` and `width-final-webkit.log`. This closes the
previously recorded WebKit story-shrinks failure; its original and interim
red logs remain intact. `git diff --check` and `node --check` also pass.

The main agent's full Go run is frozen at `fdfea5c`; this change is confined
to the independent worktree/branch above and will only be integrated after
that run ends. Only the assigned single-browser targeted batch ran here, sequentially per
engine, alongside the main agent's queued Go run. It is now stopped. No Go
or native process was started by this worktree. The browser slot is handed
to the account agent for its separately assigned Tencent/tray tests.
