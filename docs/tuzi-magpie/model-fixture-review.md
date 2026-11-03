# Model picker fixture review

Worktree: `/Users/syd08/Documents/tuzi-magpie-lines`.
Branch: `codex/tuzi-model-fixture-regressions`.
Base: `d66eb7326bccdb799fcb745d86abf81510ae7dd4`.
Original comparison: `2251ca1`.

## Static findings

The model renderer and following helpers (68,794 bytes beginning at the
`modelsOpen` comment) are byte-identical in the original and current tree.
Evidence is `static-model-section.json` in
`/Users/syd08/Documents/tuzi-magpie-evidence/lines/model-targeted/`.
The reported tests are unchanged from the original commit.

`renderModels` deliberately starts Picked only with the selected models.
`picksOnly` excludes unselected chips until the existing `.mchips-rest`
control is clicked; that control sets `unpickedShown` and redraws. Thus:

- `model-chip-steady`: its initial selected half contains 15 chips, not 30.
- `model-copy-id`: the unselected `gpt-5.1` chip is initially absent.
- `models-works-only`: unselected `minimax-m3` is initially absent.
- `plugin-move-unserved`: the subscription's served Model 0 initializes its
  picks, leaving Model 1 behind the same control after the failed move.
- `provider-fetch-again`: the fetched unselected models are still hidden in
  Picked only; open the full list before fetching to inspect the new list.
- `provider-picks-stay`: open each provider's unselected models before
  changing its picks; original cross-provider leak assertions remain.
- `provider-models-rest`: first reveal the unselected models from Picked only,
  then retain the original 83-to-84 long-list expansion assertions.
- `remote-magpie`: Chat is the initial pick; reveal the two unpicked decision
  models before the original three-model/one-address assertions.

The tests now open the existing control before their original full-list
geometry, copy and Working only assertions. Production model behavior is
unchanged. The main agent assigned both additional provider fixtures after
the same failures appeared in the full suite.

## Draft key versus saved Accounts

The original source also deliberately omits the top-level API key field when
`keyList` is nonempty (`drawEditor`, Accounts branch). `provider-typed` supplied
an existing account but filled the first password input, which is the proxy
password in that layout. Its request consequently sent an empty `draft.key`.

The test now covers two actual paths separately. A saved provider with no key
yet has a semantic `paste an API key` field; its draft is asserted on all four
original calls: fetch models, test models, test one model, and test endpoints.
The exact key, headers, chat address, `typed` flag, retained input and absence
of saves are still checked. The original existing-account fixture is used in
a separate test of Add another key, keeping the key focus and optional-name
assertions. No API-key controls or application behavior were changed.

## Resize timing of the previous action

`models-select-all-api` measured the next click before the preceding Free only
redraw had hidden the now-unneeded Expand list control. `drawFold` schedules
that visibility change in an animation frame. The control is 24px tall with
6px gap. At 420px Chinese, retaining the old control leaves scrollHeight 972
and maximum scrollTop 324; hiding it gives 942 and 294. Select all itself
keeps 294. The test now waits two animation frames after Free only, before
positioning the button and recording scroll. Its exact no-scroll assertion
and model sets are unchanged.

## Runtime evidence

All logs are under
`/Users/syd08/Documents/tuzi-magpie-evidence/lines/model-targeted/`.

- `baseline-source-verified.json` checks the original fixture sources against
  git `2251ca1`. Frozen assets and tests live in the adjacent
  `ui-regression-baseline` directory.
- `baseline-representatives-chromium.log`: original representative cases
  reproduce 15/30 chips, missing unpicked model targets, incomplete refreshed
  lists, 10/83 chips, and the empty typed key. The model-copy, works-only,
  plugin move and picks-stay timeouts name absent DOM targets; they are
  deterministic fixture omissions, not resource timeouts.
- `baseline-remote-chromium.log`: original remote's two decision models are
  absent from the initially selected-only list.
- `baseline-select-all-immediate.log`: diagnostic observations on the original
  can pass when the frame finishes first; this alone is not proof of a fix.
- `baseline-select-all-delayed-fold.log`: a fixture-only gate postpones the
  original fold callback until after the test's old measurement. It fails the
  unchanged assertion with 324 versus 294, already changed before Select all.
- `baseline-select-all-settled.log`: the same gated callback is released and
  awaited before measurement; the original assets pass. The diagnostic
  `select-all-diagnostic.test.cjs` is saved beside these logs. It changes only
  browser-fixture callback scheduling, with production source untouched.
- `fixed-chromium.log`: all ten assigned files, 73/73 pass (87.3s).
- `fixed-webkit.log`: initial ten-file run, 72/73; the one remaining failure
  was Working only's exact rounded-button position, 345 versus 344. Both
  instrumented follow-ups can pass; they record finite dialog/button
  animations still running at the original sampling points, including
  0.01ms reduced-motion transitions. The failure is retained, not labelled
  a pass or explained as a proven specific animation.
- `works-only-settled-{chromium,webkit}.log`: the final Working only file,
  all four English/Chinese wide/narrow cases in each engine. The existing
  `reader.settled` runs after positioning the editor scroll and after the
  action, before exact stable geometry assertions. It waits actual frames
  and finite animations, rather than adding a fixed timeout or tolerance.
  Only this file changed after the complete runs; the other nine files are
  byte-identical to those already validated.

Only the assigned targeted browser files run, one worker and one browser at a
time, all API traffic intercepted by synthetic fixtures. No Go/full UI suite,
native app or external service runs belong to this task. The main agent owns
integration and whole-suite validation.

Target command (once per engine, serial):

```sh
NODE_PATH=/Users/syd08/Documents/tuzi-magpie-tools/node_modules \
PLAYWRIGHT_BROWSERS_PATH=/Users/syd08/Documents/tuzi-magpie-tools/browsers \
BROWSER=chromium node --test --test-concurrency=1 \
  internal/gui/tests/{model-chip-steady,model-copy-id,models-works-only,models-select-all-api,plugin-move-unserved,provider-fetch-again,provider-picks-stay,provider-models-rest,provider-typed,remote-magpie}.test.cjs
```

Repeat with `BROWSER=webkit`. The final focused follow-up uses the same
command/environment with only `models-works-only.test.cjs`. Full suites and
application rebuilds remain the main agent's queued work.
