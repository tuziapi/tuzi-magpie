# Production macOS LaunchServices startup check

`scripts/tuzi-magpie/native-production-launch.py` is a separate, non-fixture
startup checker. It requires a Go `production` GUI binary and rejects
`tuzi_fixture` and `nogui` build tags before creating runtime state or
registering/launching an app. It copies only the supplied `com.tuzi.magpie`
bundle to a new `/private/tmp` task directory, replacing the copy's executable
entry with an isolated env/sandbox launcher. The source bundle is not edited.

The actual LaunchServices launch is `open -n -a <copy>`. The checker validates
that the one recorded copied-binary PID owns the selected loopback listener
(`--port`, default18543, permitted range1024–65535),
that `/v1/models` returns a model list, that HTTP cannot access the desktop
account state, and that no account file appeared. It checks the original
binary hash again, unregisters only its copy and restores registration of the
source bundle. It cleans only PIDs whose commands contain the copied binary's
absolute path. `--keep-open` retains only a successful verified process and
records the precise PID for subsequent inspection/cleanup.

The sandbox denies real-home data and `securityd` access and denies all
non-loopback network. It permits only the task runtime directory within real
home exceptions (normally no exception is needed because it is under tmp).
No fixture origin/script variables are present. No account token, payment or
inference request is sent. This is a process/HTTP startup check; the output
explicitly does not claim visual DOM or screenshot validation.

Latest validation: production-start-03 passes on clean079fea7, exact PID25651
and selected port18553. A different existing preview occupied18543 and was
preserved. CUA subsequently inspected the actual Agents/account window and
saved screenshots and visual-inspection.json separately; the checker result
is not rewritten to claim it performed that inspection. Only PID25651 was
closed afterward (post-visual-cleanup.json). Syntax parsing and invalid-port
boundaries1023/65536 pass. Current build provenance is in
[native-current-evidence.md](native-current-evidence.md).

Historical validation while preparing the script: Python syntax parse passed;
invocation against the current fixture-tagged app exited 2 with
`Requires a production GUI binary without fixture hooks`. It did not create
runtime output or register/start an app. Actual production-bundle runs now pass: `production-start-01` on 3d77be3
and `production-start-02` on c7238e1. That result verifies exact PID
22858, port18543, account HTTP404, unchanged source SHA256 and restored
registration; its process was closed. Evidence is under
`/Users/syd08/Documents/tuzi-magpie-evidence/production-start-02/`. Neither
run claims production window visual inspection. See
[native-current-evidence.md](native-current-evidence.md) for build provenance.
The earlier real cold/warm OS URL test used a fixture build and is recorded separately in
[native-os-navigation.md](native-os-navigation.md).
