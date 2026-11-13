# Tuzi desktop account

`internal/tuziaccount` owns one active system-token account. The production
origin is fixed to `https://api.tu-zi.com`; the explicitly tagged `tuzi_fixture`
constructor accepts only literal loopback HTTP for synthetic desktop testing.
It does not change normal model Providers or their manually entered keys.

## Runtime and trust boundary

`gui.tuziAccountRoutes` is registered by the desktop handler only. Every request
also requires `ownWindow`'s `windowSchemeKey` context, which HTTP headers cannot
set, a native Host/Origin, and no frame/cross-site/plugin referer. Web page keys,
gateway keys, a loopback peer and forged Wails headers grant no access. Community
plugin pages remain behind `noFramedAPI` and the plugin bridge read allow-list.

The public state contains identity/status/generation and optional pending-write
metadata, never the saved token. Connection/check/disconnection are explicit.
On restart the saved identity starts offline until bootstrap verifies it.
Network errors keep the saved token; invalid/disabled identities are marked
invalid. Switching or disconnecting advances the generation and cancels old
requests; every eventual reply and Provider save rechecks that generation.

The Tuzi manifest scripts load after `kernel.js` and before `app.js`, as
other built-in clients do. `integration.js` declares lazy shell callbacks;
they use the app helpers only when invoked after startup, so declaration
does not require those helpers to exist yet.

The account entry is first in the native navigation, before Work/Agents,
using the bundled rabbit mark from tuzi-switch. A native horizontal header
keeps an icon-only entry with its translated accessible name and tooltip;
the sidebar shows the full label. The first native launch opens Tuzi account, then restores the saved page;
see [GUI shell startup defaults](gui-shell.md). Feature gates and native/web
ownership remain unchanged.

The distribution brand keeps the original Magpie bird and is a single line. On macOS its sidebar mark and name
sit below the traffic lights and navigation toggle, using the distribution's
`tuzi-brand` and `tuzi-side-top` classes. The shell's fitting steps and saved layout preferences remain unchanged;
a new window starts at 1200×800 points as documented in the GUI shell.

The account stylesheet owns its outlined/primary/destructive button hierarchy,
aligned filters, responsive cards, tables and dialogs. Tabs use a simple
underline; log filters have no outer card. Statistics keep label/value pairs
close together and place the full-ranking action beside its section heading.
The page shares the desktop shell's 16px minimum gutters and centred 1200px
reading area. When the native-only account entry is hidden, the following Work
heading keeps the first visible group's 2px top padding.
The account-key picker shows the selected model and full-width key rows.
Recorded-call details omit the related-request button; the backend endpoint
remains available, but this page no longer invokes it. The existing log columns
remain available in an independently scrolling table. Consumption bars add
currency/time axes and model shares add a visual track; success history adds
threshold/sample legends and timestamps. Calculations, request filters,
refresh timing, mutation guards and pricing rules are unchanged. Catalog
family icons use bundled assets; descriptions select a supplied translation
for the active UI language, falling back to the original description.

`tuziIcon` selects the rabbit for Tuzi/Tuzi Coding preset defaults and
unbranded custom rows at the known Tuzi account hosts. It changes only the
rendered icon, never saved providers, endpoints or keys. Explicit custom icons
and unrelated providers retain their icons. The account API is not exposed to
browsers by these presentation changes.

`brand.test.cjs` checks logo visibility, a single-line name, navigation order
and translated account labels. The account tests exercise its existing writes,
filters, dialogs, lifecycle and narrow layouts in both engines and five languages.
See [UI polish](../tuzi-magpie/frontend-polish-2026-11-04.md).

## Page visibility and in-flight operations

The account client's `visibilityChanged` stops search and status-refresh timers
when the desktop becomes hidden. Idle data reads are aborted and reread when the
page becomes visible. A busy initial open, explicit connection/check, or Key
operation keeps its response handler alive: hiding must not silently abort an
operation after the backend has received it. No operation is replayed on return.
A real page leave still cancels requests and removes entered/revealed secrets.
The shared `cancelRead` and `stopReadTimers` helpers in
[`client.js`](../../internal/gui/assets/plugins/tuzi/client.js) keep these two
lifecycles separate. Controlled held-response cases in
[`tuzi-account.test.cjs`](../../internal/gui/tests/tuzi-account.test.cjs) cover
initialization, connection, Key writes, idle reads, background timers and leaving.

## Storage and mutations

The dedicated `appdir.Config()/account-private/account.json` is separate from
providers/settings. The directory is 0700 and the file 0600 on Unix, with bounded
strict reads, symlink checks, temporary-file fsync and atomic replacement.
`backup.Collect` and DAV sync collect explicit DTOs and never read this file.
A local disconnect replaces it with a tombstone; it does not revoke the remote
system token or remove Providers. A storage failure is never reported as success.

Before a remote Key mutation, the service durably records only its method, path
and timestamp. Success or definitive refusal clears that gate; a transport error,
malformed reply or server failure leaves it in place across restart. No writes
are automatically replayed. `/api/tuzi/recover` with `acknowledge:false` reads the
Key or first Key-list page, showing the result. A separate true acknowledgment
clears the gate; it requires a completed read. Only exact `not_found` proves a
DELETE's target absent. A create's first-page read is evidence for human review,
not an automatic claim that a matching name proves success.

`Request` accepts a bounded allow-list of logical `/account/*` operations,
query fields and body fields. PATCH sends only provided fields. Account/log/key
responses are projected; integers stay decimal strings, no float accumulation.
Statistics retain refund and availability semantics. Prices are catalog data,
not personal final charges. Nonempty conditional-task, per-second-variant and
per-call-variant pricing structures use the existing website fallback: a base
price or scalar group override does not describe all task conditions. Empty
structures keep ordinary base prices; supported linear tiers remain available
when no unsupported task structure is present. Performance absence stays null; all groups (omitted)
and an explicit empty selection are distinct. No request performs inference.

## Key to Provider

`KeyModels` rereads the owned enabled/unexpired/nonempty Key and reads `/v1/models`
with that model key alone; no system token is sent to the model API. Adding a
Provider verifies bootstrap identity, Key qualification, the model-key listing,
and directory group/protocol metadata in batches of at most three at one stable
pricing snapshot. Only after all checks does the model key reach Provider storage.

`provider.AddTuziSource` stores `{origin,userId,tokenId}` provenance beside the
Provider in one file replacement. Duplicate source locates the existing ID and
never overwrites user edits. The source is non-secret and can be backed up, but
never authenticates an account. Ordinary Provider saves retain absent provenance.
The new append preserves unknown existing JSON fields and refuses malformed files
or bytes changed during preparation. Its mutex serializes account additions;
other existing provider writers do not share it. The final comparison followed
by rename is not an atomic compare-and-swap against a noncooperating external
writer. This limitation is explicit, not a claim of a global file transaction.
Agent model selection/wiring remains the existing separate Magpie flow.

## Browser navigation and clipboard

`WebURL` selects fixed URLs without credentials. Only explicit token-page opening
arms a five-minute, same-generation prefill opportunity. `/api/tuzi/prefill`
consumes it once before native clipboard read; cold-start/deep-link alone does not
arm it. Only 29–32 ASCII alphanumeric characters are candidates. The UI inserts
into an empty form and still requires explicit Connect. Invalid formats can be
pasted manually. The native host implements `TuziClipboardText() (string,bool)`.

## Verification

Run under an isolated HOME with pinned Go caches (the repository testenv also
isolates each package):

```
go test -tags nogui ./internal/tuziaccount ./internal/provider ./internal/gui -run Tuzi
go test -race -tags nogui ./internal/tuziaccount ./internal/provider ./internal/gui -run Tuzi
```

The synthetic tests cover restore/offline/invalid state, cancellation and late
responses, storage failure/corruption, persistent unknown writes, integer fidelity,
secret projection/backup exclusion, route constraints, protocol snapshots,
source dedupe/conflict and desktop-only access. Native desktop-to-synthetic-server
E2E is a separate integration check; no test here proves live service availability.

Provider qualification preserves ordered fallback Key groups and resolves the
virtual default group from server catalog metadata. The Key's own model listing
remains the access authority. Protocol metadata rejects non-string methods or
paths, normalizes endpoint labels, and treats absent legacy details separately
from malformed data. `testdata/endpoint-compatibility.json` is the synthetic
reference contract copied from tuzi-switch's tests/fixtures file on 2026-11-03.

## Product analytics

Explicit UI operations emit allow-listed Chinese Umami events through the
[GUI analytics boundary](gui-shell.md#tuzi-umami-analytics). Refreshes and account
restoration emit no operation events; account identity and business data remain
outside analytics. Provider reuse and uncertain writes retain distinct results.
