/* Speed traces use equal distance intervals, so two rides line up in a corner. */
window.ApexTelemetry = (() => {
  'use strict';
  const segmentMeters = 20;
  let course, length, intervals, dx;
  const $ = id => document.getElementById(id);
  const key = (stage, condition, model) => 'apex-run.telemetry.' + (stage === 'sierra' ? '' : stage + '.') + condition + '.v1' + (model === 'r600' ? '' : '.' + model);
  let motorcycleModel, weather, mode, reference, samples, last, maxSpeed, maxLean, paved, lastBestTime;

  function tracePath(points) {
    return points.map(([speed], i) => (i ? 'L' : 'M') + (i * dx) + ' ' + (69 - Math.min(270, speed) * 65 / 270).toFixed(2)).join('');
  }
  function selectStage(s) {
    course = s.course;
    length = s.length;
    intervals = length / segmentMeters;
    dx = 600 / intervals;
    $('axis-middle').textContent = (length / 2000) + ' KM';
    $('axis-end').textContent = (length / 1000) + ' KM';
    $('ride-plot').setAttribute('aria-label', 'Speed and route elevation plotted against distance from zero to ' + (length / 1000) + ' kilometres');

    const world = window.ApexWorld;
    const heights = Array.from({length: intervals + 1}, (_, i) => world.elevation(i * segmentMeters));
    const band = $('shed-band');
    let first = null, end = 0, label = '';
    if (course === 'coast' && window.ApexCoast) {
      first = window.ApexCoast.bridgeStart;
      end = window.ApexCoast.bridgeEnd;
      label = 'Inlet bridge';
    } else if (course === 'sierra' && world.shelterAt) {
      for (let d = 0; d <= length; d += 4) {
        if (world.shelterAt(d) > 0) {
          if (first === null) first = Math.max(0, d - 4);
          end = Math.min(length, d + 4);
        }
      }
      label = 'Snow shed';
    }
    band.setAttribute('x', 600 * (first ?? 0) / length);
    band.setAttribute('width', first === null ? 0 : 600 * (end - first) / length);
    band.querySelector('title').textContent = first === null ? '' : label + ' · ' + (first / 1000) + '–' + (end / 1000) + ' km';
    const low = Math.min(...heights), high = Math.max(...heights);
    const ridge = heights.map((h, i) => 'L' + i * dx + ' ' + (58 - 26 * (h - low) / Math.max(1, high - low)).toFixed(2));
    $('profile-path').setAttribute('d', 'M0 70' + ridge.join('') + 'L600 70Z');
  }
  function loadReference(s) {
    reference = null;
    try {
      const value = JSON.parse(localStorage.getItem(key(s.course, s.weather, s.motorcycle?.model || 'r600')));
      if (value && value.time === s.best && Array.isArray(value.points) && value.points.length === intervals + 1 &&
          value.points.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && n >= 0))) {
        reference = value.points;
      }
    } catch { /* Private browsing can disable local storage. */ }
    $('best-trace').setAttribute('d', reference ? tracePath(reference) : '');
    $('trace-pb-key').hidden = !reference;
    lastBestTime = s.best;
  }
  function reset(s) {
    samples = [[0,0]];
    last = {distance:0,time:0,speed:0,offroad:false};
    maxSpeed = 0;
    maxLean = 0;
    paved = 0;
    $('speed-trace').setAttribute('d','');
    $('trace-position').setAttribute('x1',0);
    $('trace-position').setAttribute('x2',0);
    $('top-speed').textContent = $('max-lean').textContent = '—';
    $('finish-speed').textContent = $('finish-lean').textContent = $('finish-clean').textContent = '—';
    loadReference(s);
  }
  function update(s) {
    const model = s.motorcycle?.model || 'r600';
    const modelChanged = motorcycleModel !== model;
    const stageChanged = course !== s.course || length !== s.length;
    if (stageChanged) selectStage(s);
    if (modelChanged || stageChanged || weather !== s.weather || !samples || (s.mode === 'ready' && mode !== 'ready') ||
        (s.mode === 'countdown' && mode !== 'countdown')) reset(s);
    if (s.mode === 'ready' && lastBestTime !== s.best) loadReference(s);
    const firstFinish = s.mode === 'finished' && mode !== 'finished';
    motorcycleModel = model;
    weather = s.weather;
    mode = s.mode;
    const delta = $('pace-delta');
    if (s.mode !== 'racing' && !firstFinish) {
      if (s.mode !== 'paused') delta.hidden = true;
      return;
    }
    maxSpeed = Math.max(maxSpeed, s.speed);
    if (!s.crash) maxLean = Math.max(maxLean, Math.abs(s.leanAngle));
    const travel = Math.max(0,s.distance - last.distance);
    paved += travel * (Number(!last.offroad) + Number(!s.offroad)) * .5;
    let added = false;
    while (samples.length <= intervals && samples.length * segmentMeters <= s.distance && travel > 0) {
      const t = (samples.length * segmentMeters - last.distance) / travel;
      samples.push([Math.round(last.speed + (s.speed-last.speed)*t), +(last.time + (s.time-last.time)*t).toFixed(3)]);
      added = true;
    }
    if (added) $('speed-trace').setAttribute('d', tracePath(samples));
    const cursor = (600 * s.distance / length).toFixed(2);
    $('trace-position').setAttribute('x1',cursor);
    $('trace-position').setAttribute('x2',cursor);
    $('top-speed').textContent = Math.round(maxSpeed);
    $('max-lean').textContent = Math.round(maxLean);
    delta.hidden = !(reference && s.distance > 2 && !firstFinish);
    if (!delta.hidden) {
      const i = Math.min(intervals-1,Math.floor(s.distance/segmentMeters));
      const f = s.distance/segmentMeters-i;
      const diff = s.time - (reference[i][1] + (reference[i+1][1]-reference[i][1])*f);
      delta.textContent = (diff < 0 ? '−' : '+') + Math.abs(diff).toFixed(2) + '  vs PB';
      delta.classList.toggle('ahead',diff<0);
    }
    if (firstFinish) {
      $('finish-speed').textContent = Math.round(maxSpeed) + ' km/h';
      $('finish-lean').textContent = Math.round(maxLean) + '°';
      $('finish-clean').textContent = Math.min(100, paved / length * 100).toFixed(1) + '%';
      if (s.isRecord && samples.length === intervals + 1) {
        try { localStorage.setItem(key(course, weather, motorcycleModel), JSON.stringify({time:s.time,points:samples})); } catch {}
      }
    }
    last = {distance:s.distance,time:s.time,speed:s.speed,offroad:s.offroad};
  }
  return {update};
})();
