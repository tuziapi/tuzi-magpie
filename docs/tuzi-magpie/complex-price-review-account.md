# Complex catalog pricing acceptance review

AC-07 review at integration `15ff5d9` found that the desktop retained public
task pricing DTOs but displayed their scalar base price as a complete price.
Worktree `/Users/syd08/Documents/tuzi-magpie-account`, branch
`codex/tuzi-magpie-complex-prices`, is based on that integration commit.

Read-only references establish the real shapes:

- `/Users/syd08/Documents/tuzi/tuzi-api/model/pricing.go`: `Pricing`,
  `ConditionalTaskPricing`, `ConditionalTaskPricingDetails`,
  `TaskPerSecondPricing`, `PerCallVariant` and their builders. Task builders
  set `PricingUnavailable=false`; `buildTaskPerSecondPricingFromSnapshot`
  supplies resolution variants, while the public `ModelPrice` is the first
  variant's converted price. MiniMax-H3 has 768P and 2K variants at different
  CNY prices, so one USD per-second number cannot describe the whole plan.
- `/Users/syd08/Documents/tuzi-switch/src/components/account/ModelsPage.tsx`
  already distinguishes task-condition/per-second structures as complex.
- `internal/tuziaccount/projection.go` preserves these structures through
  `priceDetail`; `pricingMeta` carries scalar group overrides, with no contract
  that an override removes task conditions or variants.

The fix is restricted to `plugins/tuzi/money.js`. A recursive nonempty check
recognizes the four projected task structure fields. Both `catalogPrices`
and the final `groupPrices` tier branch refuse a partial flat projection,
including when a linear expression or final scalar group override coexists.
The unchanged `client.js` displays its existing website fallback for empty
tiers and retains the fixed full-pricing website button. No original Magpie
page, style, money conversion or ordinary pricing behavior changes.

Null, absent and recursively empty structures retain ordinary prices. Numeric
zero is still a real value: an ordinary explicit zero price remains valid,
while zero-valued condition fields still identify a complex structure. The
desktop does not execute billing formulas or infer a personal final charge.

## Verification

`internal/gui/tests/tuzi-money.test.cjs` adds four tests using the public DTO
shapes: conditional task price, conditional task details, per-second resolution
variants, and per-call variants. Each checks direct and group projections,
expression coexistence and a final group override. An additional case checks
empty structures and zero semantics. Existing decimal, group-discount and
linear-expression tests remain.

- Old production code: four new task tests genuinely failed with a displayed
  base price (`1 !== 0`), while the other four tests passed.
- Final code: 8/8 passed in 44.984ms with `node --test
  internal/gui/tests/tuzi-money.test.cjs`.
- `git diff --check` passed.
- Logs: `/Users/syd08/Documents/tuzi-magpie-evidence/complex-prices-01/`,
  `old-code-red.log`, `fixed-green.log`, and final `final-green.log`.

The parent independently inspected the guard and the existing DOM fallback.
This pure projection change used Node tests; no browser, Go build, service,
credential, inference, listener or persistent process was started. Final
integrated GUI verification remains with the parent's queued suite.

## Other acceptance coverage checked

The same read-only pass followed AC-01–16's implementation/evidence mapping,
with deeper source/test checks on AC-05–09 and AC-11. No additional new omission
was confirmed. In particular:

- Key limits and sparse PATCH fields are implemented; an unknown remote write
  persists its gate before sending, cannot replay after restart, requires
  readback, and requires separate human acknowledgment. Create readback is
  explicitly evidence for review, not a claim that a name identifies a write.
- Daily boundaries use browser-local midnight and a named timezone; amount
  conversion uses decimal integers; refund totals remain separate. Unknown
  log availability is not turned into confirmed zero consumption.
- Performance batches preserve omitted groups versus explicit empty arrays;
  the UI's All selection omits groups. Missing samples and TTFT stay unknown.
- Provider provenance deduplicates origin/user/token ID and preserves later
  user edits. Preparation-time external changes and malformed files stop save.
  The already documented final comparison-to-rename race against an unrelated
  noncooperating writer is not an atomic global CAS; existing tests do not
  establish such a guarantee. This pass does not reclassify that limitation
  as a newly discovered fix or claim it is eliminated.
- Tuzi image tests exercise the existing gateway/MCP generation, edit, pending
  job, generation-result, refusal, returned bytes and saved URL/file path.
  Model-stream cancellation is covered by the real-listener protocol fixture.
  The existing image MCP deliberately detaches a running job from the finished
  tool call so later generation_result can retrieve it, and bounds it by its
  job timeout. This pass does not claim a new image-job cancel command exists.

This is source and test-meaning review, not a substitute for the queued full
Go/GUI, native, installed-CLI or final production-bundle checks. No real-service
availability, paid inference, remote installation, deployment or user acceptance
was verified.
