# Desktop account workspace

The `tuzi` built-in plugin adds one desktop-only page. Existing pages retain
all styles and navigation behavior. `client.js` registers no page when
`bootPrefs.web` is true; the trusted native facade independently rejects
non-desktop callers. Every stylesheet selector is scoped to `#view-tuzi`.

The page owns four tabs: API keys, recorded calls, catalog, and model status.
The keys tab owns the four account summaries. Profile settings are not exposed.
Money uses decimal strings and BigInt; group catalog prices exclude personal
price overrides and never execute billing expressions. The only persisted
browser preference is the display currency. Tokens and revealed model keys
remain in memory and are cleared on dismissal or leaving the page.

## Interface and lifecycle

`POST /api/tuzi/request` passes the native generation, an allowed logical path,
method, query pairs, and an optional projected body. Account state is read from
`GET /api/tuzi/state`; native connect/check/disconnect, provider, recover, open,
and prefill operations use their dedicated routes. The source of truth is the
native account subsystem; this page does not derive credential permissions
from catalog visibility. Provider creation revalidates eligibility natively.

The page resets reads and account data when identity or generation changes.
Explicit refresh, check, re-entry and foreground recovery refresh summaries
and money metadata. The native uncertain-write marker gates mutations until
readback and explicit acknowledgement. Requests have abort signals; prefill
also fences the page lifecycle and account generation after awaiting native
clipboard access, so leaving cannot refill hidden inputs. A manual token is
never replaced by a deep link. `busy`, `dirty` and `discard` hooks let the shell
block navigation while a write is pending and confirm unsaved edits.

Log filters have separate draft and applied values. List and statistics share
the same applied query; statistics omit the list-only pagination fields.
Lists use ten records per page; statistics remain below list/pagination,
with five leading models and a full ranking dialog. Related records are
requested only from a detail dialog and exclude the current record.

Catalog search debounces 400 ms and accepts Enter; composition, request
cancellation and focus preservation prevent stale results from losing typed
text. Facets use Magpie's searchable menu and tags support multiple choices.
Model status retains API ordering, six models per page, and 1/6/24 hour
half-hour samples. All-groups requests omit `groups` instead of sending an
empty list. Only historical success/latency/TTFT are shown; no inference runs.

## Checks and evidence

`internal/gui/tests/tuzi-account.test.cjs` loads the real shell with an isolated
synthetic HTTP facade in Playwright. Until shell integration, the fixture adds
only the new plugin scripts, styles and navigation entry. It checks five
languages at 1100px light / 420px dark; detailed tests cover write recovery,
advanced key limits, deletion, Web exclusion, refreshed account metadata,
strict statistics query shape, pagination, related records, model search,
facet selection and clipboard lifecycle. No test uses external account data.

`internal/gui/tests/tuzi-money.test.cjs` checks exact decimal conversion,
missing-rate rejection, catalog-only group prices, final-price semantics and
safe linear tier fallback. `i18n-keys.test.cjs` checks translation completeness,
key ownership and duplicates. Logs and screenshots are recorded by the root
integration task, together with native Go/gateway E2E and complete suites.
Browser fixture tests do not establish native or production-service success.

### Author verification record (2026-11-03)

- Playwright 1.56.1, local Chromium 1194 / WebKit 2215; five languages
  (`en`, `zh`, `zh-TW`, `ja`, `de`), 1100px light and 420px dark.
- The fixture supplies ten logs with a second page, six status models,
  missing optional catalog arrays, sampled/unknown metrics, final group prices,
  and an uncertain write. It rejects pagination on the statistics route.
- Money/i18n tests: 7 passed (`/tmp/tuzi-ui-unit.log`). Browser results:
  `/tmp/tuzi-ui-chromium.log`, `/tmp/tuzi-ui-webkit.log`.
- Screenshot directory: `/Users/syd08/Documents/tuzi-magpie-tools/ui-evidence`.
  The author inspected wide logs, narrow price details, and wide/narrow status.
- Baseline-red: the core workflow test against baseline `2251ca1` assets fails
  waiting for `#view-tuzi` (the account workspace does not exist), recorded in
  `/tmp/tuzi-ui-baseline-red.log`; no compilation failure is used as evidence.
- `node --check client.js`, `git diff --check` and `gofmt -l` pass.
- No application listener remains from this UI test task; browser contexts and
  browsers are closed in test teardown. Only isolated synthetic browser data
  was used. Native E2E, integrated full suites, app build/launch and original
  page comparisons belong to the root task and are not claimed here.

### Authentication invalidation repair

Independent review found that a native business failure can clear the native
identity without incrementing account generation, while the page retained its
Connected label and cached account data. The facade error boundary now reads
actual native state for `invalid_token`, `account_disabled`, `identity_mismatch`
and `not_connected`. Page lifecycle, identity and generation fences prevent delayed state
reads from affecting a newer account or a page the user left. Invalid identity
clears the pane and any revealed-key dialog and exposes reconnection. Ordinary
network errors retain the connection and cached display.

The regression exercises native invalidation with unchanged generation through
account reads and key reveal, plus recovery by reconnecting and network-error
preservation. It fails on `16c93b3` waiting for the missing reconnection input
(`/tmp/tuzi-ui-auth-red.log`), and passes after the fix
(`/tmp/tuzi-ui-auth-green.log`). Full page checks are rerun in Chromium and WebKit
(`/tmp/tuzi-ui-auth-full-{chromium,webkit}.log`).
