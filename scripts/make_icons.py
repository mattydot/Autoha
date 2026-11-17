"""Generates the Android launcher icons, splash screens and Play Store graphics.
Run from the repo root: python3 scripts/make_icons.py  (needs Pillow)."""
import glob, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT = '/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf'
if not os.path.exists(FONT):
    FONT = glob.glob('/usr/share/fonts/**/*Bold*.ttf', recursive=True)[0]
BG = (11, 13, 20)

def gradient(w, h, top=(10, 12, 22), bot=(46, 22, 40)):
    im = Image.new('RGB', (w, h)); d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / max(1, h - 1); d.line([(0, y), (w, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(top, bot)))
    return im.convert('RGBA')

def road(im, S, cx, horizon, bottom, top_half, bot_half):
    d = ImageDraw.Draw(im)
    d.polygon([(cx - top_half * S, horizon * S), (cx + top_half * S, horizon * S), (cx + bot_half * S, bottom * S), (cx - bot_half * S, bottom * S)], fill=(52, 54, 58))
    for sgn in (-1, 1):
        d.line([(cx + sgn * top_half * S, horizon * S), (cx + sgn * bot_half * S, bottom * S)], fill=(238, 236, 226), width=max(2, int(1.4 * S)))
    # centre dashes, getting longer and wider towards the viewer
    y, k = horizon + 3, 0
    while y < bottom:
        t = (y - horizon) / (bottom - horizon); L = 3 + 9 * t; w = 0.6 + 2.2 * t
        d.rectangle([cx - w / 2 * S, y * S, cx + w / 2 * S, min(bottom, y + L) * S], fill=(238, 236, 226))
        y += L * 1.9; k += 1

def sign(im, S, cx, cy, w, h, speedlines=True):
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = (cx - w / 2) * S, (cy - h / 2) * S, (cx + w / 2) * S, (cy + h / 2) * S
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle([x0, y0 + 1.2 * S, x1, y1 + 1.2 * S], radius=3.4 * S, fill=(0, 0, 0, 140))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(1.2 * S)))
    d.rounded_rectangle([x0, y0, x1, y1], radius=3.4 * S, fill=(245, 245, 240))
    p = 1.1 * S
    d.rounded_rectangle([x0 + p, y0 + p, x1 - p, y1 - p], radius=2.6 * S, fill=(16, 78, 164))
    fa = ImageFont.truetype(FONT, int(h * 0.62 * S)); fr = ImageFont.truetype(FONT, int(h * 0.46 * S))
    wa = d.textlength('A', font=fa); wr = d.textlength('R', font=fr); gap = 0.08 * h * S; tx = cx * S - (wa + gap + wr) / 2
    base = cy * S + h * 0.24 * S
    d.text((tx, base), 'A', font=fa, fill=(255, 255, 255), anchor='ls')
    d.text((tx + wa + gap, base), 'R', font=fr, fill=(255, 210, 0), anchor='ls')
    if speedlines:
        for i, (dx, ln) in enumerate([(4, 10), (0, 14), (2, 10)]):
            yy = (cy + h / 2 + 3 + i * 3.2) * S; xe = (cx - w / 2 + 12 - dx) * S
            d.rounded_rectangle([xe - ln * S, yy - 0.7 * S, xe, yy + 0.7 * S], radius=0.7 * S, fill=(255, 210, 0))

def adaptive_layers(px):
    """108dp adaptive icon: background (gradient + road, full bleed) and foreground (sign, inside the 66dp safe zone)."""
    S = px / 108
    bg = gradient(px, px); road(bg, S, px / 2, 64, 112, 4, 62)
    fg = Image.new('RGBA', (px, px), (0, 0, 0, 0)); sign(fg, S, 54, 47, 40, 22)
    return bg, fg

def full_icon(px, shape='square'):
    big = px * 4; bg, fg = adaptive_layers(big); bg.alpha_composite(fg)
    m = 18 / 108 * big; im = bg.crop((int(m), int(m), int(big - m), int(big - m))).resize((px, px), Image.LANCZOS)   # the 72dp visible area
    mask = Image.new('L', (px * 4, px * 4), 0); md = ImageDraw.Draw(mask)
    if shape == 'round': md.ellipse([0, 0, px * 4 - 1, px * 4 - 1], fill=255)
    elif shape == 'square': md.rounded_rectangle([0, 0, px * 4 - 1, px * 4 - 1], radius=px * 4 * 0.2, fill=255)
    else: md.rectangle([0, 0, px * 4, px * 4], fill=255)
    out = Image.new('RGBA', (px, px), (0, 0, 0, 0)); out.paste(im, (0, 0), mask.resize((px, px), Image.LANCZOS)); return out

RES = 'android/app/src/main/res'
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for name, k in DENS.items():
    d = f'{RES}/mipmap-{name}'; os.makedirs(d, exist_ok=True)
    bg, fg = adaptive_layers(int(108 * k)); bg.convert('RGB').save(f'{d}/ic_launcher_background.png'); fg.save(f'{d}/ic_launcher_foreground.png')
    full_icon(int(48 * k), 'square').save(f'{d}/ic_launcher.png'); full_icon(int(48 * k), 'round').save(f'{d}/ic_launcher_round.png')
for f in glob.glob(f'{RES}/mipmap-anydpi-v26/*.xml'):
    s = open(f).read().replace('@color/ic_launcher_background', '@mipmap/ic_launcher_background')
    open(f, 'w').write(s)

# legacy splash images (Android 11 and older); 12+ uses the SplashScreen API with the launcher icon
for f in glob.glob(f'{RES}/drawable*/splash.png'):
    w, h = Image.open(f).size; im = Image.new('RGB', (w, h), BG); ic = full_icon(int(min(w, h) * 0.32), 'square')
    im.paste(ic, ((w - ic.width) // 2, (h - ic.height) // 2), ic); im.save(f)

# Play Store listing graphics and PWA icons
os.makedirs('docs/play', exist_ok=True)
full_icon(512, 'full').convert('RGB').save('docs/play/icon-512.png')
full_icon(512, 'full').convert('RGB').save('icons/maskable-512.png'); full_icon(512, 'square').save('icons/icon-512.png'); full_icon(192, 'square').save('icons/icon-192.png')
W, H = 1024, 500; S = H / 108; fgx = gradient(W, H); road(fgx, S, W * 0.72, 40, 112, 3, 70)
sign(fgx, S, 0.72 * W / S, 30, 30, 16, speedlines=False)
d = ImageDraw.Draw(fgx); ft = ImageFont.truetype(FONT, 92); fs = ImageFont.truetype(FONT, 34)
d.text((60, 170), 'AUTOBAHN', font=ft, fill=(255, 255, 255)); d.text((60, 262), 'RUSH', font=ft, fill=(255, 210, 0))
d.text((64, 380), 'No speed limit. Mind the Polizei.', font=fs, fill=(200, 204, 214))
fgx.convert('RGB').save('docs/play/feature-graphic.png')
print('icons written')
