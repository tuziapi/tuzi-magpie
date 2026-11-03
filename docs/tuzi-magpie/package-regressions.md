# Remaining package regression repair

The task branch `codex/tuzi-package-regressions` starts at integration
`633e649`, in `/Users/syd08/Documents/tuzi-magpie-lines`. This follows the
first full Go run's failures; no original checkout or user data was changed.

## Production boundary

`settings.Migrate` is now an empty startup hook for this independent
application. The inherited hook tried to copy old `dial` configuration to
`Dir()` when absent and old cache to the hardcoded `magpie` cache directory.
The normal startup creates its own config directory first, which can prevent
the config copy, but does not make the inherited cache write safe. Neither
old application's data belongs to this distribution's automatic migration.

`TestTuziMigrateLeavesOtherApplicationsAlone` creates synthetic `dial` and
Magpie config/cache files, pins their timestamps, then verifies no extra
folder, no adopted tuzi data, and unchanged bytes/timestamps. Restoring the
original migration function made the test fail with an adopted tuzi config
and an extra folder. The fixed function passed. The original recursive copy
algorithm and its file-mode, nested-file, original-retention and overwrite
assertions remain as `TestCopyTree`; it is not called at startup.

## Fixture repairs

- Provider catalog fixtures create `catalog.CachePath`'s parent. The model
  capability, effort, endpoint, price and import assertions remain.
- The redirected-config fixture uses the active distribution name. Gateway
  import fixtures use the independent default port 3435, while explicit
  custom-port tests still exercise their configured values.
- Portable settings use the distribution's portable folder and independent
  installed path; the original Magpie profile must remain untouched.
- Partner statistics use `appdir.Cache` for synthetic fixture data. This
  changes no telemetry production code or event content.
- The plugin host address fixture disables both proxy polling intervals;
  previously only the no-proxy interval was disabled, so a system proxy
  could leave it reading the old address before the 15-second poll. It still
  checks real plugin startup, port changes and an explicit address override.

## Decode-buffer assertion

The original `TestCopiedPassKeepsItsDecodeBuffer` failed under the full run
and once in `-race -count=20`, reporting 5 allocations instead of 4. A local,
subsequently removed diagnostic measured GC-only, visit-only and combined
callbacks: GC alone could report 5 allocations; visit alone reported 4 or 7.
`testing.AllocsPerRun` counts process-wide allocations, including runtime
activity. No production buffer regression was found.

The test now checks the guarantee directly: `visitBlocks` retains the same
decoded-byte backing storage across five pairs of forced collections, and
all 8,000 rows read back correctly on each pass. The existing allocation
benchmark remains unchanged. Restoring the old copied-pass path through
`sync.Pool` made the new assertion fail with “the copied pass did not keep
its decoded bytes”. The final test passed `-race -count=20` (4.038 s).

## Validation

All commands used temporary HOME, pinned GOPATH/GOMODCACHE/GOCACHE,
GOMAXPROCS=4 and serialized queue ownership. Focused original failures passed
in provider (2.031 s), plugin (2.463 s), settings (2.337 s), stats (1.697 s),
and usage (1.437 s). Final restored migration and buffer checks passed
settings (1.246 s) and usage (1.451 s). `gofmt` and `git diff --check` passed.

Evidence in `/Users/syd08/Documents/tuzi-magpie-evidence/lines/`:

- `packages-focused.log`
- `migration-red.log`, `migration-usage-green.log`
- `usage-allocation-race20.log` (pre-fix failure)
- `usage-allocation-probe.log`, `usage-allocation-probe2.log`
- `usage-buffer-red.log`, `usage-buffer-race20.log`

Complete provider/plugin/settings/stats/usage package reruns and the final
integrated whole suite remain root-owned gates. Focused success is not a
claim that those gates have passed.
