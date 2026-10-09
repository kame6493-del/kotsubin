"""とりあえずの画面写真。python scripts/quick.py <名前> <幅> <light|dark> [seed|fresh] [click...]"""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
from seed import seeded, init_script
from playwright.sync_api import sync_playwright
name, width, scheme = sys.argv[1], int(sys.argv[2]), sys.argv[3]
mode = sys.argv[4] if len(sys.argv) > 4 else "seed"
clicks = sys.argv[5:]
out = os.path.join(os.path.dirname(__file__), "art_out", name + ".png")
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": width, "height": 667 if width == 375 else 932}, device_scale_factor=2, locale="ja-JP", color_scheme=scheme)
    if mode == "seed":
        ctx.add_init_script("if(!sessionStorage.getItem('seeded')){" + init_script(seeded()) + "sessionStorage.setItem('seeded','1')}")
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto("http://127.0.0.1:5297/?mockbuy=1")
    pg.wait_for_timeout(800)
    for c in clicks:
        pg.get_by_text(c, exact=True).first.click()
        pg.wait_for_timeout(500)
    pg.screenshot(path=out)
    print("errors:", errs)
    b.close()
