'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = name => fs.readFileSync(path.join(__dirname, '..', 'src', name + '.js'), 'utf8');
const collisionContext = vm.createContext({window: {}});
vm.runInContext(source('collision'), collisionContext);
const Collision = collisionContext.window.ApexCollision;
const openRoad = {
  roadHalf: 4.65,
  curvature: () => 0,
  grade: () => 0,
  collisionRailOffset: () => Infinity
};
const rightRail = {...openRoad, collisionRailOffset: (distance, side) => side === 1 ? 5.485 : Infinity};

function actor(x, distance, lateralVelocity, forwardVelocity) {
  return {
    distance, lateral: x / 4.65, lateralVelocity, speed: forwardVelocity * 3.6,
    leanAngle: 0, lean: 0, crash: null, crashCount: 0, impact: null,
    weather: 'clear', rpm: 8000, pitch: 0
  };
}

function stepActor(collision, bike, dt, world) {
  const before = collision.capture(bike, world);
  collision.tick(bike, dt);
  if (!collision.moveDown(bike, dt, world)) {
    bike.distance += bike.speed / 3.6 * dt;
    bike.lateral += bike.lateralVelocity * dt / world.roadHalf;
  }
  collision.resolve([bike], [before], dt, world, 9000);
}

function test(name, run) {
  run();
  console.log('PASS ' + name);
}

test('near miss, glancing scrape, and equal-speed contact stay upright', () => {
  const collision = Collision.create();
  const nearMiss = actor(4.5, 100, 0, 60);
  stepActor(collision, nearMiss, .1, rightRail);
  assert.equal(nearMiss.impact, null);
  assert.equal(nearMiss.speed, 216);

  const scrape = actor(5.03, 100, .7, 45);
  for (let i = 0; i < 120; i++) {
    scrape.lateralVelocity = .7;
    stepActor(collision, scrape, 1 / 60, rightRail);
  }
  assert.equal(scrape.crashCount, 0);
  assert.equal(scrape.impact.type, 'rail');
  assert.equal(scrape.impact.id, 1);
  assert(scrape.barrierContact && scrape.impact.scraping > .1);

  const left = actor(0, 100, 0, 35);
  const right = actor(.81, 100, 0, 35);
  for (let i = 0; i < 80; i++) {
    const starts = [left, right].map(bike => collision.capture(bike, openRoad));
    for (const bike of [left, right]) {
      collision.tick(bike, 1 / 60);
      bike.distance += bike.speed / 3.6 / 60;
    }
    collision.resolve([left, right], starts, 1 / 60, openRoad, 5000);
  }
  assert.equal(left.crashCount + right.crashCount, 0);
  assert.equal(left.impact, null);
  assert(Math.abs(left.speed - 126) < 1e-8);
});

test('sweeps stop endcap and rider tunnelling and exchange reciprocal momentum', () => {
  const collision = Collision.create();
  const capRoad = {...rightRail, collisionRailOffset: (d, side) => side === 1 && d >= 100 ? 5.485 : Infinity};
  const capHit = actor(5.4, 97, 0, 60);
  stepActor(collision, capHit, .1, capRoad);
  assert(capHit.crash);
  assert(capHit.distance < 100);
  assert(capHit.speed < 20);

  const rear = actor(.1, 100, 0, 65);
  const front = actor(.1, 104, 0, 5);
  const starts = [rear, front].map(bike => collision.capture(bike, openRoad));
  const momentumBefore = rear.speed + front.speed;
  rear.distance += 6.5;
  front.distance += .5;
  collision.tick(rear, .1);
  collision.tick(front, .1);
  collision.resolve([rear, front], starts, .1, openRoad, 5000);
  assert(Math.abs(rear.speed + front.speed - momentumBefore) < 1e-8);
  assert(rear.distance < front.distance);
  assert(rear.crash && front.crash);
  assert.equal(rear.impact.type, 'rider');
  assert.equal(front.impact.type, 'rider');
});

test('30/60/120 Hz hard impacts recover once; wet slides stop later', () => {
  const stoppingPositions = [];
  for (const hz of [30, 60, 120]) {
    const collision = Collision.create();
    const bike = actor(4.2, 100, 7, 48);
    const phases = new Set();
    for (let frame = 0; frame < hz * 20; frame++) {
      // Match the engine's maximum physics step at slower display rates.
      let remaining = 1 / hz;
      while (remaining > 1e-8) {
        const dt = Math.min(remaining, 1 / 60);
        stepActor(collision, bike, dt, rightRail);
        remaining -= dt;
      }
      if (bike.crash) phases.add(bike.crash.phase);
      assert(bike.lateral * 4.65 < 5.485 - .415);
    }
    assert.equal(bike.crashCount, 1);
    assert.equal(bike.crash, null);
    assert.equal(bike.speed, 0);
    assert.deepEqual([...phases], ['fall', 'slide', 'recover']);
    assert(collision.tookRecovery(bike));
    stoppingPositions.push(bike.distance);
  }
  assert(Math.max(...stoppingPositions) - Math.min(...stoppingPositions) < .2);

  const slideDistances = [];
  for (const weather of ['clear', 'rain']) {
    const collision = Collision.create();
    const bike = actor(4.7, 100, 8, 30);
    bike.weather = weather;
    const world = {...rightRail, surfaceWetness: () => .8};
    let hadCrash = false;
    for (let i = 0; i < 1800; i++) {
      stepActor(collision, bike, 1 / 60, world);
      hadCrash ||= !!bike.crash;
      if (hadCrash && !bike.crash) break;
    }
    assert(hadCrash && !bike.crash);
    slideDistances.push(bike.distance - 100);
  }
  assert(slideDistances[1] > slideDistances[0] * 1.2);
});

test('a curved road rotates grounded velocity without adding kinetic energy', () => {
  const collision = Collision.create();
  const bike = actor(5, 50, 9, 35);
  stepActor(collision, bike, .02, rightRail);
  assert(bike.crash);
  const curvedRoad = {...openRoad, curvature: () => .009};
  let previousSpeed = Infinity;
  for (let i = 0; i < 100; i++) {
    stepActor(collision, bike, 1 / 120, curvedRoad);
    const pose = collision.capture(bike, curvedRoad);
    const speed = Math.hypot(pose.vx, pose.vz);
    assert(speed <= previousSpeed + .00001);
    previousSpeed = speed;
  }
});

class DetailEvent extends Event {
  constructor(name, init) {
    super(name);
    this.detail = init.detail;
  }
}

function setupEngine(world) {
  const window = new EventTarget();
  const document = new EventTarget();
  let now = 0;
  let nextFrame = null;
  Object.assign(window, {ApexWorld: {...world, draw() {}}});
  Object.assign(document, {
    readyState: 'complete',
    getElementById: () => ({
      getContext: () => ({setTransform() {}, save() {}, restore() {}}),
      getBoundingClientRect: () => ({width: 800, height: 480})
    })
  });
  const context = vm.createContext({
    window, document, CustomEvent: DetailEvent,
    localStorage: {getItem: () => null, setItem() {}},
    performance: {now: () => now},
    requestAnimationFrame: callback => { nextFrame = callback; }
  });
  for (const name of ['collision', 'race', 'engine']) vm.runInContext(source(name), context);
  function tick(count = 1) {
    for (let i = 0; i < count; i++) {
      now += 1000 / 60;
      const callback = nextFrame;
      nextFrame = null;
      if (callback) callback(now);
    }
  }
  function key(code, down = true, repeat = false) {
    const event = new Event(down ? 'keydown' : 'keyup', {cancelable: true});
    Object.assign(event, {code, repeat});
    window.dispatchEvent(event);
  }
  return {game: window.ApexGame, window, tick, key};
}

test('crash clocks and rivals continue; pause, snapshots, neutral rearm and reset work', () => {
  const {game, tick, key} = setupEngine(rightRail);
  game.setWeather('clear');
  game.start();
  key('KeyW');
  tick(650);
  key('KeyD');
  for (let i = 0; i < 1000 && !game.getState().crash; i++) tick();
  assert(game.getState().crash);
  const snapshot = game.getState();
  const timeBefore = snapshot.time;
  const rivalBefore = snapshot.rivals[0].distance;
  snapshot.crash.roll = 123;
  snapshot.impact.age = 123;
  assert.notEqual(game.getState().crash.roll, 123);
  assert.notEqual(game.getState().impact.age, 123);
  game.togglePause();
  const frozen = JSON.stringify(game.getState());
  tick(100);
  assert.equal(JSON.stringify(game.getState()), frozen);
  game.togglePause();
  for (let i = 0; i < 2500 && game.getState().crash; i++) {
    key('KeyW', true, true);
    key('KeyD', true, true);
    tick();
  }
  assert.equal(game.getState().crash, null);
  assert.equal(game.getState().crashCount, 1);
  assert(game.getState().time > timeBefore + 2);
  assert(game.getState().rivals[0].distance > rivalBefore);
  key('KeyW', true, true);
  key('KeyD', true, true);
  tick(120);
  assert.equal(game.getState().speed, 0);
  assert.equal(game.getState().throttle, 0);
  key('KeyW', false);
  key('KeyD', false);
  key('KeyW');
  tick(100);
  assert(game.getState().speed > 20);
  game.restart();
  assert.equal(game.getState().crash, null);
  assert.equal(game.getState().impact, null);
  assert.equal(game.getState().crashCount, 0);
});

test('normal and sliding finish crossings count; an earlier barrier blocks the finish', () => {
  for (const scenario of ['normal', 'sliding', 'endcap']) {
    const world = {...rightRail};
    if (scenario === 'sliding') world.curvature = d => d > 4740 ? -.035 : 0;
    if (scenario === 'endcap') world.collisionRailOffset = (d, side) => side === 1 && d >= 4788 ? 1.65 : Infinity;
    const {game, tick, key} = setupEngine(world);
    game.setWeather('clear');
    game.start();
    key('KeyW');
    for (let i = 0; i < 18000; i++) {
      tick();
      const s = game.getState();
      if (s.mode === 'finished' || scenario === 'endcap' && s.crash?.phase === 'recover') break;
    }
    const s = game.getState();
    if (scenario === 'endcap') {
      assert.equal(s.mode, 'racing');
      assert(s.distance < 4788);
      assert.equal(s.crashCount, 1);
    } else {
      assert.equal(s.mode, 'finished');
      assert.equal(s.distance, 4800);
      assert(Math.abs(s.time - s.splits.reduce((a, b) => a + b)) < 1e-8);
      if (scenario === 'sliding') assert(s.crash && s.crashCount === 1);
    }
  }
});

console.log('Collision regressions passed.');
