# Current native and production evidence

The current production artifact is built from clean 079fea7; its product
assets match d5daff2, used by the final native fixture checks. Complete GUI
regression finished naturally; 34 of its 36 failed files have closing
evidence, with the separate F01(side-effort) evaluation anomaly and F11 still open. This record does not
declare the development goal complete. Earlier checks below are historical.

## Current final product checks (2026-11-04)

All paths are under `/Users/syd08/Documents/tuzi-magpie-evidence/`.

- `final-source-checks-04/source.json` records clean d5daff2 and product hashes.
  GUI Go package checks including budgets passed (73.31s); Linux and Windows
  builds passed (6.13s/5.11s); fixture build passed (10.30s). These supplement
  the earlier full Go/race/vet evidence; they are not a repeated full suite.
- `native-final-workspace-03` passes eight actual Wails/Go checks: connection,
  four populated summaries, key create/reveal/close, Provider persistence,
  logs, marketplace, status and real gateway-to-synthetic-model use. Gateway
  PID24573 was verified. `native-final-lifecycle-03` passes actual restart,
  restore/check, disconnect and retained Provider use via exact PID24899.
  Both owned native/fixture processes were cleaned.
- The fixture bundle is `final-source-checks-04/tuzi-magpie-fixture.app`.
  Its hash is recorded in fixture-artifact.json; it is distinct from delivery.
- `final-source-checks-04/artifact.json` records production-only build source
  079fea7f635729c88f703862e5c3981cc9845ae4, exit0 in10.67s. Later changes to
  documentation and acceptance scripts do not change embedded product code.
- `production-start-03/result.json` passes actual LaunchServices startup,
  exact PID25651 owning18553, HTTP404 for private account management, no
  persisted account, unchanged source binary and restored LS registration.
  The existing unrelated preview occupying18543 was not stopped.
- CUA inspected the actual native Agents and four-tab disconnected account
  pages. `production-start-03/visual-inspection.json`, agents-native.png and
  account-native.png record this separately from the original script result.
  `post-visual-cleanup.json` records closing only owned PID25651 afterward.

Delivered production path: `/Users/syd08/Documents/tuzi-magpie-local/tuzi-magpie.app`.
Executable SHA256: `22a7ec57298045ba1e61a8a404efdb4b26787823c1783099a92fe7721b8f1e46`.
No real credential, paid inference or off-loopback service was used.

## Historical native runs

The fixture build uses `production,tuzi_fixture`. Both native runs execute
real Wails DOM actions, native Go account handlers and the real gateway.
`native-final-workspace-01` passes four populated summaries, connection, Key
creation/reveal/close, Provider persistence, logs, marketplace and status.
Its exact app PID13690 serves the synthetic model request.
`native-final-lifecycle-01` actually restarts with the owned isolated HOME,
restores and checks the account, disconnects it, and retains the Provider;
its exact new app PID13963 again serves a synthetic model request.

The first immediate lifecycle launch was refused by the free-port precheck
while TCP18341 was not yet reusable. The previous app and fixture had both
exited, with no listener remaining. After a bounded30s wait, the unchanged
runner passed. No isolation guard was removed or weakened.

The production build uses only `production`, without `tuzi_fixture` or
`nogui`. `production-start-01` records a real LaunchServices launch of its
isolated copied bundle, exact gateway owner PID14594, valid model-list
response and HTTP404 for the private account route. No account file appeared,
and the source executable hash stayed unchanged. Build/start evidence is
under `/Users/syd08/Documents/tuzi-magpie-evidence/`; build manifests and
logs are `native-final-build-01` and `production-build-01`. The test-tagged
bundle is preserved in native-final-build-01/tuzi-magpie-fixture.app.

The production window was not visually inspected: the computer-use tool
reported that macOS was locked. No unlock bypass was attempted. This is
separate from the existing same-condition browser visual comparisons and
the successful actual native DOM workflows. The isolated production process
was closed after the attempt; post-visual-check-cleanup.json records this
without rewriting the original keep-open startup result. The original user's
Magpie was not stopped or replaced.

## Deterministic native visibility cancellation

A later native-final-workspace-02 run failed during connection. The failure
was retained and investigated; a passing instrumentation run was not treated
as a substitute. The old client's shared cancellation signal caused three
controlled browser failures (connection, initial state and Key PATCH).

The tagged synthetic server now accepts `-bootstrap-delay` from zero to five
seconds, default zero. The native runner optionally forwards
`--bootstrap-delay`; all sandbox, literal-loopback, private-HOME and exact-PID
checks remain. Production builds do not include this fixture command.

With a500ms bootstrap response delay, native-visibility-old-01 runs the actual
old d384d23 desktop and Go backend. Its diagnostic script hides the document
100ms after connection starts. The recorded timeline is643ms request start,
744ms hidden,746ms signal abort and fetch AbortError. The final Go state is
offline, generation1, no identity, network_uncertain; the UI remained silently
Not connected. cause-summary.json retains only safe metadata.

The diagnostic driver is preserved under that evidence directory. The fixed
app was checked with the exact same script and delay after integration; the
old red remains immutable. Independent review is recorded in
visibility-independent-review-account.md.


## Historical integrated source: c7238e1

All paths in this section are under
`/Users/syd08/Documents/tuzi-magpie-evidence/`.

- `native-visibility-fixed-build/source.json` records clean source
  c7238e14891f917b67d80209857d3d1db4cb4c42. The fixture bundle is preserved at
  `native-visibility-fixed-build/tuzi-magpie-fixture.app`.
- `native-visibility-fixed-01` passes the complete eight-check native workspace
  and real gateway flow with the same driver hash and 500ms bootstrap delay
  used for the old-code failure. Connection starts at 618ms, the controlled
  hidden event occurs at 719ms, and the connected response arrives at 1140ms.
  No pending request rejects. Invalidating the old controller after consuming
  the successful response is expected. `comparison.json` and
  `cause-summary.json` retain the causal evidence.
- `native-final-lifecycle-02` reuses that run's owned isolated HOME, actually
  restarts the app, restores/checks the account, disconnects, and verifies the
  retained Provider through the real gateway (exact app PID 22773). All three
  checks pass. It does not replace the workspace's separate eight checks.
- `final-source-checks-03` records GUI Go package tests (74.25s), fixture vet,
  Linux and Windows builds, and the production app build (8.57s) on clean
  c7238e1. The earlier complete Go suite, all-platform vet/build and targeted
  race run are `full-go-02`, at fdfea5c plus its recorded four GUI test edits;
  those full results are not attributed to c7238e1.
- `production-start-02` launches the production-only app through LaunchServices.
  PID 22858 owns port 18543, account management returns HTTP 404, no account
  file is created, the original bundle hash is unchanged and registration is
  restored. The checker closes its app; `keptOpen` is false.

The historical production artifact was
`/Users/syd08/Documents/tuzi-magpie-local/tuzi-magpie.app`, with executable
SHA256 `f53209fed0866b97b610fd715ab9496de59645569e888712f8d2885e24358472`.
The manifest is `final-source-checks-03/artifact.json`. Production window
inspection remains unclaimed (`uiVisuallyVerified: false`); the earlier lock
screen was not bypassed. All native acceptance app and fixture processes
were closed. No real account or paid model was used.
