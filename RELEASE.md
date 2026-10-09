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
