# NO_PROXY independent review and compatibility repair

Reviewed commit: `a4cf2be401a0c65a0e17d23824e0b459dd3bb6f0`.
Reviewer: account subagent, not its implementation author. Follow-up branch:
`codex/tuzi-magpie-proxy-compatibility`, based on that commit, in
`/Users/syd08/Documents/tuzi-magpie-account`.
The user approved matching NO_PROXY destinations not falling back to the
system proxy; the parent authorized the compatibility and CIDR follow-ups.

## Review findings

Explicit provider choice remains in `Func` before `For`; explicit application
proxy/direct remains before environment handling in `For`. Loopback, held
requests and dedicated provider transports are unchanged.

The initial patch did change HTTP(S)_PROXY matching unintentionally. Its
pre-environment `noProxy` helper ignores entry ports and treats leading-dot
entries as matching the root domain. Go's HTTP(S) environment matcher preserves
ports and makes a leading dot match subdomains only. Thus an existing HTTPS
proxy for `api.example.com:8443` with `NO_PROXY=api.example.com:443`, or for
`example.com` with `NO_PROXY=.example.com`, became a direct request. Equivalent
HTTP cases had the same regression. The new test failed in all four cases
on a4cf2be, while the four matching-port/subdomain direct cases passed.

Moving the host check after `fromEnv`'s nonnil/error return fixes that without
changing the old environment matcher or its caching. It still fixes the
approved host-to-system fallback defect.

A fresh-process diagnostic also confirmed the CIDR sibling: with HTTPS_PROXY
set and `NO_PROXY=192.0.2.0/24`, standard `http.ProxyFromEnvironment` returned
nil for `https://192.0.2.7`, but `For` returned the synthetic system proxy.
The old host-only helper does not understand CIDR. This is now a formal
regression, together with HTTP, IPv6, absent-environment-proxy and outside-range
cases. Before the final fix, all four matching CIDR cases genuinely failed.

The final `environmentBypass` helper preserves the old `noProxy` first, then
uses `golang.org/x/net/http/httpproxy.Config` solely to recognize a standard
URL bypass. It supplies only NoProxy and fixed synthetic HTTP/HTTPS proxy URLs
so the resulting nil means a bypass. It performs no request and never returns
the synthetic proxy. Empty lists and non-HTTP(S) schemes do not acquire new
standard matching behavior. The existing `fromEnv` implementation and its
nonnil/error precedence are unchanged, including ALL_PROXY's existing matcher.
This is a system-fallback correction, not a rewrite of ALL_PROXY semantics.

## Verification

All short tests used `GOMAXPROCS=2`, `go test -p 1`, temporary HOME/XDG and the
pinned caches `/Users/syd08/go`, `/Users/syd08/go/pkg/mod` and
`/Users/syd08/Library/Caches/go-build`. The subprocess fixtures set each HTTP(S)
environment before net/http reads it, avoiding cross-case environment caching.
All proxy addresses are synthetic. These tests select routes without dialing.

Evidence directory: `/Users/syd08/Documents/tuzi-magpie-evidence/no-proxy-review-01/`.

- `matching-red.log`: a4cf2be failed the four HTTP(S) mismatched-port/root-domain
  cases, package 1.666 seconds.
- `matching-green.log`: the minimal ordering fix preserved the eight domain/
  port cases and existing host/system fallback assertions, 1.504 seconds.
- `cidr-observation.log`: standard nil versus system-proxy result, 1.308 seconds.
  The temporary observation file was removed after formal regressions replaced it.
- `cidr-red.log`: four formal CIDR direct-route cases failed on the ordering-only
  fix, 1.650 seconds; the original eight cases and outside-CIDR cases passed.
- `final-green.log`: all 14 subprocess cases and existing
  `TestNoProxyDoesNotFallBackToSystem`, `TestAllProxyFromTheEnvironment`, and
  `TestNoProxyList` passed, 1.723 seconds (5.14 seconds wall including compile).
- `gofmt` and `git diff --check` passed. No full package, race recompilation,
  browser run, real proxy request or real service was used in this follow-up.
  No temporary home, child process, synthetic listener or port remains.

The parent retains independent review of this follow-up and the final integrated
full-suite gate. The original root focused netproxy/GUI evidence is additional
background, not a claim that the final follow-up has already passed the full suite.
