# New navigation entry: layout and approval

## Decision and implementation

The user explicitly accepted the 32px new entry and earlier Update-label
collapse; the main agent relayed that approval to this agent before this
change was committed. Earlier exploration kept the original zoom assertion
red rather than treating the changed layout as compatible. This is an approved
difference from the original UI, not a claim that every old width threshold
is unchanged.

Only the new native header button is styled: its existing 16px icon with 8px
padding on each side, its label hidden there, full text retained in the sidebar.
The existing label supplies an accessible name through `aria-labelledby` and
its hover title uses the app's `data-tt` translation. English, Simplified and
Traditional Chinese, Japanese and German are checked. Original `app.css`,
`fitTop`, brand rules and original tab styles are untouched. Web/phone styles
are excluded by `body.window:not(.web)`.

## Before and after

At 860px on a native Mac, the prior full new label advanced `fitTop` to the
step hiding the original bird icon. Using the 32px entry keeps the original
bird visible. The original and approved layouts retain `top tight cramped
inrow`; bird bounds are x130 y17 width18 height18. The added entry contributes
32px and the originally centered tab group moves 16px left. No icon artwork,
font, color or original control padding is changed.

For native Windows, English, 125% page zoom, synthetic Update available, the
10pt diagnostic sweep measures:

| Layout | Last sampled width with Update text | First sampled width with arrow only |
| --- | --- | --- |
| Original navigation | 1180pt | 1170pt |
| New 32px entry | 1220pt | 1210pt |

Thus the sampled 1180–1210pt band folds Update text earlier. Its button
changes from 72.44px to 22px; the arrow, tooltip and action remain. Windows
already hides the brand in this layout. At 1200pt the original nav is
x163.41 width633.19; the new one is x147.41 width665.19. These are CSS pixels
at page zoom. The difference affects original header presentation and is
explicitly included in the user's approval.

## Evidence and checks

Evidence root:
`/Users/syd08/Documents/tuzi-magpie-evidence/lines/ui-targeted/`.
Original source: frozen `2251ca1` assets in the adjacent
`ui-regression-baseline` directory. Current implementation starts at
`80edd7caea901363879740a2a382d522a9680d9f`; fixture corrections are `49dc1e3`.

- `baseline-brand-{chromium,webkit}.log`: original logo test passes.
- `negative32-brand-chromium.log`: the current brand test against current
  assets with only these three Tuzi CSS rules removed fails at the native
  Mac 860px logo-visibility assertion (`false !== true`). The derivative
  assets are in `ui-nav-without-fix`; working sources were never reverted.
- `final32/`: approved native 860px screenshots and element bounds, both engines.
- `header-original/chromium-header-1200.png` and
  `header-candidate/chromium-header-1200.png`: same conditions before/after.
  Each directory also contains the 1220, 1210, 1180 and 1170pt images.
- `header-original.log`, `header-candidate.log`: full element bounds after
  the update animation completes. `header-threshold-diagnostic.cjs` is the
  saved observation script, not an acceptance test.
- `baseline-header-chromium.log`: original 5/5 passes.
  `fixed-header-chromium.log`, `final-targeted-chromium.log` and
  `final-nav-chromium.log` preserve failed tight-only, 40px icon and 24px
  exploratory variants. The too-small exploratory variant was discarded.
- `approved32-targeted-chromium.log`: 15/15, covering brand, both gateway
  files and both header modes. `final32-targeted-webkit.log`: brand and both
  gateway files, 5/5. `approved32-header-webkit.log`: both header modes, 10/10.

The header test's original-navigation fixture removes only the new button
before the page loads and retains the original `w >= 1200` assertion. Its
new-entry fixture grants `32 * zoom` points of room (at most 40pt in the
existing 110/125% sweep). Both retain monotonic degradation across 1300–700pt
and additionally assert no document overflow at every width. The original
navigation control therefore remains a regression guard, independently of
the approved new-entry budget.

Commands use the installed Playwright dependency and browser paths, one
worker and one engine at a time. All API calls use synthetic intercepted
fixtures. No full UI suite, Go build, native application or real external
service was run by this task. The main agent owns integrated validation.
