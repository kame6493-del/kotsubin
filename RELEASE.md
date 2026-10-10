# こつびん 1.1.0 — 見た目を持ち主の見本どおりに作り直した(2026-10-10)

## 何を変えたか
持ち主から届いた画面見本7枚とデザインガイド1枚(ChatGPT 画像 2026年10月10日 11_40_*.png。作業用の写しは scripts/mihon/、リポジトリには入れていない)のとおりに、画面と絵を全部作り直した。
- 絵は見本から切り出して使う(scripts/cut_assets.py → public/art/*.webp と src/art/layout.json)。場面の台紙・びん3種・札・こんぺいとう9色・ハムスター(磨く・眠る・よろこぶ・編集のお手伝い ほか)・なかま3匹・月の棚・なかまセットの部品。ドット絵の格子(sprites.json)は外した
- 下のタブは きょう・たな・編集・セット の4つ。きょう=見本1・5(作業中/一時停止/休憩)、たな=見本2(+見本4の選んだ日のまとめ)、その日=見本3、ふりかえり=見本6、セット=見本7、編集=ガイド⑮
- 足した機能: 一時停止(時計は続きから)、休憩時間を 5・10・15・30分から選ぶ・5分延長、記録ごとの「何をした」、その日のメモ、その日のサマリーとタイムライン(記録ごとの粒)、ふりかえり(週の集中時間・粒・最長でつづいた日数・内訳・1週間のびん・やさしいコメント)、作業の種類のしるし
- そのまま残した機能: 記録・押し忘れの修正(足す/直す/消す/もとに戻す)・日付またぎ・1日の区切り・曜日ごとの目標・週/月/全部の合計・画像共有・作業の種類の編集・なかまセットの課金・プライバシー・つけっぱなしの確認・通知・暗い画面
- 作業の種類の初期値は見本どおり 勉強(青)・仕事(橙)・読書(緑)・趣味(紫)。なかまセットのびんは ほしのびん・まるびん(前の版の かくびん・つぼ は読み替える)
- 表記は「こんぺいとう」にそろえた(掲載文・テスター募集文も)
- 文字は Zen Maru Gothic(SIL OFL。public/fonts に必要な字だけ。scripts/make_font.py)
- アイコンは持ち主から届いたハムスターとびんの絵(scripts/icon_src/、リポジトリには入れていない)。scripts/make_icons.py で iOS・ストア・Android(適応アイコンの前景は 108dp のうち 64dp、背景 #D9AE7C)を作る。確かめの絵は scripts/cut_out/icon_check.png

## 確かめたこと(1.1.0)
1. vitest: 5ファイル 55件 通過 / npm run build 通過
2. E2E(scripts/e2e.py): 375・430 幅 × 明るい・暗い で 376 項目 NG 0(初回→空の状態→はじめる→1粒が落ちる動き→一時停止→再開→種類の切り替え→休憩(通知の確認・時間を選ぶ・延長・起きる)→終了→たな→記録を消す/戻す/直す(理由つきで断る)/足す→その日→メモ→ふりかえり→編集→種類を足す/しまう/戻す→セット→なかまセットの疑似購入→相棒とびんを替える→目標→大きい文字→つけっぱなし)。横はみ出し0・英字の取り残し0・40px 未満の押せる物0・絵の読み込み失敗0・コンソールのエラー0
3. 見本との比較: docs/compare_1〜8_*.png と docs/compare_all.png
4. Android: versionCode 2 / versionName 1.1.0。releases/kotsubin-1.1.0-release.aab(9.6MB、jar verified、証明書の SHA256 は 1.0.0 と同じ C0:6F:B7:…:C1:92)
5. iOS: MARKETING_VERSION 1.1.0。ワークフローは触っていない
6. ストア素材: store/ios(1290x2796)・store/play(1080x1920)を5枚ずつ、feature_1024x500、アイコン。値段と「無料」は写していない(scripts/make_store.py が写す画面の文字を確かめる)。前の版は store/_v1_backup/

---

# こつびん 1.0.0 — 作ったもの・確かめたこと・残り(2026-10-09)

## 何を作ったか
作業・勉強の時間を記録するアプリ。「はじめる」を押すと、となりのドット絵のハムスターが金平糖をみがき、10分ごとに1粒がびんに落ちる。1日で1びん、月のカレンダーがびんの棚になる。
- 企画の根拠: docs/01_勝ち組の分析.md(ねこ勤怠・StudyLive・Synaps・こもりば・FocusFlight・マイ・リトル・ポモドーロ・Chill with You のレビュー計約900件)
- 企画: docs/02_企画.md / 使いやすさの点検: docs/03_使いやすさ点検.md
- 掲載文: store/listing.md / プライバシー: store/privacy.md / Play の回答案: store/play/data_safety_and_rating.md / テスター募集: store/tester_post.txt

## 基本の値
- appId: jp.kotsubin.app(Android の applicationId と iOS の Bundle ID)
- versionCode 1 / versionName 1.0.0 / targetSdk 36 / minSdk 24
- 課金: RevenueCat。商品ID kotsubin_nakama_set(非消耗型・¥500 の想定)、entitlement nakama。キーは src/config.ts で空(空のあいだは「購入は準備中です」と出て、課金は走らない)
- 記録は端末の中だけ(@capacitor/preferences)。サーバー・ログイン・広告・解析なし

## 出来た物
- AAB(署名済み): releases/kotsubin-1.0.0-release.aab(jarsigner -verify で「jar verified」)
- APK(確認用・同じ鍵): releases/kotsubin-1.0.0-release.apk(aapt で jp.kotsubin.app / versionCode 1 / 1.0.0 / targetSdk 36 を確認)
- 署名鍵: %LOCALAPPDATA%\KotsubinBuild\signing\kotsubin-upload.jks(別名 kotsubin-upload)。パスワードは同じフォルダの upload-password.dpapi(DPAPI、このWindowsユーザーだけが復号できる)。値はどこにも書いていない。このフォルダごと安全な所へ控えること
- 組み直し: npm run build → npx cap sync android → powershell -File scripts/build-android.ps1

## 確かめたこと
1. 単体テスト(vitest): 5ファイル 45件すべて通過(日の区切り・日付またぎ・合計・金平糖の数と色・記録の操作・種類・保存の読み替え・相棒の一言・ドット絵の格子)
2. npm run build: 通過
3. E2E(Playwright、scripts/e2e.py): 375 / 430 幅 × ライト / ダーク の4通りで 184 項目 NG 0。はじめて→名前→はじめる→15分で1粒→ひとやすみ(通知の確認)→10分で起きる→種類の切り替え→おしまい→たな→日→記録を直す・理由つきで断る・消す・もとに戻す・足す→なかまセット(疑似購入)→相棒とびんを替える→種類を足す・しまう・戻す→曜日ごとの目標→大きい文字。記録がたまった状態で12時間つけっぱなしの確認。どの画面も横はみ出し0・英字の取り残し0・40px未満の押せる物0・コンソールのエラー0
4. 画面写真(scripts/e2e_out/ 76枚)を1枚ずつ目で確認。直したこと: 机が絵の中で切れていた→全幅に / 暗い画面でびんの中が白く光っていた→暗いガラス色に / ペンギンが暗い背景に沈んでいた→紺を明るく / あふれた粒が四角い塊に見えた→4・3・2・1の山に / 知らせの帯が画面を移っても残り一覧を隠した→移ったら消す・下にボタンの無い画面では下げる / 背の高い画面で中ほどが空いていた→「きょうの中身」を足した / 初回の一言の「はじめる」をかぎかっこに
5. ドット絵は1体ずつ12倍に拡大して確認(scripts/art_out/)。耳がとがって猫に見えたハムスターは丸い耳に、「#」に見えた金平糖は角のある形に、レンガ積みに見えた粒の並びは山積みに直した
6. Android: cap add / cap sync、署名済み AAB と APK
7. iOS: cap add ios、Info.plist(表示名「こつびん」・日本語・暗号化なし・縦固定・arm64)、iPhone 専用、MARKETING_VERSION 1.0.0、.github/workflows/ios-testflight.yml(push はしていない)
8. ストア素材: store/icon_1024.png、store/play/icon_512.png、store/play/feature_1024x500.png、iPhone 1290x2796 を5枚(store/ios/)、Play 1080x1920 を5枚(store/play/)。写真に値段・「無料」は入れていない

## 絵・素材
- 絵はすべて src/art/sprites.json の格子を手で決めた物(相棒4匹・びん3つ・金平糖1粒)。外部の素材は使っていない
- フォントは端末の物(ストアの写真の文字だけ Windows の游ゴシック。画像に焼き込む使い方は Microsoft のフォントの再配布に当たらない)

## 残り(持ち主側・未実施)
- iOS は Windows で組めない。GitHub Actions の macOS で組む前提で、まだ一度も流していない。初回は compile_only=true で流して、Capacitor 8 + RevenueCat 13 が macos-26 / 最新 Xcode でコンパイルできるかを確かめる。通らない可能性はある(プラグインの版と Xcode の組み合わせ)。シークレット4つ(ASC_KEY_ID / ASC_ISSUER_ID / APPLE_TEAM_ID / ASC_KEY_P8_BASE64)はニガテ帳と同じ物
- Apple 4.3(a) の警告付きアカウント: ほかの2本(ロック画面メモ・歩数計)と間を空けて1本ずつ出す。見た目・部品・文の型はお手本とも他の2本とも別に作った
- App Store Connect / Play Console でアプリを作る、アプリ内課金 kotsubin_nakama_set(非消耗型・¥500)を作る、RevenueCat にアプリと entitlement nakama・offering を作り、公開キーを src/config.ts に入れてビルドし直す
- iOS の In-App Purchase の Capability(Bundle ID 側で有効か確認)
- プライバシーポリシーを公開する: src/config.ts の privacyUrl は https://kame6493-del.github.io/kotsubin/privacy.html にしてある(まだ無い)。store/privacy.md をその場所に置く。アプリ一覧のページにも section を足す
- Play: 内部テスト→クローズドテスト(12人×14日)。募集文は store/tester_post.txt
- Play の名前の重なりは調べていない(App Store は iTunes Search API で「こつびん」0件を確認)
- 実機での確認はしていない(通知・振動・共有シート・戻るボタンはブラウザでは確かめられない)
