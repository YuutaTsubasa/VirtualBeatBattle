# 把 Codex 畫的原圖（raw-beat/<畫風>/...png）整理成音鬥樂要的尺寸與色盤，寫進 repo 的 public/styles/<畫風>/。
# 像素畫風的 Logo 不用原圖（生成工具一直把「鬥」畫錯），改用 90 年代版的正確 Logo 縮成像素、壓到色盤（頁面底是亮的，深藍字照用）。
import os
import sys
from PIL import Image, ImageOps

RAW, REPO = sys.argv[1], sys.argv[2]
# 像素畫風：場景、封面縮到 1/4（跟關卡背景一樣 480×270），Logo 縮到 1/2（PC-98／MS-DOS）或 1/4（Game Boy）
SCENE = {'pc98': 4, 'msdos': 4, 'gameboy': 4}
LOGO = {'pc98': 2, 'msdos': 2, 'gameboy': 4}
GB = [(0x0F, 0x38, 0x0F), (0x30, 0x62, 0x30), (0x8B, 0xAC, 0x0F), (0x9B, 0xBC, 0x0F)]


def gb_tones(im):
    """Game Boy 場景：照亮度分成四階（門檻取亮度的四分位數，四色都用得到、對比不會糊掉）"""
    lum = im.convert('L')
    hist = lum.histogram()
    total = sum(hist)
    cuts, acc, q = [], 0, 1
    for v, n in enumerate(hist):
        acc += n
        while q <= 3 and acc >= total * q / 4:
            cuts.append(v)
            q += 1
    lut = [GB[sum(v > c for c in cuts)] for v in range(256)]
    out = Image.new('RGB', im.size)
    out.putdata([lut[v] for v in lum.getdata()])
    return out


def quantize(style, im):
    alpha = im.getchannel('A').point(lambda a: 255 if a >= 128 else 0) if im.mode == 'RGBA' else None
    rgb = Image.new('RGB', im.size, (0, 0, 0))
    rgb.paste(im.convert('RGB'), mask=alpha)
    if style == 'gameboy':
        pal = Image.new('P', (1, 1))
        pal.putpalette([c for v in GB for c in v] + [0] * (256 - 4) * 3)
        q = rgb.quantize(palette=pal, dither=Image.Dither.NONE).convert('RGB')
    else:
        q = rgb.quantize(colors=16, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    if alpha is None:
        return q
    q = q.convert('RGBA')
    q.putalpha(alpha)
    return q


def save(style, rel, im):
    path = os.path.join(REPO, 'public', 'styles', style, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'WEBP', lossless=style in SCENE, quality=90, method=6)
    print('寫好', style, rel, im.size)


def scene(style, src, size):
    """填滿 size（裁掉多的邊）；像素畫風縮到 1/4 再壓色"""
    f = SCENE.get(style, 1)
    im = ImageOps.fit(Image.open(src).convert('RGB'), (size[0] // f, size[1] // f), Image.LANCZOS)
    if style == 'gameboy':
        return gb_tones(im)
    return quantize(style, im) if f > 1 else im


def logo_fit(im, size):
    im = im.convert('RGBA')
    im = im.crop(im.getbbox())
    k = min((size[0] - 40) / im.width, (size[1] - 20) / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    out = Image.new('RGBA', size)
    out.alpha_composite(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2))
    return out


for style in ['pc98', 'msdos', 'taiwan-print', 'gameboy', 'modern-paint']:
    d = os.path.join(RAW, style)
    for rel, size in [('ui/title-scene', (1920, 1080)), ('games/og-edm', (1920, 1080)), ('games/og-hardcore', (1920, 1080)),
                      ('games/og-speedcore', (1920, 1080)), ('covers/og-edm', (512, 512)), ('covers/og-hardcore', (512, 512)), ('covers/og-speedcore', (512, 512))]:
        src = os.path.join(d, rel + '.png')
        if os.path.exists(src):
            save(style, rel + '.webp', scene(style, src, size))
    if style in LOGO:
        base = Image.open(os.path.join(REPO, 'public', 'ui', 'logo.webp')).convert('RGBA')
        f = LOGO[style]
        small = quantize(style, base.resize((base.width // f, base.height // f), Image.LANCZOS))
        save(style, 'ui/logo.webp', small)
    elif os.path.exists(src := os.path.join(d, 'ui', 'logo.png')):
        save(style, 'ui/logo.webp', logo_fit(Image.open(src), (1400, 560)))
