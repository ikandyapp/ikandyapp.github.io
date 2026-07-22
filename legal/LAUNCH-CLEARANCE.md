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
- [ ] **Regenerate `THIRD_PARTY_LICENSES.txt` into the signed archive.** It is
  gitignored and bundled from disk at build time — a stale copy ships silently. Run
  `npm run licenses` (`build-licenses.js`) as the last step before packaging. Already
  tracked at `RELEASE_CHECKLIST.md:30`; re-confirm the file is present *inside* the
  signed build, not just on the build machine.
- [ ] **Confirm the Solar System Scope moon texture attribution ships.** CC BY 4.0
  requires attribution + indication of changes; both are in `credits.html` — verify
  that credits page (or its content) is included in the packaged app, not only on the
  website.
- [ ] **Release counsel sign-off** on the final signed package and its NOTICE files.

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
