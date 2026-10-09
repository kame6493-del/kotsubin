"""ストアの画面写真とフィーチャー画像を作る。先に npm run build と python scripts/serve.py 5297。
python scripts/make_store.py → store/ios/*.png(1290x2796)・store/play/*.png(1080x1920)・store/play/feature_1024x500.png
写真に値段・「無料」は入れない。見出しは語り口で短く。飾り(グラデーション・光・影)は使わない。"""
import os
import sys
import time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(__file__))
import art  # noqa: E402
from seed import init_script, seeded  # noqa: E402

APP = Path(__file__).resolve().parent.parent
RAW = APP / "scripts/store_raw"
RAW.mkdir(exist_ok=True)
URL = "http://127.0.0.1:5297/"
BOLD = "C:/Windows/Fonts/YuGothB.ttc"
REG = "C:/Windows/Fonts/YuGothM.ttc"
CREAM = (246, 241, 231)
INK = (43, 39, 35)
SUB = (107, 98, 88)
GREEN = (47, 107, 92)
LINE = (226, 216, 199)

SHOTS = [
    # (名前, 見出し, 小見出し, 状態)
    ("1_focus", "がんばった時間が、\nびんの金平糖になる。", "10分ごとに1粒。となりで相棒もみがいています", "focus"),
    ("2_shelf", "1か月が、\nびんの棚になる。", "日付を押せば、その日の中身がわかります", "shelf"),
    ("3_edit", "押し忘れても、\nあとから分単位で直せる。", "前の日の記録も、足す・直す・消すができます", "edit"),
    ("4_rest", "ひとやすみの間は、\n相棒もひと眠り。", "起きたら通知と振動で知らせます", "rest"),
    ("5_friends", "相棒には、\n好きな名前を。", "記録は端末の中だけ。アカウントも広告もありません", "settings"),
]


def capture(page_w, page_h, dpr, suffix):
    now = time.time()
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, _, _, state in SHOTS:
            running = None
            if state == "focus":
                running = {"mode": "focus", "cat": "c-study", "start": int((now - 38 * 60 - 12) * 1000)}
            if state == "rest":
                running = {"mode": "rest", "cat": "c-study", "start": int((now - 3 * 60) * 1000)}
            data = seeded(days=45, running=running, today_minutes=(95, 50, 35) if state != "focus" else (60, 25, 0))
            if state == "settings":
                data["settings"]["names"]["hamster"] = "こむぎ"
            ctx = b.new_context(viewport={"width": page_w, "height": page_h}, device_scale_factor=dpr, locale="ja-JP", color_scheme="light", timezone_id="Asia/Tokyo")
            ctx.add_init_script(init_script(data))
            pg = ctx.new_page()
            pg.goto(URL)
            pg.wait_for_timeout(700)
            if state == "shelf":
                pg.get_by_role("button", name="たな").click()
                pg.get_by_role("button", name="前の月").click()
            if state == "edit":
                pg.get_by_role("button", name="たな").click()
                pg.locator(".cal-day.today").click()
                pg.locator(".rows .row").nth(1).click()
            if state == "settings":
                pg.get_by_role("button", name="せってい").click()
            pg.wait_for_timeout(600)
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
    ft = ImageFont.truetype(BOLD, int(92 * k))
    fs = ImageFont.truetype(REG, int(44 * k))
    x = int(96 * k)
    y = int(150 * k)
    for line in title.split("\n"):
        d.text((x, y), line, font=ft, fill=INK)
        y += int(130 * k)
    y += int(14 * k)
    d.text((x, y), sub, font=fs, fill=SUB)
    # 小さな金平糖の印(見出しの上)
    # 画面
    top = y + int(110 * k)
    shot = Image.open(raw).convert("RGB")
    avail_h = H - top
    sw = int(W * 0.80)
    sh = int(shot.height * sw / shot.width)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    r = int(48 * k)
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh + r), radius=r, fill=255)
    sx = (W - sw) // 2
    border = Image.new("RGB", (sw + 4, sh + 4), LINE)
    bmask = Image.new("L", (sw + 4, sh + 4), 0)
    ImageDraw.Draw(bmask).rounded_rectangle((0, 0, sw + 3, sh + 4 + r), radius=r + 2, fill=255)
    im.paste(border, (sx - 2, top - 2), bmask)
    im.paste(shot, (sx, top), mask)
    del avail_h
    im.save(dest)


def feature():
    W, H = 1024, 500
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    # 右に机とびん・相棒
    px = 6
    table_y = 420
    d.rectangle((0, table_y, W, H), fill=(196, 154, 108))
    d.rectangle((0, table_y + px, W, table_y + 2 * px), fill=(156, 117, 80))
    order = ["sora", "kinako", "momo", "wakaba", "mikan", "fuji"]
    jar = art.jar_image(art.S["jars"]["round"], [art.CANDY[order[(i // 5) % 6]] for i in range(34)])
    jar = jar.resize((jar.width * px, jar.height * px), Image.NEAREST)
    im.paste(jar, (W - jar.width - 70, table_y - jar.height), jar)
    sp = art.S["animals"]["hamster"]
    ham = art.sprite(sp, ("paws_hold",))
    ham.alpha_composite(art.grain(art.CANDY["sora"]), tuple(sp["hold"]))
    ham = ham.resize((ham.width * px, ham.height * px), Image.NEAREST)
    im.paste(ham, (W - jar.width - 70 - ham.width - 30, table_y - ham.height), ham)
    ft = ImageFont.truetype(BOLD, 58)
    fs = ImageFont.truetype(REG, 26)
    d.text((64, 120), "こつびん", font=ImageFont.truetype(BOLD, 34), fill=GREEN)
    d.text((64, 178), "がんばった時間が、", font=ft, fill=INK)
    d.text((64, 252), "金平糖になる。", font=ft, fill=INK)
    d.text((64, 340), "相棒と一緒に、作業と勉強の記録", font=fs, fill=SUB)
    im.save(APP / "store/play/feature_1024x500.png")


if __name__ == "__main__":
    (APP / "store/ios").mkdir(parents=True, exist_ok=True)
    (APP / "store/play").mkdir(parents=True, exist_ok=True)
    ios = capture(430, 932, 3, "ios")
    play = capture(360, 640, 3, "play")
    for name, title, sub, _ in SHOTS:
        compose(ios[name], title, sub, 1290, 2796, APP / f"store/ios/{name}.png")
        compose(play[name], title, sub, 1080, 1920, APP / f"store/play/{name}.png")
    feature()
    print("ok")
