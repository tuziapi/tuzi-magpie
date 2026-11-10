# Tuzi unsigned desktop release

This is the release procedure for `tuziapi/tuzi-magpie`. It never publishes to
`yetone/magpie-releases`, changes repository visibility, enables automatic
updates, deploys the API site, or signs with a trusted developer certificate.
The repository is public; published Release assets are publicly downloadable.

## Build outputs

The manually dispatched `Tuzi unsigned desktop packages` workflow builds:

| Platform | Assets | Runtime target |
| --- | --- | --- |
| macOS Apple Silicon | arm64 DMG | macOS 12+ |
| macOS Intel | amd64 DMG | macOS 12+ |
| Windows | amd64 setup EXE; amd64 and arm64 portable ZIPs | 64-bit Windows with WebView2 |
| Linux | amd64 DEB | Ubuntu 24.04, GTK 3, WebKitGTK 4.1 |

The macOS bundle has an ad-hoc integrity signature, not Developer ID signing or
notarization. The Windows installer is per-user and requires no administrator
privileges. Uninstall removes only the application's known files and preserves
accounts, settings and files the user added. Portable archives opt into the
existing isolated `tuzi-magpie-data` storage. The Linux package adds no APT feed.
See [installation instructions](unsigned-install.md) for user-facing limits.

`scripts/tuzi-magpie/package-release.py` builds only from a clean committed tree,
accepts `vX.Y.Z` and `vX.Y.Z-beta.N` versions and records the exact source commit and SHA-256
of each asset. All binaries carry the Tuzi repository URL. The existing original
application icon, licenses and upstream attribution are retained.

The workflow verifies DMG integrity and ad-hoc signing; on Windows it installs
and uninstalls the actual package and checks user-file preservation; on Linux it
installs the DEB, executes its version command, and uninstalls it. These checks
are not interactive desktop acceptance tests.

## Publication gates

1. Resolve known failures and run the repository's required checks at the exact
   proposed release source. The `Test` workflow must complete successfully.
   Include Chromium/WebKit coverage and explicitly describe remaining native
   platform and real-account integration limits. A build is not a test pass.
2. Put the reviewed source and build workflow on the Tuzi repository's `main`.
   Fetch tags from `tuzi` and select an unused version. Do not tag upstream.
3. Dispatch the packaging workflow at that source after its checks are green:

   ```sh
   gh workflow run tuzi-unsigned-build.yml -R tuziapi/tuzi-magpie \
     --ref main -f version=vX.Y.Z
   ```

4. Wait for every matrix job to pass; download the four artifact groups into a
   single empty staging directory. Check that their source commit is the commit
   intended for the release, then verify all six installers/archives:

   ```sh
   python3 scripts/tuzi-magpie/verify-release.py \
     --directory /absolute/path/to/staging --version vX.Y.Z \
     --commit FULL_40_CHARACTER_SOURCE_COMMIT
   ```

   This rejects missing assets, incorrect source/version/repository metadata and
   mismatched file sizes/hashes, and writes `SHA256SUMS.txt` only on success.
5. Create a version tag at that verified commit on `tuzi/main`. Create a draft GitHub
   Release, upload the six assets, four manifests and `SHA256SUMS.txt`, then
   verify the downloaded assets match. Publish `vX.Y.Z` as a regular Release, or `vX.Y.Z-beta.N` as **Pre-release**, not Latest.
   State unsigned status, tested systems, untested systems, and that API-site
   deployment/real-account integration are not part of this delivery.

Do not publish partial platform output or hide a failed check by marking a run
successful. The packaging workflow itself has read-only repository permissions
and uploads build artifacts; it cannot create a public Release.

## Infrastructure blocker confirmed 2026-11-06

GitHub run [42174638660](https://github.com/tuziapi/tuzi-magpie/actions/runs/42174638660)
failed before any job started. The administrator-facing message supplied by the
user is:

> The job was not started because recent account payments have failed or your
> spending limit needs to be increased. Please check the 'Billing & plans'
> section in your settings.

An organization billing administrator must resolve the payment/spending limit.
The current collaborator can push code but cannot manage organization billing.
Changing YAML, rerunning repeatedly, or obtaining signing certificates will not
resolve this startup failure. No tag or published Release is evidence of success
until the build and validation gates above have passed.
