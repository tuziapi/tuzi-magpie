# F08/F15 independent candidate review

Reviewer: website agent, not the implementer. Reviewed 2026-11-04 without
running browsers or editing product files. These are external proposals,
not approved or integrated product behavior. Evidence directory:
`/Users/syd08/Documents/tuzi-magpie-evidence/gui-f08-f15-candidates/`.
Base snapshot is root HEAD `1bd36fa966ae0e91475915123c341e6a7f2d3165`.

## Actual diff and scope

F08 changes only the agent-model popup's scroll handler, plus shortening
one existing Hide/show-all explanation without changing that operation.
It ignores a scroll only when the event target is that same agent row's
summary `.mi` and all four current anchor edges exactly equal the original
popup placement rectangle. Other events retain the original `scrollCloses`
predicate. No shared predicate, geometry tolerance, global CSS or public
interaction is changed. A one-pixel anchor move fails this equality guard.

`holdAgentModels` can replace the anchor reference after redraw. The handler
uses that current reference and compares its rectangle with the original
placement rectangle, so moving a replacement anchor does not grant a new
exception. The existing close function still removes the same document
scroll, mousedown and keydown callbacks and window resize callback.
There is no new listener or timer. No blocking static defect found.

F15 extracts the existing ResizeObserver's coalesced next-frame layout into
`stageSoon` and also calls it after a direct account-list row's `rthit`
animation ends. It does not schedule layout for child animations, other
animation names, starts, or every animation frame. The single `stageAsked`
flag coalesces simultaneous requests and resets before `layout()`, as before.
The new listener belongs to the existing persistent stage; no global
listener or new remount lifecycle is introduced.

On the real request path, `rerun(row.li, "hit", "rthit")` installs a row
animationend listener which removes `.hit`. That listener runs before the
event bubbles to the stage, and the new layout runs in the next frame.
`layout()` retains its zero-width early return and existing read-before-write
ordering and virtual-row handling. No blocking static defect found.

## Size and identity

Independently recalculated the exact budget algorithm over the frozen
index.html script list: twelve non-plugin, non-i18n scripts. Base core is
1,533,648 bytes; F08 candidate core is 1,533,735, leaving **67 bytes** under
1,533,802. Candidate app.js is 1,312,061, leaving 4,813 under 1,316,874.
F15 is a plugin script excluded from that core budget. This is static byte
arithmetic, not a claim that the Go budget test has run on final integration.

- F08 candidate SHA-256:
  `686a12538c944b9420d9fce5d687c98a6e5fb44b42ccd983718b6f24103abeb1`
- F15 candidate SHA-256:
  `e5dd3f5085eae5e8f6eefaf2df3eed54ffda5b35681b217334946dcc9821be35`

## First evidence batch

Read all nine result records and relevant actual failure logs. All have
zero skipped/cancelled tests. F08 old and candidate both pass their one
WebKit case, so that pair alone is not old-red/new-green proof. The old
observer records summary-icon scrolls before a popup exists; the candidate
records a trusted icon scroll with an open popup and unchanged anchor/menu
rectangles. Added observation/settling changes timing and must be disclosed.

The ZCode sibling passes but records no icon scroll. The one-pixel control
passes after changing anchor geometry and dispatching an explicit synthetic
scroll; it proves the geometry guard boundary, not a natural user trigger.
The disabled model-item negative fails the original exact summary assertion:
actual `All 4 models`, expected `Showing 3 / 4 models`. It is not a timeout.

The first real-view-scroll control fails the exact popup-close assertion.
It waits for changed scrollTop, which does not itself establish native scroll
event delivery. Treat this as unresolved evidence, not a passed boundary or
a proven candidate regression. The second batch's first old-asset run stops
earlier during a DeepSeek Pro click after the menu detaches; it has not yet
established the wheel boundary either.

F15 old WebKit fails the existing missing-wire-at-foot assertion for
`solpool2#k299`; the candidate passes. Deliberately offsetting the wire by
four pixels fails that same original assertion. These are relevant geometry
controls, but the first batch is WebKit only.

## Pending evidence and interpretation

The UI owner is investigating the second batch. No final all-pass finding
is issued at this snapshot. Controlled icon scripts change real `.mi`
scrollLeft through page evaluation and then receive browser-generated scroll
events. `isTrusted` distinguishes them from dispatchEvent, but does not turn
that programmatic trigger into a naturally occurring user action.

The F15 boundary script directly adds `.hit` to real rows rather than taking
the real `rerun` path. Unless those rows already have rerun's cleanup handler,
this does not test `.hit` removal at animation end and its associated
content-visibility transition. It can establish native event delivery,
coalescing, restart/cancel behavior and idle scheduling; combine it with the
actual request-path many-keys test rather than claiming it covers the entire
runtime path on its own.

Before a verified-ready conclusion: inspect the final native-scroll boundary
evidence, same-trigger F08 old/candidate result, F15 second-engine and
animation lifecycle results, and the finite affected test coverage agreed
by root. Product behavior approval and final integration budget/hash checks
remain separate gates. No whole-suite rerun is requested by this review.

## F15 subset evidence review

Read all four completed `f15-subset-results.json` records and their actual
logs, the updated subset manifest and both boundary JSON files. Candidate
Chromium many-keys passes (1/1), retaining the real request/rerun path.
The intentionally offset wire run exits 1, but stops at the earlier
`2 keys in sight at the foot` assertion (requires more than five), before
the exact wire assertion. Its diagnostics show one unwired row, but this
run must not be described as the target wire assertion rejecting the
mutation. WebKit's first-batch negative did reach that target assertion.

Both engine boundary cases pass (1/1 each): two simultaneous native row
endings ask twice but run layout once; rewind yields one final ending and
one layout; a removed row generates animationcancel and no hit-triggered
layout (the pre-existing ResizeObserver still requests its normal layout).
Twelve idle frames add no requests. The updated manifest explicitly scopes
this as stage scheduling, with real rerun cleanup covered separately by
the many-keys cases. This resolves the previously described interpretation
gap without pretending the direct-class boundary alone covers rerun.
