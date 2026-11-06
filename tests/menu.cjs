'use strict';

// Real engine event/lifecycle regression, without browser or renderer mocks that
// mutate simulation state. Shell navigation/focus/layout are checked in Chrome.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = name => fs.readFileSync(path.join(__dirname, '..', 'src', name + '.js'), 'utf8');
class DetailEvent extends Event {
  constructor(type, options = {}) { super(type, options); this.detail = options.detail; }
}
class Signals {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, fn) { const list = this.listeners.get(type) || []; list.push(fn); this.listeners.set(type, list); }
  removeEventListener(type, fn) { this.listeners.set(type, (this.listeners.get(type) || []).filter(entry => entry !== fn)); }
  dispatchEvent(event) { for (const fn of [...(this.listeners.get(event.type) || [])]) fn.call(this, event); return !event.defaultPrevented; }
}
function setup(withTouch = false) {
  const window = new Signals(), document = new Signals();
  let now = 0, nextFrame = null;
  const reset = [], updates = [];
  const buttons = Array.from({length: 16}, () => ({value: 0}));
  const pad = {index: 0, id: 'menu-test-pad', mapping: 'standard', connected: true, axes: [0], buttons};
  const canvas = new Signals();
  Object.assign(canvas, {style: {}, getContext: () => new Proxy({}, {get: () => () => {}}),
    getBoundingClientRect: () => ({left: 0, top: 0, width: 800, height: 480}), setPointerCapture() {}, releasePointerCapture() {}});
  Object.assign(window, {
    navigator: {getGamepads: () => [pad], maxTouchPoints: 5},
    ApexWorld: {roadHalf: 4.65, curvature: () => 0, grade: () => 0, collisionRailOffset: () => Infinity,
      surfaceWetness: () => .5, shelterAt: () => 0, selectCourse() {}, draw() {}}
  });
  Object.assign(document, {readyState: 'complete', hidden: false, fullscreenElement: null,
    getElementById: id => id === 'race-canvas' ? canvas : null});
  window.addEventListener('apex:input-reset', event => reset.push(event.detail.reason));
  window.addEventListener('apex:update', event => updates.push(event.detail));
  const context = vm.createContext({window, document, CustomEvent: DetailEvent,
    performance: {now: () => now}, requestAnimationFrame: fn => { nextFrame = fn; },
    localStorage: {getItem: key => key === 'apex-run.course.v1' ? 'sierra' : key === 'apex-run.weather.v3' ? 'clear' : null, setItem() {}}});
  for (const name of ['collision', 'race', 'engine']) vm.runInContext(source(name), context, {filename: name + '.js'});
  if (withTouch) vm.runInContext(source('touch'), context, {filename: 'touch.js'});
  const game = window.ApexGame;
  function tick(seconds) {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      now += 1000 / 60; const callback = nextFrame; nextFrame = null; callback?.(now);
    }
  }
  function key(code, options = {}) {
    const event = new Event(options.up ? 'keyup' : 'keydown', {cancelable: true});
    const {target, ...properties} = options;
    Object.assign(event, {code, repeat: false, ...properties});
    if (target) Object.defineProperty(event, 'target', {value: target});
    window.dispatchEvent(event); return event;
  }
  function race() { game.start(); tick(3.1); assert.equal(game.getState().mode, 'racing'); }
  function pointer(type, id, x = 300) {
    const event = new Event(type, {cancelable: true});
    Object.assign(event, {pointerType: 'touch', pointerId: id, clientX: x, clientY: 250, isPrimary: id === 1});
    Object.defineProperty(event, 'timeStamp', {value: now});
    (type === 'pointerdown' ? canvas : window).dispatchEvent(event);
  }
  return {window, document, game, tick, key, race, reset, updates, pad, pointer};
}
let count = 0;
function test(name, run) { run(); count++; console.log('PASS ' + name); }

test('menu transitions are idempotent, expose their state, reset controls and never publish recursively', () => {
  const h = setup(); const updates = h.updates.length, resets = h.reset.length;
  assert.equal(h.game.setMenuOpen(true), true);
  assert.equal(h.game.getState().menuOpen, true);
  h.game.setMenuOpen(true); h.game.setMenuOpen(false); h.game.setMenuOpen(false);
  assert.equal(h.game.getState().menuOpen, false);
  assert.deepEqual(h.reset.slice(resets), ['menu', 'menu']);
  assert.equal(h.updates.length, updates);
});

test('open menu blocks keyboard start/camera, digital touch, analogue touch and direct shifts', () => {
  const h = setup(); h.game.setTransmission('manual'); h.game.setMenuOpen(true);
  const camera = h.game.getState().camera;
  for (const code of ['Enter', 'KeyC', 'KeyE', 'KeyQ', 'KeyW', 'ArrowUp']) h.key(code);
  assert.equal(h.game.getState().mode, 'ready'); assert.equal(h.game.getState().camera, camera);
  h.game.setMenuOpen(false); h.race(); h.game.setMenuOpen(true);
  h.game.setTouch('throttle', true); h.game.setTouch('right', true);
  assert.equal(h.game.setTouchInput({throttle: 1, brake: 0, steer: 1}), false);
  assert.equal(h.game.shiftGear(1), false); h.tick(1);
  const state = h.game.getState();
  assert.equal(state.gear, 1); assert.equal(state.throttle, 0); assert.equal(state.speed, 0); assert.equal(state.lateral, .4);
});

test('cancelable Escape works in editable focus; P leaves text input alone; repeat never toggles', () => {
  const h = setup(); h.race(); const events = [];
  h.window.addEventListener('apex:menu-toggle', event => { events.push(event.detail.key); event.preventDefault(); });
  const input = {tagName: 'INPUT'};
  assert(h.key('Escape', {target: input}).defaultPrevented);
  h.key('KeyP', {target: input}); h.key('Escape', {repeat: true}); h.key('KeyP');
  assert.deepEqual(events, ['Escape', 'KeyP']); assert.equal(h.game.getState().mode, 'racing');
  h.key('Escape', {ctrlKey: true}); assert.equal(events.length, 2);
});

test('native fullscreen Escape remains unprevented while its custom menu request is cancelable', () => {
  const h = setup(); h.race(); h.document.fullscreenElement = {};
  let seen = 0;
  h.window.addEventListener('apex:menu-toggle', event => { seen++; assert(event.cancelable); event.preventDefault(); });
  assert.equal(h.key('Escape').defaultPrevented, false);
  assert.equal(seen, 1); assert.equal(h.game.getState().mode, 'racing');
});

test('standalone Escape fallback still pauses/resumes without a shell listener', () => {
  const h = setup(); h.race(); h.key('Escape'); assert.equal(h.game.getState().mode, 'paused');
  h.key('Escape'); assert.equal(h.game.getState().mode, 'racing');
});

test('gate alone leaves clocks running; explicit menu pause preserves distance, time and countdown', () => {
  const h = setup(); h.game.start(); h.tick(1);
  h.game.togglePause(); h.game.setMenuOpen(true); const countdown = h.game.getState().countdown;
  h.tick(5); assert.equal(h.game.getState().countdown, countdown);
  h.game.setMenuOpen(false); h.game.togglePause(); h.tick(2.2);
  assert.equal(h.game.getState().mode, 'racing');
  h.game.setTouchInput({throttle: 1}); h.tick(2); h.game.togglePause(); h.game.setMenuOpen(true);
  const before = h.game.getState(); h.tick(5); const after = h.game.getState();
  assert.equal(after.time, before.time); assert.equal(after.distance, before.distance);
  h.game.setMenuOpen(false); h.game.togglePause(); h.tick(.2);
  assert(h.game.getState().time > before.time);
  h.game.setMenuOpen(true); const gateTime = h.game.getState().time; h.tick(.2);
  assert(h.game.getState().time > gateTime, 'UI, not input gate, owns simulation pause');
});

test('keyboard held across menu requires keyup and fresh press, even if OS repeat resumes', () => {
  const h = setup(); h.race(); h.key('KeyW'); h.tick(.5); assert(h.game.getState().throttle > .8);
  h.game.togglePause(); h.game.setMenuOpen(true); h.key('KeyW', {repeat: true});
  h.game.setMenuOpen(false); h.game.togglePause(); h.key('KeyW', {repeat: true}); h.tick(2);
  assert(h.game.getState().throttle < .0001);
  h.key('KeyW', {up: true}); h.key('KeyW'); h.tick(.5); assert(h.game.getState().throttle > .8);
});

test('key pressed inside menu remains blocked after closing until released', () => {
  const h = setup(); h.race(); h.game.setMenuOpen(true); h.key('ArrowUp'); h.game.setMenuOpen(false);
  h.key('ArrowUp', {repeat: true}); h.tick(.5); assert.equal(h.game.getState().throttle, 0);
  h.key('ArrowUp', {up: true}); h.key('ArrowUp'); h.tick(.5); assert(h.game.getState().throttle > .8);
});

test('gamepad held through menu stays neutral until release and fresh trigger input', () => {
  const h = setup(); h.race(); h.pad.buttons[7].value = 1; h.tick(.5); assert(h.game.getState().throttle > .8);
  h.game.togglePause(); h.game.setMenuOpen(true); h.game.setMenuOpen(false); h.game.togglePause(); h.tick(2);
  assert(h.game.getState().throttle < .0001);
  h.pad.buttons[7].value = 0; h.tick(.1); h.pad.buttons[7].value = 1; h.tick(.5);
  assert(h.game.getState().throttle > .8);
});

test('real touch controller receives unpublished menu reset and cannot revive a held gesture', () => {
  const h = setup(true); h.race(); h.pointer('pointerdown', 1); h.tick(.5);
  assert(h.game.getState().throttle > .8);
  h.game.togglePause(); h.game.setMenuOpen(true);
  assert.equal(h.window.ApexTouch.getState().active, false);
  assert.equal(h.window.ApexTouch.getState().throttle, 0);
  h.pointer('pointerdown', 2); h.game.setMenuOpen(false); h.game.togglePause();
  h.pointer('pointermove', 1, 350); h.tick(2);
  assert(h.game.getState().throttle < .0001);
  h.pointer('pointerup', 1); h.pointer('pointerup', 2); h.pointer('pointerdown', 1); h.tick(.5);
  assert(h.game.getState().throttle > .8);
});

test('course and conditions cannot replace a paused run; explicit end returns to configurable grid', () => {
  const h = setup(); h.race(); h.game.togglePause(); h.game.setMenuOpen(true);
  assert.equal(h.game.setCourse('coast'), false); assert.equal(h.game.setWeather('rain'), false);
  assert.equal(h.game.setTransmission('manual'), false);
  h.game.returnToGrid(); assert.equal(h.game.getState().menuOpen, true);
  assert(h.game.setCourse('coast')); assert(h.game.setWeather('rain')); assert(h.game.setTransmission('manual'));
  const state = h.game.getState(); assert.equal(state.mode, 'ready'); assert.equal(state.distance, 0); assert.equal(state.time, 0);
  assert.equal(state.course, 'coast'); assert.equal(state.weather, 'rain'); assert.equal(state.transmission, 'manual');
});
console.log('\n' + count + ' menu lifecycle checks passed.');
