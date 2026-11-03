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

## Approved proxy behavior correction

TestNoProxyDoesNotFallBackToSystem reproduces an inherited behavior: a
NO_PROXY-matched domain falls back to a configured system proxy. It selects
synthetic addresses without dialing anything. The unchanged production
netproxy.go returns http://127.0.0.1:18191 in the red test. The original GUI
proxy test also encounters this when the host has a system proxy.

The user explicitly approved the behavior fix. For preserves explicit
application settings and fromEnv's proxy/error selection, then checks bypass
before system fallback. The existing host matcher stays unchanged; standard
IP/CIDR matching also prevents a bypass from falling through to the system.
Provider-specific choices remain earlier in Func. The independent review and
port/domain/CIDR regression evidence are recorded in
[NO_PROXY compatibility review](no-proxy-review-account.md). The regression checks the bypass and explicit settings precedence.
The red evidence is retained. Focused netproxy tests passed1.567s and all
GUI TestProxyCheck cases passed3.302s under temporary HOME with pinned caches,
GOMAXPROCS2 and -p1. Log: /Users/syd08/Documents/tuzi-magpie-evidence/no-proxy-green.log.
The complete Go suite subsequently passed in full-go-02; no threshold or
original assertion was removed to make the bypass check pass.

## Complete Go recheck

`validate-local.py` completed all eight stages against fdfea5c plus the four
recorded, pending GUI test repairs on 2026-11-03. macOS/Linux/Windows vet and
build all passed. Complete `go test -tags nogui -count=1 -p2 ./...` passed
in745.82s (gateway555.005s; GUI69.552s). Tuzi, desktop-fixture, CLI and
NO_PROXY targeted race checks across eight packages passed in77.84s.
Evidence: `/Users/syd08/Documents/tuzi-magpie-evidence/full-go-02/`, including
source.json, source-diff.patch, results.json and unedited stage logs.

This covers that frozen source. Subsequent routing JavaScript integration
requires its browser checks and a fresh GUI embedded-source check/build;
these results do not claim later source or final native delivery passed.

## Final embedded-script budget

The complete GUI Go package at d225281 failed only TestCoreScriptBudget:
1533983 bytes exceeded the existing1533802-byte core budget after the approved
tray fix. Evidence is final-source-checks-01/gui-go.log. Six comments beside
flashCard, keepQuotaFlash and focusQuotaCard were shortened, retaining their
purpose without changing executable statements. Core scripts now total
1533736 bytes, below the unchanged budget. Node syntax and diff checks pass;
the complete GUI package and latest builds are rerun on this final comment edit.
