# Native acceptance harness review

Independent initial review of integration `64c1909`, including production
launcher `b5936a0`, native lifecycle/navigation acceptance `9cea153`, and the
root's then-uncommitted `internal/gateway/codex_accounts_test.go` change.
Reviewer: website/lines agent, not the author of those implementations.
The corrections below were then authorized by root and implemented in the
reviewer's independent `codex/tuzi-native-harness-review` branch; root must
review their actual diff before integration.

## Findings and corrections

1. **Native fixture process was not sandboxed.**
   `native-acceptance.py` passed isolated environment variables to both
   children but applied `sandbox-exec` only to the native app. The synthetic
   server source uses loopback and does no credential discovery, but the
   promised OS file/Keychain/network restrictions did not cover that child.
   Both now use the same sandbox profile, matching the OS-navigation runner.

2. **A successful gateway response did not prove ownership by this app.**
   The runner queried fixed port 18343 and checked the fixture's cumulative
   call count. It did not prove that the app launched in this run owned that
   listener, allowing an old gateway with the same saved Provider identifier
   to supply the response. The runner now checks both reserved ports are free
   before any output/process creation, then verifies the exact app PID owns
   the listening gateway before its first model request. It stores the lsof
   output and `gatewayPID` as evidence. A port race cannot silently use another
   process: the post-launch PID check refuses it.

The six low-cost checks cover occupied fixture/gateway ports, missing or
wrong listener PIDs, exact lsof command selection, and the actual runner's
failure path. Child process launches and gateway HTTP are mocked only in
these runner tests; they are not native end-to-end evidence. The actual
runner test checks both generated child commands contain `sandbox-exec`.
When restored to the original runner, a synthetic UI success plus a successful
response from the wrong gateway incorrectly exited successfully, producing a
real assertion failure (“SystemExit not raised”). Restoring the patch passed
all six checks in 0.013 seconds. Logs:

- `/Users/syd08/Documents/tuzi-magpie-evidence/lines/native-harness-red.log`
- `/Users/syd08/Documents/tuzi-magpie-evidence/lines/native-harness-green.log`

Python AST parse and `git diff --check` passed. No Go build, large suite,
actual native app, real credential, Keychain request, external service or paid
model was used during this review. Final actual native rerun remains required.

## Production LaunchServices launcher

The reviewed production launcher rejects non-production, fixture and nogui
binaries before registering or launching. It checks the supplied bundle ID
and scheme, copies the bundle to a new private temporary directory, changes
only the copy's launcher/plist, and passes a fixed empty-origin environment.
Its OS sandbox denies real-home file data, securityd access and non-loopback
network; only the private output tree is allowed back through the home deny.
It checks the exact recorded app PID's listener and the gateway model-list
shape, refuses account management over HTTP, checks no account file appeared,
and rechecks the source executable hash.

Registration commands name only the wrapper and supplied tuzi source bundle.
Cleanup examines only launcher-recorded PIDs whose command contains the
unique copied executable path; no process-name-wide kill or original Magpie
bundle unregister is present. Registering the source restores its registration,
not a general snapshot of all LaunchServices associations. Its result
explicitly leaves `uiVisuallyVerified` and `paidInference` false: successful
process/HTTP startup must not be relabeled a visual or inference acceptance.
Actual production execution remains a separate root gate.

## Native navigation and result handling

`tuziAccountNavigateJS` waits for DOMContentLoaded when Wails runtime readiness
precedes synchronous `start.js` page setup, then uses the existing `show`
(discard-aware) path. The actual OS observer deliberately does not call
`show("tuzi")` itself; its first navigation must come from the OS link, and
its warm test returns from Providers in the same recorded PID.

The fixture runner clears final success before the real HTTP request and
sets `gatewayVerified` only after both synthetic completion and fixture-call
evidence. `--skip-gateway` explicitly leaves that flag false. Lifecycle
acceptance checks restart restoration, native disconnect, preservation of the
Provider, and removal of revealed-secret DOM. The four-summary assertion
checks populated output rather than merely a label's presence. These static
properties do not replace the pending run of the strengthened script.

## Gateway client-version test

The proposed child-process test bounds execution, uses `proc.CommandContext`,
and re-enters the gateway package's TestMain. That setup creates another temp
home, clears agent/proxy variables, points discovery at inert CLI/Keychain
stand-ins, and installs the offline guard. A separate process prevents the
synthetic high version from contaminating process-global `codexSeen` state.
The assertion checks the actual fake-upstream User-Agent and version header,
and the model response fails when its advertised version is too old.

Removing only `provider.SawCodexClient` from `gateway.codexBackend` is not a
valid negative control for this particular request: `provider.codexSign`
also computes `newerVersion(codexVersion(), req.Header.Get("version"))`.
The forwarded version header independently preserves the client's version.
A suitable mutation for the advertised-signature guarantee is to replace
that `ver` calculation with the fallback `codexClientVersion`; both outbound
headers then advertise the older version and the test must fail. To test the
observation path specifically, a separate case should omit the version header
and carry the version only in User-Agent before removing SawCodexClient.
The reviewer did not execute or modify root's Go test; red/green evidence
for that test remains owned by root.

## Acceptance script placement

The three DOM drivers now live under scripts/tuzi-magpie/tests/. They are
fixture-only test scripts, so the existing production word-ownership scanner
correctly omits them with its existing tests-directory rule. The scanner
itself is unchanged. The runner default points at tests/native-workspace.js;
restart/nav callers use the corresponding tests/ paths. All four i18n-key
guards pass after this move (24.47s). No production translations were removed.
