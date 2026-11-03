# Local delivery and acceptance

Status: closing freeze. The c7238e1 candidate production build and actual
startup pass; the complete GUI suite finished red and finite repairs remain.
The approved F14 product repair at cadfb77 requires a fresh final build;
the saved c7238e1 bundle is not that build.
This document does not claim final acceptance. See acceptance.md
for the current AC-01–16 matrix and recovery.md for the latest continuation.

## Checkouts and paired source

Development is delivered in `/Users/syd08/Documents/tuzi-magpie-local`, branch
`codex/tuzi-magpie-local`. The original `/Users/syd08/Documents/tuzi-mapie`
remains at2251ca1ce93a837aa31df1158fa9d58437268a71 with its existing .DS_Store.
The final integrated SHA will be recorded after required checks and repairs.

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
selects the repository's Go1.26.8 toolchain. The current candidate is version c7238e1, source
c7238e14891f917b67d80209857d3d1db4cb4c42, executable SHA256
`f53209fed0866b97b610fd715ab9496de59645569e888712f8d2885e24358472`.
Evidence is `final-source-checks-03/artifact.json` and `production-start-02`
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
  --keep-open
```

The checker starts a copied bundle through macOS LaunchServices, gives it
private empty configuration, denies real HOME/keychain access and non-loopback
network, and uses port18543. It checks the precise app PID owns the gateway.
If the directory or port is already used, choose a new directory or stop only
the recorded test process; do not stop an unrelated application. Without
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
  --app /Users/syd08/Documents/tuzi-magpie-evidence/native-visibility-fixed-build/tuzi-magpie-fixture.app/Contents/MacOS/tuzi-magpie \
  --fixture /Users/syd08/Documents/tuzi-magpie-evidence/native-visibility-fixture/tuzi-fixture \
  --output /Users/syd08/Documents/tuzi-magpie-evidence/native-user-workspace-01 \
  --script /Users/syd08/Documents/tuzi-magpie-local/scripts/tuzi-magpie/tests/native-workspace.js

python3 scripts/tuzi-magpie/native-acceptance.py \
  --app /Users/syd08/Documents/tuzi-magpie-evidence/native-visibility-fixed-build/tuzi-magpie-fixture.app/Contents/MacOS/tuzi-magpie \
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

Production window visual inspection remains unclaimed because macOS was
locked. Actual native DOM workflows, same-condition browser comparisons and
production process startup are separate evidence.

Provider storage detects changed files before replacement, but compare then
rename is not a global atomic CAS against external writers that do not share
the lock. Existing image MCP jobs use their timeout and generation_result;
this change adds no separate cancel command. Credential auditing covers the
current source and locally available shallow history, not unavailable upstream
history. Real API behavior and paid models have not been exercised.
