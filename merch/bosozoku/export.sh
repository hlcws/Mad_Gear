#!/usr/bin/env sh
# Bōsōzoku shirt: rebuilds every print file into out/ (needs Inkscape + Python with Pillow, numpy, fonttools):
#   out/back-print.png             back: transparent, 4000 px wide              (both products)
#   out/front-zako-print.png       front, GOON product (rank pin 雑魚): transparent, 3600 x 4800
#   out/front-bancho-print.png     front, RINGLEADER product (rank pin 番長)
#   out/sleeve-<rank>-print.svg    sleeve badge, flattened vector (Spreadshop sleeves need vector)
#   out/*-preview.png              on a black background, for looking at
set -e
cd "$(dirname "$0")"
INKSCAPE="${INKSCAPE:-/c/Program Files/Inkscape/bin/inkscape.exe}"
quiet() { grep -v "unsupported target" || true; }
mkdir -p out

python build-back.py
"$INKSCAPE" out/back.svg --export-background-opacity=0 --export-width=4000 --export-filename=out/back-print.png 2>&1 | quiet
"$INKSCAPE" out/back.svg --export-background=#111111 --export-background-opacity=1 --export-width=900 --export-filename=out/back-preview.png 2>&1 | quiet

for rank in zako bancho; do
  python build-front.py "$rank"
done

python build-sleeve.py
for rank in zako bancho; do
  "$INKSCAPE" "out/sleeve-$rank.svg" --export-plain-svg --export-filename="out/sleeve-$rank-print.svg" 2>&1 | quiet
  "$INKSCAPE" "out/sleeve-$rank.svg" --export-background=#111111 --export-background-opacity=1 --export-width=600 --export-filename="out/sleeve-$rank-preview.png" 2>&1 | quiet
done
echo "done"
