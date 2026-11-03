# Independent requirements review

Reviewed on 2026-11-03 against TM-LOCAL-1.0 and the latest
ACCOUNT-OPEN-01–06 record, with the API contract and website implementation
used as protocol evidence. This review was performed by the website/lines
agent. Account backend, account UI and distribution identity are independent
review targets; the reviewer's website, presets, image tests and installed-CLI
acceptance are **not** represented as non-author review.

## Reviewed snapshots and method

- Integration worktree: `/Users/syd08/Documents/tuzi-magpie-local`, initially
  `b0b3750`, subsequently `ee15ceb188206dd2d968f6dfeef5c978243e63ec` plus the
  in-progress shell/integration changes. These are live development trees.
- Account worktree: `/Users/syd08/Documents/tuzi-magpie-account`, account
  implementation at `57c050f`; later Agent ownership repair is still pending
  at the time of this record.
- UI worktree: `/Users/syd08/Documents/tuzi-magpie-ui`, reviewed in progress
  and again at `16c93b3aecf662eb9bb12e42fe0cfc1acc22b605`.
- Review-output worktree: `/Users/syd08/Documents/tuzi-magpie-lines`, base
  `4a3b274c4b5837363bc4b1ca1529ccc391476714`.
- Reference `tuzi-switch` and the website source were read only. No account
  credentials, production service, paid model or daily Agent was accessed.

This is source/contract review. No large tests or builds were started in this
review pass; the root task owns the build queue, native E2E and final visual
comparison. Existing test evidence is linked below and retains its original
scope. A successful browser fixture does not establish native acceptance.

## Findings requiring closure

### R1 — P1: startup can modify upstream Codex before explicit connection

Affected AC-01, AC-16. Distribution data and port isolation alone do not
establish ownership of shared Agent files. `internal/gui/backend.go:74`
unconditionally calls `agent.SyncCatalog()` on startup. In
`internal/agent/sync.go:58`, an Agent with `Sync` and no `handWired` marker is
synchronized. Codex has no `Spelled` function, so this guard does not protect
an upstream installation from the new distribution.

`internal/agent/codex.go:367` treats `model_provider = "magpie"` as its own.
The branch at line 1735 recognizes upstream `magpie-models.json`, replaces
its contents using the new distribution's catalog, and can add
`openai_base_url`. `codexKeptGateway` at line 2274 rejects a plain loopback
3425 URL as a retained special endpoint and falls back to the new 3435
gateway. An unrelated daily Codex configuration can therefore change merely
by starting the new app, with no user connection action.

Required regression: synthetic temporary HOME, empty tuzi configuration,
an upstream Codex config referencing provider `magpie` at 3425 plus a
sentinel upstream catalog. Running automatic catalog/maintenance must leave
those files byte-identical. Explicit connection should establish ownership,
after which tuzi's normal catalog updates must continue working. Include
startup `KeepCodexDaemonCurrent` and `KeepCodexRolloutsPortable` in the
ownership review. Root assigned the repair to the account agent. **Open at
this review snapshot; inspect the actual repair and its regression before
closing.**

### R2 — P2: business authentication failure leaves stale connected UI

Affected AC-03, AC-04. `internal/tuziaccount/business.go:108` changes native
state to `invalid`, clears identity and increments revision on
`invalid_token`, `account_disabled` or `identity_mismatch`. In the reviewed
UI, `client.js` `http`/`request` throws the error, while `guarded` and
`loadTab` only display a notice. They do not fetch/accept the revised state.

Reproduction: connect a synthetic account, invalidate its token in the
fixture, then refresh Keys or perform a business operation. The old
Connected header and account content remain and the reconnection form is
absent until a separate explicit connection check. Required repair: reconcile
native state for authentication invalidation, clear obsolete data/dialogs,
and render the reconnect state. Ordinary network errors must preserve the
saved connection. UI owner has been assigned a regression and fix.
**Open at this review snapshot.**

## Contract and scope checks

- New stylesheet selectors are scoped beneath `#view-tuzi`; no global font,
  color or layout replacement was found. Existing application styles and
  local model icons are reused. Final same-condition screenshots are still
  required because source inspection alone cannot establish visual parity.
- Four tabs are desktop-only and settings are not mounted. The Go facade
  separately checks native-window context, origin/host and authorization;
  frontend hiding is not the access boundary.
- Account storage is separate from Provider credentials; backup selection
  does not include the private account file. Generation fencing, server
  projections, redirect rejection, provider provenance and write recovery
  are implemented in the account subsystem. R2 concerns frontend state
  reconciliation, not exposure of the system token in a Provider.
- Log list/statistics use the same applied filter values, with pagination
  omitted from statistics. Server consumption/refund semantics remain
  separate from the local Usage page. Monetary input uses decimal strings
  and BigInt. No client inference is used to populate service status.
- Catalog arrays normalize absent optional values; invalid structures throw
  rather than becoming false empty results. Group pricing excludes personal
  overrides, applies final-price semantics and rejects unreliable complex
  formulas. The apparent omission of direct `completion_price`/`second_price`
  from model projections is **not a confirmed defect**: the actual website
  endpoint returns the ratio-based `model.Pricing` schema. Direct-price
  fields belong to personal override metadata, which this UI must exclude.
- Repository configuration remains an integration observation: the new
  `product.Repository` constant is empty/unused, while About/issue links use
  literal upstream URLs. Preserving upstream attribution is valid, but a
  future fork-repository configuration must be wired/documented distinctly.
  Root has been informed; this is not permission to rewrite original UI.

## AC coverage and outstanding integration gates

| AC | Source/evidence inspected | Remaining root acceptance gate |
| --- | --- | --- |
| 01 | product/appdir/process/port identity changes and isolation tests | Close R1; run final bundle with isolated configuration; original icon check |
| 02 | native-only plugin, four tabs, keys summaries, lifecycle hooks | Actual native navigation and polling cancellation |
| 03 | service connect/check/store/generation tests and UI lifecycle | Close R2; native restart, switch, failure and reconnect flows |
| 04 | native facade, private store, DTO projections, export boundaries | Final integrated negative-access and secret-leak checks |
| 05 | all Key actions, partial PATCH, native pending-write recovery | Native complete CRUD, reveal/copy, advanced limits and uncertain-write readback |
| 06 | summaries, money helpers, applied log filters, refunds and statistics | Native synthetic amounts/timezone/logs; final browser engine checks |
| 07 | facets, optional arrays, group prices, expression fallback and configure | Native catalog/Key/Provider flow, missing data and invalid price cases |
| 08 | 1/6/24h, six-model pagination, batch route, unknown samples | Native status rendering and leaving-page cancellation |
| 09 | ownership/model/group/protocol validation; installed CLI evidence | Root native UI-to-Go-to-Provider integration; independent review of reviewer's CLI test |
| 10 | fixed three presets and purchase/query links | Integrated preset UI; independent review of reviewer's line changes |
| 11 | seven protocol paths and existing image MCP test evidence | Integrated regression; independent review of reviewer's gateway/image tests |
| 12 | website e2ba322 and browser evidence | Native fixed callback/manual return integration; independent website review |
| 13 | author UI tests plus focused Go/race evidence | Complete repository checks and baseline attribution for any existing failures |
| 14 | installed Codex/official Claude synthetic CLI evidence | Final actual macOS desktop build/start and complete native synthetic E2E |
| 15 | original history/license, disabled publishing, independent empty update feed | Final source/history credential scan, repository/update handoff documentation |
| 16 | scoped CSS and restricted shared-file changes | Close R1; final same-condition old-page visual/behavior comparison |

Evidence pointers: `account-backend-record.md`, `non-author-review-account.md`,
`ui-implementation.md`, `lines-and-images.md`, `installed-cli-acceptance.md`,
and the root-maintained `acceptance.md`/`recovery.md`. This review does not
mark any incomplete native or cross-platform gate as passed. Real-service
validation, Windows/Linux installation, user acceptance and release remain
separate external gates.
