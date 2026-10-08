#!/usr/bin/env sh
# Exports the logos for the /logos page (needs Inkscape + Python):
#   public/logos/madgear-<name>-<width>.png   transparent PNGs at 512, 1024, 2048 px wide
#   public/logos/madgear-logos.zip            all SVGs and PNGs
# Run again after changing a logo. The list must match LOGOS in src/pages/logos.astro.
set -e
cd "$(dirname "$0")/.."
INKSCAPE="${INKSCAPE:-/c/Program Files/Inkscape/bin/inkscape.exe}"
names="full-ffm text-ffm full text mark"
widths="512 1024 2048"
out=public/logos
tmp=.logos-zip

rm -rf "$out" "$tmp"
mkdir -p "$out" "$tmp/svg" "$tmp/png"
for n in $names; do
  cp "public/logo-$n.svg" "$tmp/svg/madgear-$n.svg"
  for w in $widths; do
    "$INKSCAPE" "public/logo-$n.svg" --export-type=png --export-width="$w" --export-filename="$out/madgear-$n-$w.png" 2>/dev/null
  done
done
cp "$out"/*.png "$tmp/png/"
(cd "$tmp" && python -m zipfile -c ../"$out"/madgear-logos.zip svg png)
rm -rf "$tmp"
ls -l "$out"
