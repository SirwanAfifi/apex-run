/* motorcycles.js */
/* Fictional garage catalogue. Appearance and ride profiles share stable model IDs. */
window.ApexMotorcycles = (() => {
  'use strict';
  const freeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  const models = freeze([
    {
      id: 'r600', name: 'Apex R600', subtitle: 'Agile supersport',
      description: 'Light steering, a soaring four-cylinder engine and precise corner entries. The original Apex ride.',
      stats: [{label: 'Engine', value: '600 cc · inline four'}, {label: 'Redline', value: '14,100 rpm'}, {label: 'Character', value: 'Agile & precise'}],
      physics: {
        redline: 14100, idleRpm: 1300, launchRpm: 3700,
        gearing: [97,132,162,191,222,254], wheelThrust: [10.5,8.1,7,5.75,4.95,4.25],
        upshiftRpm: 13250, downshiftRpm: 6600, brakingDownshiftRpm: 7200,
        torqueBase: .56, torquePeak: .44, engineBraking: 1, limiterRange: 440,
        agility: 1, stability: 2.2, brakeForce: 12.2, aeroDrag: .00072,
        loadTransfer: .375, springRate: 185, springDamping: 16,
        firing: [0,270,450,540], exhaustTone: 1, intakeTone: 1, exhaustGain: 1, intakeGain: 1
      }
    },
    {
      id: 'rr1000', name: 'Apex RR1000', subtitle: 'Open-class superbike',
      description: 'Longer gearing and stronger high-speed drive. Deliberate steering rewards an early, measured turn-in.',
      stats: [{label: 'Engine', value: '1,000 cc · inline four'}, {label: 'Redline', value: '13,800 rpm'}, {label: 'Character', value: 'Fast & committed'}],
      physics: {
        redline: 13800, idleRpm: 1200, launchRpm: 3500,
        gearing: [117,156,192,225,259,292], wheelThrust: [13.3,10.8,9.5,8.1,6.9,5.9],
        upshiftRpm: 12960, downshiftRpm: 6460, brakingDownshiftRpm: 7050,
        torqueBase: .59, torquePeak: .41, engineBraking: 1.09, limiterRange: 430,
        agility: .89, stability: 2.35, brakeForce: 12.7, aeroDrag: .00070,
        loadTransfer: .36, springRate: 200, springDamping: 18,
        firing: [0,180,360,540], exhaustTone: .91, intakeTone: .96, exhaustGain: 1.12, intakeGain: .95
      }
    },
    {
      id: 'st900', name: 'Apex ST900', subtitle: 'Sport endurance',
      description: 'A broad three-cylinder torque band, settled chassis and shorter gearing. Strong exits without chasing the redline.',
      stats: [{label: 'Engine', value: '900 cc · inline triple'}, {label: 'Redline', value: '10,500 rpm'}, {label: 'Character', value: 'Torquey & settled'}],
      physics: {
        redline: 10500, idleRpm: 1150, launchRpm: 2700,
        gearing: [78,108,137,164,192,218], wheelThrust: [11.6,9.15,7.25,5.8,4.8,3.95],
        upshiftRpm: 9850, downshiftRpm: 4915, brakingDownshiftRpm: 5360,
        torqueBase: .70, torquePeak: .30, engineBraking: 1.16, limiterRange: 330,
        agility: .82, stability: 2.65, brakeForce: 11.6, aeroDrag: .00083,
        loadTransfer: .34, springRate: 155, springDamping: 17,
        firing: [0,240,480], exhaustTone: .79, intakeTone: .83, exhaustGain: 1.07, intakeGain: .84
      }
    }
  ]);
  const paints = freeze([
    {id:'vermilion',label:'Vermilion',color:'#e64f3d'}, {id:'pearl',label:'Pearl',color:'#e7e4d9'},
    {id:'graphite',label:'Graphite',color:'#343b42'}, {id:'cobalt',label:'Cobalt',color:'#315ec9'},
    {id:'emerald',label:'Emerald',color:'#16836e'}
  ]);
  const accents = freeze([{id:'ivory',label:'Ivory',color:'#e9e2d2'},{id:'black',label:'Black',color:'#171b20'},{id:'copper',label:'Copper',color:'#bc7952'}]);
  const wheels = freeze([{id:'graphite',label:'Graphite',color:'#3b4148'},{id:'silver',label:'Silver',color:'#aeb8bc'},{id:'gold',label:'Gold',color:'#b99a52'}]);
  const liveries = freeze([{id:'solid',label:'Solid'},{id:'stripes',label:'Stripes'},{id:'race',label:'Race'}]);
  const palettes = freeze({paint:Object.fromEntries(paints.map(x=>[x.id,x.color])),accent:Object.fromEntries(accents.map(x=>[x.id,x.color])),wheels:Object.fromEntries(wheels.map(x=>[x.id,x.color]))});
  const getModel = id => models.find(model => model.id === id) || models[0];
  function defaultConfig(model = 'r600') {
    return {model:getModel(model).id,paint:'vermilion',accent:'ivory',wheels:'graphite',livery:'solid',number:27};
  }
  function normalize(config) {
    const input = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
    const result = defaultConfig(input.model);
    for (const [field,options] of [['paint',paints],['accent',accents],['wheels',wheels],['livery',liveries]]) {
      if (options.some(option => option.id === input[field])) result[field] = input[field];
    }
    // Numeric form values are accepted; empty, nonnumeric and nonfinite values
    // return to the default. Plate numbers always remain integer 1–99.
    const number = typeof input.number === 'number' || typeof input.number === 'string' && input.number.trim() ? Number(input.number) : NaN;
    if (Number.isFinite(number)) result.number = Math.max(1,Math.min(99,Math.round(number)));
    return result;
  }
  const key = config => { const c=normalize(config); return [c.model,c.paint,c.accent,c.wheels,c.livery,c.number].join(':'); };
  return freeze({models,paints,accents,wheels,liveries,palettes,defaultConfig,normalize,getModel,key});
})();

;
/* coast.js */
/* Cape Meridian survey. Ocean is west, inland bluffs are east. All units are metres. */
window.ApexCoast=(()=>{
  'use strict';
  const half=4.65, bridgeStart=2048, bridgeEnd=2336, waterLevel=.14;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
  const rand=n=>{const t=Math.sin(n*63.19+13.7)*26783.921;return t-Math.floor(t);};
  // Catmull-Rom survey stations every 200 m, including the run-in and run-out.
  const east=[29,0,32,102,76,11,-57,-48,18,78,45,5,-23,-51,-77,-20,64,78,15,-58,-32,53,57,-16,-67,-30,39,63,30,-28,-41];
  const high=[39,36,28,31,43,32,21,19,35,50,46,39,39,39,34,24,30,42,38,24,23,34,45,40,29,25,31,37,48,45,40];
  function survey(knots,d,diff){
    const f=d/200+1,i=clamp(Math.floor(f),0,knots.length-2),t=clamp(f-i,0,1);
    const a=knots[Math.max(0,i-1)],b=knots[i],c=knots[i+1],e=knots[Math.min(i+2,knots.length-1)];
    const l=.5*(c-a),q=.5*(2*a-5*b+4*c-e),k=.5*(-a+3*b-3*c+e);
    if(diff===1)return (l+2*q*t+3*k*t*t)/200;
    if(diff===2)return (2*q+6*k*t)/40000;
    return b+t*(l+t*(q+t*k));
  }
  const course=d=>survey(east,d,0),tangent=d=>survey(east,d,1),elevation=d=>survey(high,d,0),grade=d=>survey(high,d,1);
  const curvature=d=>survey(east,d,2)/(1+tangent(d)**2)**1.5;
  const bridge=d=>d>=bridgeStart&&d<bridgeEnd;
  const bank=d=>clamp(-curvature(d)*11,-.06,.06);
  const verge=d=>7.9+1.25*Math.sin(d*.021)+.68*Math.sin(d*.058);
  const toe=d=>23+5*Math.sin(d*.037)+3*Math.cos(d*.081);
  const cape=d=>smooth(4560,4624,d)*(1-smooth(4684,4744,d));
  const rockReach=d=>Math.max(smooth(940,1080,d)*(1-smooth(1380,1520,d)),smooth(2670,2790,d)*(1-smooth(3040,3170,d)),smooth(4070,4190,d)*(1-smooth(4400,4490,d)));
  function ground(d,u) {
    const e=elevation(d),base=e+bank(d)*clamp(u,-half,half)-.012*Math.min(half,Math.abs(u));
    if(Math.abs(u)<half)return base;
    if(u<0){
      const edge=verge(d), foot=toe(d);
      const drop=smooth(edge,foot,-u);
      const cliff=base*(1-drop)-.065*Math.max(0,Math.min(edge,-u)-half)+drop*(.7*Math.sin(d*.078-u*.43)-.55);
      // The light station occupies a natural rock promontory, not a floating
      // platform. Its geological shoulder begins beyond the collision corridor.
      const headland=cape(d)*smooth(8.5,11.8,-u)*(1-smooth(21,34,-u));
      return cliff+Math.max(0,elevation(4656)-.82-cliff)*headland;
    }
    const v=Math.max(0,u-5.8), shoulder=Math.min(v,23);
    const steep=.28+.23*Math.sin(d/128+.6)+.12*Math.sin(d/67);
    return base-.035*Math.min(2,Math.max(0,u-half))+shoulder*steep+Math.max(0,Math.min(v-23,75))*(.25+.18*Math.sin(d/139))
      +smooth(0,9,v)*(.65*Math.sin(d*.079+u*.18)+.68*Math.cos(d*.04-u*.49))
      +rockReach(d)*smooth(8.5,23,u)*(1-smooth(58,110,u))*(4.0+1.7*Math.sin(d/83));
  }
  function hasRail(d,side) {
    if(bridge(d)||d>=bridgeStart-14&&d<bridgeEnd+14)return true;
    if(side<0)return !((d>594&&d<622)||(d>1432&&d<1452)||(d>3220&&d<3252));
    return (d>728&&d<828)||(d>1592&&d<1676)||(d>3284&&d<3372)||(d>4424&&d<4500);
  }
  const exposed=d=>Math.max(rockReach(d),cape(d));
  const coverAt=(d,u)=>clamp((.10+.12*Math.cos(d/157)+.14*Math.sin(d*.072+u)+.12*Math.max(0,u))*(1-exposed(d)*.76),.025,.42);

  // Small surveyed objects use solid world-space faces, including the Canvas
  // fallback. No roadside billboard is needed for architecture or rock.
  function block(h,m,n,left,right,bottom,top,color,material=11) {
    const P=(d,u,y)=>{const p=h.point(d,u);p[1]=y;return p;};
    const face=(a,b,c,d,tone)=>h.face(a,b,c,d,[[0,0],[n-m,0],[0,top-bottom],[n-m,top-bottom]],color.map(v=>v*tone),material);
    face(P(m,left,bottom),P(n,left,bottom),P(m,left,top),P(n,left,top),.77);
    face(P(n,right,bottom),P(m,right,bottom),P(n,right,top),P(m,right,top),1);
    face(P(m,right,bottom),P(m,left,bottom),P(m,right,top),P(m,left,top),.91);
    face(P(n,left,bottom),P(n,right,bottom),P(n,left,top),P(n,right,top),.84);
    face(P(m,left,top),P(n,left,top),P(m,right,top),P(n,right,top),1.07);
  }

  function outcrop(h,d,u,across,along,height,seed,tone,floor) {
    const rings=[],sides=14,levels=[0,.14,.36,.40,.66,.71,1];
    const base=floor??Math.min(ground(d,u-across),ground(d,u+across),ground(d-along,u))-.75;
    for(let i=0;i<levels.length;i++){
      const ring=[],level=levels[i];
      for(let j=0;j<sides;j++){
        const a=j*Math.PI*2/sides,fracture=(.79+rand(seed+j*31)*.27)*(1+.095*Math.sin(j*2.7+level*6));
        // Broad inclined ledges retain a common fracture profile up the rock.
        const ledge=(i===2||i===4)?.026:0;
        const station=d+Math.cos(a)*along*(1-level*.57+ledge)*fracture+level*.55;
        const offset=u+Math.sin(a)*across*(1-level*.42+ledge)*fracture+level*.48;
        const p=h.point(station,offset);
        const endTaper=1-.28*level*Math.pow(Math.abs(Math.cos(a)),1.4);
        p[1]=base+height*level*endTaper+(i===0?-.2:height*(.065+.035*level)*Math.sin(a*3+seed))+.025*(station-d);
        ring.push(p);
      }
      rings.push(ring);
    }
    for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++){
      const k=(j+1)%sides,points=[rings[i][j],rings[i][k],rings[i+1][j],rings[i+1][k]];
      const seam=i===2||i===4,shade=(seam?.83:.88+.10*rand(j+seed))* (i===0?.8:1);
      const uv=points.map(p=>[p[0]+p[2]*.37,p[1]+p[2]*.05]);
      h.face(...points,uv,tone.map(v=>v*shade),15);
    }
    const cap=rings[rings.length-1],center=cap.reduce((p,v)=>p.map((x,i)=>x+v[i]/sides),[0,0,0]);
    for(let j=0;j<sides;j++){
      const a=cap[j],b=cap[(j+1)%sides];
      h.face(a,b,center,center,[[a[0],a[2]],[b[0],b[2]],[center[0],center[2]],[center[0],center[2]]],tone.map(v=>v*.93),15);
    }
  }

  function lookout(h) {
    const d=604,base=ground(d,15.4)+.37;
    // A compact pedestrian terrace sits behind the uphill verge, with a view
    // across the road to the ocean. Every new edge is at least 10.2 m out.
    block(h,595,613,10.2,19.5,base-.85,base,[.55,.54,.47],15);
    block(h,595,613,10.2,19.5,base,base+.065,[.66,.63,.52],11);
    for(const u of [10.3,19.3])block(h,595,613,u,u+.20,base+.065,base+.28,[.55,.54,.47],15);
    block(h,595,595.32,10.5,19.5,base,base+.68,[.58,.56,.47],15);
    block(h,612.68,613,10.5,19.5,base,base+.68,[.58,.56,.47],15);
    for(const m of [599,607]){
      const timber=[.36,.32,.25],metal=[.20,.25,.25];
      block(h,m,m+2.05,13.1,13.62,base+.46,base+.55,timber,11);
      block(h,m,m+2.05,13.56,13.65,base+.72,base+1.08,timber,11);
      for(const n of [m+.22,m+1.76]){
        block(h,n,n+.08,13.17,13.53,base,base+.48,metal,5);
        block(h,n,n+.08,13.57,13.65,base+.45,base+1.05,metal,5);
      }
    }
    // Low interpretive table and a blue-grey viewing instrument, no large label.
    block(h,602.9,604.1,11.02,11.56,base+.78,base+.88,[.29,.35,.34],5);
    block(h,603.35,603.51,11.21,11.40,base,base+.82,[.32,.34,.31],5);
    for(const m of [596,611])h.flora(m,21.3,.65,6,12000+m);
  }

  function lightCompound(h) {
    const y=elevation(4656)-.79,stone=[.68,.66,.57],cream=[.81,.79,.68],roof=[.48,.28,.21];
    const P=(d,u,up)=>{const p=h.point(d,u);p[1]=y+up;return p;};
    // Low courtyard walls, a pitched keeper's cottage, and an exposed access path.
    block(h,4642,4675,-23.7,-10.5,y-.42,y,stone,15);
    block(h,4642,4675,-23.7,-23.35,y,y+.7,stone,15);
    block(h,4642,4642.32,-23.7,-11.6,y,y+.68,stone,15);
    block(h,4674.66,4675,-23.7,-11.6,y,y+.68,stone,15);
    block(h,4659,4667,-22.35,-17.55,y-.7,y+.24,[.48,.49,.44],15);
    block(h,4659,4667,-22.15,-17.75,y+.24,y+3.04,cream);
    h.face(P(4658.7,-22.48,3.0),P(4667.3,-22.48,3.0),P(4658.7,-19.95,4.16),P(4667.3,-19.95,4.16),[[0,0],[8.6,0],[0,2.5],[8.6,2.5]],roof,11);
    h.face(P(4658.7,-19.95,4.16),P(4667.3,-19.95,4.16),P(4658.7,-17.42,3.0),P(4667.3,-17.42,3.0),[[0,0],[8.6,0],[0,2.5],[8.6,2.5]],roof.map(v=>v*.79),11);
    for(const m of [4659,4667])h.face(P(m,-22.15,3.04),P(m,-17.75,3.04),P(m,-19.95,4.1),P(m,-19.95,4.1),[[0,0],[4.4,0],[2.2,1.1],[2.2,1.1]],cream,11);
    // The approach-facing gable has its own sash and weathered shutters, so the
    // keeper's house reads as an occupied building from the final long sightline.
    const gable=(left,right,bottom,top,color)=>h.face(P(4658.975,left,bottom),P(4658.975,right,bottom),P(4658.975,left,top),P(4658.975,right,top),[[0,0],[1,0],[0,1],[1,1]],color,5);
    gable(-21.15,-20.20,1.24,2.31,[.21,.32,.33]);
    gable(-21.52,-21.20,1.19,2.35,[.32,.42,.36]);gable(-20.15,-19.83,1.19,2.35,[.32,.42,.36]);
    gable(-20.71,-20.65,1.24,2.31,[.85,.81,.69]);gable(-21.15,-20.20,1.75,1.81,[.85,.81,.69]);
    gable(-19.25,-18.43,.24,2.29,[.29,.38,.32]);
    block(h,4658.4,4659,-19.39,-18.29,y+.12,y+.25,[.61,.60,.53]);
    for(const m of [4660.1,4664.8]){
      h.face(P(m,-17.735,1.24),P(m+1.1,-17.735,1.24),P(m,-17.735,2.33),P(m+1.1,-17.735,2.33),[[0,0],[1,0],[0,1],[1,1]],[.21,.32,.32],5);
      block(h,m-.06,m+1.16,-17.81,-17.67,y+1.18,y+1.28,[.86,.83,.72]);
      block(h,m+.51,m+.57,-17.73,-17.70,y+1.26,y+2.32,cream,5);
    }
    h.face(P(4662.47,-17.73,.25),P(4663.28,-17.73,.25),P(4662.47,-17.73,2.3),P(4663.28,-17.73,2.3),[[0,0],[1,0],[0,1],[1,1]],[.25,.35,.32],5);
    block(h,4664.9,4665.55,-20.8,-20.15,y+3.3,y+5.08,cream);
    block(h,4664.83,4665.62,-20.88,-20.08,y+5.03,y+5.18,[.39,.38,.33]);
    // Individual shallow steps remain wholly outside the protected road corridor.
    for(let i=0;i<5;i++)block(h,4647,4648.4,-10.7-i*.40,-10.3-i*.40,y-.20+i*.052,y-.12+i*.052,[.70,.67,.56],11);
  }

  function section(d,z,h) {
    const {point,quad,face,wall,post,flora}=h;
    const v=(m,u,y)=>{const p=point(m,u);p[1]=y;return p;};
    const cut=bridge(d);
    // The ocean also runs under the viaduct. UVs stay in world coordinates so
    // whitecaps move with the wind instead of following the rider or the curve.
    const outer=m=>[-3650,waterLevel,m],inner=m=>v(m,cut?120:-8,waterLevel);
    const sea=[outer(d),inner(d),outer(z),inner(z)];
    quad(...sea,sea.map(p=>[p[0],p[2]]),[1,1,1],14);
    function patch(l,r,kind,color) {
      const pts=[point(d,l),point(d,r),point(z,l),point(z,r)];
      quad(...pts,[[l,d],[r,d],[l,z],[r,z]],color,kind);
    }
    if(!cut){
      const L=[half,6.0,8.0,10,13,16.8,22,28,36,46];
      for(let j=0;j<L.length-1;j++) {
        const s=(L[j]+L[j+1])*.5;
        patch(-L[j],-L[j+1],s<verge(d)+1.4?1:15,[.91,.85,.73]);
      }
      const R=[half,5.65,8,11,15,22,33,51,84,145,260];
      for(let j=0;j<R.length-1;j++){
        const midpoint=(R[j]+R[j+1])*.5,rock=rockReach(d)>.52&&midpoint>10&&midpoint<35;
        const tint=d<1600?[.91,.83,.72]:d<3300?[.67,.70,.68]:[.88,.87,.80];
        patch(R[j],R[j+1],rock?15:1,rock?tint:[1,1,1]);
      }
      const surf=[v(d,-toe(d)-1,waterLevel+.045),v(d,-toe(d)-4,waterLevel+.045),
        v(z,-toe(z)-1,waterLevel+.045),v(z,-toe(z)-4,waterLevel+.045)];
      quad(...surf,[[0,d],[1,d],[0,z],[1,z]],[1,1,1],16);
      const k=d/4;
      const open=exposed(d),reserved=(d>578&&d<630)||(d>4620&&d<4690);
      if(!reserved&&rand(k+27)<.14*(1-open*.86) && (Math.sin(d/131)>.23 || rand(k+28)>.74))flora(d+rand(k+2)*4,12+rand(k+17)*13,3.3+rand(k+4)*2.9,0,k+259);
      if(!reserved&&rand(k+21)<.27*(1-open*.58))flora(d+rand(k+7)*4,27+rand(k+18)*29,4.1+rand(k+2)*3.1,0,k+716);
      if(!reserved&&rand(k+54)>.48+open*.12)flora(d,8.8+rand(k+19)*17,.32+rand(k+37)*.68,6,k+153);
      const scrubPatch=rand(Math.floor(d/28)*19+.7)>.29;
      if(!reserved&&scrubPatch&&rand(k+91)<.73*(1-open*.63)){
        const u=9.4+rand(k+92)*12.5;
        flora(d+rand(k+94)*3,u,.18+rand(k+93)*.26,1,k+1701);
        flora(d+1.7,u+.75,.22+rand(k+96)*.27,1,k+1757);
        if(rand(k+97)>.38)flora(d+1,17+rand(k+98)*19,.32+rand(k+99)*.41,6,k+1834);
      }
      if(rand(k+24)>.66)flora(d+2,-(5.85+rand(k+87)*1.35),.27+rand(k+65)*.56,6,k+722);
      if(!reserved&&rand(k+2)>.90)flora(d,10.8+rand(k+11)*20,.65+rand(k+37)*1.6,7,k+561);
      if(rand(k+82)>.91)flora(d,-(toe(d)-2),1.1+rand(k+3)*3.4,7,k+223);
      if(d===12)flora(12,14.9,5.2,0,831);
    }else{
      // A weathered, open-spandrel concrete bridge rises above a tidal inlet.
      const slate=[.54,.55,.53],edge=[.68,.67,.60],shadow=[.38,.42,.43];
      function slab(u1,u2,y1,y2,c,m=11) {
        const A=v(d,u1,elevation(d)+y1),B=v(z,u1,elevation(z)+y1),C=v(d,u2,elevation(d)+y2),D=v(z,u2,elevation(z)+y2);
        face(A,B,C,D,[[d,u1+y1],[z,u1+y1],[d,u2+y2],[z,u2+y2]],c,m);
      }
      for(const side of [-1,1]){
        slab(side*half,side*6.24,-.058,-.09,[.62,.59,.54],15);
        slab(side*6.24,side*6.24,-.09,-1.52,edge);
        slab(side*6.22,side*5.89,-1.50,-1.50,shadow);
        const arch=m=>{const x=(m-(bridgeStart+bridgeEnd)/2)/((bridgeEnd-bridgeStart)/2);return elevation(m)-3.1-31*x*x;};
        const xx=6.00*side,a=v(d,xx,arch(d)),b=v(z,xx,arch(z)),c=v(d,xx,arch(d)-1.52),e=v(z,xx,arch(z)-1.52);
        face(a,b,c,e,[[d,0],[z,0],[d,1.52],[z,1.52]],slate,11);
        if((d-bridgeStart)%16===0){
          const m=d+.4,n=d+1.18,U=side*5.96,T=elevation(m)-1.4,B=arch(m);
          face(v(m,U,T),v(n,U,T),v(m,U,B),v(n,U,B),[[m,T],[n,T],[m,B],[n,B]],shadow,11);
        }
        // Continuous lower curb and narrow cap frame the rhythm of the balusters.
        slab(side*5.62,side*5.62,.21,.01,slate);
        slab(side*5.62,side*6.08,.21,.21,edge);
        slab(side*5.65,side*6.08,.97,.97,edge);
        slab(side*5.65,side*5.65,.97,.795,slate);
        for(const offset of [.3,2.3]){
          const m=d+offset,n=m+.29,U=side*5.78;
          face(v(m,U,elevation(m)+.81),v(n,U,elevation(n)+.81),v(m,U,elevation(m)+.17),v(n,U,elevation(n)+.17),
            [[m,.8],[n,.8],[m,.17],[n,.17]],slate,11);
        }
        if((d-bridgeStart)%36===0){
          // Transverse expansion joints break the bridge's rhythm under the wheels.
          h.strip(d,d+.055,-half,0,[.22,.24,.24],5,.009);
          h.strip(d,d+.055,0,half,[.22,.24,.24],5,.009);
        }
        if((d-bridgeStart)%72===0 || z===bridgeEnd){
          const m=z===bridgeEnd?z-1:d;
          // Stepped bridge pylons stand above the parapet and are visible on approach.
          const portal=d===bridgeStart||z===bridgeEnd;
          const tower=portal?[[1.35,-.12,1.28,slate],[1.14,1.24,3.22,edge],[.94,3.20,3.84,slate],[.77,3.82,4.16,edge],[1.04,4.14,4.32,shadow]]:
            [[.85,-.12,1.02,slate],[.66,1,2.20,edge],[.84,2.18,2.34,slate]];
          for(const [wid,lo,hi,color] of tower){
            const x0=side*5.88-wid*.5,x1=x0+wid,n=m+.92;
            face(v(m,x0,elevation(m)+hi),v(m,x1,elevation(m)+hi),v(m,x0,elevation(m)+lo),v(m,x1,elevation(m)+lo),
              [[x0,hi],[x1,hi],[x0,lo],[x1,lo]],color,11);
            face(v(m,x0,elevation(m)+hi),v(n,x0,elevation(n)+hi),v(m,x0,elevation(m)+lo),v(n,x0,elevation(n)+lo),
              [[m,hi],[n,hi],[m,lo],[n,lo]],shadow,11);
            face(v(m,x0,elevation(m)+hi),v(m,x1,elevation(m)+hi),v(n,x0,elevation(n)+hi),v(n,x1,elevation(n)+hi),
              [[m,x0],[m,x1],[n,x0],[n,x1]],edge,11);
          }
        }
      }
      // Opposite side of the inlet: water below, the inlet cliff beyond the pillars.
      for(let j=0;j<4;j++) {
        const u=[54,64,76,95,200], H=[.12,6,18,29,39];
        const contour=(m,k)=>H[k]+(k===0?0:(.7+.3*k)*Math.sin(m*.041+k*.7)+.6*Math.cos(m*.087-k));
        const pts=[v(d,u[j],contour(d,j)),v(d,u[j+1],contour(d,j+1)),v(z,u[j],contour(z,j)),v(z,u[j+1],contour(z,j+1))];
        quad(...pts,[[u[j],d],[u[j+1],d],[u[j],z],[u[j+1],z]],[.94,.87,.73],15);
      }
    }
    // Fractured inlet walls and low tidal skerries establish scale below the
    // viaduct. These are beyond the deck's physical envelope on both banks.
    const inlet={
      2036:[-34,10,14,21,.1],2092:[77,11,18,25,7],2172:[66,9,15,18,1.2],
      2248:[86,15,22,29,8],2300:[-40,13,19,17,.2],2352:[70,12,17,22,4]
    };
    if(inlet[d]){
      const [u,a,l,y,floor]=inlet[d];outcrop(h,d,u,a,l,y,d*.11,[.77,.77,.69],floor);
    }
    if(d===2044||d===2336){
      const y=elevation(d),m=d===2044?2045:2336;
      for(const side of [-1,1]){
        const near=side*8.8,far=side*15.2,left=Math.min(near,far),right=Math.max(near,far);
        // Broad battered wing-wall abutments tie the span to the inlet banks.
        block(h,m,m+3.0,left,right,y-15,y-1.05,[.50,.52,.49],11);
        block(h,m-.16,m+3.16,left-.10,right+.10,y-1.05,y-.76,[.65,.64,.58],11);
      }
    }
    const geology={
      312:[20,6,9,5.8,0],976:[21,7,13,7,0],1048:[17.2,5.6,11,6.4,0],
      1132:[23,9,15,8.8,0],1208:[16.8,5.8,9,5.4,0],1300:[21,7.5,13,7.2,0],
      1388:[26,9,15,9,0],1668:[29,8,12,7.2,0],
      2704:[19,6.8,12,7.1,1],2796:[23,9,16,8.8,1],2888:[17.5,6.2,11,6.1,1],
      2984:[25,8.5,15,9.5,1],3072:[19.2,6.8,10,6.8,1],
      4120:[23,8,13,8.4,2],4224:[17.8,6,10,7.5,2],4320:[28,10,17,10.8,2],4408:[20,6.3,12,6.8,2]
    };
    if(geology[d]){
      const [u,a,l,y,region]=geology[d],tone=[[.92,.84,.70],[.62,.66,.65],[.88,.87,.79]][region];
      // Overlapping weathered lobes taper at both ends; there is no long flat
      // top or vertical slab end silhouetted against the sky on the approach.
      outcrop(h,d,u,a*.83,l*.64,y*.79,d*.17,tone);
      outcrop(h,d-l*.66,u+a*.18,a*.64,l*.48,y*.53,d*.17+7,tone.map(v=>v*.98));
      outcrop(h,d+l*.64,u+a*.13,a*.67,l*.43,y*.64,d*.17+19,tone.map(v=>v*.95));
      // Smaller fallen blocks share the bedrock's material and orientation.
      outcrop(h,d+7,u-a*.65,Math.min(1.7,a*.21),2.2,1.6,d*.31,tone.map(v=>v*.88));
    }
    if(d===604)lookout(h);
    if(d===4656)lightCompound(h);
    // Offshore sea stacks are static, lit geometry with surf rings around each foot.
    const stacks={88:[-71,13,8],372:[-54,17,6.8],640:[-106,22,11],1016:[-75,11,8],
      1316:[-85,25,9],1624:[-63,16,6],1940:[-125,22,13],2136:[-71,18,9],
      2512:[-62,16,8],2924:[-95,22,12],3364:[-62,19,6],3692:[-75,16,10],4052:[-94,26,12],4516:[-72,14,8]};
    if(stacks[d]){
      const [u,ht,rad]=stacks[d],bp=point(d,u),rings=[];
      for(let i=0;i<7;i++){
        const ring=[];
        for(let j=0;j<12;j++){
          const a=j*Math.PI/6+.035*i;
          const r=rad*[1.12,1.03,.91,.92,.66,.68,.35][i]*(.81+rand(d+j*37)*.35);
          ring.push([bp[0]+Math.cos(a)*r+i*.27,[.015,.15,.43,.46,.74,.77,.98][i]*ht+.045*ht*rand(j+d),bp[2]+Math.sin(a)*r*.79]);
        }
        rings.push(ring);
      }
      for(let i=0;i<6;i++)for(let j=0;j<12;j++){
        const k=(j+1)%12,a=rings[i][j],b=rings[i][k],c=rings[i+1][j],e=rings[i+1][k];
        const lit=(.74+.14*Math.cos(j*Math.PI/6+.8)+i*.025)*(i===2||i===4?.78:1);
        const tex=p=>[p[0]+p[2]*.4,p[1]+p[2]*.13];
        face(a,b,c,e,[tex(a),tex(b),tex(c),tex(e)],[lit*.85,lit*.79,lit*.72],15);
      }
      const top=rings[6],center=[bp[0]+1.62,ht*1.025,bp[2]];
      for(let j=0;j<12;j++)face(top[j],top[(j+1)%12],center,center,
        [[0,0],[1,0],[.5,1],[.5,1]],[.63,.64,.56],15);
      // White water bends around each real rock footprint, rather than being a
      // floating decorative ellipse. It uses the animated shoreline material.
      for(let j=0;j<16;j++){
        const a=j*Math.PI/8,b=(j+1)*Math.PI/8;
        const ring=(angle,r)=>[bp[0]+Math.cos(angle)*r,waterLevel+.08,bp[2]+Math.sin(angle)*r*.79];
        quad(ring(a,rad*.94),ring(a,rad*1.55),ring(b,rad*.94),ring(b,rad*1.55),
          [[0,d+j*.9],[1,d+j*.9],[0,d+(j+1)*.9],[1,d+(j+1)*.9]],[1,1,1],16);
      }
    }
    if(d===4656){
      // Cape Meridian Light. The lantern, dark gallery and red roof have a
      // recognizable silhouette from the final bend, in both camera positions.
      const p=point(d,-14.1),base=elevation(4656)-.79,rings=[[0,2.5],[.46,2.52],[.65,2.21],[14.9,1.48],[15.23,1.99],[15.55,2.05],[15.73,1.17],[17.73,1.14],[17.95,1.63],[19.34,.13],[19.94,.01]];
      const cols=[[.72,.72,.65],[.82,.80,.69],[.89,.85,.72],[.28,.31,.30],[.22,.26,.26],[.25,.28,.27],[.98,.81,.48],[.32,.34,.31],[.63,.24,.16],[.29,.28,.25]];
      // Gallery railing, dark windows and entry door break up the whitewashed shaft.
      const panel=(dx,dy,w,h,z,color)=>{
        const a=[p[0]+dx-w/2,base+dy,p[2]+z],b=[p[0]+dx+w/2,base+dy,p[2]+z];
        face(a,b,[a[0],a[1]+h,a[2]],[b[0],b[1]+h,b[2]],[[0,0],[1,0],[0,1],[1,1]],color,5);
      };
      panel(0,1.1,.85,1.93,-2.18,[.23,.28,.25]);panel(.12,6.25,.57,.94,-1.99,[.18,.27,.28]);panel(.03,11.41,.51,.81,-1.73,[.21,.30,.30]);
      for(let j=0;j<16;j++){
        const a=j*Math.PI/8,b=(j+1)*Math.PI/8;
        const pp=(r,h,angle)=>[p[0]+Math.cos(angle)*r,base+h,p[2]+Math.sin(angle)*r];
        face(pp(1.92,16.27,a),pp(1.92,16.27,b),pp(1.92,16.34,a),pp(1.92,16.34,b),[[0,0],[1,0],[0,1],[1,1]],[.20,.24,.24],5);
        face(pp(1.92,15.45,a-.014),pp(1.92,15.45,a+.014),pp(1.92,16.32,a-.014),pp(1.92,16.32,a+.014),[[0,0],[1,0],[0,1],[1,1]],[.22,.24,.23],5);
      }
      for(let i=0;i<rings.length-1;i++)for(let j=0;j<16;j++){
        const a=j*Math.PI/8,b=(j+1)*Math.PI/8;
        const polar=(angle,row)=>[p[0]+Math.cos(angle)*row[1],base+row[0],p[2]+Math.sin(angle)*row[1]];
        const A=polar(a,rings[i]),B=polar(b,rings[i]),C=polar(a,rings[i+1]),D=polar(b,rings[i+1]);
        const shade=.86+.14*Math.cos(a+2.25),c=cols[i].map(v=>v*shade);
        face(A,B,C,D,[[j,rings[i][0]],[j+1,rings[i][0]],[j,rings[i+1][0]],[j+1,rings[i+1][0]]],c,i===6?19:11);
        if(i===6){
          const n=(a+b)*.5;
          face(polar(n-.045,rings[i]),polar(n+.045,rings[i]),polar(n-.045,rings[i+1]),polar(n+.045,rings[i+1]),[[0,0],[1,0],[0,1],[1,1]],[.20,.23,.23],5);
        }
      }
    }
  }
  const groundPatterns=new WeakMap();
  function fallback(ctx,w,h,cam,point,screen,faceScreen,landmarks,meadow){
    let pattern=groundPatterns.get(ctx);
    if(!pattern&&meadow.loaded){pattern=ctx.createPattern(meadow,'repeat');groundPatterns.set(ctx,pattern);}
    const waterY=cam.horizon+cam.grade*cam.f;
    const gradient=ctx.createLinearGradient(0,waterY,0,h);
    gradient.addColorStop(0,cam.rain?'rgba(105,128,137,0)':'rgba(76,126,143,0)');
    gradient.addColorStop(.18,cam.rain?'rgba(74,102,113,.53)':'rgba(49,115,130,.55)');
    gradient.addColorStop(1,cam.rain?'#3e575d':'#28717a');
    ctx.fillStyle=gradient;ctx.fillRect(-w,waterY,w*3,h+30);
    // Wind lines stay locked to their position on the water even when the road turns.
    ctx.lineWidth=.8;
    const cell=Math.floor(cam.d/8);
    for(let n=cell;n<cell+64;n++){
      for(let j=0;j<4;j++){
        const k=n*101+j,d=n*8+rand(k)*8, p=point(d,-(26+rand(k+17)*210));
        p[1]=waterLevel+.14; const a=screen(p);
        if(!a||a.x< -60||a.x>w+70||a.y<waterY)continue;
        const span=(.6+rand(k+12)*2.8)*a.scale,lum=.13+.15*rand(k+9);
        ctx.strokeStyle='rgba(209,230,224,'+lum+')';ctx.beginPath();ctx.moveTo(a.x-span,a.y);ctx.lineTo(a.x+span,a.y+.4);ctx.stroke();
      }
    }
    function poly(vertices,col){
      const v=faceScreen(vertices);if(v.length<3)return;
      ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(v[0].x,v[0].y);for(let i=1;i<v.length;i++)ctx.lineTo(v[i].x,v[i].y);ctx.closePath();ctx.fill();
    }
    // Offshore stacks must precede the cliff and road in painter's order.
    // A distant rock below the camera projects into nearer pavement on screen.
    for(const f of landmarks.filter(f=>f.offshore&&f.d>cam.d-25&&f.d<cam.d+500).sort((a,b)=>b.d-a.d)){
      const shade=cam.rain?.52:.77, col=f.color.map(x=>Math.round(x*255*shade));
      poly(f.vertices,'rgb('+col.join(',')+')');
    }
    const start=Math.floor(cam.d/8)*8;
    for(let k=62;k>=-2;k--){
      const d=start+k*8,z=d+8;if(bridge(d))continue;
      const left=[-verge(d),-verge(d)-3,-toe(d)+3,-toe(d)-2];
      const next=[-verge(z),-verge(z)-3,-toe(z)+3,-toe(z)-2];
      for(let j=0;j<3;j++){
        const value=rand(Math.floor(d/13)+j*83),v=Math.round((cam.rain?76:115)+value*27+j*3);
        poly([point(d,left[j]),point(z,next[j]),point(z,next[j+1]),point(d,left[j+1])],
          'rgb('+v+','+Math.round(v*(cam.rain?1.06:.90))+','+Math.round(v*(cam.rain?1.08:.73))+')');
      }
      const R=[7,17,45,103];for(let j=0;j<3;j++){
        const color=cam.rain?['#6a715e','#69775f','#6d7765'][j]:['#ad9b70','#a89561','#9b8b60'][j];
        const mesh=[point(d,R[j]),point(z,R[j]),point(z,R[j+1]),point(d,R[j+1])];
        poly(mesh,color);
        if(pattern){
          const a=screen(mesh[0]),b=screen(mesh[1]),e=screen(mesh[3]);
          if(a&&b&&e&&a.z>1.8&&Math.abs(a.x-w*.5)<w*1.5){
            const span=R[j+1]-R[j], ux=(e.x-a.x)/span,uy=(e.y-a.y)/span,vx=(b.x-a.x)/8,vy=(b.y-a.y)/8, unit=29/meadow.naturalWidth;
            pattern.setTransform(new DOMMatrix([ux*unit,uy*unit,vx*unit,vy*unit,a.x-ux*R[j]-vx*d,a.y-uy*R[j]-vy*d]));
            ctx.globalAlpha=cam.rain?.41:.50;poly(mesh,pattern);ctx.globalAlpha=1;
          }
        }
      }
    }
  }
  return {course,tangent,curvature,elevation,grade,ground,coverAt,hasRail,bridge,bridgeStart,bridgeEnd,section,waterLevel,verge,fallback};
})();

;
/* london.js */
/* A3 London: a condensed, fictional closed-course stage inspired by the
   Kingston Vale–Wandsworth corridor, not a surveyed public-road recreation. */
window.ApexLondon=(()=>{
  'use strict';
  const length=6000,half=4.65;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  const rand=n=>{const x=Math.sin(n*87.13+9.71)*43758.37;return x-Math.floor(x);};
  // Broad arterial-road bends, followed by a gently descending urban approach.
  const east=[-9,0,18,44,48,23,-15,-34,-17,25,62,55,22,-18,-42,-28,12,45,32,-10,-51,-32,20,58,38,-4,-30,-5,24,47,26,8,-8,-15,-3];
  const high=[19,19,20,22,24,26,27,26,24,23,24,27,30,32,33,34,34,33,31,29,28,27,26,25,23,21,20,18,17,16,15,15,15,15,15];
  function survey(knots,d,diff){
    const f=d/200+1,i=clamp(Math.floor(f),0,knots.length-2),t=clamp(f-i,0,1);
    const a=knots[Math.max(0,i-1)],b=knots[i],c=knots[i+1],e=knots[Math.min(i+2,knots.length-1)];
    const l=.5*(c-a),q=.5*(2*a-5*b+4*c-e),k=.5*(-a+3*b-3*c+e);
    return diff===1?(l+2*q*t+3*k*t*t)/200:diff===2?(2*q+6*k*t)/40000:b+t*(l+t*(q+t*k));
  }
  const course=d=>survey(east,d,0),tangent=d=>survey(east,d,1);
  const elevation=d=>survey(high,d,0),grade=d=>survey(high,d,1);
  const curvature=d=>survey(east,d,2)/(1+tangent(d)**2)**1.5;
  const city=d=>smooth(3480,4380,d),bank=d=>clamp(-curvature(d)*9,-.028,.028);
  function ground(d,u){
    const e=elevation(d)+bank(d)*clamp(u,-half,half)-.009*Math.min(Math.abs(u),half);
    if(Math.abs(u)<half)return e;
    // Both carriageways and their pavements share one local elevation datum.
    const verge=Math.max(0,Math.abs(u)-(u>0?20:8.6));
    return e-.025+Math.min(verge,38)*(.012+.013*Math.sin(d/380))*(1-city(d))
      +smooth(2,24,verge)*(.24*Math.sin(u*.11+d*.017)+.14*Math.cos(d*.039))*(1-city(d));
  }
  const coverAt=(d,u)=>clamp((1-city(d)*.82)*(.64+.17*Math.sin(d*.023+u*.3)),.04,.88);
  const hasRail=(d,side)=>side>0||(d>1152&&d<1920)||(d>2880&&d<3380);
  const zones=[[0,'Kingston Vale'],[1160,'Roehampton Vale'],[2420,'Putney Heath'],[3600,"Tibbet’s Corner"],[4720,'Wandsworth Approach']];
  function zoneAt(d){let i=0;while(i+1<zones.length&&d>=zones[i+1][0])i++;return {id:'london-'+i,name:zones[i][1],detail:'A3 · London'};}
  const uv=[[0,0],[1,0],[0,1],[1,1]],tint=(c,t)=>c.map(v=>v*t);
  function box(h,d,z,l,r,b,t,color,material=11){
    const P=(m,u,y)=>{const p=h.point(m,u);p[1]=y;return p;};
    const a=P(d,l,b),b0=P(z,l,b),c=P(d,r,b),e=P(z,r,b),A=P(d,l,t),B=P(z,l,t),C=P(d,r,t),E=P(z,r,t);
    h.face(a,b0,A,B,[[d,b],[z,b],[d,t],[z,t]],tint(color,.82),material);
    h.face(c,e,C,E,[[d,b],[z,b],[d,t],[z,t]],color,material);
    h.face(a,c,A,C,[[l,b],[r,b],[l,t],[r,t]],tint(color,.91),material);
    h.face(b0,e,B,E,[[l,b],[r,b],[l,t],[r,t]],tint(color,.75),material);
    h.face(A,B,C,E,[[l,d],[l,z],[r,d],[r,z]],tint(color,1.06),material);
  }
  function lamp(h,d,u){
    const floor=ground(d,u),side=u<0?1:-1;
    const metal=[.43,.47,.47],dark=[.25,.29,.30];
    box(h,d-.075,d+.075,u-.075,u+.075,floor,floor+8.1,metal,3);
    box(h,d-.13,d+.13,u-.13,u+.13,floor,floor+.36,dark,3);
    const U=u+side*2.1;
    box(h,d-.055,d+.055,Math.min(u,U),Math.max(u,U),floor+7.96,floor+8.07,metal,3);
    box(h,d-.31,d+.47,U-.19,U+.19,floor+7.82,floor+7.98,[.31,.35,.35],3);
    box(h,d-.24,d+.39,U-.15,U+.15,floor+7.80,floor+7.83,[.83,.81,.66],5);
  }
  function terrace(world,d,side,seed){
    const h={...world,face:(...args)=>world.face(...args,{groupD:d+9.6})};
    const near=side<0?-11.6:23.0,far=near+side*8.0;
    const l=Math.min(near,far),r=Math.max(near,far),floor=elevation(d)+.08;
    const count=3,width=6.4,roof=floor+7.4+rand(seed)*1.1;
    const color=[[.52,.30,.22],[.56,.37,.27],[.48,.36,.29],[.64,.49,.35]][Math.floor(rand(seed+8)*4)];
    box(h,d,d+count*width,l,r,floor,roof,color,21);
    // Slate pitched roofs and individual chimney stacks follow the terrace.
    const P=(m,u,y)=>{const p=h.point(m,u);p[1]=y;return p;};
    const center=(l+r)/2;
    h.face(P(d-.20,l-.25,roof),P(d+count*width+.2,l-.25,roof),P(d-.20,center,roof+2.05),P(d+count*width+.2,center,roof+2.05),uv,[.24,.28,.29],11);
    h.face(P(d-.20,center,roof+2.05),P(d+count*width+.2,center,roof+2.05),P(d-.20,r+.25,roof),P(d+count*width+.2,r+.25,roof),uv,[.30,.32,.31],11);
    for(const m of [d,d+count*width])h.face(P(m,l,roof),P(m,r,roof),P(m,center,roof+2.04),P(m,center,roof+2.04),[[l,roof],[r,roof],[center,roof+2.04],[center,roof+2.04]],color,21);
    const facade=near-side*.022;
    const frontA=h.point(d,near),frontB=h.point(d+count*width,near);
    const dx=frontB[0]-frontA[0],dz=frontB[2]-frontA[2],span=Math.hypot(dx,dz);
    function facadePoint(m,y,relief){const t=(m-d)/(count*width),offset=-side*(.025+relief);return [frontA[0]+dx*t+dz/span*offset,y,frontA[2]+dz*t-dx/span*offset];}
    function panel(m,n,lo,hi,c,relief=0){h.face(facadePoint(m,lo,relief),facadePoint(n,lo,relief),facadePoint(m,hi,relief),facadePoint(n,hi,relief),[[m,lo],[n,lo],[m,hi],[n,hi]],c,5);}
    for(let house=0;house<count;house++){
      const start=d+house*width;
      box(h,start+5.10,start+5.87,center-.38,center+.38,roof+.35,roof+2.85,color,21);
      for(const k of [0,1])box(h,start+5.20+k*.32,start+5.38+k*.32,center-.14,center+.14,roof+2.84,roof+3.24,[.46,.30,.23],5);
      box(h,start,start+.11,Math.min(near,facade-side*.09),Math.max(near,facade-side*.09),floor+.2,roof,[.71,.65,.53],11);
      for(let row=0;row<2;row++)for(const offset of [1.0,3.7]){
        const a=start+offset,b=a+1.42,lo=floor+1.23+row*3.07,hi=lo+1.75;
        panel(a-.10,b+.10,lo-.13,hi+.11,[.77,.75,.66]);
        panel(a,b,lo,hi,[.20,.28,.31],.015);
        panel(a+.66,a+.73,lo,hi,[.74,.73,.66],.026);panel(a,b,lo+.79,lo+.86,[.71,.70,.62],.027);
      }
      panel(start+2.63,start+3.47,floor+.05,floor+2.30,house%2?[.26,.32,.29]:[.20,.27,.33]);
      panel(start+2.69,start+3.41,floor+1.73,floor+2.19,[.36,.44,.43],.015);
      // Low front garden walls, coping, gate piers and separate garden shrubs.
      const front=side<0?-9.3:20.2;
      box(h,start+.15,start+2.15,front-.16,front+.16,floor-.12,floor+.65,color,21);
      box(h,start+3.62,start+6.25,front-.16,front+.16,floor-.12,floor+.65,color,21);
      for(const station of [start+2.17,start+3.55])box(h,station-.14,station+.14,front-.21,front+.21,floor-.12,floor+.95,color,21);
      if(house!==1)h.flora(start+1.2,(near+front)/2,1.65,0,seed+house*31);
    }
  }
  function office(world,d,u){
    const h={...world,face:(...args)=>world.face(...args,{groupD:d+15.5})};
    const base=elevation(d)+.1,width=31,near=u,far=u+12,floor=base+12.5;
    box(h,d,d+width,near,far,base,floor,[.53,.49,.43],21);
    box(h,d-.2,d+width+.2,near-.25,far+.25,floor,floor+.50,[.36,.39,.38],11);
    const P=(m,a,y)=>{const p=h.point(m,a);p[1]=y;return p;};
    for(let row=0;row<3;row++)for(let col=0;col<8;col++){
      const m=d+1.3+col*3.7,n=m+2.50,lo=base+1.6+row*3.4,hi=lo+2;
      h.face(P(m,near-.025,lo),P(n,near-.025,lo),P(m,near-.025,hi),P(n,near-.025,hi),uv,[.25,.34,.37],5);
      h.face(P(m,near-.035,lo+.94),P(n,near-.035,lo+.94),P(m,near-.035,lo+1.01),P(n,near-.035,lo+1.01),uv,[.56,.59,.57],5);
    }
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
      const u=near+1.4+col*3.5,v=u+2.1,lo=base+1.6+row*3.4;
      h.face(P(d-.025,u,lo),P(d-.025,v,lo),P(d-.025,u,lo+2),P(d-.025,v,lo+2),uv,[.25,.34,.37],5);
      h.face(P(d-.035,u,lo+.95),P(d-.035,v,lo+.95),P(d-.035,u,lo+1.02),P(d-.035,v,lo+1.02),uv,[.57,.59,.57],5);
    }
    for(const m of [d+5,d+20])box(h,m,m+3.8,near+6,near+8,floor+.5,floor+1.35,[.37,.40,.39],11);
  }
  function direction(h,d,kind){
    const u=-9.4;
    h.post(d,u,3.85,.12,[.49,.53,.52]);
    h.flora(d-.12,u,2.2,kind,d+791);
  }
  function section(d,z,h){
    // Grass verges, raised footways, and a separate southbound carriageway.
    for(const [l,r]of [[-180,-34],[-34,-14],[-14,-6.3],[-6.3,-half],[half,7.3],[17,21.0],[21,40],[40,180]])h.strip(d,z,l,r,[.77,.91,.78],1);
    h.strip(d,z,7.3,12,[1,1,1],0);h.strip(d,z,12,17,[1,1,1],0);
    for(const u of [7.49,16.79])h.strip(d,z,u,u+.105,[.87,.88,.82],2,.012);
    if(d%12<4)h.strip(d,z,12.08,12.21,[.87,.88,.82],2,.014);
    // Narrow paved drainage margins and concrete median beds.
    h.strip(d,z,-5.20,-4.65,[.36,.38,.36],11,.01);
    h.strip(d,z,4.65,5.14,[.38,.40,.37],11,.01);
    h.strip(d,z,5.15,7.27,[.34,.40,.32],1);
    const urban=city(d);
    if(d>3360){
      for(const [l,r] of [[-8.45,-5.25],[17.15,20.0]]){
        h.strip(d,z,l,r,[.58,.58,.53],11,.15);
        h.wall(d,z,l,0,l,.16,[.70,.70,.65],11);h.wall(d,z,r,0,r,.16,[.69,.69,.63],11);
      }
      // Drain covers and periodic slab seams lend scale at riding height.
      if(d%24===0){h.strip(d,d+.68,-5.09,-4.72,[.19,.23,.23],3,.022);h.strip(d,d+.045,-8.4,-5.3,[.35,.38,.36],5,.165);}
    }
    if(d%40===0){lamp(h,d,-9.3);lamp(h,d+20,18.5);}
    if(d%12===0&&d<4200){
      const seed=d+12000;
      if(rand(seed)>.13+urban*.65)h.flora(d+2,-(11+rand(seed+1)*20),8+rand(seed+2)*6,0,seed);
      if(rand(seed+3)>.15+urban*.60)h.flora(d+6,25+rand(seed+4)*22,9+rand(seed+5)*7,0,seed+6);
      if(d%24===0){h.flora(d,-(39+rand(seed+7)*24),11+rand(seed+8)*7,0,seed+9);h.flora(d+8,54+rand(seed+10)*28,12+rand(seed+11)*6,0,seed+12);}
    }
    if(d%32===0&&d<3552){
      // Cut hedges behind the pavement rather than grass billboards in the lane.
      const span=14+rand(d+12)*7,top=.78+rand(d+15)*.33,tone=.88+rand(d+19)*.18;
      box(h,d,d+span,-10.3,-9.1,elevation(d)-.15,elevation(d)+top,[.27*tone,.34*tone,.22*tone],4);
      box(h,d+6,d+6+span,20.4,21.8,elevation(d)-.12,elevation(d)+top+.15,[.26*tone,.33*tone,.23*tone],4);
      for(let k=0;k<4;k++){
        const m=d+k*span/4+.05,n=m+span/4-.10,rise=top+.035+rand(d+k)*.07;
        box(h,m,n,-10.23,-9.17,elevation(d)+top-.01,elevation(d)+rise,[.30*tone,.37*tone,.25*tone],4);
      }
    }
    if(d>=3744&&d<=6120&&d%32===0){
      terrace(h,d,-1,d);if(d%64===0)terrace(h,d+10,1,d+91);
      if(d%64===0){h.flora(d+26,-10.3,7.2+rand(d)*2,0,d+700);h.flora(d+42,22.1,8+rand(d+2)*2,0,d+701);}
    }
    if([4160,4640,5216,5728].includes(d))office(h,d,30.0);
    if([144,1248,2608,3792,4768,5664].includes(d))direction(h,d,12);
    if([832,2128,3312,4352].includes(d))direction(h,d,13);
    if(d===3520){
      // Pedestrian footbridge on the common: open railings, slender columns,
      // nothing beneath its 6.0 m clearance encroaches on the racing corridor.
      const e=elevation(d),steel=[.41,.47,.45];
      box(h,d,d+2.9,-14.9,26.5,e+6.0,e+6.38,steel,3);
      for(const u of [-9.4,20.9])box(h,d+.55,d+1.35,u-.30,u+.30,e-.2,e+6.1,[.58,.58,.53],11);
      for(const m of [d+.10,d+2.78]){
        box(h,m,m+.09,-14.9,26.5,e+7.47,e+7.57,steel,3);
        for(let u=-14.7;u<26.5;u+=1.1)box(h,m,m+.08,u,u+.065,e+6.35,e+7.5,steel,3);
      }
      for(const u of [-13.7,25.3]){
        const P=(m,x,y)=>{const p=h.point(m,x);p[1]=y;return p;};
        for(let k=0;k<24;k++){
          const m=d+2.9+k*.75,top=e+6.35*(1-k/24);
          box(h,m,m+.79,u-1.1,u+1.1,top-.15,top,[.52,.55,.52],11);
          if(k%4===0)for(const x of [u-1.04,u+1.04])box(h,m,m+.07,x,x+.065,top,top+1.1,steel,3);
        }
        for(const x of [u-1.04,u+1.04]){
          h.face(P(d+2.9,x,e+7.45),P(d+20.9,x,e+1.1),P(d+2.9,x,e+7.52),P(d+20.9,x,e+1.17),uv,steel,3);
          h.face(P(d+2.9,x,e+6.17),P(d+20.9,x,e-.18),P(d+2.9,x,e+6.34),P(d+20.9,x,e-.01),uv,steel,3);
        }
      }
    }
    // Reflective studs remain flush; no physical geometry on either racing lane.
    if(d%12===0)h.strip(d+.30,d+.39,-.035,.035,[.91,.92,.85],5,.018);
  }
  function fallback(ctx,w,h,cam,point,screen,faceScreen){
    const start=Math.floor(cam.d/8)*8;
    function patch(d,z,l,r,color,up=0){
      const p=faceScreen([point(d,l,up),point(z,l,up),point(z,r,up),point(d,r,up)]);if(p.length<3)return;
      ctx.fillStyle=color;ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.fill();
    }
    for(let i=76;i>=-2;i--){
      const d=start+i*8,z=d+8;
      patch(d,z,-220,-4.65,cam.rain?'#536251':'#68765a');patch(d,z,4.65,220,cam.rain?'#536251':'#68765a');
      patch(d,z,7.3,17,cam.rain?'#38454a':'#535956');
      for(const u of [7.49,16.79])patch(d,z,u,u+.105,'#bfc4b9',.01);
      if(d%24<8)patch(d,z,12.08,12.21,'#bdc1b8',.012);
      if(d>3360){patch(d,z,-8.45,-5.25,cam.rain?'#68716f':'#96958a',.15);patch(d,z,17.15,20,cam.rain?'#68716f':'#96958a',.15);}
    }
  }
  return {length,course,tangent,curvature,elevation,grade,ground,coverAt,hasRail,zoneAt,section,fallback};
})();

;
/* world-model.js */
/* Shared course geometry and surface model. No renderer or browser APIs. */
window.ApexWorldModel = (() => {
  'use strict';
  function create(initialCourse = 'sierra') {
    const roadHalf = 4.65, step = 4;
    const coast = window.ApexCoast, london = window.ApexLondon;
    let coastal = false, londonRoute = false, courseId = 'sierra';
    const clamp = (a,b,c) => Math.max(b,Math.min(c,a));
  function course(d) {
    if(londonRoute)return london.course(d);
    if(coastal)return coast.course(d);
    return -21*Math.cos((d-25)/81)+18*Math.sin((d+5)/127)
        -6.5*Math.cos((d-8)/47)+33*Math.sin(d/253);
  }
  function tangent(d) {
    if(londonRoute)return london.tangent(d);
    if(coastal)return coast.tangent(d);
    return 21/81*Math.sin((d-25)/81)+18/127*Math.cos((d+5)/127)
        +6.5/47*Math.sin((d-8)/47)+33/253*Math.cos(d/253);
  }
  function curvature(d) {
    if(londonRoute)return london.curvature(d);
    if(coastal)return coast.curvature(d);
    const second=21/6561*Math.cos((d-25)/81)-18/16129*Math.sin((d+5)/127)
        +6.5/2209*Math.cos((d-8)/47)-33/64009*Math.sin(d/253);
    return second/Math.pow(1+tangent(d)**2,1.5);
  }
  const roadCurve = d => clamp(curvature(d)*151,-1,1);
  const elevation = d => londonRoute?london.elevation(d):coastal?coast.elevation(d):9*Math.sin(d/198-.7)+3.1*Math.sin(d/113+.4)+1.1*Math.cos(d/61);
  const grade = d => londonRoute?london.grade(d):coastal?coast.grade(d):9/198*Math.cos(d/198-.7)+3.1/113*Math.cos(d/113+.4)-1.1/61*Math.sin(d/61);
  function smooth(a,b,x) {
    const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);
  }
  const shedStart=1860, shedEnd=1984;
  function shelterAt(d){return coastal||londonRoute?0:smooth(shedStart,shedStart+8,d)*(1-smooth(shedEnd-8,shedEnd,d));}
  // Surface water follows the same surveyed hollows in the vehicle and shader.
  function surfaceWetness(d,lateral) {
    if(coastal)d+=119.8;
    const x=lateral*roadHalf, cell=Math.floor(d/18), local=d-cell*18;
    const cx=3.15*Math.sin(cell*2.17+.74), dz=(local-9-1.5*Math.sin(cell*1.327))/(4.15+1.7*Math.cos(cell*.83));
    const dx=(x-cx+.18*Math.sin(d*1.43+x)+.14*Math.sin(d*.52-x*2))/
      (1.07+.49*Math.sin(cell*1.81+.6));
    const edge=dx*dx+dz*dz+.13*Math.sin(d*2.03+x*5.7)+.08*Math.sin(d*.97-x*8.3);
    const pool=1-smooth(.62,1.27,edge);
    const tyre=1-smooth(.13,.54,Math.abs(Math.abs(Math.abs(x)-2.32)-.76));
    const film=.54+.049*Math.sin(d*.083+x*.7)+.039*Math.sin(d*.027-x*.41)-.113*tyre;
    const outside=clamp(film+(1-film)*pool,0,1);
    const roof=shelterAt(d);
    return outside*(1-roof)+roof*(.19+.077*Math.min(Math.abs(lateral),1)+.022*Math.sin(d*.12));
  }
  function camber(d){return londonRoute?clamp(-curvature(d)*9,-.028,.028):coastal?clamp(-curvature(d)*11,-.06,.06):clamp(-curvature(d)*8.4,-.043,.043);}
  function ecology(d){
    const granite=smooth(850,1160,d)*(1-smooth(1630,1810,d));
    const ridge=smooth(2250,2650,d);
    return {granite,ridge,forest:clamp(1-granite*.86-ridge*.72,.14,1)};
  }
  function coverAt(d,lateral) {
    if(londonRoute)return london.coverAt(d,lateral);
    if(coastal)return coast.coverAt(d,lateral);
    const side=lateral<0?-1:1;
    const stands=.63+.23*Math.cos(d/140+side*.6)-rockCut(d,side)*.46;
    return clamp(stands*(.58+.28*Math.sin(d*.128+lateral*2)+.22*Math.cos(d*.274-lateral))*(.3+.7*ecology(d).forest),.04,1);
  }
  // The route alternates open granite cuts and more sheltered conifer stands.
  function rockCut(d,side) {
    return clamp((Math.sin(d/216+side*.65)+.52*Math.sin(d/81+side*1.05)-.18)*1.12,0,1);
  }
  function ground(d,u) {
    if(londonRoute)return london.ground(d,u);
    if(coastal)return coast.ground(d,u);
    const margin = Math.max(0,Math.abs(u)-roadHalf);
    const verge = Math.max(0,margin-1.8);
    const slope = (u<0 ? .145 : .072)+.113*Math.sin(d/128+u*.011)+.068*Math.cos(d/55);
    return elevation(d)+(u<0?shelterAt(d)*smooth(6.65,13,-u)*4.85:0)+camber(d)*clamp(u,-roadHalf,roadHalf)-.011*Math.min(Math.abs(u),roadHalf)-Math.min(margin,1.8)*.025
      +Math.min(verge,54)*slope+Math.min(verge,17)*rockCut(d,Math.sign(u))*.22 + Math.min(1,verge/7)*(.33*Math.sin(u*.32+d*.095)+.27*Math.cos(d*.21-u*.21));
  }
  function point(d,u,up=0) {
    const t=tangent(d), n=1/Math.hypot(1,t);
    return [course(d)+u*n,ground(d,u)+up,d-u*t*n];
  }

  const railOffset=5.58;
  function hasRail(d,side){
    // The mesh is surveyed in four metre panels. Query the same panel for
    // collision so a strict interval endpoint never creates an invisible rail.
    d=Math.floor(d/step)*step;
    if(londonRoute)return london.hasRail(d,side);
    if(coastal)return coast.hasRail(d,side);
    if(d>=shedStart-8 && d<shedEnd+8)return true;
    const block=Math.floor(d/128), local=d-block*128;
    return side<0 ? Math.abs(block)%5!==3 && local<112 : Math.abs(block)%5===2 && local<92;
  }
  function collisionRailOffset(d,side){
    if(!hasRail(d,side))return Infinity;
    if(!coastal||!coast.bridge(d))return railOffset-.095;
    // The curb is continuous. The broad pylon feet extend further inboard,
    // including the final portal which starts one metre before the bridge end.
    const local=d-coast.bridgeStart, bay=local%72;
    const portal=(local>=0&&local<=.92)||(d>=coast.bridgeEnd-1&&d<=coast.bridgeEnd-.08);
    return portal?5.205:bay<=.92?5.455:5.62;
  }

    function selectCourse(name) {
      courseId = name === 'london' && london ? 'london' : name === 'coast' && coast ? 'coast' : 'sierra';
      coastal = courseId === 'coast';
      londonRoute = courseId === 'london';
      return courseId;
    }
    selectCourse(initialCourse);
    return {selectCourse, course, tangent, curvature, roadCurve, elevation, grade,
      smooth, shelterAt, surfaceWetness, camber, ecology, coverAt, rockCut, ground,
      point, roadHalf, railOffset, hasRail, collisionRailOffset, shadeAt:coverAt,
      shedStart, shedEnd, get courseId() { return courseId; }};
  }
  return {create};
})();

;
/* environment.js */
/* Sparse, surveyed roadside details. All physical props sit outside the soft verge. */
window.ApexEnvironment = (() => {
  'use strict';

  const birdAnchors = {coast: [], sierra: []};
  const recordedAnchors = new Set();
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const noise = seed => {
    const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const uv = [[0, 0], [1, 0], [0, 1], [1, 1]];
  const tint = (color, factor) => color.map(channel => Math.min(1, channel * factor));
  const add = (point, delta) => point.map((value, index) => value + delta[index]);

  function triangle(h, a, b, c, color, material = 5) {
    h.face(a, b, c, c, uv, color, material);
  }

  function box(h, start, end, left, right, bottom, top, color, material = 5) {
    const vertex = (d, u, y) => {
      const p = h.point(d, u);
      p[1] = y;
      return p;
    };
    const a = vertex(start, left, bottom), b = vertex(end, left, bottom);
    const c = vertex(start, right, bottom), d = vertex(end, right, bottom);
    const A = vertex(start, left, top), B = vertex(end, left, top);
    const C = vertex(start, right, top), D = vertex(end, right, top);
    h.face(a, b, A, B, uv, tint(color, .77), material);
    h.face(c, d, C, D, uv, tint(color, .94), material);
    h.face(a, c, A, C, uv, tint(color, .87), material);
    h.face(b, d, B, D, uv, tint(color, .69), material);
    h.face(A, B, C, D, uv, tint(color, 1.12), material);
  }

  function fallenLog(h, d, u, length, girth, seed) {
    const across = (noise(seed) - .5) * 3.0;
    const a = h.point(d - length * .5, u - across * .5, girth * .77);
    const b = h.point(d + length * .5, u + across * .5, girth * .65);
    const delta = b.map((value, i) => value - a[i]);
    const horizontal = Math.hypot(delta[0], delta[2]);
    const side = [delta[2] / horizontal, 0, -delta[0] / horizontal];
    const rings = [];
    const sections = 5, facets = 9;
    for (let section = 0; section <= sections; section++) {
      const t = section / sections;
      const center = a.map((value, i) => value + delta[i] * t);
      const ring = [];
      for (let j = 0; j < facets; j++) {
        const angle = j * Math.PI * 2 / facets + .09 * noise(seed + section);
        const radius = girth * (1 - t * .20) * (.93 + noise(seed + j * 13) * .12);
        ring.push(add(center, [
          side[0] * Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          side[2] * Math.cos(angle) * radius
        ]));
      }
      rings.push(ring);
    }
    for (let section = 0; section < sections; section++) {
      for (let j = 0; j < facets; j++) {
        const next = (j + 1) % facets;
        const light = .65 + .28 * Math.max(0, Math.sin(j * Math.PI * 2 / facets)) + noise(seed + j * 7) * .12;
        h.face(rings[section][j], rings[section + 1][j], rings[section][next], rings[section + 1][next],
          uv, tint([.38, .31, .23], light), 5);
      }
    }
    for (const [ring, center, end] of [[rings[0], a, 0], [rings[sections], b, 1]]) {
      for (let j = 0; j < facets; j++) {
        triangle(h, center, ring[j], ring[(j + 1) % facets], tint([.55, .44, .30], .82 + noise(seed + j + end) * .19));
      }
      // A darker, irregular heartwood ring keeps the sawn end from reading as plastic.
      const capCenter = center.map((value, i) => value + delta[i] / length * (end ? .004 : -.004));
      const heart = ring.map(p => p.map((value, i) => capCenter[i] + (value - center[i]) * .47));
      for (let j = 0; j < facets; j++) triangle(h, capCenter, heart[j], heart[(j + 1) % facets], [.38, .30, .21]);
    }
    const branch = h.point(d + length * .13, u + .23, girth * 1.65);
    triangle(h, add(branch, [-.15, -.06, 0]), add(branch, [.11, -.03, .12]),
      add(branch, [.30, .54, -.19]), [.29, .25, .19]);
  }

  function retainingStone(h, d, z) {
    const setback = 10.15 + .24 * Math.sin(d / 31);
    const ground = h.point(d, setback)[1];
    const height = .67 + .47 * Math.sin((d - 1096) / 94 * Math.PI);
    for (let row = 0; row < 3; row++) {
      const top = ground + height * (row + 1) / 3;
      const bottom = ground + height * row / 3;
      const center = (d + z) * .5 + (row % 2 ? .46 : 0);
      const breaks = [d, clamp(center, d + .2, z - .2), z];
      for (let i = 0; i < 2; i++) {
        const warm = .82 + noise(d * 3 + row * 31 + i) * .24;
        box(h, breaks[i] + .025, breaks[i + 1] - .025, setback, setback + .61,
          bottom + .018, top - .018, tint([.58, .57, .51], warm), 11);
      }
    }
    if (d % 16 === 0) {
      box(h, d + .15, d + .48, setback - .22, setback + .91, ground - .12,
        ground + height + .09, [.48, .49, .44], 11);
    }
  }

  function culvert(h, d, u) {
    const floor = h.point(d, u)[1] - .11;
    const depth = 1.12;
    // A low catchment bank buries the pipe and headwall into the hillside.
    const berm = [[d - 1.43, u + .85], [d + 1.43, u + .85], [d + 1.8, u + 2.1], [d - 1.8, u + 2.1]];
    const toe = [[d - 3.4, u + .18], [d + 3.4, u + .18], [d + 3.7, u + 5.1], [d - 3.7, u + 5.1]];
    const ridge = berm.map(([station, setback]) => {const p = h.point(station, setback); p[1] = floor + 1.43; return p;});
    const foot = toe.map(([station, setback]) => h.point(station, setback, .015));
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      h.face(foot[i], foot[j], ridge[i], ridge[j], [toe[i].slice().reverse(), toe[j].slice().reverse(), berm[i].slice().reverse(), berm[j].slice().reverse()], [.57, .57, .48], 1);
    }
    h.face(ridge[0], ridge[1], ridge[3], ridge[2], [berm[0].slice().reverse(), berm[1].slice().reverse(), berm[3].slice().reverse(), berm[2].slice().reverse()], [.57, .57, .48], 1);
    const ring = (angle, radius, setback) => {
      const p = h.point(d + Math.cos(angle) * radius, u + setback);
      p[1] = floor + .68 + Math.sin(angle) * radius;
      return p;
    };
    box(h, d - 1.43, d + 1.43, u + .13, u + depth, floor - .08, floor + .18, [.45, .47, .43], 11);
    box(h, d - 1.43, d - .72, u, u + depth, floor, floor + 1.37, [.52, .53, .48], 11);
    box(h, d + .72, d + 1.43, u, u + depth, floor, floor + 1.37, [.48, .50, .45], 11);
    box(h, d - 1.48, d + 1.48, u - .03, u + depth, floor + 1.35, floor + 1.57, [.61, .61, .54], 11);
    const center = h.point(d, u + .09);
    center[1] = floor + .68;
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI * 2 / 16, b = (i + 1) * Math.PI * 2 / 16;
      h.face(ring(a, .68, 0), ring(b, .68, 0), ring(a, .47, .035), ring(b, .47, .035),
        uv, tint([.59, .60, .53], .80 + .18 * Math.max(0, Math.sin(a))), 11);
      triangle(h, center, ring(a, .47, .07), ring(b, .47, .07), [.11, .15, .14]);
    }
    // The outlet meets a short stone-lined channel on the hillside, beyond the verge.
    for (let i = 0; i < 5; i++) {
      const offset = i * .31;
      box(h, d - .61, d - .35, u - .12 - offset, u + .22 - offset,
        floor - .13 - offset * .14, floor + .09 - offset * .14, [.43, .46, .42], 15);
      box(h, d + .35, d + .61, u - .12 - offset, u + .22 - offset,
        floor - .13 - offset * .14, floor + .09 - offset * .14, [.46, .47, .42], 15);
    }
  }

  function rangerCabin(h, station, setback) {
    const start = station - 4.1, end = station + 4.1;
    const front = setback - 2.65, back = setback + 2.65;
    const corners = [[start, front], [end, front], [start, back], [end, back]];
    const floor = Math.max(...corners.map(([d, u]) => h.point(d, u)[1])) + .11;
    const eaves = floor + 2.48, ridge = eaves + 1.21;
    box(h, start - .18, end + .18, front - .16, back + .16, floor - .77, floor, [.43, .44, .39], 11);
    box(h, start, end, front, back, floor, eaves, [.43, .38, .29]);
    // Narrow vertical timber boards and shallow seams, lit as one building.
    for (let i = 0; i < 27; i++) {
      const a = start + i * (end - start) / 27;
      box(h, a + .016, a + .045, front - .027, front + .014, floor + .04, eaves - .02,
        tint([.32, .30, .23], .94 + noise(i * 13 + station) * .17));
    }
    const vertex = (d, u, height) => {
      const p = h.point(d, u);
      p[1] = height;
      return p;
    };
    h.face(vertex(start - .35, front - .42, eaves), vertex(end + .35, front - .42, eaves),
      vertex(start - .35, setback, ridge), vertex(end + .35, setback, ridge), uv, [.25, .31, .27], 5);
    h.face(vertex(start - .35, setback, ridge), vertex(end + .35, setback, ridge),
      vertex(start - .35, back + .42, eaves), vertex(end + .35, back + .42, eaves), uv, [.33, .38, .32], 5);
    for (const d of [start, end]) triangle(h, vertex(d, front, eaves), vertex(d, back, eaves),
      vertex(d, setback, ridge), [.38, .35, .27]);
    for (const endD of [start - .008, end + .008]) {
      for (let i = 0; i < 18; i++) {
        const u = front + (back - front) * i / 18;
        h.face(vertex(endD, u, floor + .03), vertex(endD, u + .022, floor + .03),
          vertex(endD, u, eaves), vertex(endD, u + .022, eaves), uv, [.31, .29, .22], 5);
      }
    }
    for (let i = 0; i < 10; i++) {
      const d = start - .35 + i * (end - start + .7) / 10;
      h.face(vertex(d, front - .42, eaves + .012), vertex(d + .034, front - .42, eaves + .012),
        vertex(d, setback, ridge + .012), vertex(d + .034, setback, ridge + .012), uv, [.38, .42, .35], 5);
    }
    const faceU = front - .046;
    const panel = (a, b, lo, hi, color, relief = 0) =>
      h.face(vertex(a, faceU - relief, lo), vertex(b, faceU - relief, lo),
        vertex(a, faceU - relief, hi), vertex(b, faceU - relief, hi), uv, color, 5);
    panel(station + .42, station + 1.65, floor + .02, floor + 2.06, [.22, .27, .23]);
    panel(station + .55, station + 1.5, floor + 1.08, floor + 1.83, [.31, .41, .39], .004);
    for (const d of [station - 2.52, station + 2.4]) {
      panel(d - .62, d + .62, floor + 1.01, floor + 1.95, [.19, .24, .22]);
      panel(d - .54, d + .54, floor + 1.09, floor + 1.87, [.35, .46, .45], .004);
      panel(d - .036, d + .036, floor + 1.07, floor + 1.90, [.65, .61, .49], .008);
      panel(d - .57, d + .57, floor + 1.46, floor + 1.51, [.62, .58, .46], .012);
    }
    box(h, station + .18, station + 1.92, front - 1.10, front - .06, floor - .20, floor + .04, [.48, .46, .37]);
    box(h, station + 2.42, station + 3.05, setback + .75, setback + 1.37, eaves, ridge + .58, [.47, .49, .44], 11);
    box(h, station + 2.31, station + 3.17, setback + .64, setback + 1.48, ridge + .55, ridge + .69, [.36, .39, .36], 11);
    // A short set-back timber boundary makes this read as an actual trailhead.
    const fenceU = front - 4.2;
    for (let i = 0; i < 6; i++) {
      const d = start - 3 + i * 2.8;
      const base = h.point(d, fenceU)[1];
      box(h, d - .065, d + .065, fenceU - .065, fenceU + .065, base, base + .94, [.35, .33, .25]);
      if (i < 5) {
        const a = h.point(d, fenceU, .65), b = h.point(d + 2.8, fenceU, .65);
        h.face(a, b, add(a, [0, .10, 0]), add(b, [0, .10, 0]), uv, [.44, .40, .29], 5);
      }
    }
  }

  function snowRemnant(h, d, u, span, seed) {
    const center = h.point(d, u, .055);
    const edge = [];
    for (let i = 0; i < 13; i++) {
      const angle = i * Math.PI * 2 / 13;
      const amount = .70 + noise(seed + i * 5) * .28;
      edge.push(h.point(d + Math.cos(angle) * span * amount, u + Math.sin(angle) * span * .43 * amount, .045));
    }
    for (let i = 0; i < edge.length; i++) triangle(h, center, edge[i], edge[(i + 1) % edge.length],
      tint([.78, .80, .75], .91 + noise(seed + i) * .08), 5);
  }

  function cairn(h, d, u, seed) {
    const center = h.point(d, u);
    let height = 0;
    for (let row = 0; row < 4; row++) {
      const r = .36 - row * .064, rise = .19 - row * .019;
      const low = [], top = [];
      for (let j = 0; j < 7; j++) {
        const angle = j * Math.PI * 2 / 7 + row * .31;
        const radius = r * (.79 + noise(seed + row * 12 + j) * .21);
        low.push(add(center, [Math.cos(angle) * radius, height, Math.sin(angle) * radius]));
        top.push(add(center, [Math.cos(angle) * radius * .78, height + rise, Math.sin(angle) * radius * .78]));
      }
      const cap = add(center, [.02, height + rise + .015, -.015]);
      for (let j = 0; j < 7; j++) {
        const next = (j + 1) % 7, color = tint([.61, .61, .54], .75 + noise(seed + row * 17 + j) * .22);
        h.face(low[j], low[next], top[j], top[next], uv, color, 15);
        triangle(h, cap, top[j], top[next], tint(color, 1.14), 15);
      }
      height += rise * .94;
    }
  }

  function graniteMass(h, d, u, length, width, height, seed) {
    // Rounded joint blocks have a buried, narrowing toe and weathered shoulders.
    // Low-frequency asymmetry carries across the rings, avoiding a ribbed cone.
    const sides = 14, base = h.point(d, u)[1], rings = [];
    const levels = [-.11, .07, .25, .47, .68, .85, .96];
    const scales = [.61, .89, 1, .94, .78, .54, .24];
    const twist = noise(seed + 1) * Math.PI * 2;
    const color = tint([.65, .65, .60], .96 + noise(seed) * .07);
    for (let level = 0; level < levels.length; level++) {
      const fraction = levels[level], scale = scales[level];
      rings.push(Array.from({length: sides}, (_, i) => {
        const angle = i * Math.PI * 2 / sides + twist + .035 * Math.sin(level + seed);
        const irregular = 1 + .105 * Math.sin(angle * 3 + seed) + .045 * Math.cos(angle * 5 - seed);
        const station = d + Math.cos(angle) * length * scale * irregular + fraction * length * .18;
        const lateral = u + Math.sin(angle) * width * scale * irregular + fraction * width * .12;
        const p = h.point(station, lateral);
        p[1] = level === 0 ? p[1] - .76
          : base + height * fraction * (1 + .055 * Math.sin(angle * 2 + seed) + .025 * Math.sin(angle * 5 + level));
        return p;
      }));
    }
    for (let level = 0; level < rings.length - 1; level++) {
      for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        const a = rings[level][i], b = rings[level][next];
        const c = rings[level + 1][i], e = rings[level + 1][next];
        // Alternate diagonals break up long planar bands; shader lighting supplies the relief.
        if ((level + i) % 2) {
          triangle(h, a, b, c, color, 15);
          triangle(h, b, e, c, color, 15);
        } else {
          triangle(h, a, b, e, color, 15);
          triangle(h, a, e, c, color, 15);
        }
      }
    }
    const cap = h.point(d + length * .20, u + width * .10);
    cap[1] = base + height;
    for (let i = 0; i < sides; i++) triangle(h, cap, rings[6][i], rings[6][(i + 1) % sides], color, 15);
  }

  function graniteOutcrop(h, d, u, seed) {
    const side = Math.sign(u), variation = .88 + noise(seed + 5) * .23;
    // A few separate large blocks nest behind a broken apron. No broad front wall.
    const blocks = [
      [-10.2, 1.7, 4.2, 3.0, 4.0], [-3.5, 3.8, 5.0, 3.8, 6.2],
      [4.7, 5.3, 4.6, 3.9, 7.1], [11.8, 3.9, 4.0, 3.1, 4.7],
      [-5.7, -1.8, 3.1, 2.7, 3.1], [1.0, -2.0, 3.7, 2.8, 4.4],
      [7.7, -1.2, 3.3, 2.4, 3.1], [15.6, .0, 2.1, 1.7, 1.9],
      [-13.4, -2.0, 1.8, 1.5, 1.5]
    ];
    blocks.forEach(([along, across, length, width, height], i) => {
      graniteMass(h, d + along * variation, u + across * side,
        length * variation, width * (.91 + noise(seed + i * 13) * .15),
        height * (.88 + noise(seed + i * 7) * .19), seed + i * 41);
    });
  }

  function addBirdAnchor(h, d, u, course, id) {
    const key = course + '/' + id;
    if (recordedAnchors.has(key)) return;
    recordedAnchors.add(key);
    const p = h.point(d, u);
    birdAnchors[course].push({id, x: p[0], y: p[1], z: p[2]});
  }

  function section(d, z, h, options) {
    if(options.courseId==='london')return;
    const coastal = options.coastal;
    if (coastal) {
      if ([440, 2152, 3952].includes(d)) addBirdAnchor(h, d, -128, 'coast', d);
      return;
    }
    if ([576, 1640, 3360].includes(d)) addBirdAnchor(h, d, -70, 'sierra', d);
    const logs = {
      244: [15.4, 7.2, .31], 788: [-14.1, 5.6, .26], 1380: [21.4, 8.2, .39],
      2852: [14.7, 6.1, .28], 3468: [-18.4, 7.6, .34]
    };
    if (logs[d]) fallenLog(h, d, ...logs[d], d);
    if (d >= 1096 && d < 1192) retainingStone(h, d, z);
    if (d === 1216) culvert(h, d, 11.4);
    if (d === 1280) graniteOutcrop(h, d, 27.2, d);
    if (d === 1424) graniteOutcrop(h, d, -32.8, d);
    if (d === 1560) graniteOutcrop(h, d, 29.5, d);
    if (d === 2468) rangerCabin(h, d, 24.5);
    if (d === 3264 || d === 3744) cairn(h, d, d === 3264 ? 16.8 : -20.5, d);
    if (d === 3400) snowRemnant(h, d, 43, 10.8, d);
    if (d === 3588) snowRemnant(h, d, -48, 7.5, d);
    if (d === 3800) snowRemnant(h, d, 35, 9.2, d);
  }

  function drawSky(ctx, w, h, cam, course, state) {
    const coastal = course === 'coast';
    const time = state.weatherTime ?? state.time ?? 0;
    const anchors = birdAnchors[course] || [];
    ctx.save();
    ctx.translate(w * .5, h * .5);
    ctx.rotate(-cam.roll);
    ctx.translate(-w * .5, -h * .5);
    for (const anchor of anchors) {
      const count = coastal ? 4 : 2;
      for (let i = 0; i < count; i++) {
        if (cam.rain && i > 1) continue;
        const seed = anchor.id + i * 13;
        const phase = time * (coastal ? .095 : .065) + i * 1.6 + seed;
        const x = anchor.x + Math.cos(phase) * (coastal ? 46 : 65) + i * 7;
        const z = anchor.z + Math.sin(phase) * 57;
        const y = anchor.y + (coastal ? 32 : 90) + Math.sin(phase * 1.7) * 3 + i * 3;
        const dx = x - cam.x, dz = z - cam.z;
        const depth = dx * cam.sin + dz * cam.cos;
        if (depth < 55 || depth > 1050) continue;
        const scale = cam.f / depth;
        const screenX = w * .5 + (dx * cam.cos - dz * cam.sin) * scale;
        const screenY = cam.horizon - (y - cam.y - cam.grade * depth) * scale;
        if (screenX < -20 || screenX > w + 20 || screenY < -20 || screenY > h * .77) continue;
        const span = clamp((coastal ? 1.38 : 1.62) * scale, .9, 9);
        const flap = Math.sin(time * (coastal ? 4.9 : 3.1) + seed);
        const glide = Math.sin(phase * .67) > -.3;
        const wingY = span * (glide ? -.12 : flap * .23);
        const bank = Math.cos(phase) * .18;
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(bank);
        ctx.globalAlpha = clamp((1050 - depth) / 280, 0, 1) * (cam.rain ? .42 : .73);
        ctx.strokeStyle = coastal ? (cam.rain ? '#c2c9c7' : '#ebe9dc') : '#3c4543';
        ctx.lineWidth = Math.max(.65, span * .13);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-span * .5, wingY);
        ctx.quadraticCurveTo(-span * .27, -span * .19, 0, span * .055);
        ctx.quadraticCurveTo(span * .27, -span * .19, span * .5, wingY);
        ctx.stroke();
        ctx.strokeStyle = coastal ? '#4d5655' : '#343e3a';
        ctx.lineWidth = Math.max(.45, span * .08);
        ctx.beginPath();
        ctx.moveTo(-span * .5, wingY);
        ctx.lineTo(-span * .39, wingY - span * .02);
        ctx.moveTo(span * .39, wingY - span * .02);
        ctx.lineTo(span * .5, wingY);
        ctx.moveTo(0, -span * .035);
        ctx.lineTo(0, span * .16);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function zoneAt(course, distance) {
    if(course==='london'&&window.ApexLondon)return window.ApexLondon.zoneAt(distance);
    const zones = course === 'coast'
      ? [[0, 'Cypress Bluffs'], [970, 'Sandstone Reach'], [1480, 'Meridian Inlet'], [2400, 'Headland Road'], [3910, 'Lighthouse Reach']]
      : [[0, 'Ponderosa Woods'], [860, 'Granite Cut'], [1620, 'Sierra Snow Shed'], [2170, 'Ranger Station'], [3150, 'High Ridge']];
    let index = 0;
    while (index + 1 < zones.length && distance >= zones[index + 1][0]) index++;
    return {id: course + '-' + index, name: zones[index][1], detail: course === 'coast' ? 'Pacific coast' : 'Sierra Nevada'};
  }

  return {section, drawSky, zoneAt};
})();

;
/* scenery.js */
/* Sierra Pass. World coordinates are metres (east, elevation, forward).
   Photographic surface maps: Asphalt 02 and Forest Ground 03 by Rob Tuytel,
   plus Rocky Terrain by Amal Kumar. Poly Haven CC0. See /a/asphalt_02, /a/forrest_ground_03 and /a/rocky_terrain at polyhaven.com. */
window.ApexWorld = (() => {
  'use strict';
  const step = 4, chunkSize = 64, tau = Math.PI * 2;
  const minD = -128, maxD = 4928;
  let coastal=false, londonRoute=false, courseId='sierra', coastArt, londonArt;
  const coast=window.ApexCoast, london=window.ApexLondon;
  const clamp = (a,b,c) => Math.max(b,Math.min(c,a));
  const frac = x => x - Math.floor(x);
  const rand = x => frac(Math.sin(x*127.1+311.7)*43758.5453);
  const model = window.ApexWorldModel.create();
  const {course, tangent, curvature, roadCurve, elevation, grade, smooth,
    shelterAt, surfaceWetness, camber, ecology, coverAt, rockCut, ground, point,
    roadHalf, railOffset, hasRail, collisionRailOffset, shedStart, shedEnd} = model;

  // Short rubber / case-contact scuffs remain fixed to the surveyed surface.
  // A bounded history is cleared on restart or stage switch, never joined across
  // a recovery teleport, and is sampled only while the sliding bike is grounded.
  const scuffs=[];
  let scuffSample=null,scuffClock=0,scuffCourse=courseId;
  function updateScuffs(s){
    const time=s.time||0,d=s.distance||0,crash=s.crash;
    if(scuffCourse!==courseId||time<scuffClock-.08||(scuffSample&&d<scuffSample.d-5)){
      scuffs.length=0;scuffSample=null;scuffCourse=courseId;
    }
    scuffClock=time;
    while(scuffs.length&&time-scuffs[0].time>32)scuffs.shift();
    if(!crash||crash.phase==='recover'||crash.roll<.32||(s.speed||0)<5){scuffSample=null;return;}
    const u=(s.lateral||0)*roadHalf+(crash.side||1)*.19*clamp(crash.roll/1.42,0,1);
    const current={d,u,time,id:s.impact?.id};
    if(Math.abs(u)>roadHalf-.18){scuffSample=null;return;}
    if(scuffSample){
      const previous=scuffSample, distance=Math.hypot(d-previous.d,u-previous.u);
      if(distance<.28)return;
      if(distance<9&&Math.abs(u-previous.u)<2.2&&time-previous.time<.24){
        const pieces=Math.max(1,Math.ceil(distance/.8));
        for(let i=0;i<pieces;i++){
          const a=i/pieces,b=(i+1)/pieces, jitter=(rand(d*13+i)-.5)*.025;
          const from=[previous.d+(d-previous.d)*a,previous.u+(u-previous.u)*a+jitter];
          const to=[previous.d+(d-previous.d)*b,previous.u+(u-previous.u)*b+jitter];
          const wet=s.weather==='rain'?surfaceWetness((from[0]+to[0])*.5,u/roadHalf):0;
          scuffs.push({a:from,b:to,time,width:.075+.045*rand(d+i),strength:(.48+.15*rand(d*3+i))*(1-wet*.48),wet});
        }
        if(scuffs.length>256)scuffs.splice(0,scuffs.length-256);
      }
    }
    scuffSample=current;
  }
  function scuffCorners(mark){
    const a=mark.a,b=mark.b,dx=b[1]-a[1],dz=b[0]-a[0],length=Math.hypot(dx,dz)||1;
    const U=mark.width*.5*dz/length,D=-mark.width*.5*dx/length;
    return [point(a[0]+D,a[1]+U,.023),point(a[0]-D,a[1]-U,.023),
      point(b[0]+D,b[1]+U,.023),point(b[0]-D,b[1]-U,.023)];
  }

  function load(name) {
    const image = new Image(), url=window.ApexAssets?.[name] || 'assets/'+name;
    let attempts=0;
    image.onerror=()=>{
      if(url.startsWith('data:') || attempts>=2)return;
      attempts++;
      setTimeout(()=>{image.src=url+(url.includes('?')?'&':'?')+'retry='+attempts;},attempts*450);
    };
    image.onload=() => { image.loaded=true; window.dispatchEvent(new Event('apex:asset')); };
    image.src=url;
    return image;
  }
  const panorama=load('sierra-panorama.webp'), storm=load('sierra-storm.webp'), pine=load('sierra-pine.webp');
  const asphalt=load('terrain-asphalt.webp'), soil=load('terrain-ground.webp'), meadow=load('terrain-meadow.webp');

  const primaryTree=()=>londonRoute?londonArt.tree:coastal?coastArt.cypress:pine;
  const skyImage=rain=>londonRoute?londonArt.panorama:coastal?(rain&&coastArt.storm.loaded?coastArt.storm:coastArt.panorama):(rain&&storm.loaded?storm:panorama);
  const alternate=[load('sierra-fir.webp'),load('sierra-brush.webp'),load('sierra-granite.webp')];
  const extraTrees=[load('coast-cypress-young.webp'),load('sierra-pine-weathered.webp')];
  const isTree=kind=>kind===0||kind===14||kind===15;
  const isBoard=kind=>kind>=8&&kind<=13;
  const floraPhoto=kind=>londonRoute&&(kind===14||kind===15)?primaryTree():kind===0?primaryTree():kind===14?(extraTrees[0].loaded?extraTrees[0]:primaryTree()):kind===15?(extraTrees[1].loaded?extraTrees[1]:pine):alternate[kind-5];
  let treeAtlas,treeVersion='';
  function treeMap(){
    const images=[primaryTree(),floraPhoto(14),floraPhoto(15)];
    const version=courseId+[primaryTree(),...extraTrees,alternate[2]].map(im=>Number(!!im?.loaded)).join('');
    if(!treeAtlas)treeAtlas=makeCanvas(2048,2048);
    if(version!==treeVersion){
      const c=treeAtlas.getContext('2d');c.clearRect(0,0,2048,2048);
      images.forEach((im,i)=>{if(im?.loaded)c.drawImage(im,(i%2)*1024+3,Math.floor(i/2)*1024+3,1018,1018)});
      c.drawImage(stoneMap(),1027,1027,1018,1018);
      treeVersion=version;
    }
    return treeAtlas;
  }
  let graniteTile,graniteReady=false;
  function stoneMap(){
    if(graniteTile&&(graniteReady||!alternate[2].loaded))return graniteTile;
    graniteTile=makeCanvas(512,512);const c=graniteTile.getContext('2d'),im=alternate[2];
    c.fillStyle='#8b8b80';c.fillRect(0,0,512,512);
    if(im.loaded){
      for(let j=0;j<2;j++)for(let i=0;i<2;i++){
        c.save();c.translate(i?512:0,j?512:0);c.scale(i?-1:1,j?-1:1);
        c.drawImage(im,im.naturalWidth*.30,im.naturalHeight*.22,im.naturalWidth*.27,im.naturalHeight*.57,0,0,256,256);c.restore();
      }
      graniteReady=true;
    }
    return graniteTile;
  }
  let biomeAtlas, biomeCount=-1;
  function biome() {
    const loaded=alternate.reduce((n,a)=>n+Number(!!a.loaded),0)+(coastal&&coastArt.panorama.loaded?10:0);
    if(!biomeAtlas)biomeAtlas=makeCanvas(2048,2048);
    if(loaded!==biomeCount){
      const c=biomeAtlas.getContext('2d');c.clearRect(0,0,2048,2048);
      alternate.forEach((im,i)=>{if(im.loaded)c.drawImage(im,i%2*1024+3,Math.floor(i/2)*1024+3,1018,1018);});
      if(coastal&&coastArt.panorama.loaded){
        // The ocean uses genuine photographed surface detail. Four mirrored
        // quadrants meet seamlessly when sampled in world-space, with animated chop.
        const im=coastArt.panorama, iw=im.naturalWidth,ih=im.naturalHeight;
        for(let j=0;j<2;j++)for(let i=0;i<2;i++){
          c.save();c.translate(i===0?0:1024,j===0?0:1024);c.scale(i?-1:1,j?-1:1);
          c.drawImage(im,iw*.147,ih*.814,iw*.228,ih*.157,0,0,512,512);c.restore();
        }
      }
      // Roadside timing boards share the free quarter of the vegetation atlas.
      ['START','S1','S2','FINISH','SHED','PORTAL'].forEach((label,i)=>{
        c.save();c.translate(1024+(i%3)*1024/3,1024+Math.floor(i/3)*512);c.scale(2/3,1);
        const x=0,y=0;
        if(londonRoute&&i>=4){
          c.fillStyle='#c2c6bb';c.fillRect(8,30,496,450);
          c.fillStyle='#174c3d';c.fillRect(14,36,484,438);
          c.strokeStyle='#e0e6d9';c.lineWidth=4;c.strokeRect(24,46,464,418);
          c.fillStyle='#f0f0df';c.textAlign='left';c.font='52px Arial';
          c.fillText(i===4?'London':'Putney',48,132);
          c.font='42px Arial';c.fillText(i===4?'Wandsworth':'Roehampton',48,197);
          c.fillStyle='#f1d66a';c.font='bold 68px Arial';c.fillText(i===4?'A3':'A306',48,286);
          c.strokeStyle='#eceddf';c.lineWidth=15;c.lineCap='square';c.beginPath();
          c.moveTo(390,395);c.lineTo(390,296);c.lineTo(i===4?390:328,258);c.stroke();
          c.fillStyle='#eceddf';c.beginPath();
          if(i===4){c.moveTo(365,278);c.lineTo(390,239);c.lineTo(415,278);}
          else {c.moveTo(323,288);c.lineTo(312,242);c.lineTo(361,253);}
          c.fill();c.font='30px Arial';c.textAlign='left';c.fillText(i===4?'NORTHBOUND':'LOCAL EXIT',48,403);
          c.restore();return;
        }
        if(i===4){
          c.fillStyle='#39382f';c.fillRect(16,46,480,420);c.fillStyle='#dec375';c.fillRect(21,51,470,410);
          c.strokeStyle='#434331';c.lineWidth=5;c.strokeRect(32,62,448,388);
          c.fillStyle='#343a32';c.textAlign='center';c.font='bold 57px sans-serif';c.fillText(coastal?'MERIDIAN':'SNOW SHED',256,171);
          c.font='bold 47px sans-serif';c.fillText(coastal?'INLET BRIDGE':'400 FT',256,264);c.fillRect(70,302,372,4);
          c.font='bold 44px sans-serif';c.fillText(coastal?'600 FEET':'LIGHTS ON',256,385);c.restore();return;
        }
        if(i===5) {
          c.fillStyle='#323e3b';c.fillRect(2,10,508,492);c.fillStyle='#9fa79b';c.fillRect(7,17,498,478);
          c.fillStyle='#254341';c.fillRect(12,25,488,462);c.fillStyle='#ede9d7';c.textAlign='center';
          c.font='bold 53px sans-serif';c.fillText(coastal?'CAPE MERIDIAN':'SIERRA PASS',256,189);c.fillRect(47,236,418,8);
          c.font='bold 56px sans-serif';c.fillText(coastal?'LIGHT STATION':'SNOW SHED 02',256,350);c.restore();return;
        }
        c.fillStyle='#363e40';c.fillRect(x+54,y+16,404,478);
        c.fillStyle='#d3d4ca';c.fillRect(x+60,y+22,392,466);
        c.fillStyle='#a34f37';c.fillRect(x+64,y+26,384,68);
        c.textAlign='center';c.font='bold 31px sans-serif';c.fillStyle='#f0eee1';c.fillText(londonRoute?'A3 LONDON':coastal?'CAPE MERIDIAN':'SIERRA PASS',x+256,y+70);
        c.fillStyle='#303939';c.font='bold '+(label.length>3 ? 84 : 140)+'px sans-serif';c.fillText(label,x+256,y+299);
        c.fillRect(x+102,y+351,308,3);c.font='bold 24px sans-serif';c.fillText('TIMING CONTROL',x+256,y+403);c.restore();
      });
      biomeCount=loaded;
    }
    return biomeAtlas;
  }
  function makeCanvas(w,h) {
    const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; return canvas;
  }
  // Generate four little roadside objects on one atlas: textured grass, sign faces, timing gate.
  function makeAtlas() {
    const a=makeCanvas(512,512), c=a.getContext('2d');
    for(let i=0;i<380;i++) {
      const x=15+rand(i+34)*221, y=239+rand(i+55)*8;
      const ht=(9+rand(i+67)*129)*(1-Math.abs(x-126)/180);
      const bent=(rand(i+94)-.5)*ht*.95;
      const color = [[107,98,61],[126,116,72],[156,139,83],[170,151,95],[97,95,62],[190,165,112]][i%6];
      c.strokeStyle='rgb('+color.join(',')+')';c.lineWidth=.7+rand(i+75)*1.9;
      c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+bent*.2,y-ht*.55,x+bent,y-ht);c.stroke();
      if(i%6===0){ c.strokeStyle='#b6a173';c.lineWidth=2;c.beginPath();c.moveTo(x+bent,y-ht);c.lineTo(x+bent-2,y-ht+ht*.14);c.stroke(); }
    }
    c.save();c.translate(384,124);c.rotate(Math.PI/4);c.fillStyle='#37372d';c.fillRect(-77,-77,154,154);
    c.fillStyle='#e9b957';c.fillRect(-74,-74,148,148);c.strokeStyle='#35362c';c.lineWidth=3;c.strokeRect(-68,-68,136,136);c.restore();
    c.strokeStyle='#2c302d';c.lineWidth=14;c.beginPath();c.moveTo(375,168);c.lineTo(375,148);c.bezierCurveTo(375,136,397,130,397,117);c.bezierCurveTo(397,107,379,100,379,91);c.stroke();
    c.fillStyle='#2c302d';c.beginPath();c.moveTo(365,98);c.lineTo(379,74);c.lineTo(393,98);c.fill();
    c.fillStyle='#d0cec1'; c.fillRect(41,283,174,220); c.strokeStyle='#434743';c.lineWidth=3;c.strokeRect(48,290,160,206);
    c.fillStyle='#353936';c.textAlign='center';c.font='bold 29px Arial';c.fillText('SPEED',128,331);c.fillText('LIMIT',128,365);c.font='bold 82px Arial';c.fillText('45',128,459);
    c.fillStyle='#e4dfc8';c.fillRect(350,282,66,197);c.fillStyle='#2e3332';c.fillRect(350,294,66,59);c.fillStyle='#e2ac50';c.fillRect(361,310,44,17);
    return a;
  }
  let atlas;
  let shape=[],chunks=[],flora=[],shedFaces=[];
  const worlds=new Map();
  const amber=[.82,.63,.29], pale=[.85,.83,.73];
  function vtx(p,uv,col,m) {shape.push(...p,...uv,...col,m);}
  function quad(a,b,c,d,uv,co,m) {
    vtx(a,uv[0],co,m);vtx(b,uv[1],co,m);vtx(c,uv[2],co,m);
    vtx(c,uv[2],co,m);vtx(b,uv[1],co,m);vtx(d,uv[3],co,m);
  }
  function strip(d,z,l,r,c,m,up=0) {
    const uv=[[l,d],[r,d],[l,z],[r,z]];
    quad(point(d,l,up),point(d,r,up),point(z,l,up),point(z,r,up),uv,c,m);
  }
  function wall(d,z,u1,h1,u2,h2,col,m=3) {
    quad(point(d,u1,h1),point(z,u1,h1),point(d,u2,h2),point(z,u2,h2),[[d,h1],[z,h1],[d,h2],[z,h2]],col,m);
  }
  function post(d,u,height,width,col) {
    const t=width*.56;
    const A=point(d-t,u-t), B=point(d-t,u+t), C=point(d+t,u-t), D=point(d+t,u+t);
    const lift=p=>[p[0],p[1]+height,p[2]];
    const uv=[[0,0],[1,0],[0,1],[1,1]];
    quad(A,B,lift(A),lift(B),uv,col,3);quad(B,D,lift(B),lift(D),uv,col.map(v=>v*.73),3);
    quad(C,A,lift(C),lift(A),uv,col.map(v=>v*1.12),3);
    quad(lift(A),lift(B),lift(C),lift(D),uv,col.map(v=>v*1.14),3);
  }
  function rail(d,z,side) {
    if(!hasRail(d,side)) return;
    const u=side*railOffset;
    post(d+.55,u+.11*side,.71,.185,[.42,.39,.33]);
    // Folded W-beam section; the alternating bands catch the low sun.
    const ridges=[[.77,0],[.748,-.055],[.704,-.095],[.657,0],[.608,-.012],[.556,-.087],[.51,0]];
    const tones=[[.75,.74,.67],[.67,.68,.65],[.38,.41,.41],[.48,.50,.50],[.69,.68,.62],[.43,.45,.45]];
    for(let j=0;j<ridges.length-1;j++){
      wall(d,z,u+side*ridges[j][1],ridges[j][0],u+side*ridges[j+1][1],ridges[j+1][0],tones[j]);
    }
    if(Math.round(d/4)%4===0) wall(d+.31,d+.53,u-side*.1,.728,u-side*.1,.65,[.83,.70,.41],5);
  }
  function shedSection(d,z) {
    const roof=u=>5.75-(u+6.5)*.054;
    const base=(m,u,ht)=>{
      const P=point(m,u);
      P[1]=elevation(m)+camber(m)*clamp(u,-roadHalf,roadHalf)+ht;
      return P;
    };
    function face(A,B,C,D,uv,color,material=11) {
      quad(A,B,C,D,uv,color,material);
      const station=(A[2]+B[2]+C[2]+D[2])*.25;
      shedFaces.push({d:station,vertices:[A,B,D,C],color,material});
    }
    // The bay follows the road grade. The sloping cap directs snow and runoff
    // towards the downhill slope; the left retaining wall disappears into the cut.
    function horizontal(m,n,left,right,height,color,material=11) {
      face(base(m,left,height(left)),base(m,right,height(right)),base(n,left,height(left)),base(n,right,height(right)),
        [[m,left],[m,right],[n,left],[n,right]],color,material);
    }
    function side(m,n,u,bot,top,color,material=11) {
      const lo=bot(u),hi=top(u);
      face(base(m,u,lo),base(n,u,lo),base(m,u,hi),base(n,u,hi),
        [[m,lo],[n,lo],[m,hi],[n,hi]],color,material);
    }
    function cross(m,left,right,bot,top,color,material=11) {
      face(base(m,left,bot(left)),base(m,right,bot(right)),base(m,left,top(left)),base(m,right,top(right)),
        [[left,bot(left)],[right,bot(right)],[left,top(left)],[right,top(right)]],color,material);
    }
    const fixed=val=>()=>val;
    const upper=u=>roof(u)+.65, beam=u=>roof(u)-.37, low=fixed(-.25);
    const concrete=[.55,.55,.515], cool=[.39,.412,.412], edge=[.63,.64,.605];
    horizontal(d,z,-7.65,7.33,upper,[.58,.59,.55]);horizontal(d,z,-6.82,7.33,roof,cool);
    side(d,z,7.33,roof,upper,edge);side(d,z,-7.65,roof,upper,concrete);
    side(d,z,-6.31,low,roof,[.48,.505,.494]);side(d,z,-6.88,low,roof,concrete);
    // Concrete edge girder and its drip course stay visible through every bay.
    side(d,z,6.54,beam,roof,concrete);side(d,z,6.05,beam,roof,[.38,.40,.39]);
    horizontal(d,z,6.05,6.54,beam,cool);side(d,z,7.36,u=>upper(u)-.10,upper,[.40,.43,.43]);
    const first=d===shedStart,last=z===shedEnd;
    if(first||last) {
      const m=first?d:z;
      cross(m,-7.65,7.33,roof,upper,[.65,.65,.60]);
      cross(m,-6.88,-6.31,low,roof,edge);
      if(first){
        const left=-2.65,right=2.65;
        face(base(m-.045,left,upper(left)-.052),base(m-.045,right,upper(right)-.052),
          base(m-.045,left,roof(left)+.065),base(m-.045,right,roof(right)+.065),
          [[.835,.754],[.997,.754],[.835,.996],[.997,.996]],[1,1,1],9);
      }
    }
    const index=Math.round((d-shedStart)/step);
    if(index%2===0||last){
      const m=last?z-.69:d, n=m+.69;
      const column=[.50,.52,.50];
      side(m,n,5.98,low,beam,cool);side(m,n,6.62,low,beam,edge);
      cross(m,5.98,6.62,low,beam,column);cross(n,5.98,6.62,low,beam,edge);
      horizontal(m,n,-6.32,6.64,beam,[.36,.385,.39]);
      cross(m,-6.32,6.64,beam,roof,[.445,.46,.45]);cross(n,-6.32,6.64,beam,roof,[.49,.51,.49]);
      // Scuffed retroreflective delineators on the leading face of each pier.
      for(const h of [.83,1.06]){
        cross(m-.023,6.08,6.52,fixed(h),fixed(h+.115),[.73,.59,.26],5);
      }
    }
    if(index%4===1){
      const m=d+1.12,n=m+1.45;
      side(m,n,-6.282,fixed(3.51),fixed(3.78),[.22,.235,.225]);
      side(m+.055,n-.055,-6.253,fixed(3.565),fixed(3.735),[.96,.817,.606],12);
    }
  }
  function addFlora(d,u,height,kind,id) {
    if(!coastal && !londonRoute && d> shedStart-4 && d<shedEnd+4 && Math.abs(u)<10.7 && kind<8)return;
    if(!coastal&&!londonRoute&&d>2459&&d<2478&&u>19.5&&u<29.5)return;
    if(coastal&&kind===0){
      height=Math.min(height*(.69+.12*rand(id+81)),Math.abs(u)<17?5.6:7.8);
      if(rand(id+308)<.66)kind=14;
    }else if(!coastal&&!londonRoute&&(kind===0||kind===5)&&rand(id+318)<.17+.61*Math.max(ecology(d).granite,ecology(d).ridge))kind=15;
    const p=point(d,u), ratio=kind===0 ? .43 : kind===1 ? 1.48 : 1;
    flora.push({d,u,p,height,ratio,kind,id,lit:.76+rand(id+72)*.28});
  }
  function landmarkFace(a,b,c,e,uv,color,material,options){
    quad(a,b,c,e,uv,color,material);
    const d=options?.groupD??(a[2]+b[2]+c[2]+e[2])*.25;
    const seaStack=coastal&&material===15&&(a[0]+b[0]+c[0]+e[0])*.25<course(d)-18;
    const underDeck=coastal&&d>coast.bridgeStart-8&&d<coast.bridgeEnd+8&&Math.max(a[1],b[1],c[1],e[1])<elevation(d)-.045;
    shedFaces.push({d,vertices:[a,b,e,c],color,material,offshore:seaStack||underDeck});
  }
  function selectCourse(name){
    const next=name==='london'&&london?'london':name==='coast'&&coast?'coast':'sierra';
    if(next===courseId)return next;
    worlds.set(courseId,{shape,chunks,flora,shedFaces});
    courseId=next;coastal=next==='coast';londonRoute=next==='london';
    model.selectCourse(next);
    const world=worlds.get(next)||{shape:[],chunks:[],flora:[],shedFaces:[]};
    ({shape,chunks,flora,shedFaces}=world);
    if(coastal&&!coastArt)coastArt={panorama:load('coast-panorama.webp'),storm:load('coast-storm.webp'),cypress:load('coast-cypress.webp')};
    if(londonRoute&&!londonArt)londonArt={panorama:load('london-panorama.webp'),tree:load('london-tree.webp')};
    biomeCount=-1;tileReady=false;tile=null;
    return next;
  }
  function buildTrack() {
    if(chunks.length) return;
    const end=londonRoute?6528:coastal?5504:maxD, helpers={point,quad,strip,face:landmarkFace,wall,post,flora:addFlora,elevation,grade,ground,roadHalf,rand,smooth};
    for(let start=minD;start<end;start+=chunkSize){
      const first=shape.length/9;
      for(let d=start;d<start+chunkSize;d+=step) {
        const z=d+step;
        if(londonRoute)london.section(d,z,helpers);
        else if(coastal){
          coast.section(d,z,helpers);
          if(d===1864||d===4500){
            post(d,6.57,2.04,.102,[.48,.49,.44]);
            addFlora(d-.13,6.57,1.26,d===1864?12:13,d);
          }
        }
        else if(d>=shedStart && d<shedEnd)shedSection(d,z);
        if(!coastal&&!londonRoute&&d===shedStart-120){post(d,6.42,2.09,.11,[.50,.49,.43]);addFlora(d-.15,6.42,1.28,12,991);}
        strip(d,z,-roadHalf,0,[1,1,1],0);strip(d,z,0,roadHalf,[1,1,1],0);
        for(const side of [-1,1]) {
          if(londonRoute){
            strip(d,z,side*4.42,side*4.535,[.87,.88,.82],2,.009);rail(d,z,side);continue;
          }
          if(coastal){
            strip(d,z,side*4.42,side*4.535,pale,2,.009);
            if(!coast.bridge(d))rail(d,z,side);
            continue;
          }
          const offsets=[4.65,5.35,6.6,8.7,12,18,28,43,72,132,268,540];
          for(let j=0;j<offsets.length-1;j++) strip(d,z,offsets[j]*side,offsets[j+1]*side,[1,1,1],1);
          strip(d,z,side*4.42,side*4.535,pale,2,.006);
          rail(d,z,side);
          const n=d/step*13+side*71;
          const zone=ecology(d),cut=Math.max(rockCut(d,side),zone.granite*.85);
          const density=clamp((.78+.17*Math.cos(d/140+side*.6)-cut*.42)*(.19+.81*zone.forest),.055,.95);
          const species=(id,far) => rand(id*.32+16)<.34+.33*Math.sin(d/197+side*.9)+(far?.12:0) ? 5 : 0;
          if(rand(n+2)<density*.83) addFlora(d+rand(n+13)*4,side*(10.8+rand(n+15)*21),5.8+rand(n+3)*8.8,species(n,false),n);
          if(rand(n+17)<density+.11) addFlora(d+rand(n+11)*4,side*(25+rand(n+19)*50),8+rand(n+3)*10,species(n+236,true),n+236);
          if(rand(n+31)<density*.85) addFlora(d+rand(n+43)*9,side*(15+rand(n+11)*30),3+rand(n+5)*8,species(n+871,false),n+871);
          if(rand(n+16)<density+.05) addFlora(d+rand(n+4)*4,side*(62+rand(n+11)*79),8+rand(n+5)*12,species(n+431,true),n+431);
          const k=n+127;
          if(rand(k+51)>.35) addFlora(d+rand(k+3)*4,side*(5.9+rand(k+41)**1.4*10),.16+rand(k+76)*.36,1,k);
          if(rand(n+9)<.39+zone.ridge*.23) addFlora(d+rand(n+2)*3,side*(6.4+rand(n+41)**1.2*19),.28+rand(n+26)*.59,6,n+51);
          if(rand(n+52)<.06+cut*.31) addFlora(d+rand(n+13)*3,side*(8.0+rand(n+62)*20),.56+rand(n+27)**2*(1.10+cut*2.7),7,n);
          if((d+128)%36===0 && !(d>=shedStart && d<shedEnd)) {
            const u=side*5.77;
            post(d,u,.79,.075,[.77,.76,.66]);
            addFlora(d,u,.56,4,n);
          }
        }
        window.ApexEnvironment?.section?.(d,z,helpers,{coastal,courseId});
        if(londonRoute){if(d%12===0)strip(d,d+3,-.065,.065,[.88,.89,.83],2,.009);}
        else {strip(d,z,-.129,-.024,amber,2,.007);strip(d,z,.024,.129,amber,2,.007);}
        if(!londonRoute&&(d+128)%184===96 && (coastal?!coast.bridge(d):!(d>=shedStart && d<shedEnd))) {
          const u=(Math.floor((d+128)/184)%3===1 ? -1 : 1)*6.64;
          post(d,u,2.43,.091,[.54,.54,.48]);
          addFlora(d-.14,u,.95,Math.floor((d+128)/184)%3===1?3:2,d);
        }
        const length=londonRoute?6000:coastal?4800:4000, second=londonRoute?2000:coastal?1600:1332,third=londonRoute?4000:coastal?3200:2664;
        if(d===0 || d===second || d===third || d===length) {
          const station=d===0?0:d===second?1:d===third?2:3;
          const line=station===0?3:station*length/3;
          const board=station===0?22:line-6;
          post(board,5.92,1.93,.10,[.52,.51,.46]);
          addFlora(board-.17,5.92,1.02,8+station,station+1011);
          for(const side of [-1,1]) {
            post(line,side*5.18,.96,.068,[.36,.36,.32]);
            wall(line-.13,line+.13,side*5.18,.99,side*5.18,.81,[.27,.29,.27],5);
          }
          strip(line,line+.12,-roadHalf,0,[.65,.64,.56],2,.009);
          strip(line,line+.12,0,roadHalf,[.65,.64,.56],2,.009);
        }
      }
      chunks.push({start,first,count:shape.length/9-first});
    }
    // Frame the start from the forest edge, with a clear sightline into the valley.
    if(!coastal&&!londonRoute){addFlora(22,-12.6,13.5,0,84);addFlora(33,18.1,14.6,0,92);}
    flora.sort((a,b)=>a.d-b.d);
  }

  const vertex = `
  attribute vec3 position; attribute vec2 uv; attribute vec3 tint; attribute float material;
  uniform vec3 eye; uniform vec3 mirrorPlane; uniform float mirrorPass; uniform vec4 camera; uniform vec4 lens; uniform float pixelAspect;
  varying vec2 texCoord; varying vec3 color; varying float kind; varying float depth; varying vec3 worldPoint;
  void main(){
    vec3 p=position-eye;
    float x=p.x*camera.x-p.z*camera.y;
    float z=p.z*camera.x+p.x*camera.y;
    if(mirrorPass>.5) p.y=2.*(mirrorPlane.x*x+mirrorPlane.y*z-mirrorPlane.z)-p.y;
    float y=p.y-camera.z*z;
    vec2 pixel=vec2(x*lens.x, y*lens.x+lens.y*z);
    vec2 rolled=vec2(camera.w*pixel.x-lens.z*pixel.y,lens.z*pixel.x+camera.w*pixel.y);
    gl_Position=vec4(rolled.x*pixelAspect,rolled.y,z*1.0004-.241,z);
    if(mirrorPass>.5 && (material<2.5||(material>13.5&&material<14.5)||(material>15.5&&material<16.5)))gl_Position=vec4(-2.,-2.,0.,1.);
    texCoord=uv; color=tint; kind=material; depth=z;worldPoint=position;
  }`;
  const fragment = `
  precision highp float;
  uniform sampler2D roadMap; uniform sampler2D earthMap; uniform sampler2D treeMap; uniform sampler2D atlasMap; uniform sampler2D meadowMap; uniform sampler2D biomeMap;
  uniform sampler2D reflectedMap; uniform sampler2D skyMap;
  uniform float isCoast; uniform float isLondon; uniform vec3 eye; uniform vec4 stormParams; uniform vec4 skyBox; uniform vec4 screenParams;
  varying vec2 texCoord; varying vec3 color; varying float kind; varying float depth; varying vec3 worldPoint;
  vec3 surfaceNormal(){
    #ifdef SURFACE_DERIVATIVES
      vec3 normal=normalize(cross(dFdx(worldPoint),dFdy(worldPoint)));
      if(dot(normal,eye-worldPoint)<0.)normal=-normal;
      return normal;
    #else
      return vec3(0.,1.,0.);
    #endif
  }
  float graniteZone(float d){return (1.-max(isCoast,isLondon))*smoothstep(850.,1160.,d)*(1.-smoothstep(1630.,1810.,d));}
  float ridgeZone(float d){return (1.-max(isCoast,isLondon))*smoothstep(2250.,2650.,d);}
  vec3 stoneSample(vec2 uv){return texture2D(treeMap,vec2(.5015)+fract(uv)*.497).rgb;}
  vec3 rockSurface(vec3 tint){
    // Triplanar mineral detail keeps vertical cuts isotropic. A horizontal
    // ground UV stretched up a wall produces implausible metre-wide stripes.
    vec3 weights=pow(abs(surfaceNormal()),vec3(4.));weights/=max(.001,weights.x+weights.y+weights.z);
    vec3 stone=stoneSample(worldPoint.yz*.29)*weights.x+
      stoneSample(worldPoint.xz*.29)*weights.y+stoneSample(worldPoint.xy*.29)*weights.z;
    float grain=texture2D(earthMap,vec2(worldPoint.x+worldPoint.z*.61,worldPoint.y+worldPoint.z*.32)*.71).r;
    float mineral=texture2D(meadowMap,worldPoint.xz*.016+worldPoint.y*.009).r;
    float seam=pow(abs(sin(worldPoint.y*.49+worldPoint.x*.037+worldPoint.z*.018+mineral*2.4)),.33);
    float fissure=1.-smoothstep(.045,.10,abs(fract(worldPoint.y*.16+worldPoint.z*.013+mineral*.18)-.5));
    vec3 granite=mix(vec3(.53,.55,.53),vec3(.79,.77,.71),smoothstep(.20,.66,stone.r));
    vec3 coastal=mix(vec3(.46,.44,.38),vec3(.68,.62,.52),smoothstep(.22,.68,stone.r));
    vec3 rock=mix(granite,coastal,isCoast);
    rock*=.78+mineral*.19+grain*.20+seam*.025-fissure*.055;
    return rock*mix(vec3(1.),tint*1.4,.68);
  }
  float shelter(float d){return (1.-max(isCoast,isLondon))*smoothstep(1860.,1868.,d)*(1.-smoothstep(1976.,1984.,d));}
  float water(vec2 pos){
    float x=pos.x,d=pos.y+isCoast*119.8,cell=floor(d/18.);
    float cx=3.15*sin(cell*2.17+.74);
    float dz=(d-cell*18.-9.-1.5*sin(cell*1.327))/(4.15+1.7*cos(cell*.83));
    float dx=(x-cx+.18*sin(d*1.43+x)+.14*sin(d*.52-x*2.))/(1.07+.49*sin(cell*1.81+.6));
    float edge=dx*dx+dz*dz+.13*sin(d*2.03+x*5.7)+.08*sin(d*.97-x*8.3);
    float pool=1.-smoothstep(.62,1.27,edge);
    float tyre=1.-smoothstep(.13,.54,abs(abs(abs(x)-2.32)-.76));
    float film=.54+.049*sin(d*.083+x*.7)+.039*sin(d*.027-x*.41)-.113*tyre;
    return mix(film+(1.-film)*pool,.19+.077*min(abs(x)/4.65,1.)+.022*sin(d*.12),shelter(d));
  }
  vec3 stormGrade(vec3 c) {
    float light=dot(c,vec3(.28,.59,.13));
    return mix(vec3(light),c,.65)*vec3(.57,.65,.72)+vec3(.023,.027,.029);
  }
  vec3 reflected(vec2 uv) {
    vec4 object=texture2D(reflectedMap,clamp(uv,vec2(.001),vec2(.999)));
    vec2 screen=vec2(uv.x,1.-uv.y);
    // Mirror the panorama about the camera's local road horizon.
    float across=screen.x-.5;
    float horizon=screenParams.z+screenParams.w*across;
    vec2 sky=vec2(screen.x,2.*horizon-screen.y);
    vec2 lookup=clamp((sky-skyBox.xy)/skyBox.zw,vec2(.002),vec2(.998));
    vec3 background=texture2D(skyMap,lookup).rgb;
    return object.rgb+background*(1.-object.a);
  }
  vec3 wetRoad(vec3 dry,float paint){
    float wet=water(texCoord);
    float pool=smoothstep(.68,.98,wet);
    vec2 coord=gl_FragCoord.xy/screenParams.xy;
    vec2 grit=vec2(texture2D(roadMap,texCoord*.51).r,texture2D(roadMap,texCoord.yx*.51+vec2(.312)).g)-vec2(.375);
    // Ripples disperse in puddles. The world-space cell and phase remain on the road.
    vec2 cell=floor(texCoord*2.5), st=fract(texCoord*2.5)-.5;
    float phase=fract(stormParams.y*1.46+sin(dot(cell,vec2(.73,2.7)))*3.15);
    float radius=length(st), edge=radius-phase*.66;
    float ring=exp(-edge*edge*450.)*sin(edge*64.)*(1.-phase)*pool;
    vec2 smear=(grit*vec2(.021,.035)*(1.-pool*.75) + ring*st*.012) *
      (.35+.65*(1.-smoothstep(18.,74.,depth)));
    vec3 ref=reflected(coord+smear);
    float grazing=pow(clamp(1.-stormParams.z/max(.8,depth),0.,1.),2.);
    float gran=grit.x*grit.y*7.+grit.x*.43;
    float spec=clamp(.045+wet*.14+grazing*.23+pool*(.35+.13*grazing)+gran*.14,0.,.87)*(1.-shelter(texCoord.y)*.54);
    vec3 diffuse=dry*mix(vec3(.45,.50,.55),vec3(.35,.41,.45),pool);
    vec3 result=mix(diffuse,ref,spec);
    return mix(result,mix(dry*vec3(.63,.69,.71),ref,.12+grazing*.2+pool*.15),paint);
  }
  void main(){
    float alpha=1.; vec3 base=color;
    if(kind<.5){
      vec3 asphalt=texture2D(roadMap,texCoord*.21).rgb;
      float patch=texture2D(roadMap,texCoord*.026+vec2(.19,.38)).r;
      float fine=texture2D(roadMap,texCoord*.83+vec2(.31,.18)).g;
      float tyre=exp(-pow((abs(texCoord.x)-2.3)*1.45,2.));
      float slab=floor(texCoord.y/29.);
      float extent=1.05+.28*sin(slab*2.13),centre=2.75*sin(slab*1.71);
      float repair=(1.-smoothstep(extent-.045,extent+.025,abs(texCoord.x-centre)))*
        (1.-smoothstep(2.3,2.42,abs(mod(texCoord.y,29.)-13.5)))*step(.32,fract(sin(slab*2.871)*41.37));
      float border=smoothstep(extent-.09,extent-.04,abs(texCoord.x-centre))*repair;
      base=asphalt*vec3(.91,.94,.98)*(.87+.18*patch-.035*tyre)+vec3(.013,.017,.023)+(fine-.40)*.045;
      base=mix(base,base*.64+vec3(.017,.020,.022),repair*.70);
      base*=1.-border*.11;
      float dust=smoothstep(4.12,4.67,abs(texCoord.x)+.08*sin(texCoord.y*1.7))*(.14+.18*patch);
      base=mix(base,vec3(.43,.39,.31),dust*(1.-stormParams.x*.6));
    }else if(kind<1.5){
      vec3 earth=texture2D(earthMap,texCoord*.185).rgb;
      float patch=texture2D(earthMap,texCoord*.029).r;
      float grass=smoothstep(5.55,12.0,abs(texCoord.x))*(.79+patch*.15);
      float gravel=texture2D(roadMap,texCoord*.35).r;
      vec3 hillside=texture2D(meadowMap,texCoord*.033+vec2(.21,.11)).rgb;
      float stony=clamp((hillside.r-hillside.g)*4.,0.,.6);
      vec3 meadow=mix(hillside*vec3(1.06,1.17,1.12),vec3(dot(hillside,vec3(.30,.56,.14)))*vec3(1.12,1.12,1.07),stony);
      vec3 shoulder=vec3(.17,.16,.14)+earth*.48+gravel*.19;
      float verge=smoothstep(5.1,11.4,abs(texCoord.x)+(patch-.51)*7.5);
      base=mix(shoulder,meadow*(.74+patch*.42)+earth*.17,verge)*(.88+patch*.24);
      if(isCoast>.5){
        float fleck=dot(earth,vec3(.33));
        vec3 grass=vec3(.30,.29,.16)+vec3(.40,.32,.16)*fleck;
        base=mix(base,mix(grass,vec3(.68,.58,.41),smoothstep(.53,.72,hillside.r)),verge*.56);
      }else if(isLondon>.5){
        base=mix(base,vec3(.27,.34,.23)+earth*.21,verge*.66);
      }else{
        float granite=graniteZone(texCoord.y),ridge=ridgeZone(texCoord.y);
        float forest=(1.-granite*.88-ridge*.66);
        vec3 duff=mix(vec3(.19,.22,.16),vec3(.39,.36,.25),patch)*(.78+gravel*.45);
        base=mix(base,duff,verge*forest*.64);
        float exposure=smoothstep(5.9,18.,abs(texCoord.x))*granite;
        base=mix(base,rockSurface(vec3(.93,.95,.96)),exposure*(.46+.44*patch));
        base=mix(base,base*vec3(1.06,1.02,.91),ridge*verge*.65);
      }
    }else if(kind<2.5){
      float grit=texture2D(roadMap,texCoord*.9).r;
      float fade=texture2D(earthMap,texCoord*.14).r;
      float wear=smoothstep(.31,.61,grit)*.46+smoothstep(.59,.77,fade)*.22;
      base=mix(color*(.8+.32*grit),vec3(.34,.35,.35),clamp(wear,0.,1.));
    }else if(kind<3.5){
      float grain=texture2D(roadMap,texCoord*vec2(.18,1.4)).r;
      base=color*(.91+.21*grain);
    }else if(kind<4.5){
      vec3 grit=texture2D(earthMap,texCoord*.69).rgb;
      float grain=texture2D(roadMap,texCoord*.28).r;
      base=color*(.62+dot(grit,vec3(.33))*.56+grain*.23);
    }else if(kind<5.5){base=color;}
    else if(kind<6.5){
      vec4 leaf=texture2D(treeMap,texCoord);
      if(leaf.a<.32) discard;
      base=leaf.rgb*color; alpha=smoothstep(.32,.8,leaf.a);
    }else if(kind<7.5){
      vec4 sprite=texture2D(atlasMap,texCoord);
      if(sprite.a<.29) discard;
      base=sprite.rgb*color; alpha=smoothstep(.29,.83,sprite.a);
    }else if(kind>8.5 && kind<9.5){
      vec4 leaf=texture2D(biomeMap,texCoord);
      if(leaf.a<.29) discard;
      base=leaf.rgb*color; alpha=smoothstep(.29,.8,leaf.a);
    }else if(kind>13.5&&kind<14.5){
      float t=stormParams.y;
      vec2 p=texCoord;
      vec2 swell=vec2(sin(p.y*.083+p.x*.055+t*.65),sin(p.x*.123-p.y*.044+t*.49));
      vec2 q=vec2(p.x*.018,p.y*.041)+swell*.036+vec2(t*.0019,-t*.006);
      vec3 wave=texture2D(biomeMap,vec2(.002)+.496*fract(q)).rgb;
      vec3 crossSea=texture2D(biomeMap,vec2(.002)+.496*fract(p*vec2(.036,.052)+vec2(.17,t*.003))).rgb;
      vec3 lit=mix(wave,crossSea,.22)*vec3(.94,1.075,1.09);
      float sheen=smoothstep(.45,.72,wave.r)*smoothstep(.27,.63,crossSea.g);
      float sun=pow(max(0.,1.-abs(gl_FragCoord.x/screenParams.x-.12)*2.),3.);
      lit+=vec3(.26,.185,.10)*sun*sheen;
      vec3 rainSea=mix(vec3(dot(lit,vec3(.29,.57,.14))),lit,.42)*vec3(.78,.88,.93);
      vec2 screen=vec2(gl_FragCoord.x/screenParams.x,1.-gl_FragCoord.y/screenParams.y);
      vec3 farSea=texture2D(skyMap,clamp((screen-skyBox.xy)/skyBox.zw,vec2(.002),vec2(.998))).rgb;
      base=mix(mix(lit,rainSea,stormParams.x),farSea,smoothstep(85.,330.,depth));
    }else if(kind>14.5&&kind<15.5){
      base=rockSurface(color);
    }else if(kind>15.5&&kind<16.5){
      float froth=texture2D(earthMap,vec2(texCoord.y*.15+stormParams.y*.017,texCoord.x*.82)).r;
      float ripple=sin(texCoord.y*.45+stormParams.y+texCoord.x*9.);
      alpha=smoothstep(.24,.65,froth+.19*ripple)*(1.-abs(texCoord.x*2.-1.))*.83;
      base=vec3(.84,.89,.83);
    }else if(kind>16.5&&kind<17.5){
      float grit=texture2D(roadMap,texCoord*vec2(4.3,.79)).r;
      float edge=1.-smoothstep(.24,.50,abs(texCoord.x-.5));
      alpha=color.r*edge*(.43+.57*smoothstep(.16,.58,grit));
      base=mix(vec3(.035,.043,.045),vec3(.08,.115,.13),color.g);
    }else if(kind>20.5){
      float row=floor(texCoord.y/.082);
      vec2 brick=vec2(texCoord.x/.245+mod(row,2.)*.5,texCoord.y/.082);
      vec2 edge=fract(brick);
      float joint=max(1.-smoothstep(.025,.065,min(edge.x,1.-edge.x)),1.-smoothstep(.035,.085,min(edge.y,1.-edge.y)));
      float variation=fract(sin(dot(floor(brick),vec2(12.9898,78.233)))*43758.5453);
      float grit=texture2D(earthMap,texCoord*2.7).r;
      base=mix(color*(.84+variation*.24+grit*.11),vec3(.49,.47,.41),joint*.61);
    }else if(kind>18.5){
      float flash=.62+.38*pow(max(0.,cos(stormParams.y*1.40)),12.);
      base=color*flash;
    }else if(kind>11.5){
      base=color;
    }else if(kind>10.5){
      float pores=texture2D(roadMap,texCoord*.72).r;
      float streak=texture2D(earthMap,vec2(texCoord.x*.24,texCoord.y*.059)).r;
      float seam=1.-smoothstep(.008,.024,min(fract(texCoord.x*.25),1.-fract(texCoord.x*.25)));
      vec2 tie=abs(fract(texCoord*vec2(.53,.79)+.21)-.5);
      float peg=(1.-smoothstep(.009,.019,length(tie)))*(1.-smoothstep(19.,46.,depth));
      base=color*(.71+pores*.47+streak*.25-seam*.115-peg*.22);
      float lightDistance=abs(mod(texCoord.x-1866.,16.)-2.);
      base+=vec3(.085,.060,.025)*exp(-lightDistance*.78-abs(texCoord.y-3.63)*1.61);
    }else{
      float shadow=kind>9.5 ? texture2D(biomeMap,texCoord).a : texture2D(treeMap,texCoord).a;
      if(shadow<.15) discard;
      base=vec3(.09,.12,.135);alpha=shadow*color.r*(1.-smoothstep(35.,210.,depth));
    }
    if((kind>.5&&kind<1.5)||(kind>3.5&&kind<4.5)||(kind>10.5&&kind<11.5)||(kind>14.5&&kind<15.5)||kind>20.5){
      vec3 normal=surfaceNormal();
      float sunny=.58+.46*max(0.,dot(normal,normalize(vec3(-.63,.73,-.27))))+.08*max(0.,normal.y);
      float overcast=.78+.22*max(0.,normal.y);
      base*=mix(sunny,overcast,stormParams.x);
    }
    if(stormParams.x>.5){
      if(kind<.5 || (kind>1.5 && kind<2.5)) base=wetRoad(base,kind>1.5 ? 1. : 0.);
      else if(kind<11.5||(kind>14.5&&kind<15.5)||kind>20.5)base=stormGrade(base);
      float mist=1.-exp(-max(depth-12.,0.)*stormParams.w);
      if(kind<13.5||kind>14.5)base=mix(base,vec3(.476,.526,.554),mist*.94);
    }else{
      float fog=1.-exp(-max(depth-28.,0.)*.0021);
      vec3 haze=mix(mix(vec3(.62,.64,.62),vec3(.68,.68,.62),isCoast),vec3(.64,.68,.68),isLondon);
      if(kind<13.5||kind>14.5)base=mix(base,haze,fog*.72);
    }
    if(kind<2.5){
      float inside=shelter(texCoord.y)*(1.-smoothstep(6.2,7.4,abs(texCoord.x)));
      float opening=smoothstep(-3.8,4.8,texCoord.x)*smoothstep(.09,.39,abs(fract((texCoord.y-1860.-texCoord.x*.62)/8.)-.5));
      float ambient=mix(.52,.72,stormParams.x)+opening*mix(.23,.075,stormParams.x);
      base*=mix(vec3(1.),vec3(ambient*.95,ambient,ambient*1.04),inside);
    }
    alpha*=1.-smoothstep(420.,620.,depth);
    if(alpha<.012) discard;
    gl_FragColor=vec4(base,alpha);
  }`;

  let renderer, failed=false;
  function startGL() {
    const canvas=makeCanvas(2,2);
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});
    if(!gl) return null;
    function compile(type,src) {
      const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
      return s;
    }
    const program=gl.createProgram();
    const derivatives=gl.getExtension('OES_standard_derivatives');
    gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,(derivatives?'#extension GL_OES_standard_derivatives : enable\n#define SURFACE_DERIVATIVES\n':'')+fragment));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const attrs=['position','uv','tint','material'].map(k=>gl.getAttribLocation(program,k));
    const unis={};
    for(const k of ['eye','camera','lens','pixelAspect','roadMap','earthMap','treeMap','atlasMap','meadowMap','biomeMap','mirrorPlane','mirrorPass','stormParams','isCoast','isLondon','skyBox','screenParams','reflectedMap','skyMap']) unis[k]=gl.getUniformLocation(program,k);
    const geometry=new Map(),fx=gl.createBuffer(),scuffBuffer=gl.createBuffer();
    function mesh(){
      let buffer=geometry.get(courseId);
      if(!buffer){
        buildTrack();buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(shape),gl.STATIC_DRAW);shape.length=0;
        geometry.set(courseId,buffer);
      }
      return buffer;
    }
    const textures=[], sources=[asphalt,soil,treeMap(),atlas||=makeAtlas(),meadow,biome()];
    const mip=gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    const done=[];let textureCourse=courseId;
    for(let i=0;i<sources.length;i++) {
      gl.activeTexture(gl.TEXTURE0+i);
      const texture=gl.createTexture();textures.push(texture);gl.bindTexture(gl.TEXTURE_2D,texture);
      const rgba=[[87,88,86,255],[135,119,92,255],[0,0,0,0],[0,0,0,0],[102,103,82,255],[0,0,0,0]][i];
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(rgba));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.uniform1i(unis[['roadMap','earthMap','treeMap','atlasMap','meadowMap','biomeMap'][i]],i);
    }
    function updateTextures(){
      if(textureCourse!==courseId){
        textureCourse=courseId;done[2]=undefined;done[5]=undefined;
      }
      for(let i=0;i<sources.length;i++) {
        if(i===2) {treeMap();if(done[i]===treeVersion)continue;}
        else if(i===5) {biome();if(done[i]===biomeCount)continue;}
        else if(done[i] || (i!==3 && !sources[i].loaded)) continue;
        const im=sources[i];
        gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]);
        let bitmap=im;
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        if(i===2 || i===3 || i===5) {
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        }else if(mip){
          gl.texParameterf(gl.TEXTURE_2D,mip.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(mip.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        }
        gl.generateMipmap(gl.TEXTURE_2D);done[i]=i===5 ? biomeCount : i===2?treeVersion:true;
      }
    }
    const reflectedTexture=gl.createTexture(), dummyTexture=gl.createTexture(), skyTexture=gl.createTexture();
    const reflectionFbo=gl.createFramebuffer(), reflectionDepth=gl.createRenderbuffer();
    let reflectedW=0,reflectedH=0,skyLoaded=null;
    function prepareSample(unit,texture,pixel){
      gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(pixel));
    }
    prepareSample(6,reflectedTexture,[0,0,0,0]);prepareSample(6,dummyTexture,[0,0,0,0]);
    prepareSample(7,skyTexture,[115,133,146,255]);
    gl.uniform1i(unis.reflectedMap,6);gl.uniform1i(unis.skyMap,7);
    function prepareSky(sky){
      if(sky.loaded&&skyLoaded!==sky){
        gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,skyTexture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sky);skyLoaded=sky;
      }
    }
    function reflectionTarget(width,height){
      const w=Math.max(80,Math.round(width*.36)),h=Math.max(48,Math.round(height*.36));
      gl.bindFramebuffer(gl.FRAMEBUFFER,reflectionFbo);
      if(w!==reflectedW||h!==reflectedH){
        reflectedW=w;reflectedH=h;
        gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,reflectedTexture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,reflectedTexture,0);
        gl.bindRenderbuffer(gl.RENDERBUFFER,reflectionDepth);
        gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,reflectionDepth);
      }
      gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,dummyTexture);
      gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    }
    function bind(buffer){
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      for(let i=0;i<4;i++){
        gl.enableVertexAttribArray(attrs[i]);gl.vertexAttribPointer(attrs[i],[3,2,3,1][i],gl.FLOAT,false,36,[0,12,20,32][i]);
      }
    }
    const pool=new Float32Array(9*6*6400);
    function sprites(cam,shadow) {
      let count=0;
      // Search range once instead of traversing the whole pass every frame.
      let lo=0,hi=flora.length;
      const far=cam.rear?cam.d+8:cam.d+(shadow?235:620), near=cam.rear?cam.d-300:cam.d-18;
      while(lo<hi){ const m=(lo+hi)>>1;if(flora[m].d<=far)lo=m+1;else hi=m; }
      function store(p,uv,light,m){
        pool[count++]=p[0];pool[count++]=p[1];pool[count++]=p[2];
        pool[count++]=uv[0];pool[count++]=uv[1];
        pool[count++]=light;pool[count++]=light;pool[count++]=light;
        pool[count++]=m;
      }
      let rearStart=0;
      if(cam.rear){let hi=lo;while(rearStart<hi){const m=(rearStart+hi)>>1;if(flora[m].d<near)rearStart=m+1;else hi=m;}}
      // Keep foliage alpha in far-to-near order in either viewing direction.
      for(let i=cam.rear?rearStart:lo-1;cam.rear?i<lo:i>=0;i+=cam.rear?1:-1){
        if(count+270>pool.length)break;
        const item=flora[i]; if(item.d<near)break;
        const kind=item.kind, delta=Math.abs(item.d-cam.d), p=item.p;
        if(!coastal && !londonRoute && shadow && item.d>shedStart-6 && item.d<shedEnd+20)continue;
        if(shadow && !isTree(kind) && kind!==5 && kind!==7 || kind===1 && delta>95 || kind===4 && delta>190 || kind===6 && delta>165)continue;
        if(kind>=5 && kind<=7 && !alternate[kind-5].loaded)continue;
        const dx=p[0]-cam.x,dz=p[2]-cam.z;
        const forward=dx*cam.sin+dz*cam.cos, across=dx*cam.cos-dz*cam.sin;
        if(forward< -item.height || Math.abs(across)>Math.max(0,forward)*cam.cone+item.height*(shadow?1.8:.61)+3)continue;
        let A,B,C,D;
        const ht=item.height;
        const photo=floraPhoto(kind);
        const ratio=photo?.loaded ? photo.naturalWidth/photo.naturalHeight : item.ratio;
        const half=ht*ratio*.5;
        let u0=0,u1=1,v0=0,v1=1;
        if(isTree(kind)){
          const cell=kind===14?1:kind===15?2:0;
          u0=(cell%2)*.5+.0015;v0=Math.floor(cell/2)*.5+.0015;u1=u0+.497;v1=v0+.497;
        }else if(kind>0) {
          const cell=kind>=5?kind-5:kind-1;
          u0=(cell%2)*.5+.001;v0=Math.floor(cell/2)*.5+.001;u1=u0+.498;v1=v0+.498;
        }
        if(isBoard(kind)) {
          const board=kind-8;
          u0=.5+board%3/6+.001;v0=.5+Math.floor(board/3)*.25+.001;u1=u0+1/6-.002;v1=v0+.248;
        }
        if(shadow) {
          const length=ht*(kind===7?.89:1.55);
          // Project the conifer silhouette away from the low western light.
          const xoff=length*.74,zoff=-length*.64;
          const wx=half*.65,wz=half*.74;
          // Subdivide to keep the shadow on the crowned road and rolling roadside bank.
          for(let j=0;j<5;j++){
            const a=j/5,b=(j+1)/5;
            const edge=(t,side) => point(item.d+zoff*t+side*wz,item.u+xoff*t+side*wx,.082);
            const left=edge(a,-1),right=edge(a,1),leftEnd=edge(b,-1),rightEnd=edge(b,1);
            const light=.36, m=isTree(kind)?8:10;
            const Vb=v1-(v1-v0)*b,Va=v1-(v1-v0)*a;
            const Auv=[u0,Vb], Buv=[u1,Vb], Cuv=[u0,Va], Duv=[u1,Va];
            store(leftEnd,Auv,light,m);store(rightEnd,Buv,light,m);store(left,Cuv,light,m);
            store(left,Cuv,light,m);store(rightEnd,Buv,light,m);store(right,Duv,light,m);
          }
          continue;
        }else{
          const raise=isBoard(kind) ? .91 : kind===2 || kind===3 ? 1.70 : kind===4 ? .51 : 0;
          const wx=half*cam.cos,wz=-half*cam.sin;
          A=[p[0]-wx,p[1]+ht+raise,p[2]-wz];B=[p[0]+wx,p[1]+ht+raise,p[2]+wz];
          C=[A[0],p[1]+raise,A[2]];D=[B[0],p[1]+raise,B[2]];
        }
        if((isTree(kind) || (kind>=5 && kind<=7)) && rand(item.id)>.5) [u0,u1]=[u1,u0];
        const back=cam.rear&&isBoard(kind);
        const light=back?.43:item.lit, m=back?5:isTree(kind)?6:kind>=5?9:7;
        const aa=[u0,v0],bb=[u1,v0],cc=[u0,v1],dd=[u1,v1];
        store(A,aa,light,m);store(B,bb,light,m);store(C,cc,light,m);
        store(C,cc,light,m);store(B,bb,light,m);store(D,dd,light,m);
      }
      if(count){bind(fx);gl.bufferData(gl.ARRAY_BUFFER,pool.subarray(0,count),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,count/9);}
      return count/9;
    }
    const scuffPool=new Float32Array(256*6*9);
    function drawScuffs(cam){
      let count=0;
      for(const mark of scuffs){
        if(cam.rear?(mark.b[0]<cam.d-165||mark.a[0]>cam.d+3):(mark.b[0]<cam.d-3||mark.a[0]>cam.d+165))continue;
        const fade=1-smooth(18,32,cam.time-mark.time),corners=scuffCorners(mark);
        const uv=[[0,mark.a[0]],[1,mark.a[0]],[0,mark.b[0]],[1,mark.b[0]]];
        for(const i of [0,1,2,2,1,3]){
          const p=corners[i],t=uv[i];
          scuffPool.set([p[0],p[1],p[2],t[0],t[1],mark.strength*fade,mark.wet,0,17],count);count+=9;
        }
      }
      if(count){
        bind(scuffBuffer);gl.bufferData(gl.ARRAY_BUFFER,scuffPool.subarray(0,count),gl.DYNAMIC_DRAW);
        gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,count/9);gl.depthMask(true);
      }
    }
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;});
    function render(cam,w,h) {
      const scale=cam.rear?1:Math.min(window.devicePixelRatio||1,1.30,1680/w,980/h);
      const width=Math.max(2,Math.round(w*scale)),height=Math.max(2,Math.round(h*scale));
      // Rear optics use a small lower-left viewport in this same context. The main
      // image has already been copied to Canvas; no full-size buffers are resized
      // or duplicated for either mirror. The next normal render restores its view.
      if(cam.rear){
        if(canvas.width<width||canvas.height<height){canvas.width=Math.max(canvas.width,width);canvas.height=Math.max(canvas.height,height);}
      }else if(canvas.width!==width || canvas.height!==height){canvas.width=width;canvas.height=height;}
      const geo=mesh();gl.uniform1f(unis.isCoast,coastal?1:0);gl.uniform1f(unis.isLondon,londonRoute?1:0);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);updateTextures();if(coastal||londonRoute||cam.rain)prepareSky(skyImage(cam.rain));
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform3f(unis.eye,cam.x,cam.y,cam.z);
      gl.uniform4f(unis.camera,cam.cos,cam.sin,cam.grade,Math.cos(cam.roll));
      gl.uniform4f(unis.lens,2*cam.f/h,1-2*cam.horizon/h,Math.sin(cam.roll),0);
      gl.uniform1f(unis.pixelAspect,h/w);
      gl.uniform3f(unis.mirrorPlane,cam.camber,cam.grade,cam.height);
      gl.uniform1f(unis.mirrorPass,0);
      gl.uniform4f(unis.stormParams,cam.rain?1:0,cam.time,cam.height,.0058+cam.fog*.005);
      const box=skyLayout(w,h,cam);
      gl.uniform4f(unis.skyBox,box.x/w,box.y/h,box.w/w,box.h/h);
      gl.uniform4f(unis.screenParams,width,height,cam.horizon/h+cam.grade*cam.f/h,-Math.tan(cam.roll)*w/h);
      const a=chunks[clamp(Math.floor((cam.d-(cam.rear?310:25)-minD)/chunkSize),0,chunks.length-1)];
      const b=chunks[clamp(Math.ceil((cam.d+(cam.rear?12:665)-minD)/chunkSize),0,chunks.length-1)];
      let reflectedSprites=0;
      if(cam.rear){gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,dummyTexture);}
      if(cam.rain&&!cam.rear){
        reflectionTarget(width,height);
        gl.uniform1f(unis.mirrorPass,1);bind(geo);
        const mid=chunks[clamp(Math.ceil((cam.d+270-minD)/chunkSize),0,chunks.length-1)];
        gl.drawArrays(gl.TRIANGLES,a.first,mid.first+mid.count-a.first);
        reflectedSprites=sprites(cam,false);
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);
        gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,reflectedTexture);
        gl.uniform1f(unis.mirrorPass,0);
      }
      bind(geo);gl.drawArrays(gl.TRIANGLES,a.first,b.first+b.count-a.first);
      drawScuffs(cam);
      if(cam.rain&&!cam.rear){bind(fx);gl.drawArrays(gl.TRIANGLES,0,reflectedSprites);}
      else {if(!cam.rear){gl.depthMask(false);sprites(cam,true);gl.depthMask(true);}sprites(cam,false);}
      return canvas;
    }
    return {render,copyRear(ctx,w,h,cam){render(cam,w,h);ctx.drawImage(canvas,0,canvas.height-h,w,h,0,0,w,h);}};
  }

  // Camera impulses use simulation age, never wall-clock time. Pausing or
  // stopping therefore cannot start a free-running shake or desynchronise rivals.
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  function makeCamera(w,h,s) {
    const d=s.distance||0, inside=s.camera==='cockpit';
    const speed=clamp((s.speed||0)/225,0,1.1);
    const normalRear=inside ? .18 : coastal||londonRoute ? 3.70 : 5.95;
    const normalHeight=inside?1.47:coastal||londonRoute?1.62:2.48;
    const crash=s.crash, fall=crash?clamp((crash.roll||0)/1.42,0,1):0;
    const eased=fall*fall*(3-2*fall), side=crash?.side===-1?-1:1;
    const impact=s.impact, age=Math.max(0,impact?.age||0), strength=clamp(impact?.severity||0,0,1);
    // One damped shoulder/helmet recoil, followed by a much smaller rebound.
    const kick=impact&&age<.82?strength*Math.exp(-age*8.8)*(Math.cos(age*22)-.23*Math.sin(age*31))*(reducedMotion?.matches ? .18 : 1):0;
    const hitSide=impact?.side===-1?-1:1;
    const scrape=clamp(impact?.scraping||0,0,1)*speed*(1-eased*.72);
    const chatter=reducedMotion?.matches?0:scrape*(Math.sin(d*15.4)*.0018+Math.sin(d*27.1)*.0011);
    const rear=normalRear+(inside?.20:.32)*eased;
    const cameraD=d-rear, normalYaw=Math.atan(tangent(d+(inside?3:5)));
    const yaw=normalYaw+hitSide*kick*(inside?.020:.009)+side*eased*(inside?.028:.012);
    const cos=Math.cos(yaw), sin=Math.sin(yaw);
    const base=point(d,(s.lateral||0)*roadHalf);
    const lean=clamp((s.leanAngle||0)/51,-1,1);
    const f=h*(inside?1.01:1.105)*(1-.06*speed);
    const height=normalHeight-(inside?1.015:.21)*eased;
    const roll=lean*(inside?.106:.027)*(1-eased)+side*(inside?(crash?.roll||0):.018*eased)+hitSide*kick*(inside?.055:.019)+chatter;
    let horizon=h*((inside?.485:.433)+.014*(s.pitch||0)*(1-eased));
    const vibrate=(Math.sin(d*1.4)*.002+Math.sin(d*.34)*.005)*speed*(s.offroad?4:1)*(1-eased*.8);
    const slide=reducedMotion?.matches?0:eased*speed*(Math.sin(d*5.1)*.0035+Math.sin(d*11.7)*.002);
    const offset=inside?side*eased*.16-hitSide*kick*.035:0;
    const surface=ground(cameraD,(s.lateral||0)*roadHalf+offset);
    const y=surface+height-.051*(s.heave||0)*(1-eased)+vibrate+slide+kick*(inside?-.027:.022);
    const viewGrade=grade(d+7)*Math.cos(yaw)+(inside?eased*.017:0);
    if(!inside){
      // The chase camera gently lowers and drifts back while retaining the
      // rider's contact point. The fallen sprite stays planted on the asphalt.
      const oldY=ground(d-normalRear,(s.lateral||0)*roadHalf)+normalHeight-.051*(s.heave||0)+vibrate;
      const oldGrade=grade(d+7)*Math.cos(normalYaw);
      horizon+=f*((base[1]-y)/rear-(base[1]-oldY)/normalRear+oldGrade-viewGrade);
    }
    return {d:cameraD,x:base[0]-sin*rear+cos*offset,y,
      z:base[2]-cos*rear-sin*offset, sin,cos,roll,yaw,grade:viewGrade,
      f,horizon,cone:(w*Math.abs(Math.cos(roll))+h*Math.abs(Math.sin(roll)))/(2*f),height,camber:camber(d),rain:s.weather==='rain',
      time:s.time||0,fog:.5+.5*Math.sin(cameraD*.005+1.2)};
  }
  function projectRival(w,h,state,rival) {
    if(!rival||!Number.isFinite(rival.distance)||!w||!h)return null;
    const cam=makeCamera(w,h,state),lat=rival.lateral||0,p=point(rival.distance,lat*roadHalf);
    const dx=p[0]-cam.x,dz=p[2]-cam.z,forward=dx*cam.sin+dz*cam.cos;
    if(forward<=.24||forward>480)return null;
    const scale=cam.f/forward, across=(dx*cam.cos-dz*cam.sin)*scale;
    const tilt=Math.sin(cam.roll),cos=Math.cos(cam.roll);
    const vertical=cam.horizon-h*.5-(p[1]-cam.y-cam.grade*forward)*scale;
    const x=w*.5+across*cos+vertical*tilt, y=h*.5-across*tilt+vertical*cos;
    if(x< -scale*.9||x>w+scale*.9||y< -scale*.25||y-1.7*scale>h)return null;
    // Ray test against the verge and road crown. A crest hides the wheels before
    // the helmet, while the chute/camera pullback permits close outside passes.
    let hidden=0;
    if(forward>19)for(let m=cam.d+6;m<rival.distance-3;m+=Math.max(5,forward/32)){
      const t=(m-cam.d)/(rival.distance-cam.d);
      const worldX=cam.x+t*dx;
      const u=(worldX-course(m))/Math.hypot(1,tangent(m));
      const land=coastal&&coast.bridge(m)&&Math.abs(u)>6.25?coast.waterLevel:ground(m,u);
      const intercept=cam.y+(land-cam.y)/t;
      hidden=Math.max(hidden,intercept-p[1]);
    }
    if(hidden>1.43)return null;
    const fog=cam.rain?(1-Math.exp(-Math.max(forward-12,0)*(.0058+cam.fog*.005)))*.94:
      (1-Math.exp(-Math.max(forward-28,0)*.0021))*.72;
    return {x,y,scale,height:1.45*scale,depth:forward,roll:-cam.roll,clipY:hidden>.09?y-hidden*scale*cos:null,
      fog,fogColor:cam.rain?'rgb(121,134,141)':londonRoute?'rgb(163,173,174)':coastal?'rgb(173,173,158)':'rgb(158,163,158)',occluded:false};
  }
  // This is a physical backwards camera, not a flipped forward frame. The mirror
  // compositor reflects the finished world + rival image exactly once.
  function makeRearCamera(w,h,state,side) {
    const d=Number.isFinite(state.distance)?state.distance:0;
    const handed=side===1?1:-1,heading=Math.atan(tangent(d));
    const yaw=heading+Math.PI-handed*.11, sin=Math.sin(yaw),cos=Math.cos(yaw);
    const lateral=(state.lateral||0)*roadHalf+handed*.52;
    const base=point(d+.12,lateral),height=1.12-.025*(state.heave||0);
    const roll=-clamp((state.leanAngle||0)/51,-1,1)*.14;
    const f=w/(2*Math.tan(.72)),horizon=h*.46;
    return {d:d+.12,x:base[0],y:base[1]+height,z:base[2],sin,cos,yaw,
      skyYaw:heading-handed*.11,grade:-grade(d-4)*Math.cos(heading),roll,f,horizon,
      cone:(w*Math.abs(Math.cos(roll))+h*Math.abs(Math.sin(roll)))/(2*f),height,
      camber:camber(d),rain:state.weather==='rain',time:state.time||0,
      fog:.5+.5*Math.sin(d*.005+1.2),rear:true};
  }
  function projectRearRival(w,h,state,rival,side=-1) {
    if(!rival||!Number.isFinite(rival.distance)||!w||!h||rival.distance>=(state.distance||0)-.20)return null;
    const cam=makeRearCamera(w,h,state,side),p=point(rival.distance,(rival.lateral||0)*roadHalf);
    const dx=p[0]-cam.x,dz=p[2]-cam.z,depth=dx*cam.sin+dz*cam.cos;
    if(depth<=.24||depth>300)return null;
    const scale=cam.f/depth,across=(dx*cam.cos-dz*cam.sin)*scale;
    const tilt=Math.sin(cam.roll),cos=Math.cos(cam.roll);
    const vertical=cam.horizon-h*.5-(p[1]-cam.y-cam.grade*depth)*scale;
    const x=w*.5+across*cos+vertical*tilt,y=h*.5-across*tilt+vertical*cos;
    if(x< -scale*.9||x>w+scale*.9||y< -scale*.25||y-1.7*scale>h)return null;
    let hidden=0;
    // Walk the actual ray backwards. A preceding crest must hide a following
    // rider just as it does in the forward view, without sampling ahead of us.
    if(depth>14)for(let m=cam.d-4;m>rival.distance+2;m-=Math.max(3,depth/32)){
      const t=(m-cam.d)/(rival.distance-cam.d),worldX=cam.x+t*dx;
      const u=(worldX-course(m))/Math.hypot(1,tangent(m));
      const land=coastal&&coast.bridge(m)&&Math.abs(u)>6.25?coast.waterLevel:ground(m,u);
      hidden=Math.max(hidden,cam.y+(land-cam.y)/t-p[1]);
    }
    if(hidden>1.43)return null;
    const fog=cam.rain?(1-Math.exp(-Math.max(depth-12,0)*(.0058+cam.fog*.005)))*.94:
      (1-Math.exp(-Math.max(depth-28,0)*.0021))*.72;
    return {x,y,scale,height:1.45*scale,depth,roll:-cam.roll,clipY:hidden>.09?y-hidden*scale*cos:null,
      fog,fogColor:cam.rain?'rgb(121,134,141)':londonRoute?'rgb(163,173,174)':coastal?'rgb(173,173,158)':'rgb(158,163,158)',occluded:false};
  }
  function drawRearFallback(ctx,w,h,cam) {
    if(!chunks.length){buildTrack();shape.length=0;}
    const low=Math.max(minD,cam.d-280),high=cam.d+3;
    const screen=p=>{
      const dx=p[0]-cam.x,dz=p[2]-cam.z,z=dx*cam.sin+dz*cam.cos;
      if(z<.24)return null;
      const scale=cam.f/z;
      return {x:w*.5+(dx*cam.cos-dz*cam.sin)*scale,y:cam.horizon-(p[1]-cam.y-cam.grade*z)*scale,z,scale};
    };
    function clip(vertices){
      const result=[],depth=p=>(p[0]-cam.x)*cam.sin+(p[2]-cam.z)*cam.cos;
      for(let i=0;i<vertices.length;i++){
        const a=vertices[i],b=vertices[(i+1)%vertices.length],za=depth(a),zb=depth(b);
        if(za>=.25)result.push(screen(a));
        if((za>=.25)!==(zb>=.25)){const t=(.25-za)/(zb-za);result.push(screen(a.map((v,k)=>v+(b[k]-v)*t)));}
      }
      return result;
    }
    function polygon(vertices,color){
      const p=clip(vertices);if(p.length<3)return;
      if(p.every(v=>v.x< -3)||p.every(v=>v.x>w+3)||p.every(v=>v.y< -3)||p.every(v=>v.y>h+3))return;
      ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
      for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);ctx.closePath();ctx.fill();
    }
    const patch=(d,z,l,r,color,up=0)=>polygon([point(d,l,up),point(d,r,up),point(z,r,up),point(z,l,up)],color);
    ctx.save();ctx.translate(w*.5,h*.5);ctx.rotate(-cam.roll);ctx.translate(-w*.5,-h*.5);
    for(let d=Math.floor(low/4)*4;d<high;d+=4){
      const z=d+4,far=Math.max(0,cam.d-d),fog=cam.rain?clamp(far/310,0,.66):clamp(far/550,0,.40);
      const road=cam.rain?52:83,shade=Math.round(road+(130-road)*fog);
      if(coastal){
        const sea=[point(d,-400),point(d,-8),point(z,-8),point(z,-400)];sea.forEach(p=>p[1]=coast.waterLevel);
        polygon(sea,cam.rain?'#536c75':'#427f89');
      }
      patch(d,z,-80,-roadHalf,cam.rain?'#657065':londonRoute?'#858b70':'#899176');
      patch(d,z,roadHalf,londonRoute?50:95,cam.rain?'#657065':londonRoute?'#858b70':'#899176');
      if(londonRoute){patch(d,z,6.6,16.0,'#626963');patch(d,z,11.16,11.29,'#c3c5b6',.02);}
      patch(d,z,-roadHalf,roadHalf,'rgb('+shade+','+(shade+3)+','+(shade+4)+')',.01);
      for(const u of[-4.47,4.47])patch(d,z,u-.055,u+.055,'#c7c9bd',.025);
      if(londonRoute){if(((Math.floor(d/4)%3)+3)%3===0)patch(d,d+3,-.065,.065,'#ccd0c5',.028);}
      else for(const u of[-.077,.077])patch(d,z,u-.045,u+.045,'#c4a46a',.027);
      for(const side of[-1,1])if(hasRail(d,side)){
        const u=side*railOffset;
        polygon([point(d,u,.56),point(z,u,.56),point(z,u,.82),point(d,u,.82)],cam.rain?'#89949a':'#aab1aa');
      }
    }
    // Low-resolution mirrors use only nearby solid faces and sparse existing
    // trees. No wet-screen readback or large texture transform per frame.
    const details=[];
    for(const face of shedFaces)if(face.d>cam.d-150&&face.d<cam.d+5&&!face.offshore)details.push(face);
    for(const f of flora){if(f.d<low)continue;if(f.d>high)break;if(isTree(f.kind)||isBoard(f.kind))details.push(f);}
    details.sort((a,b)=>a.d-b.d);
    for(const item of details){
      const distance=cam.d-item.d;ctx.globalAlpha=cam.rain?clamp(1-distance/330,.28,1):clamp(1-distance/620,.55,1);
      if(item.vertices){
        const tone=cam.rain?.68:.85;
        polygon(item.vertices,'rgb('+item.color.map(v=>Math.round(v*255*tone)).join(',')+')');
      }else{
        const p=screen(item.p);if(!p)continue;
        const height=item.height*p.scale,photo=floraPhoto(item.kind);
        const width=height*(photo?.loaded?photo.naturalWidth/photo.naturalHeight:item.ratio);
        if(p.x+width*.5<0||p.x-width*.5>w||height<.5)continue;
        if(isBoard(item.kind)){ctx.fillStyle='#667272';ctx.fillRect(p.x-width*.5,p.y-height-.91*p.scale,width,height);}
        else if(photo?.loaded)ctx.drawImage(photo,p.x-width*.5,p.y-height,width,height);
      }
    }
    ctx.globalAlpha=1;ctx.restore();
  }
  function drawRearView(ctx,w,h,state,side=-1) {
    if(!ctx||!(w>0)||!(h>0))return;
    const cam=makeRearCamera(w,h,state,side);
    backdrop(ctx,w,h,cam);
    // Rear draws never update the crash-scuff history or mutate simulation state.
    if(!renderer&&!failed){try{renderer=startGL();failed=!renderer;}catch(e){failed=true;}}
    if(renderer&&!failed)renderer.copyRear(ctx,w,h,cam);
    else drawRearFallback(ctx,w,h,cam);
  }

  function skyLayout(w,h,cam){
    const wid=Math.max(w*1.53,h*2.7), ht=londonRoute?Math.max(h*.72,Math.min(h*.87,wid*.30)):coastal?Math.max(h*.96,Math.min(h*1.12,wid*.35)):Math.max(h*.57,Math.min(h*.68,wid*.28));
    return {w:wid,h:ht,x:(w-wid)*.5-(cam.skyYaw??cam.yaw)*w*.40,y:cam.horizon+cam.grade*cam.f-ht*(londonRoute?.76:coastal?.565:.773)};
  }
  const skyCeilings=new WeakMap();
  function skyCeiling(image){
    let ceiling=skyCeilings.get(image);if(ceiling)return ceiling;
    ceiling=makeCanvas(512,128);const c=ceiling.getContext('2d');
    c.drawImage(image,0,0,image.naturalWidth,1,0,0,512,1);
    const row=c.getImageData(0,0,512,1).data,pixels=c.createImageData(512,128),mean=[0,0,0];
    for(let x=0;x<512;x++)for(let k=0;k<3;k++)mean[k]+=row[x*4+k]/512;
    for(let y=0;y<128;y++)for(let x=0;x<512;x++){
      const local=Math.pow(y/127,20),i=(y*512+x)*4;
      for(let k=0;k<3;k++)pixels.data[i+k]=mean[k]*(1-local)+row[x*4+k]*local;
      pixels.data[i+3]=255;
    }
    c.putImageData(pixels,0,0);skyCeilings.set(image,ceiling);return ceiling;
  }
  function backdrop(ctx,w,h,cam) {
    ctx.save();
    ctx.translate(w*.5,h*.5);ctx.rotate(-cam.roll);ctx.translate(-w*.5,-h*.5);
    ctx.fillStyle=cam.rain?'#8c999f':londonRoute?'#adb9bc':'#a2bbc9';ctx.fillRect(-w,-h,w*3,h*3);
    const image=skyImage(cam.rain);
    if(image.loaded) {
      const box=skyLayout(w,h,cam);
      ctx.fillStyle=cam.rain?'#7a8588':londonRoute?'#67735e':coastal?'#60898c':'#6e7563';ctx.fillRect(-w,box.y+box.h-1,w*3,h*2);
      // Continue the exact top scanline into its ambient sky colour. A fallen
      // helmet can see beyond the crop without a rectangle, stretched cloud
      // streaks, or a repeated mirrored cloud pattern at the image boundary.
      const ceiling=Math.max(w,h)*1.45;
      ctx.drawImage(skyCeiling(image),box.x,box.y-ceiling,box.w,ceiling+1);
      ctx.drawImage(image,box.x,box.y,box.w,box.h);
      if(cam.rain){
        const bank=ctx.createLinearGradient(0,cam.horizon-h*.17,0,cam.horizon+h*.14);
        bank.addColorStop(0,'rgba(128,144,154,0)');bank.addColorStop(.58,'rgba(128,144,154,'+(.18+cam.fog*.21)+')');bank.addColorStop(1,'rgba(126,139,147,.44)');
        ctx.fillStyle=bank;ctx.fillRect(-w,0,w*3,h);
      }
    } else {
      const g=ctx.createLinearGradient(0,0,0,h*.55);g.addColorStop(0,'#7da4bc');g.addColorStop(1,'#d1cbb2');
      ctx.fillStyle=g;ctx.fillRect(-w,-h,w*3,h*2);
    }
    ctx.restore();
  }

  let tile, tileReady=false;
  function groundTile(){
    if(tile && (tileReady || !asphalt.loaded || !soil.loaded || !meadow.loaded)) return tile;
    tile=makeCanvas(1024,1024);
    const c=tile.getContext('2d'), meter=1024/28;
    function tiled(im,mask,side) {
      if(!im.loaded) {c.fillStyle=mask;c.fillRect(0,0,1024,1024);return;}
      const pattern=makeCanvas(side,side);pattern.getContext('2d').drawImage(im,0,0,side,side);
      c.fillStyle=c.createPattern(pattern,'repeat');c.fillRect(0,0,1024,1024);
    }
    tiled(soil,'#95836b',192);
    c.fillStyle='rgba(69,75,51,.17)';c.fillRect(0,0,1024,1024);
    if(meadow.loaded){
      const layer=makeCanvas(1024,1024), lc=layer.getContext('2d');
      lc.drawImage(meadow,0,0,1024,1024);lc.globalCompositeOperation='destination-in';
      const mask=lc.createLinearGradient(0,0,1024,0);
      mask.addColorStop(0,'#000');mask.addColorStop(.18,'#000');mask.addColorStop(.31,'transparent');
      mask.addColorStop(.69,'transparent');mask.addColorStop(.82,'#000');mask.addColorStop(1,'#000');
      lc.fillStyle=mask;lc.fillRect(0,0,1024,1024);c.globalAlpha=.74;c.drawImage(layer,0,0);c.globalAlpha=1;
    }
    c.save();c.beginPath();c.rect(512-meter*roadHalf,0,meter*roadHalf*2,1024);c.clip();
    tiled(asphalt,'#575955',183);
    for(const u of (londonRoute?[-4.47,4.47]:[-4.47,-.077,.077,4.47])){
      c.fillStyle=Math.abs(u)>1?'rgba(223,224,212,.88)':'rgba(224,172,85,.89)';
      c.fillRect(512+u*meter-meter*.051,0,meter*.102,1024);
    }
    if(londonRoute){c.fillStyle='rgba(226,228,217,.89)';for(let y=0;y<28;y+=12)c.fillRect(512-.065*meter,y*meter,.13*meter,3*meter);}
    c.restore();tileReady=asphalt.loaded&&soil.loaded&&meadow.loaded;return tile;
  }
  const soakedImages=new WeakMap();
  const fallbackZones=new WeakMap(),rockPatterns=new WeakMap();
  function zoneTile(base,index){
    if(!index)return base;
    let tiles=fallbackZones.get(base);if(!tiles){tiles=[];fallbackZones.set(base,tiles);}
    if(tiles[index]&&(index!==2||tiles[index].stoneReady===!!alternate[2].loaded))return tiles[index];
    const out=makeCanvas(1024,1024),c=out.getContext('2d'),edge=(14-roadHalf)*1024/28;
    c.drawImage(base,0,0);c.save();c.beginPath();c.rect(0,0,edge-3,1024);c.rect(1024-edge+3,0,edge,1024);c.clip();
    if(index===2&&alternate[2].loaded){c.globalAlpha=.72;c.drawImage(stoneMap(),0,0,1024,1024);c.globalAlpha=1;}
    c.globalCompositeOperation='multiply';c.fillStyle=index===1?'#b0b9a0':index===2?'#d8d9d1':'#e2d6b8';c.fillRect(0,0,1024,1024);c.restore();
    out.stoneReady=!!alternate[2].loaded;return tiles[index]=out;
  }
  let reflectedCanvas;
  function soaked(image) {
    if(!image)return image;
    if(soakedImages.has(image))return soakedImages.get(image);
    const c=makeCanvas(image.naturalWidth||image.width,image.naturalHeight||image.height), out=c.getContext('2d');
    out.filter='saturate(.58) brightness(.64)';out.drawImage(image,0,0,c.width,c.height);
    out.filter='none';out.globalCompositeOperation='source-atop';out.fillStyle='rgba(55,76,89,.12)';out.fillRect(0,0,c.width,c.height);
    soakedImages.set(image,c);return c;
  }
  function fallbackGlints(ctx,w,h,cam,lanes) {
    if(!reflectedCanvas)reflectedCanvas=makeCanvas(320,180);
    const mirror=reflectedCanvas, m=mirror.getContext('2d');
    const rx=mirror.width/w,ry=mirror.height/h;
    // Reflection scanlines are expressed in the unbanked road view. Undo the
    // helmet roll on the captured source before sampling them, avoiding a second
    // tilted ghost of the guardrail across the pavement during a ground slide.
    m.clearRect(0,0,mirror.width,mirror.height);m.save();m.scale(rx,ry);
    m.translate(w*.5,h*.5);m.rotate(cam.roll);m.translate(-w*.5,-h*.5);
    m.drawImage(ctx.canvas,0,0,w,h);m.restore();
    const horizon=cam.horizon+cam.grade*cam.f;
    for(const row of lanes){
      const dx=row.x-roadHalf*row.scale, rw=2*roadHalf*row.scale;
      const sy=clamp((2*horizon-row.y)*ry,0,mirror.height-2);
      function glint(x,width,alpha){
        const start=clamp(x,0,w-.05), stop=clamp(x+width,0,w);
        if(stop-start<.09)return;
        ctx.globalAlpha=alpha;
        ctx.drawImage(mirror,start*rx,sy,(stop-start)*rx,1.25,start,row.y,stop-start,row.h);
      }
      glint(dx,rw,(.13+.14*smooth(6,55,row.z))*(1-.64*shelterAt(row.d)));
      const cell=Math.floor(row.d/18),cx=3.15*Math.sin(cell*2.17+.74);
      const wet=surfaceWetness(row.d,cx/roadHalf);
      if(wet>.69) {
        const half=(.46+.66*(wet-.69)/.31)*row.scale;
        glint(row.x+cx*row.scale-half,half*2,.3*(wet-.69)/.31);
      }
    }
    ctx.globalAlpha=1;
  }

  function drawFallback(ctx,w,h,cam) {
    if(!chunks.length){buildTrack();shape.length=0;}
    const atlasImage=atlas||=makeAtlas(), baseTile=groundTile();
    const roadImages=[0,1,2,3].map(i=>{const tile=zoneTile(baseTile,i);return cam.rain?soaked(tile):tile;});
    const lanes=[];
    function screen(p){
      const dx=p[0]-cam.x,dz=p[2]-cam.z,z=dx*cam.sin+dz*cam.cos;
      if(z<=.12) return null;
      const scale=cam.f/z;
      return {x:w*.5+(dx*cam.cos-dz*cam.sin)*scale,y:cam.horizon-(p[1]-cam.y-cam.grade*z)*scale,scale,z};
    }
    ctx.save();ctx.translate(w*.5,h*.5);ctx.rotate(-cam.roll);ctx.translate(-w*.5,-h*.5);
    const extend=Math.max(4,(Math.abs(Math.sin(cam.roll))*w+Math.abs(Math.cos(cam.roll))*h-h)*.5+8);
    const extendX=Math.max(4,(Math.abs(Math.cos(cam.roll))*w+Math.abs(Math.sin(cam.roll))*h-w)*.5+8);
    if(londonRoute)london.fallback(ctx,w,h,cam,point,screen,faceScreen);
    else if(coastal)coast.fallback(ctx,w,h,cam,point,screen,faceScreen,shedFaces,meadow);
    let previous=null, previousZ=0;
    const rows=Math.max(100,Math.round((h-cam.horizon+2*extend)*.8));
    const nearest=Math.max(.13,cam.f*cam.height/(h+extend-cam.horizon)*.8);
    for(let i=0;i<=rows;i++){
      const z=1/(1/615+(1/nearest-1/615)*i/rows);
      const atD=cam.d+z;
      const zone=coastal||londonRoute?null:ecology(atD),roadImage=roadImages[coastal||londonRoute?0:zone.granite>.42?2:zone.ridge>.52?3:1];
      const a=screen(point(atD,0));
      if(!a) continue;
      if(previous && a.y>=previous.y-.01 && previous.y<h+extend){
        const sourceY=frac(atD/28)*1024;
        const tileWidth=a.scale*28;
        const lineHeight=Math.max(1,a.y-previous.y+.7);
        const sourceHeight=clamp((previousZ-z)*1024/28,1,1024-sourceY);
        if(cam.rain)lanes.push({x:a.x,y:previous.y,h:lineHeight,scale:a.scale,z,d:atD});
        if(londonRoute){
          const left=5.25,right=5.14;
          ctx.drawImage(roadImage,(14-left)*1024/28,sourceY,(left+right)*1024/28,sourceHeight,a.x-a.scale*left,previous.y,a.scale*(left+right),lineHeight);
        }else if(coastal){
          const onBridge=coast.bridge(atD),left=onBridge?6.24:coast.verge(atD),right=onBridge?6.24:10;
          ctx.drawImage(roadImage,(14-left)*1024/28,sourceY,(left+right)*1024/28,sourceHeight,a.x-a.scale*left,previous.y,a.scale*(left+right),lineHeight);
        }else ctx.drawImage(roadImage,0,sourceY,1024,sourceHeight,a.x-tileWidth*.5,previous.y,tileWidth,lineHeight);
        for(const side of (coastal||londonRoute?[]:[-1,1])){
          let x=side>0?a.x+tileWidth*.5:a.x-tileWidth*.5;
          const piece=tileWidth*.27;
          if(piece<.2)continue;
          for(let j=0;j<40 && (side>0 ? x<w+extendX : x> -extendX);j++,x+=piece*side) {
            ctx.drawImage(roadImage,side>0?748:0,sourceY,276,sourceHeight,side>0?x:x-piece,previous.y,piece+.5,lineHeight);
          }
        }
        const cover=shelterAt(atD);
        if(cover>.001){
          ctx.fillStyle='rgba(13,23,30,'+(cover*(cam.rain?.28:.42))+')';
          ctx.fillRect(a.x-a.scale*6.25,previous.y,a.scale*12.55,lineHeight);
        }
      }
      previous=a;previousZ=z;
      if(a.y>h+extend)break;
    }
    for(const mark of scuffs){
      if(mark.b[0]<cam.d-1||mark.a[0]>cam.d+120)continue;
      const p=scuffCorners(mark).map(screen);
      if(p.some(v=>!v))continue;
      ctx.globalAlpha=mark.strength*(1-smooth(18,32,cam.time-mark.time))*.76;
      ctx.fillStyle=cam.rain?'#1a272c':'#101517';ctx.beginPath();
      for(const [j,i]of [0,1,3,2].entries())j?ctx.lineTo(p[i].x,p[i].y):ctx.moveTo(p[i].x,p[i].y);
      ctx.closePath();ctx.fill();
    }
    ctx.globalAlpha=1;
    const scenery=[];
    // Clip concrete panels against the near plane so the overhead slab continues
    // all the way over the rider even with the camera inside a bay.
    function faceScreen(vertices){
      const result=[];
      function viewZ(p){return (p[0]-cam.x)*cam.sin+(p[2]-cam.z)*cam.cos;}
      for(let i=0;i<vertices.length;i++){
        const A=vertices[i],B=vertices[(i+1)%vertices.length];
        const za=viewZ(A),zb=viewZ(B);
        if(za>=.32)result.push(screen(A));
        if((za>=.32)!==(zb>=.32)){
          const t=(.32-za)/(zb-za);
          result.push(screen(A.map((v,n)=>v+(B[n]-v)*t)));
        }
      }
      return result;
    }
    for(const face of shedFaces)if(!face.offshore && face.d>cam.d-8 && face.d<cam.d+470)scenery.push(face);
    for(let d=Math.floor((cam.d-8)/step)*step;d<cam.d+300;d+=step){
      for(const side of [-1,1]) {
        if(!hasRail(d,side)||(coastal&&coast.bridge(d)))continue;
        const a=screen(point(d,side*railOffset,.72)),b=screen(point(d+step,side*railOffset,.72));
        if(a&&b)scenery.push({d,rail:[a,b]});
      }
    }
    for(const f of flora) {
      if(f.d<cam.d-8)continue;
      if(f.d>cam.d+500)break;
      if(f.kind===1 && f.d>cam.d+70 || coastal&&f.kind===7&&f.u< -7.7)continue;
      scenery.push(f);
    }
    scenery.sort((a,b)=>b.d-a.d||(londonRoute?Number(a.material===5)-Number(b.material===5):0));
    for(const item of scenery){
      if(cam.rain)ctx.globalAlpha=clamp(1-.73*smooth(24,410,item.d-cam.d),.25,1);
      if(item.vertices){
        const proj=faceScreen(item.vertices);
        if(proj.length<3)continue;
        const isLamp=item.material===12||item.material===19;
        const c=item.material===9?[.18,.27,.25]:item.color;
        const A=item.vertices[0],B=item.vertices[1],C=item.vertices[2],u=B.map((v,i)=>v-A[i]),v=C.map((v,i)=>v-A[i]);
        let N=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...N)||1;
        N=N.map(n=>n/len);if(N[0]*(cam.x-A[0])+N[1]*(cam.y-A[1])+N[2]*(cam.z-A[2])<0)N=N.map(n=>-n);
        const lighting=isLamp?1:cam.rain?.78+.22*Math.max(0,N[1]):.58+.46*Math.max(0,-N[0]*.63+N[1]*.73-N[2]*.27)+.08*Math.max(0,N[1]);
        const channels=c.map((v,i)=>Math.round(255*v*lighting*(cam.rain&&!isLamp?[.64,.70,.76][i]:1)));
        ctx.fillStyle='rgb('+channels.join(',')+')';ctx.beginPath();ctx.moveTo(proj[0].x,proj[0].y);
        for(let i=1;i<proj.length;i++)ctx.lineTo(proj[i].x,proj[i].y);ctx.closePath();ctx.fill();
        if(item.material===15&&alternate[2].loaded&&proj.length===4){
          let pattern=rockPatterns.get(ctx);if(!pattern){pattern=ctx.createPattern(stoneMap(),'repeat');rockPatterns.set(ctx,pattern);}
          const dominant=Math.abs(N[1])>Math.max(Math.abs(N[0]),Math.abs(N[2]))?1:Math.abs(N[0])>Math.abs(N[2])?0:2;
          const texture=p=>(dominant===0?[p[1],p[2]]:dominant===1?[p[0],p[2]]:[p[0],p[1]]).map(v=>v*.29*512);
          const t=texture(A),b=texture(B),e=texture(C),ux=b[0]-t[0],uy=b[1]-t[1],vx=e[0]-t[0],vy=e[1]-t[1],det=ux*vy-vx*uy;
          if(Math.abs(det)>.01){
            const dx=proj[1].x-proj[0].x,dy=proj[1].y-proj[0].y,ex=proj[2].x-proj[0].x,ey=proj[2].y-proj[0].y;
            const a=(dx*vy-ex*uy)/det,b=(dy*vy-ey*uy)/det,c=(ex*ux-dx*vx)/det,d=(ey*ux-dy*vx)/det;
            pattern.setTransform(new DOMMatrix([a,b,c,d,proj[0].x-a*t[0]-c*t[1],proj[0].y-b*t[0]-d*t[1]]));
            ctx.save();ctx.globalAlpha*=.28;ctx.fillStyle=pattern;ctx.fill();ctx.restore();
          }
        }
        if(item.material===11){ctx.strokeStyle='rgba(43,51,50,.14)';ctx.lineWidth=.65;ctx.stroke();}
        if(item.material===9){
          const X=proj.reduce((n,v)=>n+v.x,0)/proj.length,Y=proj.reduce((n,v)=>n+v.y,0)/proj.length;
          ctx.fillStyle='#dddccc';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 '+Math.max(1,proj[0].scale*.29)+'px sans-serif';ctx.fillText(londonRoute?'A3 LONDON':coastal?'CAPE MERIDIAN':'SNOW SHED 02',X,Y);
        }
        continue;
      }
      if(item.rail){
        const [a,b]=item.rail;
        ctx.fillStyle=cam.rain?'#626e73':'#757871';ctx.fillRect(a.x-.07*a.scale,a.y,.14*a.scale,.72*a.scale);
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(b.x,b.y+.20*b.scale);ctx.lineTo(a.x,a.y+.20*a.scale);ctx.fill();
        ctx.strokeStyle=cam.rain?'#9ca7aa':'#c1bdad';ctx.lineWidth=Math.max(.6,a.scale*.045);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();continue;
      }
      const p=screen(item.p);if(!p)continue;
      const ht=item.height*p.scale;
      const photo=floraPhoto(item.kind);
      const ratio=photo?.loaded ? photo.naturalWidth/photo.naturalHeight : item.ratio;
      const wd=ht*ratio;
      if(p.x+wd*.5< -extendX || p.x-wd*.5>w+extendX)continue;
      if(isBoard(item.kind)) {
        const board=item.kind-8;
        ctx.drawImage(biome(),1024+(board%3)*1024/3,1024+Math.floor(board/3)*512,1024/3,512,p.x-wd*.5,p.y-ht-.91*p.scale,wd,ht);
      }else if(isTree(item.kind) || item.kind>=5) {
        if(photo?.loaded)ctx.drawImage(cam.rain?soaked(photo):photo,p.x-wd*.5,p.y-ht,wd,ht);
      }else {
        const cell=item.kind-1,raise=item.kind===2||item.kind===3?1.7:item.kind===4?.51:0;
        ctx.drawImage(cam.rain?soaked(atlasImage):atlasImage,cell%2*256,Math.floor(cell/2)*256,256,256,p.x-wd*.5,p.y-ht-raise*p.scale,wd,ht);
      }
    }
    ctx.globalAlpha=1;
    if(cam.rain){
      fallbackGlints(ctx,w,h,cam,lanes);
      const fog=ctx.createLinearGradient(0,cam.horizon-h*.1,0,cam.horizon+h*.3);
      fog.addColorStop(0,'rgba(119,134,142,0)');fog.addColorStop(.28,'rgba(119,134,142,.32)');fog.addColorStop(1,'rgba(119,134,142,0)');
      ctx.fillStyle=fog;ctx.fillRect(-w,cam.horizon-h*.14,w*3,h*.5);
    }
    ctx.restore();
  }
  function draw(ctx,w,h,state) {
    if(!w||!h)return;
    updateScuffs(state);
    const cam=makeCamera(w,h,state);
    backdrop(ctx,w,h,cam);
    window.ApexEnvironment?.drawSky?.(ctx,w,h,cam,courseId,state);
    if(!renderer&&!failed){try{renderer=startGL();failed=!renderer;}catch(e){console.warn('3D terrain fallback',e);failed=true;}}
    if(renderer&&!failed){ctx.drawImage(renderer.render(cam,w,h),0,0,w,h);}
    else drawFallback(ctx,w,h,cam);
  }
  return {draw,drawRearView,projectRearRival,selectCourse,projectRival,elevation,roadCurve,curvature,grade,roadHalf,hasRail,railOffset,collisionRailOffset,surfaceWetness,shelterAt,coverAt,shadeAt:coverAt};
})();

;
/* rider-weather.js */
(() => {
  'use strict';
  const clamp = (x, low, high) => Math.min(high, Math.max(low, x));
  const fract = x => x - Math.floor(x);
  const noise = x => fract(Math.sin(x * 47.617 + 2.36) * 43758.537);
  const phaseTime = s => s.weatherTime ?? s.time ?? 0;
  const wet = s => s.weather === 'rain' ? clamp(s.wetness ?? .85, 0, 1) : 0;
  const canopy = s => window.ApexWorld?.coverAt?.(s.distance || 0, s.lateral || 0) || 0;

  const shelter = s => window.ApexWorld?.shelterAt?.(s.distance || 0) || 0;

  function relight(image) {
    // Blue light from a cloud deck fills the shadows and removes the direct warm rim.
    const c = document.createElement('canvas');
    c.width = image.width; c.height = image.height;
    const p = c.getContext('2d');
    p.drawImage(image, 0, 0);
    p.globalCompositeOperation = 'source-atop';
    p.fillStyle = 'rgba(29,48,62,.16)';
    p.fillRect(0, 0, c.width, c.height);
    try {
      const pixels = p.getImageData(0, 0, c.width, c.height);
      const rgba = pixels.data;
      for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i + 3] === 0) continue;
        const r = rgba[i], g = rgba[i+1], b = rgba[i+2];
        const l = .24*r + .64*g + .12*b;
        rgba[i] = r*.73 + l*.12;
        rgba[i+1] = g*.83 + l*.10;
        rgba[i+2] = b*.85 + l*.16 + 2;
      }
      p.putImageData(pixels, 0, 0);
    } catch (error) { if (error.name !== 'SecurityError') throw error; }
    return c;
  }

  const particles = Array.from({length: 148}, (_, i) => ({
    x: noise(i + 1), y: noise(i + 191), z: noise(i + 353),
    drift: noise(i + 477), weight: noise(i + 631)
  }));
  const mist = document.createElement('canvas');
  mist.width = mist.height = 48;
  {
    const p = mist.getContext('2d');
    const fade = p.createRadialGradient(24, 24, 1, 24, 24, 24);
    fade.addColorStop(0, 'rgba(190,204,208,.63)');
    fade.addColorStop(.45, 'rgba(174,192,199,.32)');
    fade.addColorStop(1, 'rgba(161,180,188,0)');
    p.fillStyle = fade;
    p.fillRect(0, 0, 48, 48);
  }

  function spray(g, h, s, front) {
    const velocity = clamp(((s.speed || 0) - 8) / 108, 0, 1);
    const flow = Math.sqrt(wet(s) * velocity) * (1 - .33*shelter(s));
    if (flow <= 0) return;
    const t = phaseTime(s), traveled = (s.distance || 0) / 21;
    const slip = clamp(s.slip || 0, 0, 1);
    const lean = s.lean || 0;
    g.save();
    for (let i = front ? 0 : 9; i < (front ? 9 : 44); i++) {
      const p = particles[i];
      const age = fract(traveled * (.59 + p.drift * .6) + t * .5 + p.z);
      const side = i & 1 ? -1 : 1;
      const reach = Math.sqrt(velocity) * (.7 + .3*wet(s)) * (1 + slip * .34);
      const spread = .041 + age * (.12 + p.x * .47) * reach;
      const x = h * (side * spread - lean * age * age * .15);
      // Air entrains the spray behind the tire before it falls back toward the road.
      const y = h * (age * (.018 + p.y * .19) - Math.sin(age * Math.PI) * (.01 + p.drift * .125) * reach);
      const fade = Math.sin(Math.PI * age) * flow;
      const r = h * (.009 + age * (.045 + p.weight * .085));
      g.globalAlpha = fade * (front ? .28 : .48);
      g.drawImage(mist, x - r, y - r*.51, r*2, r*1.02);
      if (!front && i % 3 === 0) {
        g.globalAlpha = fade * .36;
        g.strokeStyle = '#d2dce0';
        g.lineWidth = Math.max(.5, h * .0024);
        g.beginPath(); g.moveTo(x,y);
        g.lineTo(x + side * h * .011, y + h * (.002 + age*.006)); g.stroke();
      }
    }
    g.restore();
  }

  function reflection(g, width, height, angle, image, brake, s) {
    const wetness = wet(s);
    if (wetness === 0 || !image || s.offroad) return;
    const t = phaseTime(s);
    const length = height * .27;
    g.save();
    g.rotate(-angle * .09);
    // Uneven wet asphalt breaks the mirrored silhouette into short, shifting bands.
    for (let i = 0; i < 17; i++) {
      const a = i / 17, b = (i + 1) / 17;
      const sy = (1 - b) * image.height;
      const wobble = Math.sin(i*2.37 + t*.74 + s.distance*.095) * height * (.0014 + a*.005);
      g.globalAlpha = wetness * (.05 + .23 * (1-a)**2) * (.68+.32*noise(i+7));
      g.save(); g.translate(wobble + Math.sin(angle)*height*a*.47, length*b);
      g.scale(1, -1);
      g.drawImage(image, 0, sy, image.width, image.height / 17,
        -width*.5, 0, width, length/17 + .5);
      g.restore();
    }
    g.globalCompositeOperation = 'screen';
    g.fillStyle = '#fb503c';
    for (let i = 0; i < 15; i++) {
      const u = i / 14;
      const line = width * (.036 + .085 * noise(i+21)) * (1 - u*.39);
      const x = Math.sin(angle) * height * (.025 + .13*u) +
        Math.sin(i*4.2+t*.55+s.distance*.091) * width*(.004+u*.014);
      g.globalAlpha = wetness * (.038 + .22*brake) * (1-u*.67) * (.4+.6*noise(i+14));
      g.fillRect(x-line*.5, height*(.017+.187*u*u), line, Math.max(.45,height*(.001+.003*noise(i))));
    }
    g.restore();
  }

  function rain(g, w, h, s) {
    if (s.weather !== 'rain') return;
    const rainAmount = (.66 + .34*wet(s)) * (1 - shelter(s));
    if (rainAmount < .015) return;
    const t = phaseTime(s);
    const d = s.distance || 0, speed = (s.speed || 0) / 3.6;
    const cockpit = s.camera === 'cockpit';
    const roll = (s.lean || 0) * (cockpit ? -.106 : -.027);
    const horizon = h * ((cockpit ? .485 : .433) + (s.pitch || 0) * .014);
    const f = h * .93, widthMeters = Math.max(50, w / f * 29);
    const cover = canopy(s);
    g.save();
    g.translate(w*.5, horizon);
    g.rotate(roll);
    g.lineCap = 'round';
    for (let layer = 0; layer < 3; layer++) {
      g.strokeStyle = 'rgba(218,232,237,' + ((.17+.085*layer)*rainAmount*(1-.5*cover)) + ')';
      g.lineWidth = Math.max(.56, h * (.00085+.00033*layer));
      g.beginPath();
      for (let i = layer; i < particles.length; i += 3) {
        const p = particles[i];
        const zRange = layer === 2 ? 12 : layer === 1 ? 20 : 29;
        const z = 2.1 + fract(p.z - d / zRange) * zRange;
        const wind = -.8 - p.drift;
        const fall = 6 + p.weight * 3.7;
        const x = (fract(p.x + t*wind/widthMeters) - .5) * widthMeters;
        const y = (fract(p.y + t*fall/21) - .59) * 21;
        const sx = f*x/z, sy = f*y/z;
        if (Math.abs(sx) > w*.57 || sy < -h*.68 || sy > h*.68) continue;
        const exposure = .014 + p.weight * .006;
        const previousZ = z + speed * exposure;
        let dx = sx - f * (x-wind*exposure) / previousZ;
        let dy = sy - f * (y-fall*exposure) / previousZ;
        const shorten = Math.min(1, h*.055 / Math.max(1, Math.hypot(dx,dy)));
        dx *= shorten; dy *= shorten;
        g.moveTo(sx-dx, sy-dy); g.lineTo(sx,sy);
      }
      g.stroke();
    }
    g.restore();
  }

  const refraction = document.createElement('canvas');
  const lens = refraction.getContext('2d');
  const birthCycles = new Float64Array(30).fill(-Infinity);
  const adhered = new Uint8Array(30);
  let previousVisorTime = -1;
  function visor(g, w, h, s) {
    if (s.camera !== 'cockpit' || s.weather !== 'rain') return;
    const t = phaseTime(s), airflow = clamp((s.speed || 0)/155, 0, 1);
    const sampleWidth = Math.min(450, Math.round(w*.5));
    const sampleHeight = Math.max(1, Math.round(sampleWidth*h/w));
    if (refraction.width !== sampleWidth || refraction.height !== sampleHeight) {
      refraction.width = sampleWidth; refraction.height = sampleHeight;
    }
    // Sample the current frame once; each little convex lens bends a different patch of the live scene.
    lens.drawImage(g.canvas, 0, 0, sampleWidth, sampleHeight);
    const overhead = shelter(s);
    if (t < previousVisorTime) birthCycles.fill(-Infinity);
    previousVisorTime = t;
    g.save();
    for (let i = 0; i < 30; i++) {
      const p = particles[i+81];
      const cycle = t / (2.4 + 4.8*p.weight) + p.drift;
      const age = fract(cycle), seed = i*37 + Math.floor(cycle)*11;
      const startX = noise(seed+11), startY = .045+.90*noise(seed+19);
      if (birthCycles[i] !== Math.floor(cycle)) {
        birthCycles[i] = Math.floor(cycle);
        // Keep existing beads flowing under a roof. New impacts resume progressively on exit.
        adhered[i] = noise(seed+93) >= overhead ? 1 : 0;
      }
      if (!adhered[i]) continue;
      const growth = clamp(age*11, 0, 1) * clamp((1-age)*9, 0, 1);
      const run = Math.max(0, age - .23);
      // Gravity draws a parked bead downward. Airflow draws the moving rider's beads up and outward.
      const velocityX = (startX-.48)*airflow*.56 - .012 - (s.lean || 0)*.021;
      const velocityY = .18*(1-airflow) - airflow*(.14 + .17*(1-startY));
      const x = w*(startX + velocityX*run*run);
      const y = h*(startY + velocityY*run*run);
      if (x < 0 || x > w || y < 0 || y > h) continue;
      const r = Math.max(.65, h * (.0018 + .0089*p.weight*p.weight) * growth);
      if (r < .7) continue;
      const rx = r*(.9 + .14*p.z), ry = r*(1.04 + run*.31);
      g.globalAlpha = (.68 + .32*wet(s)) * (.61 + .29*p.y) * growth;
      if (age > .36 && r > 1.5) {
        const past = Math.max(0, run - .15);
        g.strokeStyle = 'rgba(206,224,231,.20)';
        g.lineWidth = Math.max(.45,r*.21);
        g.beginPath(); g.moveTo(w*(startX+velocityX*past*past),h*(startY+velocityY*past*past));
        g.quadraticCurveTo(x-r*.27, y-velocityY*h*.025, x,y); g.stroke();
      }
      g.save(); g.translate(x,y);
      g.rotate((startX-.5)*.3-(s.lean || 0)*.1);
      g.beginPath(); g.ellipse(0,0,rx,ry,0,0,Math.PI*2); g.clip();
      const spread = Math.max(5.5, r*4.6);
      const sx = clamp((x-spread)*sampleWidth/w, 0, sampleWidth-.1);
      const sy = clamp((y-spread)*sampleHeight/h, 0, sampleHeight-.1);
      g.scale(1,-1);
      g.drawImage(refraction, sx, sy, Math.min(2*spread*sampleWidth/w,sampleWidth-sx),
        Math.min(2*spread*sampleHeight/h,sampleHeight-sy), -rx,-ry,rx*2,ry*2);
      g.scale(1,-1);
      const rim = g.createRadialGradient(-rx*.2,-ry*.18,r*.22,0,0,Math.max(rx,ry));
      rim.addColorStop(0,'rgba(229,240,245,.04)');
      rim.addColorStop(.7,'rgba(22,34,44,.10)');
      rim.addColorStop(1,'rgba(17,30,39,.46)');
      g.fillStyle = rim; g.fillRect(-rx,-ry,2*rx,2*ry);
      g.strokeStyle = 'rgba(232,244,249,.64)'; g.lineWidth = Math.max(.5,r*.18);
      g.beginPath(); g.ellipse(0,ry*.05,rx*.73,ry*.76,0,.63,1.85); g.stroke();
      g.restore();
    }
    g.restore();
  }

  window.ApexRiderWeather = { relight, wet, canopy, shelter, reflection, spray, rain, visor };
})();

;
/* collision-fx.js */
(() => {
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
  const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  const partsCache=new WeakMap(), outlineCache=new WeakMap(), cockpitCache=new WeakMap();

  function response(s) {
    const hit=s.impact;
    const age=Math.max(0,hit?.age||0), strength=clamp(hit?.severity||0);
    // A short steering impulse followed by a decaying countersteer, never random shake.
    const kick=hit ? (hit.side||1)*strength*Math.exp(-age*5.4)*Math.cos(age*22) : 0;
    const c=s.crash, roll=c ? clamp(Math.abs(c.roll||0),0,1.52) : 0;
    const down=smooth(.22,1.40,roll), ground=smooth(.72,1.18,roll);
    return {kick,roll,down,ground,side:c?.side||hit?.side||1,
      recovering:c?.phase==='recover',age:c?.age||0};
  }

  function canvas(w,h) {
    const c=document.createElement('canvas');c.width=w;c.height=h;return c;
  }

  // Photo masks follow the rider's jacket, thighs and boots; the tail unit and
  // swingarm remain on the motorcycle. They are created once, only on a crash.
  function parts(photo,kind) {
    let cached=partsCache.get(photo);
    if(cached?.kind===kind)return cached;
    const w=photo.width,h=photo.height, rider=canvas(w,h), bike=canvas(w,h);
    const p=rider.getContext('2d');p.drawImage(photo,0,0);p.globalCompositeOperation='destination-in';
    p.scale(w,h);p.fillStyle='#fff';p.beginPath();
    const hero=kind==='hero', crown=hero?.294:.324;
    // Full upper body, with a notch for the pointed rear fairing.
    p.moveTo(0,0);p.lineTo(1,0);p.lineTo(1,hero?.39:.35);
    p.lineTo(.76,hero?.365:.35);p.lineTo(.66,hero?.315:.345);
    p.lineTo(.56,crown);p.lineTo(.50,hero?.299:.326);p.lineTo(.44,crown);
    p.lineTo(.34,hero?.315:.345);p.lineTo(.24,hero?.365:.35);p.lineTo(0,hero?.39:.35);p.closePath();
    const legs=hero ? [
      [[.34,.30],[.41,.318],[.344,.36],[.314,.405],[.333,.482],[.317,.55],[.278,.627],[.27,.665],[.223,.676],[.193,.657],[.21,.602],[.218,.571],[.198,.506],[.178,.45],[.182,.406],[.245,.346]],
      [[.66,.30],[.59,.318],[.656,.36],[.686,.405],[.667,.482],[.683,.55],[.722,.627],[.73,.665],[.777,.676],[.807,.657],[.79,.602],[.782,.571],[.802,.506],[.822,.45],[.818,.406],[.755,.346]]
    ] : [
      [[.28,.32],[.37,.34],[.31,.39],[.29,.44],[.30,.49],[.28,.55],[.27,.60],[.24,.65],[.20,.661],[.17,.643],[.18,.59],[.20,.54],[.18,.47],[.15,.41],[.18,.36]],
      [[.72,.32],[.63,.34],[.69,.39],[.71,.44],[.70,.49],[.72,.55],[.73,.60],[.76,.65],[.80,.661],[.83,.643],[.82,.59],[.80,.54],[.82,.47],[.85,.41],[.82,.36]]
    ];
    for(const poly of legs){p.moveTo(...poly[0]);for(const v of poly.slice(1))p.lineTo(...v);p.closePath();}
    p.fill();
    const b=bike.getContext('2d');b.drawImage(photo,0,0);b.globalCompositeOperation='destination-out';b.drawImage(rider,0,0);
    cached={kind,rider,bike};partsCache.set(photo,cached);return cached;
  }

  function outline(photo) {
    if(outlineCache.has(photo))return outlineCache.get(photo);
    const h=120,w=Math.max(20,Math.round(h*photo.width/photo.height));
    const c=canvas(w,h),p=c.getContext('2d',{willReadFrequently:true});p.drawImage(photo,0,0,w,h);
    let points=[];
    try {
      const d=p.getImageData(0,0,w,h).data;
      for(let y=0;y<h;y++){
        let lo=w,hi=-1;
        for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>96){lo=Math.min(lo,x);hi=x;}
        if(hi>=0){points.push([lo/w,y/h]);points.push([(hi+1)/w,(y+1)/h]);}
      }
    } catch(e) {points=[[.2,.2],[.8,.2],[.25,.8],[.75,.8],[.5,1]];}
    outlineCache.set(photo,points);return points;
  }

  function pose(photo,axle,roll,flatten=1) {
    const ratio=photo.width/photo.height,co=Math.cos(roll),si=Math.sin(roll);
    const a=co,b=si*flatten,c=-si,d=co*flatten;
    let low=-Infinity,contactX=0,minX=Infinity,maxX=-Infinity;
    for(const [u,v] of outline(photo)){
      const x=(u-axle)*ratio,y=v-1,py=b*x+d*y,px=a*x+c*y;
      minX=Math.min(minX,px);maxX=Math.max(maxX,px);
      if(py>low){low=py;contactX=px;}
    }
    return {a,b,c,d,low:Number.isFinite(low)?low:0,contactX,minX,maxX};
  }

  function applyPose(g,photo,height,axle,p,dx,dy) {
    g.transform(p.a,p.b,p.c,p.d,dx,dy-p.low*height);
    g.drawImage(photo,-axle*height*photo.width/photo.height,-height,height*photo.width/photo.height,height);
  }

  function footprint(g,x,y,radius,alpha) {
    g.save();g.translate(x,y);g.scale(radius,Math.max(1,radius*.17));
    const sh=g.createRadialGradient(0,0,0,0,0,1);sh.addColorStop(0,'rgba(7,12,17,'+alpha+')');sh.addColorStop(1,'rgba(7,12,17,0)');
    g.fillStyle=sh;g.fillRect(-1,-1,2,2);g.restore();
  }

  // Origin is the wheel's projected ground point, with camera roll already applied.
  function fallen(g,photo,height,state,{axle=.5,kind='hero',shade=0,fog=0,fogColor='#a5adb1'}={}) {
    const q=response(state),set=parts(photo,kind),side=q.side;
    const separation=smooth(.82,1.38,q.roll)*height*.24;
    const bikeAngle=side*q.roll,bodyAngle=side*(q.roll*.91+q.ground*.14);
    const bikePose=pose(set.bike,axle,bikeAngle,1-q.ground*.20);
    const bodyPose=pose(set.rider,axle,bodyAngle,1-q.ground*.28);
    let bodyX=side*separation;
    const bodyY=height*.035*q.ground;
    // Before ground contact both parts share one pivot, preserving the original silhouette.
    const attachedLow=Math.max(bikePose.low,bodyPose.low);
    const ungrounded=1-q.ground;
    bikePose.low=bikePose.low*q.ground+attachedLow*ungrounded;
    bodyPose.low=bodyPose.low*q.ground+attachedLow*ungrounded;
    // The physics capsule represents the bike, while the released rider extends
    // beyond it. Keep that visual envelope on the inside face of an adjacent rail.
    const world=window.ApexWorld,roadHalf=world?.roadHalf||4.65;
    const metre=height/1.45,position=(state.lateral||0)*roadHalf;
    let inboard=0;
    for(const edge of [-1,1]){
      const rail=world?.collisionRailOffset?.(state.distance,edge);
      if(!Number.isFinite(rail))continue;
      const bound=(edge*rail-position)*metre-edge*height*.025;
      const extent=edge<0?Math.min(bikePose.minX*height,bodyX+bodyPose.minX*height):Math.max(bikePose.maxX*height,bodyX+bodyPose.maxX*height);
      if(edge<0&&extent<bound)inboard=Math.max(inboard,bound-extent);
      if(edge>0&&extent>bound)inboard=Math.min(inboard,bound-extent);
    }
    g.save();g.translate(inboard*q.down,0);
    footprint(g,bikePose.contactX*height,0,height*(.10+.18*q.down),.53);
    footprint(g,bodyX+bodyPose.contactX*height,bodyY,height*(.08+.14*q.down),.38*q.ground);
    for(const [im,p,dx,dy] of [[set.bike,bikePose,0,0],[set.rider,bodyPose,bodyX,bodyY]]){
      g.save();applyPose(g,im,height,axle,p,dx,dy);g.restore();
      if(shade+fog>.025){
        // Source-atop would affect the road too; use cached alpha masks of each component.
        const tint=tinted(im,fog>.02?fogColor:'#1d2930');
        g.save();g.globalAlpha=clamp(shade+fog*.82,0,.87);applyPose(g,tint,height,axle,p,dx,dy);g.restore();
      }
    }
    contact(g,height,state,bikePose.contactX*height,0,q.ground);
    g.restore();
    return {x:bikePose.contactX*height,y:0};
  }

  const tintCache=new WeakMap();
  function tinted(im,color) {
    const previous=tintCache.get(im);if(previous?.color===color)return previous.image;
    const c=canvas(im.width,im.height),p=c.getContext('2d');p.drawImage(im,0,0);p.globalCompositeOperation='source-in';p.fillStyle=color;p.fillRect(0,0,c.width,c.height);
    tintCache.set(im,{color,image:c});return c;
  }

  // Only hard parts against the road/rail emit sparks. Rider-to-rider bumps do not.
  function contact(g,height,state,x=0,y=0,ground=0) {
    const q=response(state),hit=state.impact,wet=state.weather==='rain'?clamp(state.wetness??.8):0;
    const speed=clamp((state.speed||0)/150),rail=hit?.type==='rail' ? clamp(hit.scraping||0)*Math.exp(-Math.max(0,hit.age-.12)*5) : 0;
    const active=q.recovering?0:Math.max(ground,rail*.6);
    if(active<.04||speed<.035||height<8)return;
    const age=state.crash?.age ?? hit?.age ?? 0,id=hit?.id||1;
    const count=Math.round((9+speed*13)*active),metal=(1-wet*.78)*speed*active;
    g.save();g.translate(x,y);
    if(!state.crash){g.translate(q.side*height*.16,-height*.29);}
    for(let i=0;i<count;i++){
      const cycle=age*(3.8+noise(i+31)*3)+noise(i+id),life=cycle-Math.floor(cycle);
      const spread=(noise(i*3+id)-.5),length=height*(.016+.13*speed)*life;
      const px=spread*length*1.8-q.side*length*.35;
      const py=length*(.35+noise(i+8)*.50)-height*.035*Math.sin(life*Math.PI);
      const alpha=(1-life)**2*active;
      const spark=i%4===0 && metal>.06;
      g.globalAlpha=alpha*(spark?.72:.38);
      g.strokeStyle=spark?'#ffc185':wet?'#d3e0e2':'#716b62';
      g.lineWidth=Math.max(.45,height*(spark?.0032:.0026));
      g.beginPath();g.moveTo(px,py);g.lineTo(px-spread*height*.018*speed,py-height*(spark?.017:.006)*speed);g.stroke();
    }
    g.restore();
  }

  function cockpitLayers(photo) {
    if(cockpitCache.has(photo))return cockpitCache.get(photo);
    const w=photo.width,h=photo.height,body=canvas(w,h),hands=canvas(w,h),p=hands.getContext('2d');
    p.drawImage(photo,0,0);p.globalCompositeOperation='destination-in';p.scale(w,h);p.beginPath();
    for(const side of [-1,1]){
      const points=[[0,.68],[.035,.622],[.116,.608],[.185,.625],[.20,.704],[.168,.81],[.15,1],[0,1]];
      for(let i=0;i<points.length;i++){const [x,y]=points[i],u=side<0?x:1-x;i?p.lineTo(u,y):p.moveTo(u,y);}
      p.closePath();
    }
    p.fill();const b=body.getContext('2d');b.drawImage(photo,0,0);b.globalCompositeOperation='destination-out';b.drawImage(hands,0,0);
    const result={body,hands,bodyShade:tinted(body,'#20303b'),handsShade:tinted(hands,'#20303b')};cockpitCache.set(photo,result);return result;
  }

  window.ApexCollisionFX={response,fallen,contact,cockpitLayers};
})();

;
/* rivals.js */
(() => {
  'use strict';

  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const roster = {
    silva: { file: 'amber', color: [237,165,45], axle: .499, lamp: [.506,.402], hips: .351 },
    park: { file: 'teal', color: [27,187,171], axle: .492, lamp: [.502,.385], hips: .344 },
    moreau: { file: 'blue', color: [84,123,224], axle: .488, lamp: [.498,.386], hips: .35 }
  };
  const art = new Map(), substitutes = new Map();
  let loading = false;

  function bitmap(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  function reduce(im, height) {
    const c = bitmap(height * im.width / im.height, height);
    const p = c.getContext('2d');
    p.imageSmoothingQuality = 'high';
    p.drawImage(im, 0, 0, c.width, c.height);
    return c;
  }

  function mask(im, color) {
    const c = reduce(im, 160), p = c.getContext('2d');
    p.globalCompositeOperation = 'source-in';
    p.fillStyle = color;
    p.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function recolor(im, color) {
    const c = reduce(im, 350), p = c.getContext('2d');
    try {
      const image = p.getImageData(0,0,c.width,c.height), pixels = image.data;
      for (let i=0; i<pixels.length; i+=4) {
        const r=pixels[i], g=pixels[i+1], b=pixels[i+2];
        const chroma=r-Math.max(g,b), red=clamp((chroma-9)/32,0,1);
        if (red <= 0 || pixels[i+3] === 0) continue;
        const light=.88*r/255, spec=Math.min(r,g,b)*.48;
        for (let ch=0;ch<3;ch++) pixels[i+ch] = pixels[i+ch]*(1-red)+(color[ch]*light+spec)*red;
      }
      p.putImageData(image,0,0);
    } catch (e) { if (e.name !== 'SecurityError') throw e; }
    return c;
  }

  function prepare(im, geometry) {
    const dry = reduce(im, Math.min(640, im.height));
    const wet = window.ApexRiderWeather?.relight(dry) || dry;
    return {
      dry, wet,
      drySmall: reduce(dry,108), wetSmall: reduce(wet,108),
      shadow: mask(dry,'#172128'),
      haze: { clear: null, rain: null },
      axle: geometry.axle, lamp: geometry.lamp, hips: geometry.hips
    };
  }

  function load(name, ready) {
    const img = new Image();
    img.decoding = 'async';
    let retries = 0;
    const url = window.ApexAssets?.[name] || 'assets/'+name;
    img.onload = () => {
      ready(img);
      window.dispatchEvent(new Event('apex:asset'));
    };
    img.onerror = () => {
      if (retries >= 2 || /^(blob|data):/.test(url)) return;
      retries++;
      setTimeout(() => {
        const next = new URL(url, document.baseURI);
        next.searchParams.set('retry', String(retries));
        img.src = next.href;
      }, 650*retries);
    };
    img.src = url;
  }

  function requestArt() {
    if (loading) return;
    loading = true;
    for (const [id, team] of Object.entries(roster)) {
      load('coast-rival-'+team.file+'.webp', im => {
        art.set(id, prepare(im,team));
        substitutes.delete(id);
      });
    }
    load('sierra-rider.webp', original => {
      for (const [id, team] of Object.entries(roster)) {
        if (!art.has(id)) substitutes.set(id,prepare(recolor(original,team.color),
          { axle:.50, lamp:[.50,.378], hips:.49 }));
      }
    });
  }

  // Tire-to-road occlusion gets applied to both riders and effects at a crest.
  function visible(w, h, state) {
    if (!Array.isArray(state.rivals) || state.rivals.length === 0) return [];
    requestArt();
    const world = window.ApexWorld;
    if (!world?.projectRival) return [];
    const pack = [];
    for (const rider of state.rivals) {
      const sprite = art.get(rider.id) || substitutes.get(rider.id);
      if (!sprite) continue;
      const p = world.projectRival(w,h,state,rider);
      if (!p || p.occluded || !(p.height > 1) || !Number.isFinite(p.x+p.y+p.depth+p.height)) continue;
      const cover = state.camera !== 'cockpit' && rider.distance < state.distance;
      pack.push({rider,sprite,p,cover});
    }
    return pack.sort((a,b)=>b.p.depth-a.p.depth);
  }

  const footprint = bitmap(80,28);
  {
    const brush = footprint.getContext('2d');
    brush.scale(1,.34);
    const shade = brush.createRadialGradient(40,40,2,40,40,40);
    shade.addColorStop(0,'rgba(9,15,21,.82)');
    shade.addColorStop(.38,'rgba(18,23,27,.60)');
    shade.addColorStop(1,'rgba(22,25,29,0)');
    brush.fillStyle=shade;
    brush.fillRect(0,0,80,84);
  }

  const tailBloom = bitmap(64,28);
  {
    const brush=tailBloom.getContext('2d');
    brush.scale(1,.4375);
    const bloom=brush.createRadialGradient(32,32,1,32,32,32);
    bloom.addColorStop(0,'rgba(255,238,187,.96)');
    bloom.addColorStop(.14,'rgba(255,129,65,.83)');
    bloom.addColorStop(.38,'rgba(255,63,26,.50)');
    bloom.addColorStop(1,'rgba(255,44,20,0)');
    brush.fillStyle=bloom;
    brush.fillRect(0,0,64,64);
  }

  function paintPhoto(g, im, sprite, width, height, lean, tuck) {
    const left=-sprite.axle*width;
    // The upper body moves independently in a corner. Keep the bike and tire rigid.
    const weight = lean*width*.073;
    if (height < 42 || Math.abs(weight)+Math.abs(tuck)<.55) {
      g.drawImage(im,left,-height,width,height);
      return;
    }
    const hipY = height * (sprite.hips - 1);
    g.drawImage(im,0,im.height*sprite.hips,im.width,im.height*(1-sprite.hips),
      left,hipY,width,-hipY);
    for (let n=0;n<5;n++) {
      const t=n/5, next=(n+1)/5;
      const a=(1-t)**2, b=(1-next)**2;
      const y1=-height+t*sprite.hips*height+tuck*a;
      const y2=-height+next*sprite.hips*height+tuck*b;
      const sy=t*sprite.hips*im.height, sh=(next-t)*sprite.hips*im.height;
      g.save();
      g.transform(1,0,(b-a)*weight/(y2-y1),1,a*weight,y1);
      g.drawImage(im,0,sy,im.width,sh+.35,left,0,width,y2-y1+.35*height/im.height);
      g.restore();
    }
  }

  function hazeMask(sprite, rainy, worldColor) {
    const condition = rainy ? 'rain' : 'clear';
    const color = worldColor || (rainy ? '#91a0a7' : '#b6b4ab');
    const cached = sprite.haze[condition];
    if (cached?.color === color) return cached.image;
    const image = mask(sprite.dry, color);
    sprite.haze[condition] = { color, image };
    return image;
  }

  function drawRider(g, w, h, state, actor) {
    const {rider,sprite,p}=actor;
    const rainy=state.weather==='rain', height=p.height;
    const width=height*sprite.dry.width/sprite.dry.height;
    const lean=clamp((rider.leanAngle||0)/51,-1.05,1.05);
    const roll=p.roll || 0;
    const collision=window.ApexCollisionFX,shock=collision?.response(rider);
    const angle=lean*.78+(shock?.kick||0)*.085;
    const time=state.weatherTime ?? state.time ?? 0;
    const braked = clamp(Number(rider.braking)||0,0,1);
    const moving=clamp((rider.speed||0)/100,0,1);
    const fog=clamp(p.fog ?? (1-Math.exp(-p.depth*(rainy?.007:.002))),0,1);
    const alpha=1-clamp((fog-.87)/.13,0,1);
    if (alpha < .015) return;
    const wetness = rainy ? clamp(window.ApexWorld?.surfaceWetness?.(rider.distance,rider.lateral) ?? state.wetness ?? .75,0,1) : 0;
    const weatherState={
      ...state, speed:rider.speed, distance:rider.distance, lateral:rider.lateral,
      lean, slip:0, offroad:false, wetness,crash:rider.crash,impact:rider.impact
    };
    const photo=height<72 ? (rainy?sprite.wetSmall:sprite.drySmall) : (rainy?sprite.wet:sprite.dry);
    g.save();
    if (Number.isFinite(p.clipY)) {
      g.beginPath();g.rect(0,0,w,Math.max(0,p.clipY));g.clip();
    }
    g.translate(p.x,p.y);
    g.rotate(roll);
    if(rider.crash&&collision){
      const cover=window.ApexWorld?.shadeAt?.(rider.distance,rider.lateral)||0;
      const roof=window.ApexWorld?.shelterAt?.(rider.distance)||0;
      g.globalAlpha=alpha;
      collision.fallen(g,photo,height,weatherState,{kind:'rival',axle:sprite.axle,
        shade:Math.max(cover*(rainy?.04:.24),roof*.43)*(1-fog),fog,fogColor:p.fogColor});
      g.restore();return;
    }
    // Flatten the actual bike silhouette on the road. Under cloud the contact patch dominates.
    g.save();
    g.globalAlpha=(rainy?.08:.26)*(1-fog);
    g.transform(1,-.025,-.37,-.125,0,0);
    g.rotate(angle);
    g.drawImage(sprite.shadow,-sprite.axle*width,-height,width,height);
    g.restore();
    g.globalAlpha=alpha*(1-.5*fog);
    g.drawImage(footprint,-width*.34,-height*.027,width*.70,height*.062);
    if (rainy && height>11) {
      window.ApexRiderWeather?.reflection(g,width,height,angle,photo,braked,weatherState);
      window.ApexRiderWeather?.spray(g,height,weatherState,false);
    }
    g.save();
    g.globalAlpha=alpha;
    g.rotate(angle);
    const tremor=Math.sin((rider.distance||0)*.58+time*.8)*.0016*moving;
    g.transform(1-Math.abs(lean)*.048,0,lean*.023,1+tremor,0,0);
    const tuck=height*(.014*moving-.012*braked+.007*clamp(rider.pitch||0,-1,1));
    paintPhoto(g,photo,sprite,width,height,lean,tuck);
    const treeCover = window.ApexWorld?.shadeAt?.(rider.distance,rider.lateral) || 0;
    const roof = window.ApexWorld?.shelterAt?.(rider.distance) || 0;
    const shade = Math.max(treeCover*(rainy?.04:.24), roof*.43)*(1-fog);
    if (shade>.025) {
      g.globalAlpha=alpha*shade;
      paintPhoto(g,sprite.shadow,sprite,width,height,lean,tuck);
    }
    if (fog>.012) {
      g.globalAlpha=alpha*fog*.93;
      paintPhoto(g,hazeMask(sprite,rainy,p.fogColor),sprite,width,height,lean,tuck);
    }
    if (braked>.025) {
      const diameter=Math.max(1.6,width*.23);
      const x=(sprite.lamp[0]-sprite.axle)*width;
      const y=(sprite.lamp[1]-1)*height;
      g.globalAlpha=alpha*(1-.7*fog)*Math.sqrt(braked);
      g.globalCompositeOperation='screen';
      g.drawImage(tailBloom,x-diameter*.5,y-diameter*.19,diameter,diameter*.38);
    }
    g.restore();
    if (rainy && height>26) window.ApexRiderWeather?.spray(g,height,weatherState,true);
    collision?.contact(g,height,weatherState);
    g.restore();
  }

  function draw(g,w,h,state,pack,inFrontOfPlayer) {
    for (const actor of pack) {
      if (actor.cover===inFrontOfPlayer) drawRider(g,w,h,state,actor);
    }
  }

  window.ApexRivals = { visible, draw };
})();

;
/* bike-garage.js */
/* Immutable, bounded material variants shared by the garage and racing views. */
(() => {
  'use strict';
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const sources = new WeakMap(), variants = new WeakMap(), recent = [];
  const showroom = new Map();
  const fallbackPalettes = {
    paint: {vermilion:'#d7402e',pearl:'#e3e1d5',graphite:'#3b4145',cobalt:'#2454be',emerald:'#287457'},
    accent: {ivory:'#e9e4d3',black:'#1c2327',copper:'#be7950'},
    wheels: {graphite:'#42484b',silver:'#abb4b7',gold:'#b4934c'}
  };
  const normalize = config => window.ApexMotorcycles?.normalize(config) || {
    model: ['r600','rr1000','st900'].includes(config?.model) ? config.model : 'r600',
    paint: Object.hasOwn(fallbackPalettes.paint,config?.paint) ? config.paint : 'vermilion',
    accent: Object.hasOwn(fallbackPalettes.accent,config?.accent) ? config.accent : 'ivory',
    wheels: Object.hasOwn(fallbackPalettes.wheels,config?.wheels) ? config.wheels : 'graphite',
    livery: ['solid','stripes','race'].includes(config?.livery) ? config.livery : 'solid',
    number: clamp(Math.round(Number(config?.number)||27),1,99)
  };
  const palette = config => {
    const p = window.ApexMotorcycles?.palettes || fallbackPalettes;
    return {paint:p.paint[config.paint],accent:p.accent[config.accent],wheels:p.wheels[config.wheels]};
  };
  const rgb = hex => [1,3,5].map(n=>parseInt(hex.slice(n,n+2),16));
  const key = c => window.ApexMotorcycles?.key(c) || [c.model,c.paint,c.accent,c.wheels,c.livery,c.number].join(':');
  const makeCanvas = (w,h) => {const c=document.createElement('canvas');c.width=w;c.height=h;return c;};

  function source(image) {
    if (sources.has(image)) return sources.get(image);
    const c=makeCanvas(image.width,image.height),g=c.getContext('2d',{willReadFrequently:true});
    g.drawImage(image,0,0);
    let pixels;
    try {pixels=g.getImageData(0,0,c.width,c.height);}
    catch {sources.set(image,null);return null;} // Cross-origin/local-file taint keeps the photograph usable.
    let left=c.width,top=c.height,right=0,bottom=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels.data[(y*c.width+x)*4+3]>24){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
    const result={pixels,w:c.width,h:c.height,bounds:{x:left,y:top,w:right-left+1,h:bottom-top+1}};sources.set(image,result);return result;
  }
  function cache(image,id,canvas) {
    let map=variants.get(image);if(!map){map=new Map();variants.set(image,map);}
    map.set(id,canvas);recent.push({map,id});
    // At most fourteen full-size surfaces, regardless of time spent browsing swatches.
    while(recent.length>14){const old=recent.shift();old.map.delete(old.id);}
    return canvas;
  }
  function protectedHand(u,v) {
    return v>=444/900&&v<748/900&&(u<348/1350||u>=1002/1350);
  }
  function paintedArea(kind,u,v) {
    if(kind==='cockpit') {
      if(protectedHand(u,v))return false;
      // Fuel tank, cheek panels and nose. Leave switches, adjusters and hardware red.
      return v>.832 || v>.748&&u>.16&&u<.84 ||
        v>.425&&v<.575&&u>.285&&u<.715;
    }
    if(kind==='chase')return u>.31&&u<.69&&v>.294&&v<.505&&!(v>.367&&v<.395&&Math.abs(u-.5)<.12);
    if(kind==='fallback')return v>.27&&v<.65;
    return true;
  }
  function pattern(c,kind,u,v) {
    if(kind==='cockpit') {
      if(v<.83)return c.livery==='stripes'?v>.474&&v<.49:c.livery==='race'&&v>.447&&v<.469;
      const x=Math.abs(u-.5);
      if(c.livery==='stripes')return x>.105&&x<.127;
      if(c.livery==='race')return x>.115+(v-.83)*.19&&x<.154+(v-.83)*.19;
      return x>.197&&x<.203;
    }
    if(kind==='chase') {
      const x=Math.abs(u-.5);
      if(c.livery==='stripes')return x>.061&&x<.077&&v<.397;
      if(c.livery==='race')return v>.338&&v<.365&&x>.084||v>.44&&x>.11;
      return x>.125&&x<.133&&v>.35;
    }
    if(c.livery==='stripes')return Math.abs((u+v*.37)% .35-.16)<.024;
    if(c.livery==='race')return v>.48&&v<.51||u-v*.22>.50&&u-v*.22<.535;
    return false;
  }
  function surface(image,configuration,kind='chase') {
    if(!image)return image;
    const c=normalize(configuration),id=kind+':'+key(c),found=variants.get(image)?.get(id);
    if(found)return found;
    const original=source(image);
    if(!original)return cache(image,id,image);
    const {w,h,pixels}=original,src=pixels.data;
    const canvas=makeCanvas(w,h),g=canvas.getContext('2d'),output=g.createImageData(w,h),dst=output.data;
    const colors=palette(c),paint=rgb(colors.paint),accent=rgb(colors.accent),wheel=rgb(colors.wheels);
    const profile=c.model==='rr1000'?.055:c.model==='st900'?.092:-.025;
    const wheelCenters=c.model==='rr1000'?[[.135,.644,.112,.143],[.817,.688,.135,.152]]:
      c.model==='st900'?[[.139,.687,.112,.145],[.821,.721,.135,.153]]:[[.146,.612,.115,.142],[.805,.648,.135,.153]];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
      const u=x/w,v=y/h,i=(y*w+x)*4;
      let sample=i;
      if(kind==='chase'&&v>.294&&v<.51&&u>.285&&u<.715) {
        // Small smooth tail/fairing profile changes; rider, wheel contact and frame stay aligned.
        const envelope=Math.sin((v-.294)/.216*Math.PI)*clamp((.215-Math.abs(u-.5))/.055);
        const sx=Math.round((.5+(u-.5)/(1+profile*envelope))*w);
        sample=(y*w+clamp(sx,0,w-1))*4;
      }
      let r=src[sample],green=src[sample+1],b=src[sample+2];
      dst[i]=r;dst[i+1]=green;dst[i+2]=b;dst[i+3]=src[sample+3];
      if(kind==='studio'&&src[sample+3]<24){dst[i+3]=0;continue;}
      if(src[sample+3]<3||kind==='cockpit'&&protectedHand(u,v))continue;
      const dominance=r-Math.max(green,b),red=clamp((dominance-8)/35)*clamp((r-35)/45)*clamp((r-green*1.48-7)/35)*clamp((r-b*1.25-7)/35);
      if(red>0&&paintedArea(kind,u,v)) {
        // Neutral specular light is retained; only the red pigment contribution changes.
        const target=pattern(c,kind,u,v)?accent:paint;
        const neutral=Math.min(green,b),chroma=r-neutral;
        for(let channel=0;channel<3;channel++) {
          const old=src[sample+channel];
          dst[i+channel]=old+(clamp(neutral+chroma*target[channel]/220,0,255)-old)*red;
        }
      }
      if(kind==='studio') {
        // Cyan is a deliberate trim separation color in the studio photography.
        const cyan=clamp((Math.min(green,b)-r-16)/70)*clamp((green-65)/60);
        if(cyan>0)for(let channel=0;channel<3;channel++)dst[i+channel]=dst[i+channel]*(1-cyan)+(Math.min(r,green,b)*.34+accent[channel]*Math.max(green,b)/230)*cyan;
        let inWheel=false;
        for(let n=0;n<2;n++){const [cx,cy,rx,ry]=wheelCenters[n];if(((u-cx)/rx)**2+((v-cy)/ry)**2<1&&(n===0||v>cy-.043||u>cx-.005))inWheel=true;}
        const gold=inWheel?clamp((r-b-15)/55)*clamp((green-b-8)/40)*clamp((r-green+5)/30):0;
        if(gold>0) {
          const light=Math.max(r,green,b)/210,neutral=Math.min(r,green,b)*.6;
          for(let channel=0;channel<3;channel++)dst[i+channel]=dst[i+channel]*(1-gold)+(neutral+wheel[channel]*light*.83)*gold;
        }
      }
      // The rear wheel is seen edge-on: tint only its two metal lips, never tread/chain/exhaust.
      if(kind==='chase'&&v>.59&&v<.83&&((u>.377&&u<.391)||(u>.626&&u<.637))) {
        const luminance=(r+green+b)/3,saturation=Math.max(r,green,b)-Math.min(r,green,b);
        const strength=clamp((luminance-34)/50)*clamp((45-saturation)/35)*.62;
        for(let channel=0;channel<3;channel++)dst[i+channel]=src[sample+channel]*(1-strength)+(luminance*.42+wheel[channel]*luminance/190)*strength;
      }
      if(kind==='chase'&&u>.66&&u<.76&&v>.67&&v<.80&&r>28&&Math.max(r,green,b)-Math.min(r,green,b)<48) {
        const factor=c.model==='r600'?.71:c.model==='rr1000'?.88:1.09;
        for(let channel=0;channel<3;channel++)dst[i+channel]*=factor;
      }
    }
    g.putImageData(output,0,0);
    if(kind==='cockpit') {
      // These small factory marks sit on the tank above the fuel cap and below both hand atlases.
      g.save();g.translate(w*.5,h*.862);g.scale(1,.73);
      g.fillStyle=colors.accent;g.textAlign='center';g.font='600 '+Math.round(w*.011)+'px sans-serif';
      g.fillText(c.model.toUpperCase(),0,0);
      if(c.livery==='race') {g.font='italic 800 '+Math.round(w*.034)+'px sans-serif';g.fillText(String(c.number).padStart(2,'0'),0,h*.044);}
      else {g.globalAlpha=.85;g.font='700 '+Math.round(w*.013)+'px monospace';g.fillText(String(c.number).padStart(2,'0'),0,h*.026);}
      g.restore();
      // A small engraved steering-yoke ID stays in view when the tank is below the camera.
      g.save();g.translate(w*.5,h*.659);g.textAlign='center';g.fillStyle=colors.accent;
      g.globalAlpha=.82;g.font='600 '+Math.round(w*.011)+'px sans-serif';
      g.fillText(c.model.toUpperCase()+' / '+String(c.number).padStart(2,'0'),0,0);g.restore();
    } else if(kind==='chase') {
      g.save();g.translate(w*.5,h*.338);g.scale(1,.75);
      g.fillStyle=colors.accent;g.textAlign='center';g.font='italic 800 '+Math.round(w*(c.livery==='race'?.054:.037))+'px sans-serif';
      g.fillText(String(c.number).padStart(2,'0'),0,0);
      g.font='700 '+Math.round(w*.013)+'px sans-serif';g.fillText(c.model.toUpperCase(),0,h*.018);g.restore();
    } else if(kind==='studio') {
      const anchor=c.model==='rr1000'?[.58,.57,-.21]:c.model==='st900'?[.61,.55,-.18]:[.59,.55,-.28];
      g.save();g.translate(w*anchor[0],h*anchor[1]);g.rotate(anchor[2]);g.transform(1,-.08,.17,.82,0,0);
      g.textAlign='center';g.fillStyle=colors.accent;g.font='italic 800 '+Math.round(w*(c.livery==='race'?.055:.028))+'px sans-serif';
      g.strokeStyle=c.accent==='black'?'#b9bec0':'#182329';g.lineWidth=w*.0012;g.strokeText(String(c.number).padStart(2,'0'),0,0);g.fillText(String(c.number).padStart(2,'0'),0,0);
      g.font='600 '+Math.round(w*.009)+'px sans-serif';g.fillText(c.model.toUpperCase(),0,h*.014);g.restore();
    }
    if(kind==='cockpit') {
      // Restore the exact compositor path, including one-bit premultiplied-alpha
      // rounding at glove/lever edges. These regions belong solely to the hand atlases.
      for(const start of [0,1002]) {
        const x=start*w/1350,y=444*h/900,rw=348*w/1350,rh=304*h/900;
        g.clearRect(x,y,rw,rh);g.drawImage(image,x,y,rw,rh,x,y,rw,rh);
      }
    }
    return cache(image,id,canvas);
  }

  function loadStudio(model) {
    if(showroom.has(model))return showroom.get(model);
    const entry={image:null,failed:false};showroom.set(model,entry);
    const img=new Image(),name='garage-'+model+'.webp',url=window.ApexAssets?.[name]||'assets/'+name;
    let retry=0;img.decoding='async';
    img.onload=()=>{entry.image=img;window.dispatchEvent(new Event('apex:asset'));};
    img.onerror=()=>{
      if(retry>=2||/^(data|blob):/.test(url)){entry.failed=true;window.dispatchEvent(new Event('apex:asset'));return;}
      setTimeout(()=>{const next=new URL(url,document.baseURI);next.searchParams.set('retry',String(++retry));img.src=next.href;},500*(retry+1));
    };
    img.src=url;return entry;
  }
  function stage(g,w,h,view) {
    const wall=g.createLinearGradient(0,0,w,h);wall.addColorStop(0,'#263537');wall.addColorStop(.52,'#111c20');wall.addColorStop(1,'#080f13');
    g.fillStyle=wall;g.fillRect(0,0,w,h);
    const glow=g.createRadialGradient(w*.39,h*.15,0,w*.39,h*.15,w*.63);
    glow.addColorStop(0,'rgba(183,202,192,.17)');glow.addColorStop(1,'rgba(145,168,160,0)');
    g.fillStyle=glow;g.fillRect(0,0,w,h);
    if(view!=='cockpit') {
      const floor=g.createLinearGradient(0,h*.63,0,h);floor.addColorStop(0,'rgba(57,70,69,0)');floor.addColorStop(1,'rgba(64,76,73,.47)');
      g.fillStyle=floor;g.fillRect(0,h*.63,w,h*.37);
      g.strokeStyle='rgba(200,215,204,.075)';g.lineWidth=1;g.beginPath();g.moveTo(0,h*.86);g.lineTo(w,h*.86);g.stroke();
    } else {
      g.fillStyle='#303b3b';g.beginPath();g.moveTo(w*.44,h*.43);g.lineTo(w*.56,h*.43);g.lineTo(w*1.05,h);g.lineTo(-w*.05,h);g.fill();
      g.strokeStyle='rgba(211,208,167,.25)';g.lineWidth=1.5;g.beginPath();g.moveTo(w*.5,h*.47);g.lineTo(w*.5,h*.68);g.stroke();
    }
  }
  function draw(g,w,h,configuration,view,renderRide) {
    const c=normalize(configuration);view=['studio','chase','cockpit'].includes(view)?view:'studio';
    g.save();stage(g,w,h,view);
    if(view==='studio') {
      const entry=loadStudio(c.model);
      if(entry.image) {
        const photo=surface(entry.image,c,'studio'),bounds=source(entry.image)?.bounds||{x:0,y:0,w:photo.width,h:photo.height};
        const scale=Math.min(w*.94/bounds.w,h*.89/bounds.h);
        const pw=photo.width*scale,ph=photo.height*scale,x=(w-bounds.w*scale)/2-bounds.x*scale,y=h*.96-(bounds.y+bounds.h)*scale;
        const shade=g.createRadialGradient(0,0,0,0,0,w*.38);
        shade.addColorStop(0,'rgba(0,0,0,.65)');shade.addColorStop(1,'rgba(0,0,0,0)');
        g.save();g.translate(w*.5,h*.9);g.scale(1,.15);g.fillStyle=shade;g.fillRect(-w*.5,-w*.5,w,w);g.restore();
        g.drawImage(photo,x,y,pw,ph);
      } else renderRide('chase',c,true);
    } else renderRide(view,c,false);
    g.restore();
  }
  window.ApexBikeGarage={surface,normalize,palette,draw};
})();

;
/* mirrors.js */
/* Fairing-mounted optics. Rear scenes and riders share one physical camera;
   only their final composite is reflected, exactly once, into the glass. */
window.ApexMirrors=(()=>{
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const caches=new Map(),fronts=new Map();
  const fallenSurfaces=new WeakMap();
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let assetVersion=0;
  window.addEventListener('apex:asset',()=>assetVersion++);
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const palette={silva:'#e5a52b',park:'#26c5b3',moreau:'#698eea'};

  function frontSprite(id){
    const key=Object.hasOwn(palette,id)?id:'neutral';
    if(fronts.has(key))return fronts.get(key);
    const c=canvas(160,230),g=c.getContext('2d'),paint=palette[key]||'#b5b9bf';
    const tone=f=>{const n=parseInt(paint.slice(1),16);return 'rgb('+[n>>16,(n>>8)&255,n&255].map(v=>Math.round(v*f)).join(',')+')';};
    const fairing=g.createLinearGradient(-50,0,50,0);fairing.addColorStop(0,tone(.38));fairing.addColorStop(.22,tone(.88));fairing.addColorStop(.42,paint);fairing.addColorStop(.74,tone(.66));fairing.addColorStop(1,tone(.30));
    g.translate(80,0);g.lineJoin='round';g.lineCap='round';
    const shape=(d,fill,stroke='#152129',width=2)=>{const p=new Path2D(d);g.fillStyle=fill;g.fill(p);if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke(p);}};
    const rubber=g.createLinearGradient(-13,0,13,0);rubber.addColorStop(0,'#192026');rubber.addColorStop(.4,'#4c5459');rubber.addColorStop(.7,'#242c31');rubber.addColorStop(1,'#141b21');
    // Front tire, paired fork legs and brake discs — never the rear lamp artwork.
    shape('M-10 149Q0 143 10 149L13 213Q12 228 0 229Q-13 227-13 214Z',rubber);
    shape('M-18 158L-13 157-13 207-18 207Z M13 157L18 158 18 207 13 207Z','#9b9a8c');
    shape('M-20 187Q-27 203-20 216L-15 214-15 188Z M20 187Q27 203 20 216L15 214 15 188Z','#6a7275');
    // Bent arms frame the windscreen; the head is facing the reflected rider.
    shape('M-17 44Q-31 42-42 55L-61 86-54 103-40 98-26 73-24 113 24 113 26 73 40 98 54 103 61 86 42 55Q31 42 17 44Z','#26323a');
    shape('M-40 55L-31 50-22 56-29 68-44 88-50 84Z M40 55L31 50 22 56 29 68 44 88 50 84Z',paint,null);
    shape('M-53 89L-64 95-62 105-48 106-44 98Z M53 89L64 95 62 105 48 106 44 98Z','#202b31');
    const shell=g.createLinearGradient(-22,10,20,40);shell.addColorStop(0,'#a1a6a5');shell.addColorStop(.33,'#4b555c');shell.addColorStop(1,'#202a31');
    shape('M-23 25Q-24 4 0 1Q24 4 23 25L20 43Q12 53 0 54Q-15 51-21 41Z',shell);
    shape('M-22 23Q0 16 22 23L18 36Q0 42-18 36Z','#101b24','#75828b',1.2);
    shape('M-8 44L8 44 5 48-5 48Z','#111d23',null);
    shape('M-12 4L-5 2 7 3 12 7 6 9-5 7Z',paint,null);
    // Twin white headlights identify an approaching bike even at mirror scale.
    shape('M-44 90L-30 71Q0 61 30 71L44 90 50 126 34 160 15 174-15 174-34 160-50 126Z',fairing);
    shape('M-27 76Q0 66 27 76L31 99Q0 111-31 99Z','#2e424a','#839294',1.3);
    shape('M-46 105L-29 108-12 119-36 119-44 115Z M46 105L29 108 12 119 36 119 44 115Z','#e9f0de','#b6c7cb',1);
    shape('M-31 129L-10 137-13 153-28 144Z M31 129L10 137 13 153 28 144Z','#25333b',null);
    shape('M-13 161Q0 155 13 161L16 184-16 184Z',fairing);
    g.strokeStyle='rgba(230,239,237,.48)';g.lineWidth=1.8;g.beginPath();g.moveTo(-39,94);g.lineTo(-46,83);g.lineTo(-62,81);g.moveTo(39,94);g.lineTo(46,83);g.lineTo(62,81);g.stroke();
    fronts.set(key,c);return c;
  }

  function paintRivals(g,w,h,state,side){
    const world=window.ApexWorld;
    if(!world?.projectRearRival||!Array.isArray(state.rivals))return;
    const pack=[];
    for(const rival of state.rivals){
      if(!Number.isFinite(rival.distance)||rival.distance>=state.distance-.3)continue;
      const p=world.projectRearRival(w,h,state,rival,side);
      if(!p||p.occluded||!(p.height>1)||!Number.isFinite(p.x+p.y+p.height+p.depth))continue;
      pack.push({rival,p});
    }
    pack.sort((a,b)=>b.p.depth-a.p.depth);
    for(const {rival,p} of pack){
      g.save();
      if(p.clipY!=null){g.beginPath();g.rect(0,0,w,Math.max(0,p.clipY));g.clip();}
      g.translate(p.x,p.y);
      const fall=rival.crash?clamp((rival.crash.roll||0)/1.42,0,1):0;
      const lean=-(rival.leanAngle||0)*Math.PI/180*.65;
      g.rotate((p.roll||0)+lean*(1-fall)+(rival.crash?.side||1)*fall*1.35);
      const ht=Math.min(p.height,h*2.2),wd=ht*160/230;
      g.globalAlpha=clamp(1-(p.fog||0),.06,1)*(rival.crash?.phase==='recover'?.48:1);
      g.drawImage(frontSprite(rival.id),-wd/2,-ht,wd,ht);
      g.restore();
    }
  }

  function reflectedScene(state,side,small){
    const w=small?144:208,h=small?84:120;
    let cache=caches.get(side);
    if(!cache){cache={canvas:canvas(w,h),key:'',clock:-Infinity,distance:0};caches.set(side,cache);}
    const key=[state.course,state.weather,state.camera,w,h,assetVersion].join('/');
    const clock=Number.isFinite(state.weatherTime)?state.weatherTime:(state.time||0);
    const distance=state.distance||0;
    const reset=distance<cache.distance-1||Math.abs(distance-cache.distance)>25||clock<cache.clock;
    const poseKey=()=>[distance,state.lateral,state.leanAngle,state.pitch,state.crash?.roll,
      ...(state.rivals||[]).flatMap(r=>[r.id,r.distance,r.lateral,r.leanAngle,r.crash?.roll])].join('/');
    // Paused scenes normally keep the same texture. A new snapshot at the same
    // clock (garage/grid resets and deterministic previews) must not retain a
    // rider that is no longer behind the motorcycle.
    const sameClock=clock===cache.clock,pose=sameClock?poseKey():null;
    const due=cache.key!==key||reset||clock-cache.clock>=1/15||(sameClock&&pose!==cache.pose);
    if(due){
      if(cache.canvas.width!==w||cache.canvas.height!==h){cache.canvas.width=w;cache.canvas.height=h;}
      const g=cache.canvas.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,w,h);
      if(window.ApexWorld?.drawRearView)window.ApexWorld.drawRearView(g,w,h,state,side);
      else studioGlass(g,w,h,state.weather==='rain');
      paintRivals(g,w,h,state,side);
      cache.key=key;cache.clock=clock;cache.distance=distance;cache.pose=pose??poseKey();
    }
    return cache.canvas;
  }
  function studioGlass(g,w,h,rain){
    const fill=g.createLinearGradient(0,0,w*.25,h);
    fill.addColorStop(0,rain?'#6d818b':'#8b9b9e');fill.addColorStop(.48,'#b7c2be');fill.addColorStop(.52,'#6a7777');fill.addColorStop(1,'#303d43');
    g.fillStyle=fill;g.fillRect(0,0,w,h);
  }
  function outline(g,side,inset=0){
    const x=n=>n*side,s=1-inset;
    g.beginPath();g.moveTo(x(-85*s),-39*s);
    g.bezierCurveTo(x(-61*s),-49*s,x(48*s),-57*s,x(84*s),-42*s);
    g.bezierCurveTo(x(100*s),-36*s,x(103*s),-9*s,x(95*s),19*s);
    g.quadraticCurveTo(x(88*s),41*s,x(58*s),45*s);
    g.lineTo(x(-67*s),36*s);g.quadraticCurveTo(x(-90*s),31*s,x(-94*s),7*s);
    g.quadraticCurveTo(x(-99*s),-20*s,x(-85*s),-39*s);g.closePath();
  }
  function glass(g,side,scene,state){
    g.save();outline(g,side,.065);g.clip();
    // Reflection comes after both world and opponents have been composed.
    if(scene){g.translate(100,-57);g.scale(-1,1);g.drawImage(scene,0,0,200,112);}
    else {g.translate(-100,-57);studioGlass(g,200,112,false);}
    g.restore();
    g.save();outline(g,side,.065);g.clip();
    g.fillStyle='rgba(112,173,193,.075)';g.fillRect(-100,-57,200,112);
    const glint=g.createLinearGradient(-80,-50,66,50);glint.addColorStop(0,'rgba(234,245,242,.13)');glint.addColorStop(.38,'rgba(234,245,242,0)');glint.addColorStop(.72,'rgba(20,39,49,.04)');glint.addColorStop(1,'rgba(14,31,44,.21)');g.fillStyle=glint;g.fillRect(-100,-57,200,112);
    if(state.weather==='rain'){
      for(let n=0;n<15;n++){
        const x=Math.sin(n*43+side*9)*82,y=Math.sin(n*87+side)*34,r=.65+(n%4)*.25;
        g.strokeStyle='rgba(222,239,239,.31)';g.lineWidth=.7;g.beginPath();g.ellipse(x,y,r,r*1.38,-.2,0,Math.PI*1.18);g.stroke();
        g.fillStyle='rgba(20,42,55,.12)';g.beginPath();g.ellipse(x+.4,y+.5,r,r*1.25,0,0,Math.PI*2);g.fill();
      }
    }
    g.restore();
  }
  function drawCockpit(g,w,h,state,geometry){
    const {width,height,top}=geometry;
    const small=w<700,mirrorWidth=Math.min(w*.235,h*.235,210);
    const center=Math.min(width*.355,w*.365),y=top+height*.307;
    const mount=Math.min(width*.235,w*.235),mountY=top+height*.56;
    const moving=clamp((state.speed||0)/150,0,1);
    const vibration=(reducedMotion?.matches?0:moving*.3*Math.sin((state.time||0)*31));
    for(const side of [-1,1]){
      g.save();g.lineCap='round';g.lineJoin='round';
      g.strokeStyle='#202a30';g.lineWidth=Math.max(3.5,mirrorWidth*.036);g.beginPath();g.moveTo(side*mount,mountY);g.quadraticCurveTo(side*(center-mirrorWidth*.28),mountY-mirrorWidth*.24,side*(center-mirrorWidth*.35),y+mirrorWidth*.12);g.stroke();
      g.strokeStyle='rgba(146,164,169,.53)';g.lineWidth=Math.max(.9,mirrorWidth*.009);g.stroke();
      g.translate(side*center,y+vibration*side);g.rotate(side*-.055);g.scale(mirrorWidth/200,mirrorWidth/200);
      const shell=g.createLinearGradient(0,-57,0,55);shell.addColorStop(0,'#525e62');shell.addColorStop(.12,'#253039');shell.addColorStop(.8,'#121d24');shell.addColorStop(1,'#38474c');
      outline(g,side);g.fillStyle=shell;g.fill();g.strokeStyle='#0d171d';g.lineWidth=2.5;g.stroke();
      const scene=state.garagePreview?null:reflectedScene(state,side,small);
      glass(g,side,scene,state);
      outline(g,side,.045);g.strokeStyle='rgba(177,193,196,.50)';g.lineWidth=1.15;g.stroke();
      g.restore();
    }
  }
  function drawBacks(g,width,height,state){
    // Seen from the chase camera, only the exterior shells are visible.
    // They remain part of the bike transform rather than becoming a HUD.
    const model=state.motorcycle?.model,spread=model==='st900'?.285:.26;
    for(const side of [-1,1]){
      g.save();g.lineCap='round';g.strokeStyle='#26333a';g.lineWidth=height*.009;
      g.beginPath();g.moveTo(side*width*.205,-height*.61);g.lineTo(side*width*spread,-height*.665);g.lineTo(side*width*(spread+.055),-height*.68);g.stroke();
      g.translate(side*width*(spread+.075),-height*.68);g.rotate(side*.10);g.scale(height*.00043,height*.00043);
      outline(g,side);const fill=g.createLinearGradient(0,-50,0,45);fill.addColorStop(0,'#657076');fill.addColorStop(.28,'#2d3a42');fill.addColorStop(1,'#17232b');g.fillStyle=fill;g.fill();g.strokeStyle='#142027';g.lineWidth=3;g.stroke();
      g.restore();
    }
  }
  function fallenSurface(photo,state){
    let surface=fallenSurfaces.get(photo);
    if(!surface){
      surface=canvas(photo.width,photo.height);const g=surface.getContext('2d');
      g.translate(photo.width/2,photo.height);drawBacks(g,photo.width,photo.height,state);
      g.drawImage(photo,-photo.width/2,-photo.height);fallenSurfaces.set(photo,surface);
    }
    return surface;
  }
  return {drawCockpit,drawBacks,fallenSurface};
})();

;
/* bike.js */
(() => {
  'use strict';

  const sprites = new Map();
  const ink = '#161722';
  const material = (image,state,view) => window.ApexBikeGarage?.surface(image,state.motorcycle,view)||image;

  // All the artwork is drawn in a 200 × 220 frame, with the contact patch at (0, 210).
  function makeSprite(braking) {
    const canvas = document.createElement('canvas');
    const resolution = 3;
    canvas.width = 200 * resolution;
    canvas.height = 220 * resolution;
    const g = canvas.getContext('2d');
    g.scale(resolution, resolution);
    g.translate(100, 0);
    g.lineJoin = 'round';
    g.lineCap = 'round';

    function paint(d, fill, line, width = 1.5) {
      const path = new Path2D(d);
      if (fill) {
        g.fillStyle = fill;
        g.fill(path);
      }
      if (line) {
        g.strokeStyle = line;
        g.lineWidth = width;
        g.stroke(path);
      }
    }
    const stroke = (d, color, width) => paint(d, null, color, width);
    const shade = (x1, y1, x2, y2, stops) => {
      const grad = g.createLinearGradient(x1, y1, x2, y2);
      stops.forEach(([position, color]) => grad.addColorStop(position, color));
      return grad;
    };
    const silver = shade(-12, 0, 16, 10, [[0, '#fff1d4'], [.22, '#b5a6a2'], [.52, '#62606b'], [.72, '#363846'], [1, '#92949a']]);
    const red = shade(-52, 70, 46, 112, [[0, '#ffb776'], [.23, '#f24c37'], [.56, '#ca2a2c'], [.84, '#931f35'], [1, '#5d2335']]);
    const leather = shade(-32, 0, 34, 0, [[0, '#756066'], [.13, '#443d49'], [.43, '#272a39'], [.7, '#202331'], [1, '#161a25']]);
    const rubber = shade(-22, 0, 22, 0, [[0, '#181923'], [.08, '#4c444c'], [.25, '#4c454c'], [.46, '#35333e'], [.72, '#292a34'], [.92, '#191c27'], [1, '#34303a']]);

    // Rear wheel and the far side of its brake disc.
    paint('M-11 119 Q0 113 14 121 C21 129 22 156 21 180 C21 198 17 208 9 210 Q1 212 -10 210 C-19 206 -22 198 -22 178 C-22 149 -20 129 -11 119Z', rubber, ink, 2.6);
    stroke('M-13 139 C-19 157 -19 192 -13 201', '#77606a', 1.5);
    stroke('M16 148 C18 159 17 182 15 195', '#151923', 2);
    for (let y = 151; y < 202; y += 11) {
      stroke('M-19 ' + y + ' q3 3 7 4 m20 1 8 -5', '#25242f', 1.5);
      stroke('M-18 ' + (y - 1) + ' l4 2', '#59505a', .7);
    }
    paint('M-21 144 Q-28 150 -27 171 Q-27 187 -21 187 L-17 178 -18 145Z', '#252631', ink, 2);
    stroke('M-23 146 Q-30 169 -23 181', '#f87553', 2.4);
    stroke('M-23 153 Q-27 166 -24 176', '#96909a', 1.4);

    // Rear suspension, chain, swingarm, axle covers and footrests.
    paint('M-28 124 L-36 129 -27 171 -20 177 -16 171 -20 132Z', '#3b3a47', ink, 2.4);
    paint('M-30 129 L-32 132 -25 167 -22 169 -22 161Z', '#9e8e92');
    paint('M18 132 L32 122 36 127 27 169 21 177 16 172Z', '#48444e', ink, 2.4);
    stroke('M29 132 L23 163', '#a79899', 2.5);
    paint('M-24 164 l5 2 1 7 -5 3 -5 -4Z', silver, ink, 1.4);
    paint('M21 163 l6 1 2 7 -6 5 -5 -4Z', silver, ink, 1.4);
    stroke('M-23 173 L-35 144 M-22 168 L-32 140', '#242631', 1.8);

    // Nose and cockpit appear on both sides of the crouched rider.
    paint('M-60 89 C-65 77 -55 65 -46 61 L-30 58 -18 65 19 65 32 56 50 63 Q63 74 60 90 L48 115 30 140 18 135 -18 134 -34 143 -53 114Z', red, ink, 2.8);
    paint('M-60 85 L-49 92 -31 120 -34 135 -48 113Z', '#641e32');
    paint('M60 82 L55 101 36 133 30 136 36 112Z', '#562134');
    paint('M-59 80 Q-55 69 -46 66 L-39 66 -52 78Z', '#ffb28f');
    paint('M58 81 L49 75 40 65 47 66Z', '#f56b51');
    paint('M-58 89 L-51 94 -44 110 -52 104Z M58 88 L55 102 47 109 50 96Z', '#1f2330');
    stroke('M-53 106 l10 12 M54 103 l-10 14', '#e66048', 1.7);
    stroke('M-42 72 L-52 60 -63 58 M42 72 L52 60 63 58', '#292632', 3);
    paint('M-70 54 Q-63 50 -55 54 L-55 59 Q-62 61 -68 59Z', '#443c45', ink, 1.6);
    paint('M70 54 Q63 50 55 54 L55 59 Q62 61 68 59Z', '#32333d', ink, 1.6);
    stroke('M-67 54 Q-62 53 -59 54 M58 54 L66 54', '#bc9592', 1.3);

    // Leathers and armored boots, with asymmetric sunset lighting.
    for (const side of [-1, 1]) {
      g.save();
      g.scale(side, 1);
      paint('M23 85 Q33 85 39 97 L47 112 Q49 120 43 131 L35 140 34 153 26 159 20 155 22 139 28 122 22 109Z', leather, ink, 2.6);
      paint('M35 101 Q46 109 46 116 L43 124 39 125 37 115 30 106Z', side === -1 ? '#876065' : '#51404c');
      stroke('M41 108 Q47 118 41 125', side === -1 ? '#dd937e' : '#935d61', 1.7);
      paint('M29 130 L39 126 39 136 33 145 33 154 26 158 20 156 23 148Z', '#252936', ink, 1.8);
      paint('M29 135 l6 -4 -2 8 -6 8Z', '#63606b');
      stroke('M23 151 L29 149 M22 155 L27 154', '#8c7880', 1.2);
      paint('M22 154 L28 153 34 150 34 157 27 161 20 160Z', '#211f2a', ink, 1.1);
      stroke('M26 161 l10 -4', '#a89b98', 2);
      g.restore();
    }

    // Titanium exhaust can, its bevelled cap and the warm reflection along the seam.
    paint('M36 132 L43 127 52 128 55 135 41 162 Q38 168 32 166 L27 162Z', shade(28, 140, 50, 149, [[0, '#5b5260'], [.27, '#aaa2a5'], [.43, '#efe0c9'], [.57, '#88858e'], [.85, '#555663'], [1, '#353541']]), ink, 2.4);
    paint('M35 150 L45 154 43 158 33 154Z', '#575763');
    paint('M41 127 Q48 122 54 128 Q57 132 53 137 Q48 141 41 136 Q37 132 41 127Z', '#b1a2a2', ink, 1.7);
    paint('M43 128 Q48 125 52 129 Q54 132 51 134 Q46 137 42 133Z', '#282733', '#77737a', 1.1);

    // Jacket, elbows and gauntlets.
    paint('M-14 39 Q-23 35 -33 42 L-45 54 -54 72 Q-57 79 -51 85 L-44 86 -36 78 -29 66 -25 87 -29 95 Q-27 106 -14 109 L15 109 Q27 106 28 95 L25 87 29 65 36 79 45 86 52 84 Q58 79 54 72 L44 53 Q35 38 19 38Z', leather, ink, 2.7);
    paint('M-17 40 Q-31 37 -39 48 L-49 65 -43 70 -34 57 -24 53Z', red);
    paint('M17 40 Q33 37 40 49 L49 65 43 70 33 56 25 53Z', '#ad303a');
    stroke('M-46 62 L-39 49 Q-31 40 -25 41', '#ffc4a0', 2.1);
    stroke('M-42 62 L-35 52 -26 48 M42 62 L35 52 27 48', '#e9c9b3', 3);
    paint('M-42 69 L-47 65 -54 75 -51 82 -45 83 -41 76Z M42 70 L47 65 54 75 51 82 45 83 40 76Z', '#242633', ink, 1.6);
    stroke('M-51 74 l5 -2 M-52 77 l5 -2 M46 72 l5 3', '#8a7380', 1.5);
    paint('M-28 54 Q-17 49 -14 48 L15 48 29 54 26 62 20 66 15 88 -14 88 -20 67 -26 62Z', shade(-24, 50, 24, 83, [[0, '#78616a'], [.33, '#45414e'], [.85, '#323342'], [1, '#252735']]));
    stroke('M-25 57 l7 6 6 21 M24 57 l-7 6 -5 21', '#8b7077', 1.3);
    paint('M-23 69 L-16 78 -13 89 -23 85Z M23 69 L16 78 13 89 23 85Z', '#a73740');
    // A small, original embroidered apex insignia on the spine protector.
    paint('M-10 68 L-1 56 7 56 11 61 4 61 0 60 -6 68Z M1 66 L6 61 12 68 5 68Z', '#f3d8bc');
    stroke('M-7 72 L6 72', '#e56c58', 1.6);
    paint('M-21 90 Q0 96 22 90 L25 97 Q0 106 -26 97Z', '#202332', ink, 1.5);
    stroke('M-19 91 Q-3 95 18 92', '#8e6972', 1.4);

    // Undertail and angular red tail fairing. The small central light intensifies while braking.
    paint('M-29 107 L30 107 29 126 19 145 11 150 -12 149 -22 140 -29 123Z', '#282a35', ink, 2.3);
    paint('M-13 137 L12 137 8 146 -8 146Z', '#45434f');
    paint('M-24 102 Q-18 98 0 99 Q18 98 24 102 L36 110 34 119 22 130 11 135 -12 135 -23 130 -35 118 -36 110Z', red, ink, 2.5);
    paint('M-21 102 Q0 98 20 102 L23 107 Q0 111 -23 106Z', '#493440', '#251e2a', 1.8);
    stroke('M-29 106 L-32 110 -22 118 M28 106 L33 110 25 117', '#ff9470', 2.2);
    paint('M-29 115 L-17 118 0 122 18 117 30 114 24 124 10 131 -11 131 -24 124Z', '#4c1f30', ink, 1.3);
    paint('M-22 117 L-4 120 0 123 4 120 22 117 17 124 6 128 -6 128 -18 124Z', braking ? '#ff654d' : '#f44742', '#882c3d', 1.3);
    stroke('M-18 119 L-5 122 M5 122 L18 119', braking ? '#fff8df' : '#ffa293', braking ? 3.4 : 2);
    paint('M-22 130 L-12 134 10 134 21 130 15 137 -15 137Z', '#373642', ink, 1.2);

    // Helmet shell above the collar, including vents, reflective strip, painted crown.
    paint('M-13 37 Q0 32 14 38 L17 45 Q0 51 -17 44Z', '#252633', ink, 2.3);
    paint('M-23 23 C-23 9 -14 2 -2 1 C13 -1 22 7 23 20 Q24 32 18 40 Q12 46 1 47 Q-12 46 -18 40 Q-24 33 -23 23Z', shade(-19, 4, 22, 39, [[0, '#f4b49c'], [.16, '#c0817c'], [.27, '#524452'], [.56, '#383646'], [.83, '#222433'], [1, '#151b29']]), ink, 2.7);
    paint('M-19 13 Q-16 4 -7 3 L1 2 -9 10 -13 21 -20 23Z', '#dd5549');
    paint('M-8 3 L0 2 -8 11 -13 21 -16 22 -12 11Z', '#ffb28f');
    paint('M4 3 Q14 4 19 12 L20 19 13 15Z', '#923944');
    paint('M-22 21 Q-9 24 0 21 Q13 20 22 16 L22 23 Q10 31 -1 31 Q-16 31 -22 27Z', '#151c2a', ink, 1);
    stroke('M-20 22 Q-2 26 19 18', '#a88a92', 1.6);
    stroke('M-17 31 Q-4 36 13 30', '#b56c6b', 2.3);
    paint('M-14 35 Q0 39 15 32 L13 37 Q0 44 -11 40Z', '#41414d');
    stroke('M-7 38 l5 1 M2 39 l6 -2', '#181d2b', 2.1);
    stroke('M-19 14 Q-15 5 -7 4', '#ffcfad', 2.1);
    return canvas;
  }

  function drawFallbackRider(g, w, h, state) {
    const braking = Boolean(state.braking && state.speed > 3);
    if (!sprites.has(braking)) sprites.set(braking, makeSprite(braking));
    const size = Math.min(h * .34 / 210, w * .36 / 140);
    const lean = Math.max(-1, Math.min(1, state.lean || 0));
    const speed = Math.max(0, state.speed || 0);
    const time = state.time || 0;
    const moving = Math.min(1, speed / 90);
    const bounce = (Math.sin(time * 25) + .5 * Math.sin(time * 38)) * moving *
      (state.offroad ? 1.9 : .36);
    const x = w * .5;
    const y = h * .912;
    g.save();
    g.translate(x, y);
    g.scale(size, size);

    // A soft grounding shadow under the rear tire, cast slightly away from the sun.
    g.save();
    g.translate(8 + lean * 3, -.8);
    g.scale(1, .19);
    const shadow = g.createRadialGradient(0, 0, 0, 0, 0, 56);
    shadow.addColorStop(0, 'rgba(17,18,25,.75)');
    shadow.addColorStop(.45, 'rgba(20,19,28,.53)');
    shadow.addColorStop(1, 'rgba(23,21,28,0)');
    g.fillStyle = shadow;
    g.fillRect(-56, -56, 112, 112);
    g.restore();

    if (state.offroad && speed > 20) {
      for (let i = 0; i < 12; i++) {
        const age = (time * 2.2 + i / 12) % 1;
        const side = i % 2 ? 1 : -1;
        const offset = Math.sin(i * 57.4);
        const dustX = side * (8 + age * (25 + 21 * Math.abs(offset)));
        g.fillStyle = 'rgba(226,181,139,' + (.24 * (1 - age)) + ')';
        g.beginPath();
        g.ellipse(dustX, age * 13 - 2 - age * age * (9 + 13 * offset), 2 + 9 * age, 1 + 4 * age, side * .2, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.translate(0, bounce);
    g.rotate(lean * .285);
    window.ApexMirrors?.drawBacks(g,200,210,state);
    g.drawImage(material(sprites.get(braking),state,'fallback'), -100, -210, 200, 220);
    g.restore();
  }

  const loadingImages = new Set();
  function loadImage(name, ready) {
    const img = new Image();
    const source = window.ApexAssets?.[name] || 'assets/' + name;
    let retries = 0;
    loadingImages.add(img);
    img.decoding = 'async';
    img.onload = () => {
      loadingImages.delete(img);
      ready(img);
      window.dispatchEvent(new Event('apex:asset'));
    };
    img.onerror = () => {
      if (retries === 2 || /^(data|blob):/.test(source)) {
        loadingImages.delete(img);
        return;
      }
      retries++;
      // Bypass a cached transient error, then leave the drawable fallback in place.
      setTimeout(() => {
        const next = new URL(source, document.baseURI);
        next.searchParams.set('retry', String(retries));
        img.src = next.href;
      }, 700 * retries);
    };
    img.src = source;
  }

  // A narrow crop of the photographed rear contact surface, in image coordinates.
  const treadArea = { x: .385, y: .524, width: .233, height: .469 };
  function makeSpinningTread(image) {
    const patch = document.createElement('canvas');
    patch.width = 128;
    patch.height = 320;
    const g = patch.getContext('2d');
    const a = treadArea;
    g.drawImage(image, image.width * a.x, image.height * a.y,
      image.width * a.width, image.height * a.height, 0, 0, patch.width, patch.height);
    const source = g.getImageData(0, 0, patch.width, patch.height);
    const blurred = g.createImageData(patch.width, patch.height);
    const sums = new Float64Array((patch.height + 1) * 3);
    // Average along the direction of rotation within each tread column, stopping
    // before the rounded shoulder and the contact patch so the outline stays crisp.
    for (let x = 0; x < patch.width; x++) {
      const across = (a.x + (x + .5) / patch.width * a.width - .501) / .113;
      if (Math.abs(across) >= 1) continue;
      const shoulder = 1 - Math.sqrt(1 - across * across);
      const top = Math.ceil((.53 + .064 * shoulder - a.y) / a.height * patch.height);
      const end = Math.floor((.991 - .053 * shoulder - a.y) / a.height * patch.height);
      for (let y = top; y < end; y++) {
        const pixel = (y * patch.width + x) * 4;
        for (let c = 0; c < 3; c++) {
          sums[(y + 1) * 3 + c] = sums[y * 3 + c] + source.data[pixel + c];
        }
      }
      for (let y = top; y < end; y++) {
        const first = Math.max(top, y - 69), last = Math.min(end, y + 70);
        const pixel = (y * patch.width + x) * 4;
        for (let c = 0; c < 3; c++) {
          blurred.data[pixel + c] = (sums[last * 3 + c] - sums[first * 3 + c]) / (last - first);
        }
        const feather = Math.min(1, (1 - Math.abs(across)) * 15, (y - top) / 9, (end - y) / 8);
        blurred.data[pixel + 3] = source.data[pixel + 3] * feather;
      }
    }
    g.putImageData(blurred, 0, 0);
    return patch;
  }

  const weatherFX = window.ApexRiderWeather;
  function shadingMask(image, color) {
    const mask = document.createElement('canvas');
    mask.height = 360;
    mask.width = Math.max(1, Math.round(360 * image.width / image.height));
    const brush = mask.getContext('2d');
    brush.drawImage(image, 0, 0, mask.width, mask.height);
    brush.globalCompositeOperation = 'source-in';
    brush.fillStyle = color;
    brush.fillRect(0, 0, mask.width, mask.height);
    return mask;
  }

  let rider, wetRider, cockpit, wetCockpit, relitCockpit;
  let silhouette, cockpitShade, wetCockpitShade, spinningTread, wetTread;
  loadImage('sierra-rider.webp', image => {
    rider = image;
    silhouette = shadingMask(image, '#182630');
    wetRider = weatherFX?.relight(image) || image;
    try {
      spinningTread = makeSpinningTread(image);
      wetTread = wetRider === image ? spinningTread : makeSpinningTread(wetRider);
    } catch (error) {
      // Local file previews can load an image while disallowing pixel reads.
      if (error.name !== 'SecurityError') throw error;
    }
  });
  loadImage('sierra-cockpit.webp', image => {
    cockpit = image;
    cockpitShade = shadingMask(image, '#20303b');
    if (!wetCockpit) relitCockpit = weatherFX?.relight(image);
  });
  loadImage('sierra-cockpit-wet.webp', image => {
    wetCockpit = image;
    wetCockpitShade = shadingMask(image, '#20303b');
    relitCockpit = null;
  });

  // Each 4 × 3 atlas contains increasing lever travel; the original photograph is
  // the exact neutral frame. Replacing RGBA pixels reveals the road where an open
  // lever used to be, including when both controls are operated together.
  const handPoses = {
    dry: { left: null, right: null },
    wet: { left: null, right: null }
  };
  const controls = [
    { side: 'left', sourceX: 0, file: 'sierra-left-clutch' },
    { side: 'right', sourceX: 1002, file: 'sierra-right-brake' }
  ];
  const poseSurface = document.createElement('canvas');
  const poseBrush = poseSurface.getContext('2d');
  let poseBase = null, poseShade = null;
  const previousLevels = { left: -1, right: -1 };
  const seenConditions = new Set();

  function requestHandPoses(rainy) {
    const condition = rainy ? 'wet' : 'dry';
    if (seenConditions.has(condition)) return;
    seenConditions.add(condition);
    for (const control of controls) {
      const filename = control.file + (rainy ? '-wet' : '') + '-travel.webp';
      loadImage(filename, img => { handPoses[condition][control.side] = img; });
    }
  }

  function matchHands(photo, state, rainy) {
    requestHandPoses(rainy);
    const images = handPoses[rainy ? 'wet' : 'dry'];
    const left = images.left ? Math.round(clamp(state.clutch || 0, 0, 1) * 12) : 0;
    const right = images.right ? Math.round(clamp(state.brake || 0, 0, 1) * 12) : 0;
    if (left === 0 && right === 0) return null;
    if (poseBase !== photo) {
      poseSurface.width = photo.width;
      poseSurface.height = photo.height;
      poseBrush.drawImage(photo, 0, 0);
      previousLevels.left = previousLevels.right = 0;
      poseBase = photo;
      poseShade = null;
    }

    let dirty = false;
    for (const control of controls) {
      const level = control.side === 'left' ? left : right;
      if (level === previousLevels[control.side]) continue;
      const x = control.sourceX, y = 444, w = 348, h = 304;
      poseBrush.clearRect(x, y, w, h);
      if (level === 0) {
        poseBrush.drawImage(photo, x, y, w, h, x, y, w, h);
      } else {
        const atlas = images[control.side], index = level - 1;
        const fw = atlas.width / 4, fh = atlas.height / 3;
        poseBrush.drawImage(atlas, (index % 4) * fw, Math.floor(index / 4) * fh,
          fw, fh, x, y, w, h);
      }
      previousLevels[control.side] = level;
      dirty = true;
    }
    if (dirty || !poseShade) {
      // The shelter tint must follow the new finger and lever silhouette too.
      if (!poseShade) poseShade = shadingMask(poseSurface, '#20303b');
      else {
        const brush = poseShade.getContext('2d');
        brush.globalCompositeOperation = 'copy';
        brush.drawImage(poseSurface, 0, 0, poseShade.width, poseShade.height);
        brush.globalCompositeOperation = 'source-in';
        brush.fillStyle = '#20303b';
        brush.fillRect(0, 0, poseShade.width, poseShade.height);
      }
    }
    return poseSurface;
  }

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

  function contact(g, radius) {
    g.save();
    g.scale(radius, radius * .22);
    const core = g.createRadialGradient(0, 0, .02, 0, 0, 1);
    core.addColorStop(0, 'rgba(18,18,22,.87)');
    core.addColorStop(.42, 'rgba(22,20,24,.5)');
    core.addColorStop(1, 'rgba(26,23,26,0)');
    g.fillStyle = core;
    g.fillRect(-1, -1, 2, 2);
    g.restore();
  }

  const dustPuff = document.createElement('canvas');
  dustPuff.width = dustPuff.height = 48;
  {
    const brush = dustPuff.getContext('2d');
    const haze = brush.createRadialGradient(24, 24, 0, 24, 24, 24);
    haze.addColorStop(0, 'rgba(185,155,124,.55)');
    haze.addColorStop(.4, 'rgba(190,161,130,.34)');
    haze.addColorStop(1, 'rgba(198,171,140,0)');
    brush.fillStyle = haze;
    brush.fillRect(0, 0, 48, 48);
  }

  function drawDust(g, height, state) {
    if (!state.offroad || state.speed < 14) return;
    const strength = clamp((state.speed - 14) / 90, 0, 1);
    const trail = (state.distance || 0) / 11;
    g.save();
    for (let i = 0; i < 20; i++) {
      const phase = (trail + i * .618034) % 1;
      const wind = Math.sin(i * 43.73);
      const x = height * (Math.sign(wind) * .025 + phase * (.05 + wind * .43));
      const y = height * phase * (.22 - phase * (.14 + .1 * wind));
      const radius = height * (.012 + phase * (.09 + .045 * Math.abs(wind)));
      g.globalAlpha = strength * (1 - phase) * .72;
      g.drawImage(dustPuff, x - radius, y - radius * .55, radius * 2, radius * 1.1);
    }
    g.restore();
  }

  function drawChassis(g, photo, width, height, lean, motion, speed, pitch, shift) {
    // Keep the chassis rigid below the seat. Blend the rider's tuck and
    // inside weight shift through the upper body, with a fixed pelvis.
    const inside = lean * motion * height * .033;
    const tuck = height * (.018 * clamp(speed / 230, 0, 1) + .019 * pitch + .005 * Math.sin(Math.PI * shift));
    if (Math.abs(inside) + Math.abs(tuck) < .35) {
      g.drawImage(photo, -width / 2, -height, width, height);
      return;
    }
    const waist = .5;
    const bands = 12;
    const row = (n) => {
      const u = n / bands;
      const blend = (1 - u) * (1 - u);
      return { source: photo.height * waist * u, y: height * (waist * u - 1) + tuck * blend, offset: inside * blend };
    };
    let top = row(0);
    for (let i = 1; i <= bands; i++) {
      const bottom = row(i);
      const bandHeight = bottom.y - top.y;
      g.save();
      g.transform(1, 0, (bottom.offset - top.offset) / bandHeight, 1, top.offset, top.y);
      g.drawImage(photo, 0, top.source, photo.width, bottom.source - top.source + .5,
        -width / 2, 0, width, bandHeight + .5 * height / photo.height);
      g.restore();
      top = bottom;
    }
    g.drawImage(photo, 0, top.source, photo.width, photo.height - top.source,
      -width / 2, top.y, width, -top.y);
  }

  function photoChase(g, w, h, state) {
    const speed = Math.max(0, state.speed || 0);
    const time = state.time || 0;
    const motion = clamp(speed / 75, 0, 1);
    const lean = clamp(state.lean || 0, -1, 1);
    const collision = window.ApexCollisionFX;
    const shock = collision?.response(state);
    const angle = (state.leanAngle ?? lean * 48 * motion) * Math.PI / 180 + (shock?.kick || 0) * .085;
    const pitch = clamp(state.pitch || 0, -1, 1);
    const heave = clamp(state.heave || 0, -1, 1);
    const shift = clamp(state.shift || 0, 0, 1);
    const height = Math.min(h * (.434 - .014 * clamp(speed / 235, 0, 1)), w * .73);
    const width = height * rider.width / rider.height;
    const rainy = state.weather === 'rain';
    const photo = material(rainy ? wetRider : rider,state,'chase');
    const tread = rainy ? wetTread : spinningTread;
    const cover = weatherFX?.canopy(state) || 0;
    const roof = weatherFX?.shelter(state) || 0;
    const shade = Math.max(rainy ? cover*.045 : cover*.37, roof*.48);
    const brake = clamp(state.brake ?? Number(state.braking), 0, 1);
    const frontLoad = clamp(((state.frontLoad ?? .52)-.52)/.40, -1, 1);
    const chatter = motion * (.00065 * Math.sin(time * 23) + .0004 * Math.sin(time * 43)) * (state.offroad ? 2.8 : 1);
    const anchorX = w * .5 + h * (.012 * lean + .006 * Math.sin(angle));
    const contactY = h * .92;
    const suspension = height * (.012 * heave + .007 * pitch - .010 * frontLoad - .005 * Math.sin(shift*Math.PI) + chatter);

    if (state.crash && collision) {
      // Match camera movement without introducing a discontinuity from the hero's
      // established framing when switching between the two courses.
      const world=window.ApexWorld,subject={distance:state.distance,lateral:state.lateral};
      const projected=world?.projectRival?.(w,h,state,subject);
      const neutral=world?.projectRival?.(w,h,{...state,crash:null,impact:null},subject);
      const dx=projected&&neutral?projected.x-neutral.x:0;
      const dy=projected&&neutral?projected.y-neutral.y:0;
      const size=projected&&neutral?clamp(projected.height/neutral.height,.78,1.1):1;
      g.save();g.translate(anchorX+dx,contactY+dy);g.rotate(projected?.roll||0);
      collision.fallen(g,window.ApexMirrors?.fallenSurface(photo,state)||photo,height*size,state,{kind:'hero',axle:.5,shade});
      g.restore();
      return;
    }

    g.save();
    g.translate(anchorX, contactY);
    g.save();
    // Flatten the rider's actual silhouette into the road plane, in the direction of the sunlight.
    g.transform(1, -.035, -.38, -.2, 0, 0);
    g.rotate(angle * .77);
    g.globalAlpha = rainy ? .075 : .31*(1-cover*.74);
    g.drawImage(silhouette, -width / 2, -height, width, height);
    g.restore();
    if (rainy) weatherFX?.reflection(g, width, height, angle, photo, brake, state);
    contact(g, width * .34);
    if (rainy) weatherFX?.spray(g, height, state, false);
    else drawDust(g, height, state);
    g.save();

    // Roll around the contact patch; tire width, squat and perspective vary through a turn.
    g.translate(0, suspension * .08);
    g.rotate(angle * .77);
    g.transform(1 - Math.abs(lean) * .042, 0, lean * .019, 1 - suspension / height, 0, 0);
    window.ApexMirrors?.drawBacks(g,width,height,state);
    drawChassis(g, photo, width, height, lean, motion, speed, pitch, shift);
    if (tread && speed > 5) {
      // Cross-fade from the exact stationary photograph as the wheel accelerates.
      const blur = clamp((speed - 5) / 105, 0, 1);
      g.globalAlpha = blur * (2 - blur) * .98;
      g.drawImage(tread, (treadArea.x - .5) * width, (treadArea.y - 1) * height,
        treadArea.width * width, treadArea.height * height);
      g.globalAlpha = 1;
    }
    if (shade > .012) {
      g.globalAlpha = shade;
      drawChassis(g, silhouette, width, height, lean, motion, speed, pitch, shift);
      g.globalAlpha = 1;
    }
    if (brake > .025) {
      const lampY = -height * .621;
      const radius = Math.max(3, width * .12);
      g.save();
      g.translate(0, lampY);
      g.globalAlpha = Math.sqrt(brake) * (state.absActive ? .90+.10*Math.sin(time*48) : 1);
      g.globalCompositeOperation = 'screen';
      g.lineWidth = height * .005;
      g.strokeStyle = 'rgba(255,160,82,.95)';
      g.beginPath();
      g.moveTo(-width * .083, -height * .001);
      g.quadraticCurveTo(-width * .081, height * .005, -width * .071, height * .004);
      g.quadraticCurveTo(0, -height * .006, width * .072, height * .003);
      g.lineTo(width * .084, -height * .003);
      g.stroke();
      g.scale(1, .28);
      const flare = g.createRadialGradient(0, 0, 0, 0, 0, radius);
      flare.addColorStop(0, 'rgba(255,112,57,.7)');
      flare.addColorStop(.32, 'rgba(255,55,25,.43)');
      flare.addColorStop(1, 'rgba(255,47,17,0)');
      g.globalCompositeOperation = 'screen';
      g.fillStyle = flare;
      g.fillRect(-radius, -radius, radius * 2, radius * 2);
      g.restore();
    }
    g.restore();
    if (rainy) weatherFX?.spray(g, height, state, true);
    collision?.contact(g,height,state);
    g.restore();
  }

  function lcd(g, x, y, width, height, state) {
    g.save();
    g.translate(x, y);
    g.scale(width / 140, height / 55);
    g.fillStyle = '#131d23';
    g.beginPath();
    g.roundRect(-70, -27.5, 140, 55, 3);
    g.fill();
    const redline = state.redline || window.ApexMotorcycles?.getModel(state.motorcycle?.model)?.physics.redline || 14100;
    const rpm = clamp(state.rpm || state.idleRpm || 1300, 0, redline);
    for (let n = 0; n < 20; n++) {
      g.fillStyle = rpm / redline * 20 > n ? (n > 16 ? '#ff7751' : '#c1d7c6') : '#374145';
      g.fillRect(-64 + n * 6.5, -21, 5.4, 3 + n * .18);
    }
    g.textAlign = 'right';
    g.fillStyle = '#e6e9d8';
    g.font = 'italic bold 33px monospace';
    g.fillText(Math.round(state.speed || 0), 4, 17);
    g.textAlign = 'left';
    g.font = 'bold 8px sans-serif';
    g.fillText('KM/H', 8, 15);
    g.fillRect(35, -7, 1, 25);
    g.font = 'bold 23px monospace';
    const neutral = state.mode === 'ready' || state.mode === 'countdown';
    g.fillText(neutral ? 'N' : String(state.gear || 1), 44, 17);
    g.font = 'bold 6px sans-serif';
    g.fillStyle = '#98a6a6';
    g.fillText(state.transmission === 'manual' ? 'MAN' : 'AUTO', 43, 24);
    const assist = state.absActive ? 'ABS' : state.tcActive ? 'TC' : '';
    g.fillStyle = assist ? '#f7b95c' : '#98a6a6';
    g.fillText(assist || (state.motorcycle?.model || 'r600').toUpperCase()+' · '+String(state.motorcycle?.number||27).padStart(2,'0'), -61, 23);
    if (state.transmission === 'manual' && rpm > redline*.88 && state.gear < 6) {
      g.fillStyle = rpm > redline*.97 ? '#ff664f' : '#efbd58';
      g.fillRect(-65, -26, 128, 3);
    }
    g.restore();
  }

  function paintCockpit(g,photo,width,height,top,kick) {
    if(Math.abs(kick)<.002){g.drawImage(photo,-width/2,top,width,height);return;}
    // Tank and fixed instrument housing stay planted. The triple clamp, grips
    // and the rider's wrists take the brief steering deflection independently.
    const bands=24;
    for(let i=0;i<bands;i++){
      const a=i/bands,b=(i+1)/bands,m=(a+b)*.5;
      const envelope=Math.max(0,1-Math.abs(m-.68)/.21);
      const shift=kick*width*.022*envelope*envelope;
      g.drawImage(photo,0,a*photo.height,photo.width,(b-a)*photo.height+.3,
        -width/2+shift,top+a*height,width,(b-a)*height+.3*height/photo.height);
    }
  }

  function drawCockpit(g, w, h, state) {
    const moving = clamp((state.speed || 0) / 85, 0, 1);
    const lean = clamp(state.lean || 0, -1, 1);
    const angle = (state.leanAngle ?? lean * 48 * moving) * Math.PI / 180;
    const pitch = clamp(state.pitch || 0, -1, 1);
    const heave = clamp(state.heave || 0, -1, 1);
    const shift = clamp(state.shift || 0, 0, 1);
    const fork = clamp(state.suspension || 0, -1, 1);
    const collision=window.ApexCollisionFX,shock=collision?.response(state);
    const down=shock?.down||0,side=shock?.side||1;
    const bob = moving * h * Math.sin((state.time || 0) * 25) * (state.offroad ? .0028 : .00055);
    g.save();
    g.translate(w * .5 + h * lean * .04, h * (.969 - pitch * .023 + fork * .017 + heave * .012 + Math.sin(shift*Math.PI) * .014) + bob);
    g.rotate(angle * .19 * (1-down));
    if (cockpit) {
      const height = clamp(w * .76, h * .84, h * 1.09);
      const width = height * cockpit.width / cockpit.height;
      const top = h * .031 - height * .775;
      const rainy = state.weather === 'rain';
      const photo = material(rainy ? (wetCockpit || relitCockpit || cockpit) : cockpit,state,'cockpit');
      const posed = matchHands(photo, state, rainy);
      const layers=state.crash&&collision&&down>.02?collision.cockpitLayers(photo):null;
      g.save();
      // The helmet camera is rolled by scenery. The motorcycle slides away
      // from the rider's eye rather than rotating a flat cockpit across it.
      if(down){
        g.translate(side*h*.22*down,h*.34*down);
        g.rotate(-side*.11*down);
        g.scale(1-down*.22,1-down*.16);
      }
      window.ApexMirrors?.drawCockpit(g,w,h,state,{width,height,top});
      paintCockpit(g,layers?.body||posed||photo,width,height,top,shock?.kick||0);
      const cover = weatherFX?.canopy(state) || 0;
      const roof = weatherFX?.shelter(state) || 0;
      const shade = Math.max(rainy ? cover*.04 : cover*.37, roof*.48);
      const neutralShade = rainy && wetCockpit ? wetCockpitShade : cockpitShade;
      if (neutralShade && shade > .012 && !layers) {
        g.globalAlpha = shade;
        g.drawImage(posed ? poseShade : neutralShade, -width / 2, top, width, height);
        g.globalAlpha = 1;
      }
      if(layers&&shade>.012){
        g.globalAlpha=shade;paintCockpit(g,layers.bodyShade,width,height,top,shock?.kick||0);g.globalAlpha=1;
      }
      lcd(g, width * .002, top + height * .453, width * .13, height * .106, state);
      g.restore();
      if(layers){
        // Hands release the grips and remain nearer the helmet during the slide.
        // Existing closed racing gloves read as protective hands without gore.
        g.save();g.translate(-side*h*.052*down,h*.18*down);
        g.rotate(side*.035*down);g.scale(1+down*.04,1+down*.03);
        g.drawImage(layers.hands,-width/2,top,width,height);
        if(shade>.012){g.globalAlpha=shade;g.drawImage(layers.handsShade,-width/2,top,width,height);}
        g.restore();
      }
    } else {
      // Simple cluster while optics load. Leave the center of the road unobstructed.
      const height=clamp(w*.76,h*.84,h*1.09);
      window.ApexMirrors?.drawCockpit(g,w,h,state,{width:height*1.5,height,top:h*.031-height*.775});
      const cw = Math.min(h * .64, w * .81);
      const path = new Path2D('M-100 8 L-90 -12 -64 -22 -42 -13 -28 -35 29 -35 44 -13 65 -22 91 -12 101 8 88 23 50 24 26 63 -23 63 -50 24 -87 23Z');
      g.scale(cw / 200, cw / 200);
      g.fillStyle = '#292831';
      g.fill(path);
      g.lineWidth = 2;
      g.strokeStyle = '#61565a';
      g.stroke(path);
      const config=window.ApexBikeGarage?.normalize(state.motorcycle);
      if(config){g.strokeStyle=window.ApexBikeGarage.palette(config).paint;g.lineWidth=4;g.stroke(path);}
      lcd(g, 0, -18, 54, 21, state);
    }
    g.restore();
  }

  function draw(g, w, h, state) {
    const rivals = window.ApexRivals;
    const pack = rivals?.visible(w, h, state) || [];
    rivals?.draw(g, w, h, state, pack, false);
    weatherFX?.rain(g, w, h, state);
    if (state.camera === 'cockpit') drawCockpit(g, w, h, state);
    else if (rider) photoChase(g, w, h, state);
    else drawFallbackRider(g, w, h, state);
    // A rider between the chase camera and our rear tire can overlap our bike.
    rivals?.draw(g, w, h, state, pack, true);
    weatherFX?.visor(g, w, h, state);
  }

  function drawGarage(g,w,h,configuration,view='studio') {
    const renderRide=(camera,motorcycle)=>{
      const model=window.ApexMotorcycles?.getModel(motorcycle.model);
      const state={mode:'ready',camera,motorcycle,garagePreview:true,weather:'clear',distance:0,lateral:0,speed:0,time:0,
        weatherTime:0,lean:0,leanAngle:0,pitch:0,heave:0,suspension:0,shift:0,clutch:0,brake:0,
        transmission:'manual',gear:1,frontLoad:.52,rpm:model?.physics.idleRpm||1300,
        redline:model?.physics.redline||14100,idleRpm:model?.physics.idleRpm||1300};
      g.save();
      if(camera==='chase') {
        g.translate(-w*.35,-h*.68);
        if(rider)photoChase(g,w*1.7,h*1.7,state);else drawFallbackRider(g,w*1.7,h*1.7,state);
      } else drawCockpit(g,w,h,state);
      g.restore();
    };
    if(window.ApexBikeGarage)window.ApexBikeGarage.draw(g,w,h,configuration,view,renderRide);
    else {g.clearRect(0,0,w,h);renderRide(view==='cockpit'?'cockpit':'chase',configuration||{});}
  }
  window.ApexBike = { draw, drawGarage };
})();

;
/* collision.js */
/* Swept motorcycle capsules in ground metres: x across the road, z along it.
   The road frame is locally planar over each physics step. */
window.ApexCollision = (() => {
  'use strict';
  const radius = .42, halfLength = .64;
  const mass = 270, recoverySeconds = 1.65;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = t => t * t * (3 - 2 * t);
  const dot = (a, b) => a.x * b.x + a.z * b.z;
  const sub = (a, b) => ({x: a.x - b.x, z: a.z - b.z});
  const mix = (a, b, t) => ({x: a.x + (b.x-a.x)*t, z: a.z + (b.z-a.z)*t});
  const norm = v => Math.hypot(v.x, v.z);

  function closest(a, b, c, d) {
    const u = sub(b, a), v = sub(d, c), w = sub(a, c);
    const aa = dot(u,u), bb = dot(u,v), cc = dot(v,v), dd = dot(u,w), ee = dot(v,w);
    const denominator = aa*cc-bb*bb;
    let s = denominator > 1e-12 ? clamp((bb*ee-cc*dd)/denominator,0,1) : 0;
    let t = cc > 1e-12 ? clamp((bb*s+ee)/cc,0,1) : 0;
    s = aa > 1e-12 ? clamp((bb*t-dd)/aa,0,1) : 0;
    t = cc > 1e-12 ? clamp((bb*s+ee)/cc,0,1) : 0;
    const p = mix(a,b,s), q = mix(c,d,t);
    return {p,q,gap:norm(sub(p,q))};
  }

  function hull(pose) {
    const heading = clamp(Math.atan2(pose.vx, Math.max(4, Math.abs(pose.vz))), -.58, .58);
    const x = Math.sin(heading)*halfLength, z = Math.cos(heading)*halfLength;
    return {a:{x:pose.x-x,z:pose.z-z}, b:{x:pose.x+x,z:pose.z+z}, r:pose.down?.48:radius};
  }

  function sweep(a0,a1,b0,b1) {
    const movement = Math.max(norm(sub(a1.a,a0.a)),norm(sub(a1.b,a0.b))) +
      Math.max(norm(sub(b1.a,b0.a)),norm(sub(b1.b,b0.b)));
    const sumRadius = Math.max(a0.r,a1.r) + Math.max(b0.r,b1.r);
    let t = 0;
    for (let i=0;i<28;i++) {
      const distance = closest(mix(a0.a,a1.a,t),mix(a0.b,a1.b,t),mix(b0.a,b1.a,t),mix(b0.b,b1.b,t));
      if (distance.gap <= sumRadius + .0005) {
        const v = sub(distance.p,distance.q);
        return {t,normal:distance.gap>.00001?{x:v.x/distance.gap,z:v.z/distance.gap}:null,
          depth:Math.max(0,sumRadius-distance.gap)};
      }
      if (movement<1e-9) return null;
      t += (distance.gap-sumRadius)/movement * .98;
      if(t>1) return null;
    }
    return null;
  }

  function create() {
    const bodies = new WeakMap();
    let serial = 0;
    function body(actor) {
      if (!bodies.has(actor)) bodies.set(actor,{slideZ:0,phaseAge:0,lastRail:null,
        nextRiderHit:0,elapsed:0,estimate:1,recoveryX:0,recovered:false});
      return bodies.get(actor);
    }
    function capture(actor,world) {
      const data = body(actor);
      return {x:actor.lateral*(world.roadHalf||4.65), z:actor.distance,
        vx:actor.lateralVelocity||0, vz:actor.crash?data.slideZ:actor.speed/3.6, down:!!actor.crash};
    }
    function setPose(actor,pose,world) {
      actor.distance = Math.max(0,pose.z);
      actor.lateral = pose.x/(world.roadHalf||4.65);
      actor.lateralVelocity = pose.vx;
      actor.speed = Math.abs(pose.vz)*3.6;
      if(actor.crash) body(actor).slideZ=pose.vz;
    }
    function tick(actor,dt) {
      const data = body(actor);
      data.elapsed += dt;
      actor.barrierContact=false;
      if(actor.impact) {
        actor.impact.age+=dt;
        actor.impact.scraping*=Math.exp(-12*dt);
        if(actor.impact.age>1.65 && actor.impact.scraping<.025)actor.impact=null;
      }
    }
    function crash(actor,side,velocity) {
      if(actor.crash || actor.finishTime!=null)return;
      const data=body(actor);
      actor.crashCount=(actor.crashCount||0)+1;
      actor.crash={phase:'fall',age:0,side,roll:0,progress:0,recoveryLeft:0};
      actor.recovering=false;
      data.slideZ=velocity.z;
      data.phaseAge=0;
      data.estimate=.42+norm(velocity)/(actor.weather==='rain'?4.1:6.2)+recoverySeconds;
      actor.throttle=0;
      actor.brake=0;
      actor.braking=false;
    }
    function impact(actor,type,side,normalSpeed,hard) {
      const data=body(actor);
      const severity=clamp((normalSpeed-.5)/(type==='rail'?14:17),0,1);
      actor.impact={id:++serial,age:0,type,side,normalSpeed,severity,scraping:0};
      if(hard)crash(actor,type==='rail'?-side:side,{x:actor.lateralVelocity,z:actor.speed/3.6});
    }
    function moveDown(actor,dt,world) {
      const data=body(actor), c=actor.crash;
      if(!c)return false;
      c.age+=dt;data.phaseAge+=dt;
      const half=world.roadHalf||4.65;
      actor.throttle=0;actor.brake=0;actor.braking=false;
      actor.clutch=0;actor.shift=0;
      actor.rpm+=(1300-actor.rpm)*(1-Math.exp(-7*dt));
      actor.pitch*=Math.exp(-7*dt);
      actor.frontLoad=.52;actor.suspension=0;actor.tcActive=false;actor.absActive=false;
      if(c.phase==='recover') {
        const t=clamp(data.phaseAge/recoverySeconds,0,1);
        c.roll=1.42*(1-smooth(t));actor.leanAngle=c.side*c.roll*180/Math.PI;actor.lean=c.side*Math.min(1,c.roll/.89);c.progress=.80+.20*t;c.recoveryLeft=Math.max(0,recoverySeconds-data.phaseAge);
        actor.speed=0;actor.lateralVelocity=0;data.slideZ=0;
        // Picking up the bike can bring it at most one metre off the shoulder.
        const step=clamp(data.recoveryX-actor.lateral*half,-.7*dt,.7*dt);
        actor.lateral+=step/half;
        if(t>=1){actor.crash=null;actor.recovering=false;data.recovered=true;actor.lean=0;actor.leanAngle=0;actor.gear=1;}
        return true;
      }
      const wet=actor.weather==='rain'?(world.surfaceWetness?.(actor.distance,actor.lateral)??.5):0;
      const offroad=Math.abs(actor.lateral)>1;
      const coefficient=offroad?.72:(.62-.27*wet);
      const velocity={x:actor.lateralVelocity,z:data.slideZ}, speed=norm(velocity);
      const decel=9.81*coefficient+.0006*speed*speed;
      const factor=speed>.001?Math.max(0,1-decel*dt/speed):0;
      const next={x:velocity.x*factor,z:velocity.z*factor};
      const grade=world.grade?.(actor.distance)||0;
      if(speed>1)next.z-=grade*9.81*dt;
      const curve=world.curvature?.(actor.distance)||0;
      const rotation=curve*(velocity.z+next.z)*.5*dt;
      const cosine=Math.cos(rotation),sine=Math.sin(rotation),cross=next.x;
      next.x=cross*cosine-next.z*sine;
      next.z=next.z*cosine+cross*sine;
      actor.distance=Math.max(0,actor.distance+(velocity.z+next.z)*dt*.5);
      actor.lateral+=(velocity.x+next.x)*dt*.5/half;
      actor.lateralVelocity=next.x;data.slideZ=next.z;actor.speed=Math.abs(next.z)*3.6;
      actor.accel=-decel;
      actor.heave=(Math.sin(c.age*41)*.18+Math.sin(c.age*69)*.09)*Math.min(1,speed/18);
      c.roll=1.42*smooth(clamp(c.age/.42,0,1));
      c.progress=Math.min(.79,c.age/data.estimate);
      actor.leanAngle=c.side*c.roll*180/Math.PI;actor.lean=c.side*Math.min(1,c.roll/.89);
      if(c.phase==='fall' && c.age>=.42){c.phase='slide';data.phaseAge=0;}
      if(c.phase==='slide' && Math.hypot(next.x,next.z)<1.2){
        c.phase='recover';c.recoveryLeft=recoverySeconds;c.progress=.8;data.phaseAge=0;actor.recovering=true;
        actor.speed=0;actor.lateralVelocity=0;data.slideZ=0;
        const current=actor.lateral*half;
        data.recoveryX=clamp(current,-half*.88,half*.88);
        data.recoveryX=clamp(data.recoveryX,current-1,current+1);
      }
      return true;
    }
    function tookRecovery(actor) {
      const data=body(actor), recovered=data.recovered;
      data.recovered=false;
      return recovered;
    }

    function rails(from,to,world) {
      const shapes=[];
      const begin=Math.floor((Math.min(from.z,to.z)-3)/.2)*.2;
      const end=Math.ceil((Math.max(from.z,to.z)+3)/.2)*.2;
      for(const side of [-1,1]) {
        const offset=d=>world.collisionRailOffset?world.collisionRailOffset(d,side):
          world.hasRail?.(d,side)?(world.railOffset||5.58)-.095:Infinity;
        let start=begin, previous=offset(begin+.00001);
        function add(stop) {
          if(!Number.isFinite(previous)||stop<=start)return;
          const inner=side*previous, outer=side*Math.max(previous+.25,(world.railOffset||5.58)+.35);
          const points=[{x:inner,z:start},{x:inner,z:stop},{x:outer,z:stop},{x:outer,z:start}];
          for(let j=0;j<4;j++)shapes.push({a:points[j],b:points[(j+1)%4],r:0,side});
        }
        for(let d=begin+.2;d<=end+.0001;d+=.2) {
          const next=offset(d+.00001);
          if(next!==previous) {add(d);start=d;previous=next;}
        }
        add(end);
      }
      return shapes;
    }

    function finishFraction(from,to,length) {
      return to.z>from.z && to.z>=length?clamp((length-from.z)/(to.z-from.z),0,1):1;
    }
    function rail(actor,from,dt,world,length) {
      const data=body(actor), proposed=capture(actor,world);
      if(actor.finishTime!=null)return;
      let current={...from}, destination={...proposed}, remaining=dt;
      let touching=false;
      for(let attempt=0;attempt<3;attempt++) {
        let nearest=null;
        const a0=hull(current),a1=hull(destination);
        for(const segment of rails(current,destination,world)) {
          const hit=sweep(a0,a1,segment,segment);
          if(!hit || hit.t>finishFraction(current,destination,length))continue;
          if(!hit.normal)hit.normal={x:-segment.side,z:0};
          const closing=-(destination.vx*hit.normal.x+destination.vz*hit.normal.z);
          if(closing<=.001 && hit.depth<.001)continue;
          if(!nearest||hit.t<nearest.t)nearest={...hit,side:segment.side,closing};
        }
        if(!nearest)break;
        const hit=nearest,n=hit.normal;
        touching=true;actor.barrierContact=true;
        const contact=mix(current,destination,hit.t);
        contact.x+=n.x*(hit.depth+.002);contact.z+=n.z*(hit.depth+.002);
        const inward=Math.max(0,hit.closing);
        const restitution=actor.crash?.0:.055;
        let vx=destination.vx+n.x*inward*(1+restitution);
        let vz=destination.vz+n.z*inward*(1+restitution);
        const tangent={x:-n.z,z:n.x}, along=vx*tangent.x+vz*tangent.z;
        const loss=Math.min(Math.abs(along),inward*.13+Math.abs(along)*.08*remaining);
        vx-=tangent.x*Math.sign(along)*loss;vz-=tangent.z*Math.sign(along)*loss;
        actor.lateralVelocity=vx;actor.speed=Math.abs(vz)*3.6;
        const newContact=!data.lastRail||data.elapsed-data.lastRail.time>.23||data.lastRail.side!==hit.side;
        if(newContact && inward>.35) {
          const hard=inward>5.2 || (inward>3.9 && Math.abs(proposed.vz)>32 && Math.abs(actor.leanAngle)>31);
          impact(actor,'rail',hit.side,inward,hard);
          data.lastRail={time:data.elapsed,side:hit.side};
        } else if(data.lastRail)data.lastRail.time=data.elapsed;
        if(actor.crash)data.slideZ=vz;
        if(actor.impact?.type==='rail')actor.impact.scraping=clamp(Math.abs(along)/52,0,1);
        remaining*=1-hit.t;
        current={...contact,vx,vz,down:!!actor.crash};
        destination={x:contact.x+vx*remaining,z:contact.z+vz*remaining,vx,vz,down:!!actor.crash};
      }
      if(touching)setPose(actor,destination,world);
      // The recoverable soft verge stops a slide outside the modelled shoulders.
      const limitX=(world.roadHalf||4.65)*1.65;
      const x=actor.lateral*(world.roadHalf||4.65);
      if(Math.abs(x)>limitX){actor.lateral=clamp(x,-limitX,limitX)/(world.roadHalf||4.65);actor.lateralVelocity=0;}
    }

    function pair(a,b,startA,startB,dt,world,length) {
      if(a.finishTime!=null||b.finishTime!=null)return;
      const endA=capture(a,world),endB=capture(b,world);
      if(Math.min(Math.abs(startA.z-startB.z),Math.abs(endA.z-endB.z))>5 &&
         (startA.z-startB.z)*(endA.z-endB.z)>0)return;
      const hit=sweep(hull(startA),hull(endA),hull(startB),hull(endB));
      if(!hit || hit.t>Math.min(finishFraction(startA,endA,length),finishFraction(startB,endB,length)))return;
      const normal=hit.normal||{x:startA.x>=startB.x?1:-1,z:0};
      const relative={x:endA.vx-endB.vx,z:endA.vz-endB.vz};
      const closing=-dot(relative,normal);
      if(closing<=.002 && hit.depth<.001)return;
      const inverseMass=1/mass;
      const impulse=Math.max(0,closing)*1.08/(2*inverseMass);
      const tangent={x:-normal.z,z:normal.x};
      const friction=clamp(-dot(relative,tangent)/(2*inverseMass),-impulse*.16,impulse*.16);
      const delta={x:(normal.x*impulse+tangent.x*friction)*inverseMass,
        z:(normal.z*impulse+tangent.z*friction)*inverseMass};
      endA.vx+=delta.x;endA.vz+=delta.z;endB.vx-=delta.x;endB.vz-=delta.z;
      const pointA=mix(startA,endA,hit.t),pointB=mix(startB,endB,hit.t);
      const separate=(hit.depth+.002)*.5;
      const remainder=dt*(1-hit.t);
      endA.x=pointA.x+normal.x*separate+endA.vx*remainder;
      endA.z=pointA.z+normal.z*separate+endA.vz*remainder;
      endB.x=pointB.x-normal.x*separate+endB.vx*remainder;
      endB.z=pointB.z-normal.z*separate+endB.vz*remainder;
      setPose(a,endA,world);setPose(b,endB,world);
      const dataA=body(a),dataB=body(b);
      if(closing>.65 && dataA.elapsed>=dataA.nextRiderHit && dataB.elapsed>=dataB.nextRiderHit) {
        const sideA=normal.x>.04?-1:normal.x<-.04?1:(startB.x>=startA.x?1:-1);
        const hard=closing>8.5 || (Math.abs(normal.x)>.65 && closing>4.8 && Math.max(a.speed,b.speed)>90);
        impact(a,'rider',sideA,closing,hard);impact(b,'rider',-sideA,closing,hard);
        if(a.crash)dataA.slideZ=endA.vz;if(b.crash)dataB.slideZ=endB.vz;
        dataA.nextRiderHit=dataB.nextRiderHit=Math.max(dataA.elapsed,dataB.elapsed)+.32;
      }
    }

    function resolve(actors,starts,dt,world,length) {
      for(let i=0;i<actors.length;i++)rail(actors[i],starts[i],dt,world,length);
      for(let i=0;i<actors.length-1;i++)for(let j=i+1;j<actors.length;j++) {
        // A crossing already completed in this step belongs to the finish result.
        if(actors[i].distance>=length && starts[i].z>=length)continue;
        pair(actors[i],actors[j],starts[i],starts[j],dt,world,length);
      }
      for(let i=0;i<actors.length;i++)if(actors[i].distance<length)rail(actors[i],capture(actors[i],world),0,world,length);
    }
    return {capture,tick,moveDown,tookRecovery,resolve};
  }
  return {create};
})();

;
/* race.js */
/* Cape Meridian's timed grid. All race clocks advance on the physics step. */
window.ApexRace = (() => {
  'use strict';

  const grid = [
    { id: 'silva', name: 'Silva', color: '#e5a52b', number: 27, start: 22, lane: -.38,
      reaction: .21, top: 55.5, corner: 8.35, braking: 7.5, launch: 10.65 },
    { id: 'park', name: 'Park', color: '#26c5b3', number: 64, start: 14, lane: .38,
      reaction: .26, top: 57.5, corner: 7.75, braking: 6.9, launch: 10.20 },
    { id: 'moreau', name: 'Moreau', color: '#698eea', number: 19, start: 7, lane: -.38,
      reaction: .31, top: 53.7, corner: 8.0, braking: 7.25, launch: 9.45 }
  ];
  const gateSpacing = 50;
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  function create(length, collisions) {
    const drivers = grid.map((spec, i) => ({
      spec, planTime: -1, targetSpeed: 0, targetLane: spec.lane,
      bike: { id: spec.id, name: spec.name, color: spec.color, number: spec.number,
        distance: spec.start, lateral: spec.lane, lateralVelocity: 0, speed: 0,
        leanAngle: 0, lean:0, pitch: 0, rpm:1300, crash:null, crashCount:0, impact:null, recovering:false, braking: false, finishTime: null, gridOrder: i }
    }));
    const rivals = drivers.map(d => d.bike);
    const gates = new Map([...rivals.map(r => r.id), 'player'].map(id =>
      [id, new Float64Array(Math.ceil(length / gateSpacing) + 1).fill(-1)]));
    let stepSnapshot = null;

    function recordGates(id, before, after, startTime, dt) {
      const first = Math.floor(before / gateSpacing) + 1;
      const last = Math.floor(Math.min(length, after) / gateSpacing);
      for (let gate = first; gate <= last; gate++) {
        if (gates.get(id)[gate] < 0) gates.get(id)[gate] = startTime + dt * (gate * gateSpacing - before) / (after - before);
      }
    }

    // Plan a braking profile from the actual curvature and surface ahead; opponents
    // never use player position to set their engine power or straight-line speed.
    function plan(driver, traffic, world, rain, time) {
      const { spec, bike } = driver;
      const speed = bike.speed / 3.6;
      let target = spec.top * (rain ? .945 : 1);
      for (let look = 0; look <= 180; look += 10) {
        const d = bike.distance + look;
        const grip = rain ? .84 - .17 * (world.surfaceWetness?.(d, bike.lateral) ?? .5) : 1;
        const curvature = Math.abs(world.curvature(d));
        const bendSpeedSq = spec.corner * grip / Math.max(.0001, curvature);
        target = Math.min(target, Math.sqrt(bendSpeedSq + 2 * spec.braking * grip * look));
      }
      const upcoming = world.curvature(bike.distance + 30 + speed * .45);
      const apex = clamp(world.curvature(bike.distance) * 72 - upcoming * 25, -.47, .47);
      const preferred = clamp(apex + spec.lane * .41 + .14 * Math.sin(bike.distance / 230 + bike.gridOrder * 2), -.7, .7);
      let bestLane = preferred, bestCost = Infinity;
      for (const lane of [preferred, -.69, -.29, .26, .68]) {
        let cost = Math.abs(lane - preferred) + .46 * Math.abs(lane - driver.targetLane);
        for (const other of traffic) {
          if (other === bike || other.finishTime != null) continue;
          const gap = other.distance - bike.distance;
          if (gap < -15 || gap > 43) continue;
          const projectedGap = gap + (other.speed / 3.6 - speed) * .65;
          const space = clamp(1 - Math.abs(projectedGap) / (projectedGap < 0 ? 9 : 30), 0, 1);
          const across = clamp(1 - Math.abs(lane - other.lateral) / .58, 0, 1);
          cost += 7.3 * space * across;
        }
        if (cost < bestCost) { bestCost = cost; bestLane = lane; }
      }
      // Leave a stopping margin until a passing lane has actually opened.
      for (const other of traffic) {
        if (other === bike || other.finishTime != null) continue;
        const gap = other.distance - bike.distance;
        if (gap <= 0 || gap > 22 || Math.abs(bike.lateral - other.lateral) > .24) continue;
        target = Math.min(target, Math.sqrt((other.speed / 3.6) ** 2 + 2 * 8 * Math.max(0, gap - 3.0)));
      }
      driver.targetSpeed = target;
      driver.targetLane = bestLane;
      driver.planTime = time + .105 + .009 * bike.gridOrder;
    }

    function advanceRider(driver, traffic, world, rain, startTime, dt) {
      const { bike, spec } = driver;
      const old = bike.distance, v = bike.speed / 3.6;
      if (bike.finishTime != null) {
        bike.speed = Math.max(0, bike.speed - 7.5 * dt);
        bike.distance += (bike.speed / 3.6 + v) * dt * .5;
        bike.leanAngle *= Math.exp(-2 * dt);
        bike.braking = bike.speed > 2;
        return;
      }
      bike.weather=rain?'rain':'clear';
      if(collisions.moveDown(bike,dt,world)) {
        if(collisions.tookRecovery(bike)) driver.planTime=-1;
        return;
      }
      if (startTime < spec.reaction) return;
      if (startTime >= driver.planTime) plan(driver, traffic, world, rain, startTime);
      const traction = rain ? .78 : 1;
      const power = spec.launch * traction * (1 - .66 * (v / spec.top) ** 1.55);
      const grade = world.grade?.(old) || 0;
      const accel = clamp((driver.targetSpeed - v) * 2.8, -spec.braking * traction, Math.max(.5, power)) - grade * 9.81;
      const newV = Math.max(0, v + accel * dt);
      bike.speed = newV * 3.6;
      bike.braking = accel < -1.5;
      bike.pitch += (clamp(accel / 11, -1, 1) - bike.pitch) * (1 - Math.exp(-7 * dt));
      const halfWidth = world.roadHalf || 4.65;
      const desiredSideSpeed = clamp((driver.targetLane - bike.lateral) * halfWidth * 1.8, -2.55, 2.55);
      const oldSideSpeed = bike.lateralVelocity;
      bike.lateralVelocity += (desiredSideSpeed - oldSideSpeed) * (1 - Math.exp(-3.2 * dt));
      bike.lateral += bike.lateralVelocity * dt / halfWidth * Math.min(1, newV / 6);
      const sideAccel = v * v * world.curvature(old) + (bike.lateralVelocity - oldSideSpeed) / dt;
      const bank = clamp(Math.atan(sideAccel / 9.81) * 180 / Math.PI, -49, 49);
      bike.leanAngle += (bank - bike.leanAngle) * (1 - Math.exp(-4.8 * dt));
      bike.distance = old + (v + newV) * dt * .5;
    }

    function advance(player, playerStart, dt, world) {
      const startTime = player.time - dt;
      const traffic = [player, ...rivals];
      const starts = [playerStart,...rivals.map(bike=>collisions.capture(bike,world))];
      stepSnapshot={startTime,dt,starts:starts.slice(1)};
      for (const driver of drivers) {
        collisions.tick(driver.bike,dt);
        advanceRider(driver, traffic, world, player.weather === 'rain', startTime, dt);
      }
      collisions.resolve(traffic,starts,dt,world,length);
      recordGates('player',playerStart.z,player.distance,startTime,dt);
      for(let i=0;i<rivals.length;i++){
        const bike=rivals[i],before=starts[i+1].z;
        if(bike.finishTime!=null)continue;
        recordGates(bike.id,before,bike.distance,startTime,dt);
        if(bike.distance>=length && bike.distance>before)
          bike.finishTime=startTime+dt*(length-before)/(bike.distance-before);
      }
      return place(player);
    }

    function finishAt(time) {
      if(!stepSnapshot)return;
      const fraction=clamp((time-stepSnapshot.startTime)/stepSnapshot.dt,0,1);
      rivals.forEach((bike,i)=>{
        const before=stepSnapshot.starts[i];
        bike.distance=before.z+(bike.distance-before.z)*fraction;
        if(bike.finishTime>time)bike.finishTime=null;
      });
    }

    function place(player) {
      return 1 + rivals.filter(r => r.finishTime != null
        ? player.distance < length || Math.round(r.finishTime * 1000) < Math.round(player.time * 1000)
        : r.distance >= player.distance).length;
    }

    function classification(player) {
      const entries = [...rivals, { id: 'player', name: 'You', color: '#ee6145', number: null,
        distance: player.distance, gridOrder: 3, finishTime: player.distance >= length ? player.time : null }];
      const finishMs = r => r.finishTime == null ? Infinity : Math.round(r.finishTime * 1000);
      entries.sort((a, b) => {
        const left = finishMs(a), right = finishMs(b);
        if (left !== right) return left - right;
        return left < Infinity ? a.gridOrder - b.gridOrder : b.distance - a.distance || a.gridOrder - b.gridOrder;
      });
      const leader = entries[0], leaderGates = gates.get(leader.id);
      let position = 1;
      return entries.map((entry, i) => {
        if (i && (entry.finishTime == null || finishMs(entry) !== finishMs(entries[i - 1]))) position = i + 1;
        const distance = Math.min(length, entry.distance);
        const gate = Math.floor(distance / gateSpacing);
        const last = gates.get(entry.id)[gate];
        const bothFinished = leader.finishTime != null && entry.finishTime != null;
        let gapSeconds = null;
        if (!i) gapSeconds = 0;
        else if (bothFinished) gapSeconds = Math.max(0, entry.finishTime - leader.finishTime);
        else if (leaderGates[gate] >= 0 && last >= leaderGates[gate] && player.time-last <= 3) gapSeconds = last - leaderGates[gate];
        return { id: entry.id, name: entry.name, color: entry.color, number: entry.number,
          isPlayer: entry.id === 'player', position, distance, finishTime: entry.finishTime, gapSeconds,
          gapDistance: Math.max(0, Math.min(length, leader.distance) - distance),
          gapAt: gapSeconds == null ? null : bothFinished ? length : gate * gateSpacing };
      });
    }

    return { rivals, advance, classification, finishAt, position:place };
  }

  return { create };
})();

;
/* engine.js */
(() => {
  'use strict';

  // Native hosts drive the same simulation explicitly; browser ownership remains
  // unchanged when this adapter is absent. No DOM shims or duplicate physics.
  const host = window.ApexHost;
  const storage = host?.storage || {
    getItem:key => localStorage.getItem(key),
    setItem:(key,value) => localStorage.setItem(key,value)
  };
  const now = () => host?.now ? host.now() : performance.now();
  const emit = (name, detail) => host ? host.emit?.(name, detail) :
    window.dispatchEvent(new CustomEvent(name, {detail}));

  const LENGTHS = { coast: 4800, sierra: 4000, london: 6000 };
  const REDLINE = 14100;
  const SHIFT_INTERVAL = 0.42;
  const GRAVITY = 9.81;
  const MAX_LEAN = 51;
  const DEG = Math.PI / 180;
  const RECORD_KEYS = {
    sierra: { clear: 'apex-run.sierra-pass.4000m.v2', rain: 'apex-run.sierra-pass.4000m.rain.v3' },
    coast: { clear: 'apex-run.cape-meridian.4800m.clear.v1', rain: 'apex-run.cape-meridian.4800m.rain.v1' },
    london: { clear: 'apex-run.a3-london.6000m.clear.v1', rain: 'apex-run.a3-london.6000m.rain.v1' }
  };
  const COURSE_KEY = 'apex-run.course.v1';
  const WEATHER_KEYS = { sierra: 'apex-run.weather.v3', coast: 'apex-run.coast.weather.v1', london: 'apex-run.london.weather.v1' };
  const TRANSMISSION_KEY = 'apex-run.transmission.v3';
  const CAMERA_KEY = 'apex-run.camera.v1';
  const SOUND_KEY = 'apex-run.audio.v1';
  const MOTORCYCLE_KEY = 'apex-run.motorcycle.v1';
  const motionPreference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reducedMotion=motionPreference?.matches??false;
  motionPreference?.addEventListener('change',event=>{reducedMotion=event.matches;});
  // Road speed in km/h at redline and maximum wheel thrust in m/s² for each gear.
  const gearing = [97, 132, 162, 191, 222, 254];
  const wheelThrust = [10.5, 8.1, 7.0, 5.75, 4.95, 4.25];
  // Standalone engine fixtures can still ride the original R600 without the
  // optional garage catalogue. The released game loads motorcycles.js first.
  const baseProfile = window.ApexMotorcycles?.getModel('r600').physics || {
    redline:REDLINE,idleRpm:1300,launchRpm:3700,gearing,wheelThrust,
    upshiftRpm:13250,downshiftRpm:6600,brakingDownshiftRpm:7200,
    torqueBase:.56,torquePeak:.44,engineBraking:1,limiterRange:440,
    agility:1,stability:2.2,brakeForce:12.2,aeroDrag:.00072,
    loadTransfer:.375,springRate:185,springDamping:16,
    firing:[0,270,450,540],exhaustTone:1,intakeTone:1,exhaustGain:1,intakeGain:1
  };
  const legacyConfig = () => ({model:'r600',paint:'vermilion',accent:'ivory',wheels:'graphite',livery:'solid',number:27});
  const motorcycles = window.ApexMotorcycles || {
    models:[{id:'r600',physics:baseProfile}],defaultConfig:legacyConfig,
    normalize:legacyConfig,getModel:()=>({id:'r600',physics:baseProfile}),key:()=> 'r600'
  };
  const recordKey = (route,condition,model) => RECORD_KEYS[route][condition] + (model === 'r600' ? '' : '.' + model);
  const limit = (v, low, high) => Math.max(low, Math.min(high, v));
  const follow = (value, target, rate, dt) => value + (target - value) * (1 - Math.exp(-rate * dt));
  const keyActions = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'throttle', KeyW: 'throttle', ArrowDown: 'brake', KeyS: 'brake'
  };
  const keyboard = new Set();
  const touch = new Set();
  const touchInput = { steer: 0, throttle: 0, brake: 0 };
  const blockedKeys = new Set();

  const records = Object.fromEntries(motorcycles.models.map(model => [model.id,
    Object.fromEntries(Object.keys(LENGTHS).map(route => [route,{clear:null,rain:null}]))]));
  const weatherByCourse = { sierra: 'rain', coast: 'clear', london: 'clear' };
  let course = 'coast', race = null, collisions = null;
  let sound = true;
  let camera = 'cockpit', gearbox = 'auto';
  let menuOpen = false;
  let motorcycle = motorcycles.defaultConfig();
  try { motorcycle = motorcycles.normalize(JSON.parse(storage.getItem(MOTORCYCLE_KEY))); } catch {}
  let profile = motorcycles.getModel(motorcycle.model).physics;
  try {
    camera = storage.getItem(CAMERA_KEY) === 'chase' ? 'chase' : 'cockpit';
    const savedCourse = storage.getItem(COURSE_KEY);
    if (Object.hasOwn(LENGTHS,savedCourse)) course = savedCourse;
    for (const route of Object.keys(LENGTHS)) {
      const savedWeather = storage.getItem(WEATHER_KEYS[route]);
      if (savedWeather === 'clear' || savedWeather === 'rain') weatherByCourse[route] = savedWeather;
    }
    gearbox = storage.getItem(TRANSMISSION_KEY) === 'manual' ? 'manual' : 'auto';
    sound = storage.getItem(SOUND_KEY) !== 'off';
  } catch { /* Racing also works without browser storage. */ }
  let weather = weatherByCourse[course];
  window.ApexWorld?.selectCourse?.(course);
  for (const model of motorcycles.models) {
    for (const [route, keys] of Object.entries(RECORD_KEYS)) {
      for (const condition of Object.keys(keys)) {
        const key = recordKey(route,condition,model.id);
        try {
          const saved = JSON.parse(storage.getItem(key));
          if (saved && Number.isFinite(saved.time) && saved.time > 0 &&
              Array.isArray(saved.splits) && saved.splits.length === 3 &&
              saved.splits.every(value => Number.isFinite(value) && value > 0)) {
            records[model.id][route][condition] = saved;
          }
        } catch { /* Other course records still load if one is unavailable. */ }
      }
    }
  }

  function newRun() {
    profile = motorcycles.getModel(motorcycle.model).physics;
    const record = records[motorcycle.model][course][weather];
    const length = LENGTHS[course];
    collisions=window.ApexCollision.create();
    race = course === 'coast' || course === 'london' ? window.ApexRace.create(length,collisions) : null;
    return {
      mode: 'ready', countdown: 3, speed: 0, gear: 1, distance: 0,
      impact:null, crash:null, crashCount:0, recovering:false,
      course, length, rivals: race?.rivals ?? [], racePosition: race ? 4 : null, time: 0, sector: 1, track: 0, splits: [null, null, null],
      best: record?.time ?? null, bestSplits: record?.splits.slice() ?? [null, null, null],
      sound, camera, weather, weatherTime: 0, transmission: gearbox,
      motorcycle: {...motorcycle}, redline: profile.redline, idleRpm: profile.idleRpm,
      wetness: weather === 'rain' ? (window.ApexWorld?.surfaceWetness?.(0, 0.40) ?? 0.5) : 0,
      shelter: 0, slip: 0, tcActive: false, absActive: false, frontLoad: 0.52, suspension: 0,
      offroad: false, barrierContact: false, lean: 0, lateral: 0.40, braking: false, isRecord: false,
      leanAngle: 0, rpm: profile.idleRpm, accel: 0, pitch: 0, heave: 0, shift: 0, clutch: 0, throttle: 0,
      brake: 0, lateralVelocity: 0, curvature: 0, grade: 0, gripUsage: 0
    };
  }

  let state = newRun();
  let pausedMode = null;
  let countdownRemaining = 3;
  let lastSplitTime = 0;
  let previousFrame = null;
  let scheduled = false;
  let lastUpdate = -Infinity;
  let canvas, ctx, width = 0, height = 0, pixelRatio = 1;
  let audioContext, motor;
  let springVelocity = 0, blip = 0, lastImpactSound = 0;
  const pad = { id: '', armed: false, steer: 0, gas: 0, brake: 0, up: false, down: false };
  let rollRate = 0, shiftRemaining = 0, shiftDuration = 0.19, shiftLock = 0;

  function getState() {
    return { ...state, menuOpen, motorcycle: {...state.motorcycle}, splits: state.splits.slice(), bestSplits: state.bestSplits.slice(),
      impact:state.impact?{...state.impact}:null,crash:state.crash?{...state.crash}:null,
      rivals: state.rivals.map(rider => ({ ...rider,impact:rider.impact?{...rider.impact}:null,crash:rider.crash?{...rider.crash}:null })), classification: race?.classification(state) ?? [] };
  }

  function publish() {
    emit('apex:update', getState());
  }

  // Fourier series for a repeating 720° four-stroke cycle. Uneven crossplane
  // firing intervals (270/180/90/180°) give the exhaust a pulsing low register.
  function firingWave(intake, rideProfile = baseProfile) {
    const count = 64;
    const real = new Float32Array(count), imag = new Float32Array(count);
    const firing = rideProfile.firing.map(angle => angle / 720);
    for (let n = 1; n < count; n++) {
      const slope = intake ? 0.82 : 0.58;
      const decay = Math.exp(-n / (intake ? 16 : 34)) / Math.pow(n, slope);
      firing.forEach((phase, i) => {
        const weight = (intake ? [0.8, 1, 0.86, 0.93] : [1, 0.91, 0.95, 0.86])[i];
        real[n] += weight * decay * Math.cos(n * phase * Math.PI * 2);
        imag[n] -= weight * decay * Math.sin(n * phase * Math.PI * 2);
      });
    }
    return audioContext.createPeriodicWave(real, imag);
  }

  function buildMotor() {
    const ac = audioContext;
    const gain = () => { const g = ac.createGain(); g.gain.value = 0; return g; };
    const filter = (type, frequency, q) => {
      const f = ac.createBiquadFilter();
      f.type = type; f.frequency.value = frequency; f.Q.value = q;
      return f;
    };
    const master = gain();
    master.connect(ac.destination);
    const waves = Object.fromEntries(motorcycles.models.map(model => [model.id, [firingWave(false,model.physics),firingWave(true,model.physics)]]));
    function voice(intake) {
      const osc = ac.createOscillator();
      osc.setPeriodicWave(waves[motorcycle.model][Number(intake)]);
      const tone = filter(intake ? 'bandpass' : 'lowpass', intake ? 870 : 1500, intake ? 0.85 : 0.55);
      const level = gain();
      osc.connect(tone); tone.connect(level); level.connect(master); osc.start();
      return { osc, tone, level };
    }
    const exhaust = voice(false), intake = voice(true);
    const length = ac.sampleRate * 2;
    const noiseBuffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ac.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const wind = filter('lowpass', 550, 0.45), windLevel = gain();
    const road = filter('bandpass', 170, 0.78), roadLevel = gain();
    noise.connect(wind); wind.connect(windLevel); windLevel.connect(master);
    noise.connect(road); road.connect(roadLevel); roadLevel.connect(master);
    const impactFilter=filter('bandpass',900,1.2),impactLevel=gain(),impactPan=ac.createStereoPanner?.();
    noise.connect(impactFilter);impactFilter.connect(impactLevel);
    if(impactPan){impactLevel.connect(impactPan);impactPan.connect(master);}else impactLevel.connect(master);
    noise.start();
    // Irregular damped droplets on the visor/tank. A separate buffer keeps
    // individual ticks audible against the continuous wet tyre spray.
    const drops = ac.createBuffer(1, length, ac.sampleRate);
    const dropsData = drops.getChannelData(0);
    for (let i = 0; i < 440; i++) {
      const start = Math.floor(Math.random() * length);
      const span = 0.002 + Math.random() * 0.012;
      const freq = 720 + Math.random() * 3100;
      const force = 0.05 + Math.pow(Math.random(), 3) * 0.41;
      for (let j = 0; j < span * ac.sampleRate; j++) {
        const t = j / ac.sampleRate;
        dropsData[(start + j) % length] += force * Math.exp(-5 * t / span) *
          (Math.sin(2 * Math.PI * freq * t) + (Math.random() - 0.5) * 0.64);
      }
    }
    const rain = ac.createBufferSource(), rainLevel = gain();
    rain.buffer = drops; rain.loop = true;
    rain.connect(rainLevel); rainLevel.connect(master); rain.start();
    // The concrete roof and back wall return early reflections. The open
    // side limits the decay. Only the engine and road feed this acoustic space.
    const shedSend = gain(), shedReturn = gain();
    exhaust.level.connect(shedSend); intake.level.connect(shedSend); roadLevel.connect(shedSend);
    const reflected = filter('lowpass', 3100, 0.5);
    shedSend.connect(reflected);
    for (const [seconds, strength] of [[0.019, 0.47], [0.041, 0.29], [0.078, 0.19]]) {
      const delay = ac.createDelay(0.12), reflection = gain();
      delay.delayTime.value = seconds;
      reflection.gain.value = strength;
      reflected.connect(delay); delay.connect(reflection); reflection.connect(shedReturn);
      if (seconds > 0.07) {
        const feedback = gain();
        feedback.gain.value = 0.27;
        reflection.connect(feedback); feedback.connect(delay);
      }
    }
    shedReturn.connect(master);
    const packWave = firingWave(false);
    const pack = [0, 1, 2].map(i => {
      const osc = ac.createOscillator(), volume = gain();
      const tone = filter('lowpass', 1200 + i * 160, 0.6);
      const stereo = ac.createStereoPanner?.();
      osc.setPeriodicWave(packWave);
      osc.connect(tone); tone.connect(volume);
      if (stereo) { volume.connect(stereo); stereo.connect(master); }
      else volume.connect(master);
      osc.start();
      return { osc, tone, volume, stereo };
    });
    return { waves,model:motorcycle.model,impactFilter,impactLevel,impactPan,pack, shedSend, shedReturn, rainLevel, master, exhaust, intake, wind, windLevel, road, roadLevel };
  }

  function unlockAudio() {
    if (!sound || host?.manual) return;
    try {
      if (!audioContext) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        audioContext = new Audio();
        motor = buildMotor();
      }
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    } catch { /* An unavailable audio device never interrupts a race. */ }
  }

  function beep(pitch, duration = 0.10) {
    if (!sound || !audioContext || audioContext.state !== 'running') return;
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    const t = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.value = pitch;
    envelope.gain.setValueAtTime(0.001, t);
    envelope.gain.exponentialRampToValueAtTime(0.085, t + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.001, t + duration);
    oscillator.connect(envelope);
    envelope.connect(audioContext.destination);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(t);
    oscillator.stop(t + duration + 0.01);
  }

  function playImpact(hit) {
    if (!sound || !motor || audioContext.state !== 'running') return;
    const source=audioContext.createOscillator(),gain=audioContext.createGain();
    const t=audioContext.currentTime,metal=hit.type==='rail',force=hit.severity;
    source.type=metal?'triangle':'sine';
    source.frequency.setValueAtTime((metal?210:112)+force*110,t);
    source.frequency.exponentialRampToValueAtTime(metal?48:34,t+.15);
    gain.gain.setValueAtTime(.001,t);
    gain.gain.exponentialRampToValueAtTime(.18+force*.48,t+.004);
    gain.gain.exponentialRampToValueAtTime(.001,t+.24);
    source.connect(gain);
    gain.connect(motor.impactPan||motor.master);
    motor.impactPan?.pan.setTargetAtTime(hit.side*.74,t,.015);
    motor.impactFilter.frequency.setValueAtTime(metal?2200:430,t);
    motor.impactLevel.gain.cancelScheduledValues(t);
    motor.impactLevel.gain.setValueAtTime(.02,t);
    motor.impactLevel.gain.linearRampToValueAtTime((metal?.20:.13)+force*.36,t+.006);
    motor.impactLevel.gain.exponentialRampToValueAtTime(.001,t+(metal?.26:.12));
    source.onended=()=>{source.disconnect();gain.disconnect();};
    source.start(t);source.stop(t+.25);
  }

  function active(action) {
    if (touch.has(action)) return true;
    for (const key of keyboard) if (keyActions[key] === action) return true;
    return false;
  }

  function updateMotor() {
    if (!motor) return;
    const t = audioContext.currentTime;
    if (motor.model !== state.motorcycle.model) {
      motor.model = state.motorcycle.model;
      motor.exhaust.osc.setPeriodicWave(motor.waves[motor.model][0]);
      motor.intake.osc.setPeriodicWave(motor.waves[motor.model][1]);
    }
    const updating = sound && (state.mode === 'racing' || state.mode === 'countdown');
    const set = (param, value, smooth = 0.04) => param.setTargetAtTime(value, t, smooth);
    set(motor.master.gain, updating ? 0.49 : 0);
    const shelter = state.shelter;
    set(motor.shedSend.gain, updating ? shelter : 0, 0.045);
    set(motor.shedReturn.gain, updating ? 0.67 : 0, 0.035);
    if (!updating) {motor.impactLevel.gain.cancelScheduledValues(t);set(motor.impactLevel.gain,0,.015);return;}
    if(state.impact && state.impact.id!==lastImpactSound){
      lastImpactSound=state.impact.id;
      if(state.impact.age<.18)playImpact(state.impact);
    }
    const shaft = state.rpm / 120;
    const rev = state.rpm / profile.redline;
    const speed = limit(state.speed / 250, 0, 1);
    const tcCut = state.tcActive ? 0.7 + 0.25 * Math.sin(state.time * 91) : 1;
    const load = state.crash?0:Math.max(state.throttle * (1 - Math.sin(Math.PI * state.shift) * 0.95) * tcCut, blip * 0.52);
    const cockpit = state.camera === 'cockpit';
    set(motor.exhaust.osc.frequency, shaft, 0.022);
    set(motor.intake.osc.frequency, shaft, 0.025);
    set(motor.exhaust.tone.frequency, (360 + 980 * rev + load * 1450) * profile.exhaustTone);
    set(motor.intake.tone.frequency, (540 + 1610 * rev) * profile.intakeTone);
    set(motor.exhaust.level.gain, (state.crash?.phase==='recover'?.13:cockpit ? 0.31 : 0.38) * (0.47 + 0.53 * load) * profile.exhaustGain);
    set(motor.intake.level.gain, (cockpit ? 0.33 : 0.22) * (0.28 + load * 0.72) * profile.intakeGain);
    const rain = state.weather === 'rain';
    set(motor.rainLevel.gain, rain ? (cockpit ? 0.24 : 0.14) * (1 - speed * 0.35) * (1 - 0.89 * shelter) : 0);
    set(motor.wind.frequency, 360 + 1700 * speed + (rain ? 170 : 0));
    set(motor.windLevel.gain, (cockpit ? 0.21 : 0.12) * speed * speed * (1 - 0.68 * shelter), 0.12);
    const scraping=state.barrierContact && state.impact?.type==='rail';
    const sliding=state.crash && state.crash.phase!=='recover';
    const roadTone=scraping?1650:sliding?480:(state.offroad?530:165+state.wetness*1330);
    set(motor.road.frequency, roadTone + 190 * speed);
    set(motor.roadLevel.gain, (scraping ? 0.57 : sliding ? .47 : state.offroad ? 0.42 : 0.11 + state.wetness * 0.31) * Math.sqrt(speed) +
      (state.braking ? Math.max(0, state.gripUsage - 0.8) * 0.16 : 0));
    motor.pack.forEach((voice, i) => {
      const rival = state.rivals[i];
      const gap = rival ? rival.distance - state.distance : Infinity;
      const proximity = Math.max(0, 1 - Math.abs(gap) / 85);
      set(voice.volume.gain, .19 * proximity * proximity, .075);
      if (!proximity) return;
      const across = (rival.lateral - state.lateral) * (window.ApexWorld?.roadHalf || 4.65);
      const range = Math.hypot(gap, across, 1.7);
      const radialSpeed = (rival.speed - state.speed) * gap / (3.6 * range);
      const doppler = 343 / (343 + radialSpeed);
      let gear = 0;
      while (gear < gearing.length - 1 && rival.speed > gearing[gear] * .925) gear++;
      const rpm = Math.max(1500 + Math.min(1, rival.speed / 15) * 2800, rival.speed / gearing[gear] * REDLINE);
      set(voice.osc.frequency, rpm / 120 * doppler * (0.98 + i * .022), .05);
      set(voice.tone.frequency, 480 + proximity * (rival.braking ? 880 : 1850));
      if (voice.stereo) set(voice.stereo.pan, across / range, .06);
    });
  }

  function resetTouchInput(reason) {
    touch.clear();
    Object.assign(touchInput, { steer: 0, throttle: 0, brake: 0 });
    emit('apex:input-reset', {reason});
  }

  function clearInputs(reason = 'reset') {
    keyboard.clear();
    resetTouchInput(reason);
    Object.assign(pad, { armed: false, steer: 0, gas: 0, brake: 0, up: false, down: false });
    state.braking = false;
  }

  function setMenuOpen(open) {
    const next = Boolean(open);
    if (next === menuOpen) return menuOpen;
    menuOpen = next;
    for (const key of keyboard) blockedKeys.add(key);
    clearInputs('menu');
    // UI owns menu visibility and simulation pause. Publishing here would
    // feed its visibility update back into itself.
    return menuOpen;
  }

  function queueFrame() {
    if (!host?.manual && !scheduled && canvas) {
      scheduled = true;
      requestAnimationFrame(frame);
    }
  }

  function resetRun() {
    clearInputs();
    state = newRun();
    rollRate = shiftRemaining = shiftLock = springVelocity = blip = lastImpactSound = 0;
    blockedKeys.clear();
    countdownRemaining = 3;
    lastSplitTime = 0;
    pausedMode = null;
    previousFrame = now();
    lastUpdate = -Infinity;
  }

  function returnToGrid() {
    resetRun();
    updateMotor();
    publish();
    queueFrame();
    return true;
  }

  function setCourse(route) {
    if (!['ready', 'finished'].includes(state.mode) || !Object.hasOwn(LENGTHS, route)) return false;
    if (course === route) return true;
    course = route;
    weather = weatherByCourse[route];
    window.ApexWorld?.selectCourse?.(route);
    try { storage.setItem(COURSE_KEY, route); } catch {}
    return returnToGrid();
  }

  function setWeather(condition) {
    if (!['ready', 'finished'].includes(state.mode) || !['rain', 'clear'].includes(condition)) return false;
    if (weather === condition) return true;
    weather = condition;
    weatherByCourse[course] = condition;
    try { storage.setItem(WEATHER_KEYS[course], condition); } catch {}
    return returnToGrid();
  }

  function setTransmission(mode) {
    if (!['ready', 'finished'].includes(state.mode) || !['auto', 'manual'].includes(mode)) return false;
    if (gearbox === mode) return true;
    gearbox = mode;
    try { storage.setItem(TRANSMISSION_KEY, mode); } catch {}
    return returnToGrid();
  }

  function setMotorcycle(patch) {
    if (!['ready','finished'].includes(state.mode) || !patch || typeof patch !== 'object' || Array.isArray(patch)) return false;
    const next = motorcycles.normalize({...motorcycle,...patch});
    if (motorcycles.key(next) === motorcycles.key(motorcycle)) return true;
    motorcycle = next;
    try { storage.setItem(MOTORCYCLE_KEY,JSON.stringify(motorcycle)); } catch {}
    return returnToGrid();
  }

  function restart() {
    unlockAudio();
    resetRun();
    state.mode = 'countdown';
    updateMotor();
    beep(440);
    publish();
    queueFrame();
  }

  function start() {
    if (state.mode === 'ready' || state.mode === 'finished') restart();
    else if (state.mode === 'paused') togglePause();
  }

  function togglePause() {
    if (state.mode === 'paused') {
      unlockAudio();
      state.mode = pausedMode;
      pausedMode = null;
      previousFrame = now();
    } else if (state.mode === 'racing' || state.mode === 'countdown') {
      pausedMode = state.mode;
      state.mode = 'paused';
      clearInputs('pause');
    } else {
      return;
    }
    updateMotor();
    publish();
    queueFrame();
  }

  function toggleSound() {
    sound = !sound;
    state.sound = sound;
    try { storage.setItem(SOUND_KEY, sound ? 'on' : 'off'); } catch {}
    if (sound) unlockAudio();
    updateMotor();
    if (sound) beep(660, 0.07);
    publish();
  }

  function cycleCamera() {
    camera = camera === 'chase' ? 'cockpit' : 'chase';
    state.camera = camera;
    try { storage.setItem(CAMERA_KEY, camera); } catch {}
    updateMotor();
    publish();
    queueFrame();
    return camera;
  }

  function setTouch(action, pressed) {
    if (!['throttle', 'brake', 'left', 'right'].includes(action)) return;
    if (pressed && !menuOpen && !state.crash && (state.mode === 'racing' || state.mode === 'countdown')) touch.add(action);
    else touch.delete(action);
  }

  function setTouchInput(input = {}) {
    const enabled = !menuOpen && !state.crash && (state.mode === 'racing' || state.mode === 'countdown');
    const amount = (key, low = 0) => enabled && Number.isFinite(input?.[key]) ? limit(input[key], low, 1) : 0;
    touchInput.steer = amount('steer', -1);
    touchInput.brake = amount('brake');
    touchInput.throttle = touchInput.brake > 0.05 ? 0 : amount('throttle');
    return enabled;
  }

  function finish() {
    state.mode = 'finished';
    state.braking = false;
    const model = state.motorcycle.model;
    const previous = records[model][course][weather];
    state.isRecord = !previous || state.time < previous.time;
    if (state.isRecord) {
      const record = { time: state.time, splits: state.splits.slice() };
      records[model][course][weather] = record;
      state.best = record.time;
      state.bestSplits = record.splits.slice();
      try { storage.setItem(recordKey(course,weather,model), JSON.stringify(record)); } catch {}
    }
    clearInputs('finish');
    updateMotor();
    beep(1046, 0.32);
    publish();
  }

  function changeGear(direction) {
    const next = state.gear + direction;
    if (shiftLock > 0 || next < 1 || next > 6) return false;
    const nextRpm = state.speed / profile.gearing[next - 1] * profile.redline;
    if (direction < 0 && nextRpm > profile.redline * 0.97) return false;
    state.gear = next;
    shiftDuration = direction > 0 ? 0.16 : 0.22;
    shiftRemaining = shiftDuration;
    shiftLock = SHIFT_INTERVAL;
    state.shift = 1;
    if (direction < 0) blip = limit((nextRpm - state.rpm) / 2600, 0.22, 1);
    return true;
  }

  function shiftGear(direction) {
    if (menuOpen || state.mode !== 'racing' || state.crash || gearbox !== 'manual' || (direction !== 1 && direction !== -1)) return false;
    if (!changeGear(direction)) return false;
    publish();
    return true;
  }

  function transmission(dt) {
    shiftLock = Math.max(0, shiftLock - dt);
    shiftRemaining = Math.max(0, shiftRemaining - dt);
    blip = Math.max(0, blip - dt * 6);
    const wheelRpm = state.speed / profile.gearing[state.gear - 1] * profile.redline;
    if (gearbox === 'auto' && shiftLock === 0) {
      if (wheelRpm > profile.upshiftRpm) changeGear(1);
      else if (wheelRpm < (state.brake > 0.3 ? profile.brakingDownshiftRpm : profile.downshiftRpm)) changeGear(-1);
    }
    state.shift = shiftRemaining / shiftDuration;
    // The rider pulls, holds through the torque cut, then feeds the lever out.
    // The accepted shift's lockout doubles as its simulation-time clock.
    const shiftAge = SHIFT_INTERVAL - shiftLock;
    const releaseTime = SHIFT_INTERVAL - shiftDuration - 0.045;
    const pull = Math.min(1, shiftAge / 0.075, shiftLock / releaseTime);
    state.clutch = pull * pull * (3 - 2 * pull);
    const coupledRpm = state.speed / profile.gearing[state.gear - 1] * profile.redline;
    const clutchRpm = profile.idleRpm + state.throttle * profile.launchRpm;
    const target = Math.max(clutchRpm, coupledRpm + blip * 190);
    state.rpm = follow(state.rpm, limit(target, profile.idleRpm, profile.redline), blip > 0 ? 20 : 13, dt);
  }

  function pollPad() {
    if (menuOpen) {
      Object.assign(pad, { armed: false, steer: 0, gas: 0, brake: 0, up: false, down: false });
      return;
    }
    let controller;
    try {
      controller = Array.from(window.navigator?.getGamepads?.() ?? []).find(p => p?.connected && p.mapping === 'standard');
    } catch { /* Gamepads can be unavailable in an embedded browser. */ }
    if (!controller) {
      if (pad.id) Object.assign(pad, { id: '', armed: false, steer: 0, gas: 0, brake: 0, up: false, down: false });
      return;
    }
    const id = controller.index + ':' + controller.id;
    if (pad.id !== id) { pad.id = id; pad.armed = false; }
    const dead = 0.12;
    const axis = controller.axes[0] || 0;
    const value = i => limit(controller.buttons[i]?.value || 0, 0, 1);
    const gas = value(7), brake = value(6), up = value(5) > 0.5, down = value(4) > 0.5;
    if (!pad.armed) {
      pad.gas = pad.brake = pad.steer = 0;
      pad.up = up; pad.down = down;
      pad.armed = gas < 0.04 && brake < 0.04 && Math.abs(axis) < dead && !up && !down;
      return;
    }
    pad.steer = Math.sign(axis) * limit((Math.abs(axis) - dead) / (1 - dead), 0, 1);
    pad.gas = gas < 0.025 ? 0 : gas;
    pad.brake = brake < 0.025 ? 0 : brake;
    if (up && !pad.up) shiftGear(1);
    if (down && !pad.down) shiftGear(-1);
    pad.up = up; pad.down = down;
  }

  function completeStep(start, dt, world) {
    const oldDistance=start.z;
    const wasDown=Boolean(state.crash);
    state.time+=dt;
    if(race) state.racePosition=race.advance(state,start,dt,world);
    else collisions.resolve([state],[start],dt,world,state.length);
    if(!wasDown && state.crash) resetTouchInput('crash');
    state.offroad=Math.abs(state.lateral)>1;
    state.shelter=limit(world?.shelterAt?.(state.distance)??0,0,1);
    const traveled=state.distance-oldDistance;
    const boundary=state.sector===3?state.length:state.sector*state.length/3;
    if(state.distance>=boundary && traveled>0) {
      const crossingTime=state.time-dt*(state.distance-boundary)/traveled;
      state.splits[state.sector-1]=crossingTime-lastSplitTime;
      lastSplitTime=crossingTime;
      if(state.sector===3) {
        state.time=crossingTime;
        state.distance=state.length;
        if(race){race.finishAt(crossingTime);state.racePosition=race.position(state);}
        finish();
      } else {state.sector++;beep(740,.11);publish();}
    }
  }

  function ride(dt) {
    const world=window.ApexWorld;
    const start=collisions.capture(state,world);
    collisions.tick(state,dt);
    if(collisions.moveDown(state,dt,world)) {
      if(collisions.tookRecovery(state)){
        for(const key of keyboard)blockedKeys.add(key);
        clearInputs('recovery');
        state.throttle=state.brake=0;
        state.braking=false;
        rollRate=shiftRemaining=shiftLock=0;
      }
      completeStep(start,dt,world);
      return;
    }
    const brake = active('brake') ? 1 : Math.max(pad.brake, touchInput.brake);
    const throttle = active('throttle') ? 1 : Math.max(pad.gas, touchInput.throttle);
    state.throttle = follow(state.throttle, brake > 0.05 ? 0 : throttle, 12, dt);
    state.brake = follow(state.brake, brake, 11, dt);
    state.braking = state.brake > 0.15;
    transmission(dt);

    const v = state.speed / 3.6;
    const curve = world?.curvature ? world.curvature(state.distance) : (world?.roadCurve(state.distance) || 0) / 151;
    state.curvature = curve;
    const halfWidth = world?.roadHalf || 4.65;
    const offroad = Math.abs(state.lateral) > 1;
    const rain = weather === 'rain';
    state.wetness = rain ? limit(world?.surfaceWetness?.(state.distance, state.lateral) ?? 0.5, 0, 1) : 0;
    const patch = Math.max(0, (state.wetness - 0.67) / 0.33) * Math.min(1, v / 46);
    const roadGrip = rain ? 1.055 - 0.30 * state.wetness - 0.14 * patch : 1.26;
    const grip = GRAVITY * (offroad ? (rain ? 0.52 : 0.65) : roadGrip);
    const keySteer = Number(active('right')) - Number(active('left'));
    const steer = keySteer || (Math.abs(touchInput.steer) > Math.abs(pad.steer) ? touchInput.steer : pad.steer);

    // Roll inertia slows direction changes at high speed. A brief opposite
    // contact-patch impulse initiates the bank, as countersteering does on a bike.
    const maxBank = Math.min(MAX_LEAN, 7 + v * 2.85);
    const rollTarget = steer * maxBank * (offroad ? 0.74 : 1);
    const agility = (6.6 - 1.75 * Math.min(1, v / 65)) * profile.agility;
    rollRate += ((rollTarget - state.leanAngle) * agility * agility - 1.84 * agility * rollRate) * dt;
    state.leanAngle = limit(state.leanAngle + rollRate * dt, -MAX_LEAN, MAX_LEAN);
    state.lean = state.leanAngle / MAX_LEAN;

    const rev = state.rpm / profile.redline;
    const torque = profile.torqueBase + profile.torquePeak * Math.sin(limit((rev - 0.09) / 1.18, 0, 1) * Math.PI);
    const engaged = state.shift > 0 ? 1 - Math.pow(Math.sin(Math.PI * state.shift), 0.45) : 1;
    const limiter = limit((profile.redline - state.rpm) / profile.limiterRange, 0, 1);
    const drive = profile.wheelThrust[state.gear - 1] * torque * state.throttle * engaged * limiter;
    const engineBrake = (0.36 + 2.1 * rev) * (1 - state.throttle) * engaged * Math.min(1, v / 3) * profile.engineBraking;
    const requestedForce = drive - engineBrake - state.brake * profile.brakeForce;
    // The rear tyre alone supplies drive. Weight transfer under acceleration
    // increases its contact load. ABS apportions braking across both tyres.
    const rearCapacity = grip * (1 - state.frontLoad);
    const longitudinalDemand = rain ? limit(requestedForce, -grip, rearCapacity) : requestedForce;
    const lateralDemand = GRAVITY * Math.tan(state.leanAngle * DEG) * Math.min(1, v / 4);
    // A shared tyre friction circle trades braking/drive for cornering reserve.
    const demand = Math.hypot(longitudinalDemand, lateralDemand);
    const traction = Math.min(1, grip / Math.max(0.001, demand));
    state.gripUsage = Math.min(1, demand / grip);
    const deliveredForce = longitudinalDemand * traction;
    const wheelSlip = Math.abs(requestedForce - deliveredForce) / Math.max(1, Math.abs(requestedForce));
    const lateralSlip = Math.abs(lateralDemand) * (1 - traction) / grip;
    state.slip = follow(state.slip, limit(Math.max(wheelSlip, lateralSlip), 0, 1), 14, dt);
    state.tcActive = state.throttle > 0.18 && requestedForce > 1 && wheelSlip > 0.085;
    state.absActive = state.brake > 0.18 && v > 1.6 && wheelSlip > 0.045;
    const cornerForce = lateralDemand * traction;
    const aero = profile.aeroDrag * v * v;
    const gravelDrag = rain ? Math.min(1, v / 5) + 0.0065 * v * v : 2.15 + 0.0080 * v * v;
    const rolling = offroad ? gravelDrag : 0.19 + state.wetness * (0.07 + 0.00014 * v * v);
    state.grade = world?.grade ? world.grade(state.distance) : 0;
    const hill = GRAVITY * state.grade / Math.hypot(1, state.grade);
    const acceleration = deliveredForce - aero - rolling - hill;
    const newV = Math.max(0, v + acceleration * dt);
    const meters = (v + newV) * dt * 0.5;
    const traveled = meters;
    const movingTime = dt;

    // In the road frame, the bend moves sideways at v²/r. The relaxation term
    // models directional stability and makes a released steering key recoverable.
    const counter = limit(rollRate / 100, -1, 1) * Math.min(1, v / 10) * 1.05;
    const excess = cornerForce - v * v * curve - counter;
    const damping = offroad ? 2.8 : profile.stability;
    state.lateralVelocity = follow(state.lateralVelocity, excess / damping, damping, movingTime);
    state.lateralVelocity *= Math.min(1, newV / 1.4);
    const nextLine = state.lateral + state.lateralVelocity * movingTime / halfWidth;
    state.lateral=nextLine;
    state.speed=newV*3.6;
    state.accel=newV>0?acceleration:0;
    state.offroad = Math.abs(state.lateral) > 1;
    // 0.54 m centre-of-mass height over a 1.44 m wheelbase. A damped
    // fork spring delays chassis pitch while the tyre loads transfer.
    const targetLoad = limit(0.52 - profile.loadTransfer * state.accel / GRAVITY, 0.12, 0.94);
    state.frontLoad = follow(state.frontLoad, targetLoad, 13, movingTime);
    const compression = limit((state.frontLoad - 0.52) / 0.40, -1, 1);
    springVelocity += ((compression - state.suspension) * profile.springRate - profile.springDamping * springVelocity) * movingTime;
    state.suspension = limit(state.suspension + springVelocity * movingTime, -1, 1);
    state.pitch = -state.suspension;
    const roughness = state.offroad ? 0.72 : 0.075;
    const ripple = Math.sin(state.distance * 0.62) * 0.55 + Math.sin(state.distance * 1.91) * 0.45;
    const impactBounce=state.impact?Math.sin(state.impact.age*44)*state.impact.severity*Math.exp(-state.impact.age*7)*(reducedMotion?.15:1):0;
    state.heave = limit(ripple * roughness * Math.min(1, v / 18) + state.shift * 0.10 + impactBounce, -1, 1);

    state.distance += traveled;
    completeStep(start,dt,world);
  }

  function advance(dt) {
    if (state.mode === 'countdown') {
      const previous = state.countdown;
      const consumed = Math.min(dt, countdownRemaining);
      countdownRemaining -= consumed;
      dt -= consumed;
      state.countdown = Math.max(1, Math.ceil(countdownRemaining));
      if (countdownRemaining <= 0) {
        state.mode = 'racing';
        beep(880, 0.24);
        publish();
      } else if (state.countdown !== previous) {
        beep(440);
        publish();
      }
    }
    // Small physics steps keep cornering and split times consistent across refresh rates.
    while (state.mode === 'racing' && dt > 0.0000001) {
      const step = Math.min(dt, 1 / 60);
      ride(step);
      dt -= step;
    }
  }

  function draw() {
    if (!ctx || !width || !height) return;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.save();
    window.ApexWorld?.draw(ctx, width, height, state);
    ctx.restore();
    ctx.save();
    window.ApexBike?.draw(ctx, width, height, state);
    ctx.restore();
    ctx.save();
    window.ApexTouch?.draw?.(ctx, width, height, state);
    ctx.restore();
  }

  function frame(now) {
    scheduled = false;
    const rainyGrid = state.mode === 'ready' && state.weather === 'rain' && !document.hidden;
    if (rainyGrid && previousFrame !== null && now - previousFrame < 1000 / 28) {
      queueFrame();
      return;
    }
    const dt = previousFrame === null ? 0 : Math.min(0.25, Math.max(0, (now - previousFrame) / 1000));
    if (state.mode !== 'paused' && state.mode !== 'finished') state.weatherTime += dt;
    previousFrame = now;
    if (state.mode === 'countdown' || state.mode === 'racing') pollPad();
    advance(dt);
    draw();
    if (!rainyGrid && now - lastUpdate >= 50) {
      updateMotor();
      publish();
      lastUpdate = now;
    }
    if (rainyGrid || state.mode === 'countdown' || state.mode === 'racing') queueFrame();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    queueFrame();
  }

  function onFocusLoss() {
    clearInputs('focus');
    if (state.mode === 'racing' || state.mode === 'countdown') togglePause();
  }

  function init() {
    canvas = document.getElementById('race-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d', { alpha: false });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    window.addEventListener('resize', resize);
    window.addEventListener('apex:asset', queueFrame);
    window.addEventListener('blur', onFocusLoss);
    document.addEventListener('visibilitychange', () => { if (document.hidden) onFocusLoss(); else queueFrame(); });
    window.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const editing = event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName);
      if (!event.repeat && (event.code === 'Escape' || event.code === 'KeyP' && !editing)) {
        const nativeEscape = event.code === 'Escape' && (document.fullscreenElement || document.webkitFullscreenElement);
        if (!nativeEscape) event.preventDefault();
        const request = new CustomEvent('apex:menu-toggle', { cancelable: true, detail: { key: event.code } });
        window.dispatchEvent(request);
        if (!request.defaultPrevented && state.mode !== 'ready' && state.mode !== 'finished') togglePause();
        return;
      }
      if (menuOpen) {
        if (event.code in keyActions) blockedKeys.add(event.code);
        return;
      }
      if (editing) return;
      if (event.code in keyActions) {
        if(state.crash){blockedKeys.add(event.code);event.preventDefault();return;}
        if(blockedKeys.has(event.code))return;
        if(event.repeat && !keyboard.has(event.code))return;
        if (state.mode === 'racing' || state.mode === 'countdown') {
          event.preventDefault();
          keyboard.add(event.code);
        }
      } else if (!event.repeat && state.mode === 'racing' && gearbox === 'manual' &&
                 (event.code === 'KeyE' || event.code === 'KeyQ')) {
        event.preventDefault();
        shiftGear(event.code === 'KeyE' ? 1 : -1);
      } else if (!event.repeat && event.code === 'KeyC') {
        event.preventDefault();
        cycleCamera();
      } else if (!event.repeat && event.code === 'Enter' &&
                 !event.target?.closest?.('button, a, [role="button"]')) {
        if (['ready', 'finished', 'paused'].includes(state.mode)) {
          event.preventDefault();
          start();
        }
      }
    });
    window.addEventListener('keyup', event => {keyboard.delete(event.code);blockedKeys.delete(event.code);});
    resize();
    publish();
  }

  // A native host supplies seconds and normalized input, just as the browser
  // frame/pointer adapters do. Clamp stalled frames identically on both hosts.
  function advanceForHost(dt, input = {}) {
    if (!host?.manual) throw new Error('Explicit stepping requires a manual host');
    const elapsed = Number.isFinite(dt) ? Math.min(.25, Math.max(0, dt)) : 0;
    setTouchInput(input);
    if (state.mode !== 'paused' && state.mode !== 'finished') state.weatherTime += elapsed;
    advance(elapsed);
    return getState();
  }

  window.ApexGame = { advance:advanceForHost, start, restart, togglePause, toggleSound, cycleCamera, setCourse, setWeather, setTransmission, setMotorcycle, shiftGear, returnToGrid, setTouch, setTouchInput, setMenuOpen, getState };
  if (!host?.manual) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();

;
/* motion.js */
/* Optional, permission-gated phone tilt. Touch still owns acceleration/braking. */
window.ApexMotion = (() => {
  'use strict';
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const radians = Math.PI / 180;
  let enabled = false, status = 'off', steer = 0, generation = 0;
  let sample = null, neutral = null, lastTime = null, waitingTimer = null, pending = null;
  let listeners = [], published = '';
  const supported = () => window.isSecureContext !== false && typeof window.DeviceOrientationEvent !== 'undefined';
  const getState = () => ({ supported: supported(), enabled, status, steer });
  function publish() {
    const detail = getState(), key = JSON.stringify(detail);
    if (key === published) return;
    published = key;
    window.dispatchEvent(new CustomEvent('apex:motion', { detail }));
  }
  function listen(target, name, callback) {
    if (!target?.addEventListener) return;
    target.addEventListener(name, callback);
    listeners.push(() => target.removeEventListener(name, callback));
  }
  function clearWait() {
    if (waitingTimer !== null) clearTimeout(waitingTimer);
    waitingTimer = null;
  }
  function stop(nextStatus) {
    generation++;
    clearWait();
    listeners.forEach(remove => remove());
    listeners = [];
    pending = null;
    enabled = false; status = nextStatus; steer = 0;
    sample = neutral = lastTime = null;
    publish();
  }
  function waitForSample() {
    clearWait();
    if (document.hidden) return;
    const token = generation;
    waitingTimer = setTimeout(() => {
      if (token === generation && enabled && status === 'waiting') stop('unavailable');
    }, 4000);
  }
  function resetSample() {
    if (!enabled) return;
    sample = neutral = lastTime = null;
    steer = 0; status = 'waiting';
    waitForSample();
    publish();
  }
  function recenter() {
    if (!enabled) return;
    neutral = sample;
    steer = 0;
    lastTime = null;
    publish();
  }
  function angle() {
    const value = window.screen?.orientation?.angle;
    return Number.isFinite(value) ? value : Number.isFinite(window.orientation) ? window.orientation : 0;
  }
  function orientation(event) {
    if (!enabled || document.hidden) return;
    if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) {
      if (status === 'ready') resetSample();
      return;
    }
    const beta = event.beta * radians, gamma = event.gamma * radians, screen = angle() * radians;
    // W3C Z-X'-Y'' orientation: world-up in device coordinates is
    // (-cos(beta)*sin(gamma), sin(beta), cos(beta)*cos(gamma)). Project
    // gravity onto screen-right; positive means the right edge drops.
    // Unlike raw Euler angles this remains continuous through their wrap.
    const right = Math.cos(beta) * Math.sin(gamma) * Math.cos(screen) + Math.sin(beta) * Math.sin(screen);
    sample = Math.asin(clamp(right, -1, 1)) / radians;
    const now = performance.now();
    if (neutral === null) neutral = sample;
    const delta = sample - neutral;
    const target = Math.sign(delta) * clamp((Math.abs(delta) - 3) / 25, 0, 1);
    const elapsed = lastTime === null ? 1 / 60 : clamp((now - lastTime) / 1000, 0, .25);
    steer += (target - steer) * (1 - Math.exp(-elapsed / .075));
    if (Math.abs(steer) < .001) steer = 0;
    lastTime = now;
    status = 'ready';
    clearWait();
    publish();
  }
  function activate(token) {
    if (token !== generation) return false;
    enabled = true; status = 'waiting';
    listen(window, 'deviceorientation', orientation);
    listen(window, 'orientationchange', resetSample);
    listen(window.screen?.orientation, 'change', resetSample);
    listen(window, 'blur', resetSample);
    listen(window, 'focus', resetSample);
    listen(document, 'visibilitychange', resetSample);
    waitForSample();
    publish();
    return true;
  }
  function enable() {
    if (enabled) return Promise.resolve(true);
    if (pending) return pending;
    if (!supported()) { stop('unavailable'); return Promise.resolve(false); }
    const token = ++generation;
    status = 'requesting'; steer = 0;
    publish();
    let permission;
    try {
      // Must run directly in the button's user gesture, before any await.
      permission = typeof window.DeviceOrientationEvent.requestPermission === 'function'
        ? window.DeviceOrientationEvent.requestPermission() : 'granted';
    } catch {
      if (token === generation) stop('error');
      return Promise.resolve(false);
    }
    pending = Promise.resolve(permission).then(result => {
      if (token !== generation) return false;
      pending = null;
      if (result !== 'granted') { stop('denied'); return false; }
      return activate(token);
    }, () => {
      if (token === generation) stop('error');
      return false;
    });
    return pending;
  }
  return { enable, disable: () => stop('off'), recenter, getState };
})();

;
/* touch.js */
/* Direct riding gestures, confined to the canvas. No on-screen driving buttons. */
window.ApexTouch = (() => {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const playing = state => state?.mode === 'countdown' || state?.mode === 'racing';
  let instance = null;

  function init(surface, game) {
    if (!surface || !game?.setTouchInput || !game?.getState) return null;
    const contacts = new Map(), listeners = [];
    let state = game.getState(), primary = null, blocked = false, destroyed = false;
    let available = Boolean(window.navigator?.maxTouchPoints > 0 || window.matchMedia?.('(any-pointer: coarse)')?.matches);
    let output = { steer: 0, throttle: 0, brake: 0 };
    let reason = '', lastPublished = '', rect = surface.getBoundingClientRect();
    const originalTouchAction = surface.style.touchAction;
    const originalSelect = surface.style.userSelect;
    const listen = (target, name, callback, options) => {
      target.addEventListener(name, callback, options);
      listeners.push(() => target.removeEventListener(name, callback, options));
    };
    const eventTime = event => Number.isFinite(event.timeStamp) ? event.timeStamp : performance.now();
    const allowed = () => playing(state) && !state.menuOpen && !state.crash && !document.hidden;
    const bounds = () => { rect = surface.getBoundingClientRect(); return rect; };
    const travel = () => clamp(rect.width * .22, 64, 150);
    const threshold = () => clamp(rect.height * .10, 44, 70);
    const snapshot = () => ({ available, active: allowed() && !blocked && contacts.size > 0,
      pointers: contacts.size, ...output, primaryDown: primary !== null && contacts.has(primary), blocked, reason });
    function publish(force = false) {
      const detail = snapshot(), key = JSON.stringify(detail);
      if (force || key !== lastPublished) {
        lastPublished = key;
        window.dispatchEvent(new CustomEvent('apex:touch', { detail }));
      }
    }
    function apply() {
      const first = primary !== null ? contacts.get(primary) : null;
      let steer = 0, throttle = 0, brake = 0;
      if (allowed() && !blocked && contacts.size) {
        // A surviving secondary contact continues braking; it never becomes the throttle.
        brake = contacts.size > (first ? 1 : 0) ? 1 : 0;
        throttle = first && !brake ? 1 : 0;
        if (first) {
          const motion = window.ApexMotion?.getState();
          if (motion?.enabled) {
            steer = motion.status === 'ready' && Number.isFinite(motion.steer) ? clamp(motion.steer, -1, 1) : 0;
          } else {
            const dx = first.x - first.startX, dead = clamp(rect.width * .018, 7, 12);
            steer = Math.sign(dx) * clamp((Math.abs(dx) - dead) / (travel() - dead), 0, 1);
          }
        }
      }
      output = { steer, throttle, brake };
      game.setTouchInput(output);
      publish();
    }
    function reset(why = 'reset') {
      if (destroyed) return;
      blocked = contacts.size > 0;
      primary = null;
      reason = why;
      for (const contact of contacts.values()) contact.history = [];
      apply();
    }
    function updateSurface() {
      surface.style.touchAction = playing(state) ? 'none' : originalTouchAction;
      surface.style.userSelect = playing(state) ? 'none' : originalSelect;
    }
    function update(event) {
      const previous = state;
      state = event?.detail || game.getState();
      updateSurface();
      if ((!playing(state) || state.crash || state.menuOpen) && (playing(previous) && !previous.crash && !previous.menuOpen || contacts.size && !blocked)) {
        reset(state.menuOpen ? 'menu' : state.crash ? 'crash' : state.mode);
      } else publish();
    }
    function accept(event) {
      if (destroyed || event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      available = true;
      state = game.getState();
      updateSurface();
      if (!playing(state) || state.menuOpen || document.hidden || contacts.has(event.pointerId)) { publish(); return; }
      event.preventDefault();
      bounds();
      // If a browser never delivered the old touch-up after leaving the app,
      // a new primary pointer is proof that its old same-type stream ended.
      if (!state.crash && blocked && event.isPrimary === true && [...contacts.values()].every(c => c.type === event.pointerType)) {
        contacts.clear();
        primary = null;
        blocked = false;
      }
      const now = eventTime(event);
      contacts.set(event.pointerId, {
        type: event.pointerType, x: event.clientX, y: event.clientY,
        startX: event.clientX, startY: event.clientY,
        history: [{ x: event.clientX, y: event.clientY, t: now }],
        shiftReady: true, shiftOriginY: event.clientY, shiftAt: -Infinity
      });
      if (state.crash) { blocked = true; primary = null; reason = 'crash'; }
      if (contacts.size === 1 && !blocked) {
        primary = event.pointerId; reason = '';
        window.ApexMotion?.recenter();
      }
      try { surface.setPointerCapture(event.pointerId); } catch { /* Window terminal listeners still release it. */ }
      apply();
    }
    function shift(contact, event, previousX, previousY) {
      const now = eventTime(event), amount = threshold();
      if (!contact.shiftReady) {
        if (now - contact.shiftAt >= 450 && Math.abs(contact.y - contact.shiftOriginY) < amount * .28) {
          contact.shiftReady = true;
          contact.history = [{ x: contact.x, y: contact.y, t: now }];
        }
        return;
      }
      const history = contact.history;
      if (!history.length || now - history[history.length - 1].t > 220) {
        history.length = 0;
        history.push({ x: previousX, y: previousY, t: now - 16 });
      }
      history.push({ x: contact.x, y: contact.y, t: now });
      while (history.length > 2 && now - history[0].t > 220) history.shift();
      if (history.length > 32) history.splice(0, history.length - 32);
      const origin = history[0], dx = contact.x - origin.x, dy = contact.y - origin.y;
      const elapsed = Math.max(1, now - origin.t);
      if (state.transmission === 'manual' && state.mode === 'racing' &&
          Math.abs(dy) >= amount && Math.abs(dy) >= Math.abs(dx) * 1.8 && Math.abs(dy) / elapsed >= .28) {
        // Consume refused attempts too. A held stroke cannot queue a later gear change.
        contact.shiftReady = false;
        contact.shiftAt = now;
        contact.shiftOriginY = origin.y;
        game.shiftGear(dy < 0 ? 1 : -1);
      }
    }
    function move(event) {
      const contact = contacts.get(event.pointerId);
      if (!contact || destroyed) return;
      event.preventDefault();
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      const oldX = contact.x, oldY = contact.y;
      contact.x = event.clientX; contact.y = event.clientY;
      state = game.getState();
      if (!allowed()) { reset(state.menuOpen ? 'menu' : state.crash ? 'crash' : state.mode); return; }
      if (!blocked && event.pointerId === primary) shift(contact, event, oldX, oldY);
      apply();
    }
    function end(event) {
      if (!contacts.has(event.pointerId) || destroyed) return;
      event.preventDefault();
      contacts.delete(event.pointerId);
      try { if (surface.hasPointerCapture?.(event.pointerId)) surface.releasePointerCapture(event.pointerId); } catch {}
      if (!contacts.size) { primary = null; blocked = false; reason = ''; }
      apply();
    }
    function cancel(event) {
      if (!contacts.has(event.pointerId) || destroyed) return;
      contacts.delete(event.pointerId);
      reset('cancel');
    }
    function lost(event) {
      if (!contacts.has(event.pointerId) || destroyed) return;
      // Capture can be lost before physical release. Quarantine this whole cohort.
      reset('capture');
    }
    function viewport() {
      if (destroyed) return;
      const previous = rect, next = bounds();
      if (Math.abs(next.width - previous.width) < .5 && Math.abs(next.height - previous.height) < .5 &&
          Math.abs(next.left - previous.left) < .5 && Math.abs(next.top - previous.top) < .5) return;
      const riding = state.mode === 'racing' && contacts.size > 0;
      reset('resize');
      if (riding) game.togglePause?.();
    }
    function orientation() {
      const riding = state.mode === 'racing' && contacts.size > 0;
      reset('orientation');
      bounds();
      if (riding) game.togglePause?.();
    }
    function draw(ctx, w, h) {
      if (!playing(state) || state.menuOpen || !contacts.size) return;
      const r = rect, sx = w / Math.max(1, r.width), sy = h / Math.max(1, r.height);
      ctx.save();
      for (const [id, contact] of contacts) {
        const x = (contact.x - r.left) * sx, y = (contact.y - r.top) * sy;
        const isBrake = id !== primary || output.brake > .5;
        ctx.strokeStyle = blocked ? 'rgba(234,236,225,.22)' : isBrake ? 'rgba(255,176,106,.75)' : 'rgba(230,245,227,.62)';
        ctx.fillStyle = blocked ? 'rgba(234,236,225,.03)' : isBrake ? 'rgba(255,176,106,.08)' : 'rgba(230,245,227,.05)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        if (id === primary && !blocked) {
          const origin = (contact.startX - r.left) * sx;
          ctx.globalAlpha = .6;
          ctx.beginPath(); ctx.moveTo(origin - 4, y + 34); ctx.lineTo(origin + 4, y + 34); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(origin, y + 34); ctx.lineTo(origin + output.steer * travel() * sx, y + 34); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    }
    listen(surface, 'pointerdown', accept, { passive: false });
    listen(window, 'pointermove', move, { passive: false });
    listen(window, 'pointerup', end, { passive: false });
    listen(window, 'pointercancel', cancel, { passive: false });
    listen(surface, 'lostpointercapture', lost);
    listen(window, 'apex:update', update);
    listen(window, 'apex:motion', () => {
      state = game.getState();
      apply();
    });
    listen(window, 'apex:input-reset', event => {
      state = game.getState();
      updateSurface();
      reset(event.detail?.reason || 'reset');
    });
    listen(window, 'blur', () => reset('focus'));
    listen(document, 'visibilitychange', () => { if (document.hidden) reset('hidden'); });
    listen(window, 'resize', viewport);
    listen(window, 'orientationchange', orientation);
    if (window.screen?.orientation?.addEventListener) listen(window.screen.orientation, 'change', orientation);
    let observer;
    if (window.ResizeObserver) { observer = new window.ResizeObserver(viewport); observer.observe(surface); }
    updateSurface();
    publish(true);
    return {
      reset, draw, getState: snapshot,
      destroy() {
        if (destroyed) return;
        reset('destroy');
        destroyed = true;
        listeners.forEach(remove => remove());
        observer?.disconnect();
        for (const id of contacts.keys()) { try { surface.releasePointerCapture(id); } catch {} }
        contacts.clear(); primary = null; blocked = false;
        surface.style.touchAction = originalTouchAction;
        surface.style.userSelect = originalSelect;
      }
    };
  }
  function boot() {
    if (!instance) instance = init(document.getElementById('race-canvas'), window.ApexGame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  return { init, draw: (ctx, w, h) => instance?.draw(ctx, w, h), getState: () => instance?.getState() ?? null };
})();

;
/* telemetry.js */
/* Speed traces use equal distance intervals, so two rides line up in a corner. */
window.ApexTelemetry = (() => {
  'use strict';
  const segmentMeters = 20;
  let course, length, intervals, dx;
  const $ = id => document.getElementById(id);
  const key = (stage, condition, model) => 'apex-run.telemetry.' + (stage === 'sierra' ? '' : stage + '.') + condition + '.v1' + (model === 'r600' ? '' : '.' + model);
  let motorcycleModel, weather, mode, reference, samples, last, maxSpeed, maxLean, paved, lastBestTime;

  function tracePath(points) {
    return points.map(([speed], i) => (i ? 'L' : 'M') + (i * dx) + ' ' + (69 - Math.min(270, speed) * 65 / 270).toFixed(2)).join('');
  }
  function selectStage(s) {
    course = s.course;
    length = s.length;
    intervals = length / segmentMeters;
    dx = 600 / intervals;
    $('axis-middle').textContent = (length / 2000) + ' KM';
    $('axis-end').textContent = (length / 1000) + ' KM';
    $('ride-plot').setAttribute('aria-label', 'Speed and route elevation plotted against distance from zero to ' + (length / 1000) + ' kilometres');

    const world = window.ApexWorld;
    const heights = Array.from({length: intervals + 1}, (_, i) => world.elevation(i * segmentMeters));
    const band = $('shed-band');
    let first = null, end = 0, label = '';
    if (course === 'coast' && window.ApexCoast) {
      first = window.ApexCoast.bridgeStart;
      end = window.ApexCoast.bridgeEnd;
      label = 'Inlet bridge';
    } else if (course === 'sierra' && world.shelterAt) {
      for (let d = 0; d <= length; d += 4) {
        if (world.shelterAt(d) > 0) {
          if (first === null) first = Math.max(0, d - 4);
          end = Math.min(length, d + 4);
        }
      }
      label = 'Snow shed';
    }
    band.setAttribute('x', 600 * (first ?? 0) / length);
    band.setAttribute('width', first === null ? 0 : 600 * (end - first) / length);
    band.querySelector('title').textContent = first === null ? '' : label + ' · ' + (first / 1000) + '–' + (end / 1000) + ' km';
    const low = Math.min(...heights), high = Math.max(...heights);
    const ridge = heights.map((h, i) => 'L' + i * dx + ' ' + (58 - 26 * (h - low) / Math.max(1, high - low)).toFixed(2));
    $('profile-path').setAttribute('d', 'M0 70' + ridge.join('') + 'L600 70Z');
  }
  function loadReference(s) {
    reference = null;
    try {
      const value = JSON.parse(localStorage.getItem(key(s.course, s.weather, s.motorcycle?.model || 'r600')));
      if (value && value.time === s.best && Array.isArray(value.points) && value.points.length === intervals + 1 &&
          value.points.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && n >= 0))) {
        reference = value.points;
      }
    } catch { /* Private browsing can disable local storage. */ }
    $('best-trace').setAttribute('d', reference ? tracePath(reference) : '');
    $('trace-pb-key').hidden = !reference;
    lastBestTime = s.best;
  }
  function reset(s) {
    samples = [[0,0]];
    last = {distance:0,time:0,speed:0,offroad:false};
    maxSpeed = 0;
    maxLean = 0;
    paved = 0;
    $('speed-trace').setAttribute('d','');
    $('trace-position').setAttribute('x1',0);
    $('trace-position').setAttribute('x2',0);
    $('top-speed').textContent = $('max-lean').textContent = '—';
    $('finish-speed').textContent = $('finish-lean').textContent = $('finish-clean').textContent = '—';
    loadReference(s);
  }
  function update(s) {
    const model = s.motorcycle?.model || 'r600';
    const modelChanged = motorcycleModel !== model;
    const stageChanged = course !== s.course || length !== s.length;
    if (stageChanged) selectStage(s);
    if (modelChanged || stageChanged || weather !== s.weather || !samples || (s.mode === 'ready' && mode !== 'ready') ||
        (s.mode === 'countdown' && mode !== 'countdown')) reset(s);
    if (s.mode === 'ready' && lastBestTime !== s.best) loadReference(s);
    const firstFinish = s.mode === 'finished' && mode !== 'finished';
    motorcycleModel = model;
    weather = s.weather;
    mode = s.mode;
    const delta = $('pace-delta');
    if (s.mode !== 'racing' && !firstFinish) {
      if (s.mode !== 'paused') delta.hidden = true;
      return;
    }
    maxSpeed = Math.max(maxSpeed, s.speed);
    if (!s.crash) maxLean = Math.max(maxLean, Math.abs(s.leanAngle));
    const travel = Math.max(0,s.distance - last.distance);
    paved += travel * (Number(!last.offroad) + Number(!s.offroad)) * .5;
    let added = false;
    while (samples.length <= intervals && samples.length * segmentMeters <= s.distance && travel > 0) {
      const t = (samples.length * segmentMeters - last.distance) / travel;
      samples.push([Math.round(last.speed + (s.speed-last.speed)*t), +(last.time + (s.time-last.time)*t).toFixed(3)]);
      added = true;
    }
    if (added) $('speed-trace').setAttribute('d', tracePath(samples));
    const cursor = (600 * s.distance / length).toFixed(2);
    $('trace-position').setAttribute('x1',cursor);
    $('trace-position').setAttribute('x2',cursor);
    $('top-speed').textContent = Math.round(maxSpeed);
    $('max-lean').textContent = Math.round(maxLean);
    delta.hidden = !(reference && s.distance > 2 && !firstFinish);
    if (!delta.hidden) {
      const i = Math.min(intervals-1,Math.floor(s.distance/segmentMeters));
      const f = s.distance/segmentMeters-i;
      const diff = s.time - (reference[i][1] + (reference[i+1][1]-reference[i][1])*f);
      delta.textContent = (diff < 0 ? '−' : '+') + Math.abs(diff).toFixed(2) + '  vs PB';
      delta.classList.toggle('ahead',diff<0);
    }
    if (firstFinish) {
      $('finish-speed').textContent = Math.round(maxSpeed) + ' km/h';
      $('finish-lean').textContent = Math.round(maxLean) + '°';
      $('finish-clean').textContent = Math.min(100, paved / length * 100).toFixed(1) + '%';
      if (s.isRecord && samples.length === intervals + 1) {
        try { localStorage.setItem(key(course, weather, motorcycleModel), JSON.stringify({time:s.time,points:samples})); } catch {}
      }
    }
    last = {distance:s.distance,time:s.time,speed:s.speed,offroad:s.offroad};
  }
  return {update};
})();

;
/* ui.js */
(() => {
  'use strict';
  const game = window.ApexGame;
  const motorcycles = window.ApexMotorcycles;
  const nodes = Object.fromEntries(Array.from(document.querySelectorAll('[id]'), node => [node.id, node]));
  const frame = nodes['game-frame'], menu = nodes['game-menu'];
  const action = nodes['action-btn'];
  const sectors = Array.from(nodes['split-grid'].children);
  const revBars = Array.from({length:14}, () => nodes.tach.appendChild(document.createElement('i')));
  const setupButtons = Array.from(document.querySelectorAll('[data-course], [data-weather], [data-transmission]'));
  const navButtons = Array.from(nodes['menu-nav'].querySelectorAll('[data-panel]'));
  const targets = {rain:[100,118,145],clear:[90,105,125]};
  const events = {
    sierra:{name:'Sierra Pass',stage:'01',region:'SIERRA NEVADA, CA',race:false,
      description:'Climb through the pines, trace the granite ridges, and chase your perfect run.',
      accessible:'A solo motorcycle time trial in the Sierra Nevada.'},
    coast:{name:'Cape Meridian',stage:'02',region:'PACIFIC COAST, CA',race:true,
      description:'Pacific cliffs. An inlet crossing. One final run to the lighthouse.',
      accessible:'Race three motorcycles on the Pacific coast.',
      tip:'Start fourth. Set up your pass before the inlet bridge and race to the lighthouse.'},
    london:{name:'A3 London',stage:'03',region:'SOUTH WEST LONDON, UK',race:true,
      description:'Kingston Vale to Wandsworth. Wooded commons give way to brick streets on a condensed A3 race stage.',
      accessible:'Race three motorcycles on a condensed closed-course A3 route through south west London.',
      tip:'Read the long bends through the commons, then settle the bike before the tighter Wandsworth approach.'}
  };
  const ordinal = ['','1st','2nd','3rd','4th'];
  const coarsePointer = matchMedia('(any-pointer: coarse)');
  let touchCapable = coarsePointer.matches || navigator.maxTouchPoints > 0;
  let gestureSeen = false, touchBlocked = false;
  let motionState = window.ApexMotion?.getState() || {supported:false, enabled:false, status:'unavailable'};
  let previousMode, previousSetup, menuOpen, activePanel = 'home';
  let previousSector = 1, splitNotice = null, lastPlace = '', placeUntil = 0;
  let state = game.getState();
  let garageView = 'studio', garageKey = '', garageDrawQueued = false;
  const garageControls = [];
  const garageViews = Array.from(document.querySelectorAll('[data-garage-view]'));
  let wasNativeFull = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  try { gestureSeen = sessionStorage.getItem('apex-touch-learned') === '1'; } catch {}
  document.body.classList.toggle('touch-capable', touchCapable);
  nodes['race-canvas'].tabIndex = -1;
  const pad = (n, length=2) => String(n).padStart(length, '0');
  function time(seconds) {
    if (!Number.isFinite(seconds)) return '--:--.---';
    const ms = Math.floor(seconds * 1000);
    return pad(Math.floor(ms/60000)) + ':' + pad(Math.floor(ms/1000)%60) + '.' + pad(ms%1000,3);
  }
  function content(node, value) {
    value = String(value);
    if (node.textContent !== value) node.textContent = value;
  }
  function showPanel(name, focus=false) {
    activePanel = name;
    menu.classList.toggle('garage-active', name === 'garage');
    nodes['garage-launch'].hidden = name !== 'garage';
    navButtons.forEach(button => {
      const selected = button.dataset.panel === name;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      nodes['panel-' + button.dataset.panel].hidden = !selected;
    });
    nodes['menu-content'].scrollTop = 0;
    if (focus) nodes['nav-' + name].focus({preventScroll:true});
    if (name === 'garage') queueGarageDraw();
  }
  function setMenu(open) {
    if (menuOpen === open) return;
    menuOpen = open;
    menu.hidden = !open;
    frame.classList.toggle('menu-open', open);
    nodes.screen.inert = open;
    nodes['menu-btn'].hidden = open;
    nodes['riding-hud'].hidden = open;
    game.setMenuOpen(open);
    requestAnimationFrame(() => {
      if (menuOpen !== open) return;
      if (open) (activePanel === 'home' ? action : nodes['nav-' + activePanel]).focus({preventScroll:true});
      else nodes['race-canvas'].focus({preventScroll:true});
    });
  }
  function syncMotionSettings() {
    nodes['tilt-settings'].hidden = !touchCapable;
    nodes['tilt-btn'].disabled = !motionState.supported || motionState.status === 'requesting';
    nodes['tilt-btn'].setAttribute('aria-pressed', String(motionState.enabled));
    content(nodes['tilt-btn'].querySelector('b'), motionState.status === 'requesting' ? 'Allow access…' : motionState.enabled ? 'On' : 'Off');
    nodes['tilt-recenter'].disabled = motionState.status !== 'ready';
    const notes = {
      off:'Enable tilt steering, then allow motion access when asked. Touch steering stays available when tilt is off.',
      requesting:'Allow motion access to steer by tilting your phone.',
      waiting:'Hold your phone comfortably while the motion sensor starts. Steering stays centered until it is ready.',
      ready:'Tilt left or right to lean. Hold one finger to accelerate; a second finger brakes. Each new touch centers steering at your current phone angle.',
      denied:'Motion access was denied. Drag to steer, or allow motion access for this site in your browser and try again.',
      unavailable:window.isSecureContext === false ? 'Tilt steering needs a secure (HTTPS) connection. You can still drag to steer.' : 'Motion sensing is unavailable on this device or browser. Drag to steer.',
      error:'Motion access could not be enabled. Drag to steer, or try again.'
    };
    content(nodes['tilt-note'], notes[motionState.supported ? motionState.status : 'unavailable'] || notes.off);
  }
  function syncGestureGuide(s) {
    const playable = s.mode === 'countdown' || s.mode === 'racing';
    const showing = touchCapable && playable && !s.crash && (s.mode === 'countdown' || s.time < 8);
    nodes['gesture-guide'].hidden = !showing;
    nodes['gesture-guide'].classList.toggle('learned', gestureSeen);
    nodes['gesture-reset'].hidden = !(touchCapable && playable && !s.crash && touchBlocked);
    nodes['gesture-manual'].hidden = s.transmission !== 'manual';
    nodes['touch-manual-help'].hidden = s.transmission !== 'manual';
    nodes['touch-riding-help'].hidden = !touchCapable;
    nodes['keyboard-controls'].hidden = touchCapable;
    content(nodes['gesture-steering'], motionState.enabled ? 'HOLD TO RIDE · TILT TO LEAN' : 'HOLD TO RIDE · DRAG TO LEAN');
    content(nodes['touch-steering-help'], motionState.enabled
      ? 'Hold your phone comfortably, then place one finger on the view to accelerate. Tilt the phone left or right to lean; each new touch sets your center.'
      : 'Place a finger anywhere on the view. Drag it left or right to lean. For tilt steering, enable it in Settings and allow motion access.');
  }
  function enableTouch() {
    if (touchCapable) return;
    touchCapable = true;
    document.body.classList.add('touch-capable');
    previousSetup = undefined;
    syncMotionSettings();
    update(state);
  }
  function showOrder(list, entries, stage, riders=[]) {
    entries.forEach((entry,index) => {
      let row = list.children[index];
      if (!row) {
        row = document.createElement('li');
        row.innerHTML = '<b class="rank"></b><i class="livery"></i><span class="race-name"></span><small class="racer-gap"></small>';
        list.appendChild(row);
      }
      row.classList.toggle('own-bike', entry.isPlayer);
      const incident = stage === 'race' && riders.find(r => (r.id || 'player') === entry.id)?.crash;
      row.classList.toggle('rider-down', Boolean(incident));
      row.style.setProperty('--rider-color', entry.color);
      content(row.children[0], 'P' + entry.position);
      content(row.children[2], entry.name);
      let label;
      if (stage === 'grid') label = entry.isPlayer ? 'YOUR BIKE' : '#' + entry.number;
      else if (stage === 'finish') label = entry.finishTime == null ? 'On course' : time(entry.finishTime);
      else if (incident) label = incident.phase === 'recover' ? 'REMOUNTING' : 'BIKE DOWN';
      else if (!index) label = 'LEADER';
      else label = entry.gapSeconds == null ? '+' + Math.round(entry.gapDistance) + ' m' : '+' + entry.gapSeconds.toFixed(2) + ' s';
      content(row.children[3],label);
    });
    while (list.children.length > entries.length) list.lastElementChild.remove();
  }
  function buildGarage() {
    function addOptions(host, field, options, kind) {
      options.forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.motorcycleField = field;
        button.dataset.motorcycleValue = option.id;
        button.setAttribute('aria-pressed','false');
        button.setAttribute('aria-label',kind === 'model' ? option.name + ', ' + option.subtitle : field + ': ' + option.label);
        button.title = kind === 'model' ? option.name : option.label;
        if (kind === 'model') {
          const name = document.createElement('b'), subtitle = document.createElement('span');
          name.textContent = option.name.replace(/^Apex /,'');
          subtitle.textContent = option.subtitle;
          button.append(name,subtitle);
        } else if (option.color) {
          button.style.setProperty('--swatch',option.color);
          const swatch = document.createElement('i');
          swatch.setAttribute('aria-hidden','true');
          button.append(swatch);
        } else button.textContent = option.label;
        button.addEventListener('click',() => game.setMotorcycle({[field]:option.id}));
        nodes[host].append(button);
        garageControls.push(button);
      });
    }
    addOptions('garage-models','model',motorcycles.models,'model');
    addOptions('garage-paints','paint',motorcycles.paints);
    addOptions('garage-accents','accent',motorcycles.accents);
    addOptions('garage-wheels','wheels',motorcycles.wheels);
    addOptions('garage-liveries','livery',motorcycles.liveries);
  }
  function queueGarageDraw() {
    if (garageDrawQueued) return;
    garageDrawQueued = true;
    requestAnimationFrame(() => {
      garageDrawQueued = false;
      if (!menuOpen || activePanel !== 'garage') return;
      const canvas = nodes['garage-canvas'];
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1,2,1600/rect.width);
      const width = Math.round(rect.width*ratio), height = Math.round(rect.height*ratio);
      if (canvas.width !== width || canvas.height !== height) {canvas.width=width;canvas.height=height;}
      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio,0,0,ratio,0,0);
      ctx.clearRect(0,0,rect.width,rect.height);
      const draw = window.ApexBike?.drawGarage;
      nodes['garage-preview-status'].hidden = Boolean(draw);
      if (draw) draw(ctx,rect.width,rect.height,state.motorcycle,garageView);
    });
  }
  function updateGarage(s) {
    const configuration = s.motorcycle;
    const editable = s.mode === 'ready' || s.mode === 'finished';
    const key = motorcycles.key(configuration) + '/' + editable;
    nodes['garage-lock'].hidden = editable;
    content(nodes['garage-start'].querySelector('span'),editable ? 'START RIDE' : 'RESUME RIDE');
    content(nodes['garage-ride-note'],editable ? 'Your bike. Your line.' : 'Your current motorcycle stays with this ride.');
    if (key === garageKey) return;
    garageKey = key;
    const model = motorcycles.getModel(configuration.model);
    const paint = motorcycles.paints.find(option => option.id === configuration.paint);
    const accent = motorcycles.accents.find(option => option.id === configuration.accent);
    const wheels = motorcycles.wheels.find(option => option.id === configuration.wheels);
    const livery = motorcycles.liveries.find(option => option.id === configuration.livery);
    content(nodes['garage-model-name'],model.name.toUpperCase());
    content(nodes['garage-model-class'],model.subtitle.toUpperCase());
    content(nodes['garage-description'],model.description);
    content(nodes['garage-mobile-description'],model.description);
    content(nodes['home-bike-name'],model.name.toUpperCase());
    content(nodes['home-bike-finish'],paint.label + ' / ' + livery.label + (configuration.livery === 'race' ? ' / #' + configuration.number : ''));
    nodes['home-motorcycle'].setAttribute('aria-label','Open garage. Selected motorcycle: ' + model.name + ', ' + paint.label + ', ' + livery.label + '.');
    content(nodes['garage-paint-label'],paint.label);
    content(nodes['garage-accent-label'],accent.label);
    content(nodes['garage-wheels-label'],wheels.label);
    content(nodes['garage-ride-summary'],model.name.toUpperCase() + ' / ' + paint.label.toUpperCase());
    nodes['garage-canvas'].setAttribute('aria-label',model.name + ' in ' + paint.label + ' with ' + accent.label + ' accents, ' + wheels.label + ' wheels and ' + livery.label + ' livery. ' + garageView + ' preview.');
    ['garage-stats','garage-mobile-stats'].forEach(id => nodes[id].replaceChildren(...model.stats.map(stat => {
      const item = document.createElement('div'), term = document.createElement('dt'), value = document.createElement('dd');
      term.textContent = stat.label.toUpperCase();value.textContent = stat.value;item.append(term,value);return item;
    })));
    garageControls.forEach(button => {
      button.disabled = !editable;
      button.setAttribute('aria-pressed',String(configuration[button.dataset.motorcycleField] === button.dataset.motorcycleValue));
    });
    nodes['garage-number'].disabled = !editable;
    // Keep a focused draft intact while a live update redraws the preview.
    if (document.activeElement !== nodes['garage-number']) nodes['garage-number'].value = configuration.number;
    nodes['garage-number-down'].disabled = !editable || configuration.number <= 1;
    nodes['garage-number-up'].disabled = !editable || configuration.number >= 99;
    queueGarageDraw();
  }
  function update(s) {
    state = s;
    const ready = s.mode === 'ready', racing = s.mode === 'racing', paused = s.mode === 'paused';
    const finished = s.mode === 'finished', counting = s.mode === 'countdown';
    const weather = s.weather === 'rain' ? 'rain' : 'clear';
    const manual = s.transmission === 'manual', event = events[s.course], raceMode = event.race;
    const eventName = event.name, distanceLabel = (s.length/1000).toFixed(2) + ' KM';
    const [gold,silver,bronze] = targets[weather];
    const crash = s.crash;
    if (previousMode !== s.mode) {
      if (paused || finished || counting) showPanel('home');
      previousMode = s.mode;
    }
    setMenu(ready || paused || finished);
    syncGestureGuide(s);
    updateGarage(s);
    frame.dataset.mode = s.mode;
    content(nodes['menu-state'], paused ? 'RIDE PAUSED' : finished ? 'THE FINISH LINE' : 'THE OPEN ROAD AWAITS');
    content(nodes['nav-home'], finished ? 'RESULTS' : 'RIDE');
    nodes['menu-close'].hidden = !paused;
    nodes['setup-lock'].hidden = !paused;
    nodes['restart-btn'].hidden = !paused;
    nodes['resume-note'].hidden = !paused;
    nodes['ride-home'].hidden = finished;
    nodes['finish-home'].hidden = !finished;
    content(action.querySelector('span'), paused ? 'RESUME RIDE' : finished ? 'RIDE AGAIN' : 'RIDE');
    content(nodes['change-event-btn'], paused ? 'Ride settings →' : 'Change event →');
    content(nodes['resume-note'], touchCapable ? 'Resume, then begin a fresh touch to ride.' : 'Your ride is paused. Pick up where you left off.');
    const setup = [s.course,weather,s.transmission,ready || finished,touchCapable,motionState.enabled].join('/');
    if (setup !== previousSetup) {
      previousSetup = setup;
      setupButtons.forEach(button => {
        button.disabled = !(ready || finished);
        button.setAttribute('aria-pressed', String(button.dataset.course === s.course || button.dataset.weather === weather || button.dataset.transmission === s.transmission));
      });
      document.title = eventName + ' · Apex Run';
      content(nodes['event-title'], eventName.toUpperCase());
      content(nodes['event-region'], event.region);
      content(nodes['event-number'], 'STAGE ' + event.stage);
      content(nodes['event-kind'], raceMode ? 'ROAD RACE' : 'TIME TRIAL');
      content(nodes['event-description'], event.description);
      content(nodes['session-distance'], distanceLabel);
      content(nodes['session-weather'], weather === 'rain' ? 'RAIN' : 'CLEAR');
      content(nodes['session-gearbox'], manual ? 'MANUAL' : 'AUTO');
      content(nodes['menu-footer-course'], eventName.toUpperCase());
      content(nodes['menu-footer-tip'], touchCapable ? motionState.enabled ? 'HOLD TO RIDE · TILT TO LEAN' : 'HOLD TO RIDE · DRAG TO LEAN' : 'HEADPHONES RECOMMENDED');
      frame.setAttribute('aria-label', eventName + (raceMode ? ' motorcycle race' : ' time trial'));
      nodes['race-canvas'].setAttribute('aria-label', (event.accessible + ' ') + (touchCapable ? 'Hold one finger to accelerate and ' + (motionState.enabled ? 'tilt your phone' : 'drag sideways') + ' to lean. Hold a second finger to brake. Lift to coast.' : 'Use W to accelerate and A or D to lean. Open the game menu with P or Escape.'));
      nodes['race-canvas'].setAttribute('aria-describedby', touchCapable ? 'touch-riding-help' : 'keyboard-controls');
      nodes['race-board'].hidden = !raceMode;
      nodes.medals.hidden = raceMode;
      content(nodes['right-hud-label'], raceMode ? 'POSITION' : 'SECTOR');
      content(nodes['right-hud-total'], raceMode ? ' / 04' : ' / 03');
      nodes['race-gap'].hidden = !raceMode;
      const shortTime = seconds => Math.floor(seconds/60) + ':' + pad(seconds%60);
      ['gold-pace','silver-pace','bronze-pace'].forEach((id,i) => content(nodes[id],shortTime(targets[weather][i])));
      nodes['shift-help'].hidden = !manual;
      content(nodes['ride-tip'], raceMode && weather === 'clear' ? event.tip : weather === 'rain' ? 'Brake while upright. Ease onto the throttle as you lift the bike out of a wet corner.' : 'Brake before the bend. Lean in, then roll on the throttle as the road opens.');
    }
    window.ApexTelemetry.update(s);
    content(nodes.speed, pad(Math.round(s.speed),3));
    content(nodes.timer,time(s.time));
    content(nodes.gear,ready || counting || crash ? 'N' : s.gear);
    content(nodes['sector-num'], pad(raceMode ? s.racePosition : s.sector));
    content(nodes['record-label'], s.best == null ? (raceMode ? 'RACE DISTANCE' : 'GOLD TARGET') : (weather === 'rain' ? 'WET PERSONAL BEST' : 'DRY PERSONAL BEST'));
    content(nodes['best-val'], raceMode && s.best == null ? distanceLabel : time(s.best ?? gold));
    content(nodes['finish-crashes'], s.crashCount || 0);
    const place = window.ApexEnvironment?.zoneAt(s.course,s.distance);
    const placeKey = s.course + '/' + (place?.name || '');
    if (placeKey !== lastPlace || ready || counting) {
      lastPlace = placeKey; placeUntil = s.time + 4.5;
      content(nodes['place-name'],place?.name?.toUpperCase() || '');
      content(nodes['place-detail'],place?.detail || '');
    }
    nodes['place-cue'].hidden = !place || menuOpen || Boolean(crash) || (!counting && s.time > placeUntil);
    if (raceMode) {
      const phase = ready || counting ? 'grid' : finished ? 'finish' : 'race';
      content(nodes['order-title'], phase === 'grid' ? 'STARTING GRID' : phase === 'finish' ? 'AT YOUR FINISH' : 'RACE ORDER');
      showOrder(nodes['running-order'],s.classification,phase,[s,...s.rivals]);
      const rider = s.classification.find(r => r.isPlayer);
      const gap = rider.gapSeconds == null ? '+' + Math.round(rider.gapDistance) + ' m' : '+' + rider.gapSeconds.toFixed(2) + ' s';
      content(nodes['race-gap'], phase === 'grid' ? 'STARTING GRID' : s.racePosition === 1 ? 'RACE LEADER' : gap + ' TO P1');
    }
    sectors.forEach((col,i) => {
      col.classList.toggle('complete', s.splits[i] != null);
      col.classList.toggle('current', !finished && s.sector === i+1);
      content(col.querySelector('b'),time(s.splits[i]));
    });
    const revCount = Math.min(14,Math.round(s.rpm/(s.redline || 14100)*14));
    revBars.forEach((bar,i) => {bar.classList.toggle('on',i<revCount);bar.classList.toggle('hot',i>=10 && i<revCount);});
    nodes['progress-bar'].style.width = Math.max(0,Math.min(100,100*s.distance/s.length)) + '%';
    nodes.screen.classList.toggle('cockpit-view', s.camera === 'cockpit');
    content(nodes['camera-btn'].querySelector('b'), s.camera === 'cockpit' ? 'Cockpit' : 'Chase');
    nodes['camera-btn'].setAttribute('aria-label', 'Camera: ' + s.camera + '. Switch to ' + (s.camera === 'cockpit' ? 'chase' : 'cockpit') + '.');
    content(nodes['sound-btn'].querySelector('b'), s.sound ? 'On' : 'Off');
    nodes['sound-btn'].querySelector('use').setAttribute('href',s.sound ? '#sound-on' : '#sound-off');
    nodes['sound-btn'].setAttribute('aria-pressed',String(s.sound));
    nodes['sound-btn'].setAttribute('aria-label',s.sound ? 'Mute game sound' : 'Enable game sound');
    nodes['count-wrap'].hidden = !counting;
    if (counting) content(nodes['count-val'],s.countdown);
    if (ready || counting) splitNotice = null;
    if (racing && s.sector > previousSector) {
      const i = s.sector-2;
      const delta = s.bestSplits[i] == null ? '' : '  (' + (s.splits[i] < s.bestSplits[i] ? '−' : '+') + Math.abs(s.splits[i]-s.bestSplits[i]).toFixed(2) + ')';
      splitNotice = {end:s.time+3.2,text:'S'+(i+1)+'  '+time(s.splits[i])+delta};
    }
    previousSector = s.sector;
    const contact = s.impact?.type === 'rider' && s.impact.age < .85 && s.impact.severity > .12;
    const alert = racing && !crash && (s.barrierContact ? 'GUARDRAIL SCRAPE' : contact ? 'RIDER CONTACT' : splitNotice && s.time < splitNotice.end ? splitNotice.text : s.offroad ? 'OFF ROAD · LOW GRIP' : s.time < 1.25 ? 'GO!' : s.speed < 1 ? (touchCapable ? (touchBlocked ? 'LIFT FINGERS TO RESET' : 'TOUCH & HOLD TO RIDE') : 'HOLD W OR ↑ TO RIDE') : '');
    nodes['race-alert'].hidden = !alert;
    if (alert) content(nodes['race-alert'],alert);
    nodes['incident-panel'].hidden = !(racing && crash);
    if (crash) {
      content(nodes['incident-title'],crash.phase === 'recover' ? 'REMOUNTING' : crash.phase === 'slide' ? 'SLIDING' : 'BIKE DOWN');
      content(nodes['incident-detail'],crash.phase === 'recover' ? 'Back on the bike in ' + Math.max(0,crash.recoveryLeft).toFixed(1) + ' s' : 'Race clock continues');
      nodes['incident-progress'].style.width = Math.max(0,Math.min(1,crash.progress))*100 + '%';
    }
    nodes['finish-order'].hidden = !(finished && raceMode);
    if (finished) {
      if (raceMode) showOrder(nodes['finish-order'],s.classification,'finish');
      content(nodes['dialog-kicker'],s.isRecord ? 'NEW PERSONAL BEST' : eventName.toUpperCase());
      const medal = s.time <= gold ? 'GOLD MEDAL' : s.time <= silver ? 'SILVER MEDAL' : s.time <= bronze ? 'BRONZE MEDAL' : 'RUN COMPLETE';
      content(nodes['dialog-title'],raceMode ? (s.racePosition === 1 ? 'RACE WON' : ordinal[s.racePosition].toUpperCase() + ' PLACE') : medal);
      content(nodes['dialog-info'],time(s.time));
    }
  }
  function nativeFull() {return Boolean(document.fullscreenElement || document.webkitFullscreenElement);}
  function syncFullscreen() {
    const full = nativeFull();
    nodes['full-btn'].setAttribute('aria-pressed',String(full));
    nodes['full-btn'].setAttribute('aria-label',full ? 'Exit fullscreen' : 'Enter fullscreen');
    content(nodes['full-btn'].querySelector('b'),full ? 'Exit' : 'Enter');
  }
  function requestFullscreen() {
    if (nativeFull()) return;
    const request = frame.requestFullscreen || frame.webkitRequestFullscreen;
    if (!request) {
      content(nodes['fullscreen-note'],'Fullscreen isn’t available in this browser. The game still fills the window.');
      return;
    }
    try {
      const pending = request.call(frame);
      pending?.catch(() => content(nodes['fullscreen-note'],'The game still fills the browser view. Fullscreen is optional.'));
    } catch {content(nodes['fullscreen-note'],'The game still fills the browser view. Fullscreen is optional.');}
  }
  function play() {
    requestFullscreen();
    game.start();
  }
  action.addEventListener('click',() => {
    if (state.mode === 'paused') play();
    else showPanel('garage',true);
  });
  nodes['home-motorcycle'].addEventListener('click',() => showPanel('garage',true));
  nodes['garage-start'].addEventListener('click',play);
  nodes['garage-end-ride'].addEventListener('click',() => {showPanel('garage');game.returnToGrid();nodes['nav-garage'].focus({preventScroll:true});});
  garageViews.forEach(button => button.addEventListener('click',() => {
    garageView = button.dataset.garageView;
    garageViews.forEach(view => view.setAttribute('aria-pressed',String(view === button)));
    garageKey = '';updateGarage(state);queueGarageDraw();
  }));
  const commitNumber = () => {
    const draft = nodes['garage-number'].value;
    if (draft.trim()) game.setMotorcycle({number:draft});
    nodes['garage-number'].value = state.motorcycle.number;
  };
  nodes['garage-number'].addEventListener('input',() => {
    const draft = nodes['garage-number'].value;
    const value = Number(draft);
    if (draft.trim() && Number.isInteger(value) && value >= 1 && value <= 99) game.setMotorcycle({number:value});
  });
  nodes['garage-number'].addEventListener('change',commitNumber);
  nodes['garage-number'].addEventListener('blur',commitNumber);
  nodes['garage-number'].addEventListener('keydown',e => {if (e.key === 'Enter') {e.preventDefault();commitNumber();nodes['garage-number'].blur();}});
  nodes['garage-number-down'].addEventListener('click',() => game.setMotorcycle({number:state.motorcycle.number-1}));
  nodes['garage-number-up'].addEventListener('click',() => game.setMotorcycle({number:state.motorcycle.number+1}));
  window.addEventListener('apex:asset',queueGarageDraw);
  window.addEventListener('resize',queueGarageDraw);
  if ('ResizeObserver' in window) new ResizeObserver(queueGarageDraw).observe(nodes['garage-canvas']);
  nodes['menu-close'].addEventListener('click',play);
  nodes['menu-btn'].addEventListener('click',() => game.togglePause());
  nodes['restart-btn'].addEventListener('click',() => {requestFullscreen();game.restart();});
  nodes['change-event-btn'].addEventListener('click',() => showPanel('settings',true));
  nodes['end-ride-btn'].addEventListener('click',() => {showPanel('settings');game.returnToGrid();nodes['nav-settings'].focus({preventScroll:true});});
  setupButtons.forEach(button => button.addEventListener('click',() => {
    if (button.dataset.course) game.setCourse(button.dataset.course);
    else if (button.dataset.weather) game.setWeather(button.dataset.weather);
    else game.setTransmission(button.dataset.transmission);
  }));
  navButtons.forEach(button => button.addEventListener('click',() => showPanel(button.dataset.panel)));
  nodes['menu-nav'].addEventListener('keydown',e => {
    const index = navButtons.indexOf(document.activeElement);
    if (index < 0 || !['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? navButtons.length-1 : (index+(e.key === 'ArrowRight' ? 1 : -1)+navButtons.length)%navButtons.length;
    showPanel(navButtons[next].dataset.panel,true);
  });
  nodes['camera-btn'].addEventListener('click',game.cycleCamera);
  nodes['sound-btn'].addEventListener('click',game.toggleSound);
  nodes['tilt-btn'].addEventListener('click',() => {
    // iPhone permission must be requested directly from this user gesture.
    if (motionState.enabled) window.ApexMotion.disable();
    else window.ApexMotion?.enable();
  });
  nodes['tilt-recenter'].addEventListener('click',() => window.ApexMotion?.recenter());
  nodes['full-btn'].addEventListener('click',() => {
    if (nativeFull()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try {exit?.call(document)?.catch?.(() => {});} catch {}
    } else requestFullscreen();
  });
  function fullscreenChanged() {
    const full = nativeFull();
    if (wasNativeFull && !full && ['racing','countdown'].includes(state.mode)) game.togglePause();
    wasNativeFull = full;
    syncFullscreen();
  }
  document.addEventListener('fullscreenchange',fullscreenChanged);
  document.addEventListener('webkitfullscreenchange',fullscreenChanged);
  window.addEventListener('apex:menu-toggle',e => {
    e.preventDefault();
    // Browser Escape owns exiting native fullscreen; that change pauses the ride.
    if (e.detail?.key === 'Escape' && nativeFull()) return;
    if (!menuOpen) game.togglePause();
    else if (activePanel !== 'home') showPanel('home',true);
    else if (state.mode === 'paused') game.start();
  });
  menu.addEventListener('keydown',e => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(menu.querySelectorAll('button:not(:disabled),input:not(:disabled),summary,[tabindex="0"]')).filter(node => node.tabIndex >= 0 && node.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (e.shiftKey && (document.activeElement === first || !menu.contains(document.activeElement))) {e.preventDefault();last?.focus();}
    else if (!e.shiftKey && (document.activeElement === last || !menu.contains(document.activeElement))) {e.preventDefault();first?.focus();}
  });
  frame.addEventListener('pointerdown',e => {if (e.pointerType === 'touch') enableTouch();},{passive:true,capture:true});
  coarsePointer.addEventListener?.('change',e => {if (e.matches) enableTouch();});
  window.addEventListener('apex:motion',e => {
    const previous = motionState;
    motionState = e.detail;
    if (previous.enabled === motionState.enabled && previous.status === motionState.status && previous.supported === motionState.supported) return;
    syncMotionSettings();
    if (previous.enabled !== motionState.enabled) gestureSeen = false;
    update(state);
  });
  window.addEventListener('apex:touch',e => {
    const input = e.detail || {};
    if (input.available || input.pointers > 0) enableTouch();
    touchBlocked = Boolean(input.blocked);
    if (input.active && input.primaryDown && !input.blocked && !gestureSeen) {
      gestureSeen = true;
      try {sessionStorage.setItem('apex-touch-learned','1');} catch {}
    }
    syncGestureGuide(state);
  });
  window.addEventListener('apex:update',e => update(e.detail));
  buildGarage();
  showPanel('home');
  syncFullscreen();
  syncMotionSettings();
  update(state);
})();
