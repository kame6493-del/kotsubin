"""ドット絵の格子を読んで PNG に描く(確認用と、ストア素材・アイコン用)。python scripts/art.py
src/art/sprites.json が正本。アプリ側(src/art/draw.ts)も同じ JSON を同じ規則で描く。"""
import json, sys
from pathlib import Path
from PIL import Image

APP = Path(__file__).resolve().parent.parent
S = json.loads((APP / "src/art/sprites.json").read_text(encoding="utf-8"))


def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) + (255,)


def rows_of(sp, variants=()):
    rows = list(sp["base"])
    for v in variants:
        for k, r in sp["variants"].get(v, {}).items():
            rows[int(k)] = r
    half = sp["w"] // 2 if sp.get("mirror") else sp["w"]
    out = []
    for i, r in enumerate(rows):
        if len(r) != half:
            raise SystemExit(f"row {i} length {len(r)} != {half}: {r!r} variants={variants}")
        out.append(r + r[::-1] if sp.get("mirror") else r)
    return out


def sprite(sp, variants=(), scale=1):
    rows = rows_of(sp, variants)
    im = Image.new("RGBA", (sp["w"], len(rows)), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                im.putpixel((x, y), hexrgb(sp["pal"][ch]))
    return im.resize((im.width * scale, im.height * scale), Image.NEAREST) if scale > 1 else im


def shade(rgb, f):
    r, g, b, a = rgb
    if f >= 0:
        return (int(r + (255 - r) * f), int(g + (255 - g) * f), int(b + (255 - b) * f), a)
    return (int(r * (1 + f)), int(g * (1 + f)), int(b * (1 + f)), a)


def grain(color):
    base = hexrgb(color)
    m = {"L": shade(base, 0.55), "M": base, "D": shade(base, -0.22)}
    g = S["grain"]
    im = Image.new("RGBA", (len(g[0]), len(g)), (0, 0, 0, 0))
    for y, r in enumerate(g):
        for x, ch in enumerate(r):
            if ch != '.':
                im.putpixel((x, y), m[ch])
    return im


if __name__ == "__main__":
    out = APP / "scripts/art_out"
    out.mkdir(exist_ok=True)
    for name, sp in S["animals"].items():
        frames = [(), ("eyes_closed",), ("paws_hold",), ("paws_low",)]
        sheet = Image.new("RGBA", (len(frames) * (sp["w"] + 4) * 12, (len(sp["base"]) + 4) * 12), (246, 241, 231, 255))
        for i, f in enumerate(frames):
            im = sprite(sp, f, 12)
            sheet.alpha_composite(im, (i * (sp["w"] + 4) * 12 + 24, 24))
        sheet.save(out / f"{name}.png")
    gs = Image.new("RGBA", (8 * 7 * 12, 8 * 12), (246, 241, 231, 255))
    for i, c in enumerate(["#f2a7b5", "#f5cf6b", "#a9d48e", "#8fc6e6", "#c5aee3", "#f6b07c", "#f3efe6"]):
        gs.alpha_composite(grain(c).resize((60, 60), Image.NEAREST), (i * 84 + 12, 18))
    gs.save(out / "grains.png")
    print("ok")


def jar_slots(jar):
    """びんの中に粒(5x5)を置ける場所。積もる順(真ん中から山になる)。アプリの src/art/jar.ts と同じ規則"""
    rows = rows_of(jar)
    h, w = len(rows), len(rows[0])
    inside = lambda x, y: 0 <= y < h and 0 <= x < w and rows[y][x] in "iH"
    g = S["grain"]
    cells = [(x, y) for y, r in enumerate(g) for x, ch in enumerate(r) if ch != '.']
    fits = lambda x, y: all(inside(x + cx, y + cy) for cx, cy in cells)
    slots = []
    row = 0
    y = h - 6
    while y >= 0:
        off = 0 if row % 2 == 0 else 2
        for x in range(1 + off, w - 5, 4):
            hsh = ((x * 7349 + row * 1931) ^ (row * 271)) & 0xff
            jx, jy = x + (hsh % 3) - 1, y - ((hsh >> 3) % 2)
            if fits(jx, jy):
                slots.append((jx, jy, row + abs(jx + 2.5 - w / 2) / (w * 0.3)))
            elif fits(x, y):
                slots.append((x, y, row + abs(x + 2.5 - w / 2) / (w * 0.3)))
        y -= 4
        row += 1
    slots.sort(key=lambda s: (s[2], s[0]))
    return [(x, y) for x, y, _ in slots]


def jar_image(jar, colors):
    rows = rows_of(jar)
    im = Image.new("RGBA", (jar["w"], len(rows)), (0, 0, 0, 0))
    pal = jar["pal"]
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in "iH":
                im.putpixel((x, y), hexrgb(pal["i"]))
    slots = jar_slots(jar)
    for c, (x, y) in zip(colors, slots):
        im.alpha_composite(grain(c), (x, y))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch not in ".i":
                if ch == "H":
                    if im.getpixel((x, y))[:3] == hexrgb(pal["i"])[:3]:
                        im.putpixel((x, y), hexrgb(pal["H"]))
                    else:
                        r0, g0, b0, _ = im.getpixel((x, y))
                        im.putpixel((x, y), (min(255, r0 + 50), min(255, g0 + 50), min(255, b0 + 50), 255))
                else:
                    im.putpixel((x, y), hexrgb(pal[ch]))
    return im


CANDY = {"momo": "#f2a7b5", "kinako": "#f3cc66", "wakaba": "#a7d38b", "sora": "#8cc4e6", "fuji": "#c3abe2", "mikan": "#f5ad78", "ume": "#e07f93", "matcha": "#7fae79", "shiro": "#ede7dc"}


def icon(size=1024, bg="#2f6b5c", n=40, with_animal=False):
    """アプリのアイコン。びんと金平糖(と相棒)をドットのまま拡大"""
    jar = S["jars"]["round"]
    order = ["sora", "kinako", "momo", "wakaba", "mikan", "fuji", "sora", "momo", "kinako", "wakaba"]
    colors = [CANDY[order[(i // 4) % len(order)]] for i in range(n)]
    jim = jar_image(jar, colors)
    canvas = Image.new("RGBA", (64, 64), hexrgb(bg))
    if with_animal:
        a = sprite(S["animals"]["hamster"], ("paws_hold",))
        a.alpha_composite(grain(CANDY["sora"]), tuple(S["animals"]["hamster"]["hold"]))
        canvas.alpha_composite(jim, (64 - 36 - 6, 64 - 45 - 7))
        canvas.alpha_composite(a, (3, 64 - 18 - 7))
    else:
        canvas.alpha_composite(jim, ((64 - 36) // 2, (64 - 45) // 2 + 1))
    return canvas.resize((size, size), Image.NEAREST)
