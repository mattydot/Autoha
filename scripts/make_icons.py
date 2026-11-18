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

def car(im, S, cx, cy, w):
    """A low sports car seen from behind: wide hips, glowing LED light bar, quad pipes, rear wing.
    cx, cy: centre of the body in icon units; w: overall width."""
    k = w / 58                       # sizes below are for a 58-unit-wide car
    X = lambda x: (cx + x * k) * S; Y = lambda y: (cy + y * k) * S
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).ellipse([X(-32), Y(12), X(32), Y(20)], fill=(0, 0, 0, 210))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(1.2 * k * S)))
    d = ImageDraw.Draw(im)
    for x0, x1 in ((-27, -19), (19, 27)):                                                    # tyres
        d.rounded_rectangle([X(x0), Y(4), X(x1), Y(17)], radius=1.6 * k * S, fill=(14, 14, 16))
    d.polygon([(X(-16), Y(-17)), (X(16), Y(-17)), (X(22), Y(-5)), (X(-22), Y(-5))], fill=(205, 212, 222))      # cabin
    d.polygon([(X(-14), Y(-15.5)), (X(14), Y(-15.5)), (X(19.5), Y(-6)), (X(-19.5), Y(-6))], fill=(22, 28, 40))  # rear glass
    d.polygon([(X(-12), Y(-14.5)), (X(-4), Y(-14.5)), (X(-10), Y(-7))], fill=(58, 72, 96))                    # glare
    d.polygon([(X(-22), Y(-6)), (X(22), Y(-6)), (X(28), Y(-1)), (X(29), Y(10)), (X(26), Y(13)), (X(-26), Y(13)), (X(-29), Y(10)), (X(-28), Y(-1))], fill=(214, 220, 228))
    d.polygon([(X(-29), Y(5)), (X(29), Y(5)), (X(29), Y(10)), (X(26), Y(13)), (X(-26), Y(13)), (X(-29), Y(10))], fill=(168, 176, 188))   # lower shading
    d.line([(X(-27), Y(-1.6)), (X(27), Y(-1.6))], fill=(248, 249, 252), width=max(1, int(0.8 * k * S)))       # shoulder line
    for sx in (-1, 1): d.rectangle([X(sx * 13 - 1), Y(-10), X(sx * 13 + 1), Y(-5)], fill=(30, 32, 36))          # wing stands
    d.rounded_rectangle([X(-25), Y(-12.5), X(25), Y(-9.5)], radius=0.9 * k * S, fill=(30, 32, 36))             # wing
    d.rounded_rectangle([X(-21), Y(7.5), X(21), Y(13)], radius=1.2 * k * S, fill=(26, 27, 31))                 # diffuser
    for x in (-15, -10, 10, 15):
        d.ellipse([X(x - 2.1), Y(8.3), X(x + 2.1), Y(12.3)], fill=(150, 155, 162)); d.ellipse([X(x - 1.3), Y(9.1), X(x + 1.3), Y(11.5)], fill=(12, 12, 14))
    glow = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle([X(-28), Y(0), X(28), Y(3.6)], radius=1.4 * k * S, fill=(255, 30, 40, 255))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(2.4 * k * S)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([X(-27), Y(0.5), X(27), Y(3.1)], radius=1.2 * k * S, fill=(255, 40, 48))                # LED light bar
    d.rounded_rectangle([X(-25.5), Y(1.3), X(25.5), Y(2.2)], radius=0.5 * k * S, fill=(255, 175, 175))

def speedlines(im, S, cx, cy, spread):
    d = ImageDraw.Draw(im)
    for sx in (-1, 1):
        for dy, ln in ((-5, 8), (0, 12), (5, 8)):
            a = cx + sx * spread; b = a + sx * ln
            d.rounded_rectangle([min(a, b) * S, (cy + dy - 0.6) * S, max(a, b) * S, (cy + dy + 0.6) * S], radius=0.6 * S, fill=(255, 210, 0, 230))

def sun(im, S, cx, cy, r):
    g = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(g).ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=(255, 140, 60, 160))
    im.alpha_composite(g.filter(ImageFilter.GaussianBlur(r * 0.5 * S)))

def adaptive_layers(px):
    """108dp adaptive icon: background (dusk sky, sun glow, road; full bleed) and foreground (the car, inside the 66dp safe zone)."""
    S = px / 108
    bg = gradient(px, px, (12, 14, 30), (70, 30, 52)); sun(bg, S, 54, 46, 24); road(bg, S, px / 2, 46, 112, 3, 62)
    fg = Image.new('RGBA', (px, px), (0, 0, 0, 0)); car(fg, S, 54, 58, 56)
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
W, H = 1024, 500; S = H / 108; fgx = gradient(W, H, (12, 14, 30), (70, 30, 52)); sun(fgx, S, 0.72 * W / S, 40, 30); road(fgx, S, W * 0.72, 40, 112, 3, 70)
car(fgx, S, 0.72 * W / S, 72, 46)
d = ImageDraw.Draw(fgx); ft = ImageFont.truetype(FONT, 92); fs = ImageFont.truetype(FONT, 34)
d.text((60, 170), 'AUTOBAHN', font=ft, fill=(255, 255, 255)); d.text((60, 262), 'RUSH', font=ft, fill=(255, 210, 0))
d.text((64, 380), 'No speed limit. Mind the Polizei.', font=fs, fill=(200, 204, 214))
fgx.convert('RGB').save('docs/play/feature-graphic.png')
print('icons written')
