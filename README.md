# IKANDY

Audio-reactive music visualizer for Windows. Butterchurn (MilkDrop in WebGL) with cinematic post-processing, per-process audio capture, and multi-monitor support.

**Site:** [ikandy.app](https://ikandy.app) · **Releases:** [GitHub Releases](https://github.com/IKANDYapp/IKANDY/releases) · **Support:** [buymeacoffee.com/ikandy](https://buymeacoffee.com/ikandy)

---

## Features

- **745 MilkDrop presets** via Butterchurn 3.0, with shuffle-bag auto-cycle and live preset browser
- **8 custom 2D audio-reactive scenes** — Fire EQ, Spectrum, Waveray, Aurora, Starfield, Singularity, Voyager, and more
- **6 custom 3D raymarched scenes** — Liquid Metal, Just a Flame, Heart of Lightning, Electric Eel Universe, Face in the Clouds, Saturday Weirdness
- **12-pass GLSL post-processing** — bloom, chromatic aberration, film grain, vignette, motion blur, color grading
- **Per-process audio capture** — react to one specific app's audio (e.g. Spotify) independent of the system mix; configured in Settings → SOURCE → Per-Process Capture
- **Multi-monitor support** — mirror or span across displays
- **Spotify, foobar2000, VLC, Now Playing** as metadata sources (BYOK for Spotify)
- **Synced lyrics** via LRCLIB
- **Reactivity scan** — auto-rates all 745 presets for audio reactivity; filter to only reactive presets
- **Theme system** — single `--acc` accent variable colors the entire UI

## Stack

| Layer | Technology |
|---|---|
| Shell | Electron 30 (main + preload + renderer) |
| Visualizer | Butterchurn 3.0 (WebGL MilkDrop port) |
| Post-processing | Custom GLSL (12 passes on a dedicated FX canvas) |
| Audio — system | Web Audio API + `getDisplayMedia` loopback |
| Audio — per-process | WASAPI process loopback via native N-API module |
| Audio worklet | Ring-buffer PCM injector (`audio-worklets/pcm-injector.js`) |
| Metadata | Spotify Web API (PKCE BYOK) · VLC HTTP API · foobar2000 Beefweb · Windows SMTC |
| Lyrics | LRCLIB |
| Telemetry | Supabase (opt-in) |
| Token storage | Electron `safeStorage` (DPAPI on Windows) |

## Repo layout

```
main.js                          Electron main process, IPC handlers, window management
preload.js                       contextBridge — allowlisted IPC surface only
IKANDY.html                      Renderer — all HTML/CSS/JS in one file
mirror.html                      Secondary monitor mirror window
mood-worker.js                   Spotify valence mood processing
audio-worklets/
  pcm-injector.js                AudioWorklet ring-buffer PCM injector for per-process loopback
native/process_loopback/
  process_loopback.cc            N-API entry: listAudioProcesses(), start(), stop()
  LoopbackCapture.{h,cpp}       WASAPI capture session, downmix, device-change notification
  binding.gyp                    node-gyp build config
assets/                          Icons, Bebas Neue font, bundled presets
```

## Build & run

```bash
npm install
npm start                         # dev run with log-level=3
npm run build:win                 # package Windows NSIS installer → dist/
```

**Rebuild the native loopback module** (required after any change to `native/process_loopback/`):

```bash
# Close all IKANDY / Electron / Node processes first — open .node file causes EPERM
electron-rebuild --version 30.5.1 --module-dir native\process_loopback
```

**Always delete `dist/` before a fresh package build** — stale icons and manifests have caused real bugs.

## Security

- `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`
- All IPC channels explicitly allowlisted in `preload.js` — no wildcard handlers
- Spotify Client ID validated as 32-char hex; VLC port range-checked; file paths validated against traversal
- Tokens stored via Electron `safeStorage` (DPAPI); never in `localStorage`
- DevTools disabled in packaged builds

## Version

**v1.0.15** — 6 new 3D shader scenes, 2D/3D scene picker split, per-process audio capture (Settings → SOURCE).

## Credits

- [Butterchurn](https://github.com/jberg/butterchurn) — Jordan Berg
- MilkDrop — Ryan Geiss
- Ferrofluid shader — Sabit Sugirov ([x.com/sabosugi](https://x.com/sabosugi)), adapted with permission
- 3D scenes (Liquid Metal, Heart of Lightning, Electric Eel Universe, Face in the Clouds, Saturday Weirdness) — [mrange](https://github.com/mrange) (CC0)
- Just a Flame — [Blackle Mori](https://github.com/blackle) (CC0)
- Testing — Bats586

# IKANDY
Music visualizer for Windows.

**Author:** Kevin Gavert  
**Website:** https://ikandy.app