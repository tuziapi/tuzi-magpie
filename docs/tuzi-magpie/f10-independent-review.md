# F10 independent static review

Reviewed 2026-11-03 by the website agent, not the implementer. Actual root
HEAD `1bd36fa966ae0e91475915123c341e6a7f2d3165` plus its two pending test edits.
Read-only review; no F10 browser run performed by this reviewer. No blocking
static finding. Full candidate and negative-control execution remains pending
at this review snapshot, so this is not F10 closure evidence.

## Diff and runtime path

Only `codex-auto-reset.test.cjs` and `warm-now.test.cjs` change. No product,
shared helper, expected value, timeout or existing assertion is modified.

`status()` in the actual product assigns the message and its title, sets its
role, and raises a long/over-dialog message. It schedules expiry for the larger
of the normal duration and the message's reading time. Its `mouseenter`
cancels expiry; `mouseleave` starts the ordinary 2000 ms expiry. Both tests'
new hover, pointer leave and empty-text wait exercise that public interaction.
They do not call `status("")`, edit style/text, disable hit testing or force a
click through the notice.

In reset, the addition first checks the switch's center hit target. It waits
for notice dismissal only when that target belongs to `#status`. The click
and scroll-position baseline is captured afterwards. Exact posted body,
checked state, on class, new status text and unchanged click position are
still checked after the operation. Reading an obstructing prior notice is
therefore outside the subsequent click's baseline, while its new message is
still checked.

In warm, the test still verifies the full vendor reason, status inclusion,
exact selected-account requests, re-enabled button, original no-movement
bound and sideways overflow before dismissing the prior notice. After the
Claude tab is selected it uses the existing `reach` helper, which wheels until
the new button is wholly in its view and clear at its click point. It then
retains the original one-account request and count, no native select and no
page-error assertions. The new wheel does not move the earlier Codex click's
baseline or remove that guard.

## Existing controls and prepared verification

Read `f10-controls-results.json`, the corresponding six logs, original
fixtures and `f10-verify-run.py` under
`/Users/syd08/Documents/tuzi-magpie-evidence/f13-f14-f16-diag-01/`.

- Original WebKit warm en/440 fails clicking the Claude button, outside the
  viewport. Candidate en/440 completes in both engines.
- Original WebKit reset de/420 fails clicking the second account's switch
  because the long `#status` intercepts it. Candidate de/420 completes in
  both engines.
- Each candidate control has one result, exit 0, no cancellation or skip.
  External candidate copies differ from actual pending tests only in path
  relocation, formatting and comments; final-control copies differ only in
  assets/helper paths.
- Prepared reset negative assets substitute `wrong@example.com` in the
  settings request. Prepared warm negative assets substitute it in the
  warm-now request. The original exact-body/selected-account assertions
  remain and should reject these deliberate mistakes.
- The prepared script serializes both negatives and both complete source
  files in Chromium then WebKit, with temporary HOME/TMPDIR, pinned browser
  locations and explicit `--test-concurrency=1`. It records source/app hashes
  and actual process results and opens each new log exclusively.

The script has not been run at this review snapshot. Its predicted negative
failures and full-file passes must be checked against actual logs before
closing F10; this review does not claim them.

## Reviewed hashes

- `internal/gui/tests/codex-auto-reset.test.cjs`: `8bca4648b6a7b2e5690667b2138e12ba52840199bc184fccafeaf8cf219861c8`
- `internal/gui/tests/warm-now.test.cjs`: `ef43b200f196b6612831266cb8a928d0def724508df49f520254b0a9dac13602`
