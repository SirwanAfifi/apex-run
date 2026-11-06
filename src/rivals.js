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
