# Current native and production evidence

These checks ran on 3d77be3 after the complete Go recheck and ownership-aware
CLI fixture fix. Remaining GUI repairs and final full suites are still open;
this record does not declare the development goal complete.

The fixture build uses `production,tuzi_fixture`. Both native runs execute
real Wails DOM actions, native Go account handlers and the real gateway.
`native-final-workspace-01` passes four populated summaries, connection, Key
creation/reveal/close, Provider persistence, logs, marketplace and status.
Its exact app PID13690 serves the synthetic model request.
`native-final-lifecycle-01` actually restarts with the owned isolated HOME,
restores and checks the account, disconnects it, and retains the Provider;
its exact new app PID13963 again serves a synthetic model request.

The first immediate lifecycle launch was refused by the free-port precheck
while TCP18341 was not yet reusable. The previous app and fixture had both
exited, with no listener remaining. After a bounded30s wait, the unchanged
runner passed. No isolation guard was removed or weakened.

The production build uses only `production`, without `tuzi_fixture` or
`nogui`. `production-start-01` records a real LaunchServices launch of its
isolated copied bundle, exact gateway owner PID14594, valid model-list
response and HTTP404 for the private account route. No account file appeared,
and the source executable hash stayed unchanged. Build/start evidence is
under `/Users/syd08/Documents/tuzi-magpie-evidence/`; build manifests and
logs are `native-final-build-01` and `production-build-01`. The test-tagged
bundle is preserved in native-final-build-01/tuzi-magpie-fixture.app.

The production window was not visually inspected: the computer-use tool
reported that macOS was locked. No unlock bypass was attempted. This is
separate from the existing same-condition browser visual comparisons and
the successful actual native DOM workflows. The isolated production process
was closed after the attempt; post-visual-check-cleanup.json records this
without rewriting the original keep-open startup result. The original user's
Magpie was not stopped or replaced.
