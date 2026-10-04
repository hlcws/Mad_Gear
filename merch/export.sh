#!/usr/bin/env sh
# Turns shirt-madogia.svg into print files (needs Inkscape + Node):
#   *-print.svg    text converted to outlines, logo embedded — send this to the printer
#   *-print.pdf    same, as PDF
#   *-print.png    transparent 4000 px wide PNG for Spreadshop
#   stamp-*-print.png  each stamp alone, transparent 4000 px (sleeve prints)
#   *-preview.png  on a black background, for looking at
set -e
cd "$(dirname "$0")"
INKSCAPE="${INKSCAPE:-/c/Program Files/Inkscape/bin/inkscape.exe}"
src=shirt-madogia.svg
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

"$INKSCAPE" "$tmp" --export-text-to-path --export-plain-svg --export-filename=shirt-madogia-print.svg
"$INKSCAPE" "$tmp" --export-text-to-path --export-filename=shirt-madogia-print.pdf
# Spreadshop: transparent RGB PNG, >= 4000 px on the long side, <= 10 MB.
"$INKSCAPE" "$tmp" --export-background-opacity=0 --export-width=4000 --export-filename=shirt-madogia-print.png
"$INKSCAPE" "$tmp" --export-background=#111111 --export-background-opacity=1 --export-width=900 --export-filename=shirt-madogia-preview.png
rm -f "$tmp"

# Stamps on their own (e.g. sleeve print): transparent, 4000 px square, red ink only.
for s in seal logo; do
  "$INKSCAPE" "stamp-$s.svg" --export-background-opacity=0 --export-width=4000 --export-filename="stamp-$s-print.png"
done
