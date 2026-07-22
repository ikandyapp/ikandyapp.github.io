# IKANDY Launch Legal-Clearance Checklist

Consolidated pre-launch IP/licensing gate for the July 31, 2026 Steam release.
Compiled 2026-07-22 from an audit of this website repository and the retail app
repository (`ikandyapp/ikandy-private`).

**This is a factual provenance/clearance tracker, not legal advice.** Nothing here
substitutes for sign-off by release counsel on the final signed package. Boxes marked
`[x]` were verified during the audit at the cited evidence path; `[ ]` items are open
or must be re-confirmed against the exact bytes in the signed build.

---

## A. Retail desktop app — `ikandyapp/ikandy-private` (the shipped product)

This is where nearly all real exposure lives. The app's clearance discipline is strong;
the open items are release-time mechanics, not unresolved rights questions.

- [x] **MilkDrop presets cleared to MIT-only, with per-work evidence.** 289 shipped
  presets, all sourced from `butterchurn-presets` (MIT, Jordan Berg). Per-work rows
  (name / collection / source / SHA-1) in `vendor/ikandy-presets/CLEARANCE.json`;
  `manifest.json` pins `clearedSources: ["butterchurn"]`. The uncertain collections
  flagged in this repo's `legal/MILKDROP-LICENSE-REVIEW.md` (Cream of the Crop,
  DeepField, MILKSORTED) are **excluded** from the shipped pack — the required
  quarantine is in effect.
- [x] **AI model licenses cleared, non-commercial variants excluded.** Ships only the
  Apache-2.0 Depth-Anything-V2-**Small** (Base/Large/Giant are CC-BY-NC and forbidden)
  and the general Apache-2.0 `u2netp` (`u2net_portrait` / RMBG-1.4 / RMBG-2.0 excluded
  as non-commercial). Evidence: `docs/PROVENANCE.md`.
- [x] **Vendored runtimes pinned + licensed.** butterchurn 3.0.0-beta.5 (MIT),
  transformers.js 4.2.0 (Apache-2.0), onnxruntime-web 1.26.0-dev (MIT). Recorded in
  `docs/PROVENANCE.md`.
- [x] **AI-authored scene provenance tracked.** `docs/gallery-provenance-ledger.json`
  retains the original metadata (run, model, scores) for AI-generated gallery scenes,
  per the CLAUDE.md scene-code provenance rule.
- [x] **Contamination sweep of the shipped app (2026-07-22).** Runtime deps are all
  permissive (three, ws, qrcode, @sentry/electron, electron-*, steamworks.js,
  gaussian-splats-3d = MIT/BSD/Apache); native modules: WIL (MIT), Spout (BSD),
  `wallpaper_host` + `process_loopback` (original IKANDY, MIT/Non-Commercial). **No
  GPL/LGPL/AGPL** bundled or linked; the GPL-3.0 Lively Wallpaper is explicitly *not*
  bundled (user installs it separately). **No FFmpeg/codec** libraries bundled.
- [x] **Non-commercial "shader trap" guardrailed.** The team correctly treats Shadertoy
  (CC-BY-NC-SA default) and LYGIA (Prosperity/Patron) as study-for-technique only, never
  pasted; a "verified Shadertoy import" flow with a rights-affirmation gate makes any
  imported shader the *user's* responsibility (UGC), and math techniques (IQ/Hvidtfeldt
  distance estimators) are attributed but independently implemented. Standing rules in
  `AGENTS.md` and `docs/STRATEGY-ai-generation.md`.
- [x] **`package.json` license field** = `"SEE LICENSE IN LICENSE"` (the IKANDY
  Non-Commercial License), consistent with the shipped `LICENSE`.
- [x] **No hardcoded secrets/keys** found in source (quick scan of JS/JSON/env/HTML).
- [x] **Third-party-adapted scenes cleared by written permission.** The Ferrofluid,
  Trails, Disco Ball, and Hyperspace Tunnel scenes are adapted from works by **Sabo Sugi,
  used with the author's express permission (confirmed 2026-07-09)** — recorded in the
  shipped license file (`scripts/build-licenses.js:128`) and correctly flagged as not
  open-source (forks need separate permission). Direct permission is stronger than a
  license for adapted creative work.
- [x] **`THIRD_PARTY_LICENSES.txt` reaches the signed build — automatically.** It is
  listed in `build.files`, and every `build:*` script runs `release:prepare` →
  `npm run licenses` (regenerating it) **before** `electron-builder` packages. So it
  ships fresh, not stale. The `RELEASE_CHECKLIST.md:30` checkbox is now belt-and-suspenders.
- [x] **Solar System Scope moon texture attribution ships.** The texture ships as
  `assets/moon-2k.jpg` (in `build.files`), and `scripts/build-licenses.js:343` emits its
  **CC BY 4.0 + Solar System Scope** attribution into the shipped `THIRD_PARTY_LICENSES.txt`
  — so the credit travels with the app, independent of the (unshipped) website
  `credits.html`. *Optional polish:* add the "downscaled / resampled" change indication to
  that entry to fully satisfy CC BY's modification-notice clause.
- [x] **Fonts are not redistributed.** The 6 `.ttf` files live in `assets-dev/`, which is
  **excluded** from `build.files`. They are used at dev time (`scripts/gen-wordmark.js`,
  `opentype.js`) only to bake a rendered SVG wordmark into shipped assets — permitted OFL
  use of a font to create artwork, not redistribution of the font software. No OFL notice
  is required for the shipped derivative.
- [ ] **Release counsel sign-off** on the final signed package and its NOTICE files.
  *(The only remaining item — a human legal review, not an engineering gap.)*

## B. Website + browser arcade — this repository

Cleanly documented overall, with one open third-party item.

- [x] **Vendored JS** — Webamp (MIT, `arcade/LICENSE-webamp.txt`), skifree.js (MIT),
  Hammer.js (MIT), Mousetrap (Apache-2.0). License files retained per component.
- [x] **Web fonts** — SIL OFL 1.1, notices in `assets/fonts/OFL-1.1.txt`.
- [x] **Arcade music** — 5 tracks, CC0 1.0, with verified source + shipped SHA-256
  hashes in `arcade/music/LICENSES.md`.
- [x] **Copyleft contamination scan** — no GPL/AGPL/LGPL/MPL/non-commercial code or
  FFmpeg/x264 present in the repo. (The lone "GPLv2" string is inside Mousetrap's
  license granting a GPL-compat exception; Mousetrap itself is Apache-2.0.)
- [x] **`arcade/ikamp.wsz` — replaced with original first-party artwork (2026-07-22).**
  The prior archive was the third-party skin *"winamp noir" © Nathanael Cabral,
  dated 2000-12-12* (per its embedded `readme.txt`), which carried no license grant.
  It has been replaced with an **original IKAMP skin authored for IKANDY** — every
  bitmap generated from scratch; only the `.wsz` sprite-coordinate layout (the format's
  functional interoperability spec) is shared with the classic format. Authorship +
  copyright are recorded in the skin's own `readme.txt` and in `THIRD_PARTY_NOTICES.md`.
  Verified to render correctly in the actual Webamp player (the same
  `initialSkin: { url: "ikamp.wsz" }` path used by `arcade/index.html`).

## C. Process notes — corrections to common "AI-code-theft" advice

Recorded so the reasoning survives past this audit:

- **SCA tools (Snyk / FOSSA / Black Duck) have a specific scope.** They reliably catch
  *known open-source components* and license contamination — i.e., Section A/B above.
  They do **not** detect an AI reproducing someone's *private/proprietary* code, because
  that code is in no public database to match against. Useful, but not a shield against
  the direct-infringement scenario.
- **"Transforming" AI-generated code does not cure infringement.** Cosmetic edits to an
  infringing block still yield an infringing derivative work. Protection comes from
  independent creation and from using functional/boilerplate patterns that are not
  anyone's protected expression — not from find-and-replace obfuscation.
- **Vendor copyright indemnities carry conditions and vary.** Where relied on, read the
  actual current terms of the specific tool/tier rather than any summary.

---

## Sign-off

| Gate | Owner | Date | Notes |
| --- | --- | --- | --- |
| Section A complete (signed build verified) | | | |
| Section B complete (skin resolved + documented) | | | |
| Counsel review of signed package | | | |
