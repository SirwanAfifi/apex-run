'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
class SignalTarget {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, callback) { const list = this.listeners.get(type) || []; list.push(callback); this.listeners.set(type, list); }
  removeEventListener(type, callback) { this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== callback)); }
  dispatchEvent(event) { for (const callback of [...(this.listeners.get(event.type) || [])]) callback(event); }
}
class DetailEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
function setup(options = {}) {
  let now = 0, serial = 0;
  const timers = new Map(), events = [];
  const window = new SignalTarget(), document = new SignalTarget(), orientation = new SignalTarget();
  orientation.angle = options.angle ?? 0;
  document.hidden = false;
  window.screen = { orientation };
  window.isSecureContext = options.secure !== false;
  if (!options.unsupported) window.DeviceOrientationEvent = options.permission ? {requestPermission: options.permission} : function () {};
  window.addEventListener('apex:motion', event => events.push(event.detail));
  const context = vm.createContext({ window, document, CustomEvent: DetailEvent, performance: {now: () => now},
    setTimeout: (callback, delay) => { const id = ++serial; timers.set(id, {at: now + delay, callback}); return id; },
    clearTimeout: id => timers.delete(id)
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/motion.js'), 'utf8'), context, {filename: 'motion.js'});
  const motion = window.ApexMotion;
  let input = {steer: 0, throttle: 0, brake: 0};
  let pointer;
  if (options.touch) {
    const surface = new SignalTarget();
    surface.style = {};
    surface.getBoundingClientRect = () => ({width: 400, height: 700, left: 0, top: 0});
    document.readyState = 'loading';
    const game = {getState: () => ({mode: 'racing', transmission: 'auto'}), setTouchInput: value => {input = value;}};
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/touch.js'), 'utf8'), context, {filename: 'touch.js'});
    window.ApexTouch.init(surface, game);
    pointer = (type, id, x = 200) => (type === 'pointerdown' ? surface : window).dispatchEvent({
      type, pointerId: id, pointerType: 'touch', clientX: x, clientY: 350, timeStamp: now, preventDefault() {}
    });
  }
  function advance(ms) {
    now += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback(); }
  }
  function sample(beta = 0, gamma = 0, ms = 16) {
    advance(ms); window.dispatchEvent({type: 'deviceorientation', beta, gamma});
    return motion.getState();
  }
  function settle(beta, gamma, hz = 60) {
    for (let index = 0; index < hz; index++) sample(beta, gamma, 1000 / hz);
    return motion.getState().steer;
  }
  return {motion, window, document, orientation, events, sample, settle, advance, pointer, input: () => input};
}

const tests = [];
const test = (name, run) => tests.push({name, run});

test('permission is requested immediately and only once; sensors wait for grant', async () => {
  let resolvePermission, calls = 0;
  const h = setup({permission: () => { calls++; return new Promise(resolve => {resolvePermission = resolve;}); }});
  assert.equal(h.motion.getState().status, 'off');
  assert.equal(h.window.listeners.get('deviceorientation'), undefined);
  const first = h.motion.enable(), second = h.motion.enable();
  assert.equal(calls, 1); assert.equal(first, second); assert.equal(h.motion.getState().status, 'requesting');
  h.sample(0, 30); assert.equal(h.motion.getState().steer, 0);
  resolvePermission('granted'); assert.equal(await first, true);
  assert.equal(h.motion.getState().status, 'waiting');
  assert.equal(h.window.listeners.get('deviceorientation').length, 1);
  h.sample(0, 0); assert.equal(h.motion.getState().status, 'ready');
  h.motion.disable(); assert.equal(h.window.listeners.get('deviceorientation').length, 0);
});

test('denied, rejected, unsupported and insecure access never enables sensors', async () => {
  for (const [options, status] of [
    [{permission: () => Promise.resolve('denied')}, 'denied'],
    [{permission: () => Promise.reject(new Error('blocked'))}, 'error'],
    [{permission: () => {throw new Error('gesture required');}}, 'error'],
    [{unsupported: true}, 'unavailable'], [{secure: false}, 'unavailable']
  ]) {
    const h = setup(options);
    assert.equal(await h.motion.enable(), false); assert.equal(h.motion.getState().status, status);
    assert.equal(h.motion.getState().enabled, false); assert.equal(h.motion.getState().steer, 0);
    assert.equal(h.window.listeners.get('deviceorientation'), undefined);
  }
});

test('a late permission grant cannot undo disable or overwrite a newer request', async () => {
  const requests = [];
  const h = setup({permission: () => new Promise(resolve => requests.push(resolve))});
  const first = h.motion.enable(); h.motion.disable();
  const second = h.motion.enable(); requests[0]('granted');
  assert.equal(await first, false); assert.equal(h.motion.getState().status, 'requesting');
  requests[1]('granted'); assert.equal(await second, true);
  assert.equal(h.window.listeners.get('deviceorientation').length, 1);
  h.sample(); h.settle(0, 40); h.motion.disable(); h.sample(0, 60);
  assert.equal(h.motion.getState().status, 'off'); assert.equal(h.motion.getState().steer, 0);
});

test('right edge down steers right in portrait, both landscapes and upside-down portrait', async () => {
  const poses = [
    {angle: 0, neutral: [0, 0], right: [0, 28], left: [0, -28]},
    {angle: 90, neutral: [0, -60], right: [28, -60], left: [-28, -60]},
    {angle: 270, neutral: [0, 60], right: [-28, 60], left: [28, 60]},
    {angle: 180, neutral: [0, 0], right: [0, -28], left: [0, 28]},
    // Upright phone, turned like a steering wheel: Euler gamma reaches ±90.
    {angle: 0, neutral: [90, 0], right: [62, 90], left: [62, -90]}
  ];
  for (const pose of poses) {
    const h = setup({angle: pose.angle}); await h.motion.enable(); h.sample(...pose.neutral);
    assert(h.settle(...pose.right) > .99, JSON.stringify(pose));
    assert(h.settle(...pose.left) < -.99, JSON.stringify(pose));
  }
});

test('legacy iPhone orientation angle works when screen.orientation.angle is absent', async () => {
  const h = setup(); delete h.orientation.angle; h.window.orientation = -90;
  await h.motion.enable(); h.sample(0, 60);
  assert(h.settle(-28, 60) > .99); assert(h.settle(28, 60) < -.99);
});

test('comfortable neutral, deadzone, clamping and smoothing preserve finite analogue control', async () => {
  const h = setup(); await h.motion.enable(); h.sample(0, 12);
  assert.equal(h.settle(0, 14), 0);
  const initial = h.sample(0, 30).steer; assert(initial > 0 && initial < .5);
  const analogue = h.settle(0, 30); assert(analogue > .59 && analogue < .61);
  assert(h.settle(0, 89) > .99);
  h.motion.recenter(); assert.equal(h.motion.getState().steer, 0);
  assert.equal(h.settle(0, 89), 0);
  for (const [beta, gamma] of [[NaN, 0], [0, Infinity], [null, null], [undefined, 30]]) {
    h.sample(beta, gamma); assert.equal(h.motion.getState().steer, 0);
    assert(Number.isFinite(h.motion.getState().steer));
  }
});

test('Euler wrapping and front-back pitch alone cannot reverse a steering command', async () => {
  const h = setup(); await h.motion.enable(); h.sample(0, 0);
  assert.equal(h.settle(80, 0), 0);
  assert(h.settle(179, -30) > .99);
  assert(h.settle(-179, -30) > .99);
});

test('smoothing behaves consistently across sensor sample rates', async () => {
  const outcomes = [];
  for (const hz of [30, 60, 120]) {
    const h = setup(); await h.motion.enable(); h.sample();
    for (let index = 0; index < hz / 5; index++) h.sample(0, 28, 1000 / hz);
    outcomes.push(h.motion.getState().steer);
  }
  assert(Math.max(...outcomes) - Math.min(...outcomes) < 1e-9);
});

test('missing or invalid sensor data falls back after a bounded wait; stale timers do nothing', async () => {
  const h = setup(); await h.motion.enable();
  h.sample(null, null); h.advance(4000);
  assert.equal(h.motion.getState().status, 'unavailable'); assert.equal(h.motion.getState().enabled, false);
  assert.equal(h.window.listeners.get('deviceorientation').length, 0);
  await h.motion.enable(); h.sample(); h.advance(10000);
  assert.equal(h.motion.getState().status, 'ready', 'a steady phone may stop emitting changes');
  h.motion.disable(); h.advance(10000); assert.equal(h.motion.getState().status, 'off');
});

test('screen rotation and app interruptions clear steering and require a fresh neutral sample', async () => {
  const h = setup(); await h.motion.enable(); h.sample(); h.settle(0, 40);
  for (const target of ['rotation', 'blur', 'hidden']) {
    if (target === 'rotation') {
      h.orientation.angle = 90; h.orientation.dispatchEvent({type: 'change'});
    } else if (target === 'hidden') {
      h.document.hidden = true; h.document.dispatchEvent({type: 'visibilitychange'});
      h.sample(40, 0); h.advance(10000); assert.equal(h.motion.getState().enabled, true);
      h.document.hidden = false; h.document.dispatchEvent({type: 'visibilitychange'});
    } else h.window.dispatchEvent({type: 'blur'});
    assert.equal(h.motion.getState().steer, 0); assert.equal(h.motion.getState().status, 'waiting');
    h.sample(15, 0); assert.equal(h.motion.getState().steer, 0);
    assert(h.settle(45, 0) > .99);
  }
});

test('orientation events drive the real touch controller only while its primary finger is held', async () => {
  const h = setup({touch: true}); await h.motion.enable(); h.sample();
  h.settle(0, 28); assert.equal(h.input().throttle, 0); assert.equal(h.input().steer, 0);
  h.pointer('pointerdown', 1); assert.equal(h.input().throttle, 1); assert.equal(h.input().steer, 0);
  h.settle(0, 0); assert(h.input().steer < -.99);
  h.pointer('pointerdown', 2); assert.equal(h.input().throttle, 0); assert.equal(h.input().brake, 1);
  h.settle(0, 60); assert(h.input().steer > .99);
  h.pointer('pointerup', 2); assert.equal(h.input().throttle, 1);
  h.pointer('pointerup', 1); h.settle(0, -60);
  assert.equal(h.input().steer, 0); assert.equal(h.input().throttle, 0); assert.equal(h.input().brake, 0);
  h.motion.disable(); h.pointer('pointerdown', 3); h.pointer('pointermove', 3, 280);
  assert(h.input().steer > .8, 'disable restores finger steering');
});

(async () => {
  let passed = 0;
  for (const {name, run} of tests) {
    try { await run(); passed++; console.log('PASS ' + name); }
    catch (error) { console.error('FAIL ' + name + '\n' + error.stack); process.exitCode = 1; }
  }
  console.log(`Motion regressions: ${passed}/${tests.length} passed. Physical iPhone sensor behavior remains a device check.`);
})();
