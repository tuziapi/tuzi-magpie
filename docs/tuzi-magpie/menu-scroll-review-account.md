# Menu input-scroll fixture diagnosis

Follow-up branch: `codex/tuzi-magpie-menu-scroll-review`, based on
`6f3727d9865f19ca27169ccd56c3479c18d5e36c`, in
`/Users/syd08/Documents/tuzi-magpie-account`. Original Magpie reference:
`2251ca1`. The parent assigned the en/zh `.rt-rmore` count-zero failures from
the full Chromium suite. Scope is this test and this record only.

## Finding and correction

The original and integration HEAD have byte-identical routing `client.js`,
`app.css`, `menu-input-scroll.test.cjs` and `reader.cjs`. The relevant menu and
`scrollCloses` implementation in `app.js` is unchanged too.

The test focuses the routing editor's input immediately after opening it.
`slotMorph` expands the editor under `overflow:hidden`, with a 570ms height
animation and staggered child animations. Focusing the input during this
motion scrolls the editor container. As its height grows, its scroll position
clamps down and emits more container scroll events. Those events correctly
close a menu outside the container.

Event instrumentation proves that the mouse hits `.rt-rmore` and the menu is
added; this is not a missed click. In current Chromium/en, the menu was added
at 320.3ms, input blur reset horizontal scroll at 326.4ms without closing it,
then the editor scrolled at 338.1ms and the menu disappeared at 338.6ms. The
original reference has the same sequence (editor scroll 299.0ms, removal
299.5ms). Both languages and both engines reproduce the failure on both trees.

The test now calls the existing `reader.cjs` `settled(page)` helper after Edit,
before focusing the input. That helper waits for finite animations, including
WebKit's animation registration. The test still fills the overflowing input,
presses End, uses real mouse input, waits 400ms, requires the menu to remain,
closes it with Escape and rejects page errors. Both row-menu and protocol-menu
assertions are intact. No production behavior or style changes.

## Verification and evidence

Evidence directory:
`/Users/syd08/Documents/tuzi-magpie-evidence/menu-scroll-01/`.
Browser runs used the parent-assigned lightweight slot, serial engines and
one browser at a time. Each engine run contains en and zh cases.

| Run | Chromium | WebKit |
| --- | --- | --- |
| Original fixture, current assets | 0/2, 2.861s | 0/2, 2.591s |
| Original fixture, original assets | 0/2, 2.482s | 0/2, 2.358s |
| Corrected actual repository test | 2/2, 5.516s | 2/2, 5.281s |
| Corrected diagnostic, current assets | 2/2, 5.374s | 2/2, 5.319s |
| Corrected diagnostic, original assets | 2/2, 5.581s | 2/2, 5.540s |
| Negative control, corrected diagnostic | 0/2, 4.577s | 0/2, 4.522s |

Logs use `current-*`, `baseline-*`, `fixed-repository-*`, `fixed-current-*`,
`fixed-baseline-*` and `negative-*` names. Matching directories contain event
JSON for each language and menu assertion. Diagnostic scripts are stored next
to the logs. Original assets came from `git archive 2251ca1 internal/gui/assets`.

The negative control is an isolated asset copy with only the input/textarea
exemption removed from `scrollCloses`. All four cases fail the original
menu-stays-open assertion. Events show input blur's horizontal scroll directly
removing the menu, with no editor-container scroll. Corrected current and
original traces still contain the real input blur scroll, and the row menu
stays open. This confirms the wait does not hide the regression being tested.

Actual repository test commands, one engine at a time:

```sh
NODE_PATH=/Users/syd08/Documents/tuzi-magpie-tools/node_modules \
PLAYWRIGHT_BROWSERS_PATH=/Users/syd08/Documents/tuzi-magpie-tools/browsers \
BROWSER=chromium node --test internal/gui/tests/menu-input-scroll.test.cjs
# Repeat with BROWSER=webkit.
```

`git diff --check` passed. All browser requests used synthetic route fixtures;
no real accounts, credentials, models or external service were used. All
browser processes launched by these tests closed; no listener/port remains.
The browser slot was released to the parent after the final negative run.
The parent owns integration review and full-suite verification.
