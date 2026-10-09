"""ブラウザで実際に押して回る確認。先に npm run build と python scripts/serve.py 5297 を動かしておく。
python scripts/e2e.py  → 375 / 430 幅 × ライト / ダーク の4通りを回し、画面写真を scripts/e2e_out/ に置く。
時計は Playwright の clock で進める(作業15分・ひとやすみ10分を待たずに確かめる)。"""
import os
import re
import sys
from playwright.sync_api import sync_playwright, expect

sys.path.insert(0, os.path.dirname(__file__))
from seed import init_script, seeded  # noqa: E402

URL = "http://127.0.0.1:5297/?mockbuy=1"
OUT = os.path.join(os.path.dirname(__file__), "e2e_out")
os.makedirs(OUT, exist_ok=True)
fails: list[str] = []


def check(cond, msg):
    print(("OK  " if cond else "NG  ") + msg)
    if not cond:
        fails.append(msg)


def common_checks(page, tag):
    """横にはみ出していない・英語の取り残しが無い・押せる所の高さ"""
    over = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    check(over <= 0, f"{tag}: 横にはみ出さない ({over}px)")
    text = page.evaluate("document.body.innerText")
    eng = re.findall(r"[A-Za-z]{2,}", text)
    check(not eng, f"{tag}: 英語の取り残しなし {eng[:5]}")
    small = page.evaluate("""() => [...document.querySelectorAll('button, a, select, input, [role=radio]')]
        .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; })
        .filter(e => { const r = e.getBoundingClientRect(); return r.height < 40 && !e.closest('.toast'); })
        .map(e => (e.innerText || e.getAttribute('aria-label') || e.tagName).slice(0, 12) + ':' + Math.round(e.getBoundingClientRect().height))""")
    check(not small, f"{tag}: 押せる所は高さ40px以上 {small[:6]}")


def shot(page, name, full=False):
    page.wait_for_timeout(250)
    page.screenshot(path=os.path.join(OUT, name + ".png"), full_page=full)


def run(p, width, scheme):
    tag = f"{width}-{scheme}"
    height = 667 if width == 375 else 932
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": width, "height": height}, device_scale_factor=2, locale="ja-JP", color_scheme=scheme, timezone_id="Asia/Tokyo")
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.clock.install()

    # 1. はじめて
    page.goto(URL)
    expect(page.get_by_text("びんの金平糖になる。")).to_be_visible()
    common_checks(page, tag + " はじめて1")
    shot(page, f"{tag}_01_onboarding1")
    page.get_by_role("button", name="つぎへ").click()
    page.get_by_label("名前").fill("こむぎ")
    shot(page, f"{tag}_02_onboarding2")
    page.get_by_role("button", name="こむぎとはじめる").click()
    expect(page.get_by_role("button", name="はじめる")).to_be_visible()
    check(page.get_by_text("こむぎ", exact=True).count() == 1, f"{tag}: 名前が相棒の横に出る")
    check(page.get_by_text("「はじめる」を押すと").count() == 1, f"{tag}: 初回は使い方の一言")
    common_checks(page, tag + " きょう(空)")
    shot(page, f"{tag}_03_today_empty")

    # 2. はじめる → 15分 → 粒が1つ
    page.get_by_role("button", name="はじめる").click()
    expect(page.get_by_role("timer")).to_be_visible()
    page.clock.fast_forward("15:00")
    page.wait_for_timeout(1300)
    check("15:0" in page.get_by_role("timer").inner_text(), f"{tag}: 15分すすむと時計も15分")
    check(page.get_by_text("1粒", exact=True).count() == 1, f"{tag}: 10分をこえたら金平糖が1粒")
    common_checks(page, tag + " 作業中")
    shot(page, f"{tag}_04_today_focus")

    # 3. ひとやすみ → 通知の確認(使う直前) → 10分で起きる
    page.get_by_role("button", name="ひとやすみ").click()
    expect(page.get_by_role("dialog", name="起きたら知らせてもいい？")).to_be_visible()
    shot(page, f"{tag}_05_notify_ask")
    page.get_by_role("button", name="知らせてほしい").click()
    expect(page.get_by_text("ひとやすみ中")).to_be_visible()
    shot(page, f"{tag}_06_rest")
    page.clock.fast_forward("10:30")
    page.wait_for_timeout(1300)
    check(page.get_by_text("ひとやすみ、おわり", exact=True).count() >= 1, f"{tag}: 10分で起きる")
    check(page.locator(".cue-banner").count() == 1, f"{tag}: 起きたら画面で知らせる")
    shot(page, f"{tag}_07_rest_over")
    page.get_by_role("button", name="つづける").click()
    page.clock.fast_forward("20:00")
    page.wait_for_timeout(1200)
    # 種類を変える(作業中なら区切って続く)
    page.get_by_role("radio", name="読書").click()
    page.clock.fast_forward("12:00")
    page.wait_for_timeout(1200)
    page.get_by_role("button", name="おしまい").click()
    expect(page.locator(".toast")).to_contain_text("記録したよ")
    check(page.get_by_text("4粒", exact=True).count() == 1, f"{tag}: 15+20+12=47分で4粒")
    shot(page, f"{tag}_08_today_after")

    # 4. たな → その日 → 記録を直す・消す・戻す
    page.get_by_role("button", name="たな").click()
    expect(page.get_by_text("この週")).to_be_visible()
    common_checks(page, tag + " たな")
    shot(page, f"{tag}_09_shelf", full=True)
    page.locator(".cal-day.today").click()
    expect(page.get_by_text("この日の合計")).to_be_visible()
    rows = page.locator(".rows .row")
    check(rows.count() == 3, f"{tag}: その日の記録が3件 ({rows.count()})")
    common_checks(page, tag + " 日")
    shot(page, f"{tag}_10_day")
    rows.first.click()
    expect(page.get_by_role("dialog", name="記録を直す")).to_be_visible()
    shot(page, f"{tag}_11_edit")
    start = page.get_by_label("はじめ").input_value()
    page.get_by_label("おわり").fill(start)
    page.get_by_role("button", name="これで直す").click()
    check(page.get_by_role("alert").inner_text().startswith("終わりは"), f"{tag}: 終わりが始まりと同じなら理由が出る")
    page.get_by_role("button", name="この記録を消す").click()
    expect(page.locator(".toast")).to_contain_text("消したよ")
    check(rows.count() == 2, f"{tag}: 消すと2件")
    page.get_by_role("button", name="もとに戻す").click()
    check(rows.count() == 3, f"{tag}: もとに戻すで3件")

    # 押し忘れを足す
    page.get_by_role("button", name="記録を足す").click()
    expect(page.get_by_role("dialog", name="記録を足す")).to_be_visible()
    page.get_by_role("button", name="これで足す").click()
    expect(page.locator(".toast")).to_contain_text("足したよ")
    check(rows.count() == 4, f"{tag}: 足すと4件")
    page.get_by_role("button", name="たな").first.click()

    # 5. せってい → 有料の相棒 → なかまセット(疑似購入) → 選べる
    page.get_by_role("button", name="せってい").click()
    common_checks(page, tag + " せってい")
    shot(page, f"{tag}_12_settings", full=True)
    page.get_by_role("radio", name="ペンギン(なかまセット)").click()
    expect(page.get_by_role("dialog", name="なかまセット")).to_be_visible()
    common_checks(page, tag + " なかまセット")
    shot(page, f"{tag}_13_paywall")
    page.get_by_role("button", name=re.compile("で買う$")).click()
    expect(page.locator(".toast")).to_contain_text("なかまがふえた")
    page.get_by_role("radio", name="ペンギン").click()
    page.get_by_role("radio", name="かくびん").click()
    check(page.get_by_label("名前").input_value() == "あずき", f"{tag}: ペンギンの名前")

    # 作業の種類: 足す・しまう・戻す
    page.get_by_role("button", name=re.compile("^作業の種類")).click()
    page.get_by_role("button", name="種類を足す").click()
    page.get_by_label("名前", exact=True).fill("英語")
    page.get_by_role("button", name="これで足す").click()
    expect(page.get_by_role("button", name="英語", exact=True)).to_be_visible()
    page.get_by_role("button", name="家のこと", exact=True).click()
    page.get_by_role("button", name="この種類をしまう").click()
    expect(page.get_by_text("しまった種類")).to_be_visible()
    shot(page, f"{tag}_14_cats")
    page.get_by_role("button", name="戻す", exact=True).click()
    check(page.get_by_text("しまった種類").count() == 0, f"{tag}: 戻すと一覧に戻る")
    page.get_by_role("button", name="せってい").first.click()

    # 1日の目標
    page.get_by_role("button", name=re.compile("^1日の目標")).click()
    page.get_by_label("まとめて決める").select_option("90")
    check(page.get_by_label("日曜日").input_value() == "90", f"{tag}: まとめて決めると全部の曜日に入る")
    page.get_by_label("日曜日").select_option("0")
    shot(page, f"{tag}_15_goals")
    page.get_by_role("button", name="せってい").first.click()

    # 6. きょうに戻ると、ペンギンとかくびん
    page.get_by_role("button", name="きょう").click()
    check(page.get_by_text("あずき", exact=True).count() == 1, f"{tag}: 選んだ相棒になる")
    shot(page, f"{tag}_16_today_pengin")

    # 7. 文字を大きくしても崩れない
    page.add_style_tag(content=":root{--fs-cap:16px;--fs-body:20px;--fs-title:22px;--fs-head:29px;--fs-num:56px}")
    page.wait_for_timeout(200)
    common_checks(page, tag + " 大きい文字 きょう")
    shot(page, f"{tag}_17_bigtext_today")
    page.get_by_role("button", name="たな").click()
    common_checks(page, tag + " 大きい文字 たな")
    shot(page, f"{tag}_18_bigtext_shelf")

    check(not errors, f"{tag}: コンソールのエラーなし {errors[:3]}")
    b.close()


def run_seeded(p, width, scheme):
    """記録がたまった状態(画面写真用)と、12時間つけっぱなしの確認"""
    tag = f"{width}-{scheme}"
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": width, "height": 667 if width == 375 else 932}, device_scale_factor=2, locale="ja-JP", color_scheme=scheme, timezone_id="Asia/Tokyo")
    import time
    long_start = int((time.time() - 13 * 3600) * 1000)
    ctx.add_init_script(init_script(seeded(running={"mode": "focus", "cat": "c-study", "start": long_start})))
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    expect(page.get_by_role("dialog")).to_contain_text("つけっぱなし")
    shot(page, f"{tag}_19_longrun")
    page.get_by_role("button", name="この時刻で終わり").click()
    expect(page.locator(".toast")).to_contain_text("終わりの時刻")
    check(page.get_by_role("button", name="はじめる").count() == 1, f"{tag}: つけっぱなしを終えると止まる")
    check(not errors, f"{tag}: エラーなし(記録あり)")
    b.close()


with sync_playwright() as p:
    for w in (375, 430):
        for s in ("light", "dark"):
            run(p, w, s)
            run_seeded(p, w, s)

print()
print("NG:", len(fails))
for f in fails:
    print("  -", f)
sys.exit(1 if fails else 0)
