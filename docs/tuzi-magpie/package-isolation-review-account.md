# Independent review: data migration and regression repairs

Reviewer: account subagent (not implementation author of the three reviewed
commits). Reviewed commits: `516cf21bb393b0af0b0e0316bf6a2385d6cc1ec7`,
`92b9fe2fed251626968f49d89b5b00bca69fdc74`,
`64c19093108a62c1666cf62cc9d8322560c0ac28`.
Reviewed integrated source at `2a4eb246fb7b4b8d99d591d4c935930918929f70`;
follow-up work uses branch `codex/tuzi-magpie-update-isolation` based on
`55a6ae5`, in `/Users/syd08/Documents/tuzi-magpie-account`.

## Findings on the reviewed changes

No blocking defect found in the three commits' actual changes.

- `settings.Migrate` was only the historical dial-to-Magpie folder migration,
  not the settings schema migration machinery. Its old config destination
  followed `Dir()`, which now names tuzi-magpie; its old cache destination
  still named original Magpie. Removing both automatic copies follows AC-01.
  The no-op has no filesystem operations and cannot read or mutate old account
  files. `cli.startUp` still performs plugin settling and own-provider folding;
  Agent migrations retain the separately reviewed ownership guards. `copyTree`
  now has no production caller; its tests preserve recursive-copy behavior.
  Corrected the implementation record's startup-directory explanation:
  `makeDirs` creates environment base folders, not guaranteed app subfolders,
  and therefore was not a reliable protection against the old config copy.
- `TestTuziMigrateLeavesOtherApplicationsAlone` checks both old application
  names, new-folder absence, original bytes and timestamps. The saved negative
  control fails on adopted tuzi state and extra directories. The test checks
  effects, while the no-read conclusion additionally follows from inspection
  of the empty hook; absence of effects alone is not proof of no reads.
- Provider/cache/portable/stats fixture changes use the actual independent
  directories and default port without deleting capability, import, overwrite
  or custom-port assertions. Plugin host address checks still load the real
  synthetic plugin and compare all three addresses. Setting both polling
  intervals to zero removes dependence on whether macOS has a system proxy;
  production polling behavior is unchanged.
- `TestCopiedPassKeepsItsDecodeBuffer` calls real `visitBlocks`, validates
  8,000 rows per pass, forces two collections per cycle, and checks both the
  retained rowBuffer and decoded-byte backing address. `ReleaseScratch`
  isolates pre-existing retained buffers and cleans up. `chunkRows.of` passes
  that decoded slice to unpackReusing, and release returns the same object to
  keptRows. This catches the original copied-pass sync.Pool regression; the
  saved red control actually fails because decoded bytes were not retained.
  The check is intentionally about retained storage, not a general assertion
  that every possible pass allocation is bounded. Existing allocation
  benchmarks remain. The old GC-inclusive AllocsPerRun assertion counted
  unrelated runtime allocations; its removal does not hide this regression.

Reviewed saved evidence (not rerun during this static review):
`lines/migration-red.log`, `lines/migration-usage-green.log`,
`lines/usage-buffer-red.log`, `lines/usage-buffer-race20.log`, and
`docs/tuzi-magpie/package-regressions.md`.

## AC-01 / AC-13 follow-up defects found and addressed

The wider review found CLI update paths not covered by the automatic GUI
handover distribution guard. After replacing its own binary, `restartRunning`
posted to the selected gateway without checking its distribution. If that port
belonged to original Magpie and its binary had separately been replaced, the
request could trigger the original app's pending restart. The follow-up now
requires the selected gateway's successful complete identity response to name
this distribution before any restart POST; unknown identity fails closed and
neither discovery nor mutation follows redirects.

The post-update CLI repair command also named the original `magpie` binary
inside this distribution's bundle. It now names `tuzi-magpie`, matching the
actual Info.plist, and quotes paths so a copied command is correctly relinked
when bundle/destination folders include spaces or apostrophes. The container
error's executable `docker pull ghcr.io/yetone/magpie:latest` suggestion has
been removed in favor of this distribution's own deployment documentation.
No image address is invented.

These follow-up changes are implemented by this reviewer and therefore need
the parent's independent diff review. They do not independently close AC-01
or AC-13: integrated Go/GUI suites and final native production checks remain
parent-owned gates. Cross-platform build checks are not installation tests.

## Validation and recovery

No real account files, running daily application, external update feed,
payment, model or deployment was used. New tests use httptest and temporary
files; the link test executes only its synthetic ln command. Large tests
remain in the parent-managed queue. Outcomes will be appended when run.

Validation completed for implementation snapshot
`6c06fa9e21ab302c58c035245dc1a1f869a36908`:

- Parent independently reviewed the actual diff before granting the short
  test slot. No shared gateway file was modified.
- Temporary restoration of the original restart function, original bundle
  executable name and original container suggestion produced real failures
  in all four affected test groups. Original/foreign/unknown servers received
  an unauthorized restart POST; a restart redirect was followed; the emitted
  link targeted `MacOS/magpie`; the container message named the upstream
  image. This was a behavioral negative control, not a compile failure.
  Package test duration: 1.981 seconds. The fixed source was restored in a
  finally block before the green run.
- `go test -p 1 -tags nogui ./internal/cli -run
  'TestTuziUpdate|TestTuziStaleCLI|TestUpdateAsks|TestUpdateInContainer'
  -count=1 -v` passed all five top-level tests and their table subcases.
  Package test duration: 1.809 seconds; wall time including compile: 8.01 seconds.
- Both runs used `GOMAXPROCS=2`, temporary HOME/XDG and pinned Go caches
  (`/Users/syd08/go`, `/Users/syd08/go/pkg/mod`,
  `/Users/syd08/Library/Caches/go-build`) alongside the parent-managed GUI queue.
- `go test -n -race ...` reported 71 compile/cgo actions. Per queue direction,
  the actual race run was deferred rather than competing with the full GUI
  suite. No race pass is claimed. No production goroutine was introduced.
- `gofmt` and `git diff --check` passed. Temporary homes were removed;
  no test process, synthetic server or port remains.

Evidence: `/Users/syd08/Documents/tuzi-magpie-evidence/update-isolation-01/`
contains `red.log`, `green.log`, and `race-dry-run.log`. Full integrated
verification remains a separate parent gate.
