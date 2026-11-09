/* Optional, permission-gated phone tilt. Touch still owns acceleration/braking. */
window.ApexMotion = (() => {
  'use strict';
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const radians = Math.PI / 180;
  let enabled = false, status = 'off', steer = 0, generation = 0;
  let sample = null, neutral = null, lastTime = null, waitingTimer = null, pending = null;
  let listeners = [], published = '';
  const supported = () => window.isSecureContext !== false && typeof window.DeviceOrientationEvent !== 'undefined';
  const getState = () => ({ supported: supported(), enabled, status, steer });
  function publish() {
    const detail = getState(), key = JSON.stringify(detail);
    if (key === published) return;
    published = key;
    window.dispatchEvent(new CustomEvent('apex:motion', { detail }));
  }
  function listen(target, name, callback) {
    if (!target?.addEventListener) return;
    target.addEventListener(name, callback);
    listeners.push(() => target.removeEventListener(name, callback));
  }
  function clearWait() {
    if (waitingTimer !== null) clearTimeout(waitingTimer);
    waitingTimer = null;
  }
  function stop(nextStatus) {
    generation++;
    clearWait();
    listeners.forEach(remove => remove());
    listeners = [];
    pending = null;
    enabled = false; status = nextStatus; steer = 0;
    sample = neutral = lastTime = null;
    publish();
  }
  function waitForSample() {
    clearWait();
    if (document.hidden) return;
    const token = generation;
    waitingTimer = setTimeout(() => {
      if (token === generation && enabled && status === 'waiting') stop('unavailable');
    }, 4000);
  }
  function resetSample() {
    if (!enabled) return;
    sample = neutral = lastTime = null;
    steer = 0; status = 'waiting';
    waitForSample();
    publish();
  }
  function recenter() {
    if (!enabled) return;
    neutral = sample;
    steer = 0;
    lastTime = null;
    publish();
  }
  function angle() {
    const value = window.screen?.orientation?.angle;
    return Number.isFinite(value) ? value : Number.isFinite(window.orientation) ? window.orientation : 0;
  }
  function orientation(event) {
    if (!enabled || document.hidden) return;
    if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) {
      if (status === 'ready') resetSample();
      return;
    }
    const beta = event.beta * radians, gamma = event.gamma * radians, screen = angle() * radians;
    // W3C Z-X'-Y'' orientation: world-up in device coordinates is
    // (-cos(beta)*sin(gamma), sin(beta), cos(beta)*cos(gamma)). Project
    // gravity onto screen-right; positive means the right edge drops.
    // Unlike raw Euler angles this remains continuous through their wrap.
    const right = Math.cos(beta) * Math.sin(gamma) * Math.cos(screen) + Math.sin(beta) * Math.sin(screen);
    sample = Math.asin(clamp(right, -1, 1)) / radians;
    const now = performance.now();
    if (neutral === null) neutral = sample;
    const delta = sample - neutral;
    const target = Math.sign(delta) * clamp((Math.abs(delta) - 3) / 25, 0, 1);
    const elapsed = lastTime === null ? 1 / 60 : clamp((now - lastTime) / 1000, 0, .25);
    steer += (target - steer) * (1 - Math.exp(-elapsed / .075));
    if (Math.abs(steer) < .001) steer = 0;
    lastTime = now;
    status = 'ready';
    clearWait();
    publish();
  }
  function activate(token) {
    if (token !== generation) return false;
    enabled = true; status = 'waiting';
    listen(window, 'deviceorientation', orientation);
    listen(window, 'orientationchange', resetSample);
    listen(window.screen?.orientation, 'change', resetSample);
    listen(window, 'blur', resetSample);
    listen(window, 'focus', resetSample);
    listen(document, 'visibilitychange', resetSample);
    waitForSample();
    publish();
    return true;
  }
  function enable() {
    if (enabled) return Promise.resolve(true);
    if (pending) return pending;
    if (!supported()) { stop('unavailable'); return Promise.resolve(false); }
    const token = ++generation;
    status = 'requesting'; steer = 0;
    publish();
    let permission;
    try {
      // Must run directly in the button's user gesture, before any await.
      permission = typeof window.DeviceOrientationEvent.requestPermission === 'function'
        ? window.DeviceOrientationEvent.requestPermission() : 'granted';
    } catch {
      if (token === generation) stop('error');
      return Promise.resolve(false);
    }
    pending = Promise.resolve(permission).then(result => {
      if (token !== generation) return false;
      pending = null;
      if (result !== 'granted') { stop('denied'); return false; }
      return activate(token);
    }, () => {
      if (token === generation) stop('error');
      return false;
    });
    return pending;
  }
  return { enable, disable: () => stop('off'), recenter, getState };
})();
