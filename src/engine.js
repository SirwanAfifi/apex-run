(() => {
  'use strict';

  // Native hosts drive the same simulation explicitly; browser ownership remains
  // unchanged when this adapter is absent. No DOM shims or duplicate physics.
  const host = window.ApexHost;
  const storage = host?.storage || {
    getItem:key => localStorage.getItem(key),
    setItem:(key,value) => localStorage.setItem(key,value)
  };
  const now = () => host?.now ? host.now() : performance.now();
  const emit = (name, detail) => host ? host.emit?.(name, detail) :
    window.dispatchEvent(new CustomEvent(name, {detail}));

  const LENGTHS = { coast: 4800, sierra: 4000, london: 6000 };
  const REDLINE = 14100;
  const SHIFT_INTERVAL = 0.42;
  const GRAVITY = 9.81;
  const MAX_LEAN = 51;
  const DEG = Math.PI / 180;
  const RECORD_KEYS = {
    sierra: { clear: 'apex-run.sierra-pass.4000m.v2', rain: 'apex-run.sierra-pass.4000m.rain.v3' },
    coast: { clear: 'apex-run.cape-meridian.4800m.clear.v1', rain: 'apex-run.cape-meridian.4800m.rain.v1' },
    london: { clear: 'apex-run.a3-london.6000m.clear.v1', rain: 'apex-run.a3-london.6000m.rain.v1' }
  };
  const COURSE_KEY = 'apex-run.course.v1';
  const WEATHER_KEYS = { sierra: 'apex-run.weather.v3', coast: 'apex-run.coast.weather.v1', london: 'apex-run.london.weather.v1' };
  const TRANSMISSION_KEY = 'apex-run.transmission.v3';
  const CAMERA_KEY = 'apex-run.camera.v1';
  const SOUND_KEY = 'apex-run.audio.v1';
  const MOTORCYCLE_KEY = 'apex-run.motorcycle.v1';
  const motionPreference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reducedMotion=motionPreference?.matches??false;
  motionPreference?.addEventListener('change',event=>{reducedMotion=event.matches;});
  // Road speed in km/h at redline and maximum wheel thrust in m/s² for each gear.
  const gearing = [97, 132, 162, 191, 222, 254];
  const wheelThrust = [10.5, 8.1, 7.0, 5.75, 4.95, 4.25];
  // Standalone engine fixtures can still ride the original R600 without the
  // optional garage catalogue. The released game loads motorcycles.js first.
  const baseProfile = window.ApexMotorcycles?.getModel('r600').physics || {
    redline:REDLINE,idleRpm:1300,launchRpm:3700,gearing,wheelThrust,
    upshiftRpm:13250,downshiftRpm:6600,brakingDownshiftRpm:7200,
    torqueBase:.56,torquePeak:.44,engineBraking:1,limiterRange:440,
    agility:1,stability:2.2,brakeForce:12.2,aeroDrag:.00072,
    loadTransfer:.375,springRate:185,springDamping:16,
    firing:[0,270,450,540],exhaustTone:1,intakeTone:1,exhaustGain:1,intakeGain:1
  };
  const legacyConfig = () => ({model:'r600',paint:'vermilion',accent:'ivory',wheels:'graphite',livery:'solid',number:27});
  const motorcycles = window.ApexMotorcycles || {
    models:[{id:'r600',physics:baseProfile}],defaultConfig:legacyConfig,
    normalize:legacyConfig,getModel:()=>({id:'r600',physics:baseProfile}),key:()=> 'r600'
  };
  const recordKey = (route,condition,model) => RECORD_KEYS[route][condition] + (model === 'r600' ? '' : '.' + model);
  const limit = (v, low, high) => Math.max(low, Math.min(high, v));
  const follow = (value, target, rate, dt) => value + (target - value) * (1 - Math.exp(-rate * dt));
  const keyActions = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'throttle', KeyW: 'throttle', ArrowDown: 'brake', KeyS: 'brake'
  };
  const keyboard = new Set();
  const touch = new Set();
  const touchInput = { steer: 0, throttle: 0, brake: 0 };
  const blockedKeys = new Set();

  const records = Object.fromEntries(motorcycles.models.map(model => [model.id,
    Object.fromEntries(Object.keys(LENGTHS).map(route => [route,{clear:null,rain:null}]))]));
  const weatherByCourse = { sierra: 'rain', coast: 'clear', london: 'clear' };
  let course = 'coast', race = null, collisions = null;
  let sound = true;
  let camera = 'cockpit', gearbox = 'auto';
  let menuOpen = false;
  let motorcycle = motorcycles.defaultConfig();
  try { motorcycle = motorcycles.normalize(JSON.parse(storage.getItem(MOTORCYCLE_KEY))); } catch {}
  let profile = motorcycles.getModel(motorcycle.model).physics;
  try {
    camera = storage.getItem(CAMERA_KEY) === 'chase' ? 'chase' : 'cockpit';
    const savedCourse = storage.getItem(COURSE_KEY);
    if (Object.hasOwn(LENGTHS,savedCourse)) course = savedCourse;
    for (const route of Object.keys(LENGTHS)) {
      const savedWeather = storage.getItem(WEATHER_KEYS[route]);
      if (savedWeather === 'clear' || savedWeather === 'rain') weatherByCourse[route] = savedWeather;
    }
    gearbox = storage.getItem(TRANSMISSION_KEY) === 'manual' ? 'manual' : 'auto';
    sound = storage.getItem(SOUND_KEY) !== 'off';
  } catch { /* Racing also works without browser storage. */ }
  let weather = weatherByCourse[course];
  window.ApexWorld?.selectCourse?.(course);
  for (const model of motorcycles.models) {
    for (const [route, keys] of Object.entries(RECORD_KEYS)) {
      for (const condition of Object.keys(keys)) {
        const key = recordKey(route,condition,model.id);
        try {
          const saved = JSON.parse(storage.getItem(key));
          if (saved && Number.isFinite(saved.time) && saved.time > 0 &&
              Array.isArray(saved.splits) && saved.splits.length === 3 &&
              saved.splits.every(value => Number.isFinite(value) && value > 0)) {
            records[model.id][route][condition] = saved;
          }
        } catch { /* Other course records still load if one is unavailable. */ }
      }
    }
  }

  function newRun() {
    profile = motorcycles.getModel(motorcycle.model).physics;
    const record = records[motorcycle.model][course][weather];
    const length = LENGTHS[course];
    collisions=window.ApexCollision.create();
    race = course === 'coast' || course === 'london' ? window.ApexRace.create(length,collisions) : null;
    return {
      mode: 'ready', countdown: 3, speed: 0, gear: 1, distance: 0,
      impact:null, crash:null, crashCount:0, recovering:false,
      course, length, rivals: race?.rivals ?? [], racePosition: race ? 4 : null, time: 0, sector: 1, track: 0, splits: [null, null, null],
      best: record?.time ?? null, bestSplits: record?.splits.slice() ?? [null, null, null],
      sound, camera, weather, weatherTime: 0, transmission: gearbox,
      motorcycle: {...motorcycle}, redline: profile.redline, idleRpm: profile.idleRpm,
      wetness: weather === 'rain' ? (window.ApexWorld?.surfaceWetness?.(0, 0.40) ?? 0.5) : 0,
      shelter: 0, slip: 0, tcActive: false, absActive: false, frontLoad: 0.52, suspension: 0,
      offroad: false, barrierContact: false, lean: 0, lateral: 0.40, braking: false, isRecord: false,
      leanAngle: 0, rpm: profile.idleRpm, accel: 0, pitch: 0, heave: 0, shift: 0, clutch: 0, throttle: 0,
      brake: 0, lateralVelocity: 0, curvature: 0, grade: 0, gripUsage: 0
    };
  }

  let state = newRun();
  let pausedMode = null;
  let countdownRemaining = 3;
  let lastSplitTime = 0;
  let previousFrame = null;
  let scheduled = false;
  let lastUpdate = -Infinity;
  let canvas, ctx, width = 0, height = 0, pixelRatio = 1;
  let audioContext, motor;
  let springVelocity = 0, blip = 0, lastImpactSound = 0;
  const pad = { id: '', armed: false, steer: 0, gas: 0, brake: 0, up: false, down: false };
  let rollRate = 0, shiftRemaining = 0, shiftDuration = 0.19, shiftLock = 0;

  function getState() {
    return { ...state, menuOpen, motorcycle: {...state.motorcycle}, splits: state.splits.slice(), bestSplits: state.bestSplits.slice(),
      impact:state.impact?{...state.impact}:null,crash:state.crash?{...state.crash}:null,
      rivals: state.rivals.map(rider => ({ ...rider,impact:rider.impact?{...rider.impact}:null,crash:rider.crash?{...rider.crash}:null })), classification: race?.classification(state) ?? [] };
  }

  function publish() {
    emit('apex:update', getState());
  }

  // Fourier series for a repeating 720° four-stroke cycle. Uneven crossplane
  // firing intervals (270/180/90/180°) give the exhaust a pulsing low register.
  function firingWave(intake, rideProfile = baseProfile) {
    const count = 64;
    const real = new Float32Array(count), imag = new Float32Array(count);
    const firing = rideProfile.firing.map(angle => angle / 720);
    for (let n = 1; n < count; n++) {
      const slope = intake ? 0.82 : 0.58;
      const decay = Math.exp(-n / (intake ? 16 : 34)) / Math.pow(n, slope);
      firing.forEach((phase, i) => {
        const weight = (intake ? [0.8, 1, 0.86, 0.93] : [1, 0.91, 0.95, 0.86])[i];
        real[n] += weight * decay * Math.cos(n * phase * Math.PI * 2);
        imag[n] -= weight * decay * Math.sin(n * phase * Math.PI * 2);
      });
    }
    return audioContext.createPeriodicWave(real, imag);
  }

  function buildMotor() {
    const ac = audioContext;
    const gain = () => { const g = ac.createGain(); g.gain.value = 0; return g; };
    const filter = (type, frequency, q) => {
      const f = ac.createBiquadFilter();
      f.type = type; f.frequency.value = frequency; f.Q.value = q;
      return f;
    };
    const master = gain();
    master.connect(ac.destination);
    const waves = Object.fromEntries(motorcycles.models.map(model => [model.id, [firingWave(false,model.physics),firingWave(true,model.physics)]]));
    function voice(intake) {
      const osc = ac.createOscillator();
      osc.setPeriodicWave(waves[motorcycle.model][Number(intake)]);
      const tone = filter(intake ? 'bandpass' : 'lowpass', intake ? 870 : 1500, intake ? 0.85 : 0.55);
      const level = gain();
      osc.connect(tone); tone.connect(level); level.connect(master); osc.start();
      return { osc, tone, level };
    }
    const exhaust = voice(false), intake = voice(true);
    const length = ac.sampleRate * 2;
    const noiseBuffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ac.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const wind = filter('lowpass', 550, 0.45), windLevel = gain();
    const road = filter('bandpass', 170, 0.78), roadLevel = gain();
    noise.connect(wind); wind.connect(windLevel); windLevel.connect(master);
    noise.connect(road); road.connect(roadLevel); roadLevel.connect(master);
    const impactFilter=filter('bandpass',900,1.2),impactLevel=gain(),impactPan=ac.createStereoPanner?.();
    noise.connect(impactFilter);impactFilter.connect(impactLevel);
    if(impactPan){impactLevel.connect(impactPan);impactPan.connect(master);}else impactLevel.connect(master);
    noise.start();
    // Irregular damped droplets on the visor/tank. A separate buffer keeps
    // individual ticks audible against the continuous wet tyre spray.
    const drops = ac.createBuffer(1, length, ac.sampleRate);
    const dropsData = drops.getChannelData(0);
    for (let i = 0; i < 440; i++) {
      const start = Math.floor(Math.random() * length);
      const span = 0.002 + Math.random() * 0.012;
      const freq = 720 + Math.random() * 3100;
      const force = 0.05 + Math.pow(Math.random(), 3) * 0.41;
      for (let j = 0; j < span * ac.sampleRate; j++) {
        const t = j / ac.sampleRate;
        dropsData[(start + j) % length] += force * Math.exp(-5 * t / span) *
          (Math.sin(2 * Math.PI * freq * t) + (Math.random() - 0.5) * 0.64);
      }
    }
    const rain = ac.createBufferSource(), rainLevel = gain();
    rain.buffer = drops; rain.loop = true;
    rain.connect(rainLevel); rainLevel.connect(master); rain.start();
    // The concrete roof and back wall return early reflections. The open
    // side limits the decay. Only the engine and road feed this acoustic space.
    const shedSend = gain(), shedReturn = gain();
    exhaust.level.connect(shedSend); intake.level.connect(shedSend); roadLevel.connect(shedSend);
    const reflected = filter('lowpass', 3100, 0.5);
    shedSend.connect(reflected);
    for (const [seconds, strength] of [[0.019, 0.47], [0.041, 0.29], [0.078, 0.19]]) {
      const delay = ac.createDelay(0.12), reflection = gain();
      delay.delayTime.value = seconds;
      reflection.gain.value = strength;
      reflected.connect(delay); delay.connect(reflection); reflection.connect(shedReturn);
      if (seconds > 0.07) {
        const feedback = gain();
        feedback.gain.value = 0.27;
        reflection.connect(feedback); feedback.connect(delay);
      }
    }
    shedReturn.connect(master);
    const packWave = firingWave(false);
    const pack = [0, 1, 2].map(i => {
      const osc = ac.createOscillator(), volume = gain();
      const tone = filter('lowpass', 1200 + i * 160, 0.6);
      const stereo = ac.createStereoPanner?.();
      osc.setPeriodicWave(packWave);
      osc.connect(tone); tone.connect(volume);
      if (stereo) { volume.connect(stereo); stereo.connect(master); }
      else volume.connect(master);
      osc.start();
      return { osc, tone, volume, stereo };
    });
    return { waves,model:motorcycle.model,impactFilter,impactLevel,impactPan,pack, shedSend, shedReturn, rainLevel, master, exhaust, intake, wind, windLevel, road, roadLevel };
  }

  function unlockAudio() {
    if (!sound || host?.manual) return;
    try {
      if (!audioContext) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        audioContext = new Audio();
        motor = buildMotor();
      }
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    } catch { /* An unavailable audio device never interrupts a race. */ }
  }

  function beep(pitch, duration = 0.10) {
    if (!sound || !audioContext || audioContext.state !== 'running') return;
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    const t = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.value = pitch;
    envelope.gain.setValueAtTime(0.001, t);
    envelope.gain.exponentialRampToValueAtTime(0.085, t + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.001, t + duration);
    oscillator.connect(envelope);
    envelope.connect(audioContext.destination);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(t);
    oscillator.stop(t + duration + 0.01);
  }

  function playImpact(hit) {
    if (!sound || !motor || audioContext.state !== 'running') return;
    const source=audioContext.createOscillator(),gain=audioContext.createGain();
    const t=audioContext.currentTime,metal=hit.type==='rail',force=hit.severity;
    source.type=metal?'triangle':'sine';
    source.frequency.setValueAtTime((metal?210:112)+force*110,t);
    source.frequency.exponentialRampToValueAtTime(metal?48:34,t+.15);
    gain.gain.setValueAtTime(.001,t);
    gain.gain.exponentialRampToValueAtTime(.18+force*.48,t+.004);
    gain.gain.exponentialRampToValueAtTime(.001,t+.24);
    source.connect(gain);
    gain.connect(motor.impactPan||motor.master);
    motor.impactPan?.pan.setTargetAtTime(hit.side*.74,t,.015);
    motor.impactFilter.frequency.setValueAtTime(metal?2200:430,t);
    motor.impactLevel.gain.cancelScheduledValues(t);
    motor.impactLevel.gain.setValueAtTime(.02,t);
    motor.impactLevel.gain.linearRampToValueAtTime((metal?.20:.13)+force*.36,t+.006);
    motor.impactLevel.gain.exponentialRampToValueAtTime(.001,t+(metal?.26:.12));
    source.onended=()=>{source.disconnect();gain.disconnect();};
    source.start(t);source.stop(t+.25);
  }

  function active(action) {
    if (touch.has(action)) return true;
    for (const key of keyboard) if (keyActions[key] === action) return true;
    return false;
  }

  function updateMotor() {
    if (!motor) return;
    const t = audioContext.currentTime;
    if (motor.model !== state.motorcycle.model) {
      motor.model = state.motorcycle.model;
      motor.exhaust.osc.setPeriodicWave(motor.waves[motor.model][0]);
      motor.intake.osc.setPeriodicWave(motor.waves[motor.model][1]);
    }
    const updating = sound && (state.mode === 'racing' || state.mode === 'countdown');
    const set = (param, value, smooth = 0.04) => param.setTargetAtTime(value, t, smooth);
    set(motor.master.gain, updating ? 0.49 : 0);
    const shelter = state.shelter;
    set(motor.shedSend.gain, updating ? shelter : 0, 0.045);
    set(motor.shedReturn.gain, updating ? 0.67 : 0, 0.035);
    if (!updating) {motor.impactLevel.gain.cancelScheduledValues(t);set(motor.impactLevel.gain,0,.015);return;}
    if(state.impact && state.impact.id!==lastImpactSound){
      lastImpactSound=state.impact.id;
      if(state.impact.age<.18)playImpact(state.impact);
    }
    const shaft = state.rpm / 120;
    const rev = state.rpm / profile.redline;
    const speed = limit(state.speed / 250, 0, 1);
    const tcCut = state.tcActive ? 0.7 + 0.25 * Math.sin(state.time * 91) : 1;
    const load = state.crash?0:Math.max(state.throttle * (1 - Math.sin(Math.PI * state.shift) * 0.95) * tcCut, blip * 0.52);
    const cockpit = state.camera === 'cockpit';
    set(motor.exhaust.osc.frequency, shaft, 0.022);
    set(motor.intake.osc.frequency, shaft, 0.025);
    set(motor.exhaust.tone.frequency, (360 + 980 * rev + load * 1450) * profile.exhaustTone);
    set(motor.intake.tone.frequency, (540 + 1610 * rev) * profile.intakeTone);
    set(motor.exhaust.level.gain, (state.crash?.phase==='recover'?.13:cockpit ? 0.31 : 0.38) * (0.47 + 0.53 * load) * profile.exhaustGain);
    set(motor.intake.level.gain, (cockpit ? 0.33 : 0.22) * (0.28 + load * 0.72) * profile.intakeGain);
    const rain = state.weather === 'rain';
    set(motor.rainLevel.gain, rain ? (cockpit ? 0.24 : 0.14) * (1 - speed * 0.35) * (1 - 0.89 * shelter) : 0);
    set(motor.wind.frequency, 360 + 1700 * speed + (rain ? 170 : 0));
    set(motor.windLevel.gain, (cockpit ? 0.21 : 0.12) * speed * speed * (1 - 0.68 * shelter), 0.12);
    const scraping=state.barrierContact && state.impact?.type==='rail';
    const sliding=state.crash && state.crash.phase!=='recover';
    const roadTone=scraping?1650:sliding?480:(state.offroad?530:165+state.wetness*1330);
    set(motor.road.frequency, roadTone + 190 * speed);
    set(motor.roadLevel.gain, (scraping ? 0.57 : sliding ? .47 : state.offroad ? 0.42 : 0.11 + state.wetness * 0.31) * Math.sqrt(speed) +
      (state.braking ? Math.max(0, state.gripUsage - 0.8) * 0.16 : 0));
    motor.pack.forEach((voice, i) => {
      const rival = state.rivals[i];
      const gap = rival ? rival.distance - state.distance : Infinity;
      const proximity = Math.max(0, 1 - Math.abs(gap) / 85);
      set(voice.volume.gain, .19 * proximity * proximity, .075);
      if (!proximity) return;
      const across = (rival.lateral - state.lateral) * (window.ApexWorld?.roadHalf || 4.65);
      const range = Math.hypot(gap, across, 1.7);
      const radialSpeed = (rival.speed - state.speed) * gap / (3.6 * range);
      const doppler = 343 / (343 + radialSpeed);
      let gear = 0;
      while (gear < gearing.length - 1 && rival.speed > gearing[gear] * .925) gear++;
      const rpm = Math.max(1500 + Math.min(1, rival.speed / 15) * 2800, rival.speed / gearing[gear] * REDLINE);
      set(voice.osc.frequency, rpm / 120 * doppler * (0.98 + i * .022), .05);
      set(voice.tone.frequency, 480 + proximity * (rival.braking ? 880 : 1850));
      if (voice.stereo) set(voice.stereo.pan, across / range, .06);
    });
  }

  function resetTouchInput(reason) {
    touch.clear();
    Object.assign(touchInput, { steer: 0, throttle: 0, brake: 0 });
    emit('apex:input-reset', {reason});
  }

  function clearInputs(reason = 'reset') {
    keyboard.clear();
    resetTouchInput(reason);
    Object.assign(pad, { armed: false, steer: 0, gas: 0, brake: 0, up: false, down: false });
    state.braking = false;
  }

  function setMenuOpen(open) {
    const next = Boolean(open);
    if (next === menuOpen) return menuOpen;
    menuOpen = next;
    for (const key of keyboard) blockedKeys.add(key);
    clearInputs('menu');
    // UI owns menu visibility and simulation pause. Publishing here would
    // feed its visibility update back into itself.
    return menuOpen;
  }

  function queueFrame() {
    if (!host?.manual && !scheduled && canvas) {
      scheduled = true;
      requestAnimationFrame(frame);
    }
  }

  function resetRun() {
    clearInputs();
    state = newRun();
    rollRate = shiftRemaining = shiftLock = springVelocity = blip = lastImpactSound = 0;
    blockedKeys.clear();
    countdownRemaining = 3;
    lastSplitTime = 0;
    pausedMode = null;
    previousFrame = now();
    lastUpdate = -Infinity;
  }

  function returnToGrid() {
    resetRun();
    updateMotor();
    publish();
    queueFrame();
    return true;
  }

  function setCourse(route) {
    if (!['ready', 'finished'].includes(state.mode) || !Object.hasOwn(LENGTHS, route)) return false;
    if (course === route) return true;
    course = route;
    weather = weatherByCourse[route];
    window.ApexWorld?.selectCourse?.(route);
    try { storage.setItem(COURSE_KEY, route); } catch {}
    return returnToGrid();
  }

  function setWeather(condition) {
    if (!['ready', 'finished'].includes(state.mode) || !['rain', 'clear'].includes(condition)) return false;
    if (weather === condition) return true;
    weather = condition;
    weatherByCourse[course] = condition;
    try { storage.setItem(WEATHER_KEYS[course], condition); } catch {}
    return returnToGrid();
  }

  function setTransmission(mode) {
    if (!['ready', 'finished'].includes(state.mode) || !['auto', 'manual'].includes(mode)) return false;
    if (gearbox === mode) return true;
    gearbox = mode;
    try { storage.setItem(TRANSMISSION_KEY, mode); } catch {}
    return returnToGrid();
  }

  function setMotorcycle(patch) {
    if (!['ready','finished'].includes(state.mode) || !patch || typeof patch !== 'object' || Array.isArray(patch)) return false;
    const next = motorcycles.normalize({...motorcycle,...patch});
    if (motorcycles.key(next) === motorcycles.key(motorcycle)) return true;
    motorcycle = next;
    try { storage.setItem(MOTORCYCLE_KEY,JSON.stringify(motorcycle)); } catch {}
    return returnToGrid();
  }

  function restart() {
    unlockAudio();
    resetRun();
    state.mode = 'countdown';
    updateMotor();
    beep(440);
    publish();
    queueFrame();
  }

  function start() {
    if (state.mode === 'ready' || state.mode === 'finished') restart();
    else if (state.mode === 'paused') togglePause();
  }

  function togglePause() {
    if (state.mode === 'paused') {
      unlockAudio();
      state.mode = pausedMode;
      pausedMode = null;
      previousFrame = now();
    } else if (state.mode === 'racing' || state.mode === 'countdown') {
      pausedMode = state.mode;
      state.mode = 'paused';
      clearInputs('pause');
    } else {
      return;
    }
    updateMotor();
    publish();
    queueFrame();
  }

  function toggleSound() {
    sound = !sound;
    state.sound = sound;
    try { storage.setItem(SOUND_KEY, sound ? 'on' : 'off'); } catch {}
    if (sound) unlockAudio();
    updateMotor();
    if (sound) beep(660, 0.07);
    publish();
  }

  function cycleCamera() {
    camera = camera === 'chase' ? 'cockpit' : 'chase';
    state.camera = camera;
    try { storage.setItem(CAMERA_KEY, camera); } catch {}
    updateMotor();
    publish();
    queueFrame();
    return camera;
  }

  function setTouch(action, pressed) {
    if (!['throttle', 'brake', 'left', 'right'].includes(action)) return;
    if (pressed && !menuOpen && !state.crash && (state.mode === 'racing' || state.mode === 'countdown')) touch.add(action);
    else touch.delete(action);
  }

  function setTouchInput(input = {}) {
    const enabled = !menuOpen && !state.crash && (state.mode === 'racing' || state.mode === 'countdown');
    const amount = (key, low = 0) => enabled && Number.isFinite(input?.[key]) ? limit(input[key], low, 1) : 0;
    touchInput.steer = amount('steer', -1);
    touchInput.brake = amount('brake');
    touchInput.throttle = touchInput.brake > 0.05 ? 0 : amount('throttle');
    return enabled;
  }

  function finish() {
    state.mode = 'finished';
    state.braking = false;
    const model = state.motorcycle.model;
    const previous = records[model][course][weather];
    state.isRecord = !previous || state.time < previous.time;
    if (state.isRecord) {
      const record = { time: state.time, splits: state.splits.slice() };
      records[model][course][weather] = record;
      state.best = record.time;
      state.bestSplits = record.splits.slice();
      try { storage.setItem(recordKey(course,weather,model), JSON.stringify(record)); } catch {}
    }
    clearInputs('finish');
    updateMotor();
    beep(1046, 0.32);
    publish();
  }

  function changeGear(direction) {
    const next = state.gear + direction;
    if (shiftLock > 0 || next < 1 || next > 6) return false;
    const nextRpm = state.speed / profile.gearing[next - 1] * profile.redline;
    if (direction < 0 && nextRpm > profile.redline * 0.97) return false;
    state.gear = next;
    shiftDuration = direction > 0 ? 0.16 : 0.22;
    shiftRemaining = shiftDuration;
    shiftLock = SHIFT_INTERVAL;
    state.shift = 1;
    if (direction < 0) blip = limit((nextRpm - state.rpm) / 2600, 0.22, 1);
    return true;
  }

  function shiftGear(direction) {
    if (menuOpen || state.mode !== 'racing' || state.crash || gearbox !== 'manual' || (direction !== 1 && direction !== -1)) return false;
    if (!changeGear(direction)) return false;
    publish();
    return true;
  }

  function transmission(dt) {
    shiftLock = Math.max(0, shiftLock - dt);
    shiftRemaining = Math.max(0, shiftRemaining - dt);
    blip = Math.max(0, blip - dt * 6);
    const wheelRpm = state.speed / profile.gearing[state.gear - 1] * profile.redline;
    if (gearbox === 'auto' && shiftLock === 0) {
      if (wheelRpm > profile.upshiftRpm) changeGear(1);
      else if (wheelRpm < (state.brake > 0.3 ? profile.brakingDownshiftRpm : profile.downshiftRpm)) changeGear(-1);
    }
    state.shift = shiftRemaining / shiftDuration;
    // The rider pulls, holds through the torque cut, then feeds the lever out.
    // The accepted shift's lockout doubles as its simulation-time clock.
    const shiftAge = SHIFT_INTERVAL - shiftLock;
    const releaseTime = SHIFT_INTERVAL - shiftDuration - 0.045;
    const pull = Math.min(1, shiftAge / 0.075, shiftLock / releaseTime);
    state.clutch = pull * pull * (3 - 2 * pull);
    const coupledRpm = state.speed / profile.gearing[state.gear - 1] * profile.redline;
    const clutchRpm = profile.idleRpm + state.throttle * profile.launchRpm;
    const target = Math.max(clutchRpm, coupledRpm + blip * 190);
    state.rpm = follow(state.rpm, limit(target, profile.idleRpm, profile.redline), blip > 0 ? 20 : 13, dt);
  }

  function pollPad() {
    if (menuOpen) {
      Object.assign(pad, { armed: false, steer: 0, gas: 0, brake: 0, up: false, down: false });
      return;
    }
    let controller;
    try {
      controller = Array.from(window.navigator?.getGamepads?.() ?? []).find(p => p?.connected && p.mapping === 'standard');
    } catch { /* Gamepads can be unavailable in an embedded browser. */ }
    if (!controller) {
      if (pad.id) Object.assign(pad, { id: '', armed: false, steer: 0, gas: 0, brake: 0, up: false, down: false });
      return;
    }
    const id = controller.index + ':' + controller.id;
    if (pad.id !== id) { pad.id = id; pad.armed = false; }
    const dead = 0.12;
    const axis = controller.axes[0] || 0;
    const value = i => limit(controller.buttons[i]?.value || 0, 0, 1);
    const gas = value(7), brake = value(6), up = value(5) > 0.5, down = value(4) > 0.5;
    if (!pad.armed) {
      pad.gas = pad.brake = pad.steer = 0;
      pad.up = up; pad.down = down;
      pad.armed = gas < 0.04 && brake < 0.04 && Math.abs(axis) < dead && !up && !down;
      return;
    }
    pad.steer = Math.sign(axis) * limit((Math.abs(axis) - dead) / (1 - dead), 0, 1);
    pad.gas = gas < 0.025 ? 0 : gas;
    pad.brake = brake < 0.025 ? 0 : brake;
    if (up && !pad.up) shiftGear(1);
    if (down && !pad.down) shiftGear(-1);
    pad.up = up; pad.down = down;
  }

  function completeStep(start, dt, world) {
    const oldDistance=start.z;
    const wasDown=Boolean(state.crash);
    state.time+=dt;
    if(race) state.racePosition=race.advance(state,start,dt,world);
    else collisions.resolve([state],[start],dt,world,state.length);
    if(!wasDown && state.crash) resetTouchInput('crash');
    state.offroad=Math.abs(state.lateral)>1;
    state.shelter=limit(world?.shelterAt?.(state.distance)??0,0,1);
    const traveled=state.distance-oldDistance;
    const boundary=state.sector===3?state.length:state.sector*state.length/3;
    if(state.distance>=boundary && traveled>0) {
      const crossingTime=state.time-dt*(state.distance-boundary)/traveled;
      state.splits[state.sector-1]=crossingTime-lastSplitTime;
      lastSplitTime=crossingTime;
      if(state.sector===3) {
        state.time=crossingTime;
        state.distance=state.length;
        if(race){race.finishAt(crossingTime);state.racePosition=race.position(state);}
        finish();
      } else {state.sector++;beep(740,.11);publish();}
    }
  }

  function ride(dt) {
    const world=window.ApexWorld;
    const start=collisions.capture(state,world);
    collisions.tick(state,dt);
    if(collisions.moveDown(state,dt,world)) {
      if(collisions.tookRecovery(state)){
        for(const key of keyboard)blockedKeys.add(key);
        clearInputs('recovery');
        state.throttle=state.brake=0;
        state.braking=false;
        rollRate=shiftRemaining=shiftLock=0;
      }
      completeStep(start,dt,world);
      return;
    }
    const brake = active('brake') ? 1 : Math.max(pad.brake, touchInput.brake);
    const throttle = active('throttle') ? 1 : Math.max(pad.gas, touchInput.throttle);
    state.throttle = follow(state.throttle, brake > 0.05 ? 0 : throttle, 12, dt);
    state.brake = follow(state.brake, brake, 11, dt);
    state.braking = state.brake > 0.15;
    transmission(dt);

    const v = state.speed / 3.6;
    const curve = world?.curvature ? world.curvature(state.distance) : (world?.roadCurve(state.distance) || 0) / 151;
    state.curvature = curve;
    const halfWidth = world?.roadHalf || 4.65;
    const offroad = Math.abs(state.lateral) > 1;
    const rain = weather === 'rain';
    state.wetness = rain ? limit(world?.surfaceWetness?.(state.distance, state.lateral) ?? 0.5, 0, 1) : 0;
    const patch = Math.max(0, (state.wetness - 0.67) / 0.33) * Math.min(1, v / 46);
    const roadGrip = rain ? 1.055 - 0.30 * state.wetness - 0.14 * patch : 1.26;
    const grip = GRAVITY * (offroad ? (rain ? 0.52 : 0.65) : roadGrip);
    const keySteer = Number(active('right')) - Number(active('left'));
    const steer = keySteer || (Math.abs(touchInput.steer) > Math.abs(pad.steer) ? touchInput.steer : pad.steer);

    // Roll inertia slows direction changes at high speed. A brief opposite
    // contact-patch impulse initiates the bank, as countersteering does on a bike.
    const maxBank = Math.min(MAX_LEAN, 7 + v * 2.85);
    const rollTarget = steer * maxBank * (offroad ? 0.74 : 1);
    const agility = (6.6 - 1.75 * Math.min(1, v / 65)) * profile.agility;
    rollRate += ((rollTarget - state.leanAngle) * agility * agility - 1.84 * agility * rollRate) * dt;
    state.leanAngle = limit(state.leanAngle + rollRate * dt, -MAX_LEAN, MAX_LEAN);
    state.lean = state.leanAngle / MAX_LEAN;

    const rev = state.rpm / profile.redline;
    const torque = profile.torqueBase + profile.torquePeak * Math.sin(limit((rev - 0.09) / 1.18, 0, 1) * Math.PI);
    const engaged = state.shift > 0 ? 1 - Math.pow(Math.sin(Math.PI * state.shift), 0.45) : 1;
    const limiter = limit((profile.redline - state.rpm) / profile.limiterRange, 0, 1);
    const drive = profile.wheelThrust[state.gear - 1] * torque * state.throttle * engaged * limiter;
    const engineBrake = (0.36 + 2.1 * rev) * (1 - state.throttle) * engaged * Math.min(1, v / 3) * profile.engineBraking;
    const requestedForce = drive - engineBrake - state.brake * profile.brakeForce;
    // The rear tyre alone supplies drive. Weight transfer under acceleration
    // increases its contact load. ABS apportions braking across both tyres.
    const rearCapacity = grip * (1 - state.frontLoad);
    const longitudinalDemand = rain ? limit(requestedForce, -grip, rearCapacity) : requestedForce;
    const lateralDemand = GRAVITY * Math.tan(state.leanAngle * DEG) * Math.min(1, v / 4);
    // A shared tyre friction circle trades braking/drive for cornering reserve.
    const demand = Math.hypot(longitudinalDemand, lateralDemand);
    const traction = Math.min(1, grip / Math.max(0.001, demand));
    state.gripUsage = Math.min(1, demand / grip);
    const deliveredForce = longitudinalDemand * traction;
    const wheelSlip = Math.abs(requestedForce - deliveredForce) / Math.max(1, Math.abs(requestedForce));
    const lateralSlip = Math.abs(lateralDemand) * (1 - traction) / grip;
    state.slip = follow(state.slip, limit(Math.max(wheelSlip, lateralSlip), 0, 1), 14, dt);
    state.tcActive = state.throttle > 0.18 && requestedForce > 1 && wheelSlip > 0.085;
    state.absActive = state.brake > 0.18 && v > 1.6 && wheelSlip > 0.045;
    const cornerForce = lateralDemand * traction;
    const aero = profile.aeroDrag * v * v;
    const gravelDrag = rain ? Math.min(1, v / 5) + 0.0065 * v * v : 2.15 + 0.0080 * v * v;
    const rolling = offroad ? gravelDrag : 0.19 + state.wetness * (0.07 + 0.00014 * v * v);
    state.grade = world?.grade ? world.grade(state.distance) : 0;
    const hill = GRAVITY * state.grade / Math.hypot(1, state.grade);
    const acceleration = deliveredForce - aero - rolling - hill;
    const newV = Math.max(0, v + acceleration * dt);
    const meters = (v + newV) * dt * 0.5;
    const traveled = meters;
    const movingTime = dt;

    // In the road frame, the bend moves sideways at v²/r. The relaxation term
    // models directional stability and makes a released steering key recoverable.
    const counter = limit(rollRate / 100, -1, 1) * Math.min(1, v / 10) * 1.05;
    const excess = cornerForce - v * v * curve - counter;
    const damping = offroad ? 2.8 : profile.stability;
    state.lateralVelocity = follow(state.lateralVelocity, excess / damping, damping, movingTime);
    state.lateralVelocity *= Math.min(1, newV / 1.4);
    const nextLine = state.lateral + state.lateralVelocity * movingTime / halfWidth;
    state.lateral=nextLine;
    state.speed=newV*3.6;
    state.accel=newV>0?acceleration:0;
    state.offroad = Math.abs(state.lateral) > 1;
    // 0.54 m centre-of-mass height over a 1.44 m wheelbase. A damped
    // fork spring delays chassis pitch while the tyre loads transfer.
    const targetLoad = limit(0.52 - profile.loadTransfer * state.accel / GRAVITY, 0.12, 0.94);
    state.frontLoad = follow(state.frontLoad, targetLoad, 13, movingTime);
    const compression = limit((state.frontLoad - 0.52) / 0.40, -1, 1);
    springVelocity += ((compression - state.suspension) * profile.springRate - profile.springDamping * springVelocity) * movingTime;
    state.suspension = limit(state.suspension + springVelocity * movingTime, -1, 1);
    state.pitch = -state.suspension;
    const roughness = state.offroad ? 0.72 : 0.075;
    const ripple = Math.sin(state.distance * 0.62) * 0.55 + Math.sin(state.distance * 1.91) * 0.45;
    const impactBounce=state.impact?Math.sin(state.impact.age*44)*state.impact.severity*Math.exp(-state.impact.age*7)*(reducedMotion?.15:1):0;
    state.heave = limit(ripple * roughness * Math.min(1, v / 18) + state.shift * 0.10 + impactBounce, -1, 1);

    state.distance += traveled;
    completeStep(start,dt,world);
  }

  function advance(dt) {
    if (state.mode === 'countdown') {
      const previous = state.countdown;
      const consumed = Math.min(dt, countdownRemaining);
      countdownRemaining -= consumed;
      dt -= consumed;
      state.countdown = Math.max(1, Math.ceil(countdownRemaining));
      if (countdownRemaining <= 0) {
        state.mode = 'racing';
        beep(880, 0.24);
        publish();
      } else if (state.countdown !== previous) {
        beep(440);
        publish();
      }
    }
    // Small physics steps keep cornering and split times consistent across refresh rates.
    while (state.mode === 'racing' && dt > 0.0000001) {
      const step = Math.min(dt, 1 / 60);
      ride(step);
      dt -= step;
    }
  }

  function draw() {
    if (!ctx || !width || !height) return;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.save();
    window.ApexWorld?.draw(ctx, width, height, state);
    ctx.restore();
    ctx.save();
    window.ApexBike?.draw(ctx, width, height, state);
    ctx.restore();
    ctx.save();
    window.ApexTouch?.draw?.(ctx, width, height, state);
    ctx.restore();
  }

  function frame(now) {
    scheduled = false;
    const rainyGrid = state.mode === 'ready' && state.weather === 'rain' && !document.hidden;
    if (rainyGrid && previousFrame !== null && now - previousFrame < 1000 / 28) {
      queueFrame();
      return;
    }
    const dt = previousFrame === null ? 0 : Math.min(0.25, Math.max(0, (now - previousFrame) / 1000));
    if (state.mode !== 'paused' && state.mode !== 'finished') state.weatherTime += dt;
    previousFrame = now;
    if (state.mode === 'countdown' || state.mode === 'racing') pollPad();
    advance(dt);
    draw();
    if (!rainyGrid && now - lastUpdate >= 50) {
      updateMotor();
      publish();
      lastUpdate = now;
    }
    if (rainyGrid || state.mode === 'countdown' || state.mode === 'racing') queueFrame();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    queueFrame();
  }

  function onFocusLoss() {
    clearInputs('focus');
    if (state.mode === 'racing' || state.mode === 'countdown') togglePause();
  }

  function init() {
    canvas = document.getElementById('race-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d', { alpha: false });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    window.addEventListener('resize', resize);
    window.addEventListener('apex:asset', queueFrame);
    window.addEventListener('blur', onFocusLoss);
    document.addEventListener('visibilitychange', () => { if (document.hidden) onFocusLoss(); else queueFrame(); });
    window.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const editing = event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName);
      if (!event.repeat && (event.code === 'Escape' || event.code === 'KeyP' && !editing)) {
        const nativeEscape = event.code === 'Escape' && (document.fullscreenElement || document.webkitFullscreenElement);
        if (!nativeEscape) event.preventDefault();
        const request = new CustomEvent('apex:menu-toggle', { cancelable: true, detail: { key: event.code } });
        window.dispatchEvent(request);
        if (!request.defaultPrevented && state.mode !== 'ready' && state.mode !== 'finished') togglePause();
        return;
      }
      if (menuOpen) {
        if (event.code in keyActions) blockedKeys.add(event.code);
        return;
      }
      if (editing) return;
      if (event.code in keyActions) {
        if(state.crash){blockedKeys.add(event.code);event.preventDefault();return;}
        if(blockedKeys.has(event.code))return;
        if(event.repeat && !keyboard.has(event.code))return;
        if (state.mode === 'racing' || state.mode === 'countdown') {
          event.preventDefault();
          keyboard.add(event.code);
        }
      } else if (!event.repeat && state.mode === 'racing' && gearbox === 'manual' &&
                 (event.code === 'KeyE' || event.code === 'KeyQ')) {
        event.preventDefault();
        shiftGear(event.code === 'KeyE' ? 1 : -1);
      } else if (!event.repeat && event.code === 'KeyC') {
        event.preventDefault();
        cycleCamera();
      } else if (!event.repeat && event.code === 'Enter' &&
                 !event.target?.closest?.('button, a, [role="button"]')) {
        if (['ready', 'finished', 'paused'].includes(state.mode)) {
          event.preventDefault();
          start();
        }
      }
    });
    window.addEventListener('keyup', event => {keyboard.delete(event.code);blockedKeys.delete(event.code);});
    resize();
    publish();
  }

  // A native host supplies seconds and normalized input, just as the browser
  // frame/pointer adapters do. Clamp stalled frames identically on both hosts.
  function advanceForHost(dt, input = {}) {
    if (!host?.manual) throw new Error('Explicit stepping requires a manual host');
    const elapsed = Number.isFinite(dt) ? Math.min(.25, Math.max(0, dt)) : 0;
    setTouchInput(input);
    if (state.mode !== 'paused' && state.mode !== 'finished') state.weatherTime += elapsed;
    advance(elapsed);
    return getState();
  }

  window.ApexGame = { advance:advanceForHost, start, restart, togglePause, toggleSound, cycleCamera, setCourse, setWeather, setTransmission, setMotorcycle, shiftGear, returnToGrid, setTouch, setTouchInput, setMenuOpen, getState };
  if (!host?.manual) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();
