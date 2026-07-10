/* (c) 2026 L&R Entertainment LLC. Original demo shader written for ikandy.app.
   This is the website's little cousin of the engine, not code from the IKANDY app;
   the app's scene library, formats, and pipeline are separate works.
 IKANDY homepage live unit.
   A real fragment shader driven by real controls. No library, no framework.
   Scenes: PRISM / SIGNAL / VOID / RIFT / CATHEDRAL / NOVA. Audio: a silent demo signal drives the visuals;
   flip the SOUND latch to hear it. Audio drives light and color only;
   nothing on screen shakes to the beat. That is a house rule.
   (c) 2026 L&R Entertainment LLC. Original implementation. */
(function () {
  'use strict';

  var canvas = document.getElementById('hero-gl');
  if (!canvas) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- state ---------------- */
  var S = {
    mode: 0,              // 0 prism, 1 signal, 2 void, 3-5 WebGPU showcase
    react: 0.5, glow: 0.5, vol: 0.8, speed: 0.5, hue: 0.0,
    bass: 0, mid: 0, treb: 0,
    t: 0, ph: 12.0, last: 0, running: true, visible: true
  };
  window.IKANDY_HERO_STATE = S;

  /* ---------------- WebGL ---------------- */
  var gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' });
  var fallback = document.getElementById('hero-fallback');
  if (!gl) { if (fallback) fallback.hidden = false; hideConsole(); return; }
  canvas.addEventListener('webglcontextlost', function (event) {
    event.preventDefault();
    S.running = false;
    if (fallback) fallback.hidden = false;
    hideConsole();
  });

  var VS = '#version 300 es\nvoid main(){vec2 p=vec2(gl_VertexID==1?3.0:-1.0,gl_VertexID==2?3.0:-1.0);gl_Position=vec4(p,0.,1.);}';

  var FS = [
    '#version 300 es',
    'precision highp float; precision highp int;',
    'out vec4 O;',
    'uniform vec2 u_res; uniform float u_time; uniform int u_mode;',
    'uniform float u_hue,u_glow,u_speed,u_react;',
    'uniform vec3 u_audio;', // bass, mid, treb

    // portable integer bit-mix hash
    'float ih(uvec2 x){uint h=x.x*1597334673u ^ x.y*3812015801u;h=(h^(h>>16))*2246822519u;h=(h^(h>>13))*3266489917u;h^=h>>16;return float(h)*(1.0/4294967295.0);}',
    'float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' float a=ih(uvec2(ivec2(i)+1000)),b=ih(uvec2(ivec2(i+vec2(1,0))+1000));',
    ' float c=ih(uvec2(ivec2(i+vec2(0,1))+1000)),d=ih(uvec2(ivec2(i+vec2(1,1))+1000));',
    ' return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vnoise(p);p=p*2.03+vec2(17.7,9.3);a*=.5;}return v;}',
    'vec3 sat(vec3 c,float s){float l=dot(c,vec3(.299,.587,.114));return mix(vec3(l),c,s);}',
    // REACT shapes the response: low = soft dim swells, high = sharp hot pops
    'float drv(float a){return pow(a,mix(2.0,.85,u_react))*mix(.5,1.9,u_react);}',

    // cosine palette, hue knob rotates phase
    'vec3 pal(float t){',
    ' vec3 ph=vec3(0.00,0.33,0.67)+u_hue;',
    ' return 0.5+0.5*cos(6.28318*(t+ph));}',

    // PRISM: refracted crystalline symmetry. Bass opens the facets, mids bend
    // the glass, and treble flashes along razor-thin internal edges.
    'vec3 scenePrism(vec2 uv,float T){',
    ' float ba=drv(u_audio.x),mi=drv(u_audio.y),tr=drv(u_audio.z);',
    ' vec2 p=uv*(1.18-.10*min(ba,1.)); float r=length(p);',
    ' float a=atan(p.y,p.x)+T*.055; float seg=.39269908;',
    ' a=mod(a,2.*seg); a=abs(a-seg);',
    ' vec2 k=vec2(cos(a),sin(a))*r;',
    ' float glass=fbm(k*4.2+vec2(T*.10,-T*.07));',
    ' k+=.12*vec2(sin(glass*6.283+T*.21),cos(glass*5.3-T*.17))*(.45+mi);',
    ' float facet=abs(sin(k.x*17.+sin(k.y*11.+T*.3)*2.2));',
    ' float ribs=exp(-abs(sin(k.y*13.-k.x*7.+T*.34))*18.);',
    ' float rings=exp(-abs(sin((length(k)+glass*.08)*34.-T*.9))*16.);',
    ' float cut=pow(1.-facet,10.)+ribs*.75+rings*.65;',
    ' vec3 alloy=pal(glass*.42+r*.34+a*.18+T*.012);',
    ' vec3 col=alloy*cut*(.10+.72*mi+.58*ba);',
    ' float core=exp(-r*r*(9.-4.*min(ba,1.)));',
    ' col+=pal(a*.22+T*.018)*core*(.08+.75*ba);',
    ' float flash=smoothstep(.92,1.,vnoise(k*38.+floor(T*2.)))*cut;',
    ' col+=vec3(.92,.97,1.)*flash*(.02+1.5*tr);',
    ' col*=1.-smoothstep(.86,1.38,r);',
    ' return sat(col,1.65);}',

    // SIGNAL: a stack of impossible laser waveforms caught in video feedback.
    // Bass displaces the traces, mids multiply echoes, treble burns white peaks.
    'vec3 sceneSignal(vec2 uv,float T){',
    ' float ba=drv(u_audio.x),mi=drv(u_audio.y),tr=drv(u_audio.z);',
    ' vec2 p=uv; p.x+=.055*sin(p.y*5.+T*.18);',
    ' vec3 col=vec3(.002,.004,.012);',
    ' float gridX=exp(-abs(fract((p.x+T*.025)*12.)-.5)*30.);',
    ' float gridY=exp(-abs(fract((p.y-T*.018)*10.)-.5)*30.);',
    ' col+=pal(.58+T*.01)*(gridX+gridY)*(.012+.045*mi);',
    ' for(int i=0;i<9;i++){',
    '  float fi=float(i); float z=fi/8.;',
    '  float freq=2.2+fi*.41;',
    '  float y=(z-.5)*.92+.10*sin(p.x*freq*3.+T*(.55+z*.7)+fi);',
    '  y+=.045*sin(p.x*19.-T*1.15+fi*2.1)*(1.+mi);',
    '  y+=.075*sin(T*.7+fi)*ba;',
    '  float d=abs(p.y-y);',
    '  float beam=exp(-d*(95.-22.*min(tr,1.5)));',
    '  float halo=exp(-d*18.)*.16;',
    '  vec3 laser=pal(z*.74+p.x*.12+T*.014);',
    '  col+=laser*(beam*(.18+.82*ba+.55*tr)+halo*(.08+.75*mi));',
    ' }',
    ' float pulse=exp(-abs(p.x-(fract(T*.18)*2.4-1.2))*38.);',
    ' col+=vec3(.78,.94,1.)*pulse*(.025+.42*tr);',
    ' float hot=pow(max(0.,sin(p.x*31.-T*2.4)*sin(p.y*27.+T*1.7)),18.);',
    ' col+=pal(p.x*.2+p.y*.15)*hot*(.02+1.2*tr);',
    ' return sat(col,1.7);}',

    // VOID: liquid-chrome gravity lens. Bass grows the event horizon, mids twist
    // the accretion flow, and treble tears sparks from the rim.
    'vec3 sceneVoid(vec2 uv,float T){',
    ' float ba=drv(u_audio.x),mi=drv(u_audio.y),tr=drv(u_audio.z);',
    ' vec2 p=uv; p.x-=.25; float r=length(p); float a=atan(p.y,p.x);',
    ' float horizon=.17+.045*min(ba,1.);',
    ' float lens=1./max(r,.055);',
    ' float swirl=a+1.55*lens+T*.19+mi*sin(r*12.-T*.45);',
    ' float flow=pow(.5+.5*sin(swirl*5.+r*48.-T*1.6),3.);',
    ' float disk=exp(-abs(p.y+sin(swirl*2.)*.018)*30.);',
    ' disk*=smoothstep(horizon*.92,horizon*1.24,r)*(1.-smoothstep(1.04,1.48,r));',
    ' float ring=exp(-abs(r-horizon)*82.);',
    ' float photon=exp(-abs(r-(horizon*1.75+.018*sin(a*3.-T*.4)))*34.);',
    ' vec3 chrome=pal(swirl/6.28318+r*.31+T*.014);',
    ' vec3 col=chrome*disk*(.10+1.18*flow)*(.34+.88*mi+.68*ba);',
    ' col+=mix(vec3(1.,.28,.06),vec3(.10,.78,1.),.5+.5*sin(a*2.))*ring*(.20+1.3*ba);',
    ' col+=pal(a/6.28318+T*.012+.7)*photon*(.055+.55*mi+.48*ba);',
    ' float arc=pow(max(0.,cos(swirl*11.)),22.)*photon;',
    ' col+=vec3(.88,.96,1.)*arc*(.03+1.55*tr);',
    ' vec2 gp=p*30.+vec2(T*.025,-T*.014); vec2 cell=floor(gp),fr=fract(gp)-.5;',
    ' float h1=ih(uvec2(ivec2(cell)+12000));',
    ' float h2=ih(uvec2(ivec2(cell)+23000));',
    ' vec2 sp=vec2(h1,h2)-.5; float star=exp(-dot(fr-sp,fr-sp)*210.)*step(.965,h1);',
    ' star*=smoothstep(horizon*1.7,horizon*2.1,r)*(1.-smoothstep(1.05,1.5,r));',
    ' col+=pal(h1*.8+T*.01)*star*(.05+.9*tr);',
    ' col*=smoothstep(horizon*.78,horizon*1.04,r);',
    ' col+=vec3(.018,.005,.032)*exp(-abs(r-horizon*3.2)*4.5)*(.24+mi);',
    ' return sat(col,1.6);}',

    // RIFT: a bass-warped polar tunnel. Low end opens the throat, mids bend the
    // geometry, and treble fires cold sparks down its vanishing point.
    'vec3 sceneRift(vec2 uv,float T){',
    ' vec2 p=uv; float r=length(p); float a=atan(p.y,p.x);',
    ' float ba=drv(u_audio.x),mi=drv(u_audio.y),tr=drv(u_audio.z);',
    ' float bend=.18*sin(a*3.-T*.21)+.07*sin(a*9.+T*.13);',
    ' float dep=-log(r+.035)*3.2+T*.55+bend+mi*.22;',
    ' float rings=exp(-abs(fract(dep*.18)-.5)*38.);',
    ' float spokes=exp(-abs(sin(a*7.+dep*1.7-T*.14))*14.);',
    ' float shock=exp(-abs(r-(.18+.12*fract(T*.24)))*38.)*ba;',
    ' float mask=smoothstep(.035,.22,r)*(1.-smoothstep(1.15,1.75,r));',
    ' vec3 col=vec3(.002,.004,.012);',
    ' vec3 neon=mix(vec3(.04,.30,1.),vec3(1.,.025,.46),.5+.5*sin(a*3.+dep));',
    ' neon=mix(neon,pal(a/6.28318+dep*.035),.30);',
    ' col+=neon*(rings*.95+spokes*.58)*mask*(.18+.92*ba+.42*mi);',
    ' col+=vec3(.95,.75,1.)*shock*(.28+1.55*ba);',
    ' float glint=smoothstep(.90,1.,vnoise(vec2(a*14.,floor(dep*3.))+T*.2));',
    ' col+=vec3(.70,.94,1.)*glint*spokes*mask*(.05+1.75*tr);',
    ' float horizon=exp(-abs(r-(.14+.045*min(ba,1.)))*48.);',
    ' col+=pal(T*.015+.52)*horizon*(.18+1.2*ba);',
    ' return sat(col,1.55);}',

    // CATHEDRAL: impossible luminous frames advancing through a black chamber.
    // Bass widens the architecture, mids color the glass, treble sharpens its ribs.
    'vec3 sceneCathedral(vec2 uv,float T){',
    ' float ba=drv(u_audio.x),mi=drv(u_audio.y),tr=drv(u_audio.z);',
    ' float turn=.10*sin(T*.13)+.035*sin(T*.31);',
    ' float ct=cos(turn),st=sin(turn); vec2 p=mat2(ct,-st,st,ct)*uv;',
    ' p.x+=.08*sin(T*.10)-.24;',
    ' vec3 col=vec3(.003,.006,.012);',
    ' for(int i=0;i<8;i++){',
    '  float fi=float(i); float ph=fract(fi*.125+T*.035);',
    '  float sc=mix(.55,7.5,ph*ph); vec2 q=p*sc;',
    '  q.x+=.12*sin(T*.16+fi*.83)*(1.-ph);',
    '  float w=.72+.07*min(ba,1.); float h=.42+.045*sin(T*.24+fi);',
    '  float box=abs(max(abs(q.x)-w,abs(q.y)-h));',
    '  float g=exp(-box*(78.-22.*min(tr,1.9)))*(.22+.78*(1.-ph));',
    '  vec3 glass=pal(ph*.72+q.y*.045+T*.012);',
    '  col+=glass*g*(.08+.28*mi+.18*ba);',
    '  float pillars=exp(-abs(abs(q.x)-w)*90.)*(1.-smoothstep(h-.04,h+.22,abs(q.y)));',
    '  col+=glass*pillars*(.010+.08*tr)*(1.-ph);',
    ' }',
    ' float floorMask=1.-smoothstep(-.72,-.08,p.y);',
    ' float floorRay=exp(-abs(sin(atan(p.x,p.y+.78)*11.))*18.)*floorMask;',
    ' float floorStep=exp(-abs(fract(1./(abs(p.y)+.12)+T*.08)-.5)*20.)*floorMask;',
    ' col+=pal(.58+T*.01)*(floorRay*.16+floorStep*.12)*(.08+.35*mi);',
    ' float pr=length(p); float pa=atan(p.y,p.x);',
    ' float rose=exp(-abs(pr-(.23+.025*min(ba,1.)))*62.);',
    ' float roseSpoke=pow(abs(cos(pa*12.+T*.12)),28.)*exp(-pr*4.2);',
    ' col+=pal(pa/6.28318+.16)*(rose+roseSpoke)*(.05+.35*tr+.18*mi);',
    ' float altar=exp(-dot(p,p)*(16.-7.*min(ba,1.)));',
    ' col+=vec3(.85,.94,1.)*altar*(.04+.50*ba);',
    ' return sat(col,1.45);}',

    // NOVA: a stellar detonation held at the instant of impact. Bass expands the
    // core, mids twist the corona, and treble turns its rim into razor-light.
    'vec3 sceneNova(vec2 uv,float T){',
    ' float ba=drv(u_audio.x),mi=drv(u_audio.y),tr=drv(u_audio.z);',
    ' float rr=.055*T; float cr=cos(rr),sr=sin(rr); vec2 p=mat2(cr,-sr,sr,cr)*uv;',
    ' float r=length(p); float a=atan(p.y,p.x);',
    ' float twist=a+sin(r*8.-T*.35)*(1.05+.72*mi);',
    ' float petals=pow(.5+.5*cos(twist*10.),8.);',
    ' float wave=.5+.5*cos(r*30.-T*2.1+petals*4.+mi*2.);',
    ' float corona=exp(-r*(2.75-.85*min(ba,1.)))*(.14+.86*wave);',
    ' float rays=pow(max(0.,cos(twist*22.)),max(10.,48.-20.*tr))*exp(-r*1.7);',
    ' float core=exp(-r*r*(18.-9.*min(ba,1.)));',
    ' vec3 col=pal(twist/6.28318+r*.28+T*.018)*corona*(.24+.78*mi+.46*ba);',
    ' col+=vec3(1.,.91,.72)*rays*(.04+1.25*tr+.35*ba);',
    ' float shock=exp(-abs(r-(.28+.17*min(ba,1.)+.035*sin(T*.7)))*34.)*ba;',
    ' col+=pal(.08+r*.4)*shock*1.35;',
    ' float spark=smoothstep(.94,1.,vnoise(vec2(floor(a*18.),floor(r*42.-T*3.))));',
    ' col+=vec3(.72,.94,1.)*spark*exp(-r*1.3)*(.03+1.5*tr);',
    ' col+=vec3(1.,.72,.42)*core*(.18+1.45*ba);',
    ' return sat(col,1.55);}',

    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-.5*u_res)/u_res.y;',
    ' float T=u_time;',
    ' vec3 col;',
    ' if(u_mode==0)col=scenePrism(uv,T);',
    ' else if(u_mode==1)col=sceneSignal(uv,T);',
    ' else if(u_mode==2)col=sceneVoid(uv,T);',
    ' else if(u_mode==3)col=sceneRift(uv,T);',
    ' else if(u_mode==4)col=sceneCathedral(uv,T);',
    ' else col=sceneNova(uv,T);',
    ' col*=mix(.88,1.12,u_glow);',                            // a touch of exposure
    ' col=sat(col,mix(.55,1.85,u_glow));',                   // glow is vibrance: colors bloom
    ' col=col/(1.+col);',                     // simple reinhard
    ' col=pow(col,vec3(0.4545));',
    // vignette so the headline stays readable
    ' vec2 q=gl_FragCoord.xy/u_res; col*=0.62+0.38*pow(16.*q.x*q.y*(1.-q.x)*(1.-q.y),.28);',
    ' O=vec4(col,1.);}'
  ].join('\n');

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      var shaderError = gl.getShaderInfoLog(sh) || 'Unknown shader compile error';
      canvas.setAttribute('data-shader-error', shaderError);
      console.warn('[ikandy hero] shader:', shaderError);
      return null;
    }
    return sh;
  }
  var vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { if (fallback) fallback.hidden = false; hideConsole(); return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { if (fallback) fallback.hidden = false; hideConsole(); return; }
  gl.useProgram(prog);
  var U = {};
  ['u_res', 'u_time', 'u_mode', 'u_hue', 'u_glow', 'u_speed', 'u_react', 'u_audio'].forEach(function (n) {
    U[n] = gl.getUniformLocation(prog, n);
  });

  function hideConsole() {
    var c = document.getElementById('console'); if (c) c.classList.add('console-dead');
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    var w = canvas.clientWidth, h = canvas.clientHeight;
    var W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H);
    }
  }
  window.addEventListener('resize', resize);

  /* ---------------- audio: silent demo math, audible on the SOUND latch ---------------- */
  var AC = null;
  var sndOn = false, schedTimer = null, nextBeat = 0, beatIx = 0, master = null, noiseBuf = null;

  function demoSignal(t) {
    // a believable 126 bpm program: kick pulse, mid swell, hat jitter
    var beat = t * 2.1;
    var ph = beat - Math.floor(beat);
    var bar = Math.floor(beat / 4) % 8;
    var kick = Math.pow(Math.max(0, 1 - ph * 3.2), 2.2) * (bar === 6 ? 0.25 : 1);
    var mid = 0.35 + 0.3 * Math.sin(t * 0.7) + 0.15 * Math.sin(t * 0.23 + 2.0);
    var hatPh = beat * 2 - Math.floor(beat * 2);
    var hat = Math.pow(Math.max(0, 1 - hatPh * 5.0), 2.0) * (0.55 + 0.45 * Math.sin(t * 1.7));
    return [Math.min(1, kick), Math.max(0, Math.min(1, mid)), Math.max(0, Math.min(1, hat))];
  }

  /* a small kit, scheduled ahead of time so it never stutters */
  var BPM = 126, SPB = 60 / BPM;
  function buildSynth() {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0;
    var comp = AC.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    master.connect(comp); comp.connect(AC.destination);
    // shared noise buffer for hats
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // quiet detuned pad, always on while sound is up
    [0, 7].forEach(function (semi, k) {
      var o = AC.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = 110 * Math.pow(2, semi / 12) * (k ? 1.003 : 0.997);
      var f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.7;
      var lfo = AC.createOscillator(); lfo.frequency.value = 0.07;
      var lg = AC.createGain(); lg.gain.value = 220;
      lfo.connect(lg); lg.connect(f.frequency);
      var g = AC.createGain(); g.gain.value = 0.05;
      o.connect(f); f.connect(g); g.connect(master);
      o.start(); lfo.start();
    });
  }
  function kick(t, vel) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
    g.gain.setValueAtTime(0.9 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.32);
  }
  function hat(t, vel) {
    var s = AC.createBufferSource(); s.buffer = noiseBuf;
    var f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8200;
    var g = AC.createGain();
    g.gain.setValueAtTime(0.22 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.07);
  }
  function sub(t, vel) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.frequency.value = 55;
    g.gain.setValueAtTime(0.30 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.24);
  }
  function schedule() {
    var horizon = AC.currentTime + 0.14;
    while (nextBeat < horizon) {
      var bar = Math.floor(beatIx / 4) % 8, inBar = beatIx % 4;
      if (bar !== 6) kick(nextBeat, inBar === 0 ? 1 : 0.85);       // one bar of air every eight
      hat(nextBeat + SPB * 0.5, 0.8 + 0.2 * ((beatIx % 3) / 2));   // offbeat hats
      if (inBar === 1 || inBar === 3) sub(nextBeat + SPB * 0.5, 0.9);
      nextBeat += SPB; beatIx++;
    }
  }
  var sndBtn = document.getElementById('snd-btn');
  function targetGain() { return sndOn ? 0.62 * S.vol : 0.0; }
  function applyGain(fast) {
    if (!AC) return;
    var t = AC.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(targetGain(), t, fast ? 0.03 : 0.06);
  }
  function setSound(on) {
    sndOn = on;
    if (sndBtn) sndBtn.setAttribute('aria-pressed', String(on));
    applyGain(false);
  }
  if (sndBtn) sndBtn.addEventListener('click', function () {
    if (!AC) {
      buildSynth();
      nextBeat = AC.currentTime + 0.06; beatIx = 0;
      schedTimer = setInterval(schedule, 30);
    }
    if (AC.state !== 'running') AC.resume().catch(function () {});
    setSound(!sndOn);
    if (sndOn && window.ikandyTrack) window.ikandyTrack('hero_sound_on');
  });

  /* ---------------- knobs ---------------- */
  function makeKnob(id, key, fmt) {
    var el = document.getElementById(id);
    if (!el) return;
    var dial = el.querySelector('.knob-dial');
    var out = el.querySelector('.knob-val');
    // value arc: an amber trace that fills as you turn
    var ring = el.querySelector('.knob-ring');
    var NS = 'http://www.w3.org/2000/svg';
    var arcSvg = document.createElementNS(NS, 'svg');
    arcSvg.setAttribute('class', 'knob-arc'); arcSvg.setAttribute('viewBox', '0 0 52 52');
    var trace = document.createElementNS(NS, 'circle');
    trace.setAttribute('cx','26'); trace.setAttribute('cy','26'); trace.setAttribute('r','24');
    trace.setAttribute('pathLength','100');
    arcSvg.appendChild(trace);
    ring.insertBefore(arcSvg, dial);
    var def = S[key];
    function setV(v, announce) {
      v = Math.max(0, Math.min(1, v));
      S[key] = v;
      var deg = -135 + v * 270;
      dial.style.transform = 'rotate(' + deg + 'deg)';
      out.textContent = fmt ? fmt(v) : Math.round(v * 100);
      el.setAttribute('aria-valuenow', Math.round(v * 100));
      trace.style.strokeDasharray = (v * 75) + ' 100';
      if (announce && window.ikandyTrack) window.ikandyTrack('hero_knob', { knob: key });
    }
    setV(def);
    var dragging = false, startY = 0, startV = 0, moved = false;
    el.addEventListener('pointerdown', function (e) {
      dragging = true; moved = false; startY = e.clientY; startV = S[key];
      el.setPointerCapture(e.pointerId); e.preventDefault();
      el.classList.add('grabbing');
    });
    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dy = startY - e.clientY;
      if (Math.abs(dy) > 2) moved = true;
      var fine = e.shiftKey ? 0.25 : 1;
      setV(startV + (dy / 160) * fine);
    });
    el.addEventListener('pointerup', function () {
      dragging = false; el.classList.remove('grabbing');
      if (moved && window.ikandyTrack) window.ikandyTrack('hero_knob', { knob: key });
    });
    el.addEventListener('dblclick', function () { setV(def); });
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      // one notch = exactly 1, shift = 5; snap to whole units so every value,
      // including 50, is reachable no matter where a drag left the knob
      var stp = e.shiftKey ? 5 : 1;
      var pct = Math.round(S[key] * 100) + (e.deltaY < 0 ? stp : -stp);
      setV(pct / 100);
    }, { passive: false });
    el.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 0.02 : 0.05;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setV(S[key] + step); e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setV(S[key] - step); e.preventDefault(); }
      if (e.key === 'Home') { setV(0); e.preventDefault(); }
      if (e.key === 'End') { setV(1); e.preventDefault(); }
    });
  }
  makeKnob('k-react', 'react');
  makeKnob('k-glow', 'glow');
  makeKnob('k-speed', 'speed');
  makeKnob('k-hue', 'hue', function (v) { return Math.round(v * 360) + '\u00b0'; });

  /* ---------------- scene selector ---------------- */
  // scope strictly to the SCENE group: the SOUND latch shares the button class
  /* ---------------- volume fader ---------------- */
  (function () {
    var el = document.getElementById('vol-fader'); if (!el) return;
    var track = el.querySelector('.fader-track');
    var cap = document.getElementById('vol-cap');
    var fill = document.getElementById('vol-fill');
    var val = document.getElementById('vol-val');
    var PAD = 6, told = false;
    function paint() {
      var pct = S.vol * 100;
      cap.style.left = 'calc(' + PAD + 'px + (100% - ' + (PAD * 2) + 'px) * ' + S.vol + ')';
      fill.style.width = 'calc((100% - ' + (PAD * 2) + 'px) * ' + S.vol + ')';
      val.textContent = Math.round(pct);
      el.setAttribute('aria-valuenow', String(Math.round(pct)));
    }
    function setV(v) {
      S.vol = Math.max(0, Math.min(1, v));
      paint(); applyGain(true);
      if (!told && window.ikandyTrack) { told = true; window.ikandyTrack('hero_fader'); }
    }
    function fromEvent(e) {
      var r = track.getBoundingClientRect();
      setV((e.clientX - r.left - PAD) / Math.max(1, r.width - PAD * 2));
    }
    el.addEventListener('pointerdown', function (e) {
      el.setPointerCapture(e.pointerId); fromEvent(e); e.preventDefault();
    });
    el.addEventListener('pointermove', function (e) { if (e.buttons) fromEvent(e); });
    el.addEventListener('dblclick', function () { setV(0.8); });
    el.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 0.10 : 0.02;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setV(S.vol + step); e.preventDefault(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setV(S.vol - step); e.preventDefault(); }
      if (e.key === 'Home') { setV(0); e.preventDefault(); }
      if (e.key === 'End') { setV(1); e.preventDefault(); }
    });
    paint();
  })();

  var sceneBtns = Array.prototype.slice.call(
    document.querySelectorAll('[aria-label="Scene select"] .scene-btn'));
  sceneBtns.forEach(function (b, i) {
    b.addEventListener('click', function () {
      S.mode = i;
      sceneBtns.forEach(function (x, j) { x.setAttribute('aria-pressed', String(i === j)); });
      if (window.ikandyTrack) window.ikandyTrack('hero_scene', { scene: b.textContent.trim() });
    });
  });

  var logoBtn = document.getElementById('logo-btn');
  var heroLogo = document.getElementById('hero-logo');
  if (logoBtn && heroLogo) logoBtn.addEventListener('click', function () {
    var on = logoBtn.getAttribute('aria-pressed') !== 'true';
    logoBtn.setAttribute('aria-pressed', String(on));
    heroLogo.classList.toggle('on', on);
    if (window.ikandyTrack) window.ikandyTrack('hero_logo', { enabled: on ? 'on' : 'off' });
  });

  /* ---------------- VU meter ---------------- */
  /* waveform scope: a rolling history of the signal, mirrored around center */
  var scope = document.getElementById('wave-scope');
  var scopeCtx = scope ? scope.getContext('2d') : null;
  var waveBuf = new Float32Array(110), waveHead = 0, wavePeak = 0, waveLast = 0;
  function drawScope(now) {
    if (!scopeCtx) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = scope.clientWidth, hgt = scope.clientHeight;
    if (scope.width !== (w * dpr | 0)) { scope.width = w * dpr | 0; scope.height = hgt * dpr | 0; }
    wavePeak = Math.max(wavePeak, Math.min(1, smB * 0.62 + smM * 0.22 + smT * 0.34));
    if (now - waveLast > 38) {                       // ~26 samples/sec scroll
      waveBuf[waveHead] = wavePeak; waveHead = (waveHead + 1) % waveBuf.length;
      wavePeak = 0; waveLast = now;
    }
    var c = scopeCtx, W = scope.width, H = scope.height, n = waveBuf.length;
    c.clearRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.05)';
    c.fillRect(0, H / 2 - dpr * 0.5, W, dpr);        // center hairline
    var bw = W / n, cy = H / 2;
    for (var i = 0; i < n; i++) {
      var a = waveBuf[(waveHead + i) % n];           // oldest left, newest right
      if (a <= 0.004) continue;
      var bh = Math.max(dpr, a * H * 0.92);
      c.fillStyle = 'rgba(255,90,31,' + (0.28 + 0.62 * a).toFixed(3) + ')';
      c.fillRect(i * bw, cy - bh / 2, bw * 0.68, bh);
      if (a > 0.9) {                                 // hot tips clip red
        c.fillStyle = 'rgba(255,66,56,.9)';
        c.fillRect(i * bw, cy - bh / 2, bw * 0.68, dpr);
        c.fillRect(i * bw, cy + bh / 2 - dpr, bw * 0.68, dpr);
      }
    }
  }


  /* ---------------- loop ---------------- */
  var rafId = 0;
  function requestFrame() {
    if (reduced || rafId || !S.running || !S.visible) return;
    rafId = requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      S.visible = entries[0].isIntersecting;
      if (S.visible) requestFrame();
    }, { threshold: 0.02 });
    io.observe(canvas);
  }
  document.addEventListener('visibilitychange', function () {
    S.running = !document.hidden;
    if (S.running) requestFrame();
  });

  var smB = 0, smM = 0, smT = 0;
  var beatDot = document.getElementById('beat-dot');
  function frame(now) {
    rafId = 0;
    if (!S.running || !S.visible) { S.last = now; return; }
    var dt = Math.min(0.05, (now - (S.last || now)) / 1000); S.last = now;
    S.t += dt;                                        // music clock: tempo never changes
    if (!reduced) S.ph += dt * (0.25 + S.speed * 1.5); // visual clock: SPEED sets velocity, not position

    var a = demoSignal(S.t);   // visuals always ride the demo program; SOUND is ears only
    a[1] = Math.min(1, a[1] * 1.2); a[2] = Math.min(1, a[2] * 1.35);
    // ease so light breathes instead of strobing
    smB += (a[0] - smB) * (a[0] > smB ? 0.75 : 0.14);
    smM += (a[1] - smM) * 0.3;
    smT += (a[2] - smT) * (a[2] > smT ? 0.85 : 0.24);
    S.bass = smB; S.mid = smM; S.treb = smT;

    drawScope(now);

    // the headline's full stop is a bass LED
    if (beatDot && !reduced) {
      var g = 0.45 + smB * 0.55;
      beatDot.style.opacity = g;
      beatDot.style.boxShadow = '0 0 ' + (0.08 + smB * 0.55) + 'em rgba(255,90,31,' + (0.35 + smB * 0.55) + ')';
      beatDot.style.transform = 'translateY(-.02em) scale(' + (1 + smB * 0.18) + ')';
    }

    if (!(window.IKANDY_WEBGPU_ACTIVE && S.mode >= 3)) {
      resize();
      gl.uniform2f(U.u_res, canvas.width, canvas.height);
      gl.uniform1f(U.u_time, S.ph);
      gl.uniform1i(U.u_mode, S.mode);
      gl.uniform1f(U.u_hue, S.hue);
      gl.uniform1f(U.u_glow, S.glow);
      gl.uniform1f(U.u_speed, reduced ? 0 : S.speed);
      gl.uniform1f(U.u_react, S.react);
      gl.uniform3f(U.u_audio, smB, smM, smT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestFrame();
  }
  resize();
  if (reduced) frame(performance.now());
  else requestFrame();
})();

/* rail tape-position line */
(function () {
  var bar = document.querySelector('.rail-progress');
  if (!bar) return;
  var ticking = false;
  function paint() {
    ticking = false;
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(paint); }
  }, { passive: true });
  paint();
})();

/* rack units slide into the rails as you reach them */
(function () {
  var units = document.querySelectorAll('.unit-in');
  if (!('IntersectionObserver' in window)) {
    units.forEach ? units.forEach(function (u) { u.classList.add('in'); }) : null;
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  Array.prototype.forEach.call(units, function (u) { io.observe(u); });
})();
