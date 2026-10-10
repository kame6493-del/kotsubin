"""見本の絵(scripts/mihon/m1〜m8.png。持ち主から届いた ChatGPT の画面見本)から、アプリの絵を切り出す。
python scripts/cut_assets.py  → public/art/*.webp と src/art/layout.json、scripts/cut_out/chk_*.png(縁の確認用)

方針: 見本の絵はそのまま使う。新しく描くのは見本に無い物だけ。
- 場面の台紙(plate): 見本の画面の上半分をそのまま切る。びん・札・入れ替えるハムスターの所だけ穴を埋め、上に部品を重ねる
- キャラ: 濃い輪郭線の内側(cut_outline)か、区画の地の色を縁から塗って抜く(cut_key)
- びん: 中の粒を消して空にし(列ごとに上の澄んだガラスの色を下へ伸ばす)、粒の置き場所を計算して layout.json へ
座標はすべて見本の画像の画素(941x1672 / ガイドは 1086x1448)。"""
import json
import math
import random
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).parent))
from cutlib import M, check_sheet, cut_key, cut_outline, rgba, shapes, trim  # noqa: E402

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public/art"
OUT.mkdir(parents=True, exist_ok=True)
CHK = Path(__file__).parent / "cut_out"
CHK.mkdir(exist_ok=True)
LAYOUT: dict = {}
X0, X1 = 91, 849  # 画面の中身の左右(縁取りを含めない)
CARD = (253, 244, 228)  # ガイドの区画の地の色


def save(im: Image.Image, name: str, q=90):
    if im.mode == "RGBA":
        im.save(OUT / f"{name}.webp", "WEBP", quality=q, alpha_quality=100, method=6)
    else:
        im.convert("RGB").save(OUT / f"{name}.webp", "WEBP", quality=q, method=6)
    return im


def fill_hole(img: Image.Image, mask: np.ndarray, blur=11) -> Image.Image:
    """穴を、行ごとに左右の縁の色をつないで埋め、ぼかす(びんのガラス越しに見える奥のつもり)"""
    a = np.asarray(img).astype(np.float32).copy()
    h, w = mask.shape
    for y in range(h):
        row = mask[y]
        if not row.any():
            continue
        x = 0
        while x < w:
            if not row[x]:
                x += 1
                continue
            s = x
            while x < w and row[x]:
                x += 1
            e = x
            lc = a[y, max(0, s - 6):max(1, s - 1)].mean(0) if s > 1 else None
            rc = a[y, min(w - 1, e + 1):min(w, e + 6)].mean(0) if e < w - 1 else None
            if lc is None:
                lc = rc
            if rc is None:
                rc = lc
            t = np.linspace(0, 1, e - s)[:, None]
            a[y, s:e] = lc * (1 - t) + rc * t
    filled = cv2.GaussianBlur(a, (0, 0), blur)
    out = np.asarray(img).astype(np.float32).copy()
    m3 = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 2)[..., None]
    out = out * (1 - m3) + filled * m3
    rng = np.random.default_rng(3)
    out += (rng.normal(0, 1.6, out.shape) * m3)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def amask(size, items, ox=0, oy=0):
    """絶対座標の形を、切り抜きの中の座標の真偽の面へ"""
    moved = []
    for kind, xy, *rest in items:
        if kind in ("rect", "rrect", "ellipse"):
            x0, y0, x1, y1 = xy
            moved.append((kind, (x0 - ox, y0 - oy, x1 - ox, y1 - oy), *rest))
        else:
            moved.append((kind, [(x - ox, y - oy) for x, y in xy], *rest))
    return shapes(size, moved)


# ---------------------------------------------------------------- びん
STD_SIL = [  # 見本1のびん(ふた・首・胴)
    ("rrect", (258, 315, 515, 368), 12),
    ("rect", (262, 358, 516, 400)),
    ("rrect", (219, 384, 544, 757), 42),
]
STD_IN = [("rrect", (238, 410, 526, 737), 26)]  # ガラスの内側
TAG1 = [("poly", [(209, 439), (236, 409), (325, 415), (344, 446), (318, 593), (200, 585)])]
TAG1_STRING = [("poly", [(283, 395), (302, 395), (302, 446), (283, 446)])]


def column_fill(a: np.ndarray, inside: np.ndarray, y_from: int, ref: tuple[int, int], dark=0.10):
    """inside の y_from より下を、列ごとに ref の行の平均の色で塗る。下へ行くほど少し暗く"""
    h, w, _ = a.shape
    r0, r1 = ref
    cols = a[r0:r1].mean(0)  # (w,3)
    ys = np.arange(h)
    for y in range(y_from, h):
        t = min(1.0, max(0.0, (y - y_from) / max(1, h - y_from)))
        c = cols * (1 - dark * t) + np.array([226, 205, 178]) * (dark * t)
        sel = inside[y]
        a[y, sel] = c[sel]
    del ys
    return a


def make_std_jar():
    src = M[1]
    box = (212, 310, 550, 762)
    ox, oy = box[:2]
    im = src.crop(box)
    a = np.asarray(im).astype(np.float32).copy()
    size = im.size
    sil = amask(size, STD_SIL, ox, oy)
    inside = amask(size, STD_IN, ox, oy)
    # 札の下(左側)は、びんの中心で左右を折り返して右側の澄んだガラスで埋める
    cx = (219 + 544) / 2 - ox
    left = amask(size, [("rect", (215, 398, 352, 610))], ox, oy)
    ys, xs = np.where(left)
    mx = np.clip((2 * cx - xs).astype(int), 0, size[0] - 1)
    a[ys, xs] = a[ys, mx]
    # 粒のある所(下半分)を列ごとに上の澄んだガラスの色で
    a = column_fill(a, inside, 520 - oy, (470 - oy, 512 - oy))
    a = cv2.GaussianBlur(a, (0, 0), 0.6) * inside[..., None] + a * (~inside[..., None])
    # ちょう結び(ふたの下・左)は別の部品に。びんの方は右側を折り返して消す
    orig = np.asarray(im).astype(np.float32)
    bow_area = amask(size, [("rect", (258, 356, 352, 414))], ox, oy)
    hsv = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2HSV_FULL).astype(np.float32)
    rope = bow_area & (hsv[..., 1] > 70) & (hsv[..., 2] < 215)
    rope = cv2.morphologyEx(rope.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)).astype(bool)
    rope = cv2.dilate(rope.astype(np.uint8), np.ones((2, 2), np.uint8)).astype(bool) & bow_area
    ys, xs = np.where(bow_area)
    mx = np.clip((2 * cx - xs).astype(int), 0, size[0] - 1)
    a[ys, xs] = orig[ys, mx]
    bow = im.convert("RGBA")
    bow.putalpha(Image.fromarray(cv2.GaussianBlur((rope * 255).astype(np.uint8), (3, 3), 0.6)))
    save(bow, "bow_std")
    jar = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    # 切り抜きの左上が box の左上に合うよう、trim しない版を作る
    full = jar.convert("RGBA")
    al = (sil * 255).astype(np.uint8)
    al = cv2.GaussianBlur(cv2.erode(al, np.ones((2, 2), np.uint8)), (3, 3), 0.8)
    full.putalpha(Image.fromarray(al))
    save(full, "jar_std")
    return {"box": box, "inside": STD_IN, "sil": STD_SIL}


def make_fancy_jar(name, box, sil_items, lid_bottom, front=None, ref_rows=14, inset=13, ref_y=0):
    """見本7のほしのびん・まるびん。形は手で決め(後ろの棚と色が近く、輪郭では抜けない)、内側(縁から inset 内)の粒を消す。front は手前の飾り(リボンと札)"""
    src = M[7]
    ox, oy = box[:2]
    sil = amask((box[2] - ox, box[3] - oy), sil_items, ox, oy)
    # 下の縁は見本では名札に隠れていて切っただけなので、下へ伸ばしてから内側を取る
    ext = np.vstack([sil, np.repeat(sil[-1:], inset + 2, 0)])
    inside = cv2.erode(ext.astype(np.uint8), np.ones((inset * 2 + 1, inset * 2 + 1), np.uint8)).astype(bool)[: sil.shape[0]]
    inside[: lid_bottom - oy] = False
    im = src.crop(box)
    a = np.asarray(im).astype(np.float32).copy()
    fr = amask(im.size, front, ox, oy) if front else np.zeros_like(inside)
    # 列ごとの基準の色: 内側の上から ref_rows 行の平均。上の方に内側の無い列は近い列の値を使う
    h, w = inside.shape
    cols = np.zeros((w, 3), np.float32)
    have = np.zeros(w, bool)
    for x in range(w):
        ys = np.where(inside[:, x] & ~fr[:, x])[0]
        ys = ys[ys < ref_y - oy] if ref_y else ys
        if len(ys) >= 4:
            top = ys[: ref_rows]
            cols[x] = a[top, x].mean(0)
            have[x] = True
    idx = np.where(have)[0]
    for x in range(w):
        if not have[x] and len(idx):
            cols[x] = cols[idx[np.argmin(np.abs(idx - x))]]
    ys_in, xs_in = np.where(inside & ~fr)
    y_top = ys_in.min()
    for y, x in zip(ys_in, xs_in):
        t = (y - y_top) / max(1, h - y_top)
        a[y, x] = cols[x] * (1 - 0.08 * t) + np.array([226, 205, 178]) * 0.08 * t
    a = cv2.GaussianBlur(a, (0, 0), 0.8) * (inside & ~fr)[..., None] + a * (~(inside & ~fr))[..., None]
    # 縁の近くに残った粒(色の濃い所)も消す
    a8 = np.clip(a, 0, 255).astype(np.uint8)
    hsv = cv2.cvtColor(a8, cv2.COLOR_RGB2HSV_FULL)
    near = cv2.erode(sil.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
    near[: lid_bottom - oy] = False
    hue = hsv[..., 0]
    left = near & ~fr & (hsv[..., 1] > 60) & ~((hue > 6) & (hue < 40))  # 茶色いガラスの縁は残す
    left = cv2.dilate(left.astype(np.uint8), np.ones((5, 5), np.uint8)) & near.astype(np.uint8)
    a = cv2.inpaint(a8, left * 255, 5, cv2.INPAINT_TELEA).astype(np.float32)
    # いちばん下(見本では名札の下)は、少し上の行の色で塗り、ガラスの底の線を引く
    h = a.shape[0]
    core = cv2.erode(sil.astype(np.uint8), np.ones((1, 15), np.uint8)).astype(bool)
    for y in range(h - 18, h):
        sel = core[y]
        a[y, sel] = a[h - 20, sel]
    edge = sil[h - 4:h].any(0)
    a[h - 4:h - 1, edge] = a[h - 4:h - 1, edge] * 0.55 + np.array([150, 105, 70]) * 0.45
    jar = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")
    alpha = cv2.GaussianBlur(cv2.erode((sil * 255).astype(np.uint8), np.ones((2, 2), np.uint8)), (3, 3), 0.8)
    jar.putalpha(Image.fromarray(alpha))
    save(jar, f"jar_{name}")
    if front:
        f = im.convert("RGBA")
        f.putalpha(Image.fromarray(cv2.GaussianBlur((fr & sil).astype(np.uint8) * 255, (3, 3), 0.7)))
        save(f, f"jar_{name}_front")
    return inside & ~fr


def make_tag(src, poly, string, box, name, keep=None):
    """札を切り出し、字を消す(札の紙の色で埋める)。keep は残す飾り(花)の形"""
    im = src.crop(box)
    ox, oy = box[:2]
    a = np.asarray(im).astype(np.uint8).copy()
    tag = amask(im.size, poly, ox, oy)
    inner = cv2.erode(tag.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
    lum = a.astype(np.float32) @ np.array([0.299, 0.587, 0.114])
    med = cv2.medianBlur(a, 21).astype(np.float32) @ np.array([0.299, 0.587, 0.114])
    ink = inner.copy()  # 札の中はまるごと紙の色で埋め直す(字の取り残しを出さない)
    if keep:
        ink &= ~amask(im.size, keep, ox, oy)
    # 字のあった所は、札の紙の色(中央値)に、上から下へわずかに暗くなる色をのせる
    rim = inner & ~cv2.erode(inner.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool)
    paper = np.median(a[rim & ~(amask(im.size, keep, ox, oy) if keep else np.zeros_like(rim))], axis=0)
    ys = np.where(ink)[0]
    if len(ys):
        y0, y1 = ys.min(), ys.max()
        t = ((np.arange(a.shape[0]) - y0) / max(1, y1 - y0)).clip(0, 1)[:, None]
        col = paper[None, :] * (1.0 - 0.035 * t)
        fill = np.repeat(col[:, None, :], a.shape[1], 1)
        rng = np.random.default_rng(5)
        fill = fill + rng.normal(0, 1.2, fill.shape)
        soft = cv2.GaussianBlur(ink.astype(np.float32), (0, 0), 1.5)[..., None]
        a = (a * (1 - soft) + fill * soft).clip(0, 255).astype(np.uint8)
    full = Image.fromarray(a).convert("RGBA")
    m = tag | amask(im.size, string, ox, oy)
    al = cv2.GaussianBlur((m * 255).astype(np.uint8), (3, 3), 0.7)
    full.putalpha(Image.fromarray(al))
    save(full, name)
    return full


def slots_for(inside: np.ndarray, d: float, seed=1, pad=0.42):
    """inside(真偽の面)に、直径 d の粒を下から積む置き場所。各段の中は順番をまぜる"""
    h, w = inside.shape
    dist = cv2.distanceTransform(inside.astype(np.uint8), cv2.DIST_L2, 5)
    rng = random.Random(seed)
    out = []
    step_y = d * 0.80
    step_x = d * 0.92
    ys, xs = np.where(inside)
    y = ys.max() - d * pad
    row = 0
    while y > ys.min() + d * 0.3:
        x_start = xs.min() + d * 0.45 + (step_x / 2 if row % 2 else 0)
        line = []
        x = x_start
        while x < xs.max():
            xi, yi = int(round(x)), int(round(y))
            if 0 <= yi < h and 0 <= xi < w and dist[yi, xi] >= d * pad:
                line.append([round(x + rng.uniform(-3, 3), 1), round(y + rng.uniform(-3, 2), 1), rng.randint(-25, 25)])
            x += step_x
        rng.shuffle(line)
        out.extend(line)
        y -= step_y
        row += 1
    return out


def jar_layout(name, inside_items, box, sizes):
    ox, oy = box[:2]
    w, h = box[2] - ox, box[3] - oy
    inside = amask((w, h), inside_items, ox, oy)
    tiers = []
    for d in sizes:
        tiers.append({"d": d, "slots": slots_for(inside, d)})
    LAYOUT.setdefault("jars", {})[name] = {"w": w, "h": h, "tiers": tiers}
    return inside


# ---------------------------------------------------------------- こんぺいとう
CANDY_KEYS = [(253, 244, 228), (250, 238, 218), (247, 233, 212)]
CANDY_SRC = {"blue": (430, 552, 498, 622), "orange": (505, 552, 575, 622), "green": (580, 552, 650, 622), "purple": (656, 552, 726, 622)}
# 作業の種類の色(domain/colors.ts の名前) → 元の粒と、色相の回し方(度)・彩度・明るさ
CANDY_MAP = {
    "sora": ("blue", 0, 1.0, 1.0),
    "mikan": ("orange", 0, 1.0, 1.0),
    "wakaba": ("green", 0, 1.0, 1.0),
    "fuji": ("purple", 0, 1.0, 1.0),
    "kinako": ("orange", 18, 1.0, 1.06),
    "momo": ("purple", 62, 0.62, 1.08),
    "ume": ("purple", 72, 0.95, 1.0),
    "matcha": ("green", -22, 0.7, 0.92),
    "shiro": ("orange", 8, 0.22, 1.12),
}


def recolor(im: Image.Image, hue: float, sat: float, val: float) -> Image.Image:
    a = np.asarray(im).copy()
    rgb = a[..., :3]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV_FULL).astype(np.float32)
    hsv[..., 0] = (hsv[..., 0] + hue * 256 / 360) % 256
    hsv[..., 1] = np.clip(hsv[..., 1] * sat, 0, 255)
    hsv[..., 2] = np.clip(hsv[..., 2] * val, 0, 255)
    a[..., :3] = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB_FULL)
    return Image.fromarray(a)


def make_candies():
    base = {n: cut_key(M[8], b, CANDY_KEYS, tol=26, beige=True) for n, b in CANDY_SRC.items()}
    out = {}
    for name, (src, h, s, v) in CANDY_MAP.items():
        c = base[src] if (h, s, v) == (0, 1.0, 1.0) else recolor(base[src], h, s, v)
        # 正方形にそろえる(並べやすいように)
        n = max(c.size)
        sq = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        sq.alpha_composite(c, ((n - c.width) // 2, (n - c.height) // 2))
        save(sq, f"candy_{name}")
        out[name] = sq
    return out


# ---------------------------------------------------------------- 場面の台紙
def plate(src, box, holes, name, extra_fill=None):
    im = src.crop(box)
    ox, oy = box[:2]
    if holes:
        m = amask(im.size, holes, ox, oy)
        m = cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
        im = fill_hole(im, m)
    save(im, name, q=88)
    LAYOUT.setdefault("plates", {})[name] = {"w": im.width, "h": im.height, "x0": ox, "y0": oy}
    return im


def jar_layout_mask(name, inside, sizes):
    h, w = inside.shape
    LAYOUT.setdefault("jars", {})[name] = {"w": w, "h": h, "tiers": [{"d": d, "slots": slots_for(inside, d)} for d in sizes]}


def sprite(name, im: Image.Image, box):
    """切り抜いた部品を保存し、見本の画像での左上の位置を layout.json に残す"""
    off = im.info.get("off", (0, 0))
    save(im, name)
    LAYOUT.setdefault("sprites", {})[name] = {"x": box[0] + off[0], "y": box[1] + off[1], "w": im.width, "h": im.height}
    return im


def rect(name, src, box, q=90):
    im = src.crop(box)
    save(im, name, q)
    LAYOUT.setdefault("sprites", {})[name] = {"x": box[0], "y": box[1], "w": im.width, "h": im.height}
    return im


def key_global(src, box, key, tol, name):
    """題字のように穴のある物: 地の色に近い所をどこでも抜く(縁から塗らない)"""
    im = src.crop(box)
    a = np.asarray(im).astype(np.float32)
    d = np.sqrt(((a - np.array(key, np.float32)) ** 2).sum(2))
    al = np.clip((d - tol) / 14.0, 0, 1)
    al = cv2.GaussianBlur((al * 255).astype(np.uint8), (3, 3), 0.6)
    out = im.convert("RGBA")
    out.putalpha(Image.fromarray(al))
    out = trim(out)
    return sprite(name, out, box)


def make_cabinet():
    """見本2の月の棚。どの段もびんを消した同じ升を7つ並べ、段を必要な数だけ積む"""
    src = M[2]
    a = np.asarray(src).copy()
    # 升の境目(仕切りの間): 列の左右と、段の上
    cols = [(117, 199), (221, 304), (325, 409), (429, 511), (532, 616), (637, 721), (742, 823)]
    top = 503
    # 手本の升: 1段目2列目(「29」・粒なし・前の月の灰色の数字)
    cx0, cx1 = cols[1]
    cell = a[top:top + 114, cx0:cx1].copy()
    lum = cell.astype(np.float32) @ np.array([0.299, 0.587, 0.114])
    med = cv2.medianBlur(cell, 25).astype(np.float32) @ np.array([0.299, 0.587, 0.114])
    hsv = cv2.cvtColor(cell, cv2.COLOR_RGB2HSV_FULL)
    body = np.zeros(lum.shape, bool)
    body[34:100, 10:cx1 - cx0 - 10] = True  # 数字と粒の出る所(びんの胴)
    ink = body & ((np.abs(med - lum) > 12) | (hsv[..., 1] > 80))
    ink = cv2.dilate(ink.astype(np.uint8), np.ones((5, 5), np.uint8))
    cell = cv2.inpaint(cell, ink * 255, 6, cv2.INPAINT_TELEA)
    Image.fromarray(cell).save(CHK / "z_cell.png")
    # 1段ぶんの帯(棚板込み): 1段目を使い、7升とも手本の升で置き換える
    strip = a[top:top + 126, 98:842].copy()
    for (x0, x1) in cols:
        patch = cv2.resize(cell, (x1 - x0, 114), interpolation=cv2.INTER_AREA)
        strip[0:114, x0 - 98:x1 - 98] = patch
    head = a[445:top, 98:842]
    bottom = a[1133:1150, 98:842]
    save(Image.fromarray(head), "cab_head")
    save(Image.fromarray(strip), "cab_row")
    save(Image.fromarray(bottom), "cab_bottom")
    # 升の中のびん(週の記録・凡例で使う小さなびん): 手本の升の中のびんだけ
    jar = Image.fromarray(cell).crop((4, 2, cx1 - cx0 - 4, 114))
    LAYOUT["cabinet"] = {"w": 744, "head": top - 445, "row": 126, "bottom": 17, "cols": [[x0 - 98, x1 - 98] for x0, x1 in cols], "cellH": 114}
    return jar


def main():
    sheet = {}
    candies = make_candies()
    check_sheet(candies, CHK / "chk_candies.png", zoom=3)

    # ---- びん
    std = make_std_jar()
    jar_layout("std", STD_IN, std["box"], [70, 56, 46])
    tag = make_tag(M[1], TAG1, TAG1_STRING, (190, 395, 352, 600), "tag_std", keep=[("ellipse", (266, 440, 304, 480))])
    sheet["tag_std"] = trim(tag)
    HOSHI = [("rrect", (290, 755, 402, 794), 8), ("rect", (296, 786, 398, 812)),
             ("poly", [(300, 808), (278, 822), (246, 842), (238, 860), (240, 882), (262, 905), (252, 950), (258, 962), (300, 962), (338, 948), (362, 948), (402, 962), (446, 962), (452, 950), (440, 905), (462, 882), (464, 860), (456, 842), (424, 822), (400, 808)])]
    MARU = [("rrect", (540, 757, 666, 794), 8), ("rect", (548, 790, 688, 812)), ("ellipse", (494, 792, 720, 982))]
    hoshi_in = make_fancy_jar("hoshi", (228, 748, 472, 962), HOSHI, 812)
    jar_layout_mask("hoshi", hoshi_in, [40, 32, 25])
    maru_in = make_fancy_jar("maru", (484, 748, 732, 962), MARU, 812, front=[("poly", [(510, 798), (598, 798), (604, 842), (590, 896), (556, 902), (516, 852)])], ref_y=850)
    jar_layout_mask("maru", maru_in, [42, 33, 26])
    LAYOUT["fancy"] = {"hoshi": {"x": 228, "y": 748}, "maru": {"x": 484, "y": 748}}

    # ---- 場面の台紙
    jar_hole = STD_SIL + TAG1
    plate(M[1], (X0, 100, X1, 790), jar_hole, "plate_focus")
    plate(M[5], (X0, 100, X1, 790), jar_hole, "plate_rest")
    S3_SIL = [("rrect", (226, 234, 502, 292), 12), ("rect", (230, 285, 502, 326)), ("rrect", (217, 318, 537, 672), 42)]
    S3_TAG = [("poly", [(150, 380), (182, 342), (256, 330), (290, 352), (286, 607), (147, 598)]), ("rect", (232, 286, 304, 340))]
    plate(M[2], (X0, 100, X1, 445), None, "plate_shelf")
    plate(M[6], (X0, 100, X1, 470), None, "plate_review")
    plate(M[7], (X0, 100, X1, 295), [("rrect", (124, 126, 212, 200), 16)], "plate_set")
    plate(M[7], (X0, 500, X1, 1006), None, "nakama_shelf")
    LAYOUT["stage"] = {
        "jar": {"x": std["box"][0] - X0, "y": std["box"][1] - 100},
        "tag": {"x": 190 - X0, "y": 395 - 100},
        # 待機・一時停止などで見本1のハムスターに重ねる「よろこぶ」(1.08 倍で元の絵を覆う)。敷物の下の端を y=764 に
        "ham": {"x": 545 - 8 - X0, "bottom": 764 - 100, "k": 1.08},
    }

    # ---- キャラ(場面の大きさ)
    mat3 = [("poly", [(20, 192), (240, 192), (262, 234), (4, 234)])]
    sheet["ham_yorokobu"] = sprite("ham_yorokobu", cut_outline(M[3], (540, 450, 805, 690), thr=110, close=1, add=mat3, sub=[("rect", (230, 160, 265, 192))]), (540, 450))
    sheet["enaga"] = sprite("enaga", cut_outline(M[7], (158, 560, 355, 712), thr=140, close=2), (158, 560))
    sheet["usagi"] = sprite("usagi", cut_outline(M[7], (318, 505, 562, 712), thr=140, close=2, keep=2), (318, 505))
    sheet["pengin"] = sprite("pengin", cut_outline(M[7], (552, 515, 792, 712), thr=110, close=1), (552, 515))

    # ---- ガイドの小さなキャラ(区画の地の色で抜く)
    G = M[8]
    for name, box, keep in [
        ("ham_sagyou", (22, 318, 145, 416), 2), ("ham_migaki", (155, 312, 272, 416), 3), ("ham_nemuru", (285, 330, 422, 416), 4),
        ("ham_yorokobu_s", (420, 310, 545, 416), 8), ("ham_henshu", (552, 310, 672, 420), 3),
        ("enaga_s", (700, 322, 838, 410), 3), ("usagi_s", (838, 310, 942, 410), 4), ("pengin_s", (943, 312, 1068, 410), 4),
        ("face_ham", (372, 1072, 452, 1142), 2), ("face_enaga", (372, 1142, 458, 1208), 3),
    ]:
        sheet[name] = sprite(name, cut_outline(G, box, thr=150, close=2, keep=keep, seal="b"), box)

    # ---- 見本の画面の区画にいる小さなキャラ(その区画の地の色で抜く)
    for name, k, box, keep in [
        ("mini_progress", 1, (572, 1380, 708, 1470), 4),
        ("mini_sleep", 5, (668, 1418, 806, 1478), 3),
        ("mini_set", 7, (112, 1292, 228, 1392), 3),
    ]:
        sheet[name] = sprite(name, cut_outline(M[k], box, thr=150, close=2, keep=keep, seal="b"), box)
    sheet["mini_comment"] = sprite("mini_comment", cut_outline(M[6], (105, 1380, 335, 1542), thr=185, close=4, keep=9, seal="lrb"), (105, 1380))
    # 見本7のなかまセットの部品
    for name, box, keep in [
        ("set_ribbon", (125, 298, 470, 382), 2), ("set_ribbon2", (118, 1026, 452, 1094), 3),
        ("set_animals", (175, 1085, 462, 1190), 6), ("set_jars", (540, 1062, 782, 1186), 3),
    ]:
        src = M[7]
        bg = [src.getpixel((box[0] + 2, box[1] + 2)), src.getpixel((box[2] - 3, box[3] - 3))]
        sheet[name] = sprite(name, cut_key(src, box, bg, tol=20, keep=keep, beige=True), box)

    # 値札(字を消して、値段はアプリが書く)
    note_box = (530, 306, 820, 508)
    im = M[7].crop(note_box)
    a = np.asarray(im).copy()
    txt = amask(im.size, [("rect", (575, 345, 790, 480))], *note_box[:2])
    lum = a.astype(np.float32) @ np.array([0.299, 0.587, 0.114])
    ink = txt & (lum < 150)
    ink = cv2.dilate(ink.astype(np.uint8), np.ones((7, 7), np.uint8))
    a = cv2.inpaint(a, ink * 255, 7, cv2.INPAINT_TELEA)
    paper = amask(im.size, [("poly", [(546, 325), (604, 326), (608, 312), (618, 312), (622, 330), (816, 348), (809, 505), (535, 485)])], *note_box[:2])
    note = Image.fromarray(a).convert("RGBA")
    note.putalpha(Image.fromarray(cv2.GaussianBlur((paper * 255).astype(np.uint8), (3, 3), 0.8)))
    save(note, "set_note")
    LAYOUT.setdefault("sprites", {})["set_note"] = {"x": note_box[0], "y": note_box[1], "w": im.width, "h": im.height}

    # ---- 区画の絵(地ごと): 空の状態・休憩のすすめ
    rect("art_empty", G, (20, 1078, 365, 1226))
    rect("art_rest", G, (724, 1084, 886, 1210))

    # ---- 題字(見本のガイドの左上)
    key_global(G, (24, 18, 304, 156), (251, 236, 214), 30, "logo")

    # ---- 月の棚
    cjar = make_cabinet()
    save(cjar, "cell_jar")
    sheet["cell_jar"] = cjar.convert("RGBA")

    check_sheet({k: v for k, v in sheet.items() if v.mode == "RGBA"}, CHK / "chk_sprites.png", zoom=2)
    (APP / "src/art/layout.json").write_text(json.dumps(LAYOUT, ensure_ascii=False), encoding="utf-8")
    print("ok")


if __name__ == "__main__":
    main()
