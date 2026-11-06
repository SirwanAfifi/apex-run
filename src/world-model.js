/* Shared course geometry and surface model. No renderer or browser APIs. */
window.ApexWorldModel = (() => {
  'use strict';
  function create(initialCourse = 'sierra') {
    const roadHalf = 4.65, step = 4;
    const coast = window.ApexCoast, london = window.ApexLondon;
    let coastal = false, londonRoute = false, courseId = 'sierra';
    const clamp = (a,b,c) => Math.max(b,Math.min(c,a));
  function course(d) {
    if(londonRoute)return london.course(d);
    if(coastal)return coast.course(d);
    return -21*Math.cos((d-25)/81)+18*Math.sin((d+5)/127)
        -6.5*Math.cos((d-8)/47)+33*Math.sin(d/253);
  }
  function tangent(d) {
    if(londonRoute)return london.tangent(d);
    if(coastal)return coast.tangent(d);
    return 21/81*Math.sin((d-25)/81)+18/127*Math.cos((d+5)/127)
        +6.5/47*Math.sin((d-8)/47)+33/253*Math.cos(d/253);
  }
  function curvature(d) {
    if(londonRoute)return london.curvature(d);
    if(coastal)return coast.curvature(d);
    const second=21/6561*Math.cos((d-25)/81)-18/16129*Math.sin((d+5)/127)
        +6.5/2209*Math.cos((d-8)/47)-33/64009*Math.sin(d/253);
    return second/Math.pow(1+tangent(d)**2,1.5);
  }
  const roadCurve = d => clamp(curvature(d)*151,-1,1);
  const elevation = d => londonRoute?london.elevation(d):coastal?coast.elevation(d):9*Math.sin(d/198-.7)+3.1*Math.sin(d/113+.4)+1.1*Math.cos(d/61);
  const grade = d => londonRoute?london.grade(d):coastal?coast.grade(d):9/198*Math.cos(d/198-.7)+3.1/113*Math.cos(d/113+.4)-1.1/61*Math.sin(d/61);
  function smooth(a,b,x) {
    const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);
  }
  const shedStart=1860, shedEnd=1984;
  function shelterAt(d){return coastal||londonRoute?0:smooth(shedStart,shedStart+8,d)*(1-smooth(shedEnd-8,shedEnd,d));}
  // Surface water follows the same surveyed hollows in the vehicle and shader.
  function surfaceWetness(d,lateral) {
    if(coastal)d+=119.8;
    const x=lateral*roadHalf, cell=Math.floor(d/18), local=d-cell*18;
    const cx=3.15*Math.sin(cell*2.17+.74), dz=(local-9-1.5*Math.sin(cell*1.327))/(4.15+1.7*Math.cos(cell*.83));
    const dx=(x-cx+.18*Math.sin(d*1.43+x)+.14*Math.sin(d*.52-x*2))/
      (1.07+.49*Math.sin(cell*1.81+.6));
    const edge=dx*dx+dz*dz+.13*Math.sin(d*2.03+x*5.7)+.08*Math.sin(d*.97-x*8.3);
    const pool=1-smooth(.62,1.27,edge);
    const tyre=1-smooth(.13,.54,Math.abs(Math.abs(Math.abs(x)-2.32)-.76));
    const film=.54+.049*Math.sin(d*.083+x*.7)+.039*Math.sin(d*.027-x*.41)-.113*tyre;
    const outside=clamp(film+(1-film)*pool,0,1);
    const roof=shelterAt(d);
    return outside*(1-roof)+roof*(.19+.077*Math.min(Math.abs(lateral),1)+.022*Math.sin(d*.12));
  }
  function camber(d){return londonRoute?clamp(-curvature(d)*9,-.028,.028):coastal?clamp(-curvature(d)*11,-.06,.06):clamp(-curvature(d)*8.4,-.043,.043);}
  function ecology(d){
    const granite=smooth(850,1160,d)*(1-smooth(1630,1810,d));
    const ridge=smooth(2250,2650,d);
    return {granite,ridge,forest:clamp(1-granite*.86-ridge*.72,.14,1)};
  }
  function coverAt(d,lateral) {
    if(londonRoute)return london.coverAt(d,lateral);
    if(coastal)return coast.coverAt(d,lateral);
    const side=lateral<0?-1:1;
    const stands=.63+.23*Math.cos(d/140+side*.6)-rockCut(d,side)*.46;
    return clamp(stands*(.58+.28*Math.sin(d*.128+lateral*2)+.22*Math.cos(d*.274-lateral))*(.3+.7*ecology(d).forest),.04,1);
  }
  // The route alternates open granite cuts and more sheltered conifer stands.
  function rockCut(d,side) {
    return clamp((Math.sin(d/216+side*.65)+.52*Math.sin(d/81+side*1.05)-.18)*1.12,0,1);
  }
  function ground(d,u) {
    if(londonRoute)return london.ground(d,u);
    if(coastal)return coast.ground(d,u);
    const margin = Math.max(0,Math.abs(u)-roadHalf);
    const verge = Math.max(0,margin-1.8);
    const slope = (u<0 ? .145 : .072)+.113*Math.sin(d/128+u*.011)+.068*Math.cos(d/55);
    return elevation(d)+(u<0?shelterAt(d)*smooth(6.65,13,-u)*4.85:0)+camber(d)*clamp(u,-roadHalf,roadHalf)-.011*Math.min(Math.abs(u),roadHalf)-Math.min(margin,1.8)*.025
      +Math.min(verge,54)*slope+Math.min(verge,17)*rockCut(d,Math.sign(u))*.22 + Math.min(1,verge/7)*(.33*Math.sin(u*.32+d*.095)+.27*Math.cos(d*.21-u*.21));
  }
  function point(d,u,up=0) {
    const t=tangent(d), n=1/Math.hypot(1,t);
    return [course(d)+u*n,ground(d,u)+up,d-u*t*n];
  }

  const railOffset=5.58;
  function hasRail(d,side){
    // The mesh is surveyed in four metre panels. Query the same panel for
    // collision so a strict interval endpoint never creates an invisible rail.
    d=Math.floor(d/step)*step;
    if(londonRoute)return london.hasRail(d,side);
    if(coastal)return coast.hasRail(d,side);
    if(d>=shedStart-8 && d<shedEnd+8)return true;
    const block=Math.floor(d/128), local=d-block*128;
    return side<0 ? Math.abs(block)%5!==3 && local<112 : Math.abs(block)%5===2 && local<92;
  }
  function collisionRailOffset(d,side){
    if(!hasRail(d,side))return Infinity;
    if(!coastal||!coast.bridge(d))return railOffset-.095;
    // The curb is continuous. The broad pylon feet extend further inboard,
    // including the final portal which starts one metre before the bridge end.
    const local=d-coast.bridgeStart, bay=local%72;
    const portal=(local>=0&&local<=.92)||(d>=coast.bridgeEnd-1&&d<=coast.bridgeEnd-.08);
    return portal?5.205:bay<=.92?5.455:5.62;
  }

    function selectCourse(name) {
      courseId = name === 'london' && london ? 'london' : name === 'coast' && coast ? 'coast' : 'sierra';
      coastal = courseId === 'coast';
      londonRoute = courseId === 'london';
      return courseId;
    }
    selectCourse(initialCourse);
    return {selectCourse, course, tangent, curvature, roadCurve, elevation, grade,
      smooth, shelterAt, surfaceWetness, camber, ecology, coverAt, rockCut, ground,
      point, roadHalf, railOffset, hasRail, collisionRailOffset, shadeAt:coverAt,
      shedStart, shedEnd, get courseId() { return courseId; }};
  }
  return {create};
})();
