/* Sparse, surveyed roadside details. All physical props sit outside the soft verge. */
window.ApexEnvironment = (() => {
  'use strict';

  const birdAnchors = {coast: [], sierra: []};
  const recordedAnchors = new Set();
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const noise = seed => {
    const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const uv = [[0, 0], [1, 0], [0, 1], [1, 1]];
  const tint = (color, factor) => color.map(channel => Math.min(1, channel * factor));
  const add = (point, delta) => point.map((value, index) => value + delta[index]);

  function triangle(h, a, b, c, color, material = 5) {
    h.face(a, b, c, c, uv, color, material);
  }

  function box(h, start, end, left, right, bottom, top, color, material = 5) {
    const vertex = (d, u, y) => {
      const p = h.point(d, u);
      p[1] = y;
      return p;
    };
    const a = vertex(start, left, bottom), b = vertex(end, left, bottom);
    const c = vertex(start, right, bottom), d = vertex(end, right, bottom);
    const A = vertex(start, left, top), B = vertex(end, left, top);
    const C = vertex(start, right, top), D = vertex(end, right, top);
    h.face(a, b, A, B, uv, tint(color, .77), material);
    h.face(c, d, C, D, uv, tint(color, .94), material);
    h.face(a, c, A, C, uv, tint(color, .87), material);
    h.face(b, d, B, D, uv, tint(color, .69), material);
    h.face(A, B, C, D, uv, tint(color, 1.12), material);
  }

  function fallenLog(h, d, u, length, girth, seed) {
    const across = (noise(seed) - .5) * 3.0;
    const a = h.point(d - length * .5, u - across * .5, girth * .77);
    const b = h.point(d + length * .5, u + across * .5, girth * .65);
    const delta = b.map((value, i) => value - a[i]);
    const horizontal = Math.hypot(delta[0], delta[2]);
    const side = [delta[2] / horizontal, 0, -delta[0] / horizontal];
    const rings = [];
    const sections = 5, facets = 9;
    for (let section = 0; section <= sections; section++) {
      const t = section / sections;
      const center = a.map((value, i) => value + delta[i] * t);
      const ring = [];
      for (let j = 0; j < facets; j++) {
        const angle = j * Math.PI * 2 / facets + .09 * noise(seed + section);
        const radius = girth * (1 - t * .20) * (.93 + noise(seed + j * 13) * .12);
        ring.push(add(center, [
          side[0] * Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          side[2] * Math.cos(angle) * radius
        ]));
      }
      rings.push(ring);
    }
    for (let section = 0; section < sections; section++) {
      for (let j = 0; j < facets; j++) {
        const next = (j + 1) % facets;
        const light = .65 + .28 * Math.max(0, Math.sin(j * Math.PI * 2 / facets)) + noise(seed + j * 7) * .12;
        h.face(rings[section][j], rings[section + 1][j], rings[section][next], rings[section + 1][next],
          uv, tint([.38, .31, .23], light), 5);
      }
    }
    for (const [ring, center, end] of [[rings[0], a, 0], [rings[sections], b, 1]]) {
      for (let j = 0; j < facets; j++) {
        triangle(h, center, ring[j], ring[(j + 1) % facets], tint([.55, .44, .30], .82 + noise(seed + j + end) * .19));
      }
      // A darker, irregular heartwood ring keeps the sawn end from reading as plastic.
      const capCenter = center.map((value, i) => value + delta[i] / length * (end ? .004 : -.004));
      const heart = ring.map(p => p.map((value, i) => capCenter[i] + (value - center[i]) * .47));
      for (let j = 0; j < facets; j++) triangle(h, capCenter, heart[j], heart[(j + 1) % facets], [.38, .30, .21]);
    }
    const branch = h.point(d + length * .13, u + .23, girth * 1.65);
    triangle(h, add(branch, [-.15, -.06, 0]), add(branch, [.11, -.03, .12]),
      add(branch, [.30, .54, -.19]), [.29, .25, .19]);
  }

  function retainingStone(h, d, z) {
    const setback = 10.15 + .24 * Math.sin(d / 31);
    const ground = h.point(d, setback)[1];
    const height = .67 + .47 * Math.sin((d - 1096) / 94 * Math.PI);
    for (let row = 0; row < 3; row++) {
      const top = ground + height * (row + 1) / 3;
      const bottom = ground + height * row / 3;
      const center = (d + z) * .5 + (row % 2 ? .46 : 0);
      const breaks = [d, clamp(center, d + .2, z - .2), z];
      for (let i = 0; i < 2; i++) {
        const warm = .82 + noise(d * 3 + row * 31 + i) * .24;
        box(h, breaks[i] + .025, breaks[i + 1] - .025, setback, setback + .61,
          bottom + .018, top - .018, tint([.58, .57, .51], warm), 11);
      }
    }
    if (d % 16 === 0) {
      box(h, d + .15, d + .48, setback - .22, setback + .91, ground - .12,
        ground + height + .09, [.48, .49, .44], 11);
    }
  }

  function culvert(h, d, u) {
    const floor = h.point(d, u)[1] - .11;
    const depth = 1.12;
    // A low catchment bank buries the pipe and headwall into the hillside.
    const berm = [[d - 1.43, u + .85], [d + 1.43, u + .85], [d + 1.8, u + 2.1], [d - 1.8, u + 2.1]];
    const toe = [[d - 3.4, u + .18], [d + 3.4, u + .18], [d + 3.7, u + 5.1], [d - 3.7, u + 5.1]];
    const ridge = berm.map(([station, setback]) => {const p = h.point(station, setback); p[1] = floor + 1.43; return p;});
    const foot = toe.map(([station, setback]) => h.point(station, setback, .015));
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      h.face(foot[i], foot[j], ridge[i], ridge[j], [toe[i].slice().reverse(), toe[j].slice().reverse(), berm[i].slice().reverse(), berm[j].slice().reverse()], [.57, .57, .48], 1);
    }
    h.face(ridge[0], ridge[1], ridge[3], ridge[2], [berm[0].slice().reverse(), berm[1].slice().reverse(), berm[3].slice().reverse(), berm[2].slice().reverse()], [.57, .57, .48], 1);
    const ring = (angle, radius, setback) => {
      const p = h.point(d + Math.cos(angle) * radius, u + setback);
      p[1] = floor + .68 + Math.sin(angle) * radius;
      return p;
    };
    box(h, d - 1.43, d + 1.43, u + .13, u + depth, floor - .08, floor + .18, [.45, .47, .43], 11);
    box(h, d - 1.43, d - .72, u, u + depth, floor, floor + 1.37, [.52, .53, .48], 11);
    box(h, d + .72, d + 1.43, u, u + depth, floor, floor + 1.37, [.48, .50, .45], 11);
    box(h, d - 1.48, d + 1.48, u - .03, u + depth, floor + 1.35, floor + 1.57, [.61, .61, .54], 11);
    const center = h.point(d, u + .09);
    center[1] = floor + .68;
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI * 2 / 16, b = (i + 1) * Math.PI * 2 / 16;
      h.face(ring(a, .68, 0), ring(b, .68, 0), ring(a, .47, .035), ring(b, .47, .035),
        uv, tint([.59, .60, .53], .80 + .18 * Math.max(0, Math.sin(a))), 11);
      triangle(h, center, ring(a, .47, .07), ring(b, .47, .07), [.11, .15, .14]);
    }
    // The outlet meets a short stone-lined channel on the hillside, beyond the verge.
    for (let i = 0; i < 5; i++) {
      const offset = i * .31;
      box(h, d - .61, d - .35, u - .12 - offset, u + .22 - offset,
        floor - .13 - offset * .14, floor + .09 - offset * .14, [.43, .46, .42], 15);
      box(h, d + .35, d + .61, u - .12 - offset, u + .22 - offset,
        floor - .13 - offset * .14, floor + .09 - offset * .14, [.46, .47, .42], 15);
    }
  }

  function rangerCabin(h, station, setback) {
    const start = station - 4.1, end = station + 4.1;
    const front = setback - 2.65, back = setback + 2.65;
    const corners = [[start, front], [end, front], [start, back], [end, back]];
    const floor = Math.max(...corners.map(([d, u]) => h.point(d, u)[1])) + .11;
    const eaves = floor + 2.48, ridge = eaves + 1.21;
    box(h, start - .18, end + .18, front - .16, back + .16, floor - .77, floor, [.43, .44, .39], 11);
    box(h, start, end, front, back, floor, eaves, [.43, .38, .29]);
    // Narrow vertical timber boards and shallow seams, lit as one building.
    for (let i = 0; i < 27; i++) {
      const a = start + i * (end - start) / 27;
      box(h, a + .016, a + .045, front - .027, front + .014, floor + .04, eaves - .02,
        tint([.32, .30, .23], .94 + noise(i * 13 + station) * .17));
    }
    const vertex = (d, u, height) => {
      const p = h.point(d, u);
      p[1] = height;
      return p;
    };
    h.face(vertex(start - .35, front - .42, eaves), vertex(end + .35, front - .42, eaves),
      vertex(start - .35, setback, ridge), vertex(end + .35, setback, ridge), uv, [.25, .31, .27], 5);
    h.face(vertex(start - .35, setback, ridge), vertex(end + .35, setback, ridge),
      vertex(start - .35, back + .42, eaves), vertex(end + .35, back + .42, eaves), uv, [.33, .38, .32], 5);
    for (const d of [start, end]) triangle(h, vertex(d, front, eaves), vertex(d, back, eaves),
      vertex(d, setback, ridge), [.38, .35, .27]);
    for (const endD of [start - .008, end + .008]) {
      for (let i = 0; i < 18; i++) {
        const u = front + (back - front) * i / 18;
        h.face(vertex(endD, u, floor + .03), vertex(endD, u + .022, floor + .03),
          vertex(endD, u, eaves), vertex(endD, u + .022, eaves), uv, [.31, .29, .22], 5);
      }
    }
    for (let i = 0; i < 10; i++) {
      const d = start - .35 + i * (end - start + .7) / 10;
      h.face(vertex(d, front - .42, eaves + .012), vertex(d + .034, front - .42, eaves + .012),
        vertex(d, setback, ridge + .012), vertex(d + .034, setback, ridge + .012), uv, [.38, .42, .35], 5);
    }
    const faceU = front - .046;
    const panel = (a, b, lo, hi, color, relief = 0) =>
      h.face(vertex(a, faceU - relief, lo), vertex(b, faceU - relief, lo),
        vertex(a, faceU - relief, hi), vertex(b, faceU - relief, hi), uv, color, 5);
    panel(station + .42, station + 1.65, floor + .02, floor + 2.06, [.22, .27, .23]);
    panel(station + .55, station + 1.5, floor + 1.08, floor + 1.83, [.31, .41, .39], .004);
    for (const d of [station - 2.52, station + 2.4]) {
      panel(d - .62, d + .62, floor + 1.01, floor + 1.95, [.19, .24, .22]);
      panel(d - .54, d + .54, floor + 1.09, floor + 1.87, [.35, .46, .45], .004);
      panel(d - .036, d + .036, floor + 1.07, floor + 1.90, [.65, .61, .49], .008);
      panel(d - .57, d + .57, floor + 1.46, floor + 1.51, [.62, .58, .46], .012);
    }
    box(h, station + .18, station + 1.92, front - 1.10, front - .06, floor - .20, floor + .04, [.48, .46, .37]);
    box(h, station + 2.42, station + 3.05, setback + .75, setback + 1.37, eaves, ridge + .58, [.47, .49, .44], 11);
    box(h, station + 2.31, station + 3.17, setback + .64, setback + 1.48, ridge + .55, ridge + .69, [.36, .39, .36], 11);
    // A short set-back timber boundary makes this read as an actual trailhead.
    const fenceU = front - 4.2;
    for (let i = 0; i < 6; i++) {
      const d = start - 3 + i * 2.8;
      const base = h.point(d, fenceU)[1];
      box(h, d - .065, d + .065, fenceU - .065, fenceU + .065, base, base + .94, [.35, .33, .25]);
      if (i < 5) {
        const a = h.point(d, fenceU, .65), b = h.point(d + 2.8, fenceU, .65);
        h.face(a, b, add(a, [0, .10, 0]), add(b, [0, .10, 0]), uv, [.44, .40, .29], 5);
      }
    }
  }

  function snowRemnant(h, d, u, span, seed) {
    const center = h.point(d, u, .055);
    const edge = [];
    for (let i = 0; i < 13; i++) {
      const angle = i * Math.PI * 2 / 13;
      const amount = .70 + noise(seed + i * 5) * .28;
      edge.push(h.point(d + Math.cos(angle) * span * amount, u + Math.sin(angle) * span * .43 * amount, .045));
    }
    for (let i = 0; i < edge.length; i++) triangle(h, center, edge[i], edge[(i + 1) % edge.length],
      tint([.78, .80, .75], .91 + noise(seed + i) * .08), 5);
  }

  function cairn(h, d, u, seed) {
    const center = h.point(d, u);
    let height = 0;
    for (let row = 0; row < 4; row++) {
      const r = .36 - row * .064, rise = .19 - row * .019;
      const low = [], top = [];
      for (let j = 0; j < 7; j++) {
        const angle = j * Math.PI * 2 / 7 + row * .31;
        const radius = r * (.79 + noise(seed + row * 12 + j) * .21);
        low.push(add(center, [Math.cos(angle) * radius, height, Math.sin(angle) * radius]));
        top.push(add(center, [Math.cos(angle) * radius * .78, height + rise, Math.sin(angle) * radius * .78]));
      }
      const cap = add(center, [.02, height + rise + .015, -.015]);
      for (let j = 0; j < 7; j++) {
        const next = (j + 1) % 7, color = tint([.61, .61, .54], .75 + noise(seed + row * 17 + j) * .22);
        h.face(low[j], low[next], top[j], top[next], uv, color, 15);
        triangle(h, cap, top[j], top[next], tint(color, 1.14), 15);
      }
      height += rise * .94;
    }
  }

  function graniteMass(h, d, u, length, width, height, seed) {
    // Rounded joint blocks have a buried, narrowing toe and weathered shoulders.
    // Low-frequency asymmetry carries across the rings, avoiding a ribbed cone.
    const sides = 14, base = h.point(d, u)[1], rings = [];
    const levels = [-.11, .07, .25, .47, .68, .85, .96];
    const scales = [.61, .89, 1, .94, .78, .54, .24];
    const twist = noise(seed + 1) * Math.PI * 2;
    const color = tint([.65, .65, .60], .96 + noise(seed) * .07);
    for (let level = 0; level < levels.length; level++) {
      const fraction = levels[level], scale = scales[level];
      rings.push(Array.from({length: sides}, (_, i) => {
        const angle = i * Math.PI * 2 / sides + twist + .035 * Math.sin(level + seed);
        const irregular = 1 + .105 * Math.sin(angle * 3 + seed) + .045 * Math.cos(angle * 5 - seed);
        const station = d + Math.cos(angle) * length * scale * irregular + fraction * length * .18;
        const lateral = u + Math.sin(angle) * width * scale * irregular + fraction * width * .12;
        const p = h.point(station, lateral);
        p[1] = level === 0 ? p[1] - .76
          : base + height * fraction * (1 + .055 * Math.sin(angle * 2 + seed) + .025 * Math.sin(angle * 5 + level));
        return p;
      }));
    }
    for (let level = 0; level < rings.length - 1; level++) {
      for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        const a = rings[level][i], b = rings[level][next];
        const c = rings[level + 1][i], e = rings[level + 1][next];
        // Alternate diagonals break up long planar bands; shader lighting supplies the relief.
        if ((level + i) % 2) {
          triangle(h, a, b, c, color, 15);
          triangle(h, b, e, c, color, 15);
        } else {
          triangle(h, a, b, e, color, 15);
          triangle(h, a, e, c, color, 15);
        }
      }
    }
    const cap = h.point(d + length * .20, u + width * .10);
    cap[1] = base + height;
    for (let i = 0; i < sides; i++) triangle(h, cap, rings[6][i], rings[6][(i + 1) % sides], color, 15);
  }

  function graniteOutcrop(h, d, u, seed) {
    const side = Math.sign(u), variation = .88 + noise(seed + 5) * .23;
    // A few separate large blocks nest behind a broken apron. No broad front wall.
    const blocks = [
      [-10.2, 1.7, 4.2, 3.0, 4.0], [-3.5, 3.8, 5.0, 3.8, 6.2],
      [4.7, 5.3, 4.6, 3.9, 7.1], [11.8, 3.9, 4.0, 3.1, 4.7],
      [-5.7, -1.8, 3.1, 2.7, 3.1], [1.0, -2.0, 3.7, 2.8, 4.4],
      [7.7, -1.2, 3.3, 2.4, 3.1], [15.6, .0, 2.1, 1.7, 1.9],
      [-13.4, -2.0, 1.8, 1.5, 1.5]
    ];
    blocks.forEach(([along, across, length, width, height], i) => {
      graniteMass(h, d + along * variation, u + across * side,
        length * variation, width * (.91 + noise(seed + i * 13) * .15),
        height * (.88 + noise(seed + i * 7) * .19), seed + i * 41);
    });
  }

  function addBirdAnchor(h, d, u, course, id) {
    const key = course + '/' + id;
    if (recordedAnchors.has(key)) return;
    recordedAnchors.add(key);
    const p = h.point(d, u);
    birdAnchors[course].push({id, x: p[0], y: p[1], z: p[2]});
  }

  function section(d, z, h, options) {
    if(options.courseId==='london')return;
    const coastal = options.coastal;
    if (coastal) {
      if ([440, 2152, 3952].includes(d)) addBirdAnchor(h, d, -128, 'coast', d);
      return;
    }
    if ([576, 1640, 3360].includes(d)) addBirdAnchor(h, d, -70, 'sierra', d);
    const logs = {
      244: [15.4, 7.2, .31], 788: [-14.1, 5.6, .26], 1380: [21.4, 8.2, .39],
      2852: [14.7, 6.1, .28], 3468: [-18.4, 7.6, .34]
    };
    if (logs[d]) fallenLog(h, d, ...logs[d], d);
    if (d >= 1096 && d < 1192) retainingStone(h, d, z);
    if (d === 1216) culvert(h, d, 11.4);
    if (d === 1280) graniteOutcrop(h, d, 27.2, d);
    if (d === 1424) graniteOutcrop(h, d, -32.8, d);
    if (d === 1560) graniteOutcrop(h, d, 29.5, d);
    if (d === 2468) rangerCabin(h, d, 24.5);
    if (d === 3264 || d === 3744) cairn(h, d, d === 3264 ? 16.8 : -20.5, d);
    if (d === 3400) snowRemnant(h, d, 43, 10.8, d);
    if (d === 3588) snowRemnant(h, d, -48, 7.5, d);
    if (d === 3800) snowRemnant(h, d, 35, 9.2, d);
  }

  function drawSky(ctx, w, h, cam, course, state) {
    const coastal = course === 'coast';
    const time = state.weatherTime ?? state.time ?? 0;
    const anchors = birdAnchors[course] || [];
    ctx.save();
    ctx.translate(w * .5, h * .5);
    ctx.rotate(-cam.roll);
    ctx.translate(-w * .5, -h * .5);
    for (const anchor of anchors) {
      const count = coastal ? 4 : 2;
      for (let i = 0; i < count; i++) {
        if (cam.rain && i > 1) continue;
        const seed = anchor.id + i * 13;
        const phase = time * (coastal ? .095 : .065) + i * 1.6 + seed;
        const x = anchor.x + Math.cos(phase) * (coastal ? 46 : 65) + i * 7;
        const z = anchor.z + Math.sin(phase) * 57;
        const y = anchor.y + (coastal ? 32 : 90) + Math.sin(phase * 1.7) * 3 + i * 3;
        const dx = x - cam.x, dz = z - cam.z;
        const depth = dx * cam.sin + dz * cam.cos;
        if (depth < 55 || depth > 1050) continue;
        const scale = cam.f / depth;
        const screenX = w * .5 + (dx * cam.cos - dz * cam.sin) * scale;
        const screenY = cam.horizon - (y - cam.y - cam.grade * depth) * scale;
        if (screenX < -20 || screenX > w + 20 || screenY < -20 || screenY > h * .77) continue;
        const span = clamp((coastal ? 1.38 : 1.62) * scale, .9, 9);
        const flap = Math.sin(time * (coastal ? 4.9 : 3.1) + seed);
        const glide = Math.sin(phase * .67) > -.3;
        const wingY = span * (glide ? -.12 : flap * .23);
        const bank = Math.cos(phase) * .18;
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(bank);
        ctx.globalAlpha = clamp((1050 - depth) / 280, 0, 1) * (cam.rain ? .42 : .73);
        ctx.strokeStyle = coastal ? (cam.rain ? '#c2c9c7' : '#ebe9dc') : '#3c4543';
        ctx.lineWidth = Math.max(.65, span * .13);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-span * .5, wingY);
        ctx.quadraticCurveTo(-span * .27, -span * .19, 0, span * .055);
        ctx.quadraticCurveTo(span * .27, -span * .19, span * .5, wingY);
        ctx.stroke();
        ctx.strokeStyle = coastal ? '#4d5655' : '#343e3a';
        ctx.lineWidth = Math.max(.45, span * .08);
        ctx.beginPath();
        ctx.moveTo(-span * .5, wingY);
        ctx.lineTo(-span * .39, wingY - span * .02);
        ctx.moveTo(span * .39, wingY - span * .02);
        ctx.lineTo(span * .5, wingY);
        ctx.moveTo(0, -span * .035);
        ctx.lineTo(0, span * .16);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function zoneAt(course, distance) {
    if(course==='london'&&window.ApexLondon)return window.ApexLondon.zoneAt(distance);
    const zones = course === 'coast'
      ? [[0, 'Cypress Bluffs'], [970, 'Sandstone Reach'], [1480, 'Meridian Inlet'], [2400, 'Headland Road'], [3910, 'Lighthouse Reach']]
      : [[0, 'Ponderosa Woods'], [860, 'Granite Cut'], [1620, 'Sierra Snow Shed'], [2170, 'Ranger Station'], [3150, 'High Ridge']];
    let index = 0;
    while (index + 1 < zones.length && distance >= zones[index + 1][0]) index++;
    return {id: course + '-' + index, name: zones[index][1], detail: course === 'coast' ? 'Pacific coast' : 'Sierra Nevada'};
  }

  return {section, drawSky, zoneAt};
})();
