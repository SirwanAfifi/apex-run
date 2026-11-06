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
