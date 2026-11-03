# Real macOS LaunchServices navigation acceptance

The account agent implemented and ran the new standalone
`scripts/tuzi-magpie/native-os-navigation.py`. It did not modify root's existing
runner, source app bundle, GUI code, user privacy settings, or original Magpie
registration/process. No Go build or broad test ran for this task.

## Passed actual OS chain

Run command (source is the fixture build, not the final production build):

```sh
python3 scripts/tuzi-magpie/native-os-navigation.py \
  --app /Users/syd08/Documents/tuzi-magpie-local/tuzi-magpie.app \
  --fixture /Users/syd08/Documents/tuzi-magpie-tools/tuzi-fixture-server \
  --output /private/tmp/tuzi-magpie-os-evidence/native-os-02 \
  --keep-open
```

The runner copies the bundle into a new task directory, checks that its only
protocol is `tuzimagpie` and its ID is `com.tuzi.magpie`, and changes only the
copy's CFBundleExecutable to a shell launcher. The launcher records its PID,
sets an explicit `env -i` with isolated HOME/CFFIXED_USER_HOME/XDG/TMP paths,
then execs `sandbox-exec` and the copied original Go executable with argument
`app`. It does not pass the account link as a Go argument. The copied bundle
is ad-hoc signed; the original root executable remains byte identical.

Cold navigation uses actual `/usr/bin/open -n -a <copied.app>
tuzimagpie://account/connect`. The native observer never calls `show("tuzi")`:
it waits for the OS-delivered link to show a fully loaded Tuzi page. It then
switches to Providers, reports `warm-ready`, and the runner uses actual
`open -a <same.app> tuzimagpie://account/connect`. The observer verifies the
second return to Tuzi. Both transitions used app PID 76822, confirmed by the
launcher PID record and the executable's full copied-bundle path. The report
came from `wails://localhost`.

At both transitions the account was disconnected and its token input empty.
No prefill grant was created; the backend's one-shot gate therefore did not
read the daily clipboard. No account file was persisted. The separate fixture
on 18441 recorded `paths: []` and `modelCalls: 0`; the app's gateway was 18443.
This is OS-navigation evidence, explicitly `gatewayVerified: false`; the
native workspace/account/gateway tests are separate evidence.

Source executable SHA-256:
`5ec0da2ac2e34c8ae0ab889c71e56731df0db03e799f18622623e944cec200a8`.
It was reread after the run and still matched.

## Isolation, failed attempt and cleanup

The profile denies all non-loopback network, real-home file data reads/writes
and `securityd` access. It allows only the task runtime/evidence directory and
the synthetic fixture tools folder. The fixture itself has only fixed
synthetic credentials and in-memory data and performs no outgoing I/O.

The first run under Documents (`native-os-01`) failed before the Go app could
start: LaunchServices' new process could not read the Documents sandbox
profile (`Operation not permitted`, macOS TCC boundary). It is retained as a
failed report. The working runtime was moved to `/private/tmp`, still under
the same sandbox restrictions; no privacy permission was changed and no
unsandboxed Go launch was attempted. Nonsecret final reports were copied back
to `/Users/syd08/Documents/tuzi-magpie-evidence/native-os-02` and to this repo.

Only the copied `com.tuzi.magpie` bundle was registered. After both attempts,
`lsregister -u <copy>` succeeded and `lsregister -f <root source bundle>`
succeeded. No `com.yetone.magpie` operation was issued. Command argv and return
codes are retained in the evidence. The success run briefly kept its owned
instance open at root's request for inspection. CUA inventory did not expose
it, so no `getApp` call that could launch an uncontrolled instance was made.
Root then asked for cleanup: app PID 76822 and fixture PID 76812 were matched
against their exact commands, sent SIGTERM, and confirmed gone. Final evidence
records `registrationRestored: true`, `cleanupComplete: true`,
`keptOpen: false`, and `processes.cleaned: true`.

## Evidence

- [Final result](evidence/native-os-navigation/result.json)
- [Cold result and warm-ready signal](evidence/native-os-navigation/cold-result.json)
- [Native final report](evidence/native-os-navigation/ui-result.json)
- [LaunchServices and registration commands](evidence/native-os-navigation/commands.json)
- [No account/model calls](evidence/native-os-navigation/fixture-snapshot.json)
- [Exact PID and cleanup checks](evidence/native-os-navigation/processes.json)

Final production-bundle LaunchServices startup is a separate pending gate:
this run validates the actual OS URL path using the fixture-tagged artifact.
No screenshot, Windows/Linux installation, production account, paid inference,
push, PR, deployment or release is claimed.
