"""Build the five original, loopable music programs used by the homepage visualizer.

The synthesis is deterministic and dependency-light (NumPy + the repo's ffmpeg).
Each MP3 is paired with a compact 60 fps, three-band reaction envelope so the
visuals follow the exact rendered track without routing audible playback through
Web Audio.
"""

from __future__ import annotations

import base64
import json
import math
import subprocess
import wave
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "audio" / "programs"
LEVELS_PATH = ROOT / "assets" / "audio" / "ikandy-program-levels.js"
SR = 44_100
FPS = 60
TAU = math.tau


PROGRAMS = {
    "house": {"label": "House", "bpm": 124, "bars": 8, "hue": "#ff5a1f"},
    "techno": {"label": "Techno", "bpm": 132, "bars": 8, "hue": "#ff2f70"},
    "trance": {"label": "Trance", "bpm": 138, "bars": 8, "hue": "#9f62ff"},
    "dnb": {"label": "D&B", "bpm": 174, "bars": 8, "hue": "#33e0ff"},
    "dubstep": {"label": "Dubstep", "bpm": 140, "bars": 8, "hue": "#8cff45"},
}


def hz(note: float) -> float:
    return 440.0 * 2.0 ** ((note - 69.0) / 12.0)


def stereo_pan(mono: np.ndarray, pan: float = 0.0) -> np.ndarray:
    angle = (max(-1.0, min(1.0, pan)) + 1.0) * math.pi / 4.0
    return np.column_stack((mono * math.cos(angle), mono * math.sin(angle)))


def wrap_add(mix: np.ndarray, start: int, sound: np.ndarray) -> None:
    """Add a mono or stereo event and wrap tails across the loop boundary."""
    if sound.ndim == 1:
        sound = stereo_pan(sound)
    total = len(mix)
    start %= total
    cursor = 0
    while cursor < len(sound):
        count = min(total - start, len(sound) - cursor)
        mix[start : start + count] += sound[cursor : cursor + count]
        cursor += count
        start = 0


def soft_saw(phase: np.ndarray, harmonics: int = 7) -> np.ndarray:
    out = np.zeros_like(phase)
    for h in range(1, harmonics + 1):
        out += np.sin(phase * h) / h
    return out * (2.0 / math.pi)


def filtered_noise(length: int, rng: np.random.Generator, colour: str) -> np.ndarray:
    n = rng.normal(0.0, 1.0, length)
    if colour == "high":
        smooth = np.convolve(n, np.ones(25) / 25.0, mode="same")
        return n - smooth
    if colour == "mid":
        slow = np.convolve(n, np.ones(91) / 91.0, mode="same")
        fast = np.convolve(n, np.ones(7) / 7.0, mode="same")
        return fast - slow
    return n


def kick(level: float = 1.0, hard: float = 0.5) -> np.ndarray:
    length = int(SR * (0.42 + hard * 0.10))
    t = np.arange(length) / SR
    freq = 42.0 + (155.0 + hard * 55.0) * np.exp(-t * (24.0 + hard * 9.0))
    phase = TAU * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t * (8.0 - hard * 1.8))
    click = np.sin(TAU * 1_850.0 * t) * np.exp(-t * 90.0)
    return (body + click * (0.08 + hard * 0.08)) * level


def hat(rng: np.random.Generator, level: float = 1.0, open_hat: bool = False) -> np.ndarray:
    dur = 0.31 if open_hat else 0.075
    length = int(SR * dur)
    t = np.arange(length) / SR
    n = filtered_noise(length, rng, "high")
    decay = 13.0 if open_hat else 58.0
    metallic = 0.20 * np.sin(TAU * 8_930.0 * t) + 0.12 * np.sin(TAU * 11_170.0 * t)
    return (n * 0.22 + metallic) * np.exp(-t * decay) * level


def snare(rng: np.random.Generator, level: float = 1.0, clap: bool = False) -> np.ndarray:
    length = int(SR * (0.34 if clap else 0.27))
    t = np.arange(length) / SR
    n = filtered_noise(length, rng, "mid")
    env = np.exp(-t * (13.0 if clap else 17.0))
    if clap:
        env *= 0.75 + 0.38 * (np.sin(TAU * 31.0 * t) > 0)
    tone = np.sin(TAU * 185.0 * t) * np.exp(-t * 19.0)
    return (n * 0.34 * env + tone * 0.30) * level


def bass(note: float, duration: float, level: float = 1.0, shape: str = "round") -> np.ndarray:
    length = max(1, int(SR * duration))
    t = np.arange(length) / SR
    f = hz(note)
    phase = TAU * f * t
    if shape == "reese":
        sig = soft_saw(phase * 0.993, 8) + soft_saw(phase * 1.007, 8)
        sig *= 0.42
        sig *= 0.72 + 0.28 * np.sin(TAU * 1.7 * t)
    elif shape == "wobble":
        lfo = 0.56 + 0.44 * np.sin(TAU * 2.5 * t - math.pi / 2)
        sig = np.sin(phase) + soft_saw(phase, 6) * (0.18 + lfo * 0.38)
        sig *= 0.70 + lfo * 0.30
    else:
        sig = np.sin(phase) * 0.82 + np.sin(phase * 2) * 0.14 + np.sin(phase * 3) * 0.04
    attack = np.minimum(1.0, t / 0.007)
    release = np.minimum(1.0, (duration - t) / min(0.12, duration * 0.4))
    env = attack * np.maximum(0.0, release)
    return np.tanh(sig * 1.35) * env * level


def chord(notes: list[float], duration: float, level: float = 1.0, pad: bool = False) -> np.ndarray:
    length = max(1, int(SR * duration))
    t = np.arange(length) / SR
    sig = np.zeros(length)
    for i, note in enumerate(notes):
        phase = TAU * hz(note) * t * (1.0 + (i - len(notes) / 2) * 0.0008)
        sig += soft_saw(phase, 6 if pad else 4)
    sig /= max(1, len(notes))
    if pad:
        attack = np.minimum(1.0, t / 0.18)
        release = np.minimum(1.0, (duration - t) / 0.35)
        env = attack * np.maximum(0.0, release) * (0.92 + 0.08 * np.sin(TAU * 0.22 * t))
    else:
        env = np.minimum(1.0, t / 0.008) * np.exp(-t * 4.8)
    return sig * env * level


def pluck(note: float, duration: float, level: float = 1.0) -> np.ndarray:
    length = max(1, int(SR * duration))
    t = np.arange(length) / SR
    phase = TAU * hz(note) * t
    sig = soft_saw(phase, 5) * 0.72 + np.sin(phase * 2.01) * 0.15
    return sig * np.minimum(1.0, t / 0.003) * np.exp(-t * 7.4) * level


def add(mix: np.ndarray, when: float, sound: np.ndarray, pan: float = 0.0) -> None:
    wrap_add(mix, int(round(when * SR)), stereo_pan(sound, pan))


def render_house(meta: dict, rng: np.random.Generator, duration: float) -> np.ndarray:
    mix = np.zeros((round(duration * SR), 2), dtype=np.float64)
    beat = 60.0 / meta["bpm"]
    beats = meta["bars"] * 4
    roots = [41, 41, 44, 39, 41, 41, 46, 39]
    chords = [[60, 63, 67, 70], [60, 63, 67, 70], [63, 67, 70, 74], [58, 62, 65, 69],
              [60, 63, 67, 70], [60, 63, 67, 72], [65, 68, 72, 75], [58, 62, 65, 69]]
    for i in range(beats):
        add(mix, i * beat, kick(0.92, 0.30))
        add(mix, (i + 0.5) * beat, hat(rng, 0.72, open_hat=(i % 4 == 3)), 0.22)
        if i % 2 == 1:
            add(mix, i * beat, snare(rng, 0.34, clap=True), -0.10)
        root = roots[i // 4]
        add(mix, (i + 0.52) * beat, bass(root, beat * 0.38, 0.44), -0.08)
        if i % 4 in (1, 3):
            add(mix, (i + 0.48) * beat, chord(chords[i // 4], beat * 0.72, 0.24), 0.10)
    return mix


def render_techno(meta: dict, rng: np.random.Generator, duration: float) -> np.ndarray:
    mix = np.zeros((round(duration * SR), 2), dtype=np.float64)
    beat = 60.0 / meta["bpm"]
    beats = meta["bars"] * 4
    seq = [38, 38, 41, 38, 43, 38, 36, 38, 38, 45, 41, 38, 36, 38, 43, 41]
    for i in range(beats):
        add(mix, i * beat, kick(1.00, 0.82))
        if i % 2 == 1:
            add(mix, i * beat, snare(rng, 0.29), -0.08)
        add(mix, (i + 0.5) * beat, hat(rng, 0.50, open_hat=True), 0.25)
        for step in range(4):
            pos = i * 4 + step
            note = seq[pos % len(seq)]
            add(mix, (i + step / 4) * beat, pluck(note + 12, beat * 0.22, 0.17), -0.28 + step * 0.18)
            if step in (1, 3):
                add(mix, (i + step / 4) * beat, hat(rng, 0.22), 0.35)
        add(mix, (i + 0.04) * beat, bass(seq[(i * 4) % len(seq)], beat * 0.62, 0.35), 0.0)
    return mix


def render_trance(meta: dict, rng: np.random.Generator, duration: float) -> np.ndarray:
    mix = np.zeros((round(duration * SR), 2), dtype=np.float64)
    beat = 60.0 / meta["bpm"]
    beats = meta["bars"] * 4
    roots = [45, 45, 41, 41, 43, 43, 40, 40]
    progressions = [[57, 60, 64, 69], [57, 60, 64, 69], [53, 57, 60, 65], [53, 57, 60, 65],
                    [55, 59, 62, 67], [55, 59, 62, 67], [52, 55, 59, 64], [52, 55, 59, 64]]
    arp_ix = [0, 1, 2, 1, 3, 2, 1, 2]
    for bar in range(meta["bars"]):
        add(mix, bar * 4 * beat, chord(progressions[bar], 4.4 * beat, 0.13, pad=True), (-0.2 if bar % 2 else 0.2))
    for i in range(beats):
        add(mix, i * beat, kick(0.92, 0.46))
        add(mix, (i + 0.5) * beat, bass(roots[i // 4], beat * 0.38, 0.42), -0.05)
        add(mix, (i + 0.5) * beat, hat(rng, 0.62, open_hat=True), 0.25)
        if i % 2 == 1:
            add(mix, i * beat, snare(rng, 0.25, clap=True), -0.1)
        notes = progressions[i // 4]
        for step in range(2):
            idx = (i * 2 + step) % len(arp_ix)
            note = notes[arp_ix[idx]] + 12
            add(mix, (i + step * 0.5) * beat, pluck(note, beat * 0.42, 0.22), -0.35 + (idx % 4) * 0.23)
    return mix


def render_dnb(meta: dict, rng: np.random.Generator, duration: float) -> np.ndarray:
    mix = np.zeros((round(duration * SR), 2), dtype=np.float64)
    beat = 60.0 / meta["bpm"]
    beats = meta["bars"] * 4
    kick_steps = {0, 7, 10, 14}
    snare_steps = {4, 12}
    roots = [36, 36, 39, 34, 36, 43, 39, 34]
    for bar in range(meta["bars"]):
        root = roots[bar]
        add(mix, bar * 4 * beat, bass(root, 4.1 * beat, 0.34, "reese"), -0.05)
        for step in range(16):
            when = (bar * 4 + step / 4) * beat
            if step in kick_steps or (bar % 2 and step == 15):
                add(mix, when, kick(0.82, 0.55))
            if step in snare_steps:
                add(mix, when, snare(rng, 0.92), -0.06)
            add(mix, when, hat(rng, 0.20 + 0.10 * (step % 2)), 0.32 if step % 2 else -0.25)
        for q in (0, 1.5, 2.5, 3.25):
            add(mix, (bar * 4 + q) * beat, bass(root + (7 if q == 2.5 else 0), beat * 0.55, 0.26, "reese"), 0.08)
    return mix


def render_dubstep(meta: dict, rng: np.random.Generator, duration: float) -> np.ndarray:
    mix = np.zeros((round(duration * SR), 2), dtype=np.float64)
    beat = 60.0 / meta["bpm"]
    roots = [35, 35, 38, 33, 35, 43, 38, 33]
    patterns = [[0, 1.5, 2.75], [0, 0.75, 2.5], [0, 1.25, 3], [0, 2.75]]
    for bar in range(meta["bars"]):
        root = roots[bar]
        for i in range(4):
            when = (bar * 4 + i) * beat
            if i == 0 or (i == 3 and bar % 2):
                add(mix, when, kick(1.0, 0.72))
            if i == 2:
                add(mix, when, snare(rng, 1.0), -0.05)
            add(mix, (bar * 4 + i + 0.5) * beat, hat(rng, 0.34, open_hat=(i == 3)), 0.28)
        for j, q in enumerate(patterns[bar % len(patterns)]):
            span = patterns[bar % len(patterns)][j + 1] - q if j + 1 < len(patterns[bar % len(patterns)]) else 4 - q
            add(mix, (bar * 4 + q) * beat, bass(root + (12 if j == 1 and bar % 2 else 0), beat * max(0.35, span * 0.86), 0.52, "wobble"), (-0.14 if j % 2 else 0.14))
        for step in range(8):
            if step not in (0, 4):
                add(mix, (bar * 4 + step * 0.5) * beat, hat(rng, 0.15), -0.34 if step % 2 else 0.34)
    return mix


RENDERERS = {
    "house": render_house,
    "techno": render_techno,
    "trance": render_trance,
    "dnb": render_dnb,
    "dubstep": render_dubstep,
}


def finish_mix(mix: np.ndarray) -> np.ndarray:
    # Gentle bus saturation and a fixed, repeatable ceiling.
    mix = np.tanh(mix * 1.18)
    peak = float(np.max(np.abs(mix))) or 1.0
    mix *= 0.88 / peak
    return mix


def write_wav(path: Path, mix: np.ndarray) -> None:
    pcm = np.clip(mix * 32767.0, -32768, 32767).astype("<i2")
    with wave.open(str(path), "wb") as out:
        out.setnchannels(2)
        out.setsampwidth(2)
        out.setframerate(SR)
        out.writeframes(pcm.tobytes())


def reaction_envelope(mix: np.ndarray) -> tuple[int, str]:
    mono = mix.mean(axis=1)
    frames = int(math.ceil(len(mono) / SR * FPS))
    window_size = 4096
    window = np.hanning(window_size)
    freqs = np.fft.rfftfreq(window_size, 1.0 / SR)
    bands = [(32, 185), (185, 2_600), (2_600, 14_500)]
    energies = np.zeros((frames, 3), dtype=np.float64)
    half = window_size // 2
    for frame in range(frames):
        centre = int(round(frame / FPS * SR))
        indices = (np.arange(window_size) + centre - half) % len(mono)
        spectrum = np.abs(np.fft.rfft(mono[indices] * window))
        power = spectrum * spectrum
        for band_ix, (low, high) in enumerate(bands):
            mask = (freqs >= low) & (freqs < high)
            energies[frame, band_ix] = math.sqrt(float(np.mean(power[mask])))

    packed = np.zeros_like(energies)
    for band_ix in range(3):
        values = np.log1p(energies[:, band_ix])
        floor = float(np.percentile(values, 6))
        ceiling = float(np.percentile(values, 99.2))
        scaled = np.clip((values - floor) / max(1e-9, ceiling - floor), 0.0, 1.0)
        # Preserve quiet passages while giving peaks enough travel to read clearly.
        packed[:, band_ix] = 0.025 + 0.975 * scaled ** (0.82 if band_ix == 0 else 0.90)
    raw = np.round(np.clip(packed, 0, 1) * 255).astype(np.uint8).tobytes()
    return frames, base64.b64encode(raw).decode("ascii")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    catalog: dict[str, dict] = {}
    for index, (key, meta) in enumerate(PROGRAMS.items()):
        beat = 60.0 / meta["bpm"]
        duration = meta["bars"] * 4 * beat
        rng = np.random.default_rng(0x1CA7D7 + index * 7919)
        mix = finish_mix(RENDERERS[key](meta, rng, duration))

        wav_path = OUT / f"{key}.wav"
        mp3_path = OUT / f"{key}.mp3"
        write_wav(wav_path, mix)
        subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(wav_path),
             "-codec:a", "libmp3lame", "-b:a", "160k", "-write_xing", "1", str(mp3_path)],
            check=True,
        )
        wav_path.unlink()

        frames, data = reaction_envelope(mix)
        catalog[key] = {
            "label": meta["label"],
            "bpm": meta["bpm"],
            "hue": meta["hue"],
            "src": f"assets/audio/programs/{key}.mp3",
            "fps": FPS,
            "bands": 3,
            "frames": frames,
            "duration": round(duration, 9),
            "data": data,
        }
        print(f"{meta['label']:8s} {meta['bpm']} BPM  {duration:6.3f}s  {mp3_path.stat().st_size:7d} bytes")

    payload = json.dumps(catalog, separators=(",", ":"))
    LEVELS_PATH.write_text(
        "/* Generated by scripts/generate-hero-programs.py. */\n"
        f"window.IKANDY_PROGRAMS={payload};\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Reaction catalog: {LEVELS_PATH.relative_to(ROOT)} ({LEVELS_PATH.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
