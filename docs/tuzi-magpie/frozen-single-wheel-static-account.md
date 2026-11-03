# F05/F11 finite static follow-up

Documentation only, 2026-11-04. No browser, model service, product candidate,
wait correction or pressure experiment was started. Read the account c723
source and existing `frozen-boundaries-02`/`frozen-controls-03` raw traces.
F05/F11 remain unknown; the historical failure trace did not record actual
F11 displacement or the responsible F05 overflowing nodes.

## F11: original single-40 paths

The fixture sends one trusted-40 wheel and delays each registered window
wheel handler60ms. Its helper waits for `__wheelsHeard > n`, then for the
current purposeUntil to expire. The following source paths can in principle
make the final view number differ from the earlier `was-40`; each requires
evidence rather than another invented stimulus:

| Path | Necessary condition | Existing single-input evidence |
| --- | --- | --- |
| Input moves a nested scroller, is contained, or is still being applied by the compositor | Target/scroll chain differs or native scroll arrives after sampling | Both observed runs target `span.label`, route scroll714→674, restore714, replay674 and scrollend before helper return. No observed missing/later step. |
| givesBack replays an unrelated negative entry | That entry is at/after event.timeStamp-50, younger than1000ms and visible | Code-200 timestamps996/975 are149/152ms before wheel1145/1127, so excluded. Only-40 is consumed. No other eligible record is present. |
| givesBack loses a restoration | Record exceeds1000ms, event direction/trust mismatches, view hides, or restoration is created only after the handler | Observed real-40 events trusted; deliveries1208/1190 consume the recent-40 records. Neither expired nor hidden nor late-created record observed. |
| puttingBack infers a run | Third same-sign record or already-active same-direction run within1000ms | Observed prewheel only[-200], then[-200,-40]; deaf staysfalse. Earlier+300 records cleared and cannot satisfy a negative-sign run. No third entry. |
| Reference position changes after `was` | backToReader/pinnedAt/hold/repin/fitRoom or initial load/layout moves/reanchors view during gap or after replay | No native scroll between restored714 sample and final wheel in either boundary trace, and no extra putBack. Detailed pin/readerAt and routing-render invocation state were not recorded, so historical layout cause remains unproved. |
| Helper returns before all actual work | Another wheel listener increments count before main listener, pending event belongs to another input, or a future native step has no current purpose deadline | Each observed input has exactly one scheduled main callback; final pending0 and native scrollend precede helper return. No demonstrated incomplete input. |

The bare count predicate is not a universal all-listener completion barrier.
Asset search finds the main app wheel listener and only one conditional extra:
compat.js installs a nonpassive containment listener when CSS overscroll-behavior
is unsupported. That legacy branch could increment the count before the app
handler; it does not call flings. But both saved engines' relevant traces
contain exactly one scheduled delivery per event, with heard3 after three real
inputs. Merely finding the conditional branch does not justify changing the
helper for this frozen failure. Registered native scroll/observer callbacks
are not wheel listeners and are not covered by the counter at all.

## Routing timer and third-entry check

Routing client.js4893 ticks each1000ms, but stage sync requires
`!pinned && loaded && cur`. Selecting the day runs lookAt→loadDays→followListed,
which sets pinned=cur for a day (3493). Before that asynchronous load completes,
staged() returns[] for day&&!rp, so sync has nothing to rebuild. Therefore
the proposed periodic *stage sync* rebuild is not established for this case.
The tick still runs render and renderActs; the static fixture has one provider
key and completed fixed-duration routes. renderActs patch (4403) returns for
structurally equal rows and inserts replacements without first emptying the
whole box. Stage virtualization requires200 keys (1846), not this one-key case.
Request virtualization likewise needs100 requests, not the fixture's12.

The fixture's subsequent trace poll waits20s. The historical child duration is
1414.9ms including reset, which cannot include a new-document20s poll response.
This does not exclude the initial trace/providers/history responses: reset
waits for day controls, and clicking a day does not await its async lookAt
handler. An initial/delayed history render or generic pin-size callback remains
a theoretical layout source, but none is recorded as moving the gap in the
available traces. A third negative restoration during that gap would need an
actual second displacement plus its putBack; an observer callback or timer
firing alone is insufficient. The100ms gap in both boundary traces contains
no native scroll and retains only code-200.

Relevant layout writes are app.js22932 backToReader (including possible focused
field scrollIntoView), pinSizes/heldSizes, hold/fitRoom, and routing repin at7626.
The click hold is cleared by the earlier actual300 handler through flings→
readerScrolls; with no subsequent click it cannot spontaneously reappear.
`backAfterLoad` is used by initial show/provider completion, not by the routing
one-second tick. A changed pinned element can legitimately change numerical
scrollTop, which is why unchanged page data must still be verified before
attributing any numerical mismatch solely to the wheel helper.

The most discriminating single follow-up condition, if root separately chooses
to observe it, is whether the original helper's existing prewheel page.evaluate
finds `actual !== was` or more than the lone code-200 negative record, before
the one-40 input. Capture actual, readerAt/pin state and putBack in that existing
round trip; preserve the100ms gap, one input, original final sample and40±1
assertion. This would distinguish pre-input reference drift/third-entry state
from a later input or guard problem without introducing a second wheel. It is
an observation suggestion only, not a launched experiment or proposed wait.

## F05: first resize is not synchronized by the editor assertion

The500px checks wait for a CSS grid to become one column and read editor/field
geometry. These reads may flush CSS/layout; they do not assert delivery of the
MediaQueryList change or ResizeObserver callbacks that call fitTop. The app's
760px media handler (`app.js23488`) calls layoutNav, fitTop, navInSight directly
when the change event is delivered. It is not synchronously invoked merely
because getComputedStyle reflects a new viewport.500 and560 both match760,
so the media transition belongs to1000→500 even if delivered at560. The520px
editor CSS condition is separate.

This scheduling distinction is already observed, not merely hypothetical:
`frozen-controls-03/gateway-original/gateway-final.json` has before560 n151 at
1957ms with innerWidth500 and no preceding500 native-resize or fitTop RO.
The first resize delivery n152 at1972.1 reads innerWidth560; the760px media
change n154 at1972.5 reports true; fitTop RO n159 at1973.8 is held by the gate.
The first100ms sample2070.6 nevertheless fits. The direct media handler remains
ungated and can size the header at560 before the held observer is released.

In contrast, boundary frozen/original delivered500 fitTop ends at3134.1/3116.5,
before their before560 markers3142.4/3119.4. Control frozen also delivered500
fitTop before its second resize. Therefore the RO-only control does not test
holding *all* header updates across the entire1000→500→560 sequence.

It is source-compatible for the editor confirmation to precede the header's
first update. It is not yet observed that both the necessary media handler
and RO delivery remain later than the final100ms sample; all recorded samples
fit. The smallest remaining observation is to preserve both resize boundaries
and the first sample while recording the760px handler/fitTop delivery order
and header classes. No repeated packed500→560-only gate, synthetic fonts,
CSS alteration or broader waiting predicate follows from this static result.

Root owns the browser queue. No additional action is running. Stop here with
both historical blockers unlocated; do not promote the two-input guard weakness
or these unobserved schedules into a frozen product fix.
