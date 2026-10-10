"""アプリの書体(Zen Maru Gothic, SIL OFL)を、よく使う字だけに絞って woff2 にする。python scripts/make_font.py
元: scripts/fonts/ZenMaruGothic-*.ttf(google/fonts の ofl/zenmarugothic)。絞る字: ASCII・かな・記号・JIS第1水準の漢字・アプリ内の文字。
入っていない字(第2水準の漢字など)は端末の書体で出る。"""
import re
from pathlib import Path
from fontTools import subset

APP = Path(__file__).resolve().parent.parent
chars = set(chr(c) for c in range(0x20, 0x7F))
chars |= set(chr(c) for c in range(0x3000, 0x30FF + 1))  # 記号・かな
chars |= set(chr(c) for c in range(0xFF01, 0xFF5F))  # 全角英数
chars |= set("・〜～…‥―ー々〆〇℃％￥×÷±←→↑↓○●◎◇◆□■△▲▽▼☆★♪")
for hi in range(0x88, 0x99):  # JIS 第1水準
    for lo in list(range(0x40, 0x7F)) + list(range(0x80, 0xFD)):
        try:
            chars.add(bytes([hi, lo]).decode("shift_jis"))
        except UnicodeDecodeError:
            pass
for f in list((APP / "src").rglob("*.ts*")):
    chars |= set(f.read_text(encoding="utf-8"))
text = "".join(sorted(c for c in chars if c.isprintable()))
out = APP / "public/fonts"
out.mkdir(parents=True, exist_ok=True)
for w, name in [(500, "Medium"), (700, "Bold")]:
    opt = subset.Options()
    opt.flavor = "woff2"
    opt.layout_features = ["*"]
    opt.name_IDs = ["*"]
    f = subset.load_font(str(APP / f"scripts/fonts/ZenMaruGothic-{name}.ttf"), opt)
    s = subset.Subsetter(opt)
    s.populate(text=text)
    s.subset(f)
    subset.save_font(f, str(out / f"zmg-{w}.woff2"), opt)
    print(w, (out / f"zmg-{w}.woff2").stat().st_size)
(out / "OFL.txt").write_text((APP / "scripts/fonts/OFL.txt").read_text(encoding="utf-8"), encoding="utf-8")
