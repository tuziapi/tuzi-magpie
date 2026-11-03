# Actual installed CLI acceptance

AC-09 uses `internal/agent/tuzi_cli_darwin_test.go` under `tuzi_fixture` on macOS.
This is distinct from the desktop window acceptance: it calls the production
account service, adds its selected model key as a provider, uses the existing
Agent `model` field setter to write the native configuration, and runs an actual
installed CLI against the guarded Magpie HTTP gateway and a loopback model API.
The CLI must return `TUZI_CLI_OK` in its successful final JSON event and a model
request must reach the synthetic upstream. The generated native config must
contain the gateway URL and neither upstream model nor account secret. The account credential is never accepted by the model API.

## Installed programs and repeat command

- Codex CLI 0.154.0: `/Users/syd08/.npm-global/bin/codex`.
- Official Claude Code 2.1.241:
  `/Users/syd08/Documents/tuzi-magpie-tools/claude-official/node_modules/@anthropic-ai/claude-code-darwin-arm64/claude`.
  Installed using `npm install --prefix .../claude-official --registry=https://registry.npmjs.org --ignore-scripts --no-audit --no-fund @anthropic-ai/claude-code@2.1.241`.
  The independent prefix keeps package-lock.json and registry integrity data.
  Installation scripts were disabled; the package's installed native binary is
  executed directly. The machine's existing `claude` command is a third-party
  OAuth/downloading launcher, so it is not used for this acceptance.

```sh
python3 scripts/tuzi-magpie/installed-clis.py \
  --codex /Users/syd08/.npm-global/bin/codex \
  --claude /Users/syd08/Documents/tuzi-magpie-tools/claude-official/node_modules/@anthropic-ai/claude-code-darwin-arm64/claude \
  --real-home /Users/syd08
```

The runner pins Go caches before setting a temporary HOME. TestMain keeps the
Go process in its normal Magpie test isolation. Each CLI gets another temporary
HOME, explicit environment variables, an empty project, generated Agent config,
and no inherited authentication variables. macOS sandbox-exec denies all
network except localhost, real-home file reads except the selected program
installations, and securityd/keychain service lookup. The outer sandbox applies
to descendant processes. Each command has a 60-second timeout, a process group
killed on timeout and completion, and inherited pipes are closed by proc's
WaitDelay. Tests close the listeners and delete temporary state.

The final race run passed all 20 account projection paths (2.225s) and both
actual CLIs (3.235s), each with one synthetic model request; no paid request occurred. Claude's JSON includes a locally
calculated cost estimate from fixture token counts; it is not a charge or a
real-service billing observation. Evidence lives in
`/Users/syd08/Documents/tuzi-magpie-evidence/lines/installed-cli.log` and the final
race run in `installed-cli-race.log`.

## Reusable account/model fixture

`internal/tuzifixture` is compiled only with `tuzi_fixture`.
`New() *Fixture` implements `http.Handler`; serve it with `httptest.NewServer`
or a listener explicitly bound to literal loopback. It has no outgoing I/O.
`SystemToken`, `ModelKey`, `CodexModel`, `ClaudeModel`, `Answer` and `Models` name
synthetic data. `Snapshot()` returns only recorded methods/paths and model-call
count, never credentials or request bodies.

The fixture covers account bootstrap/self/status, key list/detail/create/patch/
status/delete/reveal/groups, key model list, pricing metadata, log list/request/
summary/statistics, usage, performance and Responses/Messages/image endpoints.
`TestDesktopAccountFixtureProjection` checks the account routes through actual
`Service.Request`, including mutations and the native response projections.
The production service is instantiated with `tuziaccount.NewFixture`, which
accepts only literal loopback HTTP. Its AddProvider bases use this fixture
origin, so generated providers cannot point to the production site.

The fixture supports deterministic success scenarios. Dedicated account tests
cover stale generations, offline/invalid credentials and unknown write outcomes.
Actual Wails window workflows, real vendor availability and user acceptance
remain separate checks; a CLI pass does not claim them.

Recovery: branch `codex/tuzi-magpie-lines`, parent lines commit `a3e8f7b`;
account contract `14e98ad` was cherry-picked locally as `10352f2` only for this
acceptance. Integrators already carrying the account commit should pick only
the new fixture/CLI acceptance commit. No persistent process or port remains.
