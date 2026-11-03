# F04 — Key add completion boundary

Owner: account subagent. Worktree `/Users/syd08/Documents/tuzi-magpie-account`,
branch `codex/tuzi-account-eye-detach`. Frozen source c7238e14891f; upstream
reference 2251ca1. Root authorized this scoped correction after both full GUI
engines ended. No product change; no frozen/root worktree change.

## Observed failure and source comparison

The full Chromium log at
`/Users/syd08/Documents/tuzi-magpie-evidence/gui-final-c7238e14891f-c4/chromium.log`
reports test 1864, English “adding one key shows it is under way”, line 189,
actual 1 versus expected 0. This is the successful-add form count, not the
spinner assertion after the earlier refused request. Chinese passed.

The original key-import test and app.css are byte-identical 2251ca1..c7238e14891f.
The accountAction, single-key go, saving and renderProviders bodies are also
unchanged. accountAction first receives keys/add, renders the newly added key,
then awaits the state refresh. Only after it returns does go clear addingKey
and render away the form. Waiting for the new key therefore does not establish
that the form has completed. The uninstrumented full-run sample did not trace
its exact response timing; the controlled case below demonstrates this gap.

## Minimal correction

The fixture accepts an optional state-response gate, used only by this one
scenario after its successful synthetic key eeeeeeeeee exists. No initial
state read or other scenario is blocked. The test registers a bounded
waitForRequest before releasing successful keys/add, waits for the new key and
state request, and verifies the form still exists during that held phase.
A finally block releases the state response. It then waits for the actual
completion boundary, form detachment, and retains the original exact count 0,
the exact two posted key values, and absence of page errors.

All original refusal, spinner, busy attribute, duplicate-Enter suppression,
field-width, language, paste/bulk and scroll checks remain. No new sleep,
general retry, assertion tolerance, product code or styling is introduced.
The pre-existing 15-second locator timeout bounds a form that never disappears.

## Verification

Evidence: `/Users/syd08/Documents/tuzi-magpie-evidence/key-import-01/`.
Runs use the isolated Node/Playwright runtime and execute serially. Logs are
named `<engine>-<suffix>`. Only this file is rerun, not the whole GUI suite.

| Check | Chromium | WebKit | Log suffix |
| --- | --- | --- | --- |
| Original completion assertion with held state, en | expected failure 0/1 | expected failure 0/1 | `controlled-original.log` |
| Two-stage correction with held state, en | 1/1 | 1/1 | `controlled-candidate.log` |
| Real missing-success-clear negative, en | expected failure 0/1 | expected failure 0/1 | `uncleared-form.log` |
| Entire actual key-import file, both languages | 6/6 | 6/6 | `complete.log` |

The external original control places the unchanged immediate count-0 check
at the first-key-render boundary while state is held. Both engines report
`KEY_ADD_PHASE {"newKey":1,"adding":1,"stateHeld":true}`, then 1 versus 0.
The corrected control verifies count 1 while held, releases state, then passes
the unchanged count 0 and remaining assertions.

The negative uses copied assets with only the successful single-key go branch's
`addingKey = null` removed. Neither fixture nor assertion manufactures failure:
the actual application keeps the form, and both engines hit the 15-second
`.acc.adding` detachment requirement. No unrelated or cleanup error is accepted
as its negative result. The copied production mutation is evidence-only and is
not in the worktree. This prevents a correction that would accept an uncleared
form. All actual-file checks pass; this supplies scoped F04 closure evidence
without claiming the original full-suite run was wholly green.

## Recovery

Only `internal/gui/tests/key-import.test.cjs` and this record belong to F04.
F03 is separately committed as 39ea21649c2a9872868aa9b691f84703307691bb.
Root owns integration, final acceptance and any further test queue. No paid
model, real account, gateway/native process, external service or user settings
was used. Browser contexts were isolated fixture contexts and closed afterward.
