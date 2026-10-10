import type { CSSProperties } from 'react';
import type { CandyColor, JarId } from '../domain/types';
import { LAYOUT, art, candyImg, jarSize, tierFor } from './assets';

/**
 * びんと、中のこんぺいとう。びんの絵の画素で描く(親が拡大・縮小する)。
 * 粒は下から積む。数が増えると小さい粒の段に切り替えて詰める。入りきらない分は数えるだけ(札に出る)。
 * drop=true なら、いちばん新しい粒が上から落ちてきて、入ったらきらっと光る(見本 ⑯)。
 */
export function JarArt({ jar, colors, drop = false, x = 0, y = 0, k = 1 }: { jar: JarId; colors: CandyColor[]; drop?: boolean; x?: number; y?: number; k?: number }) {
  const { w, h } = jarSize(jar);
  const tier = tierFor(jar, colors.length);
  const shown = Math.min(colors.length, tier.slots.length);
  const size = tier.d * 1.3;
  const style: CSSProperties = { left: x, top: y, width: w, height: h, transform: k !== 1 ? `scale(${k})` : undefined, transformOrigin: '0 0' };
  return (
    <div className="at jar-art" style={style} aria-hidden>
      <img className="at art" src={art(`jar_${jar}`)} alt="" draggable={false} style={{ left: 0, top: 0, width: w, height: h }} />
      <div className="at jar-candies" style={{ left: 0, top: 0, width: w, height: h }}>
        {tier.slots.slice(0, shown).map(([cx, cy, r], i) => {
          const last = drop && i === shown - 1;
          return (
            <img
              key={i}
              className={'at art candy' + (last ? ' candy-drop' : '')}
              src={candyImg(colors[i])}
              alt=""
              draggable={false}
              style={{ left: cx - size / 2, top: cy - size / 2, width: size, height: size, transform: `rotate(${r}deg)`, ['--fall' as string]: `${-cy - 60}px` }}
            />
          );
        })}
        {drop && shown > 0 && (
          <span className="at sparkle-burst" style={{ left: tier.slots[shown - 1][0] - 60, top: tier.slots[shown - 1][1] - 60, width: 120, height: 120 }}>
            <i /><i /><i /><i /><i />
          </span>
        )}
      </div>
      {jar === 'maru' && <img className="at art" src={art('jar_maru_front')} alt="" draggable={false} style={{ left: 0, top: 0, width: w, height: h }} />}
      {/* ガラスの手前のつや(粒の上にかかる白い筋) */}
      <span className="jar-shine" style={{ left: w * 0.2, top: h * 0.3, height: h * 0.55 }} />
      <span className="jar-shine jar-shine-2" style={{ left: w * 0.74, top: h * 0.36, height: h * 0.4 }} />
    </div>
  );
}

/** 棚の升の小さなびん(見本2)。粒は下に9つまで、その日の割合で色を分ける */
export function CellJar({ colors, dim = false, width, bare = false }: { colors: CandyColor[]; dim?: boolean; width?: number; bare?: boolean }) {
  const W = 75, H = 112;
  const slots: [number, number][] = [
    [19, 92], [37, 93], [55, 92], [28, 82], [46, 82], [14, 76], [60, 77], [37, 71], [22, 64],
  ];
  const pick = sample(colors, slots.length);
  return (
    <span className={'cell-jar' + (dim ? ' dim' : '')} style={{ width: width ?? W, aspectRatio: `${W} / ${H}` }} aria-hidden>
      {/* bare: びんは棚の絵に描いてあるので粒だけ */}
      {!bare && <img className="art" src={art('cell_jar')} alt="" draggable={false} />}
      {pick.map((c, i) => (
        <img key={i} className="art cell-candy" src={candyImg(c)} alt="" draggable={false}
          style={{ left: `${((slots[i][0] - 12) / W) * 100}%`, top: `${((slots[i][1] - 12) / H) * 100}%`, width: `${(24 / W) * 100}%` }} />
      ))}
    </span>
  );
}

/** n 粒の中から、色の割合を保って k 粒を選ぶ(多い色から) */
export function sample(colors: CandyColor[], k: number): CandyColor[] {
  if (colors.length <= k) return colors;
  const count = new Map<CandyColor, number>();
  for (const c of colors) count.set(c, (count.get(c) ?? 0) + 1);
  const entries = [...count.entries()].sort((a, b) => b[1] - a[1]);
  const out: CandyColor[] = [];
  const quota = entries.map(([c, n]) => ({ c, q: (n / colors.length) * k }));
  for (const e of quota) for (let i = 0; i < Math.floor(e.q); i++) out.push(e.c);
  quota.sort((a, b) => (b.q % 1) - (a.q % 1));
  for (const e of quota) if (out.length < k) out.push(e.c);
  // 混ぜる(同じ色が固まらないように)
  return out.map((c, i) => ({ c, o: (i * 7) % out.length })).sort((a, b) => a.o - b.o).map((x) => x.c);
}

/** こんぺいとう1粒(作業の種類の色の印) */
export function Candy({ color, size = 22, className }: { color: CandyColor; size?: number; className?: string }) {
  return <img className={'art candy-dot' + (className ? ' ' + className : '')} src={candyImg(color)} alt="" width={size} height={size} draggable={false} aria-hidden />;
}

export { LAYOUT };
