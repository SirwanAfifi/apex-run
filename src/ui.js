(() => {
  'use strict';
  const game = window.ApexGame;
  const motorcycles = window.ApexMotorcycles;
  const nodes = Object.fromEntries(Array.from(document.querySelectorAll('[id]'), node => [node.id, node]));
  const frame = nodes['game-frame'], menu = nodes['game-menu'];
  const action = nodes['action-btn'];
  const sectors = Array.from(nodes['split-grid'].children);
  const revBars = Array.from({length:14}, () => nodes.tach.appendChild(document.createElement('i')));
  const setupButtons = Array.from(document.querySelectorAll('[data-course], [data-weather], [data-transmission]'));
  const navButtons = Array.from(nodes['menu-nav'].querySelectorAll('[data-panel]'));
  const targets = {rain:[100,118,145],clear:[90,105,125]};
  const events = {
    sierra:{name:'Sierra Pass',stage:'01',region:'SIERRA NEVADA, CA',race:false,
      description:'Climb through the pines, trace the granite ridges, and chase your perfect run.',
      accessible:'A solo motorcycle time trial in the Sierra Nevada.'},
    coast:{name:'Cape Meridian',stage:'02',region:'PACIFIC COAST, CA',race:true,
      description:'Pacific cliffs. An inlet crossing. One final run to the lighthouse.',
      accessible:'Race three motorcycles on the Pacific coast.',
      tip:'Start fourth. Set up your pass before the inlet bridge and race to the lighthouse.'},
    london:{name:'A3 London',stage:'03',region:'SOUTH WEST LONDON, UK',race:true,
      description:'Kingston Vale to Wandsworth. Wooded commons give way to brick streets on a condensed A3 race stage.',
      accessible:'Race three motorcycles on a condensed closed-course A3 route through south west London.',
      tip:'Read the long bends through the commons, then settle the bike before the tighter Wandsworth approach.'}
  };
  const ordinal = ['','1st','2nd','3rd','4th'];
  const coarsePointer = matchMedia('(any-pointer: coarse)');
  let touchCapable = coarsePointer.matches || navigator.maxTouchPoints > 0;
  let gestureSeen = false, touchBlocked = false;
  let motionState = window.ApexMotion?.getState() || {supported:false, enabled:false, status:'unavailable'};
  let previousMode, previousSetup, menuOpen, activePanel = 'home';
  let previousSector = 1, splitNotice = null, lastPlace = '', placeUntil = 0;
  let state = game.getState();
  let garageView = 'studio', garageKey = '', garageDrawQueued = false;
  const garageControls = [];
  const garageViews = Array.from(document.querySelectorAll('[data-garage-view]'));
  let wasNativeFull = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  try { gestureSeen = sessionStorage.getItem('apex-touch-learned') === '1'; } catch {}
  document.body.classList.toggle('touch-capable', touchCapable);
  nodes['race-canvas'].tabIndex = -1;
  const pad = (n, length=2) => String(n).padStart(length, '0');
  function time(seconds) {
    if (!Number.isFinite(seconds)) return '--:--.---';
    const ms = Math.floor(seconds * 1000);
    return pad(Math.floor(ms/60000)) + ':' + pad(Math.floor(ms/1000)%60) + '.' + pad(ms%1000,3);
  }
  function content(node, value) {
    value = String(value);
    if (node.textContent !== value) node.textContent = value;
  }
  function showPanel(name, focus=false) {
    activePanel = name;
    menu.classList.toggle('garage-active', name === 'garage');
    nodes['garage-launch'].hidden = name !== 'garage';
    navButtons.forEach(button => {
      const selected = button.dataset.panel === name;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      nodes['panel-' + button.dataset.panel].hidden = !selected;
    });
    nodes['menu-content'].scrollTop = 0;
    if (focus) nodes['nav-' + name].focus({preventScroll:true});
    if (name === 'garage') queueGarageDraw();
  }
  function setMenu(open) {
    if (menuOpen === open) return;
    menuOpen = open;
    menu.hidden = !open;
    frame.classList.toggle('menu-open', open);
    nodes.screen.inert = open;
    nodes['menu-btn'].hidden = open;
    nodes['riding-hud'].hidden = open;
    game.setMenuOpen(open);
    requestAnimationFrame(() => {
      if (menuOpen !== open) return;
      if (open) (activePanel === 'home' ? action : nodes['nav-' + activePanel]).focus({preventScroll:true});
      else nodes['race-canvas'].focus({preventScroll:true});
    });
  }
  function syncMotionSettings() {
    nodes['tilt-settings'].hidden = !touchCapable;
    nodes['tilt-btn'].disabled = !motionState.supported || motionState.status === 'requesting';
    nodes['tilt-btn'].setAttribute('aria-pressed', String(motionState.enabled));
    content(nodes['tilt-btn'].querySelector('b'), motionState.status === 'requesting' ? 'Allow access…' : motionState.enabled ? 'On' : 'Off');
    nodes['tilt-recenter'].disabled = motionState.status !== 'ready';
    const notes = {
      off:'Enable tilt steering, then allow motion access when asked. Touch steering stays available when tilt is off.',
      requesting:'Allow motion access to steer by tilting your phone.',
      waiting:'Hold your phone comfortably while the motion sensor starts. Steering stays centered until it is ready.',
      ready:'Tilt left or right to lean. Hold one finger to accelerate; a second finger brakes. Each new touch centers steering at your current phone angle.',
      denied:'Motion access was denied. Drag to steer, or allow motion access for this site in your browser and try again.',
      unavailable:window.isSecureContext === false ? 'Tilt steering needs a secure (HTTPS) connection. You can still drag to steer.' : 'Motion sensing is unavailable on this device or browser. Drag to steer.',
      error:'Motion access could not be enabled. Drag to steer, or try again.'
    };
    content(nodes['tilt-note'], notes[motionState.supported ? motionState.status : 'unavailable'] || notes.off);
  }
  function syncGestureGuide(s) {
    const playable = s.mode === 'countdown' || s.mode === 'racing';
    const showing = touchCapable && playable && !s.crash && (s.mode === 'countdown' || s.time < 8);
    nodes['gesture-guide'].hidden = !showing;
    nodes['gesture-guide'].classList.toggle('learned', gestureSeen);
    nodes['gesture-reset'].hidden = !(touchCapable && playable && !s.crash && touchBlocked);
    nodes['gesture-manual'].hidden = s.transmission !== 'manual';
    nodes['touch-manual-help'].hidden = s.transmission !== 'manual';
    nodes['touch-riding-help'].hidden = !touchCapable;
    nodes['keyboard-controls'].hidden = touchCapable;
    content(nodes['gesture-steering'], motionState.enabled ? 'HOLD TO RIDE · TILT TO LEAN' : 'HOLD TO RIDE · DRAG TO LEAN');
    content(nodes['touch-steering-help'], motionState.enabled
      ? 'Hold your phone comfortably, then place one finger on the view to accelerate. Tilt the phone left or right to lean; each new touch sets your center.'
      : 'Place a finger anywhere on the view. Drag it left or right to lean. For tilt steering, enable it in Settings and allow motion access.');
  }
  function enableTouch() {
    if (touchCapable) return;
    touchCapable = true;
    document.body.classList.add('touch-capable');
    previousSetup = undefined;
    syncMotionSettings();
    update(state);
  }
  function showOrder(list, entries, stage, riders=[]) {
    entries.forEach((entry,index) => {
      let row = list.children[index];
      if (!row) {
        row = document.createElement('li');
        row.innerHTML = '<b class="rank"></b><i class="livery"></i><span class="race-name"></span><small class="racer-gap"></small>';
        list.appendChild(row);
      }
      row.classList.toggle('own-bike', entry.isPlayer);
      const incident = stage === 'race' && riders.find(r => (r.id || 'player') === entry.id)?.crash;
      row.classList.toggle('rider-down', Boolean(incident));
      row.style.setProperty('--rider-color', entry.color);
      content(row.children[0], 'P' + entry.position);
      content(row.children[2], entry.name);
      let label;
      if (stage === 'grid') label = entry.isPlayer ? 'YOUR BIKE' : '#' + entry.number;
      else if (stage === 'finish') label = entry.finishTime == null ? 'On course' : time(entry.finishTime);
      else if (incident) label = incident.phase === 'recover' ? 'REMOUNTING' : 'BIKE DOWN';
      else if (!index) label = 'LEADER';
      else label = entry.gapSeconds == null ? '+' + Math.round(entry.gapDistance) + ' m' : '+' + entry.gapSeconds.toFixed(2) + ' s';
      content(row.children[3],label);
    });
    while (list.children.length > entries.length) list.lastElementChild.remove();
  }
  function buildGarage() {
    function addOptions(host, field, options, kind) {
      options.forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.motorcycleField = field;
        button.dataset.motorcycleValue = option.id;
        button.setAttribute('aria-pressed','false');
        button.setAttribute('aria-label',kind === 'model' ? option.name + ', ' + option.subtitle : field + ': ' + option.label);
        button.title = kind === 'model' ? option.name : option.label;
        if (kind === 'model') {
          const name = document.createElement('b'), subtitle = document.createElement('span');
          name.textContent = option.name.replace(/^Apex /,'');
          subtitle.textContent = option.subtitle;
          button.append(name,subtitle);
        } else if (option.color) {
          button.style.setProperty('--swatch',option.color);
          const swatch = document.createElement('i');
          swatch.setAttribute('aria-hidden','true');
          button.append(swatch);
        } else button.textContent = option.label;
        button.addEventListener('click',() => game.setMotorcycle({[field]:option.id}));
        nodes[host].append(button);
        garageControls.push(button);
      });
    }
    addOptions('garage-models','model',motorcycles.models,'model');
    addOptions('garage-paints','paint',motorcycles.paints);
    addOptions('garage-accents','accent',motorcycles.accents);
    addOptions('garage-wheels','wheels',motorcycles.wheels);
    addOptions('garage-liveries','livery',motorcycles.liveries);
  }
  function queueGarageDraw() {
    if (garageDrawQueued) return;
    garageDrawQueued = true;
    requestAnimationFrame(() => {
      garageDrawQueued = false;
      if (!menuOpen || activePanel !== 'garage') return;
      const canvas = nodes['garage-canvas'];
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1,2,1600/rect.width);
      const width = Math.round(rect.width*ratio), height = Math.round(rect.height*ratio);
      if (canvas.width !== width || canvas.height !== height) {canvas.width=width;canvas.height=height;}
      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio,0,0,ratio,0,0);
      ctx.clearRect(0,0,rect.width,rect.height);
      const draw = window.ApexBike?.drawGarage;
      nodes['garage-preview-status'].hidden = Boolean(draw);
      if (draw) draw(ctx,rect.width,rect.height,state.motorcycle,garageView);
    });
  }
  function updateGarage(s) {
    const configuration = s.motorcycle;
    const editable = s.mode === 'ready' || s.mode === 'finished';
    const key = motorcycles.key(configuration) + '/' + editable;
    nodes['garage-lock'].hidden = editable;
    content(nodes['garage-start'].querySelector('span'),editable ? 'START RIDE' : 'RESUME RIDE');
    content(nodes['garage-ride-note'],editable ? 'Your bike. Your line.' : 'Your current motorcycle stays with this ride.');
    if (key === garageKey) return;
    garageKey = key;
    const model = motorcycles.getModel(configuration.model);
    const paint = motorcycles.paints.find(option => option.id === configuration.paint);
    const accent = motorcycles.accents.find(option => option.id === configuration.accent);
    const wheels = motorcycles.wheels.find(option => option.id === configuration.wheels);
    const livery = motorcycles.liveries.find(option => option.id === configuration.livery);
    content(nodes['garage-model-name'],model.name.toUpperCase());
    content(nodes['garage-model-class'],model.subtitle.toUpperCase());
    content(nodes['garage-description'],model.description);
    content(nodes['garage-mobile-description'],model.description);
    content(nodes['home-bike-name'],model.name.toUpperCase());
    content(nodes['home-bike-finish'],paint.label + ' / ' + livery.label + (configuration.livery === 'race' ? ' / #' + configuration.number : ''));
    nodes['home-motorcycle'].setAttribute('aria-label','Open garage. Selected motorcycle: ' + model.name + ', ' + paint.label + ', ' + livery.label + '.');
    content(nodes['garage-paint-label'],paint.label);
    content(nodes['garage-accent-label'],accent.label);
    content(nodes['garage-wheels-label'],wheels.label);
    content(nodes['garage-ride-summary'],model.name.toUpperCase() + ' / ' + paint.label.toUpperCase());
    nodes['garage-canvas'].setAttribute('aria-label',model.name + ' in ' + paint.label + ' with ' + accent.label + ' accents, ' + wheels.label + ' wheels and ' + livery.label + ' livery. ' + garageView + ' preview.');
    ['garage-stats','garage-mobile-stats'].forEach(id => nodes[id].replaceChildren(...model.stats.map(stat => {
      const item = document.createElement('div'), term = document.createElement('dt'), value = document.createElement('dd');
      term.textContent = stat.label.toUpperCase();value.textContent = stat.value;item.append(term,value);return item;
    })));
    garageControls.forEach(button => {
      button.disabled = !editable;
      button.setAttribute('aria-pressed',String(configuration[button.dataset.motorcycleField] === button.dataset.motorcycleValue));
    });
    nodes['garage-number'].disabled = !editable;
    // Keep a focused draft intact while a live update redraws the preview.
    if (document.activeElement !== nodes['garage-number']) nodes['garage-number'].value = configuration.number;
    nodes['garage-number-down'].disabled = !editable || configuration.number <= 1;
    nodes['garage-number-up'].disabled = !editable || configuration.number >= 99;
    queueGarageDraw();
  }
  function update(s) {
    state = s;
    const ready = s.mode === 'ready', racing = s.mode === 'racing', paused = s.mode === 'paused';
    const finished = s.mode === 'finished', counting = s.mode === 'countdown';
    const weather = s.weather === 'rain' ? 'rain' : 'clear';
    const manual = s.transmission === 'manual', event = events[s.course], raceMode = event.race;
    const eventName = event.name, distanceLabel = (s.length/1000).toFixed(2) + ' KM';
    const [gold,silver,bronze] = targets[weather];
    const crash = s.crash;
    if (previousMode !== s.mode) {
      if (paused || finished || counting) showPanel('home');
      previousMode = s.mode;
    }
    setMenu(ready || paused || finished);
    syncGestureGuide(s);
    updateGarage(s);
    frame.dataset.mode = s.mode;
    content(nodes['menu-state'], paused ? 'RIDE PAUSED' : finished ? 'THE FINISH LINE' : 'THE OPEN ROAD AWAITS');
    content(nodes['nav-home'], finished ? 'RESULTS' : 'RIDE');
    nodes['menu-close'].hidden = !paused;
    nodes['setup-lock'].hidden = !paused;
    nodes['restart-btn'].hidden = !paused;
    nodes['resume-note'].hidden = !paused;
    nodes['ride-home'].hidden = finished;
    nodes['finish-home'].hidden = !finished;
    content(action.querySelector('span'), paused ? 'RESUME RIDE' : finished ? 'RIDE AGAIN' : 'RIDE');
    content(nodes['change-event-btn'], paused ? 'Ride settings →' : 'Change event →');
    content(nodes['resume-note'], touchCapable ? 'Resume, then begin a fresh touch to ride.' : 'Your ride is paused. Pick up where you left off.');
    const setup = [s.course,weather,s.transmission,ready || finished,touchCapable,motionState.enabled].join('/');
    if (setup !== previousSetup) {
      previousSetup = setup;
      setupButtons.forEach(button => {
        button.disabled = !(ready || finished);
        button.setAttribute('aria-pressed', String(button.dataset.course === s.course || button.dataset.weather === weather || button.dataset.transmission === s.transmission));
      });
      document.title = eventName + ' · Apex Run';
      content(nodes['event-title'], eventName.toUpperCase());
      content(nodes['event-region'], event.region);
      content(nodes['event-number'], 'STAGE ' + event.stage);
      content(nodes['event-kind'], raceMode ? 'ROAD RACE' : 'TIME TRIAL');
      content(nodes['event-description'], event.description);
      content(nodes['session-distance'], distanceLabel);
      content(nodes['session-weather'], weather === 'rain' ? 'RAIN' : 'CLEAR');
      content(nodes['session-gearbox'], manual ? 'MANUAL' : 'AUTO');
      content(nodes['menu-footer-course'], eventName.toUpperCase());
      content(nodes['menu-footer-tip'], touchCapable ? motionState.enabled ? 'HOLD TO RIDE · TILT TO LEAN' : 'HOLD TO RIDE · DRAG TO LEAN' : 'HEADPHONES RECOMMENDED');
      frame.setAttribute('aria-label', eventName + (raceMode ? ' motorcycle race' : ' time trial'));
      nodes['race-canvas'].setAttribute('aria-label', (event.accessible + ' ') + (touchCapable ? 'Hold one finger to accelerate and ' + (motionState.enabled ? 'tilt your phone' : 'drag sideways') + ' to lean. Hold a second finger to brake. Lift to coast.' : 'Use W to accelerate and A or D to lean. Open the game menu with P or Escape.'));
      nodes['race-canvas'].setAttribute('aria-describedby', touchCapable ? 'touch-riding-help' : 'keyboard-controls');
      nodes['race-board'].hidden = !raceMode;
      nodes.medals.hidden = raceMode;
      content(nodes['right-hud-label'], raceMode ? 'POSITION' : 'SECTOR');
      content(nodes['right-hud-total'], raceMode ? ' / 04' : ' / 03');
      nodes['race-gap'].hidden = !raceMode;
      const shortTime = seconds => Math.floor(seconds/60) + ':' + pad(seconds%60);
      ['gold-pace','silver-pace','bronze-pace'].forEach((id,i) => content(nodes[id],shortTime(targets[weather][i])));
      nodes['shift-help'].hidden = !manual;
      content(nodes['ride-tip'], raceMode && weather === 'clear' ? event.tip : weather === 'rain' ? 'Brake while upright. Ease onto the throttle as you lift the bike out of a wet corner.' : 'Brake before the bend. Lean in, then roll on the throttle as the road opens.');
    }
    window.ApexTelemetry.update(s);
    content(nodes.speed, pad(Math.round(s.speed),3));
    content(nodes.timer,time(s.time));
    content(nodes.gear,ready || counting || crash ? 'N' : s.gear);
    content(nodes['sector-num'], pad(raceMode ? s.racePosition : s.sector));
    content(nodes['record-label'], s.best == null ? (raceMode ? 'RACE DISTANCE' : 'GOLD TARGET') : (weather === 'rain' ? 'WET PERSONAL BEST' : 'DRY PERSONAL BEST'));
    content(nodes['best-val'], raceMode && s.best == null ? distanceLabel : time(s.best ?? gold));
    content(nodes['finish-crashes'], s.crashCount || 0);
    const place = window.ApexEnvironment?.zoneAt(s.course,s.distance);
    const placeKey = s.course + '/' + (place?.name || '');
    if (placeKey !== lastPlace || ready || counting) {
      lastPlace = placeKey; placeUntil = s.time + 4.5;
      content(nodes['place-name'],place?.name?.toUpperCase() || '');
      content(nodes['place-detail'],place?.detail || '');
    }
    nodes['place-cue'].hidden = !place || menuOpen || Boolean(crash) || (!counting && s.time > placeUntil);
    if (raceMode) {
      const phase = ready || counting ? 'grid' : finished ? 'finish' : 'race';
      content(nodes['order-title'], phase === 'grid' ? 'STARTING GRID' : phase === 'finish' ? 'AT YOUR FINISH' : 'RACE ORDER');
      showOrder(nodes['running-order'],s.classification,phase,[s,...s.rivals]);
      const rider = s.classification.find(r => r.isPlayer);
      const gap = rider.gapSeconds == null ? '+' + Math.round(rider.gapDistance) + ' m' : '+' + rider.gapSeconds.toFixed(2) + ' s';
      content(nodes['race-gap'], phase === 'grid' ? 'STARTING GRID' : s.racePosition === 1 ? 'RACE LEADER' : gap + ' TO P1');
    }
    sectors.forEach((col,i) => {
      col.classList.toggle('complete', s.splits[i] != null);
      col.classList.toggle('current', !finished && s.sector === i+1);
      content(col.querySelector('b'),time(s.splits[i]));
    });
    const revCount = Math.min(14,Math.round(s.rpm/(s.redline || 14100)*14));
    revBars.forEach((bar,i) => {bar.classList.toggle('on',i<revCount);bar.classList.toggle('hot',i>=10 && i<revCount);});
    nodes['progress-bar'].style.width = Math.max(0,Math.min(100,100*s.distance/s.length)) + '%';
    nodes.screen.classList.toggle('cockpit-view', s.camera === 'cockpit');
    content(nodes['camera-btn'].querySelector('b'), s.camera === 'cockpit' ? 'Cockpit' : 'Chase');
    nodes['camera-btn'].setAttribute('aria-label', 'Camera: ' + s.camera + '. Switch to ' + (s.camera === 'cockpit' ? 'chase' : 'cockpit') + '.');
    content(nodes['sound-btn'].querySelector('b'), s.sound ? 'On' : 'Off');
    nodes['sound-btn'].querySelector('use').setAttribute('href',s.sound ? '#sound-on' : '#sound-off');
    nodes['sound-btn'].setAttribute('aria-pressed',String(s.sound));
    nodes['sound-btn'].setAttribute('aria-label',s.sound ? 'Mute game sound' : 'Enable game sound');
    nodes['count-wrap'].hidden = !counting;
    if (counting) content(nodes['count-val'],s.countdown);
    if (ready || counting) splitNotice = null;
    if (racing && s.sector > previousSector) {
      const i = s.sector-2;
      const delta = s.bestSplits[i] == null ? '' : '  (' + (s.splits[i] < s.bestSplits[i] ? '−' : '+') + Math.abs(s.splits[i]-s.bestSplits[i]).toFixed(2) + ')';
      splitNotice = {end:s.time+3.2,text:'S'+(i+1)+'  '+time(s.splits[i])+delta};
    }
    previousSector = s.sector;
    const contact = s.impact?.type === 'rider' && s.impact.age < .85 && s.impact.severity > .12;
    const alert = racing && !crash && (s.barrierContact ? 'GUARDRAIL SCRAPE' : contact ? 'RIDER CONTACT' : splitNotice && s.time < splitNotice.end ? splitNotice.text : s.offroad ? 'OFF ROAD · LOW GRIP' : s.time < 1.25 ? 'GO!' : s.speed < 1 ? (touchCapable ? (touchBlocked ? 'LIFT FINGERS TO RESET' : 'TOUCH & HOLD TO RIDE') : 'HOLD W OR ↑ TO RIDE') : '');
    nodes['race-alert'].hidden = !alert;
    if (alert) content(nodes['race-alert'],alert);
    nodes['incident-panel'].hidden = !(racing && crash);
    if (crash) {
      content(nodes['incident-title'],crash.phase === 'recover' ? 'REMOUNTING' : crash.phase === 'slide' ? 'SLIDING' : 'BIKE DOWN');
      content(nodes['incident-detail'],crash.phase === 'recover' ? 'Back on the bike in ' + Math.max(0,crash.recoveryLeft).toFixed(1) + ' s' : 'Race clock continues');
      nodes['incident-progress'].style.width = Math.max(0,Math.min(1,crash.progress))*100 + '%';
    }
    nodes['finish-order'].hidden = !(finished && raceMode);
    if (finished) {
      if (raceMode) showOrder(nodes['finish-order'],s.classification,'finish');
      content(nodes['dialog-kicker'],s.isRecord ? 'NEW PERSONAL BEST' : eventName.toUpperCase());
      const medal = s.time <= gold ? 'GOLD MEDAL' : s.time <= silver ? 'SILVER MEDAL' : s.time <= bronze ? 'BRONZE MEDAL' : 'RUN COMPLETE';
      content(nodes['dialog-title'],raceMode ? (s.racePosition === 1 ? 'RACE WON' : ordinal[s.racePosition].toUpperCase() + ' PLACE') : medal);
      content(nodes['dialog-info'],time(s.time));
    }
  }
  function nativeFull() {return Boolean(document.fullscreenElement || document.webkitFullscreenElement);}
  function syncFullscreen() {
    const full = nativeFull();
    nodes['full-btn'].setAttribute('aria-pressed',String(full));
    nodes['full-btn'].setAttribute('aria-label',full ? 'Exit fullscreen' : 'Enter fullscreen');
    content(nodes['full-btn'].querySelector('b'),full ? 'Exit' : 'Enter');
  }
  function requestFullscreen() {
    if (nativeFull()) return;
    const request = frame.requestFullscreen || frame.webkitRequestFullscreen;
    if (!request) {
      content(nodes['fullscreen-note'],'Fullscreen isn’t available in this browser. The game still fills the window.');
      return;
    }
    try {
      const pending = request.call(frame);
      pending?.catch(() => content(nodes['fullscreen-note'],'The game still fills the browser view. Fullscreen is optional.'));
    } catch {content(nodes['fullscreen-note'],'The game still fills the browser view. Fullscreen is optional.');}
  }
  function play() {
    requestFullscreen();
    game.start();
  }
  action.addEventListener('click',() => {
    if (state.mode === 'paused') play();
    else showPanel('garage',true);
  });
  nodes['home-motorcycle'].addEventListener('click',() => showPanel('garage',true));
  nodes['garage-start'].addEventListener('click',play);
  nodes['garage-end-ride'].addEventListener('click',() => {showPanel('garage');game.returnToGrid();nodes['nav-garage'].focus({preventScroll:true});});
  garageViews.forEach(button => button.addEventListener('click',() => {
    garageView = button.dataset.garageView;
    garageViews.forEach(view => view.setAttribute('aria-pressed',String(view === button)));
    garageKey = '';updateGarage(state);queueGarageDraw();
  }));
  const commitNumber = () => {
    const draft = nodes['garage-number'].value;
    if (draft.trim()) game.setMotorcycle({number:draft});
    nodes['garage-number'].value = state.motorcycle.number;
  };
  nodes['garage-number'].addEventListener('input',() => {
    const draft = nodes['garage-number'].value;
    const value = Number(draft);
    if (draft.trim() && Number.isInteger(value) && value >= 1 && value <= 99) game.setMotorcycle({number:value});
  });
  nodes['garage-number'].addEventListener('change',commitNumber);
  nodes['garage-number'].addEventListener('blur',commitNumber);
  nodes['garage-number'].addEventListener('keydown',e => {if (e.key === 'Enter') {e.preventDefault();commitNumber();nodes['garage-number'].blur();}});
  nodes['garage-number-down'].addEventListener('click',() => game.setMotorcycle({number:state.motorcycle.number-1}));
  nodes['garage-number-up'].addEventListener('click',() => game.setMotorcycle({number:state.motorcycle.number+1}));
  window.addEventListener('apex:asset',queueGarageDraw);
  window.addEventListener('resize',queueGarageDraw);
  if ('ResizeObserver' in window) new ResizeObserver(queueGarageDraw).observe(nodes['garage-canvas']);
  nodes['menu-close'].addEventListener('click',play);
  nodes['menu-btn'].addEventListener('click',() => game.togglePause());
  nodes['restart-btn'].addEventListener('click',() => {requestFullscreen();game.restart();});
  nodes['change-event-btn'].addEventListener('click',() => showPanel('settings',true));
  nodes['end-ride-btn'].addEventListener('click',() => {showPanel('settings');game.returnToGrid();nodes['nav-settings'].focus({preventScroll:true});});
  setupButtons.forEach(button => button.addEventListener('click',() => {
    if (button.dataset.course) game.setCourse(button.dataset.course);
    else if (button.dataset.weather) game.setWeather(button.dataset.weather);
    else game.setTransmission(button.dataset.transmission);
  }));
  navButtons.forEach(button => button.addEventListener('click',() => showPanel(button.dataset.panel)));
  nodes['menu-nav'].addEventListener('keydown',e => {
    const index = navButtons.indexOf(document.activeElement);
    if (index < 0 || !['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? navButtons.length-1 : (index+(e.key === 'ArrowRight' ? 1 : -1)+navButtons.length)%navButtons.length;
    showPanel(navButtons[next].dataset.panel,true);
  });
  nodes['camera-btn'].addEventListener('click',game.cycleCamera);
  nodes['sound-btn'].addEventListener('click',game.toggleSound);
  nodes['tilt-btn'].addEventListener('click',() => {
    // iPhone permission must be requested directly from this user gesture.
    if (motionState.enabled) window.ApexMotion.disable();
    else window.ApexMotion?.enable();
  });
  nodes['tilt-recenter'].addEventListener('click',() => window.ApexMotion?.recenter());
  nodes['full-btn'].addEventListener('click',() => {
    if (nativeFull()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try {exit?.call(document)?.catch?.(() => {});} catch {}
    } else requestFullscreen();
  });
  function fullscreenChanged() {
    const full = nativeFull();
    if (wasNativeFull && !full && ['racing','countdown'].includes(state.mode)) game.togglePause();
    wasNativeFull = full;
    syncFullscreen();
  }
  document.addEventListener('fullscreenchange',fullscreenChanged);
  document.addEventListener('webkitfullscreenchange',fullscreenChanged);
  window.addEventListener('apex:menu-toggle',e => {
    e.preventDefault();
    // Browser Escape owns exiting native fullscreen; that change pauses the ride.
    if (e.detail?.key === 'Escape' && nativeFull()) return;
    if (!menuOpen) game.togglePause();
    else if (activePanel !== 'home') showPanel('home',true);
    else if (state.mode === 'paused') game.start();
  });
  menu.addEventListener('keydown',e => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(menu.querySelectorAll('button:not(:disabled),input:not(:disabled),summary,[tabindex="0"]')).filter(node => node.tabIndex >= 0 && node.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (e.shiftKey && (document.activeElement === first || !menu.contains(document.activeElement))) {e.preventDefault();last?.focus();}
    else if (!e.shiftKey && (document.activeElement === last || !menu.contains(document.activeElement))) {e.preventDefault();first?.focus();}
  });
  frame.addEventListener('pointerdown',e => {if (e.pointerType === 'touch') enableTouch();},{passive:true,capture:true});
  coarsePointer.addEventListener?.('change',e => {if (e.matches) enableTouch();});
  window.addEventListener('apex:motion',e => {
    const previous = motionState;
    motionState = e.detail;
    if (previous.enabled === motionState.enabled && previous.status === motionState.status && previous.supported === motionState.supported) return;
    syncMotionSettings();
    if (previous.enabled !== motionState.enabled) gestureSeen = false;
    update(state);
  });
  window.addEventListener('apex:touch',e => {
    const input = e.detail || {};
    if (input.available || input.pointers > 0) enableTouch();
    touchBlocked = Boolean(input.blocked);
    if (input.active && input.primaryDown && !input.blocked && !gestureSeen) {
      gestureSeen = true;
      try {sessionStorage.setItem('apex-touch-learned','1');} catch {}
    }
    syncGestureGuide(state);
  });
  window.addEventListener('apex:update',e => update(e.detail));
  buildGarage();
  showPanel('home');
  syncFullscreen();
  syncMotionSettings();
  update(state);
})();
