# Merch

MadGearFFM shirts for Spreadshop. Every design has its sources at the top of its folder and writes
generated files to `out/` (print files are git-ignored, previews are kept). Needs Inkscape, Node and
Python with Pillow, numpy and fonttools.

```
dictionary/   Shirt 1: dictionary entry 魔奴義亜 / MadGearＦＦＭ
bosozoku/     Shirt 2: bōsōzoku tokkō-fuku look, two products (GOON 雑魚 / RINGLEADER 番長)
shared/       stamps, fonts, Gemini originals, tools used by both
archive/      earlier ideas: caricature column, bullet belt, tire track, vector coat front
```

## Dictionary shirt

`sh merch/dictionary/export.sh`

| Spreadshop area | File |
|---|---|
| Back | `dictionary/out/back-print.png` |
| Front, left chest (~9–10 cm) | `dictionary/out/front-print.png` (logo stamp) |

Source: `dictionary/back.svg`. `out/back-print.svg` / `.pdf` are the same back with text outlined.

## Bōsōzoku shirt

`sh merch/bosozoku/export.sh`

| Spreadshop area | GOON product | RINGLEADER product |
|---|---|---|
| Front | `bosozoku/out/front-zako-print.png` | `bosozoku/out/front-bancho-print.png` |
| Back | `bosozoku/out/back-print.png` | same |
| Sleeve (vector) | `bosozoku/out/sleeve-zako-print.svg` | `bosozoku/out/sleeve-bancho-print.svg` |

- `build-back.py`: vertical brush kanji scroll, blackletter sides, dark logo silhouette
- `build-front.py`: photo trompe-l'œil front: sash with 対戦上等, gold bike chain, enamel pins
- `build-sleeve.py`: seal stamp + rank badge
- `cutouts/`: transparent objects cut from the Gemini images (see `build-front.py` for which is which)

## Shared

- `stamps/stamp-seal.svg`, `stamps/stamp-logo.svg`: hanko stamps, vector, red ink only (gaps are holes)
- `gemini/`: original Gemini images (stamps, pins, sash, chain), named by content
- `fonts/`: Yuji brush fonts (OFL)
- `sources/`: original logo artwork, Sodom reference
- `tools/trace-stamp.sh`: red-ink stamp image → vector stamp (`speckles` sets how much wear survives)
- `tools/cutout.py`: green-screen image → transparent PNG (`--split N` for sheets, `--scale` to upscale)
- `tools/brush-kanji.py`: replaces `<text class="kanji">` with brush-font outlines
