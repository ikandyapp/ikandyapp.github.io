# Homepage audio

- `ikandy-theme.wav` is the IKANDY theme supplied for the homepage.
- `programs/*.mp3` are original procedural loops generated for this website by
  `scripts/generate-hero-programs.py`. They use no third-party recordings or
  samples.
- `ikandy-theme-levels.js` and `ikandy-program-levels.js` contain compact
  three-band reaction envelopes. They let the homepage visuals follow the
  shipped audio without changing its audible playback path.

The five music programs are loaded only after a visitor selects one. The
desktop app and the arcade music library are not part of this system.
