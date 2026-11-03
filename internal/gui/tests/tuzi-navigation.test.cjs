// Exercise the JavaScript actually injected by the native scheme handler.
// The source override lets an isolated reviewer test a pending integration file.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');

const sourcePath = process.env.TUZI_NAVIGATION_SOURCE || path.resolve(__dirname, '../tuzi_navigation.go');
const source = fs.readFileSync(sourcePath, 'utf8');
const match = source.match(/const tuziAccountNavigateJS = `([\s\S]*?)`/);
assert.ok(match, 'native account navigation script must be present');
const script = match[1];
const settled = () => new Promise(resolve => setImmediate(resolve));

function harness(readyState, accepted = true) {
  const document = {readyState};
  const events = new EventTarget();
  const calls = [];
  vm.runInNewContext(script, {
    document,
    addEventListener: events.addEventListener.bind(events),
    show: async view => { calls.push(['show', view]); return accepted; },
    magpie: {call: (...args) => { calls.push(['call', ...args]); }},
  }, {filename: sourcePath + ':tuziAccountNavigateJS'});
  return {calls, document, loaded() { document.readyState = 'interactive'; events.dispatchEvent(new Event('DOMContentLoaded')); }};
}

test('cold account navigation waits for DOM readiness and runs once', async () => {
  const h = harness('loading');
  await settled();
  assert.deepEqual(h.calls, [], 'loading must not enter a plugin before start.js mounts it');
  h.loaded();
  await settled();
  assert.deepEqual(h.calls, [['show', 'tuzi'], ['call', 'tuzi', 'navigate']]);
  h.loaded();
  await settled();
  assert.equal(h.calls.length, 2, 'the readiness listener is consumed once');
});

for (const state of ['interactive', 'complete']) test(`warm account navigation runs immediately when ${state}`, async () => {
  const h = harness(state);
  assert.deepEqual(h.calls, [['show', 'tuzi']]);
  await settled();
  assert.deepEqual(h.calls, [['show', 'tuzi'], ['call', 'tuzi', 'navigate']]);
});

test('a denied page transition never consumes account prefill', async () => {
  for (const state of ['loading', 'complete']) {
    const h = harness(state, false);
    if (state === 'loading') h.loaded();
    await settled();
    assert.deepEqual(h.calls, [['show', 'tuzi']], state);
  }
});
