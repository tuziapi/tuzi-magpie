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
