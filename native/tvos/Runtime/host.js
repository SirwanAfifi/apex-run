/* tvOS platform adapter. Load after world-model and before engine.js.
   Only the host owns time, storage, and presentation; all racing uses src/. */
(() => {
  'use strict';
  const defaults = {
    'apex-run.course.v1': 'coast',
    'apex-run.coast.weather.v1': 'clear',
    'apex-run.camera.v1': 'chase',
    'apex-run.transmission.v3': 'auto',
    'apex-run.motorcycle.v1': JSON.stringify(window.ApexMotorcycles.defaultConfig('r600'))
  };
  const memory = new Map();
  let clock = 0;
  window.ApexHost = {
    manual: true,
    now: () => clock,
    storage: {
      // The prototype intentionally exposes one course/bike/camera. Persisted
      // records still share the browser's model/course/weather key format.
      getItem(key) {
        if (Object.hasOwn(defaults, key)) return defaults[key];
        return typeof nativeStorageGet === 'function' ? nativeStorageGet(key) : memory.get(key) ?? null;
      },
      setItem(key, value) {
        const text = String(value);
        if (typeof nativeStorageSet === 'function') nativeStorageSet(key, text);
        else memory.set(key, text);
      }
    },
    emit(name, detail) {
      if (name === 'apex:input-reset' && typeof nativeInputReset === 'function') {
        nativeInputReset(detail.reason);
      }
    }
  };
  const world = window.ApexWorld = window.ApexWorldModel.create('coast');
  const groundOffsets = [-80,-28,-14,-8,-4.65,4.65,8,17,45,103];
  const pose = actor => ({
    worldPosition: world.point(actor.distance, actor.lateral * world.roadHalf),
    tangent: world.tangent(actor.distance)
  });
  function frame() {
    const state = window.ApexGame.getState();
    Object.assign(state, pose(state));
    state.rivals = state.rivals.map(rival => ({...rival, ...pose(rival)}));
    state.audioProfile = window.ApexMotorcycles.getModel(state.motorcycle.model).physics;
    const eye = world.point(state.distance - 3.7, state.lateral * world.roadHalf);
    const target = world.point(state.distance + 18, state.lateral * world.roadHalf);
    eye[1] += 1.75; target[1] += 1.0;
    state.cameraPose = {position:eye, target};
    return JSON.stringify(state);
  }
  let trackCache;
  function trackJSON() {
    if (trackCache) return trackCache;
    const length = 4800, samples = [];
    for (let d = -128; d <= length + 256; d += 8) {
      samples.push({d, center:world.point(d,0),
        left:world.point(d,-world.roadHalf), right:world.point(d,world.roadHalf),
        ground:groundOffsets.map(u => world.point(d,u)),
        railLeft:world.hasRail(d,-1), railRight:world.hasRail(d,1),
        bridge:window.ApexCoast.bridge(d)});
    }
    // Reuse the authored solid geometry and flora in coast.section verbatim.
    // Mesh surfaces use the sampled ground above; the prototype omits its
    // small helper-generated posts/walls/strips until native material parity.
    const landmarks = [], foliage = [];
    const helpers = {
      point:world.point,
      face(a,b,c,d,uv,color,material) { landmarks.push({vertices:[a,b,d,c],color,material}); },
      quad() {}, wall() {}, post() {}, strip() {},
      flora(d,u,height,kind,seed) { foliage.push({d,position:world.point(d,u),height,kind,seed}); }
    };
    for (let d = -128; d < length + 256; d += 4) window.ApexCoast.section(d,d+4,helpers);
    trackCache = JSON.stringify({length,roadHalf:world.roadHalf,railOffset:world.railOffset,
      groundOffsets,samples,landmarks,foliage});
    return trackCache;
  }
  window.ApexNative = {
    start() {window.ApexGame.start(); return frame();},
    restart() {window.ApexGame.restart(); return frame();},
    pause() {if (['racing','countdown'].includes(window.ApexGame.getState().mode)) window.ApexGame.togglePause(); return frame();},
    resume() {if (window.ApexGame.getState().mode === 'paused') window.ApexGame.togglePause(); return frame();},
    step(dt,steer=0,throttle=0,brake=0) {
      const elapsed = Number.isFinite(dt) ? Math.min(.25,Math.max(0,dt)) : 0;
      clock += elapsed * 1000;
      window.ApexGame.advance(elapsed,{steer,throttle,brake});
      return frame();
    },
    stateJSON:frame, trackJSON,
    locationJSON(distance,lateral=0) {
      if (!Number.isFinite(distance) || !Number.isFinite(lateral)) throw new Error('Location requires finite coordinates');
      return JSON.stringify({position:world.point(distance,lateral*world.roadHalf),
        heading:Math.atan(world.tangent(distance)),grade:world.grade(distance)});
    }
  };
})();
