# F13/F16 independent review

Reviewed 2026-11-03 by the website agent, which did not implement these
changes. Read-only review of the actual root worktree diff at
`cadfb7765a87b7b417650b7fdcfe25401620d702`, plus the two pending test edits.
No browser, build or test was launched by the reviewer. No blocking finding.

## Scope and assertions

The diff contains exactly three added lines in each of two test files:
`context-map.test.cjs` brings the map into sight through the existing `wheelTo`
helper before sampling its geometry, and `plugin-card-update.test.cjs` selects
the Discover tab before finding its card. No product source, shared helper,
expected value, tolerance, timeout or original assertion changes.

For F13, `wheelTo` ends in `reach`, which requires the control wholly in its
view and clear at its click point. The existing animation wait and one-shot
sampling of map plus tile rectangles remain. All containment, minimum size
and pairwise non-overlap assertions are intact, as are subsequent hover,
part identity and alternate-view checks. This exercises the map in the
reader's visible viewport; it does not suppress an overlap assertion.

For F16, source verification found the plugin header's fixed tab order
`builtin`, `discover`, `installed` in `plugins.js`'s `head()`. The new `nth(1)`
selects Discover for the stated card scenario. `show()` selects Installed
when `pluginUpdates` is already nonzero, explaining the startup-order-sensitive
original fixture. The test still checks the exact update label and title,
version transition, one upgrade request naming the expected package, update
button removal, absence of the detail page and no page errors.

## Verification script and evidence

Read `verify-map-plugin.py` and its external derivatives under
`/Users/syd08/Documents/tuzi-magpie-evidence/f13-f14-f16-diag-01/`.
The script serializes Chromium and WebKit work with `--test-concurrency=1`,
uses a temporary HOME and explicit Playwright installation, and records actual
subprocess exits. Full-file runs load the root's actual files; diagnostic
copies use the explicit ASSETS path. The negative plugin asset directory has
one regular changed file (`plugins.js`); other assets are symlinked. Its only
source mutation changes `updateButton`'s guard to always return false.

The controlled plugin fixture holds `/start.js` until the already-real
`pluginUpdates` request has reported an update. The old and candidate copies
differ only by the explicit Discover click. Old logs show Installed and no
Discover cards, then timeout at the expected card's Update button. Candidate
logs pass. This makes the previously implicit startup ordering deterministic.

Independently read the completed manifest and every relevant footer:

| Evidence | Result |
| --- | --- |
| Original assets, map brought into view, WebKit en/420 | 1/1 pass, exit 0 |
| Injected tile overlap, Chromium and WebKit | Each fails `two tiles overlap`, `ERR_ASSERTION`, exit 1 |
| Disabled update button, Chromium and WebKit | Each has a Discover card but no Update; both language cases fail the expected button visibility wait, exit 1 |
| Controlled old plugin sampling, Chromium | Both language cases fail on Installed/no Discover card, exit 1 |
| Controlled candidate plugin sampling, Chromium | 3/3 results pass including parent, exit 0 |
| Full two-file Chromium | 16/16 pass, exit 0 |
| Full two-file WebKit | 16/16 pass, exit 0 |

All these footers report zero cancelled and skipped tests. Earlier baseline
artifacts additionally preserve the original WebKit map overlap and the old
plugin failure against original assets. A negative button absence naturally
fails a visibility wait rather than an assert call; its logged DOM confirms
the intended failure instead of an unrelated startup error.

The evidence supports these two test repairs and retains the original behavior
checks. It is not a full repository GUI-suite result or approval of unrelated
F14 product changes.

## Reviewed file hashes

- `internal/gui/tests/context-map.test.cjs`: `ed2d8dd6f2c609bcdb5fddc2ae64d81a2e2a4816a3d4b5939c8ec5c25f2c7a6d`
- `internal/gui/tests/plugin-card-update.test.cjs`: `cb70ec52f6d271cb02d16161f42ac0ddf350f718b6353680582dd50b14a1bb84`
