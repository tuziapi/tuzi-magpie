# Preview defaults and release readiness (2026-11-04)

The user requested the original Magpie Dock icon/behavior, Simplified Chinese
by default, and an assessment of future cloud builds and publishing.

## Changes and diagnosis

- The production preview launcher previously wrote a partial settings file
  with `lang: en` and no `dockSettled`. `settings.settleDock` correctly treated
  that file as a legacy choice of Hide. Native inspection confirmed Hide was
  selected. This was a preview configuration error, not a missing icon asset.
- The launcher now writes `dockSettled: true` and leaves language unset. A
  fresh preview uses the same With window Dock behavior as a fresh original
  Magpie install. Existing user settings are not rewritten by this script.
- `settings.normal` defaults an unset language to `zh`. Explicit language
  choices, including `system` and `en`, remain unchanged. Resetting the language
  uses Simplified Chinese. `/boot.js` already supplies the normalized setting
  before the first paint, and native menus use the same setting.
- `magpie.icns`, `Assets.car` and `icon-1024.png` remain byte-identical to
  upstream `2251ca1`; the rebuilt bundle contains the same icon resources.

## Verification

- Before the language change, `TestTuziDefaultLanguage` failed with
  `reset default language = "system", want zh`; the updated `TestRoundTrip`
  failed on the previous default as well.
- `go test -tags nogui ./internal/settings ./internal/settingsapi -count=1`
  passed. The language regression covers the first launch, reset default,
  empty setting and persistence of every supported explicit language.
- `go test -tags production ./internal/gui -run 'Test.*(Tuzi|Boot|Lang|Dock|Settings)' -count=1`
  and `go test -tags nogui ./internal/cli -run 'Test.*Settings' -count=1` passed.
- `make app TAGS=production VERSION=9585a49-local-zh` passed, with existing
  Objective-C enum/linker warnings. This is based on `9585a49` plus local changes.
- Full-tree vet passed for macOS (`production`), Linux (`nogui`) and Windows.
  Linux (`nogui`) and Windows (`production`) cross-builds passed. Logs are in
  `/private/tmp/tuzi-defaults-checks-_fvtfpo9/`; these are not native installation
  tests on those operating systems.
- The updated production launcher passed its exact-PID gateway and account
  HTTP isolation checks. Native UI inspection independently confirmed Chinese
  on first launch and With window selected without changing a preference.
  The running app has an icon and macOS activation policy 0 (regular/Dock).
  The launch script's `uiVisuallyVerified: false` remains truthful: the script
  itself does not inspect the UI.
- Startup record: `/private/tmp/tuzi-magpie-preview-20261104-02/result.json`.
  Preview PID at launch: 50792; port: 18553. Only this chat's preceding preview
  PID 48444 was stopped. The unrelated preview on 18543 remains untouched.
- New executable SHA256:
  `6c62f48354e8eb2ec0b3e36615decac86dfa6e48ef61a51df5e59fcd91c66777`.

The previous full-suite acceptance is not replaced by these focused checks.
The unresolved F01/F11 findings in `closing-blockers.md` remain open. Real
service integration, payment, publishing and remote CI were not exercised.

## Cloud build and release assessment

At this checkout, `origin` still names `https://github.com/yetone/magpie.git`.
The only active GitHub workflow is `test.yml`: pushes to `main`, pull requests
and manual dispatch run its checks. It does not publish the desktop installers.
The release, Docker, notes mirror, UI preview and privacy workflows have
`.disabled` suffixes and do not run. The retained release workflow dispatches
to `yetone/magpie-releases` and depends on that upstream repository's publishing
and signing setup; it must not simply be renamed and enabled for this fork.

Before pushing a release, select the owned Tuzi repository and configure its
build/package workflow, release destination, permissions and artifact names.
Configure macOS Developer ID signing and notarization for the normal trusted
download experience (unsigned development artifacts are a separate option).
Configure and verify the independent update/notes feeds and checksums; updates
are deliberately disabled by default. Follow `repository-configuration.md`.
Resolve the existing acceptance blockers before calling a version release-ready.

Cross-compilation and local startup demonstrate build capability only. They do
not demonstrate a successful GitHub Actions run, signed installer or release.
No remote, workflow publishing destination or release was changed in this task.
