/* Direct riding gestures, confined to the canvas. No on-screen driving buttons. */
window.ApexTouch = (() => {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const playing = state => state?.mode === 'countdown' || state?.mode === 'racing';
  let instance = null;

  function init(surface, game) {
    if (!surface || !game?.setTouchInput || !game?.getState) return null;
    const contacts = new Map(), listeners = [];
    let state = game.getState(), primary = null, blocked = false, destroyed = false;
    let available = Boolean(window.navigator?.maxTouchPoints > 0 || window.matchMedia?.('(any-pointer: coarse)')?.matches);
    let output = { steer: 0, throttle: 0, brake: 0 };
    let reason = '', lastPublished = '', rect = surface.getBoundingClientRect();
    const originalTouchAction = surface.style.touchAction;
    const originalSelect = surface.style.userSelect;
    const listen = (target, name, callback, options) => {
      target.addEventListener(name, callback, options);
      listeners.push(() => target.removeEventListener(name, callback, options));
    };
    const eventTime = event => Number.isFinite(event.timeStamp) ? event.timeStamp : performance.now();
    const allowed = () => playing(state) && !state.menuOpen && !state.crash && !document.hidden;
    const bounds = () => { rect = surface.getBoundingClientRect(); return rect; };
    const travel = () => clamp(rect.width * .22, 64, 150);
    const threshold = () => clamp(rect.height * .10, 44, 70);
    const snapshot = () => ({ available, active: allowed() && !blocked && contacts.size > 0,
      pointers: contacts.size, ...output, primaryDown: primary !== null && contacts.has(primary), blocked, reason });
    function publish(force = false) {
      const detail = snapshot(), key = JSON.stringify(detail);
      if (force || key !== lastPublished) {
        lastPublished = key;
        window.dispatchEvent(new CustomEvent('apex:touch', { detail }));
      }
    }
    function apply() {
      const first = primary !== null ? contacts.get(primary) : null;
      let steer = 0, throttle = 0, brake = 0;
      if (allowed() && !blocked && contacts.size) {
        // A surviving secondary contact continues braking; it never becomes the throttle.
        brake = contacts.size > (first ? 1 : 0) ? 1 : 0;
        throttle = first && !brake ? 1 : 0;
        if (first) {
          const dx = first.x - first.startX, dead = clamp(rect.width * .018, 7, 12);
          steer = Math.sign(dx) * clamp((Math.abs(dx) - dead) / (travel() - dead), 0, 1);
        }
      }
      output = { steer, throttle, brake };
      game.setTouchInput(output);
      publish();
    }
    function reset(why = 'reset') {
      if (destroyed) return;
      blocked = contacts.size > 0;
      primary = null;
      reason = why;
      for (const contact of contacts.values()) contact.history = [];
      apply();
    }
    function updateSurface() {
      surface.style.touchAction = playing(state) ? 'none' : originalTouchAction;
      surface.style.userSelect = playing(state) ? 'none' : originalSelect;
    }
    function update(event) {
      const previous = state;
      state = event?.detail || game.getState();
      updateSurface();
      if ((!playing(state) || state.crash || state.menuOpen) && (playing(previous) && !previous.crash && !previous.menuOpen || contacts.size && !blocked)) {
        reset(state.menuOpen ? 'menu' : state.crash ? 'crash' : state.mode);
      } else publish();
    }
    function accept(event) {
      if (destroyed || event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      available = true;
      state = game.getState();
      updateSurface();
      if (!playing(state) || state.menuOpen || document.hidden || contacts.has(event.pointerId)) { publish(); return; }
      event.preventDefault();
      bounds();
      // If a browser never delivered the old touch-up after leaving the app,
      // a new primary pointer is proof that its old same-type stream ended.
      if (!state.crash && blocked && event.isPrimary === true && [...contacts.values()].every(c => c.type === event.pointerType)) {
        contacts.clear();
        primary = null;
        blocked = false;
      }
      const now = eventTime(event);
      contacts.set(event.pointerId, {
        type: event.pointerType, x: event.clientX, y: event.clientY,
        startX: event.clientX, startY: event.clientY,
        history: [{ x: event.clientX, y: event.clientY, t: now }],
        shiftReady: true, shiftOriginY: event.clientY, shiftAt: -Infinity
      });
      if (state.crash) { blocked = true; primary = null; reason = 'crash'; }
      if (contacts.size === 1 && !blocked) { primary = event.pointerId; reason = ''; }
      try { surface.setPointerCapture(event.pointerId); } catch { /* Window terminal listeners still release it. */ }
      apply();
    }
    function shift(contact, event, previousX, previousY) {
      const now = eventTime(event), amount = threshold();
      if (!contact.shiftReady) {
        if (now - contact.shiftAt >= 450 && Math.abs(contact.y - contact.shiftOriginY) < amount * .28) {
          contact.shiftReady = true;
          contact.history = [{ x: contact.x, y: contact.y, t: now }];
        }
        return;
      }
      const history = contact.history;
      if (!history.length || now - history[history.length - 1].t > 220) {
        history.length = 0;
        history.push({ x: previousX, y: previousY, t: now - 16 });
      }
      history.push({ x: contact.x, y: contact.y, t: now });
      while (history.length > 2 && now - history[0].t > 220) history.shift();
      if (history.length > 32) history.splice(0, history.length - 32);
      const origin = history[0], dx = contact.x - origin.x, dy = contact.y - origin.y;
      const elapsed = Math.max(1, now - origin.t);
      if (state.transmission === 'manual' && state.mode === 'racing' &&
          Math.abs(dy) >= amount && Math.abs(dy) >= Math.abs(dx) * 1.8 && Math.abs(dy) / elapsed >= .28) {
        // Consume refused attempts too. A held stroke cannot queue a later gear change.
        contact.shiftReady = false;
        contact.shiftAt = now;
        contact.shiftOriginY = origin.y;
        game.shiftGear(dy < 0 ? 1 : -1);
      }
    }
    function move(event) {
      const contact = contacts.get(event.pointerId);
      if (!contact || destroyed) return;
      event.preventDefault();
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      const oldX = contact.x, oldY = contact.y;
      contact.x = event.clientX; contact.y = event.clientY;
      state = game.getState();
      if (!allowed()) { reset(state.menuOpen ? 'menu' : state.crash ? 'crash' : state.mode); return; }
      if (!blocked && event.pointerId === primary) shift(contact, event, oldX, oldY);
      apply();
    }
    function end(event) {
      if (!contacts.has(event.pointerId) || destroyed) return;
      event.preventDefault();
      contacts.delete(event.pointerId);
      try { if (surface.hasPointerCapture?.(event.pointerId)) surface.releasePointerCapture(event.pointerId); } catch {}
      if (!contacts.size) { primary = null; blocked = false; reason = ''; }
      apply();
    }
    function cancel(event) {
      if (!contacts.has(event.pointerId) || destroyed) return;
      contacts.delete(event.pointerId);
      reset('cancel');
    }
    function lost(event) {
      if (!contacts.has(event.pointerId) || destroyed) return;
      // Capture can be lost before physical release. Quarantine this whole cohort.
      reset('capture');
    }
    function viewport() {
      if (destroyed) return;
      const previous = rect, next = bounds();
      if (Math.abs(next.width - previous.width) < .5 && Math.abs(next.height - previous.height) < .5 &&
          Math.abs(next.left - previous.left) < .5 && Math.abs(next.top - previous.top) < .5) return;
      const riding = state.mode === 'racing' && contacts.size > 0;
      reset('resize');
      if (riding) game.togglePause?.();
    }
    function orientation() {
      const riding = state.mode === 'racing' && contacts.size > 0;
      reset('orientation');
      bounds();
      if (riding) game.togglePause?.();
    }
    function draw(ctx, w, h) {
      if (!playing(state) || state.menuOpen || !contacts.size) return;
      const r = rect, sx = w / Math.max(1, r.width), sy = h / Math.max(1, r.height);
      ctx.save();
      for (const [id, contact] of contacts) {
        const x = (contact.x - r.left) * sx, y = (contact.y - r.top) * sy;
        const isBrake = id !== primary || output.brake > .5;
        ctx.strokeStyle = blocked ? 'rgba(234,236,225,.22)' : isBrake ? 'rgba(255,176,106,.75)' : 'rgba(230,245,227,.62)';
        ctx.fillStyle = blocked ? 'rgba(234,236,225,.03)' : isBrake ? 'rgba(255,176,106,.08)' : 'rgba(230,245,227,.05)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        if (id === primary && !blocked) {
          const origin = (contact.startX - r.left) * sx;
          ctx.globalAlpha = .6;
          ctx.beginPath(); ctx.moveTo(origin - 4, y + 34); ctx.lineTo(origin + 4, y + 34); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(origin, y + 34); ctx.lineTo(origin + output.steer * travel() * sx, y + 34); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    }
    listen(surface, 'pointerdown', accept, { passive: false });
    listen(window, 'pointermove', move, { passive: false });
    listen(window, 'pointerup', end, { passive: false });
    listen(window, 'pointercancel', cancel, { passive: false });
    listen(surface, 'lostpointercapture', lost);
    listen(window, 'apex:update', update);
    listen(window, 'apex:input-reset', event => {
      state = game.getState();
      updateSurface();
      reset(event.detail?.reason || 'reset');
    });
    listen(window, 'blur', () => reset('focus'));
    listen(document, 'visibilitychange', () => { if (document.hidden) reset('hidden'); });
    listen(window, 'resize', viewport);
    listen(window, 'orientationchange', orientation);
    if (window.screen?.orientation?.addEventListener) listen(window.screen.orientation, 'change', orientation);
    let observer;
    if (window.ResizeObserver) { observer = new window.ResizeObserver(viewport); observer.observe(surface); }
    updateSurface();
    publish(true);
    return {
      reset, draw, getState: snapshot,
      destroy() {
        if (destroyed) return;
        reset('destroy');
        destroyed = true;
        listeners.forEach(remove => remove());
        observer?.disconnect();
        for (const id of contacts.keys()) { try { surface.releasePointerCapture(id); } catch {} }
        contacts.clear(); primary = null; blocked = false;
        surface.style.touchAction = originalTouchAction;
        surface.style.userSelect = originalSelect;
      }
    };
  }
  function boot() {
    if (!instance) instance = init(document.getElementById('race-canvas'), window.ApexGame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  return { init, draw: (ctx, w, h) => instance?.draw(ctx, w, h), getState: () => instance?.getState() ?? null };
})();
