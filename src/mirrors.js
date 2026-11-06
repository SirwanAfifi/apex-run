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
