import { useMemo, useState } from 'react';
import { CONFIG } from '../config';
import { Grain, JarMini } from '../art/Mini';
import { CANDY } from '../domain/colors';
import * as D from '../domain/data';
import { grainsOfDay } from '../domain/grains';
import { HOUR, MIN, dayKey, dayRange, fmtHM, fmtTime, labelOfDay, piecesOfDay, totalOfDay, weekdayOf } from '../domain/time';
import type { Session } from '../domain/types';
import { shareImage } from '../platform/native';
import type { Ctx } from './App';
import { IconBack, IconPlus, IconShare } from './icons';
import { makeShareCard } from './shareCard';
import { SessionSheet } from './sheets';

export function Day({ ctx, dayKey: key }: { ctx: Ctx; dayKey: string }) {
  const { d, now } = ctx;
  const st = d.settings;
  const all = useMemo(() => D.sessionsWithRunning(d, now), [d, now]);
  const pieces = piecesOfDay(all, key, st.dayStartHour);
  const ms = totalOfDay(all, key, st.dayStartHour);
  const grains = grainsOfDay(all, d.categories, key, st.dayStartHour, CONFIG.grainMinutes).map((c) => CANDY[c].hex);
  const goal = D.goalOf(d, weekdayOf(key)) * MIN;
  const [edit, setEdit] = useState<null | { s?: Session }>(null);
  const [a] = dayRange(key, st.dayStartHour);
  const catOf = (id: string) => d.categories.find((c) => c.id === id);

  const share = async () => {
    try {
      const url = await makeShareCard({ animal: st.animal, jar: st.jar, colors: grains, title: labelOfDay(key), total: fmtHM(ms), count: grains.length });
      await shareImage(url, `kotsubin-${key}.png`, `${labelOfDay(key)}のびん`);
    } catch (e) {
      if (!String(e).includes('cancel')) ctx.toast('画像を作れませんでした');
    }
  };

  return (
    <div className="screen day">
      <header className="top top-back">
        <button className="back" onClick={() => ctx.go({ tab: 'shelf' })}><IconBack /><span>たな</span></button>
        <h1 className="top-title">{labelOfDay(key)}</h1>
      </header>

      <section className="day-head">
        <JarMini jar={st.jar} colors={grains} scale={3} />
        <div className="day-facts">
          <div className="readout-label">この日の合計</div>
          <div className="day-total num">{fmtHM(ms)}</div>
          <div className="readout-sub num">{grains.length}粒{goal > 0 ? (ms >= goal ? '・目標にとどいた日' : `・目標 ${fmtHM(goal)}`) : ''}</div>
          {grains.length > 0 && <button className="btn btn-quiet btn-small" onClick={share}><IconShare size={20} />画像で残す</button>}
        </div>
      </section>

      <h2 className="sec-title">記録</h2>
      {pieces.length === 0 ? (
        <p className="empty">この日の記録はありません。押し忘れた分は、下の「記録を足す」から入れられます。</p>
      ) : (
        <ul className="rows">
          {pieces.map((p) => {
            const c = catOf(p.session.cat);
            const isRun = p.session.id === 'running';
            const fromPrev = p.session.start < a;
            const toNext = p.session.end > a + 24 * HOUR;
            return (
              <li key={p.session.id}>
                <button className="row" disabled={isRun} onClick={() => setEdit({ s: p.session })}>
                  <Grain color={CANDY[c?.color ?? 'shiro'].hex} scale={3} />
                  <span className="row-main">
                    <span className="row-title">{c?.name ?? '作業'}{isRun ? '(いま)' : ''}</span>
                    <span className="row-sub num">
                      {fromPrev ? '前の日 ' : ''}{fmtTime(p.session.start)}〜{toNext ? '次の日 ' : ''}{fmtTime(p.session.end)}
                    </span>
                  </span>
                  <span className="row-val num">{fmtHM(p.to - p.from)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="hint">記録を押すと、時刻を分単位で直したり消したりできます。</p>

      <div className="dock">
        <button className="btn btn-primary btn-big" onClick={() => setEdit({})}><IconPlus size={20} />記録を足す</button>
      </div>

      {edit && (
        <SessionSheet
          ctx={ctx}
          initial={edit.s}
          defaultStart={dayKey(now, st.dayStartHour) === key ? Math.max(a, now - HOUR) : a + 9 * HOUR}
          dayKey={key}
          onClose={() => setEdit(null)}
        />
      )}
    </div>
  );
}
