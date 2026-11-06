'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname,'..');
const source = name => fs.readFileSync(path.join(root,'src',name+'.js'),'utf8');
const host = fs.readFileSync(path.join(root,'native/tvos/Runtime/host.js'),'utf8');
const common = ['motorcycles','coast','london','world-model','collision','race'];
const plain = value => JSON.parse(JSON.stringify(value));
const preferences = {
  'apex-run.course.v1':'coast','apex-run.coast.weather.v1':'clear',
  'apex-run.camera.v1':'chase','apex-run.transmission.v3':'auto'
};
function native(onInputReset) {
  // Deliberately no document, events, timer, AudioContext or browser storage.
  const context = vm.createContext(onInputReset ? {nativeInputReset:onInputReset} : {});
  vm.runInContext('globalThis.window=globalThis',context);
  for (const name of common) vm.runInContext(source(name),context);
  vm.runInContext(host,context);
  vm.runInContext(source('engine'),context);
  return {context,game:context.ApexGame,api:context.ApexNative,world:context.ApexWorld};
}
function browser() {
  let time = 0, callback;
  const window = new EventTarget(), document = new EventTarget();
  const store = new Map(Object.entries(preferences));
  const canvas = {getContext:()=>({setTransform(){},save(){},restore(){}}),
    getBoundingClientRect:()=>({width:1280,height:720})};
  Object.assign(document,{readyState:'complete',hidden:false,getElementById:()=>canvas});
  class DetailEvent extends Event {constructor(name,options) {super(name);this.detail=options.detail;}}
  const context = vm.createContext({window,document,CustomEvent:DetailEvent,
    performance:{now:()=>time},requestAnimationFrame:fn=>{callback=fn;},
    localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)}});
  for (const name of common) vm.runInContext(source(name),context);
  window.ApexWorld = window.ApexWorldModel.create('coast');
  window.ApexWorld.draw = () => {};
  vm.runInContext(source('engine'),context);
  return {game:window.ApexGame,step(dt,input) {
    window.ApexGame.setTouchInput(input);
    time += dt * 1000;
    const frame = callback; callback = null; frame?.(time);
    return plain(window.ApexGame.getState());
  }};
}
let passed = 0;
function test(name,fn) {fn();passed++;console.log('PASS '+name);}

test('native starts without browser globals and uses the existing route and catalogue',()=>{
  const {api,context} = native(), state = JSON.parse(api.stateJSON());
  assert.equal(typeof context.document,'undefined');
  assert.equal(typeof context.performance,'undefined');
  assert.equal(state.course,'coast');assert.equal(state.weather,'clear');
  assert.equal(state.camera,'chase');assert.equal(state.motorcycle.model,'r600');
  assert.equal(state.rivals.length,3);
  assert.deepEqual(state.audioProfile,plain(context.ApexMotorcycles.getModel('r600').physics));
});

test('browser animation frames and native steps preserve the same physics and race outcomes',()=>{
  const n = native(), b = browser();
  n.api.start();b.game.start();
  // Exercise acceleration, braking, steering, suspension, AI and collision state
  // on the actual curved route at different display refresh rates.
  for (let i=0; i<720; i++) {
    const dt = [1/30,1/60,1/120][Math.floor(i/240)];
    const input = {steer:Math.sin(i/70)*.11,throttle:i%180<145?.8:0,brake:i%180>=145?.35:0};
    n.api.step(dt,input.steer,input.throttle,input.brake);
    const expected = b.step(dt,input), actual = plain(n.game.getState());
    for (const key of ['speed','distance','time','leanAngle','rpm','lateral','pitch','suspension']) {
      assert(Math.abs(actual[key]-expected[key])<1e-8,`${key} drift at frame ${i}`);
    }
    assert.equal(actual.mode,expected.mode);
    assert.equal(actual.racePosition,expected.racePosition);
    assert.equal(actual.crashCount,expected.crashCount);
    actual.rivals.forEach((rider,index)=>assert(Math.abs(rider.distance-expected.rivals[index].distance)<1e-8));
  }
});

test('pause freezes simulation, resume continues, restart resets race and neutralizes inputs',()=>{
  const {api} = native();api.start();
  for(let i=0;i<360;i++)api.step(1/60,0,1,0);
  const before = JSON.parse(api.pause());assert.equal(before.mode,'paused');
  for(let i=0;i<60;i++)api.step(1/60,1,1,0);
  const paused = JSON.parse(api.stateJSON());
  assert.equal(paused.distance,before.distance);assert.equal(paused.time,before.time);
  assert.equal(paused.weatherTime,before.weatherTime);
  api.resume();const resumed=JSON.parse(api.step(1/60,0,0,0));
  assert(resumed.time>before.time);
  const restarted=JSON.parse(api.restart());
  assert.equal(restarted.mode,'countdown');assert.equal(restarted.distance,0);
  assert.equal(restarted.time,0);assert.equal(restarted.speed,0);
  assert.equal(restarted.throttle,0);assert.equal(restarted.crashCount,0);
});

test('crash and recovery reset events reach the native controller adapter',()=>{
  const resets = [], {api} = native(reason=>resets.push(reason));
  api.start();
  let state;
  // Accelerate on the actual course, then steer into its left guardrail. Let
  // the real crash/recovery simulation finish rather than mutating its state.
  for(let i=0;i<2400 && !resets.includes('recovery');i++) {
    state = JSON.parse(api.step(1/60,i>360?-.8:0,1,0));
  }
  assert.equal(state.crashCount,1);
  assert(resets.includes('crash'),'native controls must reset when the bike falls');
  assert(resets.includes('recovery'),'native controls must rearm after recovery');
  assert(resets.indexOf('crash')<resets.indexOf('recovery'));
  assert.equal(resets.filter(reason=>reason==='crash').length,1);
  assert.equal(resets.filter(reason=>reason==='recovery').length,1);
  assert.equal(state.speed,0);assert.equal(state.throttle,0);
  api.pause();assert.equal(resets.at(-1),'pause');
});

test('invalid or stalled host frames cannot inject NaN or arbitrarily advance the race',()=>{
  const {api}=native();api.start();
  for(const dt of [NaN,Infinity,-1])api.step(dt,NaN,Infinity,-1);
  assert.equal(JSON.parse(api.stateJSON()).countdown,3);
  for(let i=0;i<12;i++)api.step(10,0,0,0);
  const s=JSON.parse(api.stateJSON());assert.equal(s.mode,'racing');
  assert(s.time<1e-8);assert.equal(s.speed,0);
  assert(s.worldPosition.every(Number.isFinite));
});

test('native track uses the exact shared survey, rail boundaries and authored landmarks',()=>{
  const {api,world,context}=native(), track=JSON.parse(api.trackJSON());
  assert.equal(track.length,4800);assert.equal(track.samples.length,649);
  assert(track.landmarks.length>1000);assert(track.foliage.length>100);
  for(const sample of track.samples) {
    assert.deepEqual(sample.center,plain(world.point(sample.d,0)));
    assert.deepEqual(sample.ground,track.groundOffsets.map(u=>plain(world.point(sample.d,u))));
    assert.equal(sample.railLeft,world.hasRail(sample.d,-1));
    assert.equal(sample.railRight,world.hasRail(sample.d,1));
    assert.equal(sample.bridge,context.ApexCoast.bridge(sample.d));
  }
  assert(track.landmarks.every(face=>face.vertices.length===4 && face.vertices.flat().every(Number.isFinite)));
  assert(track.foliage.every(tree=>tree.position.every(Number.isFinite) && tree.height>0));
  assert.equal(world.collisionRailOffset(2048,-1),5.205);
  assert.equal(world.collisionRailOffset(2050,-1),5.62);
  const pos=JSON.parse(api.locationJSON(500,.4));
  assert.deepEqual(pos.position,plain(world.point(500,.4*world.roadHalf)));
});
console.log(`\n${passed} native shared-core checks passed.`);
