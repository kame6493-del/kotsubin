"""ストアの画面写真とフィーチャー画像を作る(1.1.0 の見た目)。先に npm run build と python scripts/serve.py 5297。
python scripts/make_store.py → store/ios/*.png(1290x2796)・store/play/*.png(1080x1920)・store/play/feature_1024x500.png
写真に値段・「無料」は入れない(セットの画面は写さない。写す画面にその字が無いことも確かめる)。"""
import os
import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(__file__))
from seed import init_script, seeded  # noqa: E402

APP = Path(__file__).resolve().parent.parent
RAW = APP / "scripts/store_raw"
RAW.mkdir(exist_ok=True)
URL = "http://127.0.0.1:5297/"
BOLD = str(APP / "scripts/fonts/ZenMaruGothic-Bold.ttf")
MED = str(APP / "scripts/fonts/ZenMaruGothic-Medium.ttf")
CREAM = (245, 236, 221)
INK = (74, 47, 32)
SUB = (123, 100, 82)

SHOTS = [
    # (名前, 見出し, 小見出し, 状態)
    ("1_focus", "がんばった時間が、\nこんぺいとうになる。", "10分ごとに1粒。となりでハムスターが磨いています", "focus"),
    ("2_shelf", "1か月が、\nびんの棚になる。", "日付を押せば、その日の中身と記録が出てきます", "shelf"),
    ("3_day", "1日の中身が、\nひと目でわかる。", "押し忘れても、あとから分単位で直せます", "day"),
    ("4_rest", "休憩の間は、\nハムスターもひと眠り。", "5・10・15・30分から選んで、起きたら知らせます", "rest"),
    ("5_review", "1週間を、\nやさしくふりかえる。", "記録は端末の中だけ。アカウントも広告もありません", "review"),
]
BANNED = ["¥", "円", "無料", "価格"]


def capture(page_w, page_h, dpr, suffix):
    now = time.time()
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, _, _, state in SHOTS:
            running = None
            if state == "focus":
                running = {"mode": "focus", "cat": "c-study", "start": int((now - 24 * 60 - 10) * 1000)}
            if state == "rest":
                running = {"mode": "rest", "cat": "c-study", "start": int((now - 22) * 1000), "len": 5}
            today = (95, 50, 35, 20) if state != "focus" else (90, 40, 30, 0)
            data = seeded(days=45, running=running, today_minutes=today)
            ctx = b.new_context(viewport={"width": page_w, "height": page_h}, device_scale_factor=dpr, locale="ja-JP", color_scheme="light", timezone_id="Asia/Tokyo")
            ctx.add_init_script(init_script(data))
            pg = ctx.new_page()
            pg.goto(URL)
            pg.wait_for_timeout(900)
            if state == "shelf":
                pg.locator(".tabbar").get_by_role("button", name="たな", exact=True).click()
            if state == "day":
                pg.locator(".tabbar").get_by_role("button", name="たな", exact=True).click()
                pg.get_by_role("button", name="この日をくわしく見る").click()
            if state == "review":
                pg.get_by_role("button", name="ふりかえり").click()
            pg.wait_for_timeout(900)
            text = pg.evaluate("document.body.innerText")
            bad = [w for w in BANNED if w in text]
            assert not bad, (name, bad)
            path = RAW / f"{name}_{suffix}.png"
            pg.screenshot(path=str(path))
            out[name] = path
            ctx.close()
        b.close()
    return out


def compose(raw: Path, title: str, sub: str, W: int, H: int, dest: Path):
    k = W / 1290
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    # 上の飾り: 見本の粒を小さく散らす
    for i, (c, x, y, s) in enumerate([("sora", 0.86, 0.035, 90), ("mikan", 0.93, 0.085, 70), ("wakaba", 0.80, 0.10, 56), ("fuji", 0.08, 0.04, 60)]):
        g = Image.open(APP / f"public/art/candy_{c}.webp").convert("RGBA").resize((int(s * k), int(s * k)), Image.LANCZOS).rotate(i * 23, expand=True)
        im.paste(g, (int(W * x), int(H * y)), g)
    ft = ImageFont.truetype(BOLD, int(96 * k))
    fs = ImageFont.truetype(MED, int(44 * k))
    y = int(170 * k)
    for line in title.split("\n"):
        w = d.textlength(line, font=ft)
        d.text(((W - w) / 2, y), line, font=ft, fill=INK)
        y += int(134 * k)
    y += int(10 * k)
    w = d.textlength(sub, font=fs)
    d.text(((W - w) / 2, y), sub, font=fs, fill=SUB)
    top = y + int(100 * k)
    shot = Image.open(raw).convert("RGB")
    sw = int(W * 0.80)
    sh = int(shot.height * sw / shot.width)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    r = int(56 * k)
    sx = (W - sw) // 2
    # 影と縁
    shadow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle((sx, top + int(10 * k), sx + sw, H + r), r, fill=90)
    shadow = shadow.filter(ImageFilter.GaussianBlur(int(24 * k)))
    im.paste(Image.new("RGB", (W, H), (190, 150, 105)), (0, 0), shadow)
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh + r), radius=r, fill=255)
    border = Image.new("L", (sw + 12, sh + 12), 0)
    ImageDraw.Draw(border).rounded_rectangle((0, 0, sw + 11, sh + 12 + r), radius=r + 6, fill=255)
    im.paste(Image.new("RGB", (sw + 12, sh + 12), (255, 250, 242)), (sx - 6, top - 6), border)
    im.paste(shot, (sx, top), mask)
    im.save(dest)


def scene_png():
    """アプリの「きょう」の場面(びんに粒が入った絵)を撮る"""
    now = time.time()
    path = RAW / "feature_scene.png"
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 560, "height": 1000}, device_scale_factor=2, locale="ja-JP", color_scheme="light", timezone_id="Asia/Tokyo")
        ctx.add_init_script(init_script(seeded(running={"mode": "focus", "cat": "c-study", "start": int((now - 20 * 60) * 1000)}, today_minutes=(90, 60, 40, 30))))
        pg = ctx.new_page()
        pg.goto(URL)
        pg.wait_for_timeout(1200)
        pg.locator(".scene").screenshot(path=str(path))
        b.close()
    return path


def feature():
    W, H = 1024, 500
    plate = Image.open(scene_png()).convert("RGB").resize((758, 690), Image.LANCZOS)
    im = Image.new("RGB", (W, H), CREAM)
    # 右に見本の場面(ボタンと題字の上側は切る)
    sc = plate.crop((100, 150, 745, 640))
    sc = sc.resize((int(sc.width * H / sc.height), H), Image.LANCZOS)
    im.paste(sc, (W - sc.width, 0))
    # 左を生成りで溶かす
    fade = Image.new("L", (W, H), 0)
    fd = ImageDraw.Draw(fade)
    for x in range(W):
        v = 255 if x < 400 else max(0, 255 - int((x - 400) * 255 / 90))
        fd.line((x, 0, x, H), fill=v)
    im.paste(Image.new("RGB", (W, H), CREAM), (0, 0), fade)
    ic = Image.open(APP / "store/icon_1024.png").convert("RGB").resize((96, 96), Image.LANCZOS)
    m = Image.new("L", (96, 96), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, 95, 95), 22, fill=255)
    im.paste(ic, (60, 70), m)
    d = ImageDraw.Draw(im)
    d.text((172, 92), "こつびん", font=ImageFont.truetype(BOLD, 46), fill=INK)
    ft = ImageFont.truetype(BOLD, 40)
    d.text((60, 210), "がんばった時間が、", font=ft, fill=INK)
    d.text((60, 266), "こんぺいとうになる。", font=ft, fill=INK)
    d.text((62, 372), "ハムスターと作業・勉強の記録", font=ImageFont.truetype(MED, 26), fill=SUB)
    im.save(APP / "store/play/feature_1024x500.png")


if __name__ == "__main__":
    (APP / "store/ios").mkdir(parents=True, exist_ok=True)
    (APP / "store/play").mkdir(parents=True, exist_ok=True)
    for old in list((APP / "store/ios").glob("*.png")) + [p for p in (APP / "store/play").glob("[0-9]_*.png")]:
        old.unlink()
    ios = capture(430, 932, 3, "ios")
    play = capture(360, 640, 3, "play")
    for name, title, sub, _ in SHOTS:
        compose(ios[name], title, sub, 1290, 2796, APP / f"store/ios/{name}.png")
        compose(play[name], title, sub, 1080, 1920, APP / f"store/play/{name}.png")
    feature()
    print("ok")
