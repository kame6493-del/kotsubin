import type { ReactNode } from 'react';
import type { AnimalId, CandyColor, JarId } from '../domain/types';
import { ANIMAL_ART, LAYOUT, art, jarSize, spriteSize, tierFor } from './assets';
import { JarArt } from './Jar';
import { At, Img, Plate } from './Plate';

export type SceneMode = 'idle' | 'focus' | 'pause' | 'rest' | 'restOver';

/**
 * きょうの場面(見本1・見本5)。台紙は作業中=見本1(こんぺいとうを磨くハムスター)、休憩中=見本5(眠るハムスター)。
 * 待機・一時停止・起きた直後は、見本3の「よろこぶ」ハムスターを重ねる。ほかの相棒は、その子を重ねる。
 * びんと札は台紙の上に重ね、中の粒の数だけ描く。
 */
export function Scene({
  mode, animal, jar, colors, drop, tagTop, tagCount, tagBottom, children, maxCss, label,
}: {
  mode: SceneMode;
  animal: AnimalId;
  jar: JarId;
  colors: CandyColor[];
  drop?: boolean;
  tagTop: string;
  tagCount: number;
  tagBottom?: string;
  children?: ReactNode;
  maxCss?: number;
  label: string;
}) {
  const st = LAYOUT.stage;
  const plate = mode === 'rest' ? 'plate_rest' : 'plate_focus';
  const bakedHam = animal === 'hamster' && (mode === 'focus' || mode === 'rest');
  const awake = mode !== 'rest';
  // びん。有料のびんは、スタンダードの底(y=657)と中ほどにそろえて大きく置く
  const std = jarSize('std');
  let jarEl: ReactNode;
  if (jar === 'std') {
    jarEl = (
      <>
        <JarArt jar="std" colors={colors} drop={drop} x={st.jar.x} y={st.jar.y} />
        <Img name="bow_std" x={st.jar.x} y={st.jar.y} w={std.w} h={std.h} />
      </>
    );
  } else {
    const k = 1.62;
    const { w, h } = jarSize(jar);
    jarEl = <JarArt jar={jar} colors={colors} drop={drop} x={259 - (w * k) / 2} y={657 - h * k} k={k} />;
  }
  const over = Math.max(0, colors.length - tierFor(jar, colors.length).slots.length);

  let ham: ReactNode = null;
  if (animal === 'hamster' && !bakedHam) {
    const s = spriteSize('ham_yorokobu');
    const k = st.ham.k;
    ham = <Img name="ham_yorokobu" x={st.ham.x} y={st.ham.bottom - s.h * k} w={s.w} h={s.h} k={k} className={mode === 'restOver' ? 'hop' : 'breathe'} />;
  } else if (animal !== 'hamster') {
    const a = ANIMAL_ART[animal];
    const s = spriteSize(a.name);
    // 見本1のハムスター(x 454〜714)を覆うように、中心を 584 にそろえる
    ham = <Img name={a.name} x={584 - (s.w * a.k) / 2} y={st.ham.bottom - s.h * a.k} w={s.w} h={s.h} k={a.k} className={awake ? 'breathe' : 'sleep'} />;
  }

  return (
    <Plate name={plate} cropTop={14} cropBottom={30} maxCss={maxCss} className="scene" label={label}>
      {jarEl}
      <Img name="tag_std" x={st.tag.x} y={st.tag.y} w={162} h={205} />
      <At x={st.tag.x + 22} y={st.tag.y + 72} w={128} className="tag-text" style={{ transform: 'rotate(3.6deg)' }}>
        <span className="tag-l">{tagTop}</span>
        <span className="tag-n num">{tagCount}<small>粒</small></span>
        {tagBottom && <span className="tag-b num">{tagBottom}</span>}
        {over > 0 && <span className="tag-b">ほか{over}粒</span>}
      </At>
      {ham}
      {mode === 'focus' && (
        <At x={440} y={490} w={70} h={110} className="twinkle" style={{ pointerEvents: 'none' }}>
          <i style={{ left: 30, top: 0 }} /><i style={{ left: 6, top: 40 }} /><i style={{ left: 34, top: 76 }} />
        </At>
      )}
      {mode === 'rest' && animal !== 'hamster' && (
        <At x={650} y={430} w={80} h={90} className="zzz"><b>z</b><b>z</b><b>z</b></At>
      )}
      {children}
    </Plate>
  );
}

/** 台紙の右上の3つのボタン(見本1の位置。焼き込みのボタンの上にかぶせる) */
export function HeadButtons({ items }: { items: { label: string; icon: ReactNode; onClick: () => void; on?: boolean }[] }) {
  const xs = [452, 549, 646];
  return (
    <>
      {items.map((it, i) => (
        <At key={it.label} x={xs[i]} y={28} w={82} h={82} z={5}>
          <button className={'head-btn' + (it.on ? ' on' : '')} onClick={it.onClick} aria-label={it.label} aria-current={it.on ? 'page' : undefined}>
            <span className="head-btn-face">{it.icon}</span>
          </button>
        </At>
      ))}
    </>
  );
}

export { art };
