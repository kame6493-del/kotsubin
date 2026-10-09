"""ネイティブ設定を書き換える。python scripts/patch_native.py
(縦固定・iPhone 専用・日本語・暗号化の申告・ホーム画面の名前・通知の小さいアイコン)。
何度流しても同じ結果になる。npx cap add の直後に1回流す。広告・追跡・カメラ・写真・位置は使わないので、その説明文は入れない。"""
import re
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
NAME = "こつびん"


def patch(path: Path, pairs):
    s = path.read_text(encoding="utf-8")
    for old, new in pairs:
        if new in s:
            continue
        assert old in s, (path.name, old[:60])
        s = s.replace(old, new, 1)
    path.write_text(s, encoding="utf-8", newline="\n")


# ---------- Android ----------
patch(APP / "android/app/src/main/AndroidManifest.xml", [
    ('            android:launchMode="singleTask"\n',
     '            android:launchMode="singleTask"\n            android:screenOrientation="portrait"\n'),
])
strings = APP / "android/app/src/main/res/values/strings.xml"
s = strings.read_text(encoding="utf-8")
s = re.sub(r'<string name="app_name">[^<]*</string>', f'<string name="app_name">{NAME}</string>', s)
s = re.sub(r'<string name="title_activity_main">[^<]*</string>', f'<string name="title_activity_main">{NAME}</string>', s)
strings.write_text(s, encoding="utf-8", newline="\n")

# 通知の小さいアイコン(白一色のびん)。capacitor.config.json の LocalNotifications.smallIcon と同じ名前
drawable = APP / "android/app/src/main/res/drawable/ic_stat_kotsubin.xml"
drawable.parent.mkdir(parents=True, exist_ok=True)
drawable.write_text("""<?xml version="1.0" encoding="utf-8"?>
<!-- 通知の小さいアイコン: ふたつきのびんと金平糖(白一色) -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#FFFFFFFF" android:pathData="M8,2h8v3.5h-8z" />
    <path android:fillColor="#FFFFFFFF" android:fillType="evenOdd"
        android:pathData="M9,6.5h6v1.2c2.4,1 3.8,2.7 3.8,5V19a2.5,2.5 0,0 1,-2.5 2.5H7.7A2.5,2.5 0,0 1,5.2 19v-6.3c0,-2.3 1.4,-4 3.8,-5zM8.2,16.2a1.4,1.4 0,1 0,2.8 0a1.4,1.4 0,1 0,-2.8 0zM12.6,14.6a1.4,1.4 0,1 0,2.8 0a1.4,1.4 0,1 0,-2.8 0zM11,18.8a1.3,1.3 0,1 0,2.6 0a1.3,1.3 0,1 0,-2.6 0z" />
</vector>
""", encoding="utf-8", newline="\n")

# ---------- iOS ----------
plist = APP / "ios/App/App/Info.plist"
s = plist.read_text(encoding="utf-8")
s = re.sub(r"(<key>CFBundleDisplayName</key>\s*<string>)[^<]*(</string>)", rf"\g<1>{NAME}\g<2>", s)
plist.write_text(s, encoding="utf-8", newline="\n")
patch(plist, [
    ("\t<key>CFBundleDevelopmentRegion</key>\n\t<string>en</string>",
     "\t<key>CFBundleDevelopmentRegion</key>\n\t<string>ja</string>"),
    ("\t<key>LSRequiresIPhoneOS</key>\n",
     "\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n\t<key>LSRequiresIPhoneOS</key>\n"),
    ("\t\t<string>armv7</string>", "\t\t<string>arm64</string>"),
    ("\t<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>",
     "\t<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>"),
])
pbx = APP / "ios/App/App.xcodeproj/project.pbxproj"
s = pbx.read_text(encoding="utf-8")
s = s.replace('TARGETED_DEVICE_FAMILY = "1,2";', "TARGETED_DEVICE_FAMILY = 1;").replace("MARKETING_VERSION = 1.0;", "MARKETING_VERSION = 1.0.0;")
pbx.write_text(s, encoding="utf-8", newline="\n")

# App Store の書き出し設定(GitHub Actions の macOS で使う)
(APP / "ios/ExportOptions.plist").write_text("""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>method</key>
\t<string>app-store-connect</string>
\t<key>destination</key>
\t<string>upload</string>
\t<key>signingStyle</key>
\t<string>automatic</string>
\t<key>teamID</key>
\t<string>TEAMID</string>
\t<key>uploadSymbols</key>
\t<true/>
\t<key>manageAppVersionAndBuildNumber</key>
\t<false/>
</dict>
</plist>
""", encoding="utf-8", newline="\n")
print("ok")
