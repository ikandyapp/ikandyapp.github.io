# MilkDrop Preset License Review

Reviewed: 2026-07-10

Source material inspected in `F:\Milkdrop`:

- `butterchurn-presets-master/LICENSE`
- `presets-cream-of-the-crop-master/LICENSE.md`
- `MilkDrop--DeepField-Preset-Collection-(NeonAngel)-(2023)/IMAGE LICENSES.txt`
- `MILKSORTED/README.txt`
- `MILKSORTED/_SHIPPED-IN-V1.txt`

## Findings

### Butterchurn preset repository

The `butterchurn-presets` repository includes an MIT notice for the repository. That notice is retained in `legal/licenses/BUTTERCHURN-PRESETS-MIT.txt`. It does not, by itself, prove that unrelated archives or every historic preset incorporated from elsewhere was licensed by its author under MIT.

### Cream of the Crop archive — not sufficient clearance

Its `LICENSE.md` states that most presets were not released under a specific license and that each author theoretically retains copyright. It then says public-domain status is “safe to assume” because the files were freely released and widely reused. That assumption is not a license or permission from the individual rightsholders and should not be used as the legal basis for commercial redistribution.

### DeepField image collection — paid-product restriction

`IMAGE LICENSES.txt` mixes CC0, Pixabay, public-domain, product-listing, wallpaper, and unattributed images. It also states that some images created by the curator or friends should not be redistributed “with or in association with any commercial/paid-for products.” Those images—and presets that require them—must be excluded from a paid retail package unless separate commercial permission is obtained.

### Current provenance gap

`MILKSORTED/README.txt` says presets from the collections under `F:\Milkdrop` were converted into a common IKANDY format. `_SHIPPED-IN-V1.txt` identifies the selected names but does not preserve a per-file source collection and license. The converted list therefore cannot currently distinguish demonstrably licensed presets from presets sourced from the uncertain or restricted collections.

## Required retail action

Before release, create a manifest with one row per bundled preset:

`bundled_name | SHA-256 | original_file | source_collection | author | license | evidence_path`

Ship only presets traceable to a documented commercial-use license or direct written permission. Quarantine all other converted presets until their rights are resolved. In particular:

- Do not rely on the Cream of the Crop public-domain assumption.
- Do not ship DeepField images marked `PRODIMG`, `WALLPAPER`, generic/unattributed, or covered by the paid-product restriction.
- Preserve author attribution even where the applicable license does not require it.

This review identifies evidence and gaps; it is not legal advice.
