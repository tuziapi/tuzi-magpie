# Local delivery and acceptance

Current source (2026-11-05): the frontend polish and startup defaults are
consolidated in `/Users/syd08/Documents/tuzi-magpie-local` on
`codex/tuzi-magpie-local`. See [current build and verification](unified-preview-2026-11-05.md).

Historical local preview (2026-11-04): rebuilt from `9585a49` plus the local
Simplified Chinese default change, version `9585a49-local-zh`, at the same
`tuzi-magpie.app` path. Executable SHA256:
`6c62f48354e8eb2ec0b3e36615decac86dfa6e48ef61a51df5e59fcd91c66777`.
The preview launcher now marks its configuration as a new install
(`dockSettled: true`) and leaves language unset. The native window opens in
Simplified Chinese with the original With window Dock behavior and unchanged
upstream icon bytes. Startup evidence is
`/private/tmp/tuzi-magpie-preview-20261104-02/result.json`; this temporary
preview uses port 18553. See [preview verification and release readiness](preview-defaults-2026-11-04.md).

The acceptance freeze below records the **previous** candidate. Its source,
hash and test results must not be attributed to the rebuilt preview.

Previous acceptance status: closing freeze. The final product source includes the approved
F08/F14/F15 repairs. Production build, isolated startup and native window
inspection pass. The frozen complete GUI suite finished red; two files
still require a supported closing conclusion (see closing-blockers.md).
This document does not claim final acceptance. See acceptance.md
for the current AC-01–16 matrix and recovery.md for the latest continuation.

## Checkouts and paired source

Development is delivered in `/Users/syd08/Documents/tuzi-magpie-local`, branch
`codex/tuzi-magpie-local`. The original `/Users/syd08/Documents/tuzi-mapie`
remains at2251ca1ce93a837aa31df1158fa9d58437268a71 with its existing .DS_Store.
The code/test integration snapshot is14df3f927a8e913dda91c856bea23ff100626c5f.
Later evidence-only commits are recorded by git HEAD and the external
`/Users/syd08/Documents/tuzi-magpie-evidence/local-handoff-04.json` manifest.
This is a runnable candidate handoff, not a claim that AC-13/16 passed.

Website guide source is `/Users/syd08/Documents/tuzi/tuzi-api-magpie-guide`,
branch `codex/tuzi-magpie-guide`, commit
e2ba322b2cd57ef71dc9467ad5107be5f569bb47. The original website checkout remains
at34063efc6e053b152b82b45e2076549bfc4fe8b8. Neither branch has been pushed.
The reference repository was not modified.

## Build and isolated startup

The intended final bundle is
`/Users/syd08/Documents/tuzi-magpie-local/tuzi-magpie.app`.
A fixture-tagged bundle at that path during development is not the final
artifact. Check `go version -m` for `production` and absence of `tuzi_fixture`
and `nogui`; the production startup checker enforces this before launching.

From the development worktree, build with `make app TAGS=production`. The
local Go toolchain is `/Users/syd08/.local/toolchains/go1.25.12/bin/go`, which
selects the repository's Go1.26.8 toolchain. The previous acceptance candidate was version 079fea7, source
079fea7f635729c88f703862e5c3981cc9845ae4, executable SHA256
`22a7ec57298045ba1e61a8a404efdb4b26787823c1783099a92fe7721b8f1e46`.
Evidence is `final-source-checks-04/artifact.json` and `production-start-03`
under `/Users/syd08/Documents/tuzi-magpie-evidence/`. The final acceptance
commit will also include the closing evidence and any required repairs.

To start the production app without touching daily applications or real
credentials, use the production checker with a new absolute directory under
`/private/tmp`:

```sh
cd /Users/syd08/Documents/tuzi-magpie-local
export PATH="/Users/syd08/.local/toolchains/go1.25.12/bin:$PATH"
python3 scripts/tuzi-magpie/native-production-launch.py \
  --app /Users/syd08/Documents/tuzi-magpie-local/tuzi-magpie.app \
  --output /private/tmp/tuzi-magpie-user-acceptance-01 \
  --port 18553 \
  --keep-open
```

The checker starts a copied bundle through macOS LaunchServices, gives it
private empty configuration, denies real HOME/keychain access and non-loopback
network, and uses the selected port (default18543). It checks the precise app PID owns the gateway.
If the directory or port is already used, choose a new directory and unused
unprivileged port; do not stop an unrelated application. Without
`--keep-open`, only the checker's own process is closed after validation.

The original user Magpie is never replaced or quit. The development bundle
retains its original icon but has independent name, bundle ID, URL scheme,
data directories and default ports. Updates remain disabled until an explicit
independent update feed is configured at build time.

## Synthetic acceptance

The fixture build and production build are distinct. A fixture build permits
only a literal loopback account API through test-only hooks. Use
native-acceptance.py for the actual native connection, four summaries, key
creation/reveal, Provider save, logs, models and status followed by a real
HTTP gateway request to the synthetic model. A second run with the owned
first-run HOME and scripts/tuzi-magpie/tests/native-lifecycle.js checks restart restoration, disconnect,
and retained Provider use. Native OS URL delivery and the final production
startup have their own documented runners.

The preserved fixture executable is distinct from the production `.app`
directory accepted by the production checker. To replay the workspace and
then its restart flow, use fresh output directories:

```sh
cd /Users/syd08/Documents/tuzi-magpie-local
python3 scripts/tuzi-magpie/native-acceptance.py \
  --app /Users/syd08/Documents/tuzi-magpie-evidence/final-source-checks-04/tuzi-magpie-fixture.app/Contents/MacOS/tuzi-magpie \
  --fixture /Users/syd08/Documents/tuzi-magpie-evidence/native-visibility-fixture/tuzi-fixture \
  --output /Users/syd08/Documents/tuzi-magpie-evidence/native-user-workspace-01 \
  --script /Users/syd08/Documents/tuzi-magpie-local/scripts/tuzi-magpie/tests/native-workspace.js

python3 scripts/tuzi-magpie/native-acceptance.py \
  --app /Users/syd08/Documents/tuzi-magpie-evidence/final-source-checks-04/tuzi-magpie-fixture.app/Contents/MacOS/tuzi-magpie \
  --fixture /Users/syd08/Documents/tuzi-magpie-evidence/native-visibility-fixture/tuzi-fixture \
  --output /Users/syd08/Documents/tuzi-magpie-evidence/native-user-lifecycle-01 \
  --home /Users/syd08/Documents/tuzi-magpie-evidence/native-user-workspace-01/home \
  --script /Users/syd08/Documents/tuzi-magpie-local/scripts/tuzi-magpie/tests/native-lifecycle.js
```

Run the second command only after the first passes and ports18341/18343 are
reusable. The runner refuses occupied ports; do not weaken that check or stop
unrelated applications. A previous completed lifecycle HOME is disconnected,
so start a fresh workspace run. These commands were checked against the script
interfaces; this particular user replay has not been executed.

Installed CLI acceptance uses installed Codex and official Claude executables
with generated isolated native Agent configs. The commands and sandbox
boundaries are in installed-cli-acceptance.md. No real account credential or
paid model is required or permitted by these checks.

## External gates and rollback

Real-service verification, Windows/Linux installation, user acceptance,
signing, publication and deployment remain separate future gates. Cross-OS
vet/build results do not claim an installation test. Website changes are local
only; the desktop manual account-token flow remains available without a
production website rollout. No remote repository or update feed is invented.

Rollback is local: close only the recorded acceptance PID, retain or remove
only its isolated output directory, and return to the untouched original
checkout/application. Keep the task branches and evidence for recovery.
Do not delete or reset the original Magpie/Agent data, change production
settings, rewrite upstream history, or uninstall the user's normal app.


## Known limits

Production window inspection passed through CUA on the actual isolated native
application: Agents and the disconnected four-tab Tuzi account page rendered.
Screenshots and a separate visual record are in production-start-03; the
startup checker's original uiVisuallyVerified:false remains unchanged because
that script itself performs no visual inspection. Owned PID25651/port18553
was closed after inspection. The unrelated preview on18543 was preserved.
Actual native DOM workflows, same-condition browser comparisons and process
startup remain separately recorded evidence.

Provider storage detects changed files before replacement, but compare then
rename is not a global atomic CAS against external writers that do not share
the lock. Existing image MCP jobs use their timeout and generation_result;
this change adds no separate cancel command. Credential auditing covers the
current source and locally available shallow history, not unavailable upstream
history. Real API behavior and paid models have not been exercised.
