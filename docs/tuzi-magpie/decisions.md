# Implementation decisions

## Distribution identity (AC-01/15)

`internal/product` is the source for display/OS/data identity. The default installed folder is `~/.config/tuzi-magpie`, cache and logs use the same independent name; portable uses `tuzi-magpie-data` and `.tuzi-magpie-portable`. Original `data`/`.portable` and Magpie account files are not adopted. Gateway defaults to3435, optional browser UI3440, while explicitly chosen ports remain honored. New application/service/shortcut/URI registrations use tuzi-magpie/com.tuzi.magpie/tuzimagpie; icon bytes stay identical. Configured Agent files still use upstream adapters; explicit connection remains a separate operation from saving a Provider.

The update feed defaults empty and returns a clear not-configured error without a request. A configured `TUZI_MAGPIE_UPDATE_FEED` is independent of original MAGPIE_UPDATE_FEED. Upstream release/docker/notes/media-preview publication workflows are retained as disabled source files for future owner review. Module/import paths, protocol identifiers and upstream attribution remain unchanged. The future repository address is intentionally unset.

Default port isolation is supplemented by a distribution field in gateway discovery: automatic old-version handover requires the same distribution. This avoids silently stopping original Magpie when a user explicitly sets its port. Routing, translation and fallback algorithms are unchanged.

## Account ownership (AC-04/09)

Use native `ownWindow` context, not a spoofable HTTP header, to grant desktop account access. Web handlers, loopback network callers with a gateway key, and sandboxed plugin frames cannot acquire the context. Account storage is under `appdir.Config()/account-private/account.json` with dedicated permissions; backup/sync explicitly serialize their own DTOs and never collect this file.

Single selected key creates one Provider with stable optional TuziSource metadata. A duplicate only locates existing data. Store failures and externally changed bytes stop the append. Account disconnect does not remove Provider data. Source associations do not authenticate a restored account.

## UI / integration ownership (AC-16)

New account UI is a built-in plugin using the existing kernel; all new CSS is under its container. Root alone edits shared registrations/navigation and its dedicated dirty-draft guard. Original page markup/style/labels stay unchanged except approved application name and added navigation/presets. Baseline screenshots use original checkout2251ca1 under fixed synthetic conditions, then the same runner compares integrated output. Existing GUI suites remain necessary; screenshots do not prove all behavior.

## 2026-11-03: update mirror source copy

The user explicitly approved changing only the two existing mirror description/tooltip references from usemagpie.ai to the configured update feed. The mirror controls, layout, styles and behavior remain unchanged. This corrects attribution for the independent distribution feed; other upstream attribution remains. Website/lines agent owns implementation and translations.

## Approved NO_PROXY system fallback correction (2026-11-03)

The user explicitly approved fixing the inherited NO_PROXY fallback defect. When no application/provider proxy is explicitly selected, a matching NO_PROXY host now takes a direct route instead of falling through to the OS proxy. Explicit application/provider choices retain precedence. The existing host/domain matching helper is reused. TestNoProxyDoesNotFallBackToSystem reproduced the failure with synthetic cached system/environment proxies; focused netproxy and GUI proxy checks passed (no-proxy-green.log); the complete Go suite and targeted race recheck now pass in full-go-02. No original page layout or text changes.

Independent review found that applying the host-only bypass before `fromEnv`
would override HTTP(S)_PROXY's existing port and leading-dot domain rules.
The correction keeps `fromEnv`'s nonnil/error result first and tests bypass
only before system fallback. The original host helper is unchanged; a pure
standard URL matcher additionally recognizes IP/CIDR bypass after an empty
environment result. The synthetic matcher proxy is never dialed or returned.
See [review and red/green evidence](no-proxy-review-account.md).

## Approved compact native account entry (2026-11-03)

The user accepted a32px account icon in the native top header and the
resulting earlier Update-label folding under the original fitTop rules.
In the measured English/Win32/125% fixture, the original header is uncompressed
at1180pt and first tight at1170pt; the32px candidate is uncompressed at1220pt
and first tight at1210pt (10pt sample steps). In the affected1180–1210pt
range, Update uses its existing arrow instead of its label. Original tabs
retain font and spacing; the centered navigation shifts left16CSS pixels
for the new32px entry. The account label remains in the sidebar and in the
translated accessible name/tooltip. The original fitTop/app.css are unchanged.

The alternative, placing the narrow-window account entry in Settings instead,
was not selected. Before approval, candidate screenshots were reviewed at
/Users/syd08/Documents/tuzi-magpie-evidence/lines/ui-targeted/header-original
and header-candidate. Legacy-nav and new-entry zoom assertions pass in both engines; full
integrated GUI verification remains pending.

## Approved Routing height repairs (2026-11-03)

The user approved “采用下一帧合并修复” and then “修复滚动条导致的高度跳动”.
The steps ResizeObserver coalesces its layout writes into the next animation
frame, avoiding the original WebKit observer loop. Its height-history key
uses outside width, so an internal scrollbar no longer discards the three
recent stories or the mode-line height history. Real width changes still
reset measurements. These are bounded behavior exceptions, with no style or
content changes; see routing-fixture-review.md for original failures, exact
geometry/screenshot comparisons and final neighboring tests (15/15 per engine).

## Approved tray focus repair (2026-11-03)

The user explicitly approved “采用托盘定位时序修复”. The reviewed candidate
in tray-lazy-summary-candidate-account.md waits for the lazy account summary
before explicit card navigation. Its five-second expiry, real wheel
cancellation and module-failure fallback remain. The account subagent now
owns implementation and final neighboring regression checks.
