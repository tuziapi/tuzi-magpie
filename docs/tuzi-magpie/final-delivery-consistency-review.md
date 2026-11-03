# Final delivery consistency review

Read-only review by the website agent on 2026-11-04. Main snapshot:
`d5daff2cbc132816eb0d07bb22419ccfdf09d815`, clean. This review ran no tests,
builds, applications or credential scans. It does not close an unknown failure
or change TM-LOCAL-1.0 acceptance. Root's later authorized finite closing work
may supersede this snapshot.

## Verified existing evidence

- Paired website checkout is clean at
  `e2ba322b2cd57ef71dc9467ad5107be5f569bb47`, branch
  `codex/tuzi-magpie-guide`, directory
  `/Users/syd08/Documents/tuzi/tuzi-api-magpie-guide`. The paired SHA in
  local-delivery.md is correct. Its source guide records 142 unit tests;
  `website/browser.log` contains eight passing Chromium/WebKit scenarios,
  and `website/build.log` records the 21.22-second production build. These
  remain local synthetic evidence, not website deployment or live login.
- `final-source-checks-04/source.json` records clean d5daff2 and the exact
  approved app.js/routing hashes. Independently hashed current root assets:
  both match. `results.json` records exit 0 for GUI Go package tests (73.31s
  wall time), Linux build (6.13s), Windows build (5.11s), fixture app build
  (10.3s), with all private homes cleaned. GUI Go log reports 62.980s package
  time. These are four successful commands, not a new complete Go suite or
  all-platform installation test.
- The preserved fixture executable and the current root
  `tuzi-magpie.app/Contents/MacOS/tuzi-magpie` both hash to
  `a83663a476a5921722400a44a6f05606970a2a5603112d5fd4c4016cb01ad1a9`.
  Both match `final-source-checks-04/fixture-artifact.json`. Therefore the
  current root bundle is the fixture artifact, not the production bundle
  described by the old c723 hash in delivery documents.
- F08 product/test commits are 86fd638/791801d; F15 product commit is
  775d699. Decision records contain their explicit approvals and the user's
  subsequent authorization for ordinary remaining finite closing decisions.
  No further per-item permission is required within that scope.

## Finite updates required before a final delivery claim

1. **Publish the actual final artifact identity and startup result.**
   Update local-delivery.md lines 3–6 and 31–38, plus
   native-current-evidence.md's current-artifact section, after root's
   production rebuild and isolated native/startup verification. Record exact
   source/build version, production-only tags, executable hash, application
   path and final main/website pair. Keep the d5daff2 fixture hash separately.
   The existing production checker correctly rejects a fixture bundle; do
   not suggest the current root path already passes it. No final production
   build/start result exists in checks-04 at this snapshot.

2. **Reconcile the current closing status without rewriting history.**
   closing-blockers.md's opening summary calls all closed items including
   F08 "仅测试修正", but F08 now changes product behavior. Its F15 Chromium
   row still says unknown, while root reports a subsequently proven fixed
   wheel target being consumed by an inner list; replace that current cause
   only after linking UI's actual controlled evidence, and close it only
   after its minimal candidate is reviewed and validated. F01/side-effort,
   F05 and F11 remain unknown at this snapshot. Do not close them from later
   natural green reruns or label them historical exemptions. Preserve the
   frozen whole-suite red results, original logs and WebKit null OS exit code.
   Mark the earlier chronological entries explicitly historical so their
   old "pending"/"not approved" statements cannot be mistaken for current.

3. **Update the AC matrix using the final bounded evidence.**
   acceptance.md AC-13/14 currently points at checks-03/c723 and must include
   checks-04's real command scope plus the eventual final production/native
   records. AC-16 lists F14 but should also cite approved F08/F15 behavior,
   exact-resource integration and their scoped visual/functional controls.
   Do not blanket-convert all rows to pass while the remaining mandatory
   closing items are unresolved. AC-15 must keep the exact scope/snapshot of
   the existing redacted source/history audit; c723/142 reachable commits is
   not an audit of every later ref or unavailable upstream history. Any final
   audit/delta conclusion must identify its actual evidence without implying
   a credential scan was performed by this reviewer.

4. **Refresh the single recovery entry point.**
   recovery.md still starts "Updated: 2026-11-02" and its latest entry is
   00:10, saying F08/F15 are unapproved/unintegrated and the root app is c723
   production. Add a current summary with main/website/worktree branches and
   HEADs, integrated repairs, exact remaining failure owners, uncommitted
   ownership (side-effort remains in the website worktree), queue owner,
   app/fixture PIDs and ports or verified absence, artifact type, and next
   bounded actions. Historical worktree tables may remain labeled initial
   state. native-current-evidence.md lines 3–5 also still say the complete GUI
   suite is running with unresolved account-eye; replace that current-status
   sentence and retain its older native runs as historical evidence.

5. **Make replay/limitations match the final source and artifact.**
   local-delivery.md's native replay commands currently point to the preserved
   c723 fixture. Either label them explicitly as historical reproduction, or
   point final acceptance instructions to the verified final fixture and its
   matching runner/script source. Record actual final native/startup cleanup
   and exact owned PID for any intentionally kept-open app. Production visual
   inspection remains unclaimed while locked; update only after actual visual
   evidence, never from browser screenshots. Retain existing rollback,
   no-live-credentials/no-paid-model constraints and external gates for real
   services, Windows/Linux installation, user acceptance, signing and release.

The website pair requires no additional source change or test rerun for this
consistency pass. No broad suite rerun, historical repair or credential scan
is requested. The above list is documentation/identity reconciliation plus
the production/native and finite failure gates already owned by root/UI.
