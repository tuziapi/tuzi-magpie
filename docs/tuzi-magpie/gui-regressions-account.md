# GUI regression repairs (2026-11-03)

Owner: account subagent. Worktree `/Users/syd08/Documents/tuzi-magpie-account`,
branch `codex/tuzi-magpie-gui-regressions`, base `633e64940d8b6781b0c638aaeab2619a2dc75682`.
The original checkout is untouched. No live credentials, model calls or deployment.

The first full Go suite exposed 20 GUI failures. The fixtures for configuration,
cache, CLI copies, process takeover, web manifest and version markers still named
Magpie after the independent application identity changed. They now use the
product identity, with protocol names, historical release-note bodies and original
icons kept. Release-note failure tests configure a synthetic distribution repository
so they still assert a usable fallback page without relying on upstream releases.
Quit's connected-agent fixture now records explicit ownership in isolated state;
its existing connected/not-connected assertions are kept.

The Tuzi manifest declares `integration.js` as a client, but index.html put it after
app.js. It now loads before app.js, following the same manifest contract as the
other clients. Its app helpers are used only inside callbacks, after startup.
The existing manifest test remains strict. This changes no layout or user flow.

The steady-GC test expects a small live heap to retune GOGC to 100 after a real
collection. A full GUI suite can retain over 64 MiB in model/history caches, where
production correctly chooses 50. The test now re-executes only itself in a fresh
isolated test process, with the same assertions and actual runtime collections.
No GC tuning or production memory behavior changes.

`TestProxyCheckSaysAProxyPassedBy` also exposed `netproxy.For` falling through from
NO_PROXY to macOS system proxy. The netproxy owner handles its policy/test
isolation; this branch leaves that production code unchanged and restricts the
proxy test dialer to its two synthetic listeners. A route regression can no longer
reach the host's actual system proxy.

## Validation and recovery

Evidence directory: `/Users/syd08/Documents/tuzi-magpie-evidence/gui-regressions-01`.
UI uses only existing synthetic Playwright fixtures, all five languages and both
1100/420 widths. Go test execution is queued by the parent, with isolated HOME and
pinned caches. Outcomes are recorded below when complete.

- `git diff --check` passed.
- Existing `tuzi-account.test.cjs`: 10/10 passed, Chromium and WebKit,
  123.29 seconds. Management scenarios use en, zh, zh-TW, ja and de at 1100/420.
  Evidence: `gui-regressions-01/ui.log`.
- Restoring HEAD's old index.html produces a real `TestBuiltinClientsLoaded`
  failure: `plugins/tuzi/integration.js isn't between kernel.js and app.js`.
  The fixed file was restored immediately. Evidence: `manifest-red.log`.
- `go test -tags nogui ./internal/gui -run 'Test(Builtin|CLIBehind|BlockedConfig|RepairOfAnother|GatewayHeldByAContainer|AppReplacesItsOlderGateway|PluginMarketInParts|ProviderInfoReadsTheListOnce|RestartBySelf|QuitListsWiredAgents|SteadyGC|WebApp|WhatsNew|ProxyCheck)' -skip TestProxyCheckSaysAProxyPassedBy -count=1 -v`:
  34 tests passed, 5.226 seconds. This covers 19 of the original 20 failures;
  the NO_PROXY behavior is explicitly excluded and remains parent-owned.
  Evidence: `targeted.log`.
- `go test -race -tags nogui ./internal/gui -run '^TestSteadyGCRetunesAfterACollection$' -count=20`:
  passed, 24.395 seconds. Evidence: `gc-race.log`.
- Test homes were removed, pinned Go caches retained. No process or port is left.
- Full integrated suites, platform checks and final application launch are the
  parent's remaining verification; this branch does not claim those passes.
