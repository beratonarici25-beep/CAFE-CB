"""Cleans the owner's logo: the black corners outside the red rounded square become transparent (issue #26).

Run: python tools/logo.py   (needs Pillow and NumPy)
In:  assets/cover/cafecb-logo-orijinal.jpg (the untouched master)
Out: assets/cover/logo.png (full size, transparent corners) and assets/cover/logo-menu.webp (512 px, main menu)
Then `node tools/icons.js` renders the app icons from logo.png.

The red rounded square's edge is traced along rays from the centre, marching inwards from the image border (so
the artwork inside never confuses it), with sub-pixel precision. The contour is smoothed, pulled in by SHRINK px
(so the darkened anti-aliasing ramp of the black background is cut away), drawn at 8x and area-downsampled.
Red edge pixels still darkened by the black take the red a few px further in, so no dark fringe remains."""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

COVER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'cover')
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(COVER, 'cafecb-logo-orijinal.jpg')
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(COVER, 'logo.png')
menu = os.path.join(os.path.dirname(out), 'logo-menu.webp')
SS, SHRINK, N = 8, 1.6, 7200
img = Image.open(src).convert('RGB')
a = np.asarray(img).astype(np.float64)
h, w, _ = a.shape
R = a[..., 0]
cx, cy = (w - 1) / 2, (h - 1) / 2

def sample(x, y):
    x = np.clip(x, 0, w - 1.001); y = np.clip(y, 0, h - 1.001)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = x - x0; fy = y - y0
    return (R[y0, x0] * (1 - fx) * (1 - fy) + R[y0, x0 + 1] * fx * (1 - fy)
            + R[y0 + 1, x0] * (1 - fx) * fy + R[y0 + 1, x0 + 1] * fx * fy)

th = np.linspace(0, 2 * np.pi, N, endpoint=False)
dx, dy = np.cos(th), np.sin(th)
# distance from the centre to the image border along each ray
tb = np.minimum(np.where(dx != 0, (w - 1 - cx) / np.abs(dx + 1e-12), 1e9), np.where(dy != 0, (h - 1 - cy) / np.abs(dy + 1e-12), 1e9))
rad = np.empty(N)
step = 0.05
for i in range(N):
    t = np.arange(tb[i], tb[i] - 200, -step)
    v = sample(cx + dx[i] * t, cy + dy[i] * t)
    if v[0] >= 125:            # already red at the border (the straight sides): fully inside
        rad[i] = tb[i] + 3
        continue
    k = np.argmax(v >= 125)
    rad[i] = t[k] + step * (v[k] - 125) / max(v[k] - v[k - 1], 1e-6)
# smooth out JPEG noise (circular moving average over ~0.5 degree)
K = 11
rad_s = np.convolve(np.concatenate([rad[-K:], rad, rad[:K]]), np.ones(K) / K, 'same')[K:-K]
rad_s = np.where(rad >= tb + 2.5, tb + 3, rad_s - SHRINK)

poly = [((cx + dx[i] * rad_s[i] + 0.5) * SS, (cy + dy[i] * rad_s[i] + 0.5) * SS) for i in range(N)]
m = Image.new('L', (w * SS, h * SS), 0)
ImageDraw.Draw(m).polygon(poly, fill=255)
alpha = np.asarray(m).astype(np.float64).reshape(h, SS, w, SS).mean(axis=(1, 3))

rgb = a.copy()
# fringe: near the edge, red pixels darkened by the black take the red a few px further in (towards the centre)
near = np.asarray(Image.fromarray(((alpha < 255) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(13))) > 0
fr = near & (alpha > 0) & (a[..., 0] < 235) & (a[..., 1] < 45) & (a[..., 2] < 45)
ys, xs = np.nonzero(fr)
vx, vy = cx - xs, cy - ys
n = np.hypot(vx, vy)
for d in (8, 10, 12):
    sx = np.clip(np.round(xs + vx / n * d).astype(int), 0, w - 1)
    sy = np.clip(np.round(ys + vy / n * d).astype(int), 0, h - 1)
    src_px = a[sy, sx]
    rgb[ys, xs] = np.where((src_px[:, 0:1] > rgb[ys, xs][:, 0:1]) & (src_px[:, 1:2] < 60), src_px, rgb[ys, xs])
rgb[alpha == 0] = [241, 3, 1]  # #F10301, the logo red, under fully transparent pixels
res = np.dstack([rgb, alpha]).round().clip(0, 255).astype(np.uint8)
logo = Image.fromarray(res, 'RGBA')
logo.save(out, optimize=True)
logo.resize((512, 512), Image.LANCZOS).save(menu, 'WEBP', quality=86, alpha_quality=90, method=6)
print('wrote', os.path.relpath(out), 'and', os.path.relpath(menu), '| transparent px', int((alpha == 0).sum()), '| fringe px fixed', len(ys))
