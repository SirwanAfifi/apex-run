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
