# F10: read the notice before the next action

Only two tests change. `codex-auto-reset` checks whether the previous status
notice actually covers the next switch; when it does, it hovers the notice
and moves away, allowing the existing two-second leave timer to clear it.
Only then does it record the next click's unchanged-position baseline.
`warm-now` first verifies the full error, requests, position and overflow,
reads/leaves that notice, then uses the existing real-wheel `reach` helper
for the newly selected Claude button. No product behavior changes.

Original2251 WebKit reproduces the reset de420 blocked click and warm en440
button outside the viewport. Both scenarios pass with the candidate in both
engines. Earlier frozen-source traces also preserve the actual status hit.
The edits do not hide the notice, shorten its lifetime, force a click, change
the timeout, or relax any original assertion.

Complete actual source files: Chromium21/21 in81.33s; WebKit21/21 in85.31s;
zero skipped/cancelled/todo. Mutating the real reset or warm request to use
`wrong@example.com` fails each engine's original deepStrictEqual assertion
against Me@example.com or B@Example.com. All four negative controls fail with
ERR_ASSERTION, not a setup error or timeout. Root reviewed the exact diff,
manifest and complete positive/negative logs. Independent nonauthor review
is in `f10-independent-review.md` and its completed-evidence followup.

Evidence directory:
`/Users/syd08/Documents/tuzi-magpie-evidence/f13-f14-f16-diag-01/`.
Files: `f10-controls-results.json`, `f10-verify-manifest.json`,
`f10-verify-results.json`, `f10-full-{chromium,webkit}.log` and four
`f10-negative-*.log` files. Product app hash and both test hashes match the
manifest. Engine batches were serialized with private HOME/TMPDIR and
synthetic responses. This closes F10 only; frozen full-suite failures remain
recorded, with other unresolved items in `closing-blockers.md`.
