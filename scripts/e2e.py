"""ブラウザで実際に押して回る確認(1.1.0 の新しい見た目)。先に npm run build と python scripts/serve.py 5297。
python scripts/e2e.py → 375 / 430 幅 × ライト / ダーク の4通り。画面写真は scripts/e2e_out/e2e_<幅>-<見た目>_<番号>_<名前>.png
時計は Playwright の clock で進める(作業15分・休憩を待たずに確かめる)。"""
import os
import re
import sys
import time
from playwright.sync_api import sync_playwright, expect

sys.path.insert(0, os.path.dirname(__file__))
from seed import init_script, seeded  # noqa: E402

URL = "http://127.0.0.1:5297/?mockbuy=1"
OUT = os.path.join(os.path.dirname(__file__), "e2e_out")
os.makedirs(OUT, exist_ok=True)
fails: list[str] = []
count = [0]


def check(cond, msg):
    count[0] += 1
    print(("OK  " if cond else "NG  ") + msg)
    if not cond:
        fails.append(msg)


def common_checks(page, tag):
    """横にはみ出さない・英語の取り残しが無い・押せる所の高さ・絵が読めている"""
    over = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    check(over <= 0, f"{tag}: 横にはみ出さない ({over}px)")
    text = page.evaluate("document.body.innerText")
    eng = re.findall(r"[A-Za-z]{2,}", text)
    check(not eng, f"{tag}: 英語の取り残しなし {eng[:5]}")
    small = page.evaluate("""() => [...document.querySelectorAll('button, a, select, input, textarea, [role=radio]')]
        .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; })
        .filter(e => { const r = e.getBoundingClientRect(); return (r.height < 40 || r.width < 40) && !e.closest('.toast'); })
        .map(e => (e.innerText || e.getAttribute('aria-label') || e.tagName).slice(0, 12) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))""")
    check(not small, f"{tag}: 押せる所は40px以上 {small[:6]}")
    broken = page.evaluate("() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.split('/').pop())")
    check(not broken, f"{tag}: 絵が全部読めている {broken[:4]}")


def shot(page, tag, name, full=False):
    page.wait_for_timeout(300)
    page.screenshot(path=os.path.join(OUT, f"e2e_{tag}_{name}.png"), full_page=full)


def tab(page, name):
    page.locator(".tabbar").get_by_role("button", name=name, exact=True).click()
    page.wait_for_timeout(250)


def new_ctx(p, width, scheme, data=None):
    height = 667 if width == 375 else 932
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": width, "height": height}, device_scale_factor=2, locale="ja-JP", color_scheme=scheme, timezone_id="Asia/Tokyo")
    if data is not None:
        ctx.add_init_script("if(!sessionStorage.getItem('seeded')){" + init_script(data) + "sessionStorage.setItem('seeded','1')}")
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    return b, page, errors


def run(p, width, scheme):
    tag = f"{width}-{scheme}"
    b, page, errors = new_ctx(p, width, scheme)
    page.clock.install()

    # 1. はじめて
    page.goto(URL)
    expect(page.get_by_text("びんのこんぺいとうになる。")).to_be_visible()
    common_checks(page, tag + " はじめて1")
    shot(page, tag, "01_onboarding1")
    page.get_by_role("button", name="つぎへ").click()
    page.get_by_label("名前").fill("こむぎ")
    shot(page, tag, "02_onboarding2")
    page.get_by_role("button", name="こむぎとはじめる").click()

    # 2. きょう(空の状態)
    expect(page.get_by_role("button", name="はじめる")).to_be_visible()
    check(page.get_by_alt_text(re.compile("さあ はじめよう")).count() == 1, f"{tag}: 空の状態の応援が出る")
    check(page.locator(".tag-n").inner_text().startswith("0"), f"{tag}: 札は0粒")
    common_checks(page, tag + " きょう(空)")
    shot(page, tag, "03_today_empty")

    # 3. はじめる → 15分 → 1粒入る動きとやさしい知らせ
    page.get_by_role("button", name="はじめる").click()
    expect(page.get_by_text("作業中", exact=True)).to_be_visible()
    page.clock.fast_forward("09:55")
    page.wait_for_timeout(600)
    shot(page, tag, "04_today_focus")
    common_checks(page, tag + " 作業中")
    page.clock.fast_forward("00:10")
    page.wait_for_timeout(450)
    check(page.locator(".candy-drop").count() == 1, f"{tag}: 1粒が落ちてくる動き")
    check(page.locator(".sparkle-burst").count() == 1, f"{tag}: 入るときらっと光る")
    expect(page.locator(".toast")).to_contain_text("1粒 ふえたよ")
    shot(page, tag, "05_drop")
    page.clock.fast_forward("05:00")
    page.wait_for_timeout(1300)
    check("15:0" in page.get_by_role("timer").inner_text(), f"{tag}: 15分すすむと時計も15分")
    check(page.locator(".tag-n").inner_text().startswith("1"), f"{tag}: 10分をこえたら札が1粒")

    # 4. 一時停止 → 時計が止まる → 再開
    page.get_by_role("button", name="一時停止").click()
    expect(page.get_by_text("一時停止中", exact=True)).to_be_visible()
    t1 = page.get_by_role("timer").inner_text()
    page.clock.fast_forward("03:00")
    page.wait_for_timeout(400)
    check(page.get_by_role("timer").inner_text() == t1, f"{tag}: 一時停止中は時計が止まる ({t1})")
    check(page.get_by_role("button", name="休憩する").count() == 1, f"{tag}: 一時停止中に休憩のすすめ")
    common_checks(page, tag + " 一時停止")
    shot(page, tag, "06_pause")
    page.get_by_role("button", name="再開").click()
    page.clock.fast_forward("02:00")
    page.wait_for_timeout(1300)
    check(page.get_by_role("timer").inner_text().startswith("17:"), f"{tag}: 再開すると続きから ({page.get_by_role('timer').inner_text()})")

    # 5. 種類を変える → 休憩(通知の確認)→ 休憩時間を選ぶ → 延長 → 起きる
    page.get_by_role("radio", name="読書").click()
    page.clock.fast_forward("05:00")
    page.get_by_role("button", name="一時停止").click()
    page.get_by_role("button", name="休憩する").click()
    expect(page.get_by_role("dialog", name="起きたら知らせてもいい？")).to_be_visible()
    shot(page, tag, "07_notify_ask")
    page.get_by_role("button", name="知らせてほしい").click()
    expect(page.get_by_text("休憩中", exact=True)).to_be_visible()
    check(page.get_by_role("radio", name=re.compile("^5")).get_attribute("aria-checked") == "true", f"{tag}: 休憩は5分から")
    page.get_by_role("radio", name=re.compile("^10")).click()
    page.wait_for_timeout(1200)
    check(page.get_by_role("timer").inner_text().startswith("09:") or page.get_by_role("timer").inner_text().startswith("10:"), f"{tag}: 10分を選ぶと残り10分")
    common_checks(page, tag + " 休憩")
    shot(page, tag, "08_rest")
    page.get_by_role("button", name="5分延長").click()
    page.wait_for_timeout(1200)
    check(page.get_by_role("timer").inner_text().startswith("14:") or page.get_by_role("timer").inner_text().startswith("15:"), f"{tag}: 5分延長で残り15分")
    page.clock.fast_forward("15:30")
    page.wait_for_timeout(1300)
    check(page.get_by_text("休憩おわり", exact=True).count() == 1, f"{tag}: 時間がたつと起きる")
    check(page.locator(".cue-banner").count() == 1, f"{tag}: 起きたら画面で知らせる")
    shot(page, tag, "09_rest_over")
    page.get_by_role("button", name="つづける").click()
    page.clock.fast_forward("20:00")
    page.wait_for_timeout(1200)
    page.get_by_role("button", name="終了").click()
    expect(page.locator(".toast")).to_contain_text("記録したよ")
    # 15+2+5 分(勉強・読書)+20分 = 42分 → 4粒
    check(page.locator(".tag-n").inner_text().startswith("4"), f"{tag}: 42分で4粒 ({page.locator('.tag-n').inner_text()})")
    shot(page, tag, "10_today_idle")

    # 6. たな → きょうの記録 → 消す・戻す・足す
    tab(page, "たな")
    expect(page.get_by_role("button", name="前の月")).to_be_visible()
    common_checks(page, tag + " たな")
    shot(page, tag, "11_shelf", full=True)
    rows = page.locator(".rec")
    check(rows.count() == 4, f"{tag}: きょうの記録が4件 ({rows.count()})")
    rows.first.locator(".rec-del").click()
    expect(page.locator(".toast")).to_contain_text("消したよ")
    check(rows.count() == 3, f"{tag}: 消すと3件")
    page.get_by_role("button", name="もとに戻す").click()
    check(rows.count() == 4, f"{tag}: もとに戻すで4件")
    rows.first.locator(".rec-main").click()
    expect(page.get_by_role("dialog", name="記録を直す")).to_be_visible()
    start = page.get_by_label("はじめ").input_value()
    page.get_by_label("おわり").fill(start)
    page.get_by_role("button", name="これで直す").click()
    check(page.get_by_role("alert").inner_text().startswith("終わりは"), f"{tag}: 終わりが始まりと同じなら理由が出る")
    shot(page, tag, "12_edit_sheet")
    page.get_by_role("button", name="閉じる").click()
    page.get_by_role("button", name="追加").first.click()
    page.get_by_label(re.compile("なにをした")).fill("英単語の復習")
    page.get_by_role("button", name="これで足す").click()
    expect(page.locator(".toast")).to_contain_text("足したよ")
    check(rows.count() == 5, f"{tag}: 足すと5件")

    # 7. その日 → メモ
    page.get_by_role("button", name="この日をくわしく見る").click()
    expect(page.get_by_text("作業のタイムライン")).to_be_visible()
    check(page.locator(".timeline li").count() == 5, f"{tag}: タイムラインが5件")
    check(page.get_by_text("英単語の復習").count() >= 1, f"{tag}: 記録のメモがタイムラインに出る")
    page.get_by_role("button", name="メモを書く").click()
    page.get_by_role("dialog").locator("textarea").fill("きょうはよくできた")
    page.get_by_role("button", name="保存").click()
    check(page.locator(".memo-text").inner_text() == "きょうはよくできた", f"{tag}: メモが残る")
    common_checks(page, tag + " その日")
    shot(page, tag, "13_day", full=True)
    page.get_by_role("button", name="たなへ戻る").click()
    expect(page.get_by_role("button", name="前の月")).to_be_visible()

    # 8. ふりかえり(きょうの右上のボタンから)
    tab(page, "きょう")
    page.get_by_role("button", name="ふりかえり").click()
    expect(page.get_by_text("作業の内訳")).to_be_visible()
    page.get_by_role("radio", name="こんぺいとう").click()
    common_checks(page, tag + " ふりかえり")
    shot(page, tag, "14_review", full=True)

    # 9. 編集: 記録を直す・作業の種類を足す・しまう・戻す
    tab(page, "編集")
    expect(page.get_by_role("heading", name="編集")).to_be_visible()
    common_checks(page, tag + " 編集")
    shot(page, tag, "15_edit")
    page.locator(".hr-edit").first.click()
    expect(page.get_by_role("dialog", name="記録を直す")).to_be_visible()
    page.get_by_role("button", name="閉じる").click()
    page.get_by_role("tab", name="作業の種類").click()
    page.get_by_role("button", name="種類を足す").click()
    page.get_by_label("名前", exact=True).fill("ピアノ")
    check(page.get_by_role("radio", name="音楽").get_attribute("aria-checked") == "true", f"{tag}: 名前からしるしを選ぶ")
    page.get_by_role("button", name="これで足す").click()
    expect(page.get_by_role("button", name="ピアノ", exact=True)).to_be_visible()
    page.get_by_role("button", name="趣味", exact=True).click()
    page.get_by_role("button", name="この種類をしまう").click()
    expect(page.get_by_text("しまった種類")).to_be_visible()
    shot(page, tag, "16_cats")
    page.get_by_role("button", name="戻す", exact=True).click()
    check(page.get_by_text("しまった種類").count() == 0, f"{tag}: 戻すと一覧に戻る")

    # 10. セット: 有料の相棒は鍵 → なかまセットを買う → 選べる
    tab(page, "セット")
    expect(page.get_by_alt_text("なかまセット", exact=True)).to_be_visible()
    common_checks(page, tag + " セット")
    shot(page, tag, "17_set", full=True)
    check(page.get_by_text("無料", exact=False).count() >= 1, f"{tag}: 記録機能は無料と書いてある")
    page.get_by_role("radio", name="ペンギン(なかまセット)").click()
    expect(page.locator(".toast")).to_contain_text("なかまセットで")
    page.get_by_role("button", name=re.compile("でひらく")).click()
    expect(page.locator(".toast")).to_contain_text("なかまがふえた")
    check(page.get_by_text("購入ずみ").count() >= 1, f"{tag}: 買うと購入ずみ")
    shot(page, tag, "18_set_owned")
    page.get_by_role("radio", name="ペンギン", exact=True).click()
    page.get_by_role("radio", name="ほしのびん", exact=True).click()
    check(page.get_by_label("名前").input_value() == "あずき", f"{tag}: ペンギンの名前")
    page.get_by_role("button", name=re.compile("^1日の目標")).click()
    page.get_by_label("まとめて決める").select_option("90")
    check(page.get_by_label("日曜日").input_value() == "90", f"{tag}: まとめて決めると全部の曜日に入る")
    page.get_by_label("日曜日").select_option("0")
    shot(page, tag, "19_goals")
    page.get_by_role("button", name="セットへ戻る").click()

    # 11. きょうに戻ると、ペンギンとほしのびん
    tab(page, "きょう")
    check(page.locator("img[src*='pengin']").count() == 1, f"{tag}: 選んだ相棒になる")
    check(page.locator("img[src*='jar_hoshi']").count() == 1, f"{tag}: 選んだびんになる")
    common_checks(page, tag + " ペンギン")
    shot(page, tag, "20_today_pengin")

    # 12. 文字を大きくしても崩れない
    page.add_style_tag(content=":root{--fs-cap:15px;--fs-small:16px;--fs-body:19px;--fs-title:21px}")
    page.wait_for_timeout(200)
    common_checks(page, tag + " 大きい文字 きょう")
    tab(page, "たな")
    common_checks(page, tag + " 大きい文字 たな")
    shot(page, tag, "21_bigtext_shelf")

    check(not errors, f"{tag}: コンソールのエラーなし {errors[:3]}")
    b.close()


def run_seeded(p, width, scheme):
    """記録がたまった状態と、12時間つけっぱなしの確認"""
    tag = f"{width}-{scheme}"
    long_start = int((time.time() - 13 * 3600) * 1000)
    b, page, errors = new_ctx(p, width, scheme, seeded(running={"mode": "focus", "cat": "c-study", "start": long_start}))
    page.goto(URL)
    expect(page.get_by_role("dialog")).to_contain_text("つけっぱなし")
    shot(page, tag, "22_longrun")
    page.get_by_role("button", name="この時刻で終わり").click()
    expect(page.locator(".toast")).to_contain_text("終わりの時刻")
    check(page.get_by_role("button", name="はじめる").count() == 1, f"{tag}: つけっぱなしを終えると止まる")
    common_checks(page, tag + " 記録あり きょう")
    tab(page, "たな")
    page.get_by_role("button", name="前の月").click()
    common_checks(page, tag + " 記録あり 前の月")
    shot(page, tag, "23_shelf_prev", full=True)
    check(not errors, f"{tag}: エラーなし(記録あり) {errors[:3]}")
    b.close()


with sync_playwright() as p:
    for w in (375, 430):
        for s in ("light", "dark"):
            run(p, w, s)
            run_seeded(p, w, s)

print()
print(f"項目: {count[0]}  NG: {len(fails)}")
for f in fails:
    print("  -", f)
sys.exit(1 if fails else 0)
