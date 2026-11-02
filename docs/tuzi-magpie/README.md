# tuzi-magpie local development

Baseline: **TM-LOCAL-1.0**, 2026-11-02 Asia/Shanghai. This folder records implementation, not production approval. The user's current instructions override historical authorizations in source documents.

## Sources and starting state

Snapshots in `sources/` came from `/Users/syd08/Documents/tuzi-switch/docs/development/` on 2026-11-02. The account contract remains `system-token-v1`; verify the reference implementation and paired website before changing wire semantics.

- Magpie: `2251ca1ce93a837aa31df1158fa9d58437268a71`, main. Existing untracked `.DS_Store` retained in original checkout.
- Website: `34063efc6e053b152b82b45e2076549bfc4fe8b8`, codex/log-page-refresh, clean. Existing branch is not reused.
- Reference repository and its untracked documents/attachments remain read-only.
- Original icons, MIT license, attribution and Git history are retained.
- No push, PR, remote merge, release, deployment, real credentials, payments or paid models.

## Task dependency table

| Task | Milestone | Owner | Depends on | Output / acceptance |
|---|---|---|---|---|
| Baseline, isolation, original screenshots | M0 | root | source review | AC-01/16 baseline and isolated fixtures |
| Account client, storage, projected business DTO | M1/M2 | account | interface below | AC-03–09 backend and failure tests |
| Desktop account four tabs | M1/M2 | ui | frozen interface | AC-02/05–09/13 UI and translations |
| Website navigation | M1 | website | source/deep-link constants | AC-12, old assistant compatibility |
| Product identity and integration | M0/M3 | root | baseline | AC-01/04/14/15 |
| Presets, protocol/image compatibility | M3 | next available agent | provider/source review | AC-10/11 |
| Independent review and repairs | integration | non-author | integrated diff | AC-04/13/16 |
| Serialized suites, native E2E, bundle | delivery | root | all implementation/review | AC-01–16 evidence |

## Minimal interface v1

Trusted desktop only: `/api/tuzi/state` GET; `/api/tuzi/connect` POST `{token}`; `/api/tuzi/check` POST; `/api/tuzi/disconnect` POST. Return the public AccountState shape in reference `src/lib/api/account.ts` (status, generation, identity, error; never saved token).

`POST /api/tuzi/request`: `{method,path,query?:[[name,value]],body?,generation}`. Logical `/account/*` operation paths, envelope and projected DTOs follow reference `src/lib/api/desktop.ts` and `src-tauri/src/tuzi_account/business.rs`. No profile editing/entry point. Reject arbitrary origin/header/user identity and unknown fields. HTTP errors have `{success:false,error:{code,message,outcomeUnknown,retryAfter?}}`; authentication, permission, network, rate limit, storage and unknown-write outcomes remain distinct. Generation fences all reads and writes; cancellation follows request context.

`POST /api/tuzi/provider`: `{generation,tokenId,name?,models:[string],protocol}`. Return `{providerId,existing}`. Validate current identity, ownership, status, group, model/protocol eligibility and stable source proof before fetching full model key and saving. Never overwrite an existing provider on duplicate. Existing Agent wiring follows separately.

`POST /api/tuzi/open`: `{target}` fixed enum `token|topup|redemption|personal|coding|gaccode`; trusted native opener only. `source=tuzi-magpie` maps to exact `tuzimagpie://account/connect`, no query/fragment. Clipboard prefill is single-use within 5 minutes of explicit token-page open, only into empty input; user must still connect. Website fallback allows ordinary token page/manual return.

Production account origin is fixed `https://api.tu-zi.com`. Only test constructors/builds may inject a loopback synthetic origin, never browser input. Account secrets in dedicated JSON, excluded from exports/sync, permissions 0700/0600 and atomic writes. Account APIs not registered for Web hosts; additional desktop origin/host guards and plugin boundary tests required.

## Ownership

- account: `internal/tuziaccount/**`, new `internal/gui/tuzi_account*.go`, account tests/reference docs. Does not edit api.go.
- ui: new `internal/gui/assets/plugins/tuzi/**`, `plugins/tuzi/**`, new account GUI tests, and tuzi translations in i18n.js only. Does not edit shared app.js/index.html/kernel.js/plugins/all/all.go without coordination.
- root: shared registration, app identity/build/update, baseline fixtures, integration and evidence.
- website: own repository guide helpers/components/tests/translations only.

Large build/full-suite executions are serialized by root. Each author commits only their own worktree; root reviews actual diff before cherry-picking. Technical decisions within scope proceed without milestone approvals.
