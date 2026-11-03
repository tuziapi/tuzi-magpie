# Local source and reachable-history credential audit

Performed 2026-11-03 without network access, remote fetch, credential use,
home-directory inspection or changes to history/license. The audit is a
pattern-based source review, not proof that every possible secret encoding is
absent. No candidate value is included in the report or console output.

## Scope and reproducibility

`scripts/tuzi-magpie/scan-secrets.py` reads tracked and non-ignored untracked
files in the selected checkout. With `--history`, it scans each distinct blob
reachable from **all local Git refs**, including worktree task branches, and
records the commits that introduced/removed each matching blob. Symlinks are
not followed; binary files are counted and skipped. It does not invoke a
remote service or try whether a credential works.

```sh
python3 scripts/tuzi-magpie/scan-secrets.py /Users/syd08/Documents/tuzi-magpie-local /Users/syd08/Documents/tuzi-magpie-evidence/lines/secret-scan-main.json --history
python3 scripts/tuzi-magpie/scan-secrets.py /Users/syd08/Documents/tuzi/tuzi-api-magpie-guide /Users/syd08/Documents/tuzi-magpie-evidence/lines/secret-scan-website.json
```

Rules cover private-key PEM markers, GitHub tokens, AWS access identifiers,
Google API keys, Stripe live secrets, Slack tokens, model API keys, JWT shapes
and long literal assignments to common credential names. Output contains
path/line/rule/blob/commit and a SHA-256 equality fingerprint, never the matched
bytes. Synthetic detection, absence of candidate bytes from serialized output
and binary skipping were checked before recording the results.

## Results and disposition

| Scope | Snapshot | Coverage | Result |
| --- | --- | --- | --- |
| Main working tree | `a6b1ea4155acf94ee93b60508ff186b581571aca` plus ongoing integration files | 6,839 text files; 893 binary files skipped | 98 pattern matches, classified below |
| Main reachable history | 26 commits across all local refs at scan time | 6,855 text blobs; 821 binary blobs skipped | 98 matches; no candidate fingerprint absent from the working tree |
| Website task working tree | `e2ba322b2cd57ef71dc9467ad5107be5f569bb47` | 11,323 text files; 71 binary files skipped | 82 matches, classified below |

Main repository is **shallow**. Its reachable root/boundary is
`2251ca1ce93a837aa31df1158fa9d58437268a71`, which is the initial task baseline.
All matching historical blobs trace to that baseline; no new matching secret
shape was introduced by the local task commits in the scanned refs. Earlier
upstream history is unavailable locally and was not fetched. The website is
not shallow (11,163 reachable commits), but this supplemental website audit
scans the task working tree, **not its full historical archive**.

Main has 49 unique candidate fingerprints. The matching test/fixture files
exercise masking, OAuth/setup tokens, model routing, JWT parsing, AWS signing
and PEM handling. Documentation matches are masking examples. The remaining
source matches are:

- `internal/provider/google.go:76` and `:85`: upstream installed-application
  OAuth client constants for Gemini CLI and Antigravity. These are public
  application identifiers/secrets shipped in those clients, not a user's
  access/refresh token. They predate this task and remain unchanged.
- `internal/redact/redact.go:485`: an explanatory article URL slug used to
  distinguish ordinary text from secret-shaped data, not a credential.

Website has 72 unique fingerprints. Most matches are test/documentation
fixtures. The non-test source matches are PEM boundary strings used by parsers
(`payment/alipay.go:474`, `relay/channel/vertex/service_account.go:68` and `:74`)
and encryption-purpose labels (`service/growth_reporting_config.go:27–31`).
The example assignment at
`docscenter/content/seedance-real-person-video-en.yaml:126` contains explicit
replacement/your-token markers. None is an account secret introduced by the
website guide change. No confirmed live account credential was found in the
audited scope; no candidate was tested against a service.

## Limits and release gate

The scanner does not detect arbitrary high-entropy data without a recognized
shape, secrets assembled at runtime, encodings inside binaries/archives,
ignored local files, unreachable/dangling Git objects, unavailable shallow
ancestors or the website's full history. The working tree was being integrated
concurrently; repeat the commands at the final delivery SHA. Before any future
public migration, review the full intended repository history and publishing
configuration, expand the rules if needed, and handle any newly confirmed
secret without printing it. This audit does not authorize publication,
credential rotation, destructive history rewriting or production access.

Full redacted JSON records are in the evidence paths in the commands above.
They contain the exact scanned HEAD, scope, rules, counts, paths and historical
blob/commit provenance. Original source, history and licensing remain intact.

## Integration candidate rescan (2026-11-03)

At `9b9f56e7daef0f4c3aa4757c3c1f0eeab616444c`, the same scanner read
6,886 working-tree text files (893 binary files skipped) and 7,101 historical
text blobs (885 binary blobs skipped), across 79 locally reachable commits.
The 196 combined matches have the same 49 unique fingerprints already
classified above; no additional fingerprint was found. The redacted report
is `/Users/syd08/Documents/tuzi-magpie-evidence/final-audit/candidate-main.json`.
This is a candidate scan while final regression repairs continue, not a final
SHA claim. The original shallow-history and pattern-detection limits apply.
