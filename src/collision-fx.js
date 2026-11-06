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
