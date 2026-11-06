'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/mirrors.js'),'utf8');
function harness(){
  const calls=[],projections=[],canvases=[],window=new EventTarget();
  function brush(){return new Proxy({drawImage(...args){calls.push({kind:'image',args});},scale(...args){calls.push({kind:'scale',args});},createLinearGradient(){return {addColorStop(){}};}},{get:(o,k)=>k in o?o[k]:(()=>{})});}
  const document={createElement(){const c={width:0,height:0,context:brush(),getContext(){return this.context;}};canvases.push(c);return c;}};
  window.matchMedia=()=>({matches:false});
  window.ApexWorld={drawRearView(g,w,h,state,side){calls.push({kind:'world',w,h,side,state});},projectRearRival(w,h,state,rival,side){projections.push({id:rival.id,side});return {x:w/2,y:h/2,height:20,depth:state.distance-rival.distance,fog:0};}};
  const context=vm.createContext({window,document,Path2D:class {constructor(d){this.d=d;}}});vm.runInContext(source,context);
  const state={course:'london',weather:'clear',camera:'cockpit',distance:100,lateral:0,leanAngle:0,pitch:0,time:1,weatherTime:1,speed:90,rivals:[{id:'silva',distance:90},{id:'park',distance:110},{id:'moreau',distance:70}]};
  function draw(s=state,w=1440,h=900){window.ApexMirrors.drawCockpit(brush(),w,h,s,{width:1300,height:900,top:-650});}
  return {window,state,draw,calls,projections,canvases,worlds:()=>calls.filter(c=>c.kind==='world')};
}
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
test('both mirrors use distinct physical sides and only project riders actually behind',()=>{
  const h=harness(),before=JSON.stringify(h.state);h.draw();assert.deepEqual(h.worlds().map(x=>x.side),[-1,1]);
  assert.deepEqual(h.projections.map(x=>x.id),['silva','moreau','silva','moreau']);assert.equal(JSON.stringify(h.state),before);
  assert.equal(h.calls.filter(x=>x.kind==='scale'&&x.args[0]===-1&&x.args[1]===1).length,2);
});
test('rear render pixels and refresh rate are bounded, and frozen snapshots reuse textures',()=>{
  const h=harness();h.draw();h.draw();assert.equal(h.worlds().length,2);
  for(let i=1;i<4;i++)h.draw({...h.state,weatherTime:1+i/60,distance:100+i});
  assert.equal(h.worlds().length,2);h.draw({...h.state,weatherTime:1.08,distance:104});assert.equal(h.worlds().length,4);
  assert(h.worlds().every(x=>x.w*x.h<=208*120));
  h.draw({...h.state,weatherTime:2},390,844);assert.deepEqual(h.worlds().slice(-2).map(x=>[x.w,x.h]),[[144,84],[144,84]]);
});
test('route, weather, reset, changed paused traffic and newly loaded assets invalidate stale mirrors',()=>{
  const h=harness();h.draw();let n=2;
  for(const patch of[{course:'coast'},{weather:'rain'},{distance:0},{rivals:[]},{leanAngle:20}]){h.draw({...h.state,...patch});n+=2;assert.equal(h.worlds().length,n);}
  h.window.dispatchEvent(new Event('apex:asset'));h.draw({...h.state,leanAngle:20});assert.equal(h.worlds().length,n+2);
});
test('studio cockpit preview and chase shells never render racing scenery or opponents',()=>{
  const h=harness();h.draw({...h.state,garagePreview:true});assert.equal(h.worlds().length,0);assert.equal(h.projections.length,0);
  const g=new Proxy({createLinearGradient(){return {addColorStop(){}};}},{get:(o,k)=>o[k]||(()=>{})});h.window.ApexMirrors.drawBacks(g,300,400,h.state);assert.equal(h.worlds().length,0);
});
console.log('\n'+count+' mirror rendering checks passed.');
