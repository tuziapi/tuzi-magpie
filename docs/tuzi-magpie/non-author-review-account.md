# Independent review by account agent

Reviewed 2026-11-03. Reviewer implemented the account backend, not the root
identity changes or account UI. Root and UI worktrees were read-only throughout.
No production account, external service or paid model was used.

Scope: `/Users/syd08/Documents/tuzi-magpie-local` identity changes (initial
HEAD `6a7b9c8`, re-review HEAD `e7e05cd`, plus current uncommitted diff), and
`/Users/syd08/Documents/tuzi-magpie-ui` at `2251ca1` plus uncommitted Tuzi UI.
This is source and contract review, not a claim of native visual acceptance.

## Findings and disposition

| Finding | Impact / reproduction | Re-review |
| --- | --- | --- |
| `Makefile install` used `go install .` under upstream module name | Writes `$GOBIN/magpie`, potentially replacing original CLI | Fixed: explicit tuzi-magpie build/copy target |
| Windows installPath used original Programs/magpie/magpie.exe | Starting download can forward to or replace original installation | Fixed: both known-folder and LOCALAPPDATA branches use product.Name |
| Update asset, unzip and staging names retained upstream names | Local release artifacts cannot be found; sibling staging collision | Fixed: tuzi asset/bundle/staging names and fallback executable |
| NotesFeed / ReleasePage still selected upstream | New distribution displays unrelated upstream release information | Fixed: independent environment override and empty unconfigured defaults |
| Process recognition accepts magpie/dial but rejects tuzi-magpie | Cannot replace own old gateway; manual takeover can target original | Fixed: product executable recognition and manual Distribution gate; automatic gate already present |
| UI statistics sent list page/page_size | Go allow-list rejects every statistics request; permissive browser mock hid it | Fixed: applied filters omit pagination, strict fixture added by UI author |
| UI account/money cache survives Refresh/check/reentry | Balance and currency metadata stay stale after server changes | Fixed: explicit refresh, connection check, open and foreground invalidate account/groups |
| Key fragment form allowed eight characters | Backend requires exactly four ASCII alphanumeric characters | Fixed: maximum length and pattern now match |
| navigate continued after canceled open / leave | Could read prefill and repopulate a hidden secret field after leave cleared it | Fixed: active/lifecycle/generation checks before and after prefill, same-input check; preserves hand entry |

The re-review above inspected actual changed source, not only author reports.
Root reported identity tests and native production compilation passed; UI author
reported Chromium focused tests passed and was running the multi-language,
two-engine suite. Those runs remain their separately recorded evidence.

CSS selectors in the Tuzi stylesheet are scoped under `#view-tuzi`, including
media queries. No global type/font/color/layout selector was found. Shared
`app.js` additions inspected were conditional Tuzi preset links; original icon
paths and SVG remained unchanged. Root shell integration was still being
completed, so final same-condition original-page screenshots and the native
end-to-end acceptance remain required before final delivery.

The backend fixes in this branch were not independent review: root identified
the bootstrap generation cancellation gap, and the account author fixed it
with a held HTTP request test and deliberate red-on-old proof. Further protocol
metadata and fallback/default-group qualification corrections came from
cross-checking the reference contract fixtures and website source. These are
recorded separately in account-backend-record.md and require integration review.
