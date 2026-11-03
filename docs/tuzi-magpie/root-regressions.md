# Root regression repairs

The first complete Go run exposed stale default-port and config-directory
fixtures, an installed Codex version newer than a pinned request fixture,
and a Unix-domain socket path longer than macOS permits.

- The gateway URL fixture now expects the independent default3435.
- The proxy settings fixture uses product.Name for the config directory.
- The Codex client-version test sends a deliberately newer synthetic99.161.0
  and runs in a subprocess, keeping observed client versions out of other
  tests. Exact User-Agent and version assertions remain.
- The complete-check runner uses a short /tmp/tmg-* HOME/TMPDIR, allowing
  real handoff sockets to bind without changing handoff implementation.

Serialized validation on2026-11-03 passed gateway focused tests, complete
internal/handoff and the original TestFor. Evidence is in
/Users/syd08/Documents/tuzi-magpie-evidence/root-focused-01.

The first mutation, omitting gateway.SawCodexClient, did not fail because
provider.codexSign also preserves the incoming version directly. The
meaningful mutation forced codexSign to its old fallback0.159.0: the test
failed with HTTP400 and exact stale User-Agent/version values. Restored
signing passed. No production signing change remains.

## Pending proxy behavior decision

TestNoProxyDoesNotFallBackToSystem reproduces an inherited behavior: a
NO_PROXY-matched domain falls back to a configured system proxy. It selects
synthetic addresses without dialing anything. The unchanged production
netproxy.go returns http://127.0.0.1:18191 in the red test. The original GUI
proxy test also encounters this when the host has a system proxy.

The user was asked to choose a behavior fix or test-system isolation plus
a known-limit record, because original behavior changes require their
confirmation. No product proxy edit is made while that answer is pending.
The proposed regression test remains uncommitted until the decision.
