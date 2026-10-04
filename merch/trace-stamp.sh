#!/usr/bin/env sh
# Traces a red-ink stamp image (e.g. from Gemini) into a print-ready vector, then re-exports the shirt.
#   sh merch/trace-stamp.sh seal "stamps/kanji ....png" [speckles]
#   sh merch/trace-stamp.sh logo "stamps/logo ....png"  [speckles]
# Writes stamp-<name>.svg: red ink only, everything else is a hole (shirt shows through).
# speckles = ink blobs / holes smaller than this many pixels are dropped (default 120).
#   Lower = more wear survives. At 300 units on the shirt (~7.5 cm), a 2048 px image gives
#   ~0.04 mm per pixel, so 120 px ~ 0.45 mm across: smaller than that may not print.
# Needs Inkscape (path via INKSCAPE=), Python with Pillow + numpy.
set -e
cd "$(dirname "$0")"
INKSCAPE="${INKSCAPE:-/c/Program Files/Inkscape/bin/inkscape.exe}"
name="$1"; src="$2"; speckles="${3:-120}"
[ -n "$name" ] && [ -f "$src" ] || { echo "usage: sh trace-stamp.sh seal|logo <image> [speckles]"; exit 1; }
tmp=".trace-$name"

# 1. Red ink -> black, paper -> white, cropped to the ink; wrapped in an SVG Inkscape can trace.
python - "$src" "$tmp" <<'EOF'
import sys, base64, io
from PIL import Image
import numpy as np
src, tmp = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert("RGB")).astype(int)
ink = (a[..., 0] - (a[..., 1] + a[..., 2]) / 2) > 90   # red ink vs white paper / pale pink haze
ys, xs = np.nonzero(ink)
ink = ink[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
h, w = ink.shape
buf = io.BytesIO()
Image.fromarray(np.where(ink, 0, 255).astype(np.uint8)).save(buf, "PNG")
b64 = base64.b64encode(buf.getvalue()).decode()
open(tmp + "-wrap.svg", "w").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
    f'<image id="bmp" xlink:href="data:image/png;base64,{b64}" x="0" y="0" width="{w}" height="{h}"/></svg>')
EOF

# 2. Trace (2 colour scans, background removed = ink only), drop the bitmap, colour it red.
"$INKSCAPE" "$tmp-wrap.svg" --actions="select-by-id:bmp;object-trace:2,false,false,true,$speckles,1.0,0.2;export-plain-svg;export-filename:$tmp-traced.svg;export-do" 2>&1 | grep -v "unsupported target\|Tracing" || true
python - "$tmp-traced.svg" "stamp-$name.svg" "$src" "$speckles" <<'EOF'
import sys, re
s = open(sys.argv[1]).read()
s = re.sub(r'<image[^>]*/>', '', s, flags=re.S).replace("fill:#000000", "fill:#d4000c")
s = s.replace("<svg", f"<!-- Traced from {sys.argv[3]} (speckles < {sys.argv[4]} px removed) by trace-stamp.sh. Red ink only, gaps are holes. -->\n<svg", 1)
open(sys.argv[2], "w").write(s)
EOF
rm -f "$tmp-wrap.svg" "$tmp-traced.svg"
echo "wrote stamp-$name.svg"

# 3. Rebuild print files + preview.
sh export.sh
echo "check shirt-madogia-preview.png"
