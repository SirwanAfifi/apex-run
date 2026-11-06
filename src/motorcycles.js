/* Fictional garage catalogue. Appearance and ride profiles share stable model IDs. */
window.ApexMotorcycles = (() => {
  'use strict';
  const freeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  const models = freeze([
    {
      id: 'r600', name: 'Apex R600', subtitle: 'Agile supersport',
      description: 'Light steering, a soaring four-cylinder engine and precise corner entries. The original Apex ride.',
      stats: [{label: 'Engine', value: '600 cc · inline four'}, {label: 'Redline', value: '14,100 rpm'}, {label: 'Character', value: 'Agile & precise'}],
      physics: {
        redline: 14100, idleRpm: 1300, launchRpm: 3700,
        gearing: [97,132,162,191,222,254], wheelThrust: [10.5,8.1,7,5.75,4.95,4.25],
        upshiftRpm: 13250, downshiftRpm: 6600, brakingDownshiftRpm: 7200,
        torqueBase: .56, torquePeak: .44, engineBraking: 1, limiterRange: 440,
        agility: 1, stability: 2.2, brakeForce: 12.2, aeroDrag: .00072,
        loadTransfer: .375, springRate: 185, springDamping: 16,
        firing: [0,270,450,540], exhaustTone: 1, intakeTone: 1, exhaustGain: 1, intakeGain: 1
      }
    },
    {
      id: 'rr1000', name: 'Apex RR1000', subtitle: 'Open-class superbike',
      description: 'Longer gearing and stronger high-speed drive. Deliberate steering rewards an early, measured turn-in.',
      stats: [{label: 'Engine', value: '1,000 cc · inline four'}, {label: 'Redline', value: '13,800 rpm'}, {label: 'Character', value: 'Fast & committed'}],
      physics: {
        redline: 13800, idleRpm: 1200, launchRpm: 3500,
        gearing: [117,156,192,225,259,292], wheelThrust: [13.3,10.8,9.5,8.1,6.9,5.9],
        upshiftRpm: 12960, downshiftRpm: 6460, brakingDownshiftRpm: 7050,
        torqueBase: .59, torquePeak: .41, engineBraking: 1.09, limiterRange: 430,
        agility: .89, stability: 2.35, brakeForce: 12.7, aeroDrag: .00070,
        loadTransfer: .36, springRate: 200, springDamping: 18,
        firing: [0,180,360,540], exhaustTone: .91, intakeTone: .96, exhaustGain: 1.12, intakeGain: .95
      }
    },
    {
      id: 'st900', name: 'Apex ST900', subtitle: 'Sport endurance',
      description: 'A broad three-cylinder torque band, settled chassis and shorter gearing. Strong exits without chasing the redline.',
      stats: [{label: 'Engine', value: '900 cc · inline triple'}, {label: 'Redline', value: '10,500 rpm'}, {label: 'Character', value: 'Torquey & settled'}],
      physics: {
        redline: 10500, idleRpm: 1150, launchRpm: 2700,
        gearing: [78,108,137,164,192,218], wheelThrust: [11.6,9.15,7.25,5.8,4.8,3.95],
        upshiftRpm: 9850, downshiftRpm: 4915, brakingDownshiftRpm: 5360,
        torqueBase: .70, torquePeak: .30, engineBraking: 1.16, limiterRange: 330,
        agility: .82, stability: 2.65, brakeForce: 11.6, aeroDrag: .00083,
        loadTransfer: .34, springRate: 155, springDamping: 17,
        firing: [0,240,480], exhaustTone: .79, intakeTone: .83, exhaustGain: 1.07, intakeGain: .84
      }
    }
  ]);
  const paints = freeze([
    {id:'vermilion',label:'Vermilion',color:'#e64f3d'}, {id:'pearl',label:'Pearl',color:'#e7e4d9'},
    {id:'graphite',label:'Graphite',color:'#343b42'}, {id:'cobalt',label:'Cobalt',color:'#315ec9'},
    {id:'emerald',label:'Emerald',color:'#16836e'}
  ]);
  const accents = freeze([{id:'ivory',label:'Ivory',color:'#e9e2d2'},{id:'black',label:'Black',color:'#171b20'},{id:'copper',label:'Copper',color:'#bc7952'}]);
  const wheels = freeze([{id:'graphite',label:'Graphite',color:'#3b4148'},{id:'silver',label:'Silver',color:'#aeb8bc'},{id:'gold',label:'Gold',color:'#b99a52'}]);
  const liveries = freeze([{id:'solid',label:'Solid'},{id:'stripes',label:'Stripes'},{id:'race',label:'Race'}]);
  const palettes = freeze({paint:Object.fromEntries(paints.map(x=>[x.id,x.color])),accent:Object.fromEntries(accents.map(x=>[x.id,x.color])),wheels:Object.fromEntries(wheels.map(x=>[x.id,x.color]))});
  const getModel = id => models.find(model => model.id === id) || models[0];
  function defaultConfig(model = 'r600') {
    return {model:getModel(model).id,paint:'vermilion',accent:'ivory',wheels:'graphite',livery:'solid',number:27};
  }
  function normalize(config) {
    const input = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
    const result = defaultConfig(input.model);
    for (const [field,options] of [['paint',paints],['accent',accents],['wheels',wheels],['livery',liveries]]) {
      if (options.some(option => option.id === input[field])) result[field] = input[field];
    }
    // Numeric form values are accepted; empty, nonnumeric and nonfinite values
    // return to the default. Plate numbers always remain integer 1–99.
    const number = typeof input.number === 'number' || typeof input.number === 'string' && input.number.trim() ? Number(input.number) : NaN;
    if (Number.isFinite(number)) result.number = Math.max(1,Math.min(99,Math.round(number)));
    return result;
  }
  const key = config => { const c=normalize(config); return [c.model,c.paint,c.accent,c.wheels,c.livery,c.number].join(':'); };
  return freeze({models,paints,accents,wheels,liveries,palettes,defaultConfig,normalize,getModel,key});
})();
