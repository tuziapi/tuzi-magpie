# F01: proposed local text sampling repairs

Candidate prepared, 2026-11-03, following the parent's approval of this
proposal. Exactly the 17 assigned test files are edited; no product or shared
helper is changed. Browser controls have run in the assigned exclusive slot;
Go tests and builds are not part of this test-only candidate.
The assigned scope is F01 in the root's `closing-blockers.md`.

Checkout `/Users/syd08/Documents/tuzi-magpie-lines`, branch
`codex/tuzi-webkit-text-sampling`, starts at
`c7238e14891f917b67d80209857d3d1db4cb4c42`.
All 17 tests are byte-identical to `2251ca1`. This does not waive their failures.
The inventory at
`/Users/syd08/Documents/tuzi-magpie-evidence/gui-final-c7238e14891f-c4/failure-inventory.json`
has 104 failed results for these files, including parent results, at 18 distinct
assertion lines. Those are failure observations, not 104 independent causes.

## Evidence and boundaries

The observed differences are leading/trailing rendered newlines or spaces;
the expected visible words and numbers match in the displayed failures.
Precise character capture and representative old-source browser proof remain
to be done when the parent assigns the browser slot. A visual-content defect
must not be normalized away.

The full agent model-list implementation block, `scrollCloses`, global CSS,
search settings, Usage plugin, plugin page renderer, context renderer and
Gateway body renderer are unchanged from the original. New Tuzi markup and
page registration exist; source equality alone does not prove runtime
equivalence. Agent panel menu detachment belongs to F08, outside this plan.

Proposed sampling checks the actual text node that labels the control and
asserts that node is visible, then compares its exact text. It does not replace
all `innerText`, normalize interior whitespace, remove arbitrary substrings,
or install a shared global trim helper. Existing state, geometry, request,
error, persistence, copy and localization assertions remain.

## Per-file candidate

All paths below are under `internal/gui/tests/`; line numbers are at c7238e1.

| File | Inventory line(s) and observed difference | Minimal proposed sampling |
| --- | --- | --- |
| `agent-models-all-hidden.test.cjs` | 129, ` DeepSeek 3 ` | Read the visible direct name span and `.n` count span of `.ag-chip`, join with one intentional separator, keep the exact `DeepSeek 3` expectation. |
| `agent-models-only-picked.test.cjs` | 118, surrounding newlines | Check visible `.am-only > span` and exact text; retain switch role/state and geometry checks. |
| `agent-models-own-served.test.cjs` | 130, surrounding newlines | Check visible `.am-own > span` and exact text; keep served/own-model and POST assertions. |
| `agent-models-own.test.cjs` | 137, surrounding newlines | Same leaf-label sampling, preserving role/state/picker tests. |
| `agent-models.test.cjs` | 100, trailing spaces in chip array | Change only local `chips()` sampling to the same visible direct name/count spans; preserve order, exact words and numbers at all its call sites. |
| `copilot-signed-out-account.test.cjs` | 92, `Signed out` plus newline | `.key` contains authored plain text. Check visible pill and exact `textContent`; use the same value for positive and negative signed-out cases. |
| `json-tree.test.cjs` | 231, `not json` plus newline | Check the visible raw `pre > code` then compare its exact `textContent` to `not json`. No trim, JSON parse, or newline deletion for this raw-body assertion. |
| `plugin-release.test.cjs` | 95, moved chip trailing newline | Read visible `.pm-chip.moved > span:not(.dot)` exactly. Apply the same sampling to its second multi-provider moved-chip assertion at 100. Keep dot/title checks. |
| `request-archive.test.cjs` | 140, switch trailing newline | Read visible `.led-arch-name` exactly; retain switch role, state, title, POST/error/secret checks. |
| `revoked-signin-account.test.cjs` | 90, signed-out pill newline | Same plain visible pill strategy as Copilot, preserving the not-signed-out cases. |
| `routing-context-fold.test.cjs` | 125, fold trailing newline | Read visible `.ctx-fold .ctx-title` exactly. Keep aria-expanded, short summary and fold geometry. |
| `search-api.test.cjs` | 139, vendor trailing newline | Read visible `button.search-vendor > span` exactly here and at the later same-control Brave assertion (159). No change to secret body/copy values. |
| `searcher-pick.test.cjs` | 188/357, picker trailing newline | Read visible `button.searcher-pick > span` exactly. This same control's later exact equality waits (232/239/252/265/272/298) must query that span and require it visible, as must its later direct exact comparisons; unrelated help text stays unchanged. |
| `sessions-empty-range.test.cjs` | 43, filter trailing newline | Read visible `#sessAgent > span` exactly; preserve selected range/filter and history checks. |
| `settings-general.test.cjs` | 121, language trailing newline | Read visible `#langPick > span` exactly; preserve fit geometry, choices and language-change checks. |
| `side-effort.test.cjs` | 108, effort trailing newline | Read visible direct text span of the effort chip; update only the same chip's later equality waits (130/138) to that visible label. Preserve role/menu/choice/persistence checks. |
| `usage-no-reading.test.cjs` | 80, count trailing newline | In local `windows()`, retain `.quota` order/track state and assert each `.quota-n` and its direct text spans visible before reading exact authored span text. Preserve the existing literal separator text between spans, so count/share formatting is not invented. Keep the anchored count regexes and unknown/no-percentage checks. |

For text leaves, prefer exact `textContent` with explicit visibility over
assuming `innerText` is engine-neutral. If the DOM contains additional actual
visible text outside the specified leaf, investigate rather than ignoring it.
For chips, retain visibility and identity/count of the actual label spans.
For the plain pills, the existing renderer appends a single authored text node;
there is no intended hidden alternate label to include.

## Controlled evidence and negative checks

After browser ownership is granted, capture the failing sample's `innerText`,
`textContent`, JSON-escaped strings/code points, DOM children, visible bounds
and display/visibility on both c723 and the untouched original assets for the
same representative fixture. Keep the original failed run immutable.

Test-only diagnostic derivatives outside the repository should mutate the
rendered target just before each repaired sample:

1. Replace one actual word or digit in the sampled label with wrong text.
   The same exact-content assertion must fail. For chips, exercise provider
   name and count; for quotas, change 5000 to 5001 and retain anchored regexes.
2. Hide the actual text-bearing node with `display:none`, leaving its correct
   DOM text intact. The visibility assertion must fail; exact textContent
   alone is insufficient. Cover a direct span, plain pill, composite chip,
   quota label and raw-body code; each repaired sampling shape needs proof.
3. For the raw-body case, supply leading/trailing spaces and newlines as real
   fixture content and assert the exact bytes survive. A derivative that
   removes or appends a real character must fail. Do not reuse the existing
   formatted-tree helper that removes one final newline for this assertion.
4. Keep JSON tree folding, SSE folded output and clipboard assertions as they
   are. If later execution reveals another failure there, inspect its exact
   rendered/raw contract instead of extending label normalization to it.

Run the 17 affected files with all their existing scenarios in both engines,
serially within the parent's single-browser queue, after the representative
old-source/negative proofs. Record any newly reached failure instead of
assuming every later assertion is covered by the first text fix. This is
targeted repair evidence, not a replacement claim of full-suite green.

## Candidate status

The 17-file diff is prepared locally: 113 insertions, 33 deletions. The authored
name spans of agent chips, searcher choices and effort choices are selected by
`:scope > span:not([class])` (or the corresponding direct-child selector).
`el` leaves these name spans without a class; `icon`, `stackIcon` and
`effortIcon` have classes, so their spans are excluded. Switch labels, language
labels and vendor labels have a single direct text span. Waits use exact leaf
`textContent`, nonzero bounds and computed visibility.

Static checks: `node --check` passed for all 17 files; `git diff --check` passed.
Actual diff self-review confirmed original expected values, geometry, control
state, requests, persistence, copy and later unrelated assertions stay in place.
The static checks alone do not close F01; browser results follow below.

External control preparation:
`/Users/syd08/Documents/tuzi-magpie-evidence/f01-text-sampling-01/prepare-controls.py`
produced 30 syntax-checked diagnostics listed in `controls-manifest.json` beside
it. They cover five representative shapes (language leaf, signed-out pill,
agent chip, quota count and raw body), wrong text, hidden labels, chip name and
count separately, and raw leading/trailing whitespace. The raw whitespace
positive comes from changed synthetic response fixture bytes, not insertion
into rendered DOM. Strip and append variants must fail exact comparison.
These derivative tests end after the target assertion and narrow their locale
and viewport; they are target-only evidence, never substitutes for running
all scenarios in all 17 changed files. Each captures escaped `innerText` and
`textContent`, code points, HTML, bounds and computed visibility before the
controlled mutation. Old-sampling variants use either current c723 assets or
an extracted `2251ca1` asset snapshot. No browser was launched during preparation; execution followed
only after the parent explicitly assigned the browser slot.

Candidate diff was reviewed by the parent before browser execution. The
parent assigned F01 the exclusive browser slot after its own short diagnostic.
The 16 files whose complete scenarios passed both engines are separated from
the side-effort candidate, which has an unresolved later symptom below.

## Representative runtime evidence

External evidence root:
`/Users/syd08/Documents/tuzi-magpie-evidence/f01-text-sampling-01/`.
`control-results.json`, `quota-de390-results.json` and `control-summary.json`
record 70 process invocations: 32 negative controls all reached their target
and failed an assertion, 14 candidate target-only runs passed, and 24 old
sampling observations completed. No invocation timed out. Each log preserves
actual OS exit status and source/variant identity through its manifest.

The first quota control used en/900px and old sampling passed. That observation
is retained. The full-suite failure named de/390px, so a supplemental set uses
that exact locale/width: old WebKit sampling fails for both asset revisions,
the candidate passes, and wrong/hidden controls fail. Chromium's old sampling
passes all these representatives. That engine difference is expected evidence,
not a reason to waive WebKit's failures.

`old-samples.json` preserves the before-assertion sample and computed geometry.
Both c7238e1 and original 2251ca1 assets show the same WebKit sample:

| Shape | Old rendered `innerText` | Authored `textContent` |
| --- | --- | --- |
| Language label | `English\n` | `English` |
| Signed-out pill | `Signed out\n` | `Signed out` |
| Agent chip | `\nDeepSeek\n3\n` | `DeepSeek3` (two distinct visible spans) |
| Quota de/390 | `0 / 5000\n` | `0 / 5000` |
| Raw response | `not json\n` | `not json` |

The raw-whitespace fixture is the actual response string ` \nnot json\n `.
Both engines preserve its exact bytes; derivatives stripping whitespace or
appending `!` fail the same strict equality. Hiding the correct text fails
visibility, while wrong text/count fails exact content. No product rendering,
expected label, geometry criterion, API fixture or shared helper was changed
in the candidate to obtain these results.

`run-targeted.py` runs the full existing scenarios in all 17 changed files,
Chromium then WebKit with `--test-concurrency=1`, under a temporary HOME with
pinned Playwright locations. `targeted-manifest.json` records source HEAD,
uncommitted test SHA-256 hashes, commands, PIDs, durations and actual exits.
The full targeted run finished; results are recorded below. No full repository
GUI rerun is authorized or attempted here.

## Full targeted result and remaining boundary

`targeted-summary.json` records the actual complete batch results:

| Engine | Tests | Passed | Failed | OS exit | Duration |
| --- | ---: | ---: | ---: | ---: | ---: |
| Chromium | 155 | 154 | 1 | 1 | 345.36 s |
| WebKit | 155 | 155 | 0 | 0 | 339.48 s |

Neither engine cancelled or skipped a test. All 17 candidate file hashes were
checked against the manifest after the run and remained unchanged. The 16
files other than `side-effort.test.cjs` passed all 150 results in each engine.
They are ready for parent integration; this does not claim the 17-file batch
or the full repository suite is green.

The remaining failure is Chromium's Japanese `side-effort.test.cjs` case.
The unchanged settings refresh after the chip interactions (candidate line
166, frozen/original line 155) raises `Execution context was destroyed, most
likely because of a navigation` from `page.evaluate`. Its original expected
text, geometry and persistence checks remain unchanged. This is a newly
reached symptom within the already assigned file, not a waived flake. The
complete WebKit case passed. The original test and `reader.cjs` are
byte-identical between 2251ca1 and c7238e1. Static tracing of `savePrefs`,
`applyPrefs` and `renderSettings` found no navigation there; the known app
location writes belong to agent import and update reload paths, which this
fixture does not invoke. That inspection does not establish why the context
was destroyed.

Four external Japanese diagnostic derivatives are recorded in
`side-effort-diagnostic-manifest.json`: original or candidate test against
current or original assets, keeping both original widths. They log navigation
requests, main-frame changes, CDP context events, clicks and goto/evaluate
stages without swallowing errors. No retry, delay or product fix was added.
The parent subsequently assigned a bounded slot for these four cases; results
follow below. There will be no automatic repeat of the entire 17-file batch.

Cleanup: the target runner completed, its recorded Node children 2333 and 3858
are gone, and temporary HOME directories for both control and targeted runs
are absent (`cleanup.json`). The exclusive browser queue was explicitly
released to the parent. No process, port or real account configuration remains
owned by this work. F01 stays open until the side-effort symptom is resolved.

## Side-effort bounded navigation diagnostic

The parent explicitly assigned the next exclusive browser slot for the four
prepared Japanese Chromium cases. `run-side-effort-diagnostic.py` executed
exactly those cases once, retaining both original widths; results are in
`side-effort-diagnostic-results.json` and the four `side-effort-ja-*.log` files.

| Test sampling | Assets | OS exit | Duration |
| --- | --- | ---: | ---: |
| Frozen/original | c7238e1 | 0 | 5.17 s |
| Frozen/original | 2251ca1 | 0 | 3.99 s |
| Candidate | c7238e1 | 0 | 4.01 s |
| Candidate | 2251ca1 | 0 | 4.03 s |

Each case recorded only its three explicit `page.goto` calls and matching
main-frame navigation requests and lifecycle events. The settings refresh at
1100px and at 420px completed in every case. No unexpected navigation, crash
or failed evaluate appeared. These instrumented cases did **not** reproduce
or explain the first uninstrumented Chromium failure; instrumentation and
isolation may affect timing, so their green status does not close the symptom.
No random rerun, catch/retry, product change or speculative delay was added.

All four child Node PIDs exited and the private temporary HOME was removed,
recorded in `side-effort-diagnostic-cleanup.json`. The browser queue was
explicitly released to the parent for account's F05/F11 work. The side-effort
candidate remains the sole uncommitted test change, with its original failed
batch evidence preserved. Further diagnosis requires a separately allocated
slot and a concrete hypothesis; no additional browser run is queued here.
