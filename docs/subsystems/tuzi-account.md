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

The new account entry in a native header uses its existing icon in a 32px
button. Its translated span supplies the accessible name through
`aria-labelledby`, and `data-tt` translates the hover title. In the sidebar
the full label stays visible. These rules live only in the Tuzi stylesheet;
the shell's `fitTop` steps, original controls and brand styles are unchanged.
The added width may make Update collapse to its arrow earlier, an explicitly
accepted difference. `brand.test.cjs` checks the logo at 860px and all five
translated names. `header-zoom-fit.test.cjs` retains the original navigation
as a fixture control and allows the added entry its 32px width budget.
See [navigation evidence](../tuzi-magpie/navigation-layout-evidence.md).

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
