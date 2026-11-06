# Unsigned prerelease preparation — 2026-11-06

Status: **local artifacts prepared; not published**. No release tag, published
Release, API-site deployment or automatic update feed was created.

The initial packaging candidate source is `715bc671c52069d178e43dd8de20a875ea3d8f36`, based on
Tuzi `main` at `9ac31d9678f5b70e9bd29a312357528576e100ea`. The remote review branch is
`codex/tuzi-unsigned-release`. The existing UI preview and daily account/config
folders were not modified. This document is a later documentation-only commit;
the six original assets all identify the initial candidate source above.

## Changes

- `giveUp` snapshots known waits before flushing its timeout response. A client
  can close the connection upon receiving that response, ending its waits before
  `heldReport` reads them. Previously the saved report could lose “(under way)”.
  The deterministic regression ends a wait at the flush boundary; it fails before
  the fix and passes afterward. Routing, response codes and timeout limits are
  unchanged. See the [routing reference](../subsystems/gateway-routing.md) and
  upstream [issue 4300](https://github.com/yetone/magpie/issues/4300), including
  its comments read during diagnosis.
- Desktop tests now expect the fork's existing `tuzi-magpie` window/icon/desktop
  identity, `tuzimagpie` scheme and `tuzi-magpie-data` portable folder. A Linux
  fixture additionally checks that an original `magpie.desktop` is preserved.
  These corrections change no application storage or UI behavior.
- Added manually dispatched packaging, per-user Windows installation, manifests,
  checksum verification and [unsigned installation instructions](unsigned-install.md).
  Native packaging exposed insufficient hdiutil automatic image sizing and NSIS
  quoting warnings; both were corrected and the packages rebuilt. NSIS warnings
  now fail the build.
- The local full Go test runner uses the same 30-minute package timeout as the
  existing CI. The earlier DSML case passes alone in 7.89 seconds, and the full
  gateway package passes in 558.773 seconds. No assertion or individual test
  timeout was weakened.

## Validation completed

| Check | Result |
| --- | --- |
| macOS vet; Linux nogui vet; Windows vet | Pass |
| macOS desktop build; Windows cross build; Linux nogui build | Pass |
| Full `go test -tags nogui -count=1 -timeout 30m -p 2 ./...` | Pass, 827.93 s |
| Tuzi fixture/race checks across eight packages | Pass, 61.95 s |
| Held-report tests with `-race -count=20` | Pass; deterministic regression fails on old code |
| Full macOS `go test ./internal/gui -count=1 -timeout 10m` after fixture corrections | Pass, 113.519 s |
| Linux desktop identity/scheme checks | Pass in Ubuntu 24.04 ARM64 and x64 containers |
| `side-effort` and `click-scroll`, original assertions, Chromium and WebKit | 34/34 pass; protocol log retained |
| Workflow lint | actionlint 1.7.12 passes |
| Release-script syntax and manifest verifier | Pass; synthetic altered/missing assets rejected |
| macOS DMGs, both architectures | Build, architecture check, ad-hoc signing and hdiutil verification pass |
| macOS ARM64 executable version | Executed and correct; Intel version execution not performed on this ARM host |
| Windows x64/ARM64 programs and portable ZIPs | Cross-built; PE architectures and ZIP integrity/content checked |
| Windows setup executable | NSIS compilation succeeds with warnings treated as errors |
| Linux x64 DEB | GTK desktop build, dependency resolution, package installation, version command and uninstall pass |
| Complete asset set | Six assets and four manifests verified at the same candidate commit; SHA256SUMS.txt generated |

Go checks used temporary homes with caches pinned. The full nogui run began at
`9ac31d967` with the recorded patch that became `7b8a3ae96`; subsequent production
Go code did not change. The later desktop-test corrections were covered by the
full native GUI rerun and Linux-specific runs. Packaging changes were exercised
by actual packaging and package-format checks, as listed above.

The Linux x64 execution used Docker emulation on an ARM Mac, not a physical x64
Linux desktop. Linux ARM64 checks also used a container. Neither constitutes a
Wayland/X11 interactive window check. Windows installation/uninstallation and
interactive application launch have **not** been executed on Windows; the new
workflow includes native silent install/uninstall and user-file-preservation
checks for when Actions becomes available.

## Local artifacts and evidence

All six candidate files, four build manifests and `SHA256SUMS.txt` are in:

`/Users/syd08/Documents/tuzi-magpie-tools/release-20261106/final-packages/`

Artifacts:

- `tuzi-magpie-v0.1.0-beta.1-macos-arm64.dmg`
- `tuzi-magpie-v0.1.0-beta.1-macos-amd64.dmg`
- `tuzi-magpie-v0.1.0-beta.1-windows-amd64-setup.exe`
- `tuzi-magpie-v0.1.0-beta.1-windows-amd64-portable.zip`
- `tuzi-magpie-v0.1.0-beta.1-windows-arm64-portable.zip`
- `tuzi-magpie-v0.1.0-beta.1-linux-amd64.deb`

Evidence in the parent directory includes `validation/results.json`, the stage
logs and original source patch, `held-red.log`, `held-race.log`,
`gui-go-native-fixed.log`, `gui-bounded-protocol.log.gz`, `linux-native.log`,
`linux-amd64-build.log`, `linux-final-build.log`, `nsis-final.log`,
`windows-final-build.log`, `ship-macos-arm64.log`, `ship-macos-amd64.log` and
`actionlint-final.log`. Earlier attempt logs/directories are diagnostic evidence,
not the final artifact set.

The Windows manifest explicitly records cross compilation and that native
installation has not been verified. No user accounts, credentials or live
configuration are included in the package layouts.

## Still required before publication

1. The organization administrator must resolve the confirmed failed-payment or
   spending-limit block in GitHub **Billing & plans**. Run
   [42174638660](https://github.com/tuziapi/tuzi-magpie/actions/runs/42174638660)
   started no jobs. This is an infrastructure failure, not a certificate issue.
2. Complete green `Test` and packaging workflow runs, including native Windows
   installer verification, at the reviewed candidate or a containing commit.
3. Complete the full browser regression gate. The 34 focused passes above do not
   explain the two historical anomalies, supersede the frozen failed full run,
   or close F01/F11 in [closing-blockers.md](closing-blockers.md). No retry,
   assertion relaxation or purported root-cause inference was used.
4. Publish as a **Pre-release**, with unsigned/unnotarized status, actual tested
   platforms and API integration limits. Follow [the release procedure](unsigned-release.md).

API-site deployment and real-account/paid-request integration were explicitly
excluded by the user. They remain unverified and must be described as such in
beta release notes. The repository is private, so its eventual Release will be
available only to authorized repository users unless its administrator separately
chooses a public distribution destination.

## Refreshed local packages after browser corrections

The latest local six-asset set identifies
`03e8af852475351249fc0100c088839d7fb40a03` and lives separately in
`/Users/syd08/Documents/tuzi-magpie-tools/release-20261106/candidate-packages/`.
Use this directory for current local review; `final-packages/` above is the
retained earlier candidate, not the newest UI build. The version string is the
same proposed beta; neither set has been published or tagged.

This candidate adds only the documented Tuzi gutter/sidebar spacing fixes and
browser-fixture corrections. See
[browser validation](browser-release-validation-2026-11-06.md) for the failing
frozen suite, successful focused checks and unresolved failures. No further
production Go code changed after the recorded full Go/race validation.

All six refreshed artifacts and four manifests pass the complete set verifier,
which produced `SHA256SUMS.txt`. Both macOS DMGs pass architecture, ad-hoc
signature and disk-image verification; ARM64 executes its version command.
Both Windows PE architectures and portable ZIP integrity/content pass; the
installer compiles with NSIS warnings treated as errors. The Linux GTK binary
has no unresolved linked dependencies, and the DEB installs, reports the version
and uninstalls inside the Ubuntu 24.04 x64 container. The Windows manifest still
explicitly says native installation was not verified.

`candidate-package-results.json` and `candidate-*.log` in the evidence directory
record each completed build/verification stage. The first dependency bootstrap
hit Ubuntu HTTP 502 errors; a mirror retry completed successfully. Source and
artifacts were not changed to bypass a check.

The candidate branch is pushed to draft
[PR 1](https://github.com/tuziapi/tuzi-magpie/pull/1). Main is unchanged. Billing,
Windows native verification and unresolved browser regressions remain publication
gates. API-site deployment and real-account integration remain explicitly excluded
and unverified; beta notes must retain that limitation.
