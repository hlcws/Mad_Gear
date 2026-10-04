# Cuts objects out of green-screen images (Gemini flat-lays) into transparent PNGs.
#   python merch/shared/tools/cutout.py <image> <out.png> [--split N] [--scale 2]
# Keys out by hue, so a green background with a gradient/vignette works too. Removes green spill from edges.
# --split N: the image holds N separate objects (e.g. a pin sheet); writes out-1.png ... out-N.png,
#            numbered top-left to bottom-right, each cropped to its object.
# --scale S: upscale the result S times (Lanczos + light sharpening), for objects that print larger.
import sys
import numpy as np
from PIL import Image, ImageFilter

args = sys.argv[1:]
src, dst = args[0], args[1]
split = int(args[args.index("--split") + 1]) if "--split" in args else 1
scale = float(args[args.index("--scale") + 1]) if "--scale" in args else 1

rgb = np.asarray(Image.open(src).convert("RGB")).astype(float)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]

# "greenness": how much green beats the stronger of red/blue. Background ~ high, objects ~ 0 or negative.
greenness = g - np.maximum(r, b)
lo, hi = 25, 70                       # below lo = fully object, above hi = fully background, soft edge between
alpha = np.clip(1 - (greenness - lo) / (hi - lo), 0, 1)

# Despill: no pixel may be greener than its red/blue allows (keeps whites, reds, gold; kills green fringes)
g = np.minimum(g, np.maximum(r, b) + 4)
out = np.dstack([r, g, b, alpha * 255]).clip(0, 255).astype(np.uint8)
img = Image.fromarray(out, "RGBA")

def finish(im):
    im = im.crop(im.getbbox())
    if scale != 1:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
        rgb_part = im.convert("RGB").filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
        rgb_part.putalpha(im.getchannel("A"))
        im = rgb_part
    return im

if split == 1:
    finish(img).save(dst)
    print("wrote", dst, Image.open(dst).size)
else:
    # find the N largest blobs of opaque pixels (coarse grid labelling, good enough for well-separated objects)
    from collections import deque
    solid = alpha > 0.5
    small = solid[::8, ::8]
    labels = np.zeros(small.shape, int)
    blobs = []
    for y, x in zip(*np.nonzero(small)):
        if labels[y, x]:
            continue
        lab = len(blobs) + 1
        q, pts = deque([(y, x)]), []
        labels[y, x] = lab
        while q:
            cy, cx = q.popleft()
            pts.append((cy, cx))
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < small.shape[0] and 0 <= nx < small.shape[1] and small[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = lab
                    q.append((ny, nx))
        ys, xs = zip(*pts)
        blobs.append((len(pts), min(ys) * 8, min(xs) * 8, max(ys) * 8 + 8, max(xs) * 8 + 8))
    blobs = sorted(blobs, reverse=True)[:split]
    blobs.sort(key=lambda bl: (round(bl[1] / 300), bl[2]))   # rows, then left to right
    stem = dst[:-4]
    for i, (_, y0, x0, y1, x1) in enumerate(blobs, 1):
        pad = 16
        piece = img.crop((max(x0 - pad, 0), max(y0 - pad, 0), min(x1 + pad, img.width), min(y1 + pad, img.height)))
        name = f"{stem}-{i}.png"
        finish(piece).save(name)
        print("wrote", name, Image.open(name).size)
