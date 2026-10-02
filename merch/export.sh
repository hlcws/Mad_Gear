#!/usr/bin/env sh
# Turns shirt-madogia.svg into print files (needs Inkscape + Node):
#   *-print.svg    text converted to outlines, logo embedded — send this to the printer
#   *-print.pdf    same, as PDF
#   *-preview.png  on a black background, for looking at
set -e
cd "$(dirname "$0")"
INKSCAPE="${INKSCAPE:-/c/Program Files/Inkscape/bin/inkscape.exe}"
src=shirt-madogia.svg
tmp=.shirt-inlined.svg

# Inline the linked logo so the print files are self-contained.
node -e '
const fs = require("fs");
let svg = fs.readFileSync(process.argv[1], "utf8");
svg = svg.replace(/<image href="([^"]+\.svg)" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"\s*\/>/g,
  (_, file, x, y, w, h) => fs.readFileSync(file, "utf8")
    .replace(/<\?xml[^>]*>/, "")
    .replace(/<svg\b[^>]*>/, (tag) => tag
      .replace(/\s(width|height)="[^"]*"/g, "")
      .replace(/<svg\b/, `<svg x="${x}" y="${y}" width="${w}" height="${h}"`)));
fs.writeFileSync(process.argv[2], svg);
' "$src" "$tmp"

"$INKSCAPE" "$tmp" --export-text-to-path --export-plain-svg --export-filename=shirt-madogia-print.svg
"$INKSCAPE" "$tmp" --export-text-to-path --export-filename=shirt-madogia-print.pdf
"$INKSCAPE" "$tmp" --export-background=#111111 --export-background-opacity=1 --export-width=900 --export-filename=shirt-madogia-preview.png
rm -f "$tmp"
