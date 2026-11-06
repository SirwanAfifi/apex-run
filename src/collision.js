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
