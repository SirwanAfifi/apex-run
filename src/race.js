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
