/* IKANDY homepage WebGPU scenes.
 * Rift, Cathedral, and Nova run as WGSL when WebGPU is available. The matching
 * WebGL2 implementations in hero.js remain the compatibility fallback.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('hero-wgpu');
  var glCanvas = document.getElementById('hero-gl');
  var badge = document.getElementById('hero-renderer');
  var state = window.IKANDY_HERO_STATE;
  if (!canvas || !glCanvas || !state || !navigator.gpu) return;

  var shader = `
struct Uniforms {
  res: vec2<f32>,
  time: f32,
  mode: f32,
  audio: vec4<f32>,
  controls: vec4<f32>,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOut { @builtin(position) position: vec4<f32> }

@vertex fn vsMain(@builtin(vertex_index) index: u32) -> VertexOut {
  var points = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0)
  );
  var out: VertexOut;
  out.position = vec4<f32>(points[index], 0.0, 1.0);
  return out;
}

fn hash21(p: vec2<f32>) -> f32 {
  return fract(sin(dot(p, vec2<f32>(127.1, 311.7))) * 43758.5453123);
}

fn noise21(p: vec2<f32>) -> f32 {
  let i = floor(p);
  var f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2<f32>(1.0, 0.0)), f.x),
             mix(hash21(i + vec2<f32>(0.0, 1.0)), hash21(i + vec2<f32>(1.0, 1.0)), f.x), f.y);
}

fn fbm3(pp: vec2<f32>) -> f32 {
  var p = pp;
  var value = 0.5714286 * noise21(p);
  p = p * 2.03 + vec2<f32>(17.7, 9.3);
  value += 0.2857143 * noise21(p);
  p = p * 2.03 + vec2<f32>(17.7, 9.3);
  return value + 0.1428571 * noise21(p);
}

fn palette(t: f32) -> vec3<f32> {
  let phase = vec3<f32>(0.0, 0.33, 0.67);
  return vec3<f32>(0.5) + vec3<f32>(0.5) * cos(vec3<f32>(6.2831853) * (vec3<f32>(t) + phase));
}

fn drive(a: f32) -> f32 {
  return pow(max(a, 0.0), mix(2.0, 0.85, u.controls.z)) * mix(0.5, 1.9, u.controls.z);
}

fn saturateColor(c: vec3<f32>, amount: f32) -> vec3<f32> {
  let luma = dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
  return max(vec3<f32>(0.0), mix(vec3<f32>(luma), c, amount));
}

fn hueShift(c: vec3<f32>, h: f32) -> vec3<f32> {
  let angle = 6.2831853 * h;
  let co = cos(angle);
  let si = sin(angle);
  let axis = vec3<f32>(0.57735027);
  return max(vec3<f32>(0.0), c * co + cross(axis, c) * si + axis * dot(axis, c) * (1.0 - co));
}

fn lineAA(d: f32, width: f32) -> f32 {
  let aa = max(fwidth(d), 1.25 / u.res.y);
  return 1.0 - smoothstep(width, width + 1.5 * aa, abs(d));
}

fn rift(uv: vec2<f32>) -> vec3<f32> {
  let wide = smoothstep(1.05, 1.65, u.res.x / u.res.y);
  let p = uv - vec2<f32>(0.22 * wide, 0.01);
  let r = length(p);
  let a = atan2(p.y, p.x);
  let bass = 1.0 - exp(-1.45 * drive(u.audio.x));
  let mids = 1.0 - exp(-1.15 * drive(u.audio.y));
  let treble = 1.0 - exp(-1.30 * drive(u.audio.z));
  let dir = p / max(r, 0.0001);
  let base = -log(r + 0.030) * 3.55 + u.time * 0.50 + 0.16 * sin(a * 3.0 - u.time * 0.18) + 0.045 * sin(a * 11.0 + u.time * 0.11);
  let gn = noise21(dir * 8.0 + vec2<f32>(base * 0.19, -base * 0.13) + vec2<f32>(u.time * 0.045, -u.time * 0.030));
  let depth = base + (gn - 0.5) * (0.18 + 0.20 * mids);
  let rings = exp(-abs(fract(depth * 0.19) - 0.5) * 48.0);
  let ghost = exp(-abs(fract(depth * 0.113 + 0.14 * sin(a * 4.0)) - 0.5) * 28.0);
  let spokes = exp(-abs(sin(a * 6.0 + depth * 1.55 + 0.25 * sin(depth * 0.7) - u.time * 0.10)) * 13.0);
  let mask = smoothstep(0.045, 0.20, r) * (1.0 - smoothstep(1.18, 1.70, r));
  var col = vec3<f32>(0.0015, 0.003, 0.012);
  var neon = mix(vec3<f32>(0.025, 0.22, 1.0), vec3<f32>(1.0, 0.018, 0.48), 0.5 + 0.5 * sin(a * 2.0 + depth * 0.7));
  neon = mix(neon, palette(a / 6.2831853 + depth * 0.030), 0.24);
  let panels = 0.18 + 0.82 * smoothstep(-0.45, 0.85, sin(a * 6.0 - depth * 0.62));
  col += neon * (rings * 0.92 + ghost * 0.36 + spokes * 0.48) * mask * panels * (0.16 + 0.70 * bass + 0.42 * mids);
  col += mix(vec3<f32>(0.012, 0.05, 0.20), neon, 0.35) * mask * (0.025 + 0.11 * gn + 0.08 * mids);
  let phase = fract(u.time * 0.12);
  let life = smoothstep(0.0, 0.10, phase) * (1.0 - smoothstep(0.78, 1.0, phase));
  let shockRadius = mix(0.12, 1.22, phase);
  let shock = exp(-abs(r - shockRadius) * 55.0) * life * (0.25 + 0.75 * bass);
  col += vec3<f32>(0.92, 0.72, 1.0) * shock * (0.10 + 0.72 * bass);
  let gn2 = noise21(dir * 11.0 + vec2<f32>(depth * 0.23, -depth * 0.17) + vec2<f32>(-u.time * 0.031, u.time * 0.041));
  let glint = smoothstep(0.76, 0.94, gn2) * spokes * mask;
  col += vec3<f32>(0.68, 0.94, 1.0) * glint * (0.03 + 1.12 * treble);
  let horizonD = r - (0.125 + 0.040 * bass);
  col += mix(vec3<f32>(0.18, 0.56, 1.0), vec3<f32>(1.0, 0.18, 0.66), 0.5 + 0.5 * sin(a * 3.0)) * lineAA(horizonD, 0.004) * (0.10 + 0.72 * bass);
  return saturateColor(col, 1.55);
}

fn cathedral(uv: vec2<f32>) -> vec3<f32> {
  let bass = 1.0 - exp(-1.45 * drive(u.audio.x));
  let mids = 1.0 - exp(-1.15 * drive(u.audio.y));
  let treble = 1.0 - exp(-1.30 * drive(u.audio.z));
  let wide = smoothstep(1.05, 1.65, u.res.x / u.res.y);
  let turn = 0.045 * sin(u.time * 0.11) + 0.018 * sin(u.time * 0.27);
  let ct = cos(turn);
  let st = sin(turn);
  var p = mat2x2<f32>(ct, -st, st, ct) * uv;
  p.x += 0.05 * sin(u.time * 0.08) - 0.22 * wide;
  var col = vec3<f32>(0.002, 0.004, 0.014);
  for (var i: i32 = 0; i < 8; i = i + 1) {
    let fi = f32(i);
    let phase = fract(fi * 0.125 + u.time * 0.028);
    let life = smoothstep(0.0, 0.10, phase) * (1.0 - smoothstep(0.76, 1.0, phase));
    let scale = mix(0.48, 8.6, phase * phase);
    var q = p * scale;
    q.x += 0.055 * sin(u.time * 0.13 + fi * 0.83) * (1.0 - phase);
    let width = 0.58 + 0.045 * bass;
    let spring = -0.08;
    let apex = spring + 1.7320508 * width;
    var sx = -1.0;
    if (q.x >= 0.0) { sx = 1.0; }
    let sideD = abs(abs(q.x) - width);
    let arcD = abs(length(q - vec2<f32>(-sx * width, spring)) - 2.0 * width);
    let sideMask = smoothstep(-0.82, -0.76, q.y) * (1.0 - smoothstep(spring - 0.02, spring + 0.02, q.y));
    let arcMask = smoothstep(spring - 0.02, spring + 0.02, q.y) * (1.0 - smoothstep(apex - 0.02, apex + 0.02, q.y)) * (1.0 - smoothstep(width, width + 0.03, abs(q.x)));
    let core = (lineAA(sideD, 0.0025 * scale) * sideMask + lineAA(arcD, 0.0025 * scale) * arcMask) * life;
    let halo = (exp(-sideD * (28.0 / scale)) * sideMask + exp(-arcD * (28.0 / scale)) * arcMask) * life;
    var glass = mix(vec3<f32>(0.04, 0.20, 0.92), vec3<f32>(0.92, 0.035, 0.48), 0.5 + 0.5 * sin(phase * 5.4 + q.y * 0.12));
    glass = mix(glass, palette(phase * 0.35 + u.time * 0.008), 0.18);
    col += glass * (halo * (0.018 + 0.10 * mids) + core * (0.055 + 0.17 * mids + 0.14 * bass));
    let inside = (1.0 - smoothstep(width - 0.025, width + 0.02, abs(q.x))) * sideMask;
    let bar = lineAA(q.y - (spring - 0.28), 0.0018 * scale) * inside * life;
    col += vec3<f32>(0.86, 0.72, 0.30) * bar * (0.018 + 0.15 * treble);
  }
  let rp = p - vec2<f32>(0.0, 0.10);
  let roseRadius = length(rp);
  let roseAngle = atan2(rp.y, rp.x);
  let rose = lineAA(roseRadius - 0.215, 0.003) + 0.72 * lineAA(roseRadius - 0.105, 0.0025);
  let spokeD = abs(sin(roseAngle * 12.0 + u.time * 0.015)) * roseRadius;
  let roseSpokes = lineAA(spokeD, 0.0025) * smoothstep(0.035, 0.055, roseRadius) * (1.0 - smoothstep(0.205, 0.22, roseRadius));
  let pane = (1.0 - smoothstep(0.205, 0.22, roseRadius)) * (0.35 + 0.65 * pow(0.5 + 0.5 * cos(roseAngle * 12.0 + roseRadius * 58.0), 6.0));
  let roseCol = mix(vec3<f32>(0.08, 0.38, 1.0), vec3<f32>(1.0, 0.06, 0.42), 0.5 + 0.5 * sin(roseAngle * 4.0));
  col += roseCol * pane * (0.018 + 0.10 * mids);
  col += mix(roseCol, vec3<f32>(1.0, 0.82, 0.42), 0.35) * (rose + roseSpokes) * (0.04 + 0.30 * treble + 0.10 * mids);
  let floorMask = 1.0 - smoothstep(-0.68, -0.06, p.y);
  let floorRay = exp(-abs(sin(atan2(p.x, p.y + 0.82) * 11.0)) * 16.0) * floorMask;
  let floorStep = exp(-abs(fract(1.0 / (abs(p.y) + 0.15) + u.time * 0.035) - 0.5) * 24.0) * floorMask;
  col += mix(vec3<f32>(0.025, 0.18, 0.55), vec3<f32>(0.48, 0.06, 0.44), 0.5 + 0.5 * sin(p.x * 4.0)) * (floorRay * 0.13 + floorStep * 0.08) * (0.07 + 0.32 * mids);
  let altar = exp(-dot(p, vec2<f32>(p.x, p.y * 0.75)) * (20.0 - 8.0 * bass));
  col += vec3<f32>(1.0, 0.70, 0.25) * altar * (0.025 + 0.30 * bass);
  return saturateColor(col, 1.45);
}

fn nova(uv: vec2<f32>) -> vec3<f32> {
  let bass = 1.0 - exp(-1.45 * drive(u.audio.x));
  let mids = 1.0 - exp(-1.15 * drive(u.audio.y));
  let treble = 1.0 - exp(-1.30 * drive(u.audio.z));
  let wide = smoothstep(1.05, 1.65, u.res.x / u.res.y);
  let rotation = 0.045 * u.time;
  let cr = cos(rotation);
  let sr = sin(rotation);
  let p = mat2x2<f32>(cr, -sr, sr, cr) * (uv - vec2<f32>(0.23 * wide, 0.0));
  let r = length(p);
  let a = atan2(p.y, p.x);
  let n = fbm3(p * 3.6 + vec2<f32>(u.time * 0.045, -u.time * 0.032));
  let curl = noise21(p * 7.2 + vec2<f32>(-u.time * 0.028, u.time * 0.041) + vec2<f32>(7.4));
  let rd = max(0.0, r + (0.055 + 0.045 * mids) * (n - 0.5) + 0.025 * (curl - 0.5));
  var filament = 0.5 + 0.5 * cos(rd * (34.0 + 5.0 * mids) - u.time * 1.55 + (n - 0.5) * 8.0);
  filament *= filament;
  let corona = exp(-rd * (2.25 - 0.55 * bass)) * (0.12 + 0.88 * filament);
  let rayField = 0.58 + 0.25 * sin(a * 13.0 + r * 8.0 + n * 6.0 - u.time * 0.12) + 0.17 * sin(a * 29.0 - r * 5.0 + curl * 5.0 + u.time * 0.09);
  let rays = smoothstep(0.72, 0.93, rayField) * exp(-r * (1.42 - 0.25 * bass)) * smoothstep(0.08, 0.18, r);
  let core = exp(-rd * rd / (0.012 + 0.014 * bass));
  let hotCore = exp(-rd * rd / 0.0045);
  var coronaCol = mix(vec3<f32>(1.0, 0.17, 0.035), vec3<f32>(0.72, 0.035, 1.0), smoothstep(0.16, 0.78, r));
  coronaCol = mix(coronaCol, palette(a / 6.2831853 + r * 0.17 + u.time * 0.008), 0.20);
  var col = coronaCol * corona * (0.10 + 0.42 * mids + 0.34 * bass);
  col += mix(vec3<f32>(1.0, 0.52, 0.08), vec3<f32>(0.42, 0.10, 1.0), 0.5 + 0.5 * sin(a * 5.0)) * rays * (0.035 + 0.78 * treble + 0.20 * bass);
  let shockD = r - (0.30 + 0.14 * bass + 0.018 * sin(a * 5.0 - u.time * 0.25) + 0.018 * (n - 0.5));
  let shock = (lineAA(shockD, 0.004) + 0.22 * exp(-abs(shockD) * 15.0)) * bass;
  col += mix(vec3<f32>(1.0, 0.38, 0.06), vec3<f32>(0.70, 0.12, 1.0), 0.5 + 0.5 * sin(a * 3.0)) * shock * (0.08 + 0.70 * bass);
  let cross = (exp(-abs(p.x) * 82.0) + exp(-abs(p.y) * 82.0)) * exp(-r * 5.5);
  col += vec3<f32>(1.0, 0.84, 0.58) * core * (0.12 + 0.92 * bass);
  col += vec3<f32>(1.0, 0.98, 0.92) * hotCore * (0.08 + 0.72 * bass);
  col += vec3<f32>(0.85, 0.94, 1.0) * cross * (0.015 + 0.34 * treble);
  return saturateColor(col, 1.55);
}

@fragment fn fsMain(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  var uv = (position.xy - 0.5 * u.res) / u.res.y;
  uv.y = -uv.y;
  var col: vec3<f32>;
  if (u.mode < 0.5) { col = rift(uv); }
  else if (u.mode < 1.5) { col = cathedral(uv); }
  else { col = nova(uv); }
  col = hueShift(col, u.controls.x);
  col *= mix(0.88, 1.12, u.controls.y);
  col = saturateColor(col, mix(0.55, 1.85, u.controls.y));
  col = max(col, vec3<f32>(0.0));
  col = clamp((col * (2.51 * col + vec3<f32>(0.03))) / (col * (2.43 * col + vec3<f32>(0.59)) + vec3<f32>(0.14)), vec3<f32>(0.0), vec3<f32>(1.0));
  col = pow(col, vec3<f32>(0.4545));
  let q = position.xy / u.res;
  let vignette = 0.72 + 0.28 * pow(max(0.0, 16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y)), 0.28);
  col *= vignette;
  col = clamp(col + vec3<f32>((hash21(position.xy) - 0.5) / 255.0), vec3<f32>(0.0), vec3<f32>(1.0));
  return vec4<f32>(col, 1.0);
}`;

  var webgpuShown = null;
  function showWebGPU(on) {
    if (webgpuShown === on) return;
    webgpuShown = on;
    window.IKANDY_WEBGPU_ACTIVE = on;
    canvas.classList.toggle('active', on);
    glCanvas.classList.toggle('webgpu-active', on);
    if (badge) badge.textContent = on ? 'WEBGPU · WGSL LIVE RENDER' : 'GLSL · LIVE RENDER, NOT A VIDEO';
  }

  async function start() {
    try {
      var adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) return;
      var device = await adapter.requestDevice();
      var context = canvas.getContext('webgpu');
      if (!context) return;
      var format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({ device: device, format: format, alphaMode: 'opaque' });

      var module = device.createShaderModule({ code: shader });
      if (module.getCompilationInfo) {
        var info = await module.getCompilationInfo();
        var errors = info.messages.filter(function (message) { return message.type === 'error'; });
        if (errors.length) {
          console.warn('[ikandy hero webgpu] WGSL:', errors.map(function (error) { return error.message; }).join('\n'));
          return;
        }
      }

      var pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: module, entryPoint: 'vsMain' },
        fragment: { module: module, entryPoint: 'fsMain', targets: [{ format: format }] },
        primitive: { topology: 'triangle-list' }
      });
      var uniformBuffer = device.createBuffer({
        size: 64,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });
      var bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
      });
      var values = new Float32Array(16);
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var lastRenderKey = '';

      window.IKANDY_WEBGPU_READY = true;
      device.lost.then(function () {
        window.IKANDY_WEBGPU_READY = false;
        showWebGPU(false);
      });

      function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        var width = Math.max(1, Math.round(canvas.clientWidth * dpr));
        var height = Math.max(1, Math.round(canvas.clientHeight * dpr));
        // Same touch-device render budget as hero.js: the full-bleed canvas
        // can exceed 2M fragments on stacked narrow layouts.
        var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        if (coarse && width * height > 700000) {
          var s = Math.sqrt(700000 / (width * height));
          width = Math.max(1, Math.round(width * s));
          height = Math.max(1, Math.round(height * s));
        }
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
      }

      var coarsePtr = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      var lastDraw = 0;
      function frame(now) {
        var s = window.IKANDY_HERO_STATE;
        var selected = !!s && s.mode >= 3 && s.mode <= 5 && window.IKANDY_WEBGPU_READY;
        var active = selected && s.visible && !document.hidden;
        showWebGPU(selected);
        // 30fps gate for touch devices, matching hero.js.
        if (coarsePtr && !reduced && now - lastDraw < 30) { requestAnimationFrame(frame); return; }
        lastDraw = now || 0;
        if (active) {
          resize();
          var renderKey = [canvas.width, canvas.height, s.mode, s.ph, s.bass, s.mid, s.treb, s.hue, s.glow, s.react, s.speed].join('|');
          if (!reduced || renderKey !== lastRenderKey) {
            lastRenderKey = renderKey;
            values[0] = canvas.width; values[1] = canvas.height;
            values[2] = reduced ? 12 : s.ph; values[3] = s.mode - 3;
            values[4] = s.bass || 0; values[5] = s.mid || 0; values[6] = s.treb || 0; values[7] = 0;
            values[8] = s.hue; values[9] = s.glow; values[10] = s.react; values[11] = s.speed;
            device.queue.writeBuffer(uniformBuffer, 0, values);
            var encoder = device.createCommandEncoder();
            var pass = encoder.beginRenderPass({
              colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 0.002, g: 0.004, b: 0.01, a: 1 },
                loadOp: 'clear', storeOp: 'store'
              }]
            });
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindGroup);
            pass.draw(3);
            pass.end();
            device.queue.submit([encoder.finish()]);
          }
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    } catch (error) {
      showWebGPU(false);
      console.warn('[ikandy hero webgpu] falling back to WebGL2:', error && error.message ? error.message : error);
    }
  }

  start();
})();
