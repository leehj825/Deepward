#!/usr/bin/env python3
"""Draws Deepward's icon in code (a stone arch over stairs glowing up out of the Deep, a sword planted before it) and
writes every image the web page, the Android app and the Play Store listing need (needs Pillow):
  icons/icon-1024.png, icon-512.png, icon-192.png       web / Play Store icon (full square)
  icons/feature-1024x500.png                            Play Store feature graphic
  resources/android/res/...                             launcher icons (legacy, round, adaptive foreground) and splash
                                                        screens; tools/android_patch.js copies them into android/
Run: python3 tools/make_icons.py"""
import math
import pathlib
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
BG_TOP, BG_BOT = (26, 18, 36), (6, 5, 10)
GLOW = (143, 216, 255)
GOLD = (242, 210, 122)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'


def gradient(w, h, top, bot, radial=False):
    img = Image.new('RGB', (w, h)); px = img.load()
    for y in range(h):
        for x in range(w):
            t = math.hypot((x - w / 2) / (w / 2), (y - h * 0.62) / (h / 2)) / 1.25 if radial else y / max(1, h - 1)
            t = min(1, t)
            px[x, y] = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
    return img


def emblem(n):
    """The arch, stairs, portcullis and sword on a transparent n x n canvas (drawn 4x larger, then shrunk)."""
    S = n * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cx, base = S / 2, S * 0.88
    ow, oh = S * 0.42, S * 0.38                         # outer arch half-width, height of the straight part
    iw = S * 0.27                                       # opening half-width
    top = base - oh
    # Light spilling out of the opening, blurred
    glow = Image.new('RGBA', (S, S), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    g.ellipse((cx - S * 0.36, top - S * 0.08, cx + S * 0.36, base + S * 0.05), fill=GLOW + (120,))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(S * 0.06)))
    # Stone arch: rectangle plus a half disc, with blocks marked out
    stone, edge = (70, 68, 84, 255), (120, 118, 140, 255)
    d.rectangle((cx - ow, top, cx + ow, base), fill=stone)
    d.pieslice((cx - ow, top - ow, cx + ow, top + ow), 180, 360, fill=stone)
    for k in range(-4, 5):                              # voussoirs around the curve
        a = math.pi + (k + 4.5) / 9 * math.pi
        d.line((cx + math.cos(a) * iw, top + math.sin(a) * iw, cx + math.cos(a) * ow, top + math.sin(a) * ow), fill=(46, 44, 58, 255), width=int(S * 0.012))
    for yy in range(1, 4):                              # courses on the jambs
        y = top + oh * yy / 4
        d.line((cx - ow, y, cx - iw, y), fill=(46, 44, 58, 255), width=int(S * 0.012))
        d.line((cx + iw, y, cx + ow, y), fill=(46, 44, 58, 255), width=int(S * 0.012))
    d.arc((cx - ow, top - ow, cx + ow, top + ow), 180, 360, fill=edge, width=int(S * 0.018))
    # The opening: glowing from below, stairs narrowing into the dark
    op = Image.new('RGBA', (S, S), (0, 0, 0, 0)); o = ImageDraw.Draw(op)
    for i in range(60):                                 # vertical light gradient inside the opening
        t = i / 59
        y0 = top - iw + (base - top + iw) * t
        c = tuple(int(10 + (GLOW[j] - 10) * t ** 2.2) for j in range(3))
        o.rectangle((cx - iw, y0, cx + iw, y0 + (base - top + iw) / 59 + 2), fill=c + (255,))
    mask = Image.new('L', (S, S), 0); m = ImageDraw.Draw(mask)
    m.rectangle((cx - iw, top, cx + iw, base), fill=255); m.pieslice((cx - iw, top - iw, cx + iw, top + iw), 180, 360, fill=255)
    for k in range(7):                                  # steps: each one narrower and darker going down into the Deep
        t = k / 7
        y = base - (base - top) * 0.62 * (1 - (1 - t) ** 1.6)
        hw = iw * (1 - 0.55 * t)
        o.rectangle((cx - hw, y - S * 0.012, cx + hw, y), fill=(18, 22, 34, int(230 - 120 * t)))
    im.paste(op, (0, 0), mask)
    # Portcullis, half raised
    for k in range(-3, 4):
        x = cx + k * iw / 3.4
        d.line((x, top - iw * math.sqrt(max(0, 1 - (k / 3.4) ** 2)) + S * 0.01, x, top + oh * 0.18), fill=(38, 36, 44, 255), width=int(S * 0.014))
        d.polygon([(x - S * 0.012, top + oh * 0.18), (x + S * 0.012, top + oh * 0.18), (x, top + oh * 0.18 + S * 0.03)], fill=(38, 36, 44, 255))
    d.line((cx - iw, top + oh * 0.1, cx + iw, top + oh * 0.1), fill=(38, 36, 44, 255), width=int(S * 0.012))
    # The sword, planted point-down in front of the gate
    bw, bl = S * 0.034, S * 0.42
    by = base + S * 0.02
    d.polygon([(cx - bw, by - bl), (cx + bw, by - bl), (cx + bw, by - S * 0.05), (cx, by), (cx - bw, by - S * 0.05)], fill=(214, 220, 232, 255))
    d.polygon([(cx, by - bl), (cx + bw, by - bl), (cx + bw, by - S * 0.05), (cx, by)], fill=(168, 176, 192, 255))
    gy = by - bl
    d.rounded_rectangle((cx - S * 0.13, gy - S * 0.03, cx + S * 0.13, gy + S * 0.005), radius=S * 0.012, fill=GOLD + (255,))
    d.rectangle((cx - S * 0.022, gy - S * 0.15, cx + S * 0.022, gy - S * 0.03), fill=(90, 58, 34, 255))
    for k in range(4):
        y = gy - S * 0.15 + k * S * 0.03 + S * 0.01
        d.line((cx - S * 0.022, y, cx + S * 0.022, y + S * 0.012), fill=(60, 38, 22, 255), width=int(S * 0.006))
    d.ellipse((cx - S * 0.035, gy - S * 0.2, cx + S * 0.035, gy - S * 0.135), fill=GOLD + (255,))
    return im.resize((n, n), Image.LANCZOS)


def icon(n, round_mask=False):
    bg = gradient(n, n, BG_TOP, BG_BOT, radial=True).convert('RGBA')
    e = emblem(int(n * 0.92)); bg.alpha_composite(e, ((n - e.width) // 2, int(n * 0.03)))
    if round_mask:
        mk = Image.new('L', (n * 4, n * 4), 0); ImageDraw.Draw(mk).ellipse((0, 0, n * 4 - 1, n * 4 - 1), fill=255)
        bg.putalpha(mk.resize((n, n), Image.LANCZOS))
    return bg


def foreground(n):
    """Adaptive-icon foreground: the emblem inside the central 66% safe zone, transparent around it."""
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0)); e = emblem(int(n * 0.62))
    im.alpha_composite(e, ((n - e.width) // 2, (n - e.height) // 2)); return im


def splash(w, h):
    bg = gradient(w, h, BG_TOP, BG_BOT, radial=True).convert('RGBA')
    s = int(min(w, h) * 0.42); e = emblem(s)
    y = int(h * 0.5 - s * 0.62)
    bg.alpha_composite(e, ((w - s) // 2, y))
    word(bg, 'DEEPWARD', w // 2, y + s + int(s * 0.04), int(s * 0.16))
    return bg.convert('RGB')


def word(img, text, cx, y, size):
    d = ImageDraw.Draw(img); f = ImageFont.truetype(FONT, size)
    sp = int(size * 0.28); widths = [d.textlength(c, font=f) for c in text]; total = sum(widths) + sp * (len(text) - 1)
    x = cx - total / 2
    for c, cw in zip(text, widths):
        d.text((x + size * 0.03, y + size * 0.05), c, font=f, fill=(0, 0, 0, 200)); d.text((x, y), c, font=f, fill=GOLD + (255,)); x += cw + sp


def main():
    ic = ROOT / 'icons'; ic.mkdir(exist_ok=True)
    big = icon(1024); big.save(ic / 'icon-1024.png')
    for n in (512, 192): big.resize((n, n), Image.LANCZOS).save(ic / f'icon-{n}.png')
    fg = gradient(1024, 500, BG_TOP, BG_BOT, radial=True).convert('RGBA')
    e = emblem(420); fg.alpha_composite(e, (40, 40)); word(fg, 'DEEPWARD', 730, 180, 62)
    ImageDraw.Draw(fg).text((730, 285), 'Read the blow. Answer it.', font=ImageFont.truetype(FONT, 30), fill=(200, 190, 170), anchor='mt')
    fg.convert('RGB').save(ic / 'feature-1024x500.png')
    res = ROOT / 'resources' / 'android' / 'res'
    for dname, n in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
        dd = res / f'mipmap-{dname}'; dd.mkdir(parents=True, exist_ok=True)
        icon(n).save(dd / 'ic_launcher.png'); icon(n, True).save(dd / 'ic_launcher_round.png')
    for dname, n in {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}.items():
        foreground(n).save(res / f'mipmap-{dname}' / 'ic_launcher_foreground.png')
    (res / 'values').mkdir(exist_ok=True)
    (res / 'values' / 'ic_launcher_background.xml').write_text('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#100C16</color>\n</resources>\n')
    sizes = {'land-mdpi': (480, 320), 'land-hdpi': (800, 480), 'land-xhdpi': (1280, 720), 'land-xxhdpi': (1600, 960), 'land-xxxhdpi': (1920, 1280)}
    sizes.update({k.replace('land', 'port'): (h, w) for k, (w, h) in list(sizes.items())})
    for dname, (w, h) in sizes.items():
        dd = res / f'drawable-{dname}'; dd.mkdir(parents=True, exist_ok=True); splash(w, h).save(dd / 'splash.png')
    (res / 'drawable').mkdir(exist_ok=True); splash(480, 320).save(res / 'drawable' / 'splash.png')
    print('icons/ and resources/android/res/ written')


if __name__ == '__main__':
    main()
