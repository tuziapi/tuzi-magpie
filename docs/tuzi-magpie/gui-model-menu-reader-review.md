# F08: read the model picker after its panel opens

Owner: UI subagent, branch `codex/tuzi-menu-routing-diagnostics`.
Only the two original tests `agent-menu-label.test.cjs` and
`zcode-models.test.cjs` change. The product and shared reader helper do not.

## Evidence

Evidence directory:
`/Users/syd08/Documents/tuzi-magpie-evidence/gui-menu-routing-diagnostics/`.
The original and frozen relevant menu/panel/scroll source is unchanged.
The initial instrumented single cases, and lower-overhead variants, passed;
those green reruns do not prove the original failures fixed. Their logs remain.

The bounded controlled copies extend only the existing `.ag-open` grid
transition to two seconds. They keep its trajectory, final geometry, other
animations, all clicks, assertions and timeouts. In both baseline and frozen
assets, both original selected WebKit panel cases then fail at the original
model-item click: it is unstable, then detached. The trace records Playwright
scrolling the clipped `.ag-in` body to 28px before opening the picker. As the
grid keeps expanding, its scrollTop falls. That non-view scroll is classified
by `scrollCloses` as a close, and the actual closeAgentModels stack comes from
the menu's scroll listener. Neither purposeUntil nor guardUntil is set. This is
not a save/re-render race: the selected menu save path updates the button in
place, without replacing the row.

The candidate keeps the existing height>0 readiness assertion and then waits
for finite motion through the existing `reader.settled(page)`, before clicking
the picker. It neither disables animation nor forces a click, and it keeps all
selected-model, posted-hidden-list, open-menu, no-scroll and pageerror assertions.

## Validation

The first candidate is **not sufficient and is not committed**.
`models-validation-results.json` preserves all results:
- Chromium: both selected two-second-motion cases pass; full original two files
  20/20 pass, exit 0, 49.794s.
- WebKit: the selected cases still fail later (after the first pick), and full
  original two files are 14/20, six failures, exit 1, 72.486s; hash
  `019d4176a20d64f7aaeded48b6a7be3464ecaa77021768eea3f59164bd394b46`.
- Explicit closeAgentModels after the first saved ZCode pick fails the unchanged
  open-menu count in both engines.
- The attempted label negative (the synthetic server ignores hidden values) is
  invalid: save updates the local count optimistically and does not use that
  response. Its Chromium pass and unrelated WebKit click failure are retained;
  they are not claimed as successful sensitivity evidence.

`trace-followup.py` subsequently ran exactly four cases. The label test still
fails and ZCode passes. The native scroll target which actually closes the
label test's menu is `SPAN.mi`, the summary icon clip, not the view or ag-in.
At 3591ms its vertical scrollTop is 0 and client/scrollHeight both 18; both
view and ag-in also remain at scrollTop 0. The actual menu scroll listener
calls closeAgentModels. Horizontal position and the anchor/menu before/after
geometry are the next required proof; no decorative scroll is being filtered
unconditionally.

The external-only F08 candidate is based on root 1bd36fa's approved F14 source.
It considers only the exact summary icon clip in the anchor's own row, and
returns without closing only when all four anchor edges exactly equal those
captured when the menu opened. It must still close after a real 1px anchor
move or a real view wheel. It changes no global scroll classifier, styles,
menus in other views, or animations. A nearby redundant explanation is
compressed to retain the existing core byte budget (net +87 bytes).

Candidate assets, diffs, provenance, geometric observer and single-case controls
are external at
`/Users/syd08/Documents/tuzi-magpie-evidence/gui-f08-f15-candidates/`.
They remain external to product source. The completed controls and subsequent
complete-file checks are recorded below; no user approval is presumed.
No new full-suite run: the frozen 1135-file red result remains the full result.

## F15 trace finding (separate unresolved failure)

`followup-traces-results.json` preserves the four bounded results and cleanup.
The WebKit wire case still fails its original exact unwired list assertion.
At 8470ms placeSoon → layout writes the last key's wire at x=620.207 while
rthit runs. At 8850ms rthit ends. At 9190ms the one-second timer → sync →
rebuild → layout resets the wire to x=625. Thus a real stale endpoint lasts
340ms after the shake has finished; delaying the test is not a repair.
The external F15 candidate reuses the existing stageAsked frame coalescing
on actual rthit animationend from a row still directly in the stage's list.
It leaves the generic animation restart function alone. Multiple endings,
restart, removal and idle-frame behavior need separate bounded checks.

The Chromium diagnostic passes after eight wheels with seven rows at the
foot. Its observed wheel ancestors contain no nested scroller. The original
two-row failure remains unexplained and unresolved.

## External candidate checks (2026-11-04, still unapproved)

The external candidate README and source-manifest now record completed bounded
controls and exact remaining gaps. F08 WebKit current/upstream native clip-scroll
controls reproduce the same unchanged geometry and closure; candidate preserves
the menu. Focused old/candidate native view wheels both move scrollTop 0→160 and
close through the original scroll classifier. A real 1px anchor change remains
a close, and disabling the actual item handler fails the original label assertion.
The initial menu screenshots compare exactly, with zero changed pixels.

F15 candidate original single cases pass both engines. WebKit's real +4px foot
wire and Chromium's real +4px initially visible wire fail their original wire
assertions. Chromium's earlier foot-wire negative instead fails at two visible
rows, so it remains invalid as wire sensitivity evidence and the separate
visibility issue stays open. Both engines' native CSS-event scheduling boundaries
pass with one frame for simultaneous endings and no further work in 12 idle
frames; these isolate the stage listener, while actual rerun behavior is covered
by the original many-keys cases. No product source was applied. Full affected-file
validation and approval remain outstanding.

## Complete-file and static visual closure of external candidates

`four-jobs-manifest.json` fixes four jobs and their input hashes.
F08's two complete files with the settled precondition pass Chromium20/20
(49.579s, log SHA 9764633ede84307b79cdc6c27109fd9e6ab8d9f7c9c5f8733705c74a12108f26)
and WebKit20/20 (48.833s, SHA
21cd209fcffd8e9229cbbdfec6f17116fbc1741fc4c96eae7706922a45e8f1e5).
Both have zero skipped/cancelled/todo. Removing only the external asset/reader
path overrides makes these files exactly equal to the complete test candidates.

F15's old/candidate resting folded and opened screenshots are pixel-identical at
1200×800; their 5 and 41 node geometry/transform records match exactly. Folded
image SHA is 09364b071d29a8cef37961b5f8f1ad6c774bc69913c84bcd2fa17d380d5b20a9;
opened SHA c3756d9333cdb00ae5bdd2b848b2b4a37f529082e6c80a8824151aeff677cdaf.
Date data was fixed for this synthetic visual fixture, with real timers and
animations running. No animation was disabled. Candidate screenshots were also
visually inspected. The four jobs cleaned their private roots; the browser queue
was released. Product authorization, integration checks and the independent
Chromium two-visible-row investigation remain outstanding.


## Approved integration — 2026-11-04

Both product proposals were explicitly approved. Main integrated F08 as
86fd638 with test preconditions791801d, and F15 as775d699. Root cmp verified
both product files are exactly the tested external candidates; node syntax
and git diff checks pass. F08 is closed by complete20/20-per-engine evidence.
The F15 Chromium visible-row issue remains independent and open. The user
also authorized necessary decisions within this finite closing scope without
further per-item questions; this does not lower acceptance or widen scope.
