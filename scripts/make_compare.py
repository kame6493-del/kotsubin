"""見本(左)とアプリの画面(右)を並べる。python scripts/make_compare.py → docs/compare_*.png と docs/compare_all.png
先に python scripts/shots.py 430 light と python scripts/e2e.py(e2e_out の写真)を流しておく。"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

APP = Path(__file__).resolve().parent.parent
OUT = APP / "docs"
E = APP / "scripts/e2e_out"
F = ImageFont.truetype(str(APP / "scripts/fonts/ZenMaruGothic-Bold.ttf"), 30)
PAIRS = [
    ("1_today_focus", 1, ["shot_430_light_today_focus"], "見本1 きょう(作業中)"),
    ("2_shelf", 2, ["shot_430_light_shelf"], "見本2 たな(月の棚)"),
    ("3_day", 3, ["shot_430_light_day"], "見本3 その日"),
    ("4_shelf_summary", 4, ["shot_430_light_shelf"], "見本4 たな(選んだ日のまとめ)"),
    ("5_rest", 5, ["shot_430_light_today_rest"], "見本5 休憩中"),
    ("6_review", 6, ["shot_430_light_review"], "見本6 ふりかえり"),
    ("7_set", 7, ["shot_430_light_set"], "見本7 セット(なかまセット)"),
    ("8_parts", 8, ["shot_430_light_today_empty", "e2e_430-light_05_drop", "shot_430_light_today_pause", "e2e_430-light_15_edit"], "見本8 部品(空の状態・1粒の動き・休憩のすすめ・作業履歴)"),
]
H = 1672


def fit(im, h):
    return im.resize((int(im.width * h / im.height), h), Image.LANCZOS)


def build(name, k, shots, label):
    m = Image.open(APP / f"scripts/mihon/m{k}.png").convert("RGB")
    m = fit(m, H) if k != 8 else m.resize((int(m.width * H / m.height), H))
    apps = []
    for s in shots:
        im = Image.open(E / f"{s}.png").convert("RGB")
        im = im.resize((860, int(im.height * 860 / im.width)))
        apps.append(im.crop((0, 0, 860, min(im.height, 1864 if len(shots) == 1 else 1864))))
    w_app = sum(int(a.width * H / max(a.height, 1)) if a.height > H else a.width for a in apps)
    apps = [fit(a, H) if a.height > H else a for a in apps]
    W = m.width + 40 + sum(a.width + 20 for a in apps)
    out = Image.new("RGB", (W, H + 70), (250, 246, 238))
    d = ImageDraw.Draw(out)
    d.text((10, 14), f"{label}  左: 見本 / 右: アプリ(430幅)", font=F, fill=(74, 47, 32))
    out.paste(m, (0, 70))
    x = m.width + 40
    for a in apps:
        out.paste(a, (x, 70))
        x += a.width + 20
    del w_app
    out = out.resize((int(out.width * 0.6), int(out.height * 0.6)), Image.LANCZOS)
    out.save(OUT / f"compare_{name}.png", optimize=True)
    return out


all_ims = [build(*p) for p in PAIRS]
# 一覧: どれも高さをそろえ、2枚ずつ横に並べる
th = 560
thumbs = [im.resize((int(im.width * th / im.height), th), Image.LANCZOS) for im in all_ims]
rows = [thumbs[i:i + 2] for i in range(0, len(thumbs), 2)]
W = max(sum(t.width for t in r) + 20 * (len(r) - 1) for r in rows)
sheet = Image.new("RGB", (W, (th + 16) * len(rows)), (255, 255, 255))
for j, r in enumerate(rows):
    x = 0
    for t in r:
        sheet.paste(t, (x, j * (th + 16)))
        x += t.width + 20
sheet.save(OUT / "compare_all.png", optimize=True)
print("ok")
