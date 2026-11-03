# AC-01 Agent configuration isolation

Scope: `internal/agent/**`, with the agent-wiring subsystem reference updated.
Worktree: `/Users/syd08/Documents/tuzi-magpie-account`.
Branch: `codex/tuzi-magpie-account`; parent identity commit `dd73b52`
(cherry-pick of root `dd2ca47`; root must not cherry-pick that identity twice).

## Behavior and recovery

An empty tuzi data directory cannot claim an Agent merely because its files
name the compatible `magpie` provider or its localhost gateway. Automatic
catalog updates, startup migrations, model-follow, rename/reseat/rewire,
Codex daemon and rollout maintenance, quit failover/relay, and dsh repair
require valid applied/stash evidence in this distribution's data directory.
Corrupt JSON is rejected as a whole by the existing shared record readers.
Cursor Local and Claude Science already store ownership marks in isolated
app data. The protocol name stays `magpie`.

Codex generated catalogs use `tuzi-magpie-models.json` and
`tuzi-magpie-desktop-models.json`; original Magpie catalogs remain intact.
Cross-package importer exclusions and GUI/profile fixtures are assigned to
the website agent/root for local integration.

Explicit Apply/Connect preserve the first primary configuration verbatim in
`agent-originals/<agent-id>.config` under tuzi app data. Names requiring path
sanitization also receive an ID hash. The directory is 0700 and files are
0600. Files are written and fsynced to a temporary name, then atomically
published with a non-overwriting hard link. Failure prevents the requested
config write. Existing backups must be readable private regular files on
Unix (Windows uses its inherited filesystem permissions). Disconnect keeps
these backups; it retains the original field-level restoration workflow.
For manual rollback, close both applications and the affected Agent, retain
any later intentional Agent edits separately, and copy the backed-up primary
config back to the path displayed in the Agents page. Original Codex catalog
files were not rewritten. No backup is automatically copied over newer edits.

Claude Desktop's explicit Connect/Apply retains its existing dependent
Claude Code/WSL configuration sync. That dependent sync now preserves the
original config, propagates errors, and records ownership. Native Aside's
explicit offline Stage follows the same backup/ownership boundary.

## Verification

All Go execution uses a temporary HOME/XDG directory and pinned caches:
`GOPATH=/Users/syd08/go`, `GOMODCACHE=/Users/syd08/go/pkg/mod`,
`GOCACHE=/Users/syd08/Library/Caches/go-build`. Fixtures and credentials are
synthetic; no live Agent files, accounts, inference or paid APIs are used.

The new `TestTuziStartupLeavesOriginalAgentsAlone` compares complete Agent
fixture trees, including Codex original catalogs and a rollout, before and
after startup migrations, SyncCatalog and quit maintenance. Restoring the
pre-fix `sync.go` and `codex.go` produced a real FAIL with
`startup changed original agent files`; restoring the patch follows that
negative control. An isolated gate-only mutation did not change this fixture
because the independent catalog name also protects its catalog branch; the
negative control therefore restores both relevant original source files.

Other new tests cover corrupted records, daemon write notifications before
and after ownership, explicit adoption and retained original catalog bytes,
backup failure blocking config writes, private non-overwriting backups,
and Claude Follow not modifying an unowned config during status polling.

The first whole agent suite exposed existing maintenance tests which wrote
connected configurations directly without local application records. Those
fixtures now explicitly represent an owned installation, or exercise the
public Apply operation. Their original maintenance assertions remain. The
first-start Codex fallback test now verifies that unowned Codex stays byte
identical before explicit Connect. One existing fixture's current-gateway
URL still said 3425; it was updated to this distribution's 3435.

Review: website agent independently inspected production diff, found the
initial backup-publication crash window, and verified the replacement with
private temp+fsync+non-overwriting link. Root owns final integration and
native acceptance; this record does not claim those checks passed.

The race subset passed (`ok .../internal/agent 9.209s`):
`go test -race -tags nogui ./internal/agent -run
'TestTuzi|TestCodexDisconnectStaysWithAccountsOn|TestModelNameAndLevelsReachAgentFiles|TestSuffixModesReachAgentFiles|TestSyncKeepsAnAddressOnAnotherMachine'
-count=1 -timeout 4m`.
Evidence: [negative control](evidence/agent-isolation-red.log) and
[race subset](evidence/agent-isolation-race.log).

The complete package passed on the final production code:
`go test -tags nogui ./internal/agent -count=1 -timeout 8m` →
`ok .../internal/agent 160.227s` ([full log](evidence/agent-isolation-full.log)).
An additional regression then verified an eligible synthetic rollout stays
byte-identical while unowned and is converted after ownership; the final
`TestTuzi` race run includes it and passed (`ok .../internal/agent 7.115s`;
[final race log](evidence/agent-isolation-final-race.log)).
`git diff --check` and `gofmt -l` on every changed Go file also passed.

Root still owns full-repository, cross-platform and native integration
checks. No real services, real Agent processes, Windows/Linux installation,
publish, push or deployment were attempted here.
