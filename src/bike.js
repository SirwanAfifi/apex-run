(() => {
  'use strict';

  const sprites = new Map();
  const ink = '#161722';
  const material = (image,state,view) => window.ApexBikeGarage?.surface(image,state.motorcycle,view)||image;

  // All the artwork is drawn in a 200 × 220 frame, with the contact patch at (0, 210).
  function makeSprite(braking) {
    const canvas = document.createElement('canvas');
    const resolution = 3;
    canvas.width = 200 * resolution;
    canvas.height = 220 * resolution;
    const g = canvas.getContext('2d');
    g.scale(resolution, resolution);
    g.translate(100, 0);
    g.lineJoin = 'round';
    g.lineCap = 'round';

    function paint(d, fill, line, width = 1.5) {
      const path = new Path2D(d);
      if (fill) {
        g.fillStyle = fill;
        g.fill(path);
      }
      if (line) {
        g.strokeStyle = line;
        g.lineWidth = width;
        g.stroke(path);
      }
    }
    const stroke = (d, color, width) => paint(d, null, color, width);
    const shade = (x1, y1, x2, y2, stops) => {
      const grad = g.createLinearGradient(x1, y1, x2, y2);
      stops.forEach(([position, color]) => grad.addColorStop(position, color));
      return grad;
    };
    const silver = shade(-12, 0, 16, 10, [[0, '#fff1d4'], [.22, '#b5a6a2'], [.52, '#62606b'], [.72, '#363846'], [1, '#92949a']]);
    const red = shade(-52, 70, 46, 112, [[0, '#ffb776'], [.23, '#f24c37'], [.56, '#ca2a2c'], [.84, '#931f35'], [1, '#5d2335']]);
    const leather = shade(-32, 0, 34, 0, [[0, '#756066'], [.13, '#443d49'], [.43, '#272a39'], [.7, '#202331'], [1, '#161a25']]);
    const rubber = shade(-22, 0, 22, 0, [[0, '#181923'], [.08, '#4c444c'], [.25, '#4c454c'], [.46, '#35333e'], [.72, '#292a34'], [.92, '#191c27'], [1, '#34303a']]);

    // Rear wheel and the far side of its brake disc.
    paint('M-11 119 Q0 113 14 121 C21 129 22 156 21 180 C21 198 17 208 9 210 Q1 212 -10 210 C-19 206 -22 198 -22 178 C-22 149 -20 129 -11 119Z', rubber, ink, 2.6);
    stroke('M-13 139 C-19 157 -19 192 -13 201', '#77606a', 1.5);
    stroke('M16 148 C18 159 17 182 15 195', '#151923', 2);
    for (let y = 151; y < 202; y += 11) {
      stroke('M-19 ' + y + ' q3 3 7 4 m20 1 8 -5', '#25242f', 1.5);
      stroke('M-18 ' + (y - 1) + ' l4 2', '#59505a', .7);
    }
    paint('M-21 144 Q-28 150 -27 171 Q-27 187 -21 187 L-17 178 -18 145Z', '#252631', ink, 2);
    stroke('M-23 146 Q-30 169 -23 181', '#f87553', 2.4);
    stroke('M-23 153 Q-27 166 -24 176', '#96909a', 1.4);

    // Rear suspension, chain, swingarm, axle covers and footrests.
    paint('M-28 124 L-36 129 -27 171 -20 177 -16 171 -20 132Z', '#3b3a47', ink, 2.4);
    paint('M-30 129 L-32 132 -25 167 -22 169 -22 161Z', '#9e8e92');
    paint('M18 132 L32 122 36 127 27 169 21 177 16 172Z', '#48444e', ink, 2.4);
    stroke('M29 132 L23 163', '#a79899', 2.5);
    paint('M-24 164 l5 2 1 7 -5 3 -5 -4Z', silver, ink, 1.4);
    paint('M21 163 l6 1 2 7 -6 5 -5 -4Z', silver, ink, 1.4);
    stroke('M-23 173 L-35 144 M-22 168 L-32 140', '#242631', 1.8);

    // Nose and cockpit appear on both sides of the crouched rider.
    paint('M-60 89 C-65 77 -55 65 -46 61 L-30 58 -18 65 19 65 32 56 50 63 Q63 74 60 90 L48 115 30 140 18 135 -18 134 -34 143 -53 114Z', red, ink, 2.8);
    paint('M-60 85 L-49 92 -31 120 -34 135 -48 113Z', '#641e32');
    paint('M60 82 L55 101 36 133 30 136 36 112Z', '#562134');
    paint('M-59 80 Q-55 69 -46 66 L-39 66 -52 78Z', '#ffb28f');
    paint('M58 81 L49 75 40 65 47 66Z', '#f56b51');
    paint('M-58 89 L-51 94 -44 110 -52 104Z M58 88 L55 102 47 109 50 96Z', '#1f2330');
    stroke('M-53 106 l10 12 M54 103 l-10 14', '#e66048', 1.7);
    stroke('M-42 72 L-52 60 -63 58 M42 72 L52 60 63 58', '#292632', 3);
    paint('M-70 54 Q-63 50 -55 54 L-55 59 Q-62 61 -68 59Z', '#443c45', ink, 1.6);
    paint('M70 54 Q63 50 55 54 L55 59 Q62 61 68 59Z', '#32333d', ink, 1.6);
    stroke('M-67 54 Q-62 53 -59 54 M58 54 L66 54', '#bc9592', 1.3);

    // Leathers and armored boots, with asymmetric sunset lighting.
    for (const side of [-1, 1]) {
      g.save();
      g.scale(side, 1);
      paint('M23 85 Q33 85 39 97 L47 112 Q49 120 43 131 L35 140 34 153 26 159 20 155 22 139 28 122 22 109Z', leather, ink, 2.6);
      paint('M35 101 Q46 109 46 116 L43 124 39 125 37 115 30 106Z', side === -1 ? '#876065' : '#51404c');
      stroke('M41 108 Q47 118 41 125', side === -1 ? '#dd937e' : '#935d61', 1.7);
      paint('M29 130 L39 126 39 136 33 145 33 154 26 158 20 156 23 148Z', '#252936', ink, 1.8);
      paint('M29 135 l6 -4 -2 8 -6 8Z', '#63606b');
      stroke('M23 151 L29 149 M22 155 L27 154', '#8c7880', 1.2);
      paint('M22 154 L28 153 34 150 34 157 27 161 20 160Z', '#211f2a', ink, 1.1);
      stroke('M26 161 l10 -4', '#a89b98', 2);
      g.restore();
    }

    // Titanium exhaust can, its bevelled cap and the warm reflection along the seam.
    paint('M36 132 L43 127 52 128 55 135 41 162 Q38 168 32 166 L27 162Z', shade(28, 140, 50, 149, [[0, '#5b5260'], [.27, '#aaa2a5'], [.43, '#efe0c9'], [.57, '#88858e'], [.85, '#555663'], [1, '#353541']]), ink, 2.4);
    paint('M35 150 L45 154 43 158 33 154Z', '#575763');
    paint('M41 127 Q48 122 54 128 Q57 132 53 137 Q48 141 41 136 Q37 132 41 127Z', '#b1a2a2', ink, 1.7);
    paint('M43 128 Q48 125 52 129 Q54 132 51 134 Q46 137 42 133Z', '#282733', '#77737a', 1.1);

    // Jacket, elbows and gauntlets.
    paint('M-14 39 Q-23 35 -33 42 L-45 54 -54 72 Q-57 79 -51 85 L-44 86 -36 78 -29 66 -25 87 -29 95 Q-27 106 -14 109 L15 109 Q27 106 28 95 L25 87 29 65 36 79 45 86 52 84 Q58 79 54 72 L44 53 Q35 38 19 38Z', leather, ink, 2.7);
    paint('M-17 40 Q-31 37 -39 48 L-49 65 -43 70 -34 57 -24 53Z', red);
    paint('M17 40 Q33 37 40 49 L49 65 43 70 33 56 25 53Z', '#ad303a');
    stroke('M-46 62 L-39 49 Q-31 40 -25 41', '#ffc4a0', 2.1);
    stroke('M-42 62 L-35 52 -26 48 M42 62 L35 52 27 48', '#e9c9b3', 3);
    paint('M-42 69 L-47 65 -54 75 -51 82 -45 83 -41 76Z M42 70 L47 65 54 75 51 82 45 83 40 76Z', '#242633', ink, 1.6);
    stroke('M-51 74 l5 -2 M-52 77 l5 -2 M46 72 l5 3', '#8a7380', 1.5);
    paint('M-28 54 Q-17 49 -14 48 L15 48 29 54 26 62 20 66 15 88 -14 88 -20 67 -26 62Z', shade(-24, 50, 24, 83, [[0, '#78616a'], [.33, '#45414e'], [.85, '#323342'], [1, '#252735']]));
    stroke('M-25 57 l7 6 6 21 M24 57 l-7 6 -5 21', '#8b7077', 1.3);
    paint('M-23 69 L-16 78 -13 89 -23 85Z M23 69 L16 78 13 89 23 85Z', '#a73740');
    // A small, original embroidered apex insignia on the spine protector.
    paint('M-10 68 L-1 56 7 56 11 61 4 61 0 60 -6 68Z M1 66 L6 61 12 68 5 68Z', '#f3d8bc');
    stroke('M-7 72 L6 72', '#e56c58', 1.6);
    paint('M-21 90 Q0 96 22 90 L25 97 Q0 106 -26 97Z', '#202332', ink, 1.5);
    stroke('M-19 91 Q-3 95 18 92', '#8e6972', 1.4);

    // Undertail and angular red tail fairing. The small central light intensifies while braking.
    paint('M-29 107 L30 107 29 126 19 145 11 150 -12 149 -22 140 -29 123Z', '#282a35', ink, 2.3);
    paint('M-13 137 L12 137 8 146 -8 146Z', '#45434f');
    paint('M-24 102 Q-18 98 0 99 Q18 98 24 102 L36 110 34 119 22 130 11 135 -12 135 -23 130 -35 118 -36 110Z', red, ink, 2.5);
    paint('M-21 102 Q0 98 20 102 L23 107 Q0 111 -23 106Z', '#493440', '#251e2a', 1.8);
    stroke('M-29 106 L-32 110 -22 118 M28 106 L33 110 25 117', '#ff9470', 2.2);
    paint('M-29 115 L-17 118 0 122 18 117 30 114 24 124 10 131 -11 131 -24 124Z', '#4c1f30', ink, 1.3);
    paint('M-22 117 L-4 120 0 123 4 120 22 117 17 124 6 128 -6 128 -18 124Z', braking ? '#ff654d' : '#f44742', '#882c3d', 1.3);
    stroke('M-18 119 L-5 122 M5 122 L18 119', braking ? '#fff8df' : '#ffa293', braking ? 3.4 : 2);
    paint('M-22 130 L-12 134 10 134 21 130 15 137 -15 137Z', '#373642', ink, 1.2);

    // Helmet shell above the collar, including vents, reflective strip, painted crown.
    paint('M-13 37 Q0 32 14 38 L17 45 Q0 51 -17 44Z', '#252633', ink, 2.3);
    paint('M-23 23 C-23 9 -14 2 -2 1 C13 -1 22 7 23 20 Q24 32 18 40 Q12 46 1 47 Q-12 46 -18 40 Q-24 33 -23 23Z', shade(-19, 4, 22, 39, [[0, '#f4b49c'], [.16, '#c0817c'], [.27, '#524452'], [.56, '#383646'], [.83, '#222433'], [1, '#151b29']]), ink, 2.7);
    paint('M-19 13 Q-16 4 -7 3 L1 2 -9 10 -13 21 -20 23Z', '#dd5549');
    paint('M-8 3 L0 2 -8 11 -13 21 -16 22 -12 11Z', '#ffb28f');
    paint('M4 3 Q14 4 19 12 L20 19 13 15Z', '#923944');
    paint('M-22 21 Q-9 24 0 21 Q13 20 22 16 L22 23 Q10 31 -1 31 Q-16 31 -22 27Z', '#151c2a', ink, 1);
    stroke('M-20 22 Q-2 26 19 18', '#a88a92', 1.6);
    stroke('M-17 31 Q-4 36 13 30', '#b56c6b', 2.3);
    paint('M-14 35 Q0 39 15 32 L13 37 Q0 44 -11 40Z', '#41414d');
    stroke('M-7 38 l5 1 M2 39 l6 -2', '#181d2b', 2.1);
    stroke('M-19 14 Q-15 5 -7 4', '#ffcfad', 2.1);
    return canvas;
  }

  function drawFallbackRider(g, w, h, state) {
    const braking = Boolean(state.braking && state.speed > 3);
    if (!sprites.has(braking)) sprites.set(braking, makeSprite(braking));
    const size = Math.min(h * .34 / 210, w * .36 / 140);
    const lean = Math.max(-1, Math.min(1, state.lean || 0));
    const speed = Math.max(0, state.speed || 0);
    const time = state.time || 0;
    const moving = Math.min(1, speed / 90);
    const bounce = (Math.sin(time * 25) + .5 * Math.sin(time * 38)) * moving *
      (state.offroad ? 1.9 : .36);
    const x = w * .5;
    const y = h * .912;
    g.save();
    g.translate(x, y);
    g.scale(size, size);

    // A soft grounding shadow under the rear tire, cast slightly away from the sun.
    g.save();
    g.translate(8 + lean * 3, -.8);
    g.scale(1, .19);
    const shadow = g.createRadialGradient(0, 0, 0, 0, 0, 56);
    shadow.addColorStop(0, 'rgba(17,18,25,.75)');
    shadow.addColorStop(.45, 'rgba(20,19,28,.53)');
    shadow.addColorStop(1, 'rgba(23,21,28,0)');
    g.fillStyle = shadow;
    g.fillRect(-56, -56, 112, 112);
    g.restore();

    if (state.offroad && speed > 20) {
      for (let i = 0; i < 12; i++) {
        const age = (time * 2.2 + i / 12) % 1;
        const side = i % 2 ? 1 : -1;
        const offset = Math.sin(i * 57.4);
        const dustX = side * (8 + age * (25 + 21 * Math.abs(offset)));
        g.fillStyle = 'rgba(226,181,139,' + (.24 * (1 - age)) + ')';
        g.beginPath();
        g.ellipse(dustX, age * 13 - 2 - age * age * (9 + 13 * offset), 2 + 9 * age, 1 + 4 * age, side * .2, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.translate(0, bounce);
    g.rotate(lean * .285);
    window.ApexMirrors?.drawBacks(g,200,210,state);
    g.drawImage(material(sprites.get(braking),state,'fallback'), -100, -210, 200, 220);
    g.restore();
  }

  const loadingImages = new Set();
  function loadImage(name, ready) {
    const img = new Image();
    const source = window.ApexAssets?.[name] || 'assets/' + name;
    let retries = 0;
    loadingImages.add(img);
    img.decoding = 'async';
    img.onload = () => {
      loadingImages.delete(img);
      ready(img);
      window.dispatchEvent(new Event('apex:asset'));
    };
    img.onerror = () => {
      if (retries === 2 || /^(data|blob):/.test(source)) {
        loadingImages.delete(img);
        return;
      }
      retries++;
      // Bypass a cached transient error, then leave the drawable fallback in place.
      setTimeout(() => {
        const next = new URL(source, document.baseURI);
        next.searchParams.set('retry', String(retries));
        img.src = next.href;
      }, 700 * retries);
    };
    img.src = source;
  }

  // A narrow crop of the photographed rear contact surface, in image coordinates.
  const treadArea = { x: .385, y: .524, width: .233, height: .469 };
  function makeSpinningTread(image) {
    const patch = document.createElement('canvas');
    patch.width = 128;
    patch.height = 320;
    const g = patch.getContext('2d');
    const a = treadArea;
    g.drawImage(image, image.width * a.x, image.height * a.y,
      image.width * a.width, image.height * a.height, 0, 0, patch.width, patch.height);
    const source = g.getImageData(0, 0, patch.width, patch.height);
    const blurred = g.createImageData(patch.width, patch.height);
    const sums = new Float64Array((patch.height + 1) * 3);
    // Average along the direction of rotation within each tread column, stopping
    // before the rounded shoulder and the contact patch so the outline stays crisp.
    for (let x = 0; x < patch.width; x++) {
      const across = (a.x + (x + .5) / patch.width * a.width - .501) / .113;
      if (Math.abs(across) >= 1) continue;
      const shoulder = 1 - Math.sqrt(1 - across * across);
      const top = Math.ceil((.53 + .064 * shoulder - a.y) / a.height * patch.height);
      const end = Math.floor((.991 - .053 * shoulder - a.y) / a.height * patch.height);
      for (let y = top; y < end; y++) {
        const pixel = (y * patch.width + x) * 4;
        for (let c = 0; c < 3; c++) {
          sums[(y + 1) * 3 + c] = sums[y * 3 + c] + source.data[pixel + c];
        }
      }
      for (let y = top; y < end; y++) {
        const first = Math.max(top, y - 69), last = Math.min(end, y + 70);
        const pixel = (y * patch.width + x) * 4;
        for (let c = 0; c < 3; c++) {
          blurred.data[pixel + c] = (sums[last * 3 + c] - sums[first * 3 + c]) / (last - first);
        }
        const feather = Math.min(1, (1 - Math.abs(across)) * 15, (y - top) / 9, (end - y) / 8);
        blurred.data[pixel + 3] = source.data[pixel + 3] * feather;
      }
    }
    g.putImageData(blurred, 0, 0);
    return patch;
  }

  const weatherFX = window.ApexRiderWeather;
  function shadingMask(image, color) {
    const mask = document.createElement('canvas');
    mask.height = 360;
    mask.width = Math.max(1, Math.round(360 * image.width / image.height));
    const brush = mask.getContext('2d');
    brush.drawImage(image, 0, 0, mask.width, mask.height);
    brush.globalCompositeOperation = 'source-in';
    brush.fillStyle = color;
    brush.fillRect(0, 0, mask.width, mask.height);
    return mask;
  }

  let rider, wetRider, cockpit, wetCockpit, relitCockpit;
  let silhouette, cockpitShade, wetCockpitShade, spinningTread, wetTread;
  loadImage('sierra-rider.webp', image => {
    rider = image;
    silhouette = shadingMask(image, '#182630');
    wetRider = weatherFX?.relight(image) || image;
    try {
      spinningTread = makeSpinningTread(image);
      wetTread = wetRider === image ? spinningTread : makeSpinningTread(wetRider);
    } catch (error) {
      // Local file previews can load an image while disallowing pixel reads.
      if (error.name !== 'SecurityError') throw error;
    }
  });
  loadImage('sierra-cockpit.webp', image => {
    cockpit = image;
    cockpitShade = shadingMask(image, '#20303b');
    if (!wetCockpit) relitCockpit = weatherFX?.relight(image);
  });
  loadImage('sierra-cockpit-wet.webp', image => {
    wetCockpit = image;
    wetCockpitShade = shadingMask(image, '#20303b');
    relitCockpit = null;
  });

  // Each 4 × 3 atlas contains increasing lever travel; the original photograph is
  // the exact neutral frame. Replacing RGBA pixels reveals the road where an open
  // lever used to be, including when both controls are operated together.
  const handPoses = {
    dry: { left: null, right: null },
    wet: { left: null, right: null }
  };
  const controls = [
    { side: 'left', sourceX: 0, file: 'sierra-left-clutch' },
    { side: 'right', sourceX: 1002, file: 'sierra-right-brake' }
  ];
  const poseSurface = document.createElement('canvas');
  const poseBrush = poseSurface.getContext('2d');
  let poseBase = null, poseShade = null;
  const previousLevels = { left: -1, right: -1 };
  const seenConditions = new Set();

  function requestHandPoses(rainy) {
    const condition = rainy ? 'wet' : 'dry';
    if (seenConditions.has(condition)) return;
    seenConditions.add(condition);
    for (const control of controls) {
      const filename = control.file + (rainy ? '-wet' : '') + '-travel.webp';
      loadImage(filename, img => { handPoses[condition][control.side] = img; });
    }
  }

  function matchHands(photo, state, rainy) {
    requestHandPoses(rainy);
    const images = handPoses[rainy ? 'wet' : 'dry'];
    const left = images.left ? Math.round(clamp(state.clutch || 0, 0, 1) * 12) : 0;
    const right = images.right ? Math.round(clamp(state.brake || 0, 0, 1) * 12) : 0;
    if (left === 0 && right === 0) return null;
    if (poseBase !== photo) {
      poseSurface.width = photo.width;
      poseSurface.height = photo.height;
      poseBrush.drawImage(photo, 0, 0);
      previousLevels.left = previousLevels.right = 0;
      poseBase = photo;
      poseShade = null;
    }

    let dirty = false;
    for (const control of controls) {
      const level = control.side === 'left' ? left : right;
      if (level === previousLevels[control.side]) continue;
      const x = control.sourceX, y = 444, w = 348, h = 304;
      poseBrush.clearRect(x, y, w, h);
      if (level === 0) {
        poseBrush.drawImage(photo, x, y, w, h, x, y, w, h);
      } else {
        const atlas = images[control.side], index = level - 1;
        const fw = atlas.width / 4, fh = atlas.height / 3;
        poseBrush.drawImage(atlas, (index % 4) * fw, Math.floor(index / 4) * fh,
          fw, fh, x, y, w, h);
      }
      previousLevels[control.side] = level;
      dirty = true;
    }
    if (dirty || !poseShade) {
      // The shelter tint must follow the new finger and lever silhouette too.
      if (!poseShade) poseShade = shadingMask(poseSurface, '#20303b');
      else {
        const brush = poseShade.getContext('2d');
        brush.globalCompositeOperation = 'copy';
        brush.drawImage(poseSurface, 0, 0, poseShade.width, poseShade.height);
        brush.globalCompositeOperation = 'source-in';
        brush.fillStyle = '#20303b';
        brush.fillRect(0, 0, poseShade.width, poseShade.height);
      }
    }
    return poseSurface;
  }

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

  function contact(g, radius) {
    g.save();
    g.scale(radius, radius * .22);
    const core = g.createRadialGradient(0, 0, .02, 0, 0, 1);
    core.addColorStop(0, 'rgba(18,18,22,.87)');
    core.addColorStop(.42, 'rgba(22,20,24,.5)');
    core.addColorStop(1, 'rgba(26,23,26,0)');
    g.fillStyle = core;
    g.fillRect(-1, -1, 2, 2);
    g.restore();
  }

  const dustPuff = document.createElement('canvas');
  dustPuff.width = dustPuff.height = 48;
  {
    const brush = dustPuff.getContext('2d');
    const haze = brush.createRadialGradient(24, 24, 0, 24, 24, 24);
    haze.addColorStop(0, 'rgba(185,155,124,.55)');
    haze.addColorStop(.4, 'rgba(190,161,130,.34)');
    haze.addColorStop(1, 'rgba(198,171,140,0)');
    brush.fillStyle = haze;
    brush.fillRect(0, 0, 48, 48);
  }

  function drawDust(g, height, state) {
    if (!state.offroad || state.speed < 14) return;
    const strength = clamp((state.speed - 14) / 90, 0, 1);
    const trail = (state.distance || 0) / 11;
    g.save();
    for (let i = 0; i < 20; i++) {
      const phase = (trail + i * .618034) % 1;
      const wind = Math.sin(i * 43.73);
      const x = height * (Math.sign(wind) * .025 + phase * (.05 + wind * .43));
      const y = height * phase * (.22 - phase * (.14 + .1 * wind));
      const radius = height * (.012 + phase * (.09 + .045 * Math.abs(wind)));
      g.globalAlpha = strength * (1 - phase) * .72;
      g.drawImage(dustPuff, x - radius, y - radius * .55, radius * 2, radius * 1.1);
    }
    g.restore();
  }

  function drawChassis(g, photo, width, height, lean, motion, speed, pitch, shift) {
    // Keep the chassis rigid below the seat. Blend the rider's tuck and
    // inside weight shift through the upper body, with a fixed pelvis.
    const inside = lean * motion * height * .033;
    const tuck = height * (.018 * clamp(speed / 230, 0, 1) + .019 * pitch + .005 * Math.sin(Math.PI * shift));
    if (Math.abs(inside) + Math.abs(tuck) < .35) {
      g.drawImage(photo, -width / 2, -height, width, height);
      return;
    }
    const waist = .5;
    const bands = 12;
    const row = (n) => {
      const u = n / bands;
      const blend = (1 - u) * (1 - u);
      return { source: photo.height * waist * u, y: height * (waist * u - 1) + tuck * blend, offset: inside * blend };
    };
    let top = row(0);
    for (let i = 1; i <= bands; i++) {
      const bottom = row(i);
      const bandHeight = bottom.y - top.y;
      g.save();
      g.transform(1, 0, (bottom.offset - top.offset) / bandHeight, 1, top.offset, top.y);
      g.drawImage(photo, 0, top.source, photo.width, bottom.source - top.source + .5,
        -width / 2, 0, width, bandHeight + .5 * height / photo.height);
      g.restore();
      top = bottom;
    }
    g.drawImage(photo, 0, top.source, photo.width, photo.height - top.source,
      -width / 2, top.y, width, -top.y);
  }

  function photoChase(g, w, h, state) {
    const speed = Math.max(0, state.speed || 0);
    const time = state.time || 0;
    const motion = clamp(speed / 75, 0, 1);
    const lean = clamp(state.lean || 0, -1, 1);
    const collision = window.ApexCollisionFX;
    const shock = collision?.response(state);
    const angle = (state.leanAngle ?? lean * 48 * motion) * Math.PI / 180 + (shock?.kick || 0) * .085;
    const pitch = clamp(state.pitch || 0, -1, 1);
    const heave = clamp(state.heave || 0, -1, 1);
    const shift = clamp(state.shift || 0, 0, 1);
    const height = Math.min(h * (.434 - .014 * clamp(speed / 235, 0, 1)), w * .73);
    const width = height * rider.width / rider.height;
    const rainy = state.weather === 'rain';
    const photo = material(rainy ? wetRider : rider,state,'chase');
    const tread = rainy ? wetTread : spinningTread;
    const cover = weatherFX?.canopy(state) || 0;
    const roof = weatherFX?.shelter(state) || 0;
    const shade = Math.max(rainy ? cover*.045 : cover*.37, roof*.48);
    const brake = clamp(state.brake ?? Number(state.braking), 0, 1);
    const frontLoad = clamp(((state.frontLoad ?? .52)-.52)/.40, -1, 1);
    const chatter = motion * (.00065 * Math.sin(time * 23) + .0004 * Math.sin(time * 43)) * (state.offroad ? 2.8 : 1);
    const anchorX = w * .5 + h * (.012 * lean + .006 * Math.sin(angle));
    const contactY = h * .92;
    const suspension = height * (.012 * heave + .007 * pitch - .010 * frontLoad - .005 * Math.sin(shift*Math.PI) + chatter);

    if (state.crash && collision) {
      // Match camera movement without introducing a discontinuity from the hero's
      // established framing when switching between the two courses.
      const world=window.ApexWorld,subject={distance:state.distance,lateral:state.lateral};
      const projected=world?.projectRival?.(w,h,state,subject);
      const neutral=world?.projectRival?.(w,h,{...state,crash:null,impact:null},subject);
      const dx=projected&&neutral?projected.x-neutral.x:0;
      const dy=projected&&neutral?projected.y-neutral.y:0;
      const size=projected&&neutral?clamp(projected.height/neutral.height,.78,1.1):1;
      g.save();g.translate(anchorX+dx,contactY+dy);g.rotate(projected?.roll||0);
      collision.fallen(g,window.ApexMirrors?.fallenSurface(photo,state)||photo,height*size,state,{kind:'hero',axle:.5,shade});
      g.restore();
      return;
    }

    g.save();
    g.translate(anchorX, contactY);
    g.save();
    // Flatten the rider's actual silhouette into the road plane, in the direction of the sunlight.
    g.transform(1, -.035, -.38, -.2, 0, 0);
    g.rotate(angle * .77);
    g.globalAlpha = rainy ? .075 : .31*(1-cover*.74);
    g.drawImage(silhouette, -width / 2, -height, width, height);
    g.restore();
    if (rainy) weatherFX?.reflection(g, width, height, angle, photo, brake, state);
    contact(g, width * .34);
    if (rainy) weatherFX?.spray(g, height, state, false);
    else drawDust(g, height, state);
    g.save();

    // Roll around the contact patch; tire width, squat and perspective vary through a turn.
    g.translate(0, suspension * .08);
    g.rotate(angle * .77);
    g.transform(1 - Math.abs(lean) * .042, 0, lean * .019, 1 - suspension / height, 0, 0);
    window.ApexMirrors?.drawBacks(g,width,height,state);
    drawChassis(g, photo, width, height, lean, motion, speed, pitch, shift);
    if (tread && speed > 5) {
      // Cross-fade from the exact stationary photograph as the wheel accelerates.
      const blur = clamp((speed - 5) / 105, 0, 1);
      g.globalAlpha = blur * (2 - blur) * .98;
      g.drawImage(tread, (treadArea.x - .5) * width, (treadArea.y - 1) * height,
        treadArea.width * width, treadArea.height * height);
      g.globalAlpha = 1;
    }
    if (shade > .012) {
      g.globalAlpha = shade;
      drawChassis(g, silhouette, width, height, lean, motion, speed, pitch, shift);
      g.globalAlpha = 1;
    }
    if (brake > .025) {
      const lampY = -height * .621;
      const radius = Math.max(3, width * .12);
      g.save();
      g.translate(0, lampY);
      g.globalAlpha = Math.sqrt(brake) * (state.absActive ? .90+.10*Math.sin(time*48) : 1);
      g.globalCompositeOperation = 'screen';
      g.lineWidth = height * .005;
      g.strokeStyle = 'rgba(255,160,82,.95)';
      g.beginPath();
      g.moveTo(-width * .083, -height * .001);
      g.quadraticCurveTo(-width * .081, height * .005, -width * .071, height * .004);
      g.quadraticCurveTo(0, -height * .006, width * .072, height * .003);
      g.lineTo(width * .084, -height * .003);
      g.stroke();
      g.scale(1, .28);
      const flare = g.createRadialGradient(0, 0, 0, 0, 0, radius);
      flare.addColorStop(0, 'rgba(255,112,57,.7)');
      flare.addColorStop(.32, 'rgba(255,55,25,.43)');
      flare.addColorStop(1, 'rgba(255,47,17,0)');
      g.globalCompositeOperation = 'screen';
      g.fillStyle = flare;
      g.fillRect(-radius, -radius, radius * 2, radius * 2);
      g.restore();
    }
    g.restore();
    if (rainy) weatherFX?.spray(g, height, state, true);
    collision?.contact(g,height,state);
    g.restore();
  }

  function lcd(g, x, y, width, height, state) {
    g.save();
    g.translate(x, y);
    g.scale(width / 140, height / 55);
    g.fillStyle = '#131d23';
    g.beginPath();
    g.roundRect(-70, -27.5, 140, 55, 3);
    g.fill();
    const redline = state.redline || window.ApexMotorcycles?.getModel(state.motorcycle?.model)?.physics.redline || 14100;
    const rpm = clamp(state.rpm || state.idleRpm || 1300, 0, redline);
    for (let n = 0; n < 20; n++) {
      g.fillStyle = rpm / redline * 20 > n ? (n > 16 ? '#ff7751' : '#c1d7c6') : '#374145';
      g.fillRect(-64 + n * 6.5, -21, 5.4, 3 + n * .18);
    }
    g.textAlign = 'right';
    g.fillStyle = '#e6e9d8';
    g.font = 'italic bold 33px monospace';
    g.fillText(Math.round(state.speed || 0), 4, 17);
    g.textAlign = 'left';
    g.font = 'bold 8px sans-serif';
    g.fillText('KM/H', 8, 15);
    g.fillRect(35, -7, 1, 25);
    g.font = 'bold 23px monospace';
    const neutral = state.mode === 'ready' || state.mode === 'countdown';
    g.fillText(neutral ? 'N' : String(state.gear || 1), 44, 17);
    g.font = 'bold 6px sans-serif';
    g.fillStyle = '#98a6a6';
    g.fillText(state.transmission === 'manual' ? 'MAN' : 'AUTO', 43, 24);
    const assist = state.absActive ? 'ABS' : state.tcActive ? 'TC' : '';
    g.fillStyle = assist ? '#f7b95c' : '#98a6a6';
    g.fillText(assist || (state.motorcycle?.model || 'r600').toUpperCase()+' · '+String(state.motorcycle?.number||27).padStart(2,'0'), -61, 23);
    if (state.transmission === 'manual' && rpm > redline*.88 && state.gear < 6) {
      g.fillStyle = rpm > redline*.97 ? '#ff664f' : '#efbd58';
      g.fillRect(-65, -26, 128, 3);
    }
    g.restore();
  }

  function paintCockpit(g,photo,width,height,top,kick) {
    if(Math.abs(kick)<.002){g.drawImage(photo,-width/2,top,width,height);return;}
    // Tank and fixed instrument housing stay planted. The triple clamp, grips
    // and the rider's wrists take the brief steering deflection independently.
    const bands=24;
    for(let i=0;i<bands;i++){
      const a=i/bands,b=(i+1)/bands,m=(a+b)*.5;
      const envelope=Math.max(0,1-Math.abs(m-.68)/.21);
      const shift=kick*width*.022*envelope*envelope;
      g.drawImage(photo,0,a*photo.height,photo.width,(b-a)*photo.height+.3,
        -width/2+shift,top+a*height,width,(b-a)*height+.3*height/photo.height);
    }
  }

  function drawCockpit(g, w, h, state) {
    const moving = clamp((state.speed || 0) / 85, 0, 1);
    const lean = clamp(state.lean || 0, -1, 1);
    const angle = (state.leanAngle ?? lean * 48 * moving) * Math.PI / 180;
    const pitch = clamp(state.pitch || 0, -1, 1);
    const heave = clamp(state.heave || 0, -1, 1);
    const shift = clamp(state.shift || 0, 0, 1);
    const fork = clamp(state.suspension || 0, -1, 1);
    const collision=window.ApexCollisionFX,shock=collision?.response(state);
    const down=shock?.down||0,side=shock?.side||1;
    const bob = moving * h * Math.sin((state.time || 0) * 25) * (state.offroad ? .0028 : .00055);
    g.save();
    g.translate(w * .5 + h * lean * .04, h * (.969 - pitch * .023 + fork * .017 + heave * .012 + Math.sin(shift*Math.PI) * .014) + bob);
    g.rotate(angle * .19 * (1-down));
    if (cockpit) {
      const height = clamp(w * .76, h * .84, h * 1.09);
      const width = height * cockpit.width / cockpit.height;
      const top = h * .031 - height * .775;
      const rainy = state.weather === 'rain';
      const photo = material(rainy ? (wetCockpit || relitCockpit || cockpit) : cockpit,state,'cockpit');
      const posed = matchHands(photo, state, rainy);
      const layers=state.crash&&collision&&down>.02?collision.cockpitLayers(photo):null;
      g.save();
      // The helmet camera is rolled by scenery. The motorcycle slides away
      // from the rider's eye rather than rotating a flat cockpit across it.
      if(down){
        g.translate(side*h*.22*down,h*.34*down);
        g.rotate(-side*.11*down);
        g.scale(1-down*.22,1-down*.16);
      }
      window.ApexMirrors?.drawCockpit(g,w,h,state,{width,height,top});
      paintCockpit(g,layers?.body||posed||photo,width,height,top,shock?.kick||0);
      const cover = weatherFX?.canopy(state) || 0;
      const roof = weatherFX?.shelter(state) || 0;
      const shade = Math.max(rainy ? cover*.04 : cover*.37, roof*.48);
      const neutralShade = rainy && wetCockpit ? wetCockpitShade : cockpitShade;
      if (neutralShade && shade > .012 && !layers) {
        g.globalAlpha = shade;
        g.drawImage(posed ? poseShade : neutralShade, -width / 2, top, width, height);
        g.globalAlpha = 1;
      }
      if(layers&&shade>.012){
        g.globalAlpha=shade;paintCockpit(g,layers.bodyShade,width,height,top,shock?.kick||0);g.globalAlpha=1;
      }
      lcd(g, width * .002, top + height * .453, width * .13, height * .106, state);
      g.restore();
      if(layers){
        // Hands release the grips and remain nearer the helmet during the slide.
        // Existing closed racing gloves read as protective hands without gore.
        g.save();g.translate(-side*h*.052*down,h*.18*down);
        g.rotate(side*.035*down);g.scale(1+down*.04,1+down*.03);
        g.drawImage(layers.hands,-width/2,top,width,height);
        if(shade>.012){g.globalAlpha=shade;g.drawImage(layers.handsShade,-width/2,top,width,height);}
        g.restore();
      }
    } else {
      // Simple cluster while optics load. Leave the center of the road unobstructed.
      const height=clamp(w*.76,h*.84,h*1.09);
      window.ApexMirrors?.drawCockpit(g,w,h,state,{width:height*1.5,height,top:h*.031-height*.775});
      const cw = Math.min(h * .64, w * .81);
      const path = new Path2D('M-100 8 L-90 -12 -64 -22 -42 -13 -28 -35 29 -35 44 -13 65 -22 91 -12 101 8 88 23 50 24 26 63 -23 63 -50 24 -87 23Z');
      g.scale(cw / 200, cw / 200);
      g.fillStyle = '#292831';
      g.fill(path);
      g.lineWidth = 2;
      g.strokeStyle = '#61565a';
      g.stroke(path);
      const config=window.ApexBikeGarage?.normalize(state.motorcycle);
      if(config){g.strokeStyle=window.ApexBikeGarage.palette(config).paint;g.lineWidth=4;g.stroke(path);}
      lcd(g, 0, -18, 54, 21, state);
    }
    g.restore();
  }

  function draw(g, w, h, state) {
    const rivals = window.ApexRivals;
    const pack = rivals?.visible(w, h, state) || [];
    rivals?.draw(g, w, h, state, pack, false);
    weatherFX?.rain(g, w, h, state);
    if (state.camera === 'cockpit') drawCockpit(g, w, h, state);
    else if (rider) photoChase(g, w, h, state);
    else drawFallbackRider(g, w, h, state);
    // A rider between the chase camera and our rear tire can overlap our bike.
    rivals?.draw(g, w, h, state, pack, true);
    weatherFX?.visor(g, w, h, state);
  }

  function drawGarage(g,w,h,configuration,view='studio') {
    const renderRide=(camera,motorcycle)=>{
      const model=window.ApexMotorcycles?.getModel(motorcycle.model);
      const state={mode:'ready',camera,motorcycle,garagePreview:true,weather:'clear',distance:0,lateral:0,speed:0,time:0,
        weatherTime:0,lean:0,leanAngle:0,pitch:0,heave:0,suspension:0,shift:0,clutch:0,brake:0,
        transmission:'manual',gear:1,frontLoad:.52,rpm:model?.physics.idleRpm||1300,
        redline:model?.physics.redline||14100,idleRpm:model?.physics.idleRpm||1300};
      g.save();
      if(camera==='chase') {
        g.translate(-w*.35,-h*.68);
        if(rider)photoChase(g,w*1.7,h*1.7,state);else drawFallbackRider(g,w*1.7,h*1.7,state);
      } else drawCockpit(g,w,h,state);
      g.restore();
    };
    if(window.ApexBikeGarage)window.ApexBikeGarage.draw(g,w,h,configuration,view,renderRide);
    else {g.clearRect(0,0,w,h);renderRide(view==='cockpit'?'cockpit':'chase',configuration||{});}
  }
  window.ApexBike = { draw, drawGarage };
})();
