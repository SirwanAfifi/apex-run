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
