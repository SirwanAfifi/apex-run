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
