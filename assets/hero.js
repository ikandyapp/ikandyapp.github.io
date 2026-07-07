/* (c) 2026 L&R Entertainment LLC. Original demo shader written for ikandy.app.
   This is the website's little cousin of the engine, not code from the IKANDY app;
   the app's scene library, formats, and pipeline are separate works.
 IKANDY homepage live unit.
   A real fragment shader driven by real controls. No library, no framework.
   Scenes: FLUID / STORM / MOLTEN, web-native nods to the real presets. Audio: a silent demo signal drives the visuals;
   flip the SOUND latch to hear it. Audio drives light and color only;
   nothing on screen shakes to the beat. That is a house rule.
   (c) 2026 L&R Entertainment LLC. Original implementation. */
(function () {
  'use strict';

  // land at the top: browsers restore the previous scroll position on reload,
  // which drops returning visitors at U2 instead of the hero. manual + a double
  // scrollTo (second after first paint) beats late layout growth too.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) {
    window.scrollTo(0, 0);
    requestAnimationFrame(function () { window.scrollTo(0, 0); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) window.scrollTo(0, 0); });
  }

  var canvas = document.getElementById('hero-gl');
  if (!canvas) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- state ---------------- */
  var S = {
    mode: 0,              // 0 molten, 1 fluid, 2 storm
    react: 0.5, glow: 0.5, vol: 0.8, speed: 0.5, hue: 0.0,
    bass: 0, mid: 0, treb: 0,
    t: 0, ph: 12.0, last: 0, running: true, visible: true
  };

  /* ---------------- WebGL ---------------- */
  var gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' });
  var fallback = document.getElementById('hero-fallback');
  if (!gl) { if (fallback) fallback.hidden = false; hideConsole(); return; }

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

    // FLUID: deep domain-warped ink. rests dark, audio buys the light.
    'vec3 sceneFluid(vec2 uv,float T){',
    ' vec2 p=uv*2.3;',
    ' vec2 q=vec2(fbm(p+T*.13),fbm(p+vec2(5.2,1.3)-T*.09));',
    ' vec2 r=vec2(fbm(p+3.4*q+vec2(1.7,9.2)+T*.05),fbm(p+3.4*q+vec2(8.3,2.8)-T*.04));',
    ' float f=fbm(p+3.2*r);',
    ' vec3 col=pal(f*1.35+r.x*.5+q.y*.25);',
    ' col*=col;',
    ' float energy=.24+1.55*drv(u_audio.x);',                       // bass pumps the ink
    ' col*=mix(.10,1.7,smoothstep(.12,.95,f))*energy;',
    ' col+=pal(f+.45)*drv(u_audio.y)*1.05*smoothstep(.5,.95,r.y);',  // mids wash the folds
    ' float spark=smoothstep(.985-.035*drv(u_audio.z),1.,vnoise(p*36.+r*9.));',
    ' col+=vec3(1.,.95,.85)*spark*(.12+1.6*drv(u_audio.z));',      // treble glints the crests
    ' return sat(col,1.3);}',

    // STORM: three parallax layers of drifting particles. flow is constant; audio is light.
    'vec3 sceneStorm(vec2 uv,float T){',
    ' vec3 col=vec3(.008,.009,.014);',
    ' col+=pal(fbm(uv*1.6+T*.02)*.6)*(.04+.16*drv(u_audio.x));',   // nebula breathes on bass
    ' for(int L=0;L<3;L++){',
    '  float fl=float(L);',
    '  float scale=mix(7.,17.,fl*.5);',
    '  float drift=T*(.10+fl*.06);',
    '  vec2 gp=uv*scale+vec2(drift,drift*.6+fl*13.7);',
    '  vec2 cell=floor(gp),fr=fract(gp);',
    '  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){',
    '   vec2 o=vec2(float(x),float(y));',
    '   vec2 id=cell+o;',
    '   float h1=ih(uvec2(ivec2(id))+uint(L)*77u+9000u);',
    '   float h2=ih(uvec2(ivec2(id))+uint(L)*191u+21000u);',
    '   vec2 pos=o+vec2(h1,h2)-fr+.18*vec2(sin(T*.4+h1*6.28),cos(T*.5+h2*6.28));',
    '   float d=length(pos);',
    '   float tw=.5+.5*sin(T*(1.+h2*3.)+h1*40.);',
    '   float bright=(.2+.8*h2)*(.3+.7*tw);',
    '   float flare=1.+drv(u_audio.z)*2.9*step(.7,h1);',           // the bright ones flare on treble
    '   float glow=exp(-d*d*(150./flare));',
    '   vec3 c=pal(h1*.9+fl*.13);',
    '   col+=c*glow*bright*(.24+1.2*drv(u_audio.x)*step(.5,h2)+.12);',
    '  }',
    ' }',
    ' return sat(col,1.25);}',

    // MOLTEN: dark-industrial fractal. six-fold kaleidoscope over a Kali-set fold
    // (technique: the public 'Kaliset' fractal formula family; implementation original),
    // golden filament lattice on near-black, teal shadow glow. bass ignites the
    // filaments, treble sparks the nodes. structure drifts on its own slow clock.
    'vec3 sceneMolten(vec2 uv,float T){',
    ' vec2 p=uv*1.35;',
    ' float ang=atan(p.y,p.x); float r=length(p);',
    ' float k=1.0471976;',                                  // pi/3: six-fold mirror
    ' ang=mod(ang,2.*k); ang=abs(ang-k);',
    ' p=vec2(cos(ang),sin(ang))*r;',
    ' float c0=cos(T*.03),s0=sin(T*.03); p=mat2(c0,-s0,s0,c0)*p;',
    ' p*=1.05+.12*sin(T*.07);',                             // slow breathe on its own clock
    ' p*=1.0-.07*u_react*u_audio.x;',                       // and a little zoom into the kick
    ' float acc=0.,glow=0.;',
    ' vec2 cc=vec2(.78+.05*sin(T*.021),.615+.04*cos(T*.017));',
    ' for(int i=0;i<7;i++){',
    '  p=abs(p)/max(dot(p,p),.0015)-cc;',
    '  acc+=exp(-abs(p.y)*24.);',
    '  glow+=exp(-length(p)*3.4);',
    ' }',
    ' acc*=.143; glow*=.143;',
    ' vec3 gold=mix(vec3(1.,.60,.13),pal(.06),.28);',       // hue bends the alloy
    ' vec3 col=vec3(.030,.075,.075)*glow*.8;',              // teal shadow bed
    ' float heat=.30+1.35*drv(u_audio.x);',              // bass ignites the lattice
    ' col+=gold*acc*heat*2.3;',
    ' col+=gold*.22*drv(u_audio.y)*glow;',               // mids warm the haze
    ' float node=smoothstep(.984-.05*drv(u_audio.z),1.,vnoise(p*8.+vec2(T,0.)));',
    ' col+=vec3(1.,.9,.6)*node*(.15+1.1*drv(u_audio.z));',
    ' return col;}',

    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-.5*u_res)/u_res.y;',
    ' float T=u_time;',
    ' vec3 col;',
    ' if(u_mode==0)col=sceneMolten(uv,T);',
    ' else if(u_mode==1)col=sceneFluid(uv,T);',
    ' else col=sceneStorm(uv,T);',
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
      console.warn('[ikandy hero] shader:', gl.getShaderInfoLog(sh));
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
  var io = new IntersectionObserver(function (entries) {
    S.visible = entries[0].isIntersecting;
  }, { threshold: 0.02 });
  io.observe(canvas);
  document.addEventListener('visibilitychange', function () { S.running = !document.hidden; });

  var smB = 0, smM = 0, smT = 0;
  var beatDot = document.getElementById('beat-dot');
  function frame(now) {
    requestAnimationFrame(frame);
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

    drawScope(now);

    // the headline's full stop is a bass LED
    if (beatDot && !reduced) {
      var g = 0.45 + smB * 0.55;
      beatDot.style.opacity = g;
      beatDot.style.boxShadow = '0 0 ' + (0.08 + smB * 0.55) + 'em rgba(255,90,31,' + (0.35 + smB * 0.55) + ')';
      beatDot.style.transform = 'translateY(-.02em) scale(' + (1 + smB * 0.18) + ')';
    }

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
  resize();
  requestAnimationFrame(frame);
})();

/* mobile nav toggle */
(function () {
  var t = document.querySelector('.rail-toggle'), l = document.querySelector('.rail-links');
  if (t && l) t.addEventListener('click', function () { l.classList.toggle('open'); });
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
