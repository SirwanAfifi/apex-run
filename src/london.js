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
