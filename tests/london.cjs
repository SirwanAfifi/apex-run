'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = name => fs.readFileSync(path.join(__dirname, '..', 'src', name + '.js'), 'utf8');
class DetailEvent extends Event {constructor(type,options={}){super(type,options);this.detail=options.detail;}}
const courseKey = 'apex-run.course.v1';
const londonRecord = 'apex-run.a3-london.6000m.clear.v1';
const legacyRecord = 'apex-run.sierra-pass.4000m.v2';
function setup({values={},routeGeometry=false}={}) {
  const window = new EventTarget(), document = new EventTarget();
  const store = new Map(Object.entries(values)), nodes = new Map(), worldSelections = [];
  let now=0, nextFrame=null, selectedCourse='coast';
  const canvas={getContext:()=>({setTransform(){},save(){},restore(){}}),getBoundingClientRect:()=>({width:800,height:480})};
  function element(id) {
    if (!nodes.has(id)) nodes.set(id,{hidden:false,textContent:'',attributes:{},classList:{toggle(){}},
      setAttribute(name,value){this.attributes[name]=value;},querySelector(){return element(id+'-title');}});
    return nodes.get(id);
  }
  Object.assign(document,{readyState:'complete',hidden:false,getElementById:id=>id==='race-canvas'?canvas:element(id)});
  Object.assign(window,{navigator:{getGamepads:()=>[]},ApexWorld:{roadHalf:4.65,draw(){},
    selectCourse(route){selectedCourse=route;worldSelections.push(route);},
    curvature:d=>routeGeometry&&selectedCourse==='london'?window.ApexLondon.curvature(d):0,
    grade:d=>routeGeometry&&selectedCourse==='london'?window.ApexLondon.grade(d):0,
    elevation:d=>routeGeometry&&selectedCourse==='london'?window.ApexLondon.elevation(d):Math.sin(d/400)*10,
    collisionRailOffset:()=>Infinity,surfaceWetness:()=>.5,shelterAt:()=>0}});
  const context=vm.createContext({window,document,CustomEvent:DetailEvent,performance:{now:()=>now},
    requestAnimationFrame:fn=>{nextFrame=fn;},localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)}});
  for(const name of ['motorcycles',...(routeGeometry?['london']:[]),'collision','race','engine']) vm.runInContext(source(name),context,{filename:name+'.js'});
  const game=window.ApexGame;
  function step(){now+=1000/60;const callback=nextFrame;nextFrame=null;callback?.(now);return game.getState();}
  function until(predicate,seconds=220){for(let i=0;i<seconds*60;i++){const s=step();if(predicate(s))return s;}throw Error('Simulation deadline exceeded');}
  function start(){game.start();return until(s=>s.mode==='racing',4);}
  function finish(){game.setTouchInput({throttle:1});return until(s=>s.mode==='finished');}
  function telemetry(){vm.runInContext(source('telemetry'),context,{filename:'telemetry.js'});return window.ApexTelemetry;}
  return {window,game,store,nodes,element,worldSelections,step,until,start,finish,telemetry};
}
let count=0;
function test(name,run){run();count++;console.log('PASS '+name);}

test('A3 is a 6 km four-bike race and persists its route, separate weather and motorcycle',()=>{
  const h=setup();assert.equal(h.game.getState().course,'coast');
  h.game.setMotorcycle({model:'rr1000',paint:'cobalt',number:42});
  assert(h.game.setCourse('london'));let s=h.game.getState();
  assert.equal(s.length,6000);assert.equal(s.rivals.length,3);assert.equal(s.classification.length,4);assert.equal(s.racePosition,4);
  assert.equal(s.weather,'clear');assert.equal(s.motorcycle.number,42);assert.equal(h.store.get(courseKey),'london');
  assert(h.game.setWeather('rain'));h.game.setCourse('sierra');assert.equal(h.game.getState().weather,'rain');
  h.game.setWeather('clear');h.game.setCourse('coast');assert.equal(h.game.getState().weather,'clear');
  h.game.setCourse('london');assert.equal(h.game.getState().weather,'rain');
  const reload=setup({values:Object.fromEntries(h.store)});s=reload.game.getState();
  assert.equal(s.course,'london');assert.equal(s.weather,'rain');assert.equal(s.motorcycle.model,'rr1000');
  assert.equal(s.motorcycle.paint,'cobalt');assert.equal(s.motorcycle.number,42);
  assert.equal(reload.worldSelections[0],'london');
});

test('invalid saved routes fall back safely and route selection stays locked while riding or paused',()=>{
  for(const route of ['missing','__proto__','constructor',''])assert.equal(setup({values:{[courseKey]:route}}).game.getState().course,'coast');
  const h=setup();assert.equal(h.game.setCourse('missing'),false);h.game.setCourse('london');h.game.start();
  assert.equal(h.game.setCourse('sierra'),false);h.until(s=>s.mode==='racing',4);assert.equal(h.game.setCourse('coast'),false);
  h.game.togglePause();assert.equal(h.game.setCourse('sierra'),false);h.game.returnToGrid();assert(h.game.setCourse('sierra'));
  assert.equal(h.game.getState().rivals.length,0);assert.equal(h.game.getState().length,4000);
});

test('switching routes returns fresh grids while preserving each route record and all garage options',()=>{
  const pb={time:88,splits:[28,30,30]};
  const h=setup({values:{[legacyRecord]:JSON.stringify(pb)}});
  h.game.setMotorcycle({paint:'emerald',accent:'copper',wheels:'gold',livery:'race',number:18});
  for(const route of ['sierra','london','coast','london','sierra']){
    assert(h.game.setCourse(route));const s=h.game.getState();
    assert.equal(s.distance,0);assert.equal(s.time,0);assert.equal(s.mode,'ready');
    assert.equal(s.motorcycle.paint,'emerald');assert.equal(s.motorcycle.number,18);
    assert.equal(s.rivals.length,route==='sierra'?0:3);
    if(route==='sierra'){h.game.setWeather('clear');assert.equal(h.game.getState().best,88);}
    else assert.equal(s.best,null);
  }
  assert.deepEqual(h.worldSelections,['coast','sierra','london','coast','london','sierra']);
});

test('full 6 km finish records three 2 km splits and isolates route, weather and model personal bests',()=>{
  const old={time:88,splits:[28,30,30]};const h=setup({values:{[legacyRecord]:JSON.stringify(old)}});
  h.game.setCourse('london');h.start();const finished=h.finish();
  assert.equal(finished.distance,6000);assert.equal(finished.sector,3);assert(finished.splits.every(n=>Number.isFinite(n)&&n>0));
  assert(Math.abs(finished.splits.reduce((a,b)=>a+b,0)-finished.time)<1e-7);
  assert.equal(finished.classification.length,4);assert(finished.racePosition>=1&&finished.racePosition<=4);
  assert.equal(JSON.parse(h.store.get(londonRecord)).time,finished.time);
  assert.equal(JSON.parse(h.store.get(legacyRecord)).time,88);
  h.game.setMotorcycle({paint:'pearl'});assert.equal(h.game.getState().best,finished.time);
  h.game.setMotorcycle({model:'st900'});assert.equal(h.game.getState().best,null);
  h.start();const touring=h.finish();assert.equal(JSON.parse(h.store.get(londonRecord+'.st900')).time,touring.time);
  h.game.setWeather('rain');assert.equal(h.game.getState().best,null);
  h.game.setCourse('coast');assert.equal(h.game.getState().best,null);
  const reload=setup({values:Object.fromEntries(h.store)});reload.game.setCourse('london');reload.game.setWeather('clear');
  assert.equal(reload.game.getState().best,touring.time);reload.game.setMotorcycle({model:'r600'});assert.equal(reload.game.getState().best,finished.time);
});

test('London telemetry spans 6 km without a Sierra snow-shed label and stays separate from other rides',()=>{
  const h=setup();h.game.setCourse('london');h.game.setMotorcycle({model:'rr1000'});const t=h.telemetry();
  const state={...h.game.getState(),mode:'countdown'};t.update(state);
  assert.equal(h.element('axis-middle').textContent,'3 KM');assert.equal(h.element('axis-end').textContent,'6 KM');
  assert.equal(h.element('shed-band').attributes.width,0);assert.equal(h.element('shed-band-title').textContent,'');
  t.update({...state,mode:'racing'});t.update({...state,mode:'finished',distance:6000,time:115,speed:220,isRecord:true});
  const key='apex-run.telemetry.london.clear.v1.rr1000';const saved=JSON.parse(h.store.get(key));
  assert.equal(saved.points.length,301);assert.equal(saved.time,115);assert.equal(saved.points.at(-1)[1],115);
  t.update({...state,mode:'ready',best:115});assert(h.element('best-trace').attributes.d.length>0);
  t.update({...state,mode:'ready',best:115,motorcycle:{...state.motorcycle,model:'r600'}});
  assert.equal(h.element('best-trace').attributes.d,'');
  assert(!h.store.has('apex-run.telemetry.clear.v1'));assert(!h.store.has('apex-run.telemetry.coast.clear.v1.rr1000'));
});

// These checks use the real route survey alongside the real AI/engine; drawing is
// deliberately outside this fixture and covered by the browser scenery review.
test('London survey is finite and smooth across the complete stage and run-out',()=>{
  const h=setup({routeGeometry:true}),world=h.window.ApexLondon;
  for(let d=-12;d<=6400;d+=4){
    for(const name of ['course','tangent','curvature','elevation','grade']) assert(Number.isFinite(world[name](d)),name+' at '+d);
    for(const offset of [-24,-7,-4.65,0,4.65,7,24])assert(Number.isFinite(world.ground(d,offset)),'ground at '+d+'/'+offset);
    assert(Math.abs(world.grade(d))<.14,'excessive grade at '+d);
    assert(Math.abs(world.curvature(d))<.025,'hairpin curvature at '+d);
    if(d>=0&&d<=6000){
      assert(Math.abs(world.elevation(d+.01)-world.elevation(d))<.01,'height discontinuity at '+d);
      assert(Math.abs(world.course(d+.01)-world.course(d))<.03,'road discontinuity at '+d);
    }
  }
});

test('all three rivals complete the real London survey in dry and wet conditions with finite physics',()=>{
  for(const weather of ['clear','rain']){
    const h=setup({routeGeometry:true});h.game.setCourse('london');h.game.setWeather(weather);h.start();
    const final=h.until(s=>{
      for(const rider of s.rivals)for(const field of ['distance','speed','leanAngle','lateral'])assert(Number.isFinite(rider[field]),weather+' '+rider.id+' '+field);
      return s.rivals.every(rider=>rider.finishTime!==null);
    },260);
    assert(final.rivals.every(rider=>rider.finishTime>30&&rider.distance>=6000));
    console.log('  '+weather+' rival times '+final.rivals.map(rider=>rider.finishTime.toFixed(2)).join(', '));
  }
});
console.log('\n'+count+' A3 London route checks passed.');
