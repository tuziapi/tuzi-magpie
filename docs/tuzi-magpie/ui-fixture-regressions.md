# Balance and gateway fixture corrections

## Scope and source

This work is based on integration `80edd7caea901363879740a2a382d522a9680d9f` in
`/Users/syd08/Documents/tuzi-magpie-lines`, branch
`codex/tuzi-nav-balance-regressions`. The original upstream comparison is
`2251ca1`, archived at
`/Users/syd08/Documents/tuzi-magpie-evidence/lines/ui-regression-baseline`.
All browser requests are intercepted by the existing synthetic fixtures.
No Go build, full UI suite, native app or real service was run for this patch.

## Balance input

Two `balance-fix.test.cjs` locators used the second password input. The
original editor already inserts the proxy password before the account balance
token; that locator typed into the proxy password. Both sibling locators now
select the exact translated balance-token placeholder. Production editor code
is unchanged. `MAGPIE_BALANCE_ASSETS` permits comparison with the archived
original assets.

The original test and original assets fail the new-custom balance warning
assertion in Chromium and WebKit (`""` instead of `The token needs a Balance
URL`). The corrected full balance file passes 50/50 in each engine. Evidence:
`/Users/syd08/Documents/tuzi-magpie-evidence/lines/ui-targeted/`:

- `baseline-balance-chromium.log`, `baseline-balance-webkit.log`.
- `fixed-balance-chromium.log`, `fixed-balance-webkit.log`.

## Gateway resize

Both gateway key files measured page width immediately after resizing to
560px. The existing `fitTop` ResizeObserver had not finished. They now wait
for two animation frames, using the same convention as the unchanged
`header-zoom-fit.test.cjs`, before making the exact original width assertion.
The viewport, width threshold, application layout and controls are unchanged.

The frozen original Chromium tests fail both English width assertions
(`baseline-gateway-chromium.log`). A diagnostic on the integrated assets
records `scrollWidth:617` immediately after resize and `560` after two frames;
header classes change from `top tight` to `top tight cramped inrow crowded
packed` (`gateway-overflow-diagnostic.log`). The diagnostic intentionally
asserted its immediate measurement and stayed red.

A separately named derivative at `ui-regression-settled-baseline` uses the
original assets and tests with only the post-resize wait added. The original
frozen snapshot is untouched. Its gateway tests pass 4/4 in Chromium and
WebKit (`baseline-settled-gateway-{chromium,webkit}.log`). Current gateway
target results are recorded separately, alongside navigation candidate tests;
header failures are not counted as passing gateway or full-suite validation.

## Separate navigation work

The new Tuzi entry's label width makes the original Mac logo disappear at
860px and affects the original zoom-fit test. Navigation work is kept outside
this fixture patch. Its 32px icon entry and earlier Update-label collapse
were explicitly approved separately and are covered by a separate navigation
change; no old layout assertions are relaxed by these fixture corrections.
