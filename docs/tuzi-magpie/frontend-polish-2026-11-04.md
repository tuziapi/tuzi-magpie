# Tuzi frontend polish — 2026-11-04

## Scope

This local change implements the approved restrained appearance with blue
accents, using the existing rabbit logo from
`tuzi-switch/src/assets/tuzi-account-rabbit.png`. No image was generated.

- Tuzi account is first in navigation, before Agents.
- The rabbit appears in navigation, the account header and Tuzi provider defaults. The distribution
  wordmark keeps the original Magpie bird. Explicit custom provider icons remain.
- `tuzi-magpie` stays on one line. On macOS the sidebar brand has a separate
  row beneath the native window controls.
- Account metrics, filters, key rows, forms, dialogs and pagination have
  consistent spacing and alignment. Primary, secondary and destructive
  actions have distinct button treatments.
- The model catalog and historical service cards use bundled family logos.
- Recorded consumption adds axes and share tracks. Service history adds a
  threshold legend and time labels. Unknown samples remain unknown.
- Core action labels missing translations now cover all five supported
  languages. Dates use the UI locale; model descriptions prefer a supplied
  translation and fall back to the original description.
- Tabs use a simple selected underline, without nested frames.

All account layouts remain scoped to `#view-tuzi`; distribution branding has
its own classes. Tables retain all log columns and scroll inside their own
container. Compact layouts preserve keyboard focus, accessible labels and
existing tab keyboard navigation.

## Functional boundary

No Go source, backend API contracts, request payloads, refresh intervals,
mutation guards, credential handling, routing, prices or accounting formulas
were changed. The follow-up removes the explicitly requested related-record
UI entry and its frontend request handler.
Provider icon selection is presentation only and does not modify its input.

The initial presentation pass left native defaults unchanged. On 2026-11-05,
the user requested consolidation and completion of the remaining defaults.
All changes now also live in `/Users/syd08/Documents/tuzi-magpie-local`, branch
`codex/tuzi-magpie-local`, together with its existing Simplified Chinese default.
The native window now starts on Tuzi account at 1200×800 points when no prior
page/size exists, and retains explicit links and saved choices. See
[consolidation verification](unified-preview-2026-11-05.md).
The old `codex/tuzi-ui-polish` worktree remains a backup. Builds are local;
no installation or release has been published.

## Verification

Browser commands use:

```sh
export NODE_PATH=/Users/syd08/Documents/tuzi-magpie-tools/node_modules
export PLAYWRIGHT_BROWSERS_PATH=/Users/syd08/Documents/tuzi-magpie-tools/browsers
```

- `brand.test.cjs`, `i18n-keys.test.cjs`, `gui-zh-tw.test.cjs`,
  `gui-ja.test.cjs`, `gui-de.test.cjs` and `tuzi-account.test.cjs`: the combined
  run passed 37 tests in Chromium and WebKit. The account suite exercises all
  five languages at 1100px/light and 420px/dark, plus write recovery,
  confirmation, visibility and lifecycle behavior.
- After the final tab background adjustment, `tuzi-account.test.cjs` passed
  again: 22 tests, 0 failures, both engines (327.9 seconds).
- `sidebar.test.cjs`, `gateway-mode.test.cjs`, `last-page.test.cjs`,
  `header-relang.test.cjs` and `header-zoom-fit.test.cjs` passed in both engines.
- `side-toggle.test.cjs`: 26 passed after correcting a one-pixel macOS toggle
  offset. Includes simulated Mac/Windows/Linux markers and all five languages.
- `header-centre.test.cjs`: 14 passed on an isolated rerun. The preceding
  combined run reported one Chromium English/125% initial-layout spacing
  failure (2.23px instead of at least 7.5px). No header fitting logic was
  changed between those runs; its timing sensitivity remains uninvestigated.
- The updated brand regression was run against assets archived from HEAD and
  failed in both engines on the missing rabbit logo; the current assets pass.
- Eight direct provider icon checks passed, including both Tuzi defaults,
  custom hosts, explicit custom icons, unrelated providers and unchanged input
  objects.
- `scripts/tuzi-magpie/isolated.sh go test -tags nogui ./internal/gui -run
  'Test.*(Tuzi|CoreScript|BuiltinClients|Asset|Embedded)' -count=1`: passed.
  The existing core script size budget is unchanged.
- JavaScript syntax checks and `git diff --check`: passed.
- `make app TAGS=production VERSION=tuzi-ui-local`: passed after the final
  frontend changes. Existing Objective-C enum/linker warnings remain.

Manual browser inspection used a local synthetic fixture, no real account:
account cards, model logos, 420px resizing, service-history legends and
consumption chart alignment. Screenshots are under
`/Users/syd08/Documents/tuzi-magpie-tools/ui-polish-preview/`. Test logs are
retained in its `validation/` directory.

Not run: the entire repository/GUI suite, cross-platform vet/build matrix,
real-account operations and a native runtime acceptance run of the final app.
Browser WebKit validation and a production build are not a substitute for
native runtime validation. No release or PR was made.

## Follow-up visual refinements

The user's eight follow-up requests are implemented in the same worktree:

1. Restored the original bird beside `tuzi-magpie`; rabbit account/provider
   icons remain.
2. Input focus uses a darker single border instead of the blue outer ring.
   Buttons retain a keyboard-visible focus indicator.
3. Replaced nested tab frames with a simple selected underline.
4. Removed the outer border/padding around More log filters.
5. Removed the Related request records button and its frontend handler.
   The backend endpoint is unchanged; the browser regression now verifies
   there is no such button and no related-record request.
6. Compacted statistics label/value columns, including error count and refunds.
7. Moved All model rankings to the right of the By model heading.
8. Account-key selection shows the model icon/name, full-width key rows with
   a separate group line, hover states and a directional hint. Eligibility,
   pagination and the subsequent provider configuration flow are unchanged.

Manual synthetic preview verified search focus, tabs, log filters, compact
statistics and the picker at 1280px and 420px, including selecting a key and
reaching the existing configuration form without submitting a provider.

Follow-up validation: account/brand/i18n browser tests passed (28 tests,
0 failures, Chromium and WebKit); targeted GUI asset/budget Go checks,
JavaScript syntax and production app build passed. The final statistics-only
CSS selector correction was also visually verified in the synthetic preview.
The existing preview app was updated and restarted with its launcher and
configuration retained. Native inspection confirmed the original bird,
underline tabs and connected account; no provider/key mutation was performed.
This is not a full repository or full native functional acceptance run.
