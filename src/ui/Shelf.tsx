import { useMemo, useState } from 'react';
import { CONFIG } from '../config';
import { Grain, JarMini } from '../art/Mini';
import { CANDY } from '../domain/colors';
import { goalOf, sessionsWithRunning } from '../domain/data';
import { grainsOfDay } from '../domain/grains';
import { MIN, dayKey, dayRange, daysOfMonth, fmtHM, overlap, parseKey, totalAll, totalBetween, totalOfDay, weekOf, weekdayName, weekdayOf } from '../domain/time';
import type { Ctx } from './App';
import { IconBack, IconNext } from './icons';

export function Shelf({ ctx }: { ctx: Ctx }) {
  const { d, now } = ctx;
  const st = d.settings;
  const today = dayKey(now, st.dayStartHour);
  const t = parseKey(today);
  const [ym, setYm] = useState({ y: t.y, m: t.m });
  const all = useMemo(() => sessionsWithRunning(d, now), [d, now]);
  const days = daysOfMonth(ym.y, ym.m);
  const lead = weekdayOf(days[0]);
  const isThisMonth = ym.y === t.y && ym.m === t.m;
  const firstKey = all.length ? dayKey(all[0].start, st.dayStartHour) : today;

  const shift = (n: number) => setYm(({ y, m }) => {
    const mm = m + n;
    return mm < 1 ? { y: y - 1, m: 12 } : mm > 12 ? { y: y + 1, m: 1 } : { y, m: mm };
  });

  const [wk0, wk1] = weekOf(today);
  const monthMs = totalBetween(all, days[0], days[days.length - 1], st.dayStartHour);
  const weekMs = totalBetween(all, wk0, wk1, st.dayStartHour);
  const allMs = totalAll(all);

  // この月の種類ごとの合計
  const [ma] = dayRange(days[0], st.dayStartHour);
  const [, mb] = dayRange(days[days.length - 1], st.dayStartHour);
  const byCat = d.categories
    .map((c) => ({ c, ms: all.filter((s) => s.cat === c.id).reduce((x, s) => x + overlap(s, ma, mb), 0) }))
    .filter((x) => x.ms > 0)
    .sort((a, b) => b.ms - a.ms);

  return (
    <div className="screen shelf">
      <header className="top">
        <h1 className="top-title">たな</h1>
      </header>

      <div className="month-bar">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="前の月"><IconBack /></button>
        <div className="month-name num">{ym.y}年{ym.m}月</div>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="次の月" disabled={isThisMonth}><IconNext /></button>
      </div>

      <div className="cal" role="grid" aria-label={`${ym.m}月のびん`}>
        {Array.from({ length: 7 }, (_, i) => <div key={'h' + i} className={'cal-wd' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '')}>{weekdayName(i)}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={'e' + i} />)}
        {days.map((k) => {
          const future = k > today;
          const ms = future ? 0 : totalOfDay(all, k, st.dayStartHour);
          const grains = future || ms === 0 ? [] : grainsOfDay(all, d.categories, k, st.dayStartHour, CONFIG.grainMinutes).map((c) => CANDY[c].hex);
          const goal = goalOf(d, weekdayOf(k)) * MIN;
          const met = goal > 0 && ms >= goal;
          const day = parseKey(k).d;
          return (
            <button
              key={k}
              className={'cal-day' + (k === today ? ' today' : '')}
              disabled={future}
              onClick={() => ctx.go({ tab: 'shelf', day: k })}
              aria-label={`${ym.m}月${day}日 ${fmtHM(ms)}${met ? ' 目標とどいた' : ''}`}
            >
              <JarMini jar={st.jar} colors={grains} dim={future || (ms === 0 && k < firstKey)} />
              <span className="cal-num num">{day}</span>
              <span className={'cal-mark' + (met ? ' on' : '')} aria-hidden />
            </button>
          );
        })}
      </div>

      {allMs === 0 ? (
        <p className="empty">まだびんは空っぽ。きょうの画面で「はじめる」を押すと、ここに1日1びん並んでいきます。</p>
      ) : (
        <>
          <dl className="sums">
            <div className="sum-row"><dt>この週</dt><dd className="num">{fmtHM(weekMs)}</dd></div>
            <div className="sum-row"><dt>{ym.m}月</dt><dd className="num">{fmtHM(monthMs)}</dd></div>
            <div className="sum-row"><dt>これまで全部</dt><dd className="num">{fmtHM(allMs)}</dd></div>
          </dl>

          {byCat.length > 0 && (
            <section className="mix" aria-label={`${ym.m}月の中身`}>
              <h2 className="sec-title">{ym.m}月の中身</h2>
              <div className="mix-bar" aria-hidden>
                {byCat.map(({ c, ms }) => <span key={c.id} style={{ flexGrow: ms, background: CANDY[c.color].hex }} />)}
              </div>
              <ul className="mix-list">
                {byCat.map(({ c, ms }) => (
                  <li key={c.id}>
                    <Grain color={CANDY[c.color].hex} scale={3} />
                    <span className="mix-name">{c.name}{c.archived ? '(しまった種類)' : ''}</span>
                    <span className="mix-ms num">{fmtHM(ms)}</span>
                    <span className="mix-pct num">{Math.round((ms / monthMs) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
