'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = name => fs.readFileSync(path.join(__dirname,'..','src',name+'.js'),'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
class DetailEvent extends Event { constructor(type,options={}) {super(type,options);this.detail=options.detail;} }
const openRoad = {roadHalf:4.65,curvature:()=>0,grade:()=>0,collisionRailOffset:()=>Infinity,surfaceWetness:()=>.5,shelterAt:()=>0,elevation:d=>Math.sin(d/300)*20,selectCourse(){},draw(){}};
const prefKey='apex-run.motorcycle.v1';
const pbKey='apex-run.sierra-pass.4000m.v2';
function setup({values={},catalogue=true,engineSource,weather='clear',course='sierra',hz=60,audio=false}={}) {
  const window=new EventTarget(),document=new EventTarget();
  const store=new Map([['apex-run.course.v1',course],['apex-run.weather.v3',weather],['apex-run.coast.weather.v1',weather],...Object.entries(values)]);
  let now=0,nextFrame=null;
  const nodes=new Map(),waves=[],oscillators=[];
  function element(id) {
    if(!nodes.has(id)) nodes.set(id,{hidden:false,textContent:'',attributes:{},classList:{toggle(){}},
      setAttribute(key,value){this.attributes[key]=value;},querySelector(){return element(id+'-title');}});
    return nodes.get(id);
  }
  const canvas={getContext:()=>({setTransform(){},save(){},restore(){}}),getBoundingClientRect:()=>({width:800,height:480})};
  Object.assign(document,{readyState:'complete',hidden:false,getElementById:id=>id==='race-canvas'?canvas:element(id)});
  Object.assign(window,{ApexWorld:{...openRoad},navigator:{getGamepads:()=>[]}});
  if(audio) {
    const param=()=>({value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}});
    const node=()=>({gain:param(),frequency:param(),Q:param(),pan:param(),delayTime:param(),connect(){},disconnect(){},start(){},stop(){}});
    window.AudioContext=class {
      constructor(){this.currentTime=0;this.state='running';this.sampleRate=1000;this.destination={};}
      createGain(){return node();} createBiquadFilter(){return node();} createBufferSource(){return node();} createDelay(){return node();} createStereoPanner(){return node();}
      createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}
      createOscillator(){const n=node();n.setPeriodicWave=w=>{n.wave=w;};oscillators.push(n);return n;}
      createPeriodicWave(real,imag){const wave={real:Array.from(real),imag:Array.from(imag)};waves.push(wave);return wave;}
    };
  }
  const context=vm.createContext({window,document,CustomEvent:DetailEvent,performance:{now:()=>now},requestAnimationFrame:fn=>{nextFrame=fn;},localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)}});
  for(const module of [...(catalogue?['motorcycles']:[]),'collision','race']) vm.runInContext(source(module),context,{filename:module+'.js'});
  vm.runInContext(engineSource||source('engine'),context,{filename:'engine.js'});
  const game=window.ApexGame;
  function step(){now+=1000/hz;const callback=nextFrame;nextFrame=null;callback?.(now);return game.getState();}
  function tick(seconds){for(let i=0;i<Math.round(seconds*hz);i++)step();return game.getState();}
  function until(predicate,seconds=180){for(let i=0;i<seconds*hz;i++){const s=step();if(predicate(s))return s;}throw Error('Simulation deadline exceeded');}
  function start(model='r600',transmission='auto'){game.setMotorcycle?.({model});game.setTransmission(transmission);game.start();until(s=>s.mode==='racing',4);}
  function finish(){game.setTouchInput({throttle:1});return until(s=>s.mode==='finished');}
  function telemetry(){vm.runInContext(source('telemetry'),context,{filename:'telemetry.js'});return window.ApexTelemetry;}
  return {window,document,game,store,context,step,tick,until,start,finish,telemetry,element,waves,oscillators};
}
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}

test('catalogue is deeply immutable; normalization is finite and cache keys include every appearance option',()=>{
  const h=setup(),m=h.window.ApexMotorcycles;
  assert.deepEqual(m.models.map(x=>x.id).join(','),'r600,rr1000,st900');
  for(const model of m.models){assert(Object.isFrozen(model.physics.gearing));assert.throws(()=>{model.physics.gearing[0]=1;},TypeError);}
  assert(Object.isFrozen(m.palettes.paint));
  const config=m.normalize({model:'__proto__',paint:'nope',accent:'black',wheels:'gold',livery:'race',number:Infinity,extra:1});
  assert.deepEqual(plain(config),{model:'r600',paint:'vermilion',accent:'black',wheels:'gold',livery:'race',number:27});
  assert.equal(m.normalize({number:'103.2'}).number,99);assert.equal(m.normalize({number:-7}).number,1);
  assert.equal(m.normalize({number:'  '}).number,27);assert.equal(m.normalize({number:'24.6'}).number,25);
  for(const input of [null,[],false,'bad'])assert.deepEqual(plain(m.normalize(input)),plain(m.defaultConfig()));
  const base=m.defaultConfig();
  for(const patch of [{model:'rr1000'},{paint:'cobalt'},{accent:'copper'},{wheels:'silver'},{livery:'stripes'},{number:28}])assert.notEqual(m.key({...base,...patch}),m.key(base));
});

test('invalid saved preferences normalize; valid partial changes persist across reload and snapshots cannot mutate the run',()=>{
  const h=setup({values:{[prefKey]:JSON.stringify({model:'bad',paint:'pearl',number:'NaN'})}});
  assert.equal(h.game.getState().motorcycle.model,'r600');assert.equal(h.game.getState().motorcycle.paint,'pearl');assert.equal(h.game.getState().motorcycle.number,27);
  const patch={model:'st900',accent:'copper',number:41};assert(h.game.setMotorcycle(patch));patch.number=99;
  const snapshot=h.game.getState();snapshot.motorcycle.model='rr1000';snapshot.motorcycle.number=1;
  assert.equal(h.game.getState().motorcycle.model,'st900');assert.equal(h.game.getState().motorcycle.number,41);
  const reloaded=setup({values:Object.fromEntries(h.store)});
  assert.deepEqual(plain(reloaded.game.getState().motorcycle),plain(h.game.getState().motorcycle));
  assert.equal(reloaded.game.getState().rpm,1150);assert.equal(reloaded.game.getState().redline,10500);
  for(const stored of ['{','null','[]'])assert.equal(setup({values:{[prefKey]:stored}}).game.getState().motorcycle.model,'r600');
});

test('countdown, riding and paused models are locked; restart preserves chosen config and only grid unlocks it',()=>{
  const h=setup();h.game.setMotorcycle({model:'rr1000',paint:'emerald'});h.game.start();
  assert.equal(h.game.setMotorcycle({model:'r600'}),false);h.until(s=>s.mode==='racing',4);
  assert.equal(h.game.setMotorcycle({paint:'pearl'}),false);h.game.togglePause();
  assert.equal(h.game.setMotorcycle({model:'st900'}),false);h.game.restart();
  assert.equal(h.game.getState().motorcycle.model,'rr1000');assert.equal(h.game.getState().motorcycle.paint,'emerald');
  h.game.returnToGrid();assert(h.game.setMotorcycle({model:'st900'}));assert.equal(h.game.getState().mode,'ready');
});

test('catalogued R600 stays bit-for-bit equal to the original default handling across throttle, lean and braking',()=>{
  for(const weather of ['clear','rain']){
    const a=setup({catalogue:false,weather}),b=setup({weather});a.start();b.start();
    for(const [input,seconds] of [[{throttle:1},5],[{throttle:1,steer:.22},.4],[{throttle:.4,steer:-.18},.5],[{brake:.55},1.5],[{throttle:1},3]]){
      a.game.setTouchInput(input);b.game.setTouchInput(input);a.tick(seconds);b.tick(seconds);
      const sa=a.game.getState(),sb=b.game.getState();
      for(const field of ['time','distance','speed','rpm','gear','leanAngle','lateral','lateralVelocity','pitch','suspension','frontLoad','slip'])assert.equal(sb[field],sa[field],weather+' '+field);
    }
  }
});

const measures={};
test('actual auto transmissions reach six gears and produce distinct acceleration/top speeds with safe model redlines',()=>{
  for(const model of ['r600','rr1000','st900']){
    const h=setup();h.start(model);h.game.setTouchInput({throttle:1});
    const zeroTo100=h.until(s=>s.speed>=100).time;
    const at180=h.until(s=>s.speed>=180);
    const at200=h.until(s=>s.speed>=200);
    let maxRpm=0;h.until(s=>{maxRpm=Math.max(maxRpm,s.rpm);return s.mode==='finished';});
    const s=h.game.getState();assert.equal(s.gear,6);assert(maxRpm<=s.redline);assert.equal(s.crashCount,0);
    measures[model]={zeroTo100:+zeroTo100.toFixed(3),from180to200:+(at200.time-at180.time).toFixed(3),speed:+s.speed.toFixed(3),time:+s.time.toFixed(3)};
  }
  assert(measures.rr1000.from180to200<measures.r600.from180to200*.7);
  assert(measures.rr1000.speed>measures.r600.speed+20);
  assert(measures.st900.speed<measures.r600.speed-20);
  assert(measures.st900.zeroTo100<measures.r600.zeroTo100);
  console.log('  straight-road measures '+JSON.stringify(measures));
});

test('all three ride profiles stay consistent at 30, 60 and 120 Hz',()=>{
  for(const model of ['r600','rr1000','st900']){
    const results=[];
    for(const hz of [30,60,120]){
      const h=setup({hz});h.start(model);h.game.setTouchInput({throttle:1});results.push(h.tick(12));
    }
    assert(Math.max(...results.map(s=>s.distance))-Math.min(...results.map(s=>s.distance))<1.1);
    assert(Math.max(...results.map(s=>s.speed))-Math.min(...results.map(s=>s.speed))<.6);
  }
});

test('short controlled lean pulse and braking reveal agility and stopping differences without a crash',()=>{
  const result={};
  for(const model of ['r600','rr1000','st900']){
    const h=setup();h.start(model);h.game.setTouchInput({throttle:1});h.until(s=>s.speed>=100);
    h.game.setTouchInput({throttle:.2,steer:.4});const leaned=h.tick(.2);
    assert(!leaned.crash);result[model]={lean:leaned.leanAngle};
    const brake=setup();brake.start(model);brake.game.setTouchInput({throttle:1});const before=brake.until(s=>s.speed>=100);
    brake.game.setTouchInput({brake:.55});const stopped=brake.until(s=>s.speed===0,10);
    result[model].stop=stopped.distance-before.distance;
  }
  assert(result.r600.lean>result.rr1000.lean);assert(result.rr1000.lean>result.st900.lean);
  assert(Math.abs(result.st900.stop-result.r600.stop)>.4); // Different gearing/engine drag changes combined stopping effort.
  console.log('  lean/brake measures '+JSON.stringify(result));
});

test('manual ST900 rev limiter, over-rev refusal and clutch timing use its lower redline',()=>{
  const h=setup();h.start('st900','manual');h.game.setTouchInput({throttle:1});h.tick(12);
  let s=h.game.getState();assert.equal(s.gear,1);assert(s.speed<80);assert(s.rpm<=10500);
  assert(h.game.shiftGear(1));assert.equal(h.game.shiftGear(1),false);
  h.until(s=>s.speed>95,8);assert.equal(h.game.shiftGear(-1),false);assert.equal(h.game.getState().gear,2);
  h.game.setTouchInput({brake:1});h.until(s=>s.speed<65,5);assert(h.game.shiftGear(-1));
  h.tick(.1);s=h.game.getState();assert(s.clutch>.8);h.game.togglePause();h.tick(1);assert.equal(h.game.getState().clutch,s.clutch);
  h.game.togglePause();h.tick(.5);assert.equal(h.game.getState().clutch,0);
});

test('legacy R600 records remain intact; real finishes isolate model records while cosmetic changes share them',()=>{
  const old={time:88,splits:[28,30,30]};const h=setup({values:{[pbKey]:JSON.stringify(old)}});
  assert.equal(h.game.getState().best,88);h.game.setMotorcycle({paint:'pearl'});assert.equal(h.game.getState().best,88);
  for(const model of ['rr1000','st900']){
    h.game.setMotorcycle({model});assert.equal(h.game.getState().best,null);h.start(model);const s=h.finish();assert(s.isRecord);
    assert.equal(JSON.parse(h.store.get(pbKey+'.'+model)).time,s.time);
    assert.equal(JSON.parse(h.store.get(pbKey)).time,88);
    h.game.setMotorcycle({paint:model==='rr1000'?'cobalt':'emerald'});assert.equal(h.game.getState().mode,'ready');assert.equal(h.game.getState().best,s.time);
  }
  h.game.setMotorcycle({model:'r600'});assert.equal(h.game.getState().best,88);
  h.game.setCourse('coast');assert.equal(h.game.getState().best,null);h.game.setWeather('rain');assert.equal(h.game.getState().best,null);
  const reload=setup({values:Object.fromEntries(h.store)});reload.game.setCourse('sierra');reload.game.setWeather('clear');reload.game.setMotorcycle({model:'rr1000'});
  assert.equal(reload.game.getState().best,JSON.parse(h.store.get(pbKey+'.rr1000')).time);
});

test('player model does not change the three AI profiles or their initial race progression',()=>{
  const results=[];
  for(const model of ['r600','rr1000','st900']){
    const h=setup({course:'coast'});h.start(model);h.tick(1);results.push(plain(h.game.getState().rivals));
  }
  assert.deepEqual(results[1],results[0]);assert.deepEqual(results[2],results[0]);
});

test('engine audio caches distinct firing waves, changes player voice on model switch and leaves rival voice unchanged',()=>{
  const h=setup({audio:true});h.start();assert.equal(h.waves.length,7);
  const original=h.oscillators[0].wave,pack=h.oscillators[2].wave; // First two oscillators are player voices, next three the rivals.
  h.tick(.2);const count=h.waves.length;
  h.game.returnToGrid();h.game.setMotorcycle({model:'st900'});
  assert.notDeepEqual(h.oscillators[0].wave.real,original.real);assert.equal(h.oscillators[2].wave,pack);
  h.start('st900');h.tick(.2);assert.equal(h.waves.length,count);
});

test('telemetry preserves Sierra v1, isolates model/weather/course references and resets equal-time model traces',()=>{
  const points=Array.from({length:201},(_,i)=>[100,i*.4]),other=points.map(([speed,time])=>[speed+20,time]);
  const time=80,traceKey='apex-run.telemetry.clear.v1';
  const h=setup({values:{[traceKey]:JSON.stringify({time,points}),[traceKey+'.rr1000']:JSON.stringify({time,points:other})}}),telemetry=h.telemetry();
  const base={...h.game.getState(),best:time};telemetry.update(base);
  const original=h.element('best-trace').attributes.d;assert(original.includes('44.93'));
  telemetry.update({...base,motorcycle:{...base.motorcycle,model:'rr1000'}});
  assert.notEqual(h.element('best-trace').attributes.d,original);
  telemetry.update({...base,motorcycle:{...base.motorcycle,model:'st900'}});assert.equal(h.element('best-trace').attributes.d,'');
  for(const [course,length,weather,model,key] of [['sierra',4000,'clear','st900',traceKey+'.st900'],['coast',4800,'rain','rr1000','apex-run.telemetry.coast.rain.v1.rr1000']]){
    const state={...base,course,length,weather,best:null,motorcycle:{...base.motorcycle,model},mode:'countdown',time:0,distance:0};
    telemetry.update(state);telemetry.update({...state,mode:'racing',time:0,distance:0});
    telemetry.update({...state,mode:'finished',distance:length,time:100,speed:200,isRecord:true});
    const saved=JSON.parse(h.store.get(key));assert.equal(saved.points.length,length/20+1);assert.equal(saved.time,100);
  }
  assert.equal(JSON.parse(h.store.get(traceKey)).points.length,201);
  assert.equal(h.element('axis-end').textContent,'4.8 KM');
});
console.log('\n'+count+' motorcycle catalogue/physics/persistence checks passed.');
