# Replaces every <text class="kanji" ...>X</text> in an SVG with outlines from a font file,
# so a brush font can be used without installing it.
#   python brush-kanji.py in.svg out.svg merch/shared/fonts/YujiBoku-Regular.ttf
import re, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

src, dst, fontfile = sys.argv[1:4]
font = TTFont(fontfile)
cmap, glyphs, hmtx = font.getBestCmap(), font.getGlyphSet(), font['hmtx']
upm = font['head'].unitsPerEm

def attr(tag, name, default=None):
    m = re.search(r'\s%s="([^"]*)"' % name, tag)
    return m.group(1) if m else default

def outline(m):
    tag, text = m.group(1), m.group(2)
    x, y, size = float(attr(tag, 'x')), float(attr(tag, 'y')), float(attr(tag, 'font-size'))
    spacing = float(attr(tag, 'letter-spacing', 0))
    s = size / upm
    names = [cmap[ord(c)] for c in text]
    advances = [hmtx[n][0] * s + spacing for n in names]
    if attr(tag, 'text-anchor') == 'middle':
        x -= (sum(advances) - spacing) / 2
    paths = []
    for n, adv in zip(names, advances):
        pen = SVGPathPen(glyphs)
        glyphs[n].draw(pen)
        paths.append('<path transform="translate(%.1f %.1f) scale(%.5f %.5f)" d="%s"/>'
                     % (x, y, s, -s, pen.getCommands()))
        x += adv
    return '<g class="kanji">%s</g>' % ''.join(paths)

svg = open(src, encoding='utf-8').read()
svg = re.sub(r'<text( class="kanji"[^>]*)>([^<]+)</text>', outline, svg)
open(dst, 'w', encoding='utf-8').write(svg)
