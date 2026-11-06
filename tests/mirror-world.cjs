'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=name=>fs.readFileSync(path.join(__dirname,'../src/'+name+'.js'),'utf8');
function setup({flat=false,crest=0}={}){
  const commands=[];
  const brush=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),createPattern:()=>({setTransform(){}}),measureText:()=>({width:20})},{get:(o,k)=>k in o?o[k]:(...args)=>{for(const n of args)if(typeof n==='number')assert(Number.isFinite(n),k+' finite canvas coordinates');commands.push(k);},set:(o,k,v)=>(o[k]=v,true)});
  const window={matchMedia:()=>({matches:false}),dispatchEvent(){},devicePixelRatio:1};
  const document={createElement:()=>({width:0,height:0,getContext:kind=>kind==='webgl'?null:brush,addEventListener(){}})};
  const context=vm.createContext({window,document,Image:class{},Event:class{},setTimeout(){},console});
  for(const name of['coast','london'])vm.runInContext(source(name),context);
  if(flat){const ridge=d=>Math.max(0,1-Math.abs(d-150)/8)*crest;window.ApexLondon={course:()=>0,tangent:()=>0,curvature:()=>0,grade:()=>0,elevation:ridge,ground:ridge,coverAt:()=>.2,hasRail:()=>false,section(){}};}
  vm.runInContext(source('world-model'),context);
  vm.runInContext(source('scenery'),context);
  const world=window.ApexWorld;world.selectCourse('london');
  return {world,brush,commands};
}
let passed=0;const test=(name,run)=>{run();passed++;console.log('PASS '+name);};
const state={course:'london',distance:200,lateral:0,camera:'cockpit',weather:'clear',time:3,speed:80,leanAngle:0};
test('rear camera rejects riders ahead and beyond range, while a real following rider projects',()=>{
  const {world}=setup({flat:true});
  for(const side of[-1,1]){
    assert.equal(world.projectRearRival(192,112,state,{distance:201,lateral:0},side),null);
    assert.equal(world.projectRearRival(192,112,state,{distance:200,lateral:0},side),null);
    assert.equal(world.projectRearRival(192,112,state,{distance:-150,lateral:0},side),null);
    const p=world.projectRearRival(192,112,state,{distance:180,lateral:0},side);assert(p&&p.height>0&&p.depth>0);
  }
});
test('rear coordinates use physical lateral ordering and distinct mirror eyes, before one compositor reflection',()=>{
  const {world}=setup({flat:true});
  for(const side of[-1,1]){
    const left=world.projectRearRival(192,112,state,{distance:180,lateral:-.5},side);
    const right=world.projectRearRival(192,112,state,{distance:180,lateral:.5},side);
    assert(left&&right);assert(left.x>right.x); // A backwards camera reverses world right; glass flips it once.
    assert(192-left.x<192-right.x);
  }
  const a=world.projectRearRival(192,112,state,{distance:180,lateral:0},-1),b=world.projectRearRival(192,112,state,{distance:180,lateral:0},1);
  assert(Math.abs(a.x-b.x)>8);assert(Math.abs(a.x+b.x-192)<1e-8);
});
test('closing riders grow continuously and rain adds distance haze',()=>{
  const {world}=setup({flat:true});
  const far=world.projectRearRival(192,112,state,{distance:100,lateral:0},-1);
  const close=world.projectRearRival(192,112,state,{distance:190,lateral:0},-1);
  const wet=world.projectRearRival(192,112,{...state,weather:'rain'},{distance:100,lateral:0},-1);
  assert(close.height>far.height*8);assert(wet.fog>far.fog);assert.equal(wet.x,far.x);
});
test('a preceding crest hides wheels progressively, then hides the entire following rider',()=>{
  const rider={distance:100,lateral:0};
  const clear=setup({flat:true}).world.projectRearRival(192,112,state,rider,-1);
  const partial=setup({flat:true,crest:.9}).world.projectRearRival(192,112,state,rider,-1);
  const hidden=setup({flat:true,crest:3}).world.projectRearRival(192,112,state,rider,-1);
  assert(clear);assert.equal(clear.clipY,null);assert(partial&&partial.clipY!==null);assert.equal(hidden,null);
});
test('all routes return finite rear views through bends, rain and lean without changing forward projection or state',()=>{
  const {world}=setup();let visible=0;
  for(const route of['sierra','coast','london']){
    world.selectCourse(route);
    for(let distance=100;distance<({sierra:4000,coast:4800,london:6000}[route]);distance+=137){
      const s=Object.freeze({...state,course:route,distance,weather:'rain',leanAngle:19});
      const ahead={distance:distance+15,lateral:.1};const before=JSON.stringify(world.projectRival(800,450,s,ahead));
      for(const side of[-1,1]){const p=world.projectRearRival(192,112,s,Object.freeze({distance:distance-20,lateral:-.2}),side);if(p){visible++;for(const key of['x','y','height','scale','depth','roll','fog'])assert(Number.isFinite(p[key]),route+' '+key);}}
      assert.equal(JSON.stringify(world.projectRival(800,450,s,ahead)),before);
    }
  }
  assert(visible>150);
});
test('rear fallback renders actual behind-road geometry with bounded finite commands and no simulation mutation',()=>{
  for(const route of['sierra','coast','london']){
    const {world,brush,commands}=setup();world.selectCourse(route);
    const s=Object.freeze({...state,course:route,distance:800,weather:'rain'}),before=JSON.stringify(s);
    world.drawRearView(brush,192,112,s,-1);world.drawRearView(brush,192,112,s,1);
    assert(commands.includes('fill'));assert(commands.length<100000);assert.equal(JSON.stringify(s),before);
  }
});
console.log('\n'+passed+' rear-view world checks passed.');
