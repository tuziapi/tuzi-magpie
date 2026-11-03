# F09/F12: establish the reader's position before measuring

Owner: UI subagent, branch `codex/tuzi-menu-routing-diagnostics`, base c7238e1.
Scope: only `routing-rules-line.test.cjs`, `group-found-skip.test.cjs` and this
record. No product source, shared reader helper, animation, timeout, threshold,
request or pageerror assertion is changed.

## Causal observations

External evidence is under
`/Users/syd08/Documents/tuzi-magpie-evidence/gui-menu-routing-diagnostics/`.
Both tests and their relevant product menu/scroll code match original 2251ca1.
The original and frozen assets reproduce the same failures in the selected
WebKit cases. `diagnostic-results.json` retains exact commands, private-environment
cleanup, TAP totals and hashes; the corresponding JSON traces retain event,
geometry, active element and actual close-call evidence.

F09 English 1100px opens the second group editor and reads its controls while
its finite expansion animation is still running. The raw coordinate helper
opens the condition menu while the view continues changing. The trace records
view scroll 303→307→305; `scrollCloses` initially returns false, then returns
true as the view's continued motion is classified as the reader's, closing the
menu during Playwright's item-stability wait. The candidate uses the existing
`reader.settled(page)` before the original reach helper measures the control.
It waits for finite animations to end, without cancelling or shortening them.
The original real wheel and coordinate click remain. A trial replacing the
helper wholesale with reader.reach was discarded: that helper moves the mouse
off a hover-only remove button. Its failed diagnostic logs are preserved and
are not claimed as product failures or successful validation.

F12 German 390px starts with the button at y=870..914 in a 900px window.
Programmatic scrollIntoView first moves the view 0→296, then the app's documented
scroll guard returns it to 0 before the original baseline. The button remains
partly outside the viewport. A later locator click scrolls it back to 296.
The candidate uses the existing `reader.reach` with real wheel input to put the
whole button in clear sight before taking the original scroll baseline. Both
exact skip POST bodies and the final exact no-scroll assertion remain.

## Controls and bounded checks

`reader-candidates-results.json` retains the discarded broad-reader experiment
and the successful F12 single cases. `reader-validation-results.json` retains
the final candidate controls and full-file runs.

- F09 original/frozen WebKit single cases fail at the condition-item click;
  final candidate passes that entire case in both engines. Removing only the
  image condition item's real onclick handler in an external copy fails the
  original exact condition-list assertion (images is missing), in both engines.
- F12 original/frozen WebKit cases fail at original zero-scroll comparison;
  candidate passes the same case in both engines. Moving the real view exactly
  one pixel inside the final sample in an external copy fails that unchanged
  comparison in both engines. The control checks the pixel really moved.
- No negative control changes production files; no error is suppressed. All
  runs use explicit minimal environment, private HOME/XDG/TMP, pinned Node and
  cached Playwright, all requests handled by synthetic fixtures.
- The full 1135-file result is still the frozen red result. These local checks
  do not constitute a new complete-suite green run.

## Full-file results

Chromium completed
20/20 (all original cases of both files), exit 0, no fail/cancel/skip/todo,
188.416s, log SHA-256
`865f05a628fc34e4b6f1cf524f4f1febd50a25f43f43e35d46209008c64505a5`.

WebKit completed 20/20, exit 0, no fail/cancel/skip/todo, 195.865s,
log SHA-256
`fb0ba747f8e8f0a768f7e85bcca5d5da1791cf3a697d5c45298c6d17090845b1`.
Both full-file runs cleaned their private environment roots.
