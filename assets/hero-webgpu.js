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

fn palette(t: f32) -> vec3<f32> {
  let phase = vec3<f32>(0.0, 0.33, 0.67) + vec3<f32>(u.controls.x);
  return vec3<f32>(0.5) + vec3<f32>(0.5) * cos(vec3<f32>(6.2831853) * (vec3<f32>(t) + phase));
}

fn drive(a: f32) -> f32 {
  return pow(max(a, 0.0), mix(2.0, 0.85, u.controls.z)) * mix(0.5, 1.9, u.controls.z);
}

fn saturateColor(c: vec3<f32>, amount: f32) -> vec3<f32> {
  let luma = dot(c, vec3<f32>(0.299, 0.587, 0.114));
  return mix(vec3<f32>(luma), c, amount);
}

fn rift(uv: vec2<f32>) -> vec3<f32> {
  let r = length(uv);
  let a = atan2(uv.y, uv.x);
  let bass = drive(u.audio.x);
  let mids = drive(u.audio.y);
  let treble = drive(u.audio.z);
  let bend = 0.18 * sin(a * 3.0 - u.time * 0.21) + 0.07 * sin(a * 9.0 + u.time * 0.13);
  let depth = -log(r + 0.035) * 3.2 + u.time * 0.55 + bend + mids * 0.22;
  let rings = exp(-abs(fract(depth * 0.18) - 0.5) * 38.0);
  let spokes = exp(-abs(sin(a * 7.0 + depth * 1.7 - u.time * 0.14)) * 14.0);
  let shock = exp(-abs(r - (0.18 + 0.12 * fract(u.time * 0.24))) * 38.0) * bass;
  let mask = smoothstep(0.035, 0.22, r) * (1.0 - smoothstep(1.15, 1.75, r));
  var col = vec3<f32>(0.002, 0.004, 0.012);
  var neon = mix(vec3<f32>(0.04, 0.30, 1.0), vec3<f32>(1.0, 0.025, 0.46), 0.5 + 0.5 * sin(a * 3.0 + depth));
  neon = mix(neon, palette(a / 6.2831853 + depth * 0.035), 0.30);
  col += neon * (rings * 0.95 + spokes * 0.58) * mask * (0.18 + 0.92 * bass + 0.42 * mids);
  col += vec3<f32>(0.95, 0.75, 1.0) * shock * (0.28 + 1.55 * bass);
  let glint = smoothstep(0.90, 1.0, noise21(vec2<f32>(a * 14.0, floor(depth * 3.0)) + vec2<f32>(u.time * 0.2)));
  col += vec3<f32>(0.70, 0.94, 1.0) * glint * spokes * mask * (0.05 + 1.75 * treble);
  let horizon = exp(-abs(r - (0.14 + 0.045 * min(bass, 1.0))) * 48.0);
  col += palette(u.time * 0.015 + 0.52) * horizon * (0.18 + 1.2 * bass);
  return saturateColor(col, 1.55);
}

fn cathedral(uv: vec2<f32>) -> vec3<f32> {
  let bass = drive(u.audio.x);
  let mids = drive(u.audio.y);
  let treble = drive(u.audio.z);
  let turn = 0.10 * sin(u.time * 0.13) + 0.035 * sin(u.time * 0.31);
  let ct = cos(turn);
  let st = sin(turn);
  var p = mat2x2<f32>(ct, -st, st, ct) * uv;
  p.x += 0.08 * sin(u.time * 0.10) - 0.24;
  var col = vec3<f32>(0.003, 0.006, 0.012);
  for (var i: i32 = 0; i < 8; i = i + 1) {
    let fi = f32(i);
    let phase = fract(fi * 0.125 + u.time * 0.035);
    let scale = mix(0.55, 7.5, phase * phase);
    var q = p * scale;
    q.x += 0.12 * sin(u.time * 0.16 + fi * 0.83) * (1.0 - phase);
    let width = 0.72 + 0.07 * min(bass, 1.0);
    let height = 0.42 + 0.045 * sin(u.time * 0.24 + fi);
    let box = abs(max(abs(q.x) - width, abs(q.y) - height));
    let glow = exp(-box * (78.0 - 22.0 * min(treble, 1.9))) * (0.22 + 0.78 * (1.0 - phase));
    let glass = palette(phase * 0.72 + q.y * 0.045 + u.time * 0.012);
    col += glass * glow * (0.08 + 0.28 * mids + 0.18 * bass);
    let pillars = exp(-abs(abs(q.x) - width) * 90.0) * (1.0 - smoothstep(height - 0.04, height + 0.22, abs(q.y)));
    col += glass * pillars * (0.010 + 0.08 * treble) * (1.0 - phase);
  }
  let floorMask = 1.0 - smoothstep(-0.72, -0.08, p.y);
  let floorRay = exp(-abs(sin(atan2(p.x, p.y + 0.78) * 11.0)) * 18.0) * floorMask;
  let floorStep = exp(-abs(fract(1.0 / (abs(p.y) + 0.12) + u.time * 0.08) - 0.5) * 20.0) * floorMask;
  col += palette(0.58 + u.time * 0.01) * (floorRay * 0.16 + floorStep * 0.12) * (0.08 + 0.35 * mids);
  let roseRadius = length(p);
  let roseAngle = atan2(p.y, p.x);
  let rose = exp(-abs(roseRadius - (0.23 + 0.025 * min(bass, 1.0))) * 62.0);
  let roseSpoke = pow(abs(cos(roseAngle * 12.0 + u.time * 0.12)), 28.0) * exp(-roseRadius * 4.2);
  col += palette(roseAngle / 6.2831853 + 0.16) * (rose + roseSpoke) * (0.05 + 0.35 * treble + 0.18 * mids);
  let altar = exp(-dot(p, p) * (16.0 - 7.0 * min(bass, 1.0)));
  col += vec3<f32>(0.85, 0.94, 1.0) * altar * (0.04 + 0.50 * bass);
  return saturateColor(col, 1.45);
}

fn nova(uv: vec2<f32>) -> vec3<f32> {
  let bass = drive(u.audio.x);
  let mids = drive(u.audio.y);
  let treble = drive(u.audio.z);
  let rotation = 0.055 * u.time;
  let cr = cos(rotation);
  let sr = sin(rotation);
  let p = mat2x2<f32>(cr, -sr, sr, cr) * uv;
  let r = length(p);
  let a = atan2(p.y, p.x);
  let twist = a + sin(r * 8.0 - u.time * 0.35) * (1.05 + 0.72 * mids);
  let petals = pow(0.5 + 0.5 * cos(twist * 10.0), 8.0);
  let wave = 0.5 + 0.5 * cos(r * 30.0 - u.time * 2.1 + petals * 4.0 + mids * 2.0);
  let corona = exp(-r * (2.75 - 0.85 * min(bass, 1.0))) * (0.14 + 0.86 * wave);
  let rays = pow(max(0.0, cos(twist * 22.0)), max(10.0, 48.0 - 20.0 * treble)) * exp(-r * 1.7);
  let core = exp(-r * r * (18.0 - 9.0 * min(bass, 1.0)));
  var col = palette(twist / 6.2831853 + r * 0.28 + u.time * 0.018) * corona * (0.24 + 0.78 * mids + 0.46 * bass);
  col += vec3<f32>(1.0, 0.91, 0.72) * rays * (0.04 + 1.25 * treble + 0.35 * bass);
  let shock = exp(-abs(r - (0.28 + 0.17 * min(bass, 1.0) + 0.035 * sin(u.time * 0.7))) * 34.0) * bass;
  col += palette(0.08 + r * 0.4) * shock * 1.35;
  let spark = smoothstep(0.94, 1.0, noise21(vec2<f32>(floor(a * 18.0), floor(r * 42.0 - u.time * 3.0))));
  col += vec3<f32>(0.72, 0.94, 1.0) * spark * exp(-r * 1.3) * (0.03 + 1.5 * treble);
  col += vec3<f32>(1.0, 0.72, 0.42) * core * (0.18 + 1.45 * bass);
  return saturateColor(col, 1.55);
}

@fragment fn fsMain(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  var uv = (position.xy - 0.5 * u.res) / u.res.y;
  uv.y = -uv.y;
  var col: vec3<f32>;
  if (u.mode < 0.5) { col = rift(uv); }
  else if (u.mode < 1.5) { col = cathedral(uv); }
  else { col = nova(uv); }
  col *= mix(0.88, 1.12, u.controls.y);
  col = saturateColor(col, mix(0.55, 1.85, u.controls.y));
  col = col / (vec3<f32>(1.0) + col);
  col = pow(max(col, vec3<f32>(0.0)), vec3<f32>(0.4545));
  let q = position.xy / u.res;
  let vignette = 0.62 + 0.38 * pow(max(0.0, 16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y)), 0.28);
  return vec4<f32>(col * vignette, 1.0);
}`;

  function showWebGPU(on) {
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

      window.IKANDY_WEBGPU_READY = true;
      device.lost.then(function () {
        window.IKANDY_WEBGPU_READY = false;
        showWebGPU(false);
      });

      function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        var width = Math.max(1, Math.round(canvas.clientWidth * dpr));
        var height = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
      }

      function frame() {
        var s = window.IKANDY_HERO_STATE;
        var active = !!s && s.mode >= 3 && s.mode <= 5 && !document.hidden;
        showWebGPU(active);
        if (active) {
          resize();
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
