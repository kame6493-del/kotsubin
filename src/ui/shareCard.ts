import { ANIMAL_ART, LAYOUT, art, candyImg, jarSize, spriteSize, tierFor } from '../art/assets';
import type { AnimalId, CandyColor, JarId } from '../domain/types';

const load = (src: string) => new Promise<HTMLImageElement>((ok, ng) => {
  const im = new Image();
  im.onload = () => ok(im);
  im.onerror = () => ng(new Error('image ' + src));
  im.src = src;
});

/** その日のびんを、X などに出しやすい縦長の画像にする(1080x1350)。絵は見本の場面(見本1)をそのまま使う */
export async function makeShareCard(o: { animal: AnimalId; jar: JarId; colors: CandyColor[]; title: string; total: string; count: number }): Promise<string> {
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#f5ecdd';
  ctx.fillRect(0, 0, W, H);
  try { await document.fonts.load('700 40px ZenMaru'); } catch { /* 端末の書体で */ }
  const font = '"ZenMaru", "Hiragino Maru Gothic ProN", "Noto Sans JP", sans-serif';

  // 場面(台紙 758x690 を 1080 幅に)
  const k = W / 758;
  const ox = 0, oy = 380;
  const plate = await load(art('plate_focus'));
  ctx.drawImage(plate, ox, oy, 758 * k, 690 * k);
  // 右上のボタン(焼き込み)は、壁の色の札でかくす
  ctx.fillStyle = '#f2e7d6';
  const st = LAYOUT.stage;
  const put = async (src: string, x: number, y: number, w: number, h: number, rot = 0) => {
    const im = await load(src);
    ctx.save();
    ctx.translate(ox + (x + w / 2) * k, oy + (y + h / 2) * k);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(im, (-w / 2) * k, (-h / 2) * k, w * k, h * k);
    ctx.restore();
  };
  // びんと粒
  const jw = jarSize(o.jar);
  const jk = o.jar === 'std' ? 1 : 1.62;
  const jx = o.jar === 'std' ? st.jar.x : 259 - (jw.w * jk) / 2;
  const jy = o.jar === 'std' ? st.jar.y : 657 - jw.h * jk;
  await put(art(`jar_${o.jar}`), jx, jy, jw.w * jk, jw.h * jk);
  const tier = tierFor(o.jar, o.colors.length);
  const size = tier.d * 1.3 * jk;
  for (let i = 0; i < Math.min(o.colors.length, tier.slots.length); i++) {
    const [cx, cy, r] = tier.slots[i];
    await put(candyImg(o.colors[i]), jx + cx * jk - size / 2, jy + cy * jk - size / 2, size, size, r);
  }
  if (o.jar === 'maru') await put(art('jar_maru_front'), jx, jy, jw.w * jk, jw.h * jk);
  if (o.jar === 'std') await put(art('bow_std'), jx, jy, jw.w, jw.h);
  await put(art('tag_std'), st.tag.x, st.tag.y, 162, 205);
  // 相棒
  if (o.animal === 'hamster') {
    const s = spriteSize('ham_yorokobu');
    await put(art('ham_yorokobu'), st.ham.x, st.ham.bottom - s.h * st.ham.k, s.w * st.ham.k, s.h * st.ham.k);
  } else {
    const a = ANIMAL_ART[o.animal];
    const s = spriteSize(a.name);
    await put(art(a.name), 584 - (s.w * a.k) / 2, st.ham.bottom - s.h * a.k, s.w * a.k, s.h * a.k);
  }
  // 札の字
  ctx.save();
  ctx.translate(ox + (st.tag.x + 86) * k, oy + (st.tag.y + 120) * k);
  ctx.rotate((3.6 * Math.PI) / 180);
  ctx.fillStyle = '#4b3627';
  ctx.textAlign = 'center';
  ctx.font = `700 ${22 * k}px ${font}`;
  ctx.fillText('この日の', 0, -18 * k);
  ctx.fillText('こつぶ', 0, 10 * k);
  ctx.font = `700 ${44 * k}px ${font}`;
  ctx.fillText(`${o.count}粒`, 0, 58 * k);
  ctx.restore();
  // 右上のボタンが焼き込みなので、上は生成りでおおう
  ctx.fillStyle = '#f5ecdd';
  ctx.fillRect(0, oy, W, 120 * k);

  // 文字
  ctx.fillStyle = '#4b3627';
  ctx.textAlign = 'left';
  ctx.font = `700 52px ${font}`;
  ctx.fillText(o.title, 80, 140);
  ctx.font = `700 120px ${font}`;
  ctx.fillText(o.total, 80, 280);
  ctx.fillStyle = '#7b6452';
  ctx.font = `700 44px ${font}`;
  ctx.fillText(`こんぺいとう ${o.count}粒`, 84, 350);
  const logo = await load(art('logo'));
  const lw = 300, lh = (logo.height / logo.width) * lw;
  ctx.drawImage(logo, W - lw - 60, H - lh - 60, lw, lh);
  return cv.toDataURL('image/png');
}
