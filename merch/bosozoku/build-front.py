# Builds the photo-style (trompe-l'œil) front of the bōsōzoku shirt from the cut-outs in cutouts/.
#   python merch/bosozoku/build-front.py [zako|bancho]   (or run export.sh for everything)
# Writes out/front-<rank>-print.png (transparent, 30 x 40 cm at 300 dpi) and out/front-<rank>-preview.png (on black).
# Cut-outs come from shared/tools/cutout.py run on the images in shared/gemini/:
#   cutouts/sash.png (sash-knot.jfif, --scale 2), cutouts/chain.png (chain-hanging.jfif),
#   cutouts/pin-logo|seal|stick|rank-blank.png (pins.jfif --split 4, outputs 1..4 renamed in that order).
import sys, math
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))   # paths below are relative to merch/bosozoku/
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
from fontTools.ttLib import TTFont

RANK = sys.argv[1] if len(sys.argv) > 1 else "zako"
RANK_KANJI = {"zako": "雑魚", "bancho": "番長"}[RANK]
SASH_TEXT = "対戦上等"
BRUSH = "../shared/fonts/YujiBoku-Regular.ttf"
W, H = 3600, 4800                      # 30 x 40 cm at 300 dpi
CM = W / 30                            # pixels per cm
SHADOWS = False                        # drop shadows: invisible on a black shirt, would only print black-on-black

def scaled(im, width_cm=None, height_cm=None):
    k = (width_cm * CM / im.width) if width_cm else (height_cm * CM / im.height)
    return im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)

def shadow(im, offset=(14, 20), blur=14, strength=0.55):
    a = im.getchannel("A").point(lambda v: int(v * strength))
    pad = blur * 3
    sh = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    sh.putalpha(0)
    alpha = Image.new("L", sh.size, 0)
    alpha.paste(a, (pad, pad))
    alpha = alpha.filter(ImageFilter.GaussianBlur(blur))
    sh = Image.new("RGBA", sh.size, (0, 0, 0, 255))
    sh.putalpha(alpha)
    return sh, (offset[0] - pad, offset[1] - pad)

def place(canvas, im, x, y, angle=0):
    """Paste im centred at (x, y), rotated by angle degrees (counter-clockwise), with a drop shadow."""
    if angle:
        im = im.rotate(angle, resample=Image.BICUBIC, expand=True)
    x0, y0 = round(x - im.width / 2), round(y - im.height / 2)
    if SHADOWS:
        sh, (dx, dy) = shadow(im)
        canvas.alpha_composite(sh, (x0 + dx, y0 + dy))
    canvas.alpha_composite(im, (x0, y0))

def hang(canvas, im, left_target, right_target):
    """Scale/rotate im so its two topmost end points (left half, right half) land on the two targets."""
    a = np.asarray(im.getchannel("A")) > 128
    ends = []
    for x0, x1 in ((0, im.width // 2), (im.width // 2, im.width)):
        ys, xs = np.nonzero(a[:, x0:x1])
        top = ys.min()
        sel = ys < top + im.height * 0.06
        ends.append((xs[sel].mean() + x0, ys[sel].mean()))
    (ax, ay), (bx, by) = ends
    (tx0, ty0), (tx1, ty1) = left_target, right_target
    k = math.hypot(tx1 - tx0, ty1 - ty0) / math.hypot(bx - ax, by - ay)
    rot = math.degrees(math.atan2(ty1 - ty0, tx1 - tx0) - math.atan2(by - ay, bx - ax))
    big = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    rotated = big.rotate(-rot, resample=Image.BICUBIC, expand=True)
    # where does the left end land after scaling + rotating about the centre (expand keeps it centred)?
    cx, cy = big.width / 2, big.height / 2
    r = math.radians(rot)
    ex, ey = ax * k - cx, ay * k - cy
    lx = ex * math.cos(r) - ey * math.sin(r) + rotated.width / 2
    ly = ex * math.sin(r) + ey * math.cos(r) + rotated.height / 2
    x0, y0 = round(tx0 - lx), round(ty0 - ly)
    if SHADOWS:
        sh, (dx, dy) = shadow(rotated)
        canvas.alpha_composite(sh, (x0 + dx, y0 + dy))
    canvas.alpha_composite(rotated, (x0, y0))

def ink_text(img, text, centre_line, size, color, angle_deg):
    """Write text vertically along a line on img, multiplied into the cloth so folds show through."""
    font = ImageFont.truetype(BRUSH, size)
    col = Image.new("L", (size * 2, size * len(text) + size), 0)
    d = ImageDraw.Draw(col)
    for i, ch in enumerate(text):
        d.text((size // 2, size // 2 + i * size), ch, font=font, fill=255)
    col = col.crop(col.getbbox()).filter(ImageFilter.GaussianBlur(1.2))   # ink soaks in a little
    col = col.rotate(angle_deg, resample=Image.BICUBIC, expand=True)
    cx, cy = centre_line
    layer = Image.new("RGBA", img.size, (255, 255, 255, 0))
    tint = Image.new("RGBA", col.size, color + (255,))
    tint.putalpha(col)
    layer.alpha_composite(tint, (round(cx - col.width / 2), round(cy - col.height / 2)))
    # multiply only where the cloth is (keep the sash alpha)
    rgb = ImageChops.multiply(img.convert("RGB"), Image.alpha_composite(Image.new("RGBA", img.size, (255, 255, 255, 255)), layer).convert("RGB"))
    rgb.putalpha(img.getchannel("A"))
    return rgb

canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

# --- gold bike chain (three strands, hanging U), between the logo pin and the sash; drawn first so both cover its ends
chain = Image.open("cutouts/chain.png")    # hanging U, ends at the top
hang(canvas, chain, (6.0 * CM, 9.2 * CM), (20.6 * CM, 9.0 * CM))    # left end under the logo pin, right end under the sash

# --- sash: top end at the top right, knot at the bottom left
sash = scaled(Image.open("cutouts/sash.png"), height_cm=36)
a = np.asarray(sash.getchannel("A")) > 128
rows = range(int(sash.height * 0.06), int(sash.height * 0.55), 20)       # straight part, above the knot
centres = [(y, np.nonzero(a[y])[0].mean()) for y in rows if a[y].any()]
ys, xs = np.array(centres).T
slope, icpt = np.polyfit(ys, xs, 1)                                      # x = slope * y + icpt along the sash
widths = [a[int(y)].sum() for y in ys]
angle = math.degrees(math.atan(slope))                                   # lean of the sash from vertical
y_mid = sash.height * 0.30
sash = ink_text(sash, SASH_TEXT, (slope * y_mid + icpt, y_mid), int(np.median(widths) * 0.62), (176, 18, 28), angle)
place(canvas, sash, W - 300 - sash.width / 2, 120 + sash.height / 2)

# --- pins, loosely scattered on the free upper chest (viewer's left)
pins = [Image.open(f"cutouts/pin-{n}.png") for n in ("logo", "seal", "stick", "rank-blank")]
rank_pin = pins[3].copy()
font = ImageFont.truetype(BRUSH, int(rank_pin.height * 0.62))
d = ImageDraw.Draw(rank_pin)
d.text((rank_pin.width / 2 + 3, rank_pin.height / 2 + 4), RANK_KANJI, font=font, fill=(90, 60, 10, 255), anchor="mm")   # engraved edge
d.text((rank_pin.width / 2, rank_pin.height / 2), RANK_KANJI, font=font, fill=(222, 182, 92, 255), anchor="mm")         # gold
place(canvas, scaled(pins[0], width_cm=5.0), 6.0 * CM, 8.5 * CM, angle=8)       # logo (holds the chain)
place(canvas, scaled(pins[1], width_cm=4.0), 11.5 * CM, 6.5 * CM, angle=-6)     # seal
place(canvas, scaled(pins[2], width_cm=4.2), 16.0 * CM, 7.2 * CM, angle=5)      # arcade stick
place(canvas, scaled(rank_pin, width_cm=4.6), 11.0 * CM, 13.5 * CM, angle=-4)   # rank, inside the chain's U

canvas.save(f"out/front-{RANK}-print.png")
prev = Image.new("RGBA", canvas.size, (17, 17, 17, 255))
prev.alpha_composite(canvas)
prev.convert("RGB").resize((900, 1200), Image.LANCZOS).save(f"out/front-{RANK}-preview.png")
print("wrote", f"out/front-{RANK}-print.png", canvas.size, "| sash lean %.1f deg" % angle)
