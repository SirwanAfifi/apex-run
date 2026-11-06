'use strict';

// Independent event/physics checks: no browser, dependency package, or absolute path.
// Native multitouch delivery and mobile layout are separate device/UI checks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const source = name => fs.readFileSync(path.join(__dirname, '..', 'src', name + '.js'), 'utf8');
const match = process.argv.slice(2).join(' ');
let passed = 0;
const failures = [];
function test(name, run) {
  if (match && !name.includes(match)) return;
  try { run(); passed++; console.log('PASS ' + name); }
  catch (error) { failures.push(name); console.error('FAIL ' + name + '\n' + error.stack); }
}
class DetailEvent extends Event {
  constructor(type, options = {}) { super(type, options); this.detail = options.detail; }
}
// Keep listener exceptions synchronous so a failed controller assertion cannot
// be deferred past a test's PASS line by Node's native EventTarget error queue.
class SignalTarget {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, fn, options = {}) { const list = this.listeners.get(type) || []; list.push({fn, once: !!options?.once}); this.listeners.set(type, list); }
  removeEventListener(type, fn) { this.listeners.set(type, (this.listeners.get(type) || []).filter(entry => entry.fn !== fn)); }
  dispatchEvent(event) { for (const entry of [...(this.listeners.get(event.type) || [])]) { if (entry.once) this.removeEventListener(event.type, entry.fn); entry.fn.call(this, event); } return !event.defaultPrevented; }
}

function setup(options = {}) {
  let now = 0, nextFrame = null, serial = 0;
  const timers = new Map();
  const window = new SignalTarget(), document = new SignalTarget(), orientation = new SignalTarget();
  const capture = new Set(), writes = [], shifts = [], notifications = [];
  const paint = new Proxy({
    measureText: text => ({width: String(text).length * 7}),
    createLinearGradient: () => ({addColorStop() {}}),
    createRadialGradient: () => ({addColorStop() {}})
  }, {get: (target, key) => key in target ? target[key] : () => {}});
  const surface = new SignalTarget();
  Object.assign(surface, {
    id: 'race-canvas', tagName: 'CANVAS', width: 400, height: 500,
    clientWidth: 400, clientHeight: 500, style: {}, dataset: {},
    getContext: () => paint,
    getBoundingClientRect: () => ({left: 10, top: 20, width: 400, height: 500, right: 410, bottom: 520}),
    setPointerCapture: id => { if (options.captureFailure) throw Error('capture unavailable'); capture.add(id); },
    hasPointerCapture: id => capture.has(id), releasePointerCapture: id => capture.delete(id),
    setAttribute() {}, removeAttribute() {}, closest: () => null
  });
  Object.assign(document, {
    readyState: 'loading', hidden: false, visibilityState: 'visible',
    getElementById: id => id === 'race-canvas' ? surface : null,
    querySelector: () => null, documentElement: {style: {}}, body: {style: {}}
  });
  const media = new SignalTarget(); media.matches = true; media.addListener = fn => media.addEventListener('change', fn);
  const screen = {orientation};
  const navigator = {maxTouchPoints: 5, getGamepads: () => []};
  const raf = callback => { nextFrame = callback; return ++serial; };
  Object.assign(window, {
    screen, navigator, PointerEvent: Event, devicePixelRatio: 2,
    innerWidth: 400, innerHeight: 800, matchMedia: () => media,
    requestAnimationFrame: raf, cancelAnimationFrame: () => { nextFrame = null; }
  });
  const schedule = (callback, delay = 0) => { const id = ++serial; timers.set(id, {at: now + delay, callback}); return id; };
  const context = vm.createContext({
    window, document, screen, navigator, Event, EventTarget, CustomEvent: DetailEvent,
    performance: {now: () => now}, requestAnimationFrame: raf,
    cancelAnimationFrame: () => { nextFrame = null; },
    setTimeout: schedule, clearTimeout: id => timers.delete(id),
    localStorage: {getItem: () => null, setItem() {}}, console
  });
  let state = {mode: 'racing', transmission: 'auto', crash: null, recovering: false, time: 20, distance: 100, course: 'sierra'};
  let input = {steer: 0, throttle: 0, brake: 0};
  const stub = {
    getState: () => ({...state}),
    setTouchInput: next => {
      for (const key of ['steer', 'throttle', 'brake']) assert(Number.isFinite(next[key]), key + ' must stay finite');
      assert(Math.abs(next.steer) <= 1 && next.throttle >= 0 && next.throttle <= 1 && next.brake >= 0 && next.brake <= 1);
      input = {...next}; writes.push(input);
    },
    shiftGear: direction => { shifts.push({direction, at: now}); return options.rejectShift ? false : true; }
  };
  if (options.engine) {
    window.ApexWorld = {
      roadHalf: 4.65, curvature: () => 0, grade: () => 0,
      surfaceWetness: () => .5, shelterAt: () => 0,
      collisionRailOffset: (d, side) => side !== 1 || !options.rail ? Infinity : options.rail === 'endcap' ? (d >= 300 ? 1.65 : Infinity) : 5.485,
      selectCourse() {}, draw() {}
    };
    for (const name of ['collision', 'race', 'engine']) vm.runInContext(source(name), context, {filename: name + '.js'});
  } else window.ApexGame = stub;
  window.addEventListener('apex:touch', event => notifications.push({...event.detail}));
  vm.runInContext(source('touch'), context, {filename: 'touch.js'});
  let controller;
  if (options.engine) {
    document.readyState = 'complete'; document.dispatchEvent(new Event('DOMContentLoaded'));
    controller = window.ApexTouch;
  } else controller = window.ApexTouch.init(surface, stub);
  const game = window.ApexGame;
  function advance(ms) {
    now += ms;
    for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.callback(); }
  }
  function frame(hz = 60) {
    advance(1000 / hz); const callback = nextFrame; nextFrame = null; if (callback) callback(now);
  }
  function tick(seconds, hz = 60) { for (let i = 0; i < Math.round(seconds * hz); i++) frame(hz); }
  function pointer(type, id, x = 210, y = 270, extras = {}) {
    const event = new Event(type, {bubbles: true, cancelable: true});
    Object.assign(event, {pointerId: id, pointerType: 'touch', clientX: x, clientY: y, button: 0, buttons: /up|cancel/.test(type) ? 0 : 1, isPrimary: id === 0, ...extras});
    Object.defineProperty(event, 'timeStamp', {value: now});
    surface.dispatchEvent(event);
    // Native EventTarget has no DOM bubbling; reproduce the surface→window route.
    if (!event.cancelBubble) window.dispatchEvent(event);
    return event;
  }
  function publish(patch) { Object.assign(state, patch); window.dispatchEvent(new DetailEvent('apex:update', {detail: {...state}})); }
  function signal(name, detail) { window.dispatchEvent(new DetailEvent(name, {detail})); }
  const neutral = () => { assert.equal(input.steer, 0); assert.equal(input.throttle, 0); assert.equal(input.brake, 0); };
  return {window, document, screen, surface, capture, controller, game, pointer, advance, frame, tick, publish, signal, neutral,
    input: () => input, writes, shifts, notifications, state: () => ({...state})};
}

test('primary ID zero holds gas; relative analogue steering is finite, clamped and reversible', () => {
  const h = setup();
  const down = h.pointer('pointerdown', 0, 180);
  assert(down.defaultPrevented); assert.equal(h.input().throttle, 1); assert.equal(h.input().steer, 0);
  h.pointer('pointermove', 0, 215); const right = h.input().steer;
  assert(right > 0 && right < 1);
  h.pointer('pointermove', 0, 145); assert(Math.abs(h.input().steer + right) < 1e-9);
  h.pointer('pointermove', 0, 10000); assert.equal(h.input().steer, 1);
  h.pointer('pointermove', 0, -10000); assert.equal(h.input().steer, -1);
  h.pointer('pointermove', 0, 180); assert.equal(h.input().steer, 0);
  h.pointer('pointerup', 0); h.neutral();
  h.pointer('pointerdown', 71, 285); h.pointer('pointermove', 71, 320);
  assert(Math.abs(h.input().steer - right) < 1e-9, 'same drag is independent of initial screen position');
  h.pointer('pointermove', 71, NaN, Infinity);
  assert(Number.isFinite(h.input().steer));
});

test('pointer order, not numeric ID or isPrimary, owns steering; extra fingers brake without losing steer', () => {
  const h = setup();
  h.pointer('pointerdown', 903, 200, 270, {isPrimary: false});
  h.pointer('pointermove', 903, 235); const steer = h.input().steer;
  h.pointer('pointerdown', 4, 320, 300, {isPrimary: true});
  assert.equal(h.input().throttle, 0); assert.equal(h.input().brake, 1); assert.equal(h.input().steer, steer);
  h.pointer('pointermove', 4, 20); assert.equal(h.input().steer, steer);
  h.pointer('pointermove', 903, 165); assert(h.input().steer < 0);
  h.pointer('pointerdown', 55); h.pointer('pointerup', 4); assert.equal(h.input().brake, 1);
  h.pointer('pointerup', 55); assert.equal(h.input().brake, 0); assert.equal(h.input().throttle, 1);
  h.pointer('pointerup', 903); h.neutral();
});

test('lifting the primary never promotes surviving fingers or a newly added finger to gas', () => {
  const h = setup();
  h.pointer('pointerdown', 12); h.pointer('pointerdown', 2); h.pointer('pointerup', 12);
  assert.equal(h.input().throttle, 0); assert.equal(h.input().brake, 1);
  h.pointer('pointermove', 2, 350); assert.equal(h.input().throttle, 0);
  h.pointer('pointerdown', 1); h.pointer('pointerup', 2);
  assert.equal(h.input().throttle, 0); assert.equal(h.input().brake, 1);
  h.pointer('pointerup', 1); h.neutral();
  h.pointer('pointerdown', 7); assert.equal(h.input().throttle, 1);
});

test('duplicate and stale pointer events cannot rebase or cancel a fresh gesture', () => {
  const h = setup();
  h.pointer('pointerdown', 8, 200); h.pointer('pointermove', 8, 240); const steer = h.input().steer;
  h.pointer('pointerdown', 8, 240); assert.equal(h.input().steer, steer);
  h.pointer('pointerup', 8); h.pointer('pointerdown', 9);
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) h.pointer(event, 8);
  assert.equal(h.input().throttle, 1); assert.equal(h.input().brake, 0);
});

test('mouse is ignored; pen uses the same gesture contract, including capture failure', () => {
  const h = setup({captureFailure: true});
  h.pointer('pointerdown', 5, 210, 270, {pointerType: 'mouse'}); h.neutral();
  h.pointer('pointerdown', 6, 210, 270, {pointerType: 'pen'}); assert.equal(h.input().throttle, 1);
  h.pointer('pointerup', 6, 210, 270, {pointerType: 'pen'}); h.neutral();
});

for (const cancelled of [11, 22]) for (const event of ['pointercancel', 'lostpointercapture']) {
  test(event + ' on ' + (cancelled === 11 ? 'primary' : 'secondary') + ' neutralizes the cohort', () => {
    const h = setup(); h.pointer('pointerdown', 11); h.pointer('pointerdown', 22);
    h.pointer(event, cancelled); h.neutral();
    h.pointer('pointermove', cancelled === 11 ? 22 : 11, 360); h.neutral();
    h.pointer('pointerdown', 33); h.neutral();
    h.pointer('pointerup', 11); h.pointer('pointerup', 22); h.pointer('pointerup', 33);
    h.pointer('pointerdown', 44); assert.equal(h.input().throttle, 1);
  });
}

for (const interruption of ['blur', 'hidden', 'resize', 'orientation', 'pause', 'crash', 'finish', 'reset']) {
  test(interruption + ' requires all old contacts to lift before a fresh gesture', () => {
    const h = setup(); h.pointer('pointerdown', 1); h.pointer('pointerdown', 2);
    if (interruption === 'hidden') {
      h.document.hidden = true; h.document.visibilityState = 'hidden'; h.document.dispatchEvent(new Event('visibilitychange'));
      h.document.hidden = false; h.document.visibilityState = 'visible'; h.document.dispatchEvent(new Event('visibilitychange'));
    } else if (interruption === 'orientation') h.screen.orientation.dispatchEvent(new Event('change'));
    else if (interruption === 'resize') {
      h.surface.getBoundingClientRect = () => ({left: 10, top: 20, width: 500, height: 400}); h.signal('resize');
    }
    else if (interruption === 'pause') h.publish({mode: 'paused'});
    else if (interruption === 'crash') h.publish({crash: {phase: 'fall'}});
    else if (interruption === 'finish') h.publish({mode: 'finished'});
    else if (interruption === 'reset') h.signal('apex:input-reset', {reason: 'restart'});
    else h.signal(interruption);
    h.neutral(); h.publish({mode: 'racing', crash: null});
    h.pointer('pointermove', 1, 290); h.neutral();
    h.pointer('pointerdown', 3); h.neutral();
    h.pointer('pointerup', 1); h.pointer('pointerup', 2); h.pointer('pointerup', 3);
    h.pointer('pointerdown', 4); assert.equal(h.input().throttle, 1);
  });
}

test('only countdown/racing accepts a new gesture; countdown→race retains it', () => {
  const h = setup();
  for (const mode of ['ready', 'paused', 'finished']) {
    h.publish({mode}); h.pointer('pointerdown', 7); h.neutral(); h.pointer('pointerup', 7);
  }
  h.publish({mode: 'countdown'}); h.pointer('pointerdown', 8); assert.equal(h.input().throttle, 1);
  h.publish({mode: 'racing'}); assert.equal(h.input().throttle, 1);
});

test('unchanged resize preserves control; a new browser-primary contact recovers a missing terminal event', () => {
  const h = setup(); h.pointer('pointerdown', 1); h.signal('resize'); assert.equal(h.input().throttle, 1);
  h.signal('blur'); h.neutral();
  // isPrimary on a new same-type pointer is the browser's proof that all old
  // same-type contacts ended, even if an app switch swallowed their pointerup.
  h.pointer('pointerdown', 2, 210, 270, {isPrimary: true}); assert.equal(h.input().throttle, 1);
  h.signal('blur'); h.pointer('pointerdown', 3, 210, 270, {pointerType: 'pen', isPrimary: true}); h.neutral();
});

test('contacts begun while crashed stay quarantined across recovery', () => {
  const h = setup(); h.publish({crash: {phase: 'slide'}});
  h.pointer('pointerdown', 1); h.neutral(); h.publish({crash: null});
  h.pointer('pointermove', 1, 250); h.neutral();
  h.pointer('pointerdown', 2); h.neutral();
  h.pointer('pointerup', 1); h.pointer('pointerup', 2); h.pointer('pointerdown', 3);
  assert.equal(h.input().throttle, 1);
});

test('manual flick works after a long hold; a held offset or jitter cannot repeat it', () => {
  const h = setup(); h.publish({transmission: 'manual'}); h.pointer('pointerdown', 1, 200, 300);
  h.advance(5000); h.pointer('pointermove', 1, 200, 296);
  h.advance(60); h.pointer('pointermove', 1, 201, 275);
  h.advance(60); h.pointer('pointermove', 1, 201, 215);
  assert.deepEqual(h.shifts.map(s => s.direction), [1]);
  for (let i = 0; i < 60; i++) { h.advance(30); h.pointer('pointermove', 1, 201, 212 + i % 3); }
  assert.equal(h.shifts.length, 1); assert.equal(h.input().throttle, 1);
});

test('deliberate return and cooldown rearms a second flick without lifting throttle', () => {
  const h = setup(); h.publish({transmission: 'manual'}); h.pointer('pointerdown', 1, 200, 300);
  h.advance(120); h.pointer('pointermove', 1, 200, 220); assert.equal(h.shifts.length, 1);
  h.advance(600); h.pointer('pointermove', 1, 200, 300);
  h.advance(80); h.pointer('pointermove', 1, 200, 320);
  h.advance(80); h.pointer('pointermove', 1, 200, 385);
  assert.deepEqual(h.shifts.map(s => s.direction), [1, -1]);
  assert.equal(h.input().throttle, 1);
});

test('manual flick rejects small, slow, horizontal, automatic, and braking-finger motion', () => {
  for (const scenario of ['small', 'slow', 'horizontal', 'automatic', 'secondary']) {
    const h = setup(); h.publish({transmission: scenario === 'automatic' ? 'auto' : 'manual'});
    h.pointer('pointerdown', 1, 200, 300);
    if (scenario === 'secondary') h.pointer('pointerdown', 2, 300, 300);
    const id = scenario === 'secondary' ? 2 : 1;
    if (scenario === 'slow') {
      for (let i = 1; i <= 10; i++) { h.advance(100); h.pointer('pointermove', id, 200, 300 - i * 8); }
    } else { h.advance(120); h.pointer('pointermove', id, scenario === 'horizontal' ? 300 : 200, scenario === 'small' ? 285 : 220); }
    assert.equal(h.shifts.length, 0, scenario + ' must not shift');
  }
});

test('manual travel, direction dominance and speed thresholds distinguish deliberate flicks', () => {
  const cases = [
    {x: 0, y: -49, ms: 120, expected: 0},
    {x: 0, y: -51, ms: 120, expected: 1},
    {x: 31, y: -54, ms: 120, expected: 0},
    {x: 29, y: -54, ms: 120, expected: 1},
    {x: 0, y: -51, ms: 200, expected: 0},
    {x: 0, y: -51, ms: 150, expected: 1}
  ];
  for (const scenario of cases) {
    const h = setup(); h.publish({transmission: 'manual'}); h.pointer('pointerdown', 1, 200, 300);
    h.advance(scenario.ms); h.pointer('pointermove', 1, 200 + scenario.x, 300 + scenario.y);
    assert.equal(h.shifts.length, scenario.expected, JSON.stringify(scenario));
  }
});

test('returning early cannot defeat shift cooldown or queue a shift', () => {
  const h = setup(); h.publish({transmission: 'manual'}); h.pointer('pointerdown', 1, 200, 300);
  h.advance(100); h.pointer('pointermove', 1, 200, 220); assert.equal(h.shifts.length, 1);
  h.advance(100); h.pointer('pointermove', 1, 200, 300);
  h.advance(100); h.pointer('pointermove', 1, 200, 220);
  h.advance(600); h.pointer('pointermove', 1, 200, 219);
  assert.equal(h.shifts.length, 1, 'a held early repeat must not activate later');
});

test('a rejected shift is not retried or queued while the same stroke is held', () => {
  const h = setup({rejectShift: true}); h.publish({transmission: 'manual'}); h.pointer('pointerdown', 1, 200, 300);
  h.advance(100); h.pointer('pointermove', 1, 200, 215); assert.equal(h.shifts.length, 1);
  for (let i = 0; i < 80; i++) { h.advance(20); h.pointer('pointermove', 1, 200, 210 - i % 4); }
  assert.equal(h.shifts.length, 1); assert.equal(h.input().throttle, 1);
});

test('30/60/120 Hz gesture sampling produces the same analogue endpoint and one shift', () => {
  const results = [];
  for (const hz of [30, 60, 120]) {
    const h = setup(); h.publish({transmission: 'manual'}); h.pointer('pointerdown', 1, 200, 300);
    for (let i = 1; i <= hz / 2; i++) { h.advance(1000 / hz); h.pointer('pointermove', 1, 200 + i / (hz / 2) * 24, 300); }
    const steer = h.input().steer;
    for (let i = 1; i <= Math.round(hz * .2); i++) { h.advance(1000 / hz); h.pointer('pointermove', 1, 224, 300 - i / Math.round(hz * .2) * 90); }
    assert.equal(h.shifts.length, 1); results.push(steer);
  }
  assert(Math.max(...results) - Math.min(...results) < 1e-9);
});

test('destroy is neutral and detaches pointer listeners', () => {
  const h = setup(); h.pointer('pointerdown', 1); h.controller.destroy(); h.neutral();
  h.pointer('pointermove', 1, 350); h.pointer('pointerup', 1); h.pointer('pointerdown', 2); h.neutral();
});

test('real engine accepts analogue gas/brake/steer and remains consistent at 30/60/120 Hz', () => {
  const outcomes = [];
  for (const hz of [30, 60, 120]) {
    const h = setup({engine: true}); h.game.setCourse('sierra'); h.game.setWeather('clear'); h.game.start();
    h.pointer('pointerdown', 1, 210, 270); h.tick(8, hz);
    const powered = h.game.getState(); assert(powered.speed > 75 && powered.throttle > .95);
    h.pointer('pointermove', 1, 230); h.tick(.4, hz); assert(h.game.getState().leanAngle > 1);
    h.pointer('pointermove', 1, 210); h.pointer('pointerdown', 2); h.tick(1, hz);
    const braking = h.game.getState(); assert(braking.brake > .95 && braking.throttle < .02); assert(braking.speed < powered.speed);
    h.pointer('pointerup', 1); h.tick(.5, hz); assert(h.game.getState().throttle < .01);
    h.pointer('pointerup', 2); h.tick(.5, hz);
    const coast = h.game.getState(); assert(coast.throttle < .01 && coast.brake < .01);
    outcomes.push({hz, speed: coast.speed, distance: coast.distance, lean: coast.leanAngle});
  }
  assert(Math.max(...outcomes.map(s => s.distance)) - Math.min(...outcomes.map(s => s.distance)) < 1.2);
  assert(Math.max(...outcomes.map(s => s.speed)) - Math.min(...outcomes.map(s => s.speed)) < .8);
  console.log('  frame-rate outcomes ' + JSON.stringify(outcomes));
});

test('real engine pause/restart and direct invalid input cannot revive a held gesture', () => {
  const h = setup({engine: true}); h.game.setCourse('sierra'); h.game.setWeather('clear'); h.game.start();
  h.pointer('pointerdown', 1); h.tick(5); assert(h.game.getState().throttle > .9);
  h.game.togglePause(); h.game.togglePause(); h.pointer('pointermove', 1, 260); h.tick(.5);
  assert(h.game.getState().throttle < .02);
  h.pointer('pointerup', 1); h.pointer('pointerdown', 2); h.tick(.5); assert(h.game.getState().throttle > .9);
  h.game.restart(); h.pointer('pointermove', 2, 250); h.tick(4); assert.equal(h.game.getState().speed, 0);
  h.game.setTouchInput({steer: NaN, throttle: Infinity, brake: -Infinity}); h.tick(.5);
  const s = h.game.getState(); for (const k of ['speed', 'throttle', 'brake', 'leanAngle', 'lateral']) assert(Number.isFinite(s[k]), k);
});

test('real manual gearbox rejection is consumed and a later deliberate upshift succeeds', () => {
  const h = setup({engine: true}); h.game.setCourse('sierra'); h.game.setWeather('clear'); h.game.setTransmission('manual'); h.game.start();
  const shift = h.game.shiftGear, attempts = [];
  h.game.shiftGear = direction => { const accepted = shift(direction); attempts.push({direction, accepted}); return accepted; };
  h.pointer('pointerdown', 1, 210, 270); h.tick(4);
  h.pointer('pointermove', 1, 210, 275); h.advance(100); h.pointer('pointermove', 1, 210, 350);
  assert.equal(h.game.getState().gear, 1); assert.deepEqual(attempts, [{direction: -1, accepted: false}]);
  for (let i = 0; i < 90; i++) { h.frame(); h.pointer('pointermove', 1, 210, 350 + i % 2); }
  assert.equal(attempts.length, 1);
  h.pointer('pointermove', 1, 210, 270); h.advance(100); h.pointer('pointermove', 1, 210, 190);
  assert.deepEqual(attempts, [{direction: -1, accepted: false}, {direction: 1, accepted: true}]);
  assert.equal(h.game.getState().gear, 2);
});

test('real crash entry, remount and fresh-gesture rearm agree with the controller', () => {
  const h = setup({engine: true, rail: 'endcap'}); h.game.setCourse('sierra'); h.game.setWeather('clear'); h.game.start();
  // A frontal endcap produces an unambiguous hard collision rather than relying
  // on a glancing scrape sitting near the crash severity threshold.
  h.pointer('pointerdown', 1);
  for (let i = 0; i < 1200 && !h.game.getState().crash; i++) h.frame();
  assert(h.game.getState().crash, 'rail collision should produce a real crash: ' + JSON.stringify({game: h.game.getState(), touch: h.controller.getState()}));
  assert.equal(h.controller.getState().throttle, 0);
  // Remove the fixture's deliberately lane-blocking endcap after impact so the
  // final assertion measures input rearming, not acceleration into a solid wall.
  h.window.ApexWorld.collisionRailOffset = () => Infinity;
  h.pointer('pointerdown', 2);
  for (let i = 0; i < 2400 && h.game.getState().crash; i++) h.frame();
  assert.equal(h.game.getState().crash, null); assert.equal(h.game.getState().crashCount, 1);
  h.pointer('pointermove', 1, 210); h.tick(1);
  assert.equal(h.game.getState().speed, 0); assert.equal(h.game.getState().throttle, 0);
  h.pointer('pointerup', 1); h.pointer('pointerup', 2); h.pointer('pointerdown', 3); h.tick(1);
  assert(h.game.getState().speed > 10 && h.game.getState().throttle > .95, JSON.stringify({game: h.game.getState(), touch: h.controller.getState()}));
});

test('a real finish and immediate restart cannot retain the old accelerator finger', () => {
  const h = setup({engine: true}); h.game.setCourse('sierra'); h.game.setWeather('clear'); h.game.start();
  h.pointer('pointerdown', 1);
  for (let i = 0; i < 12000 && h.game.getState().mode !== 'finished'; i++) h.frame();
  assert.equal(h.game.getState().mode, 'finished'); assert.equal(h.controller.getState().throttle, 0);
  h.game.restart(); h.pointer('pointermove', 1, 210); h.tick(4);
  assert.equal(h.game.getState().speed, 0);
  h.pointer('pointerup', 1); h.pointer('pointerdown', 2); h.tick(1); assert(h.game.getState().speed > 10);
});

test('existing collision and keyboard physics regressions still pass', () => {
  const output = execFileSync(process.execPath, [path.join(__dirname, 'collision.cjs')], {encoding: 'utf8'});
  assert(output.includes('Collision regressions passed.'));
  console.log(output.trim().split('\n').map(line => '  ' + line).join('\n'));
});

if (failures.length) { console.error(`Touch regressions: ${passed} passed, ${failures.length} failed.`); process.exitCode = 1; }
else console.log(`Touch regressions passed (${passed} checks). Native mobile multitouch remains a device/UI check.`);
