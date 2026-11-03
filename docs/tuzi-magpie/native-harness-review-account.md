# Independent native acceptance and shell review

Reviewer: account agent, which did not implement the native harness, native
window hooks, navigation script or shell integration. Root integration was
read-only throughout this review; only this document is committed in the
account worktree. Reviewed root `/Users/syd08/Documents/tuzi-magpie-local`
at `5f9bb2d26b72c9ba5868a582c5a6ca0b86b74592` plus its pending harness/navigation
edits on 2026-11-03. No large tests or builds were started by the reviewer.

## Findings and actual re-review

| Finding | Why it mattered | Disposition |
| --- | --- | --- |
| P1: UI wrote `result.json` with `passed=true` before gateway/snapshot verification | A later gateway exception left a misleading success file | Fixed and independently exercised. UI now writes `ui-result.json`; final result starts false, becomes true only after gateway/snapshot gates, and exceptions produce an atomic final false result with stage/error |
| P2: `nativeErrors` did not affect success | Unexpected account API failures could be recorded and ignored | Fixed: workspace success requires both ordinary errors and nativeErrors to be empty |
| P2: report claimed four summaries without checking them | Account/key-list readiness did not prove four populated cards | Fixed: workspace now asserts exactly four metric cards and nonempty, non-dash values before recording that check |
| Reused HOME validation used a raw string prefix | `..` or symlink spelling did not establish containment in the evidence folder | Fixed: paths are resolved, home containment uses `is_relative_to`, real HOME and its ancestors are rejected, and reuse requires the synthetic acceptance ownership marker |
| Evidence distinction: workspace/lifecycle scripts call `show("tuzi")` directly | They do not by themselves prove the custom scheme OS dispatch or `host.Import` path | Not labeled passed. Native scheme dispatch remains separate from the four navigation-script tests and from the native workspace evidence |

The fixes above were reread from actual source after root changed them, rather
than accepted only from completion messages. The final native binary still
needs its planned rebuild/rerun; this review does not substitute for that gate.

## Isolation and shared integration

The actual native08 sandbox profile was inspected. It denies external network,
real-home data reads/writes and `securityd` access, with concrete exceptions for
the integration repository, that run's evidence, the packaged executable
folder and the task's tools folder. These actual exceptions do not include the
real credential/config folders. The runner supplies a fresh explicit environment
with isolated HOME, XDG directories, temporary directory and a minimal system
PATH. The synthetic fixture's source performs no outgoing I/O; account and
model credentials and replies are fixed synthetic values held in memory.

`tuzi_fixture` build tags gate the account-origin override and native DOM/report
hooks. Untagged native builds use no-op hooks and cannot select an arbitrary
fixture account origin. `NewFixture` accepts only literal-loopback HTTP without
userinfo/path/query/fragment. The account API is mounted only for the native
handler and separately requires `ownWindow` context, local native host/scheme,
unframed requests and no external auth headers. The clipboard read remains
behind the backend's explicit one-shot prefill gate.

Shared `app.js` additions remain scoped to the Tuzi page/preset paths: guarded
leaving of the Tuzi workspace, hiding it on Web, and fixed purchase/query links
on the Tuzi presets. Original page implementation and framework are retained.
`tuziAccountNavigateJS` waits for DOMContentLoaded while the document is loading;
`start.js` synchronously mounts the registered pages before that event. Warm
navigation follows the existing `show`/discard decision and invokes prefill
only after an accepted transition. A cold page URL carries `tuziConnect=1`,
which the Tuzi page consumes after its initial state/check/tab load; the
navigate operation retains lifecycle/generation and same-input checks.

## Evidence inspected and small independent checks

- Actual `native-08/result.json` records `wails://localhost`, the native key
  flow and saved Provider; its separate `gateway-response.json` and
  `fixture-snapshot.json` corroborate the real gateway reaching the synthetic
  model service. That binary predates final Agent/UI fixes, so it is earlier
  evidence, not acceptance of the final integrated artifact.
- Actual `native-09/result.json` is false. It records successful account
  restoration followed by failure to find the Disconnect action. The failure
  is retained and root is diagnosing it; this review does not call lifecycle
  acceptance complete.
- `node --test internal/gui/tests/tuzi-navigation.test.cjs` independently passed
  all four checks: cold readiness/one-shot listener, warm interactive, warm
  complete, and rejected navigation not consuming prefill. These exercise the
  actual injected script source in a VM, not OS scheme delivery.
- Python AST parse of the actual runner passed.
- Runner negative control 1: a nonexistent synthetic fixture executable
  produced exit 1, final `passed=false`, and `stage=launch`; no process started.
- Runner negative control 2: a temporary synthetic fixture wrote UI
  `passed=true` but omitted providerId. The runner rejected it in the gateway
  stage before any network request, preserved the UI report separately,
  wrote final `passed=false` and exited 1. The temporary helper and `/usr/bin/true`
  were terminated by the runner. This validates failure reporting only; it is
  deliberately not described as native application acceptance.

Negative-control artifacts are in task-created temporary directories:
`/var/folders/y5/pxpgfd896pn3xyjqw2x9g9w00000gn/T/tuzi-native-review-rn68_1r0/launch-failure`
and
`/var/folders/y5/pxpgfd896pn3xyjqw2x9g9w00000gn/T/tuzi-native-review-c44i082x/post-ui-failure`.
No real token, account, payment, paid model, original Agent process or production
configuration was used. No push, PR or deployment was performed.

Reviewed pending source SHA-256:

| File | SHA-256 |
| --- | --- |
| native-acceptance.py | e8f879d99d6b66679bf2b426e549a5c7b72e45f13565e78cafc912cedbb49559 |
| native-workspace.js | 11666dc7dbe396205b31ce0e59f0942dd30b9bf636b4c0d9a6c511f8793abd99 |
| native-lifecycle.js | 80405f413a7b177f51f993e8327d110bfa93a888c8bb54de7cdaac6b92c5c21f |
| tuzi_navigation.go | 716fda13951e6f2938312169e9b0b0b4b990589e1507358d85ce31fa09e130a1 |
