# IKANDY Website and Arcade — Third-Party Notices Dossier

Reviewed: 2026-07-10

This file records the third-party material shipped by the IKANDY website and browser arcade, plus the application components publicly disclosed on `credits.html`. It complements, but does not replace, the machine-generated `THIRD_PARTY_LICENSES.txt` that must ship with the retail desktop application.

## Cleared and documented in this repository

| Component | Use | License/evidence |
| --- | --- | --- |
| IKAMP synthwave playlist | Five browser-arcade MP3 files | CC0 1.0; exact-source hashes in `arcade/music/LICENSES.md` |
| Webamp | Local IKAMP player bundle | MIT; `arcade/LICENSE-webamp.txt` |
| skifree.js | Powder game base | MIT; `arcade/skifree/LICENSE-skifree.md` |
| Hammer.js | Included in the skifree.js bundle | MIT; `arcade/skifree/LICENSE-hammerjs.txt` |
| Mousetrap | Included in the skifree.js bundle | Apache 2.0 plus upstream exceptions; `arcade/skifree/LICENSE-mousetrap.txt` |
| Self-hosted web fonts | Archivo, Big Shoulders, Martian Mono, Press Start 2P, VT323, Cinzel, Limelight, Bebas Neue, DM Sans, Space Mono | SIL OFL 1.1; copyright notices and license in `assets/fonts/OFL-1.1.txt` |
| Butterchurn engine | Desktop visualizer engine disclosed on the credits page | MIT; `legal/licenses/BUTTERCHURN-MIT.txt` |
| butterchurn-presets repository | Upstream preset package | Repository MIT notice; `legal/licenses/BUTTERCHURN-PRESETS-MIT.txt` |

## Evidence retained elsewhere and still requiring a release-package check

The retail app credits identify Electron/Chromium, Three.js, Spout2/SpoutDX, cmake-js, native modules, npm dependencies, imported shaders, and a Solar System Scope texture. Before a Steam release, copy the app build's generated `THIRD_PARTY_LICENSES.txt`, applicable source/permission receipts, and any required NOTICE files into the signed release archive. The website repository alone cannot prove which versions and files the packaged executable contains.

## Not cleared as a collection

The historical MilkDrop community preset library is **not cleared as a whole**. See `legal/MILKDROP-LICENSE-REVIEW.md`. The Butterchurn repositories' MIT notices do not automatically grant rights to unrelated community archives or every individual preset. Do not treat public availability or author-name metadata as a commercial redistribution license.

## Release gate

A retail build should ship only third-party assets whose row in the final release manifest contains all of the following:

1. Exact bundled filename and version or SHA-256.
2. Original author/rightsholder.
3. Authoritative source URL.
4. License identifier and full license/NOTICE text when required.
5. Separate written permission where no suitable public license exists.

This dossier is a factual provenance record, not legal advice. Have release counsel review the final signed package and its notices.
