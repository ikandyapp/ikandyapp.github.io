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
  var renderReady = false;
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
    'float fbm3(vec2 p){float v=.5714286*vnoise(p);p=p*2.03+vec2(17.7,9.3);v+=.2857143*vnoise(p);p=p*2.03+vec2(17.7,9.3);return v+.1428571*vnoise(p);}',
    'vec3 sat(vec3 c,float s){float l=dot(c,vec3(.2126,.7152,.0722));return max(vec3(0.),mix(vec3(l),c,s));}',
    'vec3 hueShift(vec3 c,float h){float a=6.28318*h,co=cos(a),si=sin(a);vec3 k=vec3(.57735027);return max(vec3(0.),c*co+cross(k,c)*si+k*dot(k,c)*(1.-co));}',
    'float lineAA(float d,float w){float aa=max(fwidth(d),1.25/u_res.y);return 1.-smoothstep(w,w+1.5*aa,abs(d));}',
    // REACT shapes the response: low = soft dim swells, high = sharp hot pops
    'float drv(float a){return pow(a,mix(2.0,.85,u_react))*mix(.5,1.9,u_react);}',

    // Base cosine palette; the Hue detent rotates the completed scene below.
    'vec3 pal(float t){',
    ' vec3 ph=vec3(0.00,0.33,0.67);',
    ' return 0.5+0.5*cos(6.28318*(t+ph));}',

    // PRISM: refracted crystalline symmetry. Bass opens the facets, mids bend
    // the glass, and treble flashes along razor-thin internal edges.
    'vec3 scenePrism(vec2 uv,float T){',
    ' float ba=drv(u_audio.x),mi=drv(u_audio.y),tr=drv(u_audio.z);',
    ' float wide=smoothstep(1.05,1.65,u_res.x/u_res.y);',
    ' vec2 p=(uv-vec2(.20*wide,0.))*(1.14-.09*min(ba,1.)); float r=length(p);',
    ' float a=atan(p.y,p.x)+T*.045; float seg=.39269908;',
    ' a=mod(a,2.*seg); a=abs(a-seg);',
    ' vec2 k=vec2(cos(a),sin(a))*r;',
    ' float glass=fbm(k*3.7+vec2(T*.085,-T*.061));',
    ' k+=.105*vec2(sin(glass*6.283+T*.18),cos(glass*5.1-T*.15))*(.40+.72*mi);',
    ' vec3 ax=abs(fract(vec3(k.x,dot(k,vec2(.5,.8660254)),dot(k,vec2(-.5,.8660254)))*11.5+glass*.20)-.5);',
    ' float fd=min(ax.x,min(ax.y,ax.z)); float bevel=exp(-fd*46.); float hair=exp(-fd*145.);',
    ' vec2 k2=mat2(.8660254,-.5,.5,.8660254)*k;',
    ' vec3 bx=abs(fract(vec3(k2.x,dot(k2,vec2(.5,.8660254)),dot(k2,vec2(-.5,.8660254)))*5.75-glass*.13)-.5);',
    ' float bd=min(bx.x,min(bx.y,bx.z)); float deep=exp(-bd*31.);',
    ' vec2 cell=floor(k2*5.75)+vec2(16000.); float face=ih(uvec2(ivec2(cell)));',
    ' vec3 crystal=mix(vec3(.025,.32,1.),vec3(.74,.025,1.),.5+.5*sin(glass*6.2+a*8.+r*5.));',
    ' crystal=mix(crystal,pal(glass*.22+r*.18+T*.008),.16);',
    ' vec3 col=crystal*(.010+(.025+.060*face)*(1.-bevel))*(.7+.55*mi);',
    ' col+=crystal*(bevel*(.20+.52*mi+.35*ba)+deep*(.05+.24*mi));',
    ' col+=mix(vec3(.16,.78,1.),vec3(.92,.20,1.),.5+.5*sin(a*9.+glass*4.))*hair*(.04+.42*tr);',
    ' vec3 dispersion=vec3(.04,.62,1.)*exp(-ax.x*115.)+vec3(1.,.035,.62)*exp(-ax.y*115.)+vec3(1.,.48,.025)*exp(-ax.z*115.);',
    ' col+=dispersion*(.018+.18*tr+.055*mi);',
    ' float caustic=pow(max(0.,cos(dot(k,vec2(31.,-23.))-T*1.7+glass*6.)),28.)*bevel;',
    ' col+=vec3(1.,.88,.58)*caustic*(.06+1.28*tr);',
    ' float core=exp(-r*r*(10.-4.5*min(ba,1.)));',
    ' float star=pow(max(0.,cos(a*8.)),22.)*exp(-r*4.2);',
    ' col+=mix(vec3(.12,.66,1.),vec3(1.,.24,.82),.5+.5*sin(a*6.))*core*(.04+.64*ba);',
    ' col+=vec3(.92,.97,1.)*star*(.02+.42*ba+.56*tr);',
    ' col*=1.-smoothstep(.86,1.38,r);',
    ' return sat(col,1.65);}',

    // SIGNAL: a stack of impossible laser waveforms caught in video feedback.
    // Bass displaces the traces, mids multiply echoes, treble burns white peaks.
    'vec3 sceneSignal(vec2 uv,float T){',
    ' float ba=drv(u_audio.x),mi=drv(u_audio.y),tr=drv(u_audio.z);',
    ' vec2 p=uv; p.x+=.042*sin(p.y*5.+T*.16);',
    ' vec3 col=vec3(.002,.004,.012);',
    ' float gridX=exp(-abs(fract((p.x+p.y*.035+T*.018)*12.)-.5)*38.);',
    ' float gridY=exp(-abs(fract((p.y-p.x*.018-T*.012)*10.)-.5)*38.);',
    ' col+=vec3(.05,.28,.42)*(gridX+gridY)*(.010+.028*mi);',
    ' float traceMask=0.;',
    ' for(int i=0;i<10;i++){',
    '  float fi=float(i); float z=fi/9.; float freq=2.05+fi*.36;',
    '  float amp=.075+.028*sin(fi*1.7)+.040*min(ba,1.);',
    '  float y=(z-.5)*1.02+amp*sin(p.x*freq*3.+T*(.50+z*.72)+fi);',
    '  y+=.032*sin(p.x*18.5-T*1.08+fi*2.1)*(1.+.85*mi);',
    '  y+=.050*sin(T*.62+fi)*ba;',
    '  float d=abs(p.y-y);',
    '  float halo=exp(-d*17.); float beam=exp(-d*(90.+55.*min(tr,1.5)));',
    '  float core=exp(-d*(210.+100.*min(tr,1.5)));',
    '  float ex=p.x*1.035+.012; float Te=T-.16;',
    '  float ey=(z-.5)*1.02+amp*sin(ex*freq*3.+Te*(.50+z*.72)+fi);',
    '  ey+=.032*sin(ex*18.5-Te*1.08+fi*2.1)*(1.+.85*mi)+.050*sin(Te*.62+fi)*ba;',
    '  float echo=exp(-abs(p.y*1.025-.01-ey)*28.);',
    '  float alternate=.5+.5*sin(fi*2.399); vec3 laser=mix(vec3(.01,.34,1.),vec3(1.,.015,.42),alternate); laser=mix(laser,pal(z*.45+p.x*.06+T*.010),.10);',
    '  col+=laser*(halo*(.035+.18*mi)+beam*(.16+.54*ba+.34*tr)+echo*(.022+.18*mi));',
    '  col+=vec3(.82,.96,1.)*core*(.018+.14*tr+.06*ba);',
    '  float node=pow(max(0.,cos(p.x*24.-T*1.9+fi*1.37)),30.)*core;',
    '  col+=vec3(1.,.90,.98)*node*(.020+.55*tr);',
    '  traceMask=max(traceMask,beam+.16*halo);',
    ' }',
    ' float scanPh=fract(T*.135); float pulse=exp(-abs(p.x-mix(-1.3,1.3,scanPh))*42.);',
    ' col+=vec3(.72,.92,1.)*pulse*traceMask*(.025+.52*tr);',
    ' return sat(col,1.7);}',

    // VOID: liquid-chrome gravity lens. Bass grows the event horizon, mids twist
    // the accretion flow, and treble tears sparks from the rim.
    'vec3 sceneVoid(vec2 uv,float T){',
    ' float ba=drv(u_audio.x),mi=drv(u_audio.y),tr=drv(u_audio.z);',
    ' float wide=smoothstep(1.05,1.65,u_res.x/u_res.y); vec2 p=uv-vec2(.23*wide,.01);',
    ' float ct=cos(.09),st=sin(.09); vec2 d=mat2(ct,-st,st,ct)*p;',
    ' float r=length(p); float a=atan(p.y,p.x); float pulse=.5+.5*sin(T*.55);',
    ' float horizon=.148+.038*min(ba,1.)+.018*(pulse-.5);',
    ' float lens=1./max(r,.055); float swirl=a+1.35*lens+T*.13+mi*sin(r*11.-T*.38);',
    ' vec2 dp=vec2(d.x,d.y/.235); float dr=length(dp),da=atan(dp.y,dp.x);',
    ' float ann=smoothstep(.24,.34,dr)*(1.-smoothstep(.96,1.18,dr));',
    ' float flow=pow(.5+.5*sin(da*3.-dr*38.+T*1.22+mi*sin(dr*9.-T*.31)),3.);',
    ' float braid=pow(.5+.5*cos(da*7.+dr*25.-T*.74),8.);',
    ' float dop=.5+.5*cos(da); vec3 cool=vec3(.025,.30,1.); vec3 hot=vec3(1.,.17,.025);',
    ' vec3 diskCol=mix(cool,hot,dop); diskCol=mix(diskCol,pal(da/6.28318+dr*.18+T*.009),.22);',
    ' vec3 diskLight=diskCol*ann*(.10+.88*flow+.18*braid)*(.26+.74*mi+.58*ba);',
    ' float inner=exp(-abs(dr-.30)*31.)*ann; vec3 innerLight=mix(vec3(.22,.64,1.),vec3(1.,.64,.16),dop)*inner*(.08+.68*ba);',
    ' vec3 ringLight=diskLight+innerLight; vec3 col=ringLight;',
    ' vec2 lp=p*(1.+(.045+.025*min(ba,1.))/(r*r+.035));',
    ' vec2 gp=lp*32.+vec2(T*.018,-T*.011); vec2 cell=floor(gp),fr=fract(gp)-.5;',
    ' float h1=ih(uvec2(ivec2(cell)+12000));',
    ' float h2=ih(uvec2(ivec2(cell)+23000));',
    ' vec2 sp=(vec2(h1,h2)-.5)*.56; float star=exp(-dot(fr-sp,fr-sp)*240.)*step(.966,h1);',
    ' star*=smoothstep(horizon*1.55,horizon*2.0,r)*(1.-smoothstep(1.02,1.48,r));',
    ' col+=mix(vec3(.25,.62,1.),vec3(1.,.48,.20),h2)*star*(.04+.75*tr);',
    ' float photonR=horizon*1.42+.014*sin(a*3.-T*.31); float pd=abs(r-photonR);',
    ' float photon=exp(-pd*32.),razor=exp(-pd*150.);',
    ' float caustic=.3+.7*pow(.5+.5*cos(a*7.+swirl*1.3-T*.4),10.);',
    ' col+=vec3(.014,.004,.030)*exp(-abs(r-horizon*3.4)*4.8)*(.18+.65*mi);',
    // Mask the planet, then restore only the near half of the ring across it.
    ' float planetMask=smoothstep(horizon*.96,horizon*1.04,r); col*=planetMask;',
    ' vec2 globe=p/max(horizon,.001); float globeR=dot(globe,globe);',
    ' float nz=sqrt(max(0.,1.-globeR)); vec3 normal=vec3(globe,nz);',
    ' float lon=atan(normal.x,normal.z)+T*.055; float lat=asin(clamp(normal.y,-1.,1.));',
    ' float gasWarp=fbm3(vec2(lon*1.35,lat*4.2)+vec2(T*.035,-T*.018));',
    ' float gasFine=vnoise(vec2(lon*4.6+gasWarp*2.2-T*.028,lat*10.5+gasWarp*3.));',
    ' float bands=smoothstep(.18,.92,.5+.5*sin(lat*21.+gasWarp*6.+T*.24));',
    ' float storms=smoothstep(.50,.78,gasFine+.22*bands);',
    ' vec3 lightDir=normalize(vec3(.58,.30,.76)); vec3 halfDir=normalize(lightDir+vec3(0.,0.,1.));',
    ' float diffuse=clamp(dot(normal,lightDir),.035,1.); float specular=pow(clamp(dot(normal,halfDir),0.,1.),36.);',
    ' float limb=pow(max(0.,1.-nz),2.1); float warm=smoothstep(-.45,.65,normal.x);',
    ' vec3 deep=mix(vec3(.004,.012,.035),vec3(.025,.006,.012),warm);',
    ' vec3 cloud=mix(vec3(.025,.32,.52),vec3(.95,.16,.025),warm);',
    ' vec3 planet=deep*(.35+.80*diffuse);',
    ' planet+=cloud*(bands*.55+storms*.75)*(.035+.22*diffuse)*(.65+.35*pulse);',
    ' planet+=vec3(.65,.82,1.)*specular*(.04+.12*tr);',
    ' planet+=mix(vec3(.03,.35,.65),vec3(.75,.08,.04),warm)*limb*(.035+.12*ba);',
    ' col+=planet*(1.-planetMask);',
    ' float atmosphere=exp(-abs(r-horizon)*105.);',
    ' col+=mix(vec3(.035,.42,.72),vec3(.92,.12,.025),.5+.5*cos(a))*atmosphere*(.018+.10*ba);',
    ' float nearSide=1.-smoothstep(-.025,.018,d.y);',
    ' col+=ringLight*nearSide*(1.-planetMask);',
    ' col+=mix(vec3(.10,.70,1.),vec3(1.,.34,.06),.5+.5*cos(a))*photon*(.035+.26*mi+.25*ba);',
    ' col+=vec3(.92,.97,1.)*razor*caustic*(.025+.74*tr+.22*ba);',
    ' return sat(col,1.6);}',

    // RIFT: a bass-warped polar tunnel. Low end opens the throat, mids bend the
    // geometry, and treble fires cold sparks down its vanishing point.
    'vec3 sceneRift(vec2 uv,float T){',
    ' float wide=smoothstep(1.05,1.65,u_res.x/u_res.y); vec2 p=uv-vec2(.22*wide,.01);',
    ' float r=length(p),a=atan(p.y,p.x);',
    ' float ba=1.-exp(-1.45*drv(u_audio.x)),mi=1.-exp(-1.15*drv(u_audio.y)),tr=1.-exp(-1.30*drv(u_audio.z));',
    ' vec2 dir=p/max(r,.0001);',
    ' float base=-log(r+.030)*3.55+T*.50+.16*sin(a*3.-T*.18)+.045*sin(a*11.+T*.11);',
    ' float gn=vnoise(dir*8.+vec2(base*.19,-base*.13)+vec2(T*.045,-T*.030));',
    ' float dep=base+(gn-.5)*(.18+.20*mi);',
    ' float rings=exp(-abs(fract(dep*.19)-.5)*48.);',
    ' float ghost=exp(-abs(fract(dep*.113+.14*sin(a*4.))-.5)*28.);',
    ' float spokes=exp(-abs(sin(a*6.+dep*1.55+.25*sin(dep*.7)-T*.10))*13.);',
    ' float mask=smoothstep(.045,.20,r)*(1.-smoothstep(1.18,1.70,r));',
    ' vec3 col=vec3(.0015,.003,.012);',
    ' vec3 neon=mix(vec3(.025,.22,1.),vec3(1.,.018,.48),.5+.5*sin(a*2.+dep*.7));',
    ' neon=mix(neon,pal(a/6.28318+dep*.030),.24);',
    ' float panels=.18+.82*smoothstep(-.45,.85,sin(a*6.-dep*.62));',
    ' col+=neon*(rings*.92+ghost*.36+spokes*.48)*mask*panels*(.16+.70*ba+.42*mi);',
    ' col+=mix(vec3(.012,.05,.20),neon,.35)*mask*(.025+.11*gn+.08*mi);',
    ' float ph=fract(T*.12),life=smoothstep(0.,.10,ph)*(1.-smoothstep(.78,1.,ph));',
    ' float shockR=mix(.12,1.22,ph); float shock=exp(-abs(r-shockR)*55.)*life*(.25+.75*ba);',
    ' col+=vec3(.92,.72,1.)*shock*(.10+.72*ba);',
    ' float gn2=vnoise(dir*11.+vec2(dep*.23,-dep*.17)+vec2(-T*.031,T*.041));',
    ' float glint=smoothstep(.76,.94,gn2)*spokes*mask;',
    ' col+=vec3(.68,.94,1.)*glint*(.03+1.12*tr);',
    ' float horizonD=r-(.125+.040*ba);',
    ' col+=mix(vec3(.18,.56,1.),vec3(1.,.18,.66),.5+.5*sin(a*3.))*lineAA(horizonD,.004)*( .10+.72*ba);',
    ' return sat(col,1.55);}',

    // CATHEDRAL: impossible luminous frames advancing through a black chamber.
    // Bass widens the architecture, mids color the glass, treble sharpens its ribs.
    'vec3 sceneCathedral(vec2 uv,float T){',
    ' float ba=1.-exp(-1.45*drv(u_audio.x)),mi=1.-exp(-1.15*drv(u_audio.y)),tr=1.-exp(-1.30*drv(u_audio.z));',
    ' float wide=smoothstep(1.05,1.65,u_res.x/u_res.y); float turn=.045*sin(T*.11)+.018*sin(T*.27);',
    ' float ct=cos(turn),st=sin(turn); vec2 p=mat2(ct,-st,st,ct)*uv; p.x+=.05*sin(T*.08)-.22*wide;',
    ' vec3 col=vec3(.002,.004,.014);',
    ' for(int i=0;i<8;i++){',
    '  float fi=float(i),ph=fract(fi*.125+T*.028); float life=smoothstep(0.,.10,ph)*(1.-smoothstep(.76,1.,ph));',
    '  float sc=mix(.48,8.6,ph*ph); vec2 q=p*sc; q.x+=.055*sin(T*.13+fi*.83)*(1.-ph);',
    '  float w=.58+.045*ba,spring=-.08,apex=spring+1.7320508*w; float sx=q.x>=0.?1.:-1.;',
    '  float sideD=abs(abs(q.x)-w),arcD=abs(length(q-vec2(-sx*w,spring))-2.*w);',
    '  float sideMask=smoothstep(-.82,-.76,q.y)*(1.-smoothstep(spring-.02,spring+.02,q.y));',
    '  float arcMask=smoothstep(spring-.02,spring+.02,q.y)*(1.-smoothstep(apex-.02,apex+.02,q.y))*(1.-smoothstep(w,w+.03,abs(q.x)));',
    '  float core=(lineAA(sideD,.0025*sc)*sideMask+lineAA(arcD,.0025*sc)*arcMask)*life;',
    '  float halo=(exp(-sideD*(28./sc))*sideMask+exp(-arcD*(28./sc))*arcMask)*life;',
    '  vec3 glass=mix(vec3(.04,.20,.92),vec3(.92,.035,.48),.5+.5*sin(ph*5.4+q.y*.12)); glass=mix(glass,pal(ph*.35+T*.008),.18);',
    '  col+=glass*(halo*(.018+.10*mi)+core*(.055+.17*mi+.14*ba));',
    '  float inside=(1.-smoothstep(w-.025,w+.02,abs(q.x)))*sideMask;',
    '  float bar=lineAA(q.y-(spring-.28),.0018*sc)*inside*life;',
    '  col+=vec3(.86,.72,.30)*bar*(.018+.15*tr);',
    ' }',
    ' vec2 rp=p-vec2(0.,.10); float pr=length(rp),pa=atan(rp.y,rp.x);',
    ' float rose=lineAA(pr-.215,.003)+.72*lineAA(pr-.105,.0025);',
    ' float spokeD=abs(sin(pa*12.+T*.015))*pr; float spokes=lineAA(spokeD,.0025)*smoothstep(.035,.055,pr)*(1.-smoothstep(.205,.22,pr));',
    ' float pane=(1.-smoothstep(.205,.22,pr))*(.35+.65*pow(.5+.5*cos(pa*12.+pr*58.),6.));',
    ' vec3 roseCol=mix(vec3(.08,.38,1.),vec3(1.,.06,.42),.5+.5*sin(pa*4.));',
    ' col+=roseCol*pane*(.018+.10*mi); col+=mix(roseCol,vec3(1.,.82,.42),.35)*(rose+spokes)*(.04+.30*tr+.10*mi);',
    ' float floorMask=1.-smoothstep(-.68,-.06,p.y);',
    ' float floorRay=exp(-abs(sin(atan(p.x,p.y+.82)*11.))*16.)*floorMask;',
    ' float floorStep=exp(-abs(fract(1./(abs(p.y)+.15)+T*.035)-.5)*24.)*floorMask;',
    ' col+=mix(vec3(.025,.18,.55),vec3(.48,.06,.44),.5+.5*sin(p.x*4.))*(floorRay*.13+floorStep*.08)*(.07+.32*mi);',
    ' float altar=exp(-dot(p,vec2(p.x,p.y*.75))*(20.-8.*ba)); col+=vec3(1.,.70,.25)*altar*(.025+.30*ba);',
    ' return sat(col,1.45);}',

    // NOVA: a stellar detonation held at the instant of impact. Bass expands the
    // core, mids twist the corona, and treble turns its rim into razor-light.
    'vec3 sceneNova(vec2 uv,float T){',
    ' float ba=1.-exp(-1.45*drv(u_audio.x)),mi=1.-exp(-1.15*drv(u_audio.y)),tr=1.-exp(-1.30*drv(u_audio.z));',
    ' float wide=smoothstep(1.05,1.65,u_res.x/u_res.y); float rr=.045*T,cr=cos(rr),sr=sin(rr);',
    ' vec2 p=mat2(cr,-sr,sr,cr)*(uv-vec2(.23*wide,0.)); float r=length(p),a=atan(p.y,p.x);',
    ' float n=fbm3(p*3.6+vec2(T*.045,-T*.032)); float curl=vnoise(p*7.2+vec2(-T*.028,T*.041)+7.4);',
    ' float rd=max(0.,r+(.055+.045*mi)*(n-.5)+.025*(curl-.5));',
    ' float fil=.5+.5*cos(rd*(34.+5.*mi)-T*1.55+(n-.5)*8.); fil*=fil;',
    ' float corona=exp(-rd*(2.25-.55*ba))*(.12+.88*fil);',
    ' float rf=.58+.25*sin(a*13.+r*8.+n*6.-T*.12)+.17*sin(a*29.-r*5.+curl*5.+T*.09);',
    ' float rays=smoothstep(.72,.93,rf)*exp(-r*(1.42-.25*ba))*smoothstep(.08,.18,r);',
    ' float core=exp(-rd*rd/(.012+.014*ba)),hotCore=exp(-rd*rd/.0045);',
    ' vec3 coronaCol=mix(vec3(1.,.17,.035),vec3(.72,.035,1.),smoothstep(.16,.78,r)); coronaCol=mix(coronaCol,pal(a/6.28318+r*.17+T*.008),.20);',
    ' vec3 col=coronaCol*corona*(.10+.42*mi+.34*ba);',
    ' col+=mix(vec3(1.,.52,.08),vec3(.42,.10,1.),.5+.5*sin(a*5.))*rays*(.035+.78*tr+.20*ba);',
    ' float shockD=r-(.30+.14*ba+.018*sin(a*5.-T*.25)+.018*(n-.5));',
    ' float shock=(lineAA(shockD,.004)+.22*exp(-abs(shockD)*15.))*ba;',
    ' col+=mix(vec3(1.,.38,.06),vec3(.70,.12,1.),.5+.5*sin(a*3.))*shock*(.08+.70*ba);',
    ' float cross=(exp(-abs(p.x)*82.)+exp(-abs(p.y)*82.))*exp(-r*5.5);',
    ' col+=vec3(1.,.84,.58)*core*(.12+.92*ba)+vec3(1.,.98,.92)*hotCore*(.08+.72*ba);',
    ' col+=vec3(.85,.94,1.)*cross*(.015+.34*tr);',
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
    ' col=hueShift(col,u_hue);',
    ' col*=mix(.86,1.16,u_glow);',                            // a touch of exposure
    ' col=sat(col,mix(.55,1.85,u_glow));',                   // glow is vibrance: colors bloom
    ' col=max(col,vec3(0.));',
    ' col=clamp((col*(2.51*col+.03))/(col*(2.43*col+.59)+.14),0.,1.);',
    ' col=pow(col,vec3(0.4545));',
    // vignette so the headline stays readable
    ' vec2 q=gl_FragCoord.xy/u_res; col*=0.72+0.28*pow(16.*q.x*q.y*(1.-q.x)*(1.-q.y),.28);',
    ' col=clamp(col+(ih(uvec2(gl_FragCoord.xy))-.5)/255.,0.,1.);',
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
    var DETENT_COUNT = 7;
    var LAST_DETENT = DETENT_COUNT - 1;
    var knobV = key === 'hue' ? 0 : S[key];
    var def = knobV;
    function setV(v, announce) {
      v = Math.max(0, Math.min(1, v));
      v = Math.round(v * LAST_DETENT) / LAST_DETENT;
      knobV = v;
      // Seven unique hues: the final detent is 6/7 of a turn, not a duplicate 360°.
      S[key] = key === 'hue' ? Math.round(v * LAST_DETENT) / DETENT_COUNT : v;
      var deg = -135 + v * 270;
      dial.style.transform = 'rotate(' + deg + 'deg)';
      var display = fmt ? fmt(v) : Math.round(v * 100);
      out.textContent = display;
      el.setAttribute('aria-valuenow', Math.round(v * 100));
      el.setAttribute('aria-valuetext', fmt ? display : display + ' percent');
      trace.style.strokeDasharray = (v * 75) + ' 100';
      if (announce && window.ikandyTrack) window.ikandyTrack('hero_knob', { knob: key });
      renderStill();
    }
    setV(def);
    var dragging = false, startY = 0, startV = 0, moved = false;
    el.addEventListener('pointerdown', function (e) {
      dragging = true; moved = false; startY = e.clientY; startV = knobV;
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
      // One wheel notch advances exactly one of the seven board markings.
      setV(knobV + (e.deltaY < 0 ? 1 : -1) / LAST_DETENT);
    }, { passive: false });
    el.addEventListener('keydown', function (e) {
      var step = 1 / LAST_DETENT;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setV(knobV + step); e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setV(knobV - step); e.preventDefault(); }
      if (e.key === 'Home') { setV(0); e.preventDefault(); }
      if (e.key === 'End') { setV(1); e.preventDefault(); }
    });
  }
  makeKnob('k-react', 'react');
  makeKnob('k-glow', 'glow');
  makeKnob('k-speed', 'speed');
  makeKnob('k-hue', 'hue', function (v) { return Math.round(Math.round(v * 6) * (360 / 7)) + '\u00b0'; });

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
      renderStill();
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
  function follow(value, target, attack, release, dt) {
    var tau = target > value ? attack : release;
    return value + (target - value) * (1 - Math.exp(-dt / tau));
  }
  function renderStill() {
    if (renderReady && reduced && S.running && S.visible) frame(performance.now());
  }
  function frame(now) {
    rafId = 0;
    if (!S.running || !S.visible) { S.last = now; return; }
    var dt = Math.min(0.05, (now - (S.last || now)) / 1000); S.last = now;
    S.t += dt;                                        // music clock: tempo never changes
    if (!reduced) S.ph += dt * (0.25 + S.speed * 1.5); // visual clock: SPEED sets velocity, not position

    var a = demoSignal(S.t);   // visuals always ride the demo program; SOUND is ears only
    a[1] = Math.min(1, a[1] * 1.2); a[2] = Math.min(1, a[2] * 1.35);
    // ease so light breathes instead of strobing
    smB = follow(smB, a[0], 0.012, 0.11, dt);
    smM = follow(smM, a[1], 0.045, 0.18, dt);
    smT = follow(smT, a[2], 0.008, 0.075, dt);
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
  renderReady = true;
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
