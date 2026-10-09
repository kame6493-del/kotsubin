import { SPRITES, animalSize, drawGrain, drawJar, drawSprite, jarSize } from '../art/draw';
import type { AnimalId, JarId } from '../domain/types';

/** その日のびんを、X などに出しやすい縦長の画像にする(1080x1350) */
export async function makeShareCard(o: { animal: AnimalId; jar: JarId; colors: string[]; title: string; total: string; count: number }): Promise<string> {
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#f3ebdd';
  ctx.fillRect(0, 0, W, H);

  // 絵(1マス=12px)
  const px = 12;
  const j = jarSize(o.jar);
  const a = animalSize(o.animal);
  const sceneW = 88;
  const ox = (W - sceneW * px) / 2;
  const tableY = 860;
  ctx.fillStyle = '#c49a6c';
  ctx.fillRect(0, tableY, W, H - tableY);
  ctx.fillStyle = '#9c7550';
  ctx.fillRect(0, tableY + px, W, px);
  ctx.save();
  ctx.translate(ox, tableY);
  ctx.scale(px, px);
  drawJar(ctx, o.jar, o.colors, sceneW - j.w - 6, -j.h);
  const sp = SPRITES.animals[o.animal];
  drawSprite(ctx, sp, o.colors.length ? ['paws_hold'] : [], 8, -a.h);
  if (o.colors.length && sp.hold) drawGrain(ctx, o.colors[o.colors.length - 1], 8 + sp.hold[0], -a.h + sp.hold[1]);
  ctx.restore();

  const font = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
  ctx.fillStyle = '#2b2723';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 52px ${font}`;
  ctx.fillText(o.title, 88, 150);
  ctx.font = `700 120px ${font}`;
  ctx.fillText(o.total, 88, 290);
  ctx.fillStyle = '#6b6258';
  ctx.font = `500 44px ${font}`;
  ctx.fillText(`金平糖 ${o.count}粒`, 92, 360);

  ctx.fillStyle = '#fffcf6';
  ctx.font = `600 40px ${font}`;
  ctx.textAlign = 'right';
  ctx.fillText('こつびん', W - 72, H - 72);
  return cv.toDataURL('image/png');
}
