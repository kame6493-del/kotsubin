"""見本と並べる画面写真を撮る。python scripts/shots.py <幅> [light|dark] → scripts/e2e_out/shot_<幅>_<名前>.png
先に npm run build と python scripts/serve.py 5297。"""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from seed import seeded, init_script
from playwright.sync_api import sync_playwright

W = int(sys.argv[1]) if len(sys.argv) > 1 else 430
SCHEME = sys.argv[2] if len(sys.argv) > 2 else "light"
ONLY = sys.argv[3:]
H = 667 if W == 375 else 932
OUT = os.path.join(os.path.dirname(__file__), "e2e_out")
os.makedirs(OUT, exist_ok=True)
now = time.time()
CASES = {
    "today_focus": dict(running={"mode": "focus", "cat": "c-study", "start": int((now - 24 * 60 - 10) * 1000)}, today_minutes=(40, 30, 20, 0)),
    "today_idle": dict(),
    "today_pause": dict(running={"mode": "pause", "cat": "c-work", "start": int((now - 60) * 1000), "carry": 31 * 60 * 1000}),
    "today_rest": dict(running={"mode": "rest", "cat": "c-study", "start": int((now - 28) * 1000), "len": 10}),
    "today_empty": dict(today_minutes=(0, 0, 0)),
    "shelf": dict(),
    "day": dict(today_minutes=(50, 75, 30, 20)),
    "review": dict(days=40),
    "edit": dict(),
    "set": dict(),
}
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, kw in CASES.items():
        if ONLY and name not in ONLY:
            continue
        ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=2, locale="ja-JP", color_scheme=SCHEME, timezone_id="Asia/Tokyo")
        ctx.add_init_script(init_script(seeded(**kw)))
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto("http://127.0.0.1:5297/?mockbuy=1")
        pg.wait_for_timeout(900)
        if name == "shelf":
            pg.get_by_role("button", name="たな", exact=True).click()
        if name == "day":
            pg.get_by_role("button", name="たな", exact=True).click(); pg.get_by_role("button", name="この日をくわしく見る").click()
        if name == "review":
            pg.get_by_role("button", name="ふりかえり").first.click()
        if name == "edit":
            pg.get_by_role("button", name="編集", exact=True).click()
        if name == "set":
            pg.get_by_role("button", name="セット", exact=True).last.click()
        pg.wait_for_timeout(700)
        pg.screenshot(path=os.path.join(OUT, f"shot_{W}_{SCHEME}_{name}.png"), full_page=True)
        print(name, errs[:3])
        ctx.close()
    b.close()
