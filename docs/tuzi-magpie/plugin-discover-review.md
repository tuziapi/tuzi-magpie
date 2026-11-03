# F16: explicitly choose the Discover card scenario

Only `plugin-card-update.test.cjs` changes: after opening Plugins, click its
existing Discover tab before locating the Discover update card. No plugin
renderer, startup behavior or update request changes.

The original test assumed startup always chooses Discover. Holding the real
start.js response until the existing updates request is consumed demonstrates
the legal alternative on original2251 and frozen c723 assets: Installed opens,
the requested Discover card is absent, and the old test times out. The changed
test explicitly chooses Discover and passes its original version, single update
request, no-detail-navigation and page-error assertions. The controlled old/new
sequence was also verified in Chromium at main cadfb77.

Complete context-map and plugin-card-update files pass16/16 in each engine,
with no skips/cancellations. A real renderer mutation disabling updateButton
still fails waiting for the Update button in both languages and both engines;
the card exists in Discover, so this is not the original wrong-tab failure.

Evidence: `/Users/syd08/Documents/tuzi-magpie-evidence/f13-f14-f16-diag-01/`,
`map-plugin-verification.json`, `plugin-{old,baseline,candidate}.log`,
`plugin-controlled-{old,candidate}-chromium.log`,
`plugin-negative-{chromium,webkit}.log`, `full-map-plugin-{chromium,webkit}.log`.
Root reviewed the exact diff, controlled page state and all result footers;
the website agent independently reviews the same sources and evidence.
This closes the scoped scenario without rewriting the frozen full-suite result.
