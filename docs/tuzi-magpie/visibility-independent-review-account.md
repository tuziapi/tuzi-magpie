# Independent review: account visibility and native delay fixture

Reviewer: account subagent, not the implementation author. This was a read-only
review; no UI/root source file was changed and no test, browser, native app,
fixture server, Go build or model call was started. Only this review record is
written in `/Users/syd08/Documents/tuzi-magpie-account`.

## Reviewed snapshot and result

No blocking findings in the reviewed diff. The minimal visibility change
addresses the observed cancellation while retaining the relevant lifecycle,
background polling, credential and write-recovery boundaries. Final committed
browser results, integration and the fixed native run remain the authors'/root
verification gates; this review does not claim they have passed.

The UI worktree is
`/Users/syd08/.codex/worktrees/tuzi-usage-regressions/tuzi-mapie`, branch
`codex/tuzi-visibility-connect`, based on `d384d23ae502a2d6618f2ab5cafec5021a6ea768`.
The root worktree is `/Users/syd08/Documents/tuzi-magpie-local`, at the same
HEAD. Reviewed files were uncommitted at the time of review. Exact SHA-256:

| Worktree / file | SHA-256 |
| --- | --- |
| UI `internal/gui/assets/plugins/tuzi/client.js` | `fb0c8ace147806c4c54ff64e9649bb010cf8ce7e0e574b8d2e68825e3f00e0f8` |
| UI `internal/gui/tests/tuzi-account.test.cjs` | `e3c38807db5279b3039e24fdf82faf93adaff7df2fdb27f27aacbd7ad80e1360` |
| Root `cmd/tuzi-fixture/main.go` | `6d7bb219c739b8b8808923d80b30f519bb0506f477f6476f8768de7574b29292` |
| Root `scripts/tuzi-magpie/native-acceptance.py` | `2b3e2f5d5be5591e987e6f47c904796ff2449e00a5152239a8318651f42eee7a` |

Also read the Tuzi subsystem reference and its UI documentation diff,
the implementation's visibility investigation record, surrounding client
functions, native isolation helper, and backend request completion/error paths.

## Account lifecycle and response handling

`open()` already gates initialization through `guarded`, including state,
offline verification and the initial tab read. Explicit connection, check,
Key writes and secret reveal also use that busy gate. Previously a hidden
event called `cancelRead` for all of them, incrementing the serial and aborting
the shared controller; `guarded` deliberately suppresses `AbortError`, so the
operation could silently stop even after the backend received it.

The new `stopReadTimers` extracts only cancellation of search debounce and the
minute performance refresh. Hiding while busy uses it without changing serial
or controller, preserving the pending response and existing error handling.
Returning while busy starts no competing read. Returning when active and idle
invalidates account/group caches and requests the current tab once through the
existing `loadTab` path; it never repeats the connection or mutation.

Idle hiding still calls the full `cancelRead`, so aborted/stale tab data cannot
replace the resumed view. A busy operation may finish its existing finite
follow-up reads while hidden; this is not periodic background polling.
`loadModels` still schedules its 60-second timer only while active and visible.
The patch changes no request URLs, authorization, generation checks or cache
storage. Only currency is stored by this client in localStorage as before.

The unchanged real `leave()` sets inactive, advances lifecycle, aborts the
controller, closes/clears the sheet and erases the system-token input. Reveal
and prefill continuations retain their sheet/lifecycle/generation checks.
Neither hidden completion nor resume copies secrets into a URL, persistent
browser store, log or telemetry. The test's fetch instrumentation records
operation metadata and abort state, not the token or Key body.

The backend still durably records pending Key writes and retains that gate on
transport/unknown outcomes; finishing requests recheck account generation.
Preserving the original response therefore avoids needless cancellation without
bypassing the read-back/acknowledgment requirement or adding retry/replay logic.

## Regression coverage review

The appended cases hold actual Playwright HTTP responses and inject the DOM
visibility event. They distinguish an unfinished request from a completed
request whose signal is aborted later. Assertions cover connect, startup state,
Key PATCH, one submission only, idle read cancellation/resume, timer removal
both idle and busy, no hidden timer reschedule, and true-leave entered/revealed
secret clearing. Visibility overrides affect only the isolated page.

Every new page collects page errors and receives a bounded navigation timeout.
Teardown releases held responses, drains route callbacks with
`unrouteAll({behavior:'wait'})`, closes the context in a finally block and
checks page errors. Browser teardown is owned by the parent test. Tests do not
change the expected app state to hide the failure or replace the HTTP result
with a mocked client success. Existing broader account scenarios remain.

## Native helper boundary and actual old-code evidence

The fixture executable remains behind `//go:build tuzi_fixture`; production
application code receives no delay option. `-bootstrap-delay` defaults to zero
and must be between zero and five seconds. Only the synthetic bootstrap path
waits. Request context cancellation exits the handler rather than completing
bootstrap after the aborted client, and all other paths keep their existing
fixture handling. Literal-loopback binding checks are unchanged.

The Python runner appends `-bootstrap-delay` and its value as two argv elements
to the existing sandboxed fixture command. It uses no shell interpolation and
does not pass this option to the app. Invalid duration strings fail at Go flag
parsing; out-of-range values fail before binding. Existing free-port and exact
gateway-PID ownership checks, absolute path checks, evidence-home ownership
marker, private environment, loopback-only OS network sandbox, real-home data
denial, securityd denial, fresh output-state checks and process-group cleanup
are unchanged. The delay introduces no real-credential input or external host.

I read the root's actual old-app result at
`/Users/syd08/Documents/tuzi-magpie-evidence/native-visibility-old-01/cause-summary.json`:
connect began at 643ms while busy and visible, hiding occurred at 744ms, and
the connect signal aborted/rejected with `AbortError` at 746ms. At 20699ms the
Go state was offline, generation 1, without identity, with `network_uncertain`.
The run reports `passed:false` and `gatewayVerified:false`, as it should.
The root reports this used the old `d384d23` app and that both owned processes
were cleaned up. The fixed native result was still pending during this review.

## Recovery and next gate

This review owns no running process or port and leaves no source modification
in the implementation worktrees. Root should compare the reviewed hashes to
the final implementation commit, inspect any later changes, then complete the
final browser/native and integration gates. No additional approval is implied
by this review and no production deployment/release authorization is granted.
