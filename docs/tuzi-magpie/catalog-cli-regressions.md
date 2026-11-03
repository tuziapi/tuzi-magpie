# Catalog and CLI identity regression repair

Task branch `codex/tuzi-catalog-cli-regressions` starts at root integration
`a2c6b76`. Earlier `codex/tuzi-magpie-lines` commits remain on that branch;
no branch or worktree history was reset. This repair changes fixture setup
and identity-specific expectations only; it does not change production logic
or relax the functional assertions.

The integrated full-Go run in
`/Users/syd08/Documents/tuzi-magpie-evidence/full-go-01/test-all.log` exposed:

- Catalog tests created the old cache subdirectory but wrote through
  `CachePath`, which now correctly selects the tuzi-magpie directory. The
  fixture now creates the parent of the exact file it writes. Existing
  model/pricing/capability/performance assertions remain intact.
- Cached CLI account tests, plugin option tests and the moved Zed provider
  test wrote their synthetic quotas/plugins/migration records to the old
  config directory. Fixtures now use the current distribution path, including
  the account test's isolated subprocess. Credential and plugin semantics are
  unchanged.
- Daemon argument tests still expected the old default page port 3430.
  Default-only expectations now pin the agreed independent port 3440.
  Explicit user ports retain their old values and assertions.
- Daemon status and TLS reinstall tests placed the synthetic service file
  under the old systemd name/macOS bundle identifier. They now name this
  distribution's actual service. The status test deliberately retains its
  explicit 3430 service address, checking that the new default never replaces
  a saved address. TLS retention/removal assertions are unchanged.

There was no evidence of a production cache reader, plugin loader, daemon
parser or TLS restoration defect in these failures. The original tests remain
the behavior regressions; the full-run failures are the pre-fix evidence.
Verification results will be added after the serialized test queue is free.
