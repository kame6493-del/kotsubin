"""アイコンと起動画面を作る。python scripts/make_icons.py
絵は scripts/art.py(= src/art/sprites.json)のドットをそのまま整数倍に拡大する。Capacitor の初期の絵は全部置き換える。"""
import sys
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import art  # noqa: E402

APP = Path(__file__).resolve().parent.parent
RES = APP / "android/app/src/main/res"
GREEN = "#2f6b5c"
CREAM = "#f6f1e7"

store = APP / "store"
(store / "play").mkdir(parents=True, exist_ok=True)
big = art.icon(1024, GREEN, 40).convert("RGB")
big.save(store / "icon_1024.png")
art.icon(512, GREEN, 40).convert("RGB").save(store / "play/icon_512.png")
big.save(APP / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")
big.resize((192, 192), Image.LANCZOS).save(APP / "public/icon.png")

# Android: 昔の形(四角・丸)と、アダプティブの前景(108dp のうち中央 66dp に収める)
dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for d, k in dens.items():
    n = int(48 * k)
    icon = art.icon(n * 4, GREEN, 40).resize((n, n), Image.LANCZOS)
    icon.save(RES / f"mipmap-{d}/ic_launcher.png")
    mask = Image.new("L", (n * 4, n * 4), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).ellipse((0, 0, n * 4 - 1, n * 4 - 1), fill=255)
    rnd = Image.new("RGBA", (n * 4, n * 4), (0, 0, 0, 0))
    rnd.paste(art.icon(n * 4, GREEN, 40), (0, 0), mask)
    rnd.resize((n, n), Image.LANCZOS).save(RES / f"mipmap-{d}/ic_launcher_round.png")
    # 前景: 透明の 78 マスの真ん中にびん(45 マス)。108dp のうち安全な 66dp にほぼ収まる
    fg_n = int(108 * k)
    jar = art.jar_image(art.S["jars"]["round"], [art.CANDY[["sora", "kinako", "momo", "wakaba", "mikan", "fuji"][(i // 4) % 6]] for i in range(40)])
    cell = Image.new("RGBA", (78, 78), (0, 0, 0, 0))
    cell.alpha_composite(jar, ((78 - 36) // 2, (78 - 45) // 2 + 1))
    cell.resize((78 * 6, 78 * 6), Image.NEAREST).resize((fg_n, fg_n), Image.LANCZOS).save(RES / f"mipmap-{d}/ic_launcher_foreground.png")
(RES / "values/ic_launcher_background.xml").write_text(
    f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{GREEN.upper()}</color>\n</resources>\n', encoding="utf-8")


def splash(w, h):
    """生成りの地に、空のびんとハムスターを小さく"""
    px = max(4, min(w, h) // 120)
    im = Image.new("RGB", (w, h), CREAM)
    jar = art.jar_image(art.S["jars"]["round"], [])
    ham = art.sprite(art.S["animals"]["hamster"])
    scene = Image.new("RGBA", (64, 46), (0, 0, 0, 0))
    scene.alpha_composite(jar, (64 - 36 - 2, 0))
    scene.alpha_composite(ham, (2, 45 - 18))
    scene = scene.resize((64 * px, 46 * px), Image.NEAREST)
    im.paste(scene, ((w - scene.width) // 2, (h - scene.height) // 2), scene)
    return im


for folder in RES.iterdir():
    if folder.name.startswith("drawable") and (folder / "splash.png").exists():
        w, h = Image.open(folder / "splash.png").size
        splash(w, h).save(folder / "splash.png")
for f in (APP / "ios/App/App/Assets.xcassets/Splash.imageset").glob("*.png"):
    splash(2732, 2732).save(f)
print("ok")
