# Account backend handoff

Date: 2026-11-03 Asia/Shanghai. Baseline `2251ca1`, worktree
`/Users/syd08/Documents/tuzi-magpie-account`, branch `codex/tuzi-magpie-account`.

Implemented native-only account service and controlled four-tab business facade,
private storage, durable unknown-write recovery, model-key qualification and
stable Provider provenance. See `docs/subsystems/tuzi-account.md` for contracts.
Main shared registration is deliberately not changed in this worktree.

Integration tasks for root:

- Call `tuziAccountRoutes(mux,w)` in `gui.Handler`; it self-excludes Web hosts and
  checks native transport context on every request. Add route parity exclusions
  with the reason that account management is desktop only.
- Supply `host.TuziClipboardText() (string,bool)` and strict token-free deep-link
  navigation. Frontend must put prefill only into an empty form.
- Fixture build: `tuziaccount.NewFixture(path,origin) (*Service,error)` under
  `tuzi_fixture`; replace GUI `newTuziAccount` before handler construction.
- Startup state is offline with saved identity until explicit check completes.
- Unknown write state is `pendingWrite:{method,path,startedAt,readBack}`. Recover
  false returns an Envelope with `{pending,data,notFound,requiresConfirmation}`;
  recover true requires the completed read and then clears the gate.
- `/account/keys/:id/models` returns `{items,key}` using model-key `/v1/models`.
  Only selected model keys are sent there. AddProvider also validates catalog
  group/protocol metadata, maximum three exact model names per same-snapshot read.
- Main Anthropic model endpoint is `https://apius.tu-zi.com`; account traffic is
  only `https://api.tu-zi.com`. Fixture origins stay on loopback.
- Add new subsystem reference to the shared index/GUI shell documentation.
- Independent review, whole suites and actual native/Agent E2E remain root tasks.

Validation (Go 1.26.8, macOS arm64, synthetic loopback only, isolated HOME/XDG,
fixed GOPATH/GOMODCACHE/GOCACHE):

- `go test -tags nogui ./internal/tuziaccount ./internal/provider ./internal/gui -run Tuzi -count=1 -timeout 4m`: passed.
- Same command with `-race`: passed.
- Deliberately removed `apiFramed` and allowed opaque Origin: guard test failed
  `opaque_plugin` and `cross_site` with HTTP 200 instead of 403. Restored source;
  `go test -tags nogui ./internal/gui -run '^TestTuziAccountRequiresNativeTransportNotHeaders$' -count=1`: passed.
- `gofmt -l` on all changed Go files: empty; `git diff --check`: passed.
- Existing compiler warnings: macOS enum conversion in tray/dock code and
  deprecated posix_spawn_file_actions_addchdir_np. No new warnings observed.
- No tests contacted production or used a real account/paid model. This does not
  establish real service compatibility, native UI correctness or final AC pass.

Fixed during validation: per-test XDG isolation (HOME alone left prior corrupt
fixture visible), a fixture directory permission mismatch, and preserving actual
server statistics start/end timestamps. Tests now assert these behaviors.

Known explicit storage boundary: provider append detects external changes made
before its final byte comparison, but existing noncooperating Provider writers do
not share the new account-add mutex. Comparison and rename are not a filesystem
CAS; see subsystem reference. No broad storage refactor was performed.

No processes/ports remain running from these tests. Tests create and close their
own ephemeral httptest listeners. No unrelated files were modified.

Review repair (2026-11-03): AddProvider now attaches its initial bootstrap
verification to the account generation's cancellation context, before any
network work. Disconnect or switch cancels that request and returns
stale_generation; the final local-write fence remains in place. A held synthetic
bootstrap test verifies actual HTTP cancellation and that no Provider is written.
`go test -race -tags nogui ./internal/tuziaccount -run TestTuziProvider -count=1
-timeout 2m` passed. Removing the new requestContext binding made the new test fail
with "disconnect did not cancel provider bootstrap"; restored code passed again.
Fixed website URLs were checked against current api-contract IF-15 and PRD: the
current coding.tu-zi.com/reseller and gaccode.com/subscriptions URLs are retained,
not the old reference implementation's links. No background processes remain.
