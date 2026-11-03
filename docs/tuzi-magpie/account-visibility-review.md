# Hidden-window account request cancellation

Worktree: `/Users/syd08/.codex/worktrees/tuzi-usage-regressions/tuzi-mapie`, branch `codex/tuzi-visibility-connect`, based on `d384d23`.

## Observed native failure and cause

The real Wails run `native-final-workspace-02` reached Go's `POST /api/tuzi/connect` and then stayed Not connected with no notice. Its native driver recorded no response errors, but did not record fetch rejections. The isolated account record had advanced to generation 1 without identity: the backend had started connection verification. The Tuzi client and native driver were byte-identical in the earlier passing `3d77be3` and failing `d384d23` builds. This was not evidence that the later tray patch changed account semantics.

`native-visibility-diagnostic-01` captured a real visible-to-hidden event at approximately 620ms. On that natural passing run the connect response completed at approximately 576ms, before hiding. It establishes that the event occurs in this native startup, but is not the regression proof: aborting a signal after its response completed does not make that request fail.

The controlled fixture holds the connect response after the request arrives. Dispatching the hidden visibility event then makes the old client report `aborted:true`, `settled:true`, `error:AbortError`, `busy:false`, status Not connected and an empty notice. The same shared controller also aborts initial state and Key PATCH. These are three failing child cases; the idle-read and true-leave controls pass on the old code. The earlier initial-state fix `9c23725` prevents a late initial read or language redraw from interrupting a connection, but did not separate visibility cancellation from a busy action.

The root agent then reproduced the failure across the actual native desktop, Go facade and HTTP fixture using a 500ms bootstrap-response delay. In `/Users/syd08/Documents/tuzi-magpie-evidence/native-visibility-old-01/cause-summary.json`, connect starts at 643ms, controlled hiding occurs at 744ms, and both signal abort and fetch rejection occur at 746ms. The final native read reports offline / generation 1 / no identity / network_uncertain. This confirms the frontend cancellation reaches the real backend. It remains a failed acceptance run.

## Minimal change and boundaries

Only `internal/gui/assets/plugins/tuzi/client.js` changes production behavior. `stopReadTimers` clears the search and minute refresh timers. Hidden visibility while busy uses it without aborting the initial open or explicit operation; idle visibility still uses `cancelRead`. Returning while busy starts no competing read; returning once idle refreshes the current tab. The existing true-leave path still cancels requests and clears entered/revealed secrets. No write or connection is replayed. The owning [Tuzi subsystem reference](../subsystems/tuzi-account.md) documents this lifecycle.

The controlled tests are appended to the existing `tuzi-account.test.cjs`, so the complete GUI file set remains 1,135. Their held responses distinguish a pending request from a completed request whose signal is later aborted. They also check busy connection-check timer cancellation, no timer rescheduling while hidden, visible resumption, one Key PATCH only, initial state read once, and true-leave secret removal. Every new page collects page errors, uses a 60s navigation timeout and owns teardown in this order: release held responses, await route completion, close context; cleanup failures propagate.

## Evidence

All browser evidence is under `/Users/syd08/Documents/tuzi-magpie-evidence/gui-suite/usage-regressions/`. Each `*-state.json` records command, test hash, minimal private environment, PIDs, timestamps, exit and isolation removal. No real account credentials or external model calls are used.

| Run | Result |
| --- | --- |
| `visibility-old-chromium` | Expected red: 2/6 pass; connect, initial state and Key PATCH fail plus their parent. Exact native symptom reproduced. |
| `visibility-fixed-chromium` | First targeted candidate: 6/6 pass. |
| `visibility-account-chromium` | Complete account file before final pageerror/navigation instrumentation: 11/11 pass. |
| `visibility-final-chromium` | Final complete account file: 11/11 pass, zero failed/cancelled/skipped/todo. |
| `visibility-timer-negative` | Expected red: 4/6 pass; omitting only busy timer cleanup leaves one minute timer and fails its zero-timer assertion. |
| `visibility-final-webkit` | Final complete account file: 11/11 pass, zero failed/cancelled/skipped/todo. |

`visibility-results.json` records all log hashes and final client/test source hashes; both final runs used exactly the final test bytes and removed their isolated homes. `git diff --check` and JavaScript syntax checks pass. Root review requested the explicit navigation timeout and page-error teardown assertion; both are present in these final runs.

Fixed native validation remains the root agent's independent run with the same delayed fixture and driver; these browser fixtures do not replace it or the final full GUI suite.
