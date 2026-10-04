#!/usr/bin/env sh
# Dictionary shirt: turns back.svg into print files in out/ (needs Inkscape + Node):
#   out/back-print.svg   text converted to outlines, stamps embedded
#   out/back-print.pdf   same, as PDF
#   out/back-print.png   transparent 4000 px wide PNG: upload this to Spreadshop (back)
#   out/front-print.png  the logo stamp alone, transparent 4000 px: upload this (front, left chest)
#   out/stamp-seal-print.png  the seal stamp alone (spare, e.g. for a sleeve)
#   out/back-preview.png on a black background, for looking at
set -e
cd "$(dirname "$0")"
INKSCAPE="${INKSCAPE:-/c/Program Files/Inkscape/bin/inkscape.exe}"
src=back.svg
tmp=.shirt-inlined.svg

# Inline the linked logos so the print files are self-contained.
# Each copy gets its own id prefix, so the same logo can appear more than once.
node -e '
const fs = require("fs");
let svg = fs.readFileSync(process.argv[1], "utf8");
let n = 0;
svg = svg.replace(/<image href="([^"]+\.svg)" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"\s*\/>/g,
  (_, file, x, y, w, h) => (n++, fs.readFileSync(file, "utf8"))
    .replace(/<\?xml[^>]*>/, "")
    .replace(/\bid="([^"]+)"/g, `id="i${n}-$1"`)
    .replace(/(url\(#|href="#)([^)"]+)/g, `$1i${n}-$2`)
    .replace(/<svg\b[^>]*>/, (tag) => tag
      .replace(/\s(width|height)="[^"]*"/g, "")
      .replace(/<svg\b/, `<svg x="${x}" y="${y}" width="${w}" height="${h}"`)));
fs.writeFileSync(process.argv[2], svg);
' "$src" "$tmp"

"$INKSCAPE" "$tmp" --export-text-to-path --export-plain-svg --export-filename=out/back-print.svg
"$INKSCAPE" "$tmp" --export-text-to-path --export-filename=out/back-print.pdf
# Spreadshop: transparent RGB PNG, >= 4000 px on the long side, <= 10 MB.
"$INKSCAPE" "$tmp" --export-background-opacity=0 --export-width=4000 --export-filename=out/back-print.png
"$INKSCAPE" "$tmp" --export-background=#111111 --export-background-opacity=1 --export-width=900 --export-filename=out/back-preview.png
rm -f "$tmp"

# Stamps on their own: transparent, 4000 px square, red ink only.
"$INKSCAPE" ../shared/stamps/stamp-logo.svg --export-background-opacity=0 --export-width=4000 --export-filename=out/front-print.png
"$INKSCAPE" ../shared/stamps/stamp-seal.svg --export-background-opacity=0 --export-width=4000 --export-filename=out/stamp-seal-print.png
