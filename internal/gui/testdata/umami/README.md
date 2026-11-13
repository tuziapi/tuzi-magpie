# Umami SDK fixture

`script.js` is the unmodified response from https://umami.tu-zi.com/script.js,
retrieved 2026-11-13. It is used only by offline browser tests. The runtime
continues loading that URL with the SHA-384 integrity digest pinned in
`assets/plugins/tuzi/analytics.js`.

Upstream: https://github.com/umami-software/umami (MIT; see LICENSE).
SHA-384: `2a8bd220fa5dac064d1ecf8cf7577b14eacb6ade6ba9ca53b5052afc62c8cd8c00b7e78dd04407960754826ff45368fe`.

When upgrading the server SDK, review the new response, replace this fixture,
update the integrity digest together, and run both browser engines. An unreviewed
SDK change is intentionally rejected by the browser; business operations remain
available, but analytics stops until the application receives an updated pin.
