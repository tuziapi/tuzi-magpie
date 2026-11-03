# F13: measure the map after real reader positioning

Only `context-map.test.cjs` changes: call its existing `wheelTo(page, map)`
before collecting tile rectangles. No product CSS or layout code changes.

Both original2251ca1 and frozen c723 assets reproduce the offscreen WebKit
en420 overlap: map328×132, no responsive max520/max420 classes, memory tile
18px wide because of padding, overlap0.625px. Real wheel positioning makes
the original responsive observer size the visible card: map328×164 and both
classes present. The same original strict geometry and subsequent interaction
assertions then pass. The discarded external CSS candidate is not integrated.

At main cadfb77 plus this test change, complete context-map and
plugin-card-update files pass16/16 in each engine, with no skipped/cancelled
tests. The original2251 visible control also passes. Moving a real tile onto
another with a transform fails the unchanged `two tiles overlap` assertion
in both engines. The0.5px tolerance, tile visibility, containment, minimum size,
tooltip, look-switch and page-error checks remain unchanged.

Evidence: `/Users/syd08/Documents/tuzi-magpie-evidence/f13-f14-f16-diag-01/`,
`map-plugin-verification.json`, `map-original-visible.log`,
`map-negative-{chromium,webkit}.log`, `full-map-plugin-{chromium,webkit}.log`.
Root reviewed the exact test diff and all result footers/negative assertions;
the website agent independently reviews the same sources and evidence.
The frozen complete suite remains red; this is a scoped repair closure.
