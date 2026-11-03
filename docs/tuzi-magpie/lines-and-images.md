# Tuzi lines and existing image tools

Scope: TM-LOCAL-1.0 AC-10/11. This branch changes only ordinary provider presets,
fixed navigation metadata and compatibility tests. It adds no account login,
plan balance requests, page, Agent, image implementation or global style.
The existing editor accepts each line's own model key. The desktop integration
owns presentation and localized credential labels.

## API and model contract

| Preset | Protocol bases | Model list |
| --- | --- | --- |
| `tuzi` | Chat/Responses `https://api.tu-zi.com/v1`; Messages `https://apius.tu-zi.com`; Gemini `https://api.tu-zi.com/v1beta` | Existing live model-list reader |
| `tuzi-coding` | Responses `https://api.tu-zi.com/coding` | `NoList`, editable `gpt-6-astra` starter; `gpt-image-2` separately in `Region.Drawers` |
| `gaccode` | Responses `https://gaccode.com/codex/v1`; Messages `https://gaccode.com/claudecode` | `NoList`, editable `gpt-5.5` and `anthropic/claude-sonnet-4.6`, `anthropic/claude-haiku-4.5`, `anthropic/claude-opus-4.7` starters |

Chat/Responses use existing Bearer authentication, compatible Messages uses
existing Bearer and x-api-key authentication, Gemini uses x-goog-api-key.
Nothing transfers account-management identity or credentials to model calls.
Only the listed protocols are declared. Starter model IDs come from reference
configuration, not a current vendor availability claim. Models remain editable
using the existing provider editor. The optional preset Gemini field defaults
to empty for every pre-existing preset.

Navigation is `TuziLinks(preset) (TuziWebLinks, bool)` with JSON `purchaseUrl` and
`queryUrl`. Match preset identity, never infer ownership from a hostname.

| Line | Purchase/top-up | Query |
| --- | --- | --- |
| Main | `https://api.tu-zi.com/console/topup` | `https://check.sydney-ai.com/` |
| Coding | `https://store.tu-zi.com/cat/11` | `https://coding.tu-zi.com/reseller/` |
| GACCode | `https://store.tu-zi.com/cat/1` | `https://gaccode.com/subscriptions` |

No URL contains credentials, balance data, return targets, or auto-fill fields.

## Provenance

Read-only source root: `/Users/syd08/Documents/tuzi-switch`.

- `docs/development/tuzi-magpie-execution-spec.md`: TM-LOCAL-1.0 AC-10/11.
- `docs/development/api-contract.md` IF-15 and `PRD.md` fixed web entries:
  current query URLs override old assistant source values. `source-audit.md`
  C09 explicitly marks `/credits` and main-host `/reseller/` as old deviations.
- `src/lib/tuziToolCompatibility.ts`: main protocol endpoints.
- `src/config/codexProviderPresets.ts`: Coding/GAC Responses endpoints, starter
  models and purchase URLs; `claudeProviderPresets.ts`: GAC Messages endpoint
  and Claude starter IDs.
- `src-tauri/src/services/codex_image_config.rs`: Coding image compatibility.
  No assistant implementation was copied or changed.

## Verification and remaining gates

All calls use loopback synthetic vendors, isolated account/config/cache paths
and fixed one-pixel PNG bytes; no real key, paid model or daily Agent is used.
Package TestMain isolation is retained; final runs additionally use temporary
HOME with GOPATH/GOMODCACHE/GOCACHE pinned before changing HOME.

- `go test ./internal/provider ./internal/gateway ./internal/imagemcp -run TestTuzi -count=1 -timeout=3m` passed.
- The same package selection with `-race -p 1` passed. Existing image API,
  edit, selected drawer, live image resolution, preset and HTTP image MCP
  regressions also passed under `-race`.
- `TestTuziPresetGatewayProtocols` sends 21 real listener requests over seven
  applicable preset/protocol combinations. Each checks nonstream and stream
  tool replies, preserved base paths/authentication, no management header,
  and cancellation reaching an intentionally unfinished upstream stream.
- `TestTuziImagesUseExistingGatewayAndMCP` covers main/Coding generate, edit
  with multipart reference image, fixed-byte image content and saved URL,
  explicit upstream refusal, pending job and generation_result completion.
- `TestTuziImageToolSavesThroughRealGateway` runs the existing stdio MCP tool,
  real guarded HTTP gateway and Coding synthetic vendor, saving a generated
  image and an edit in an isolated project. Coding tests use the production
  `Region.Drawers` declaration, not a fabricated image catalog.
- Removing Coding's Drawers declaration produces real FAIL in
  `TestTuziCodingImagePlanStaysOutOfAgentTextModels` with “missing Coding image
  plan”; the restored implementation passes. Empty image settings and existing
  default behavior are not modified.

Logs: `/Users/syd08/Documents/tuzi-magpie-evidence/lines/` (`targeted.log`,
`race.log`, `final-race.log`, `red-image-declaration.log`). An existing macOS SDK
warning about deprecated `posix_spawn_file_actions_addchdir_np` is unchanged.

Full repository builds/vet/suite, actual desktop connection and GUI review are
parent integration responsibilities. Live vendor model availability and paid
image generation remain explicit external gates, not claimed as tested.

## Recovery

Worktree `/Users/syd08/Documents/tuzi-magpie-lines`, branch
`codex/tuzi-magpie-lines`, base `2251ca1ce93a837aa31df1158fa9d58437268a71`.
No persistent processes or ports are left by these tests. Source changes are
presets.go and tuzi.go; all other new Go files are synthetic compatibility tests.
