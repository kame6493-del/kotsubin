"""アイコンと起動画面を作る。python scripts/make_icons.py
絵は持ち主から届いたアイコン(scripts/icon_src/icon_new_1024.png。びんとハムスター)をそのまま使う。
- iOS AppIcon・ストア用(1024 / 512)・public/icon.png: 絵をそのまま(不透明)
- Android: 昔の形(四角・丸)と、アダプティブの前景。前景は 108dp のうち 64dp に絵を置き、
  まわりは背景の暖色(BG)へ少しずつ溶かす。安全域(直径 66dp の円)にびんのふたとハムスターが収まる大きさ。
- 起動画面: 生成りの地に、角の丸いアイコンを小さく
確かめ: scripts/cut_out/icon_check.png(安全域の円・丸・角丸で切った見え方)"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

APP = Path(__file__).resolve().parent.parent
RES = APP / "android/app/src/main/res"
SRC = Image.open(APP / "scripts/icon_src/icon_new_1024.png").convert("RGB")
BG = "#D9AE7C"  # 絵の縁(木の机と壁)になじむ暖色
CREAM = "#F5ECDD"
FG_DP = 64  # 前景の絵の大きさ(108dp のうち)


def rounded(im: Image.Image, r: float) -> Image.Image:
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), int(im.width * r), fill=255)
    out = im.convert("RGBA")
    out.putalpha(m)
    return out


def foreground(n: int) -> Image.Image:
    """n×n(108dp)の前景。絵は中央 FG_DP dp、縁は 3dp かけて透明へ"""
    k = n / 108
    side = int(FG_DP * k)
    art = SRC.resize((side, side), Image.LANCZOS).convert("RGBA")
    m = Image.new("L", (side, side), 0)
    pad = max(1, int(2.2 * k))
    ImageDraw.Draw(m).rounded_rectangle((pad, pad, side - 1 - pad, side - 1 - pad), int(side * 0.16), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(1.6 * k))
    art.putalpha(m)
    out = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    out.alpha_composite(art, ((n - side) // 2, (n - side) // 2))
    return out


def composed(n: int) -> Image.Image:
    """アダプティブの見え方(背景+前景)"""
    bg = Image.new("RGBA", (n, n), BG)
    bg.alpha_composite(foreground(n))
    return bg


# iOS・ストア・web
big = SRC.resize((1024, 1024), Image.LANCZOS)
big.save(APP / "store/icon_1024.png")
SRC.resize((512, 512), Image.LANCZOS).save(APP / "store/play/icon_512.png")
big.save(APP / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")
SRC.resize((192, 192), Image.LANCZOS).save(APP / "public/icon.png")

# Android(昔の形は絵をそのまま。丸は円で切る)
dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for d, k in dens.items():
    n = int(48 * k)
    rounded(SRC, 0.12).resize((n, n), Image.LANCZOS).save(RES / f"mipmap-{d}/ic_launcher.png")
    big4 = SRC.resize((n * 4, n * 4), Image.LANCZOS).convert("RGBA")
    m = Image.new("L", big4.size, 0)
    ImageDraw.Draw(m).ellipse((0, 0, n * 4 - 1, n * 4 - 1), fill=255)
    big4.putalpha(m)
    big4.resize((n, n), Image.LANCZOS).save(RES / f"mipmap-{d}/ic_launcher_round.png")
    fg_n = int(108 * k)
    foreground(fg_n * 4).resize((fg_n, fg_n), Image.LANCZOS).save(RES / f"mipmap-{d}/ic_launcher_foreground.png")
(RES / "values/ic_launcher_background.xml").write_text(
    f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{BG}</color>\n</resources>\n', encoding="utf-8")


def splash(w, h):
    im = Image.new("RGB", (w, h), CREAM)
    s = max(96, min(w, h) // 4)
    ic = rounded(SRC.resize((s, s), Image.LANCZOS), 0.22)
    im.paste(ic, ((w - s) // 2, (h - s) // 2), ic)
    return im


for folder in RES.iterdir():
    if folder.name.startswith("drawable") and (folder / "splash.png").exists():
        w, h = Image.open(folder / "splash.png").size
        splash(w, h).save(folder / "splash.png")
for f in (APP / "ios/App/App/Assets.xcassets/Splash.imageset").glob("*.png"):
    splash(2732, 2732).save(f)

# 確かめの絵: 前景+背景 / 安全域(66dp の円)だけ残す / 丸 / 角丸(ランチャーの型)
n = 432
c = composed(n)
safe = c.copy()
m = Image.new("L", (n, n), 0)
r = 66 / 108 * n / 2
ImageDraw.Draw(m).ellipse((n / 2 - r, n / 2 - r, n / 2 + r, n / 2 + r), fill=255)
safe.putalpha(m)
vis = c.crop((int(n * 18 / 108), int(n * 18 / 108), int(n * 90 / 108), int(n * 90 / 108))).resize((n, n))
circle = vis.copy()
m2 = Image.new("L", (n, n), 0)
ImageDraw.Draw(m2).ellipse((0, 0, n - 1, n - 1), fill=255)
circle.putalpha(m2)
sq = rounded(vis.convert("RGB"), 0.22)
out = Image.new("RGB", (n * 4 + 30, n), "#56804f")
for i, im in enumerate([c, safe, circle, sq]):
    out.paste(im, (i * (n + 10), 0), im)
d = ImageDraw.Draw(out)
d.ellipse((n / 2 - r, n / 2 - r, n / 2 + r, n / 2 + r), outline="red", width=2)
(APP / "scripts/cut_out").mkdir(exist_ok=True)
out.save(APP / "scripts/cut_out/icon_check.png")
print("ok")
