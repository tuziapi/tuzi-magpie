# F14 — Header observer frame scheduling

Scope: the `topFit` ResizeObserver in `internal/gui/assets/app.js`, its local
comment and the GUI shell reference. The `fitTop` algorithm, observed elements,
font/navigation/direct calls, breakpoints, fonts, spacing and actions are unchanged.
Evidence: `/Users/syd08/Documents/tuzi-magpie-evidence/f13-f14-f16-diag-01/`.

## Cause and candidate

The original 2251ca1 and frozen c7238e1 both reproduce the WebKit loop error in
header-centre, English at125% and880 CSS pixels. The observer trace identifies
fitTop changing the observed actions width119→79 inside ResizeObserver delivery.
The tools observer was merely the final delivered observer, not the cause.
The candidate coalesces observed-size fitting into one requestAnimationFrame.
The token is cleared before fitting, permitting a later real size change to
schedule another frame. Direct calls remain immediate. No DOM or observer
entries are captured across the frame; fitTop reads current nodes. The existing
header nodes are moved between layouts but not destroyed by the shell.

The local header comment was shortened to preserve the unchanged script budget.
The complete candidate app.js is88 bytes smaller than c723's app.js. After applying
it in the main worktree, cmp confirmed exact equality with the validated external
candidate. Node syntax and git diff checks pass.

## Verification before approval

Original/current and candidate header-centre tests were exercised in both
engines, retaining all original0.5px/6.5px/7.5px geometry checks and pageerror
assertion. Candidate:7/7 each; current Chromium7/7, current WebKit6/7 with the
known ResizeObserver error. Original2251 WebKit also has that specific error.
No error was suppressed. External diagnostic copies add trace/captures only.

The first screenshot set captured the existing450ms update-in animation and
retains those temporal differences. The second set waits for actual finite
header animations to finish without disabling motion. Of32 original/candidate
snapshot pairs,31 are byte-decoded pixel-identical. The sole remaining pair,
Chromium Chinese560px at100%, differs at two shadow-edge pixels only:
(64,10) RGB233,233,234→231,231,232 and
(64,35) RGB212,212,214→211,211,213. At900px and560px the additional
112-element geometry/transform capture is exactly equal before/after.
No tolerance or masking was used in that comparison.

The candidate's12 idle samples (two languages×three zooms×two engines) record
no additional ResizeObserver callback during each subsequent12 animation frames.
Thus the observed repair does not keep scheduling itself while idle.
Raw results: header-settled-results.json, header-settled-comparison.json,
header-edge-geometry.json and corresponding logs/PNGs. This is scoped GUI
evidence, not a new full-suite pass.

## Explicit authorization and independent review

The user explicitly answered “采用这项最小修复及已说明差异” to the F14 question,
authorizing the maximum-one-frame observer delay and the two reported pixels.
This is separate from the earlier approved Routing observer correction.
The approved exact candidate was then applied to development source.

The account subagent independently read the actual two-file diff and all cited
results, independently decoded the two differing pixels and compared all112
geometry records. It found no blocking issue, missing existing disconnect
lifecycle, stale DOM capture or accidental direct-call change. No browser or
build was repeated for that read-only review.

## Remaining verification and delivery

Before closing F14, run the six affected existing files in both engines:
header-centre, header-zoom-fit, header-relang, title-bar-tools, side-toggle,
text-size. These cover the changed header observer, layout/zoom/language and
its direct-call neighbors. No complete GUI or Go rerun is planned.
Then run the embedded-GUI package checks (including the unchanged script
budget), rebuild the final production macOS app and actually launch it in the
isolated delivery setup. The currently saved c723 production app predates F14;
it must not be represented as the final build of this source. Full Go/CLI and
synthetic account/gateway evidence remains separately attributed to its recorded
source; F14 changes no Go or account/gateway behavior.
