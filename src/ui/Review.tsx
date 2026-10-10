import { useMemo, useState } from 'react';
import { art } from '../art/assets';
import { Candy, CellJar } from '../art/Jar';
import { Plate } from '../art/Plate';
import { HeadButtons } from '../art/Scene';
import { CONFIG } from '../config';
import { CANDY } from '../domain/colors';
import * as D from '../domain/data';
import { grainsOfDay, longestStreak } from '../domain/grains';
import { weekComment } from '../domain/lines';
import { MIN, addDays, dayKey, dayRange, daysOfMonth, fmtShort, overlap, parseKey, totalAll, totalBetween, totalOfDay, weekOfMon, weekdayOf } from '../domain/time';
import type { Ctx } from './App';
import { CatGlyph, IconBack, IconCalendar, IconChart, IconClock, IconClover, IconCrown, IconFlame, IconGear, IconNext, IconSprout } from './icons';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

/** ふりかえり(見本6): 週のサマリー・作業の内訳・1週間の記録・やさしいコメント */
export function Review({ ctx }: { ctx: Ctx }) {
  const { d, now } = ctx;
  const st = d.settings;
  const today = dayKey(now, st.dayStartHour);
  const [shift, setShift] = useState(0);
  const [by, setBy] = useState<'time' | 'grain'>('time');
  const all = useMemo(() => D.sessionsWithRunning(d, now), [d, now]);
  const [w0, w1] = weekOfMon(addDays(today, shift * 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(w0, i));
  const per = days.map((k) => {
    const future = k > today;
    const ms = future ? 0 : totalOfDay(all, k, st.dayStartHour);
    return { k, ms, g: ms ? grainsOfDay(all, d.categories, k, st.dayStartHour, CONFIG.grainMinutes) : [], future };
  });
  const weekMs = per.reduce((s, x) => s + x.ms, 0);
  const weekG = per.reduce((s, x) => s + x.g.length, 0);
  const pastDays = per.filter((x) => !x.future).length || 1;
  const activeDays = per.filter((x) => x.ms > 0).length;
  const prevMs = totalBetween(all, addDays(w0, -7), addDays(w0, -1), st.dayStartHour);

  // つづいた日数(これまで)
  const keys = new Set<string>();
  for (const s of all) for (let k = dayKey(s.start, st.dayStartHour); k <= dayKey(s.end - 1, st.dayStartHour); k = addDays(k, 1)) keys.add(k);
  const streak = longestStreak(keys, addDays);

  // 種類ごと(この週)
  const [a] = dayRange(w0, st.dayStartHour);
  const [, b] = dayRange(w1, st.dayStartHour);
  const rows = d.categories
    .map((c) => {
      const ms = all.filter((s) => s.cat === c.id).reduce((x, s) => x + overlap(s, a, b), 0);
      const g = per.reduce((x, p) => x + p.g.filter((col) => col === c.color).length, 0);
      return { c, ms, g };
    })
    .filter((x) => x.ms > 0)
    .sort((x, y) => y.ms - x.ms);
  const total = by === 'time' ? weekMs : weekG;
  const val = (x: { ms: number; g: number }) => (by === 'time' ? x.ms : x.g);

  // これまで
  const t = parseKey(today);
  const md = daysOfMonth(t.y, t.m);
  const monthMs = totalBetween(all, md[0], md[md.length - 1], st.dayStartHour);
  const [head, body] = weekComment(weekMs, prevMs, activeDays);
  const label = shift === 0 ? '今週' : shift === -1 ? '先週' : `${parseKey(w0).m}/${parseKey(w0).d}〜の週`;

  return (
    <div className="screen review">
      <Plate name="plate_review" label="ふりかえりの看板と、こんぺいとうを持つハムスター">
        <HeadButtons items={[
          { label: 'たな(カレンダー)', icon: <IconCalendar size={36} />, onClick: () => ctx.go({ tab: 'shelf' }) },
          { label: 'ふりかえり', icon: <IconChart size={36} />, onClick: () => {}, on: true },
          { label: 'セット', icon: <IconGear size={36} />, onClick: () => ctx.go({ tab: 'set' }) },
        ]} />
      </Plate>

      <div className="stack">
        <div className="week-nav">
          <button className="sq-btn" onClick={() => setShift((s) => s - 1)} aria-label="前の週"><IconBack size={22} /></button>
          <span className="num">{parseKey(w0).m}/{parseKey(w0).d} 〜 {parseKey(w1).m}/{parseKey(w1).d}</span>
          <button className="sq-btn" onClick={() => setShift((s) => Math.min(0, s + 1))} disabled={shift >= 0} aria-label="次の週"><IconNext size={22} /></button>
        </div>

        <section className="card" aria-label={`${label}のサマリー`}>
          <h2 className="card-title"><IconClover size={24} className="ic-green" />{label}のサマリー</h2>
          <div className="sum3">
            <div className="sum-tile blue">
              <div className="st-cap"><IconClock size={30} className="ic-blue" /><span>{label}の<br />集中時間</span></div>
              <div className="st-num num">{fmtShort(weekMs)}</div>
              <div className="st-sub num">(1日平均 {fmtShort(weekMs / pastDays)})</div>
            </div>
            <div className="sum-tile yellow">
              <div className="st-cap"><Candy color="kinako" size={32} /><span>集めた<br />こんぺいとう</span></div>
              <div className="st-num num">{weekG}<small>粒</small></div>
              <div className="st-sub num">(1日平均 {Math.round(weekG / pastDays)}粒)</div>
            </div>
            <div className="sum-tile orange">
              <div className="st-cap"><IconFlame size={30} className="ic-orange" /><span>最長<br />つづいた日数</span></div>
              <div className="st-num num">{streak}<small>日</small>{streak >= 3 && <IconCrown size={26} className="ic-gold" />}</div>
              <div className="st-sub">{streak >= 3 ? 'いい調子！' : 'ゆっくりいこう'}</div>
            </div>
          </div>
        </section>

        <section className="card" aria-label="作業の内訳">
          <div className="card-head">
            <h2 className="card-title"><IconChart size={24} className="ic-blue" />作業の内訳</h2>
            <div className="toggle" role="radiogroup" aria-label="内訳の数え方">
              <button role="radio" aria-checked={by === 'time'} className={by === 'time' ? 'on' : ''} onClick={() => setBy('time')}>時間</button>
              <button role="radio" aria-checked={by === 'grain'} className={by === 'grain' ? 'on' : ''} onClick={() => setBy('grain')}>こんぺいとう</button>
            </div>
          </div>
          {rows.length === 0 ? <p className="empty">この週の記録はまだありません。</p> : (
            <div className="breakdown">
              <Donut parts={rows.map((x) => ({ v: val(x), color: CANDY[x.c.color].hex }))} center={by === 'time' ? fmtShort(weekMs) : `${weekG}粒`} />
              <ul className="bd-list">
                {rows.map((x) => (
                  <li key={x.c.id} style={{ ['--c' as string]: CANDY[x.c.color].ink }}>
                    <i className="bd-dot" style={{ background: CANDY[x.c.color].hex }} />
                    <CatGlyph icon={x.c.icon} size={22} />
                    <span className="bd-name">{x.c.name}</span>
                    <span className="bd-val num">{by === 'time' ? fmtShort(x.ms) : `${x.g}粒`}</span>
                    <span className="bd-pct num">({total ? Math.round((val(x) / total) * 100) : 0}%)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="card" aria-label="1週間の記録">
          <h2 className="card-title"><IconCalendar size={24} className="ic-brown" />1週間の記録</h2>
          <div className="week-jars">
            {per.map((x) => {
              const wd = weekdayOf(x.k);
              return (
                <button key={x.k} className={'wj' + (wd === 0 ? ' sun' : wd === 6 ? ' sat' : '') + (x.k === today ? ' today' : '')} disabled={x.future} onClick={() => ctx.go({ tab: 'shelf', view: 'day', day: x.k })} aria-label={`${parseKey(x.k).m}月${parseKey(x.k).d}日 ${fmtShort(x.ms)}`}>
                  <span className="wj-wd">{WD[wd]}</span>
                  <span className="wj-date num">{parseKey(x.k).m}/{parseKey(x.k).d}</span>
                  <CellJar colors={x.g} dim={x.future} />
                  <span className="wj-ms num">{x.future ? '' : fmtShort(x.ms)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card" aria-label="これまでの合計">
          <h2 className="card-title"><IconSprout size={24} className="ic-green" />これまでの合計</h2>
          <dl className="sums">
            <div><dt>{t.m}月</dt><dd className="num">{fmtShort(monthMs)}</dd></div>
            <div><dt>これまで全部</dt><dd className="num">{fmtShort(totalAll(all))}</dd></div>
            <div><dt>きょうの目標</dt><dd className="num">{D.goalOf(d, weekdayOf(today)) ? fmtShort(D.goalOf(d, weekdayOf(today)) * MIN) : 'なし'}</dd></div>
          </dl>
        </section>

        <section className="card comment-card" aria-label="やさしいコメント">
          <h2 className="card-title"><IconSprout size={24} className="ic-green" />やさしいコメント</h2>
          <div className="cm-body">
            <img className="art cm-ham" src={art('mini_comment')} alt="" />
            <div className="cm-bubble">
              <p className="cm-head">{head}</p>
              <p className="cm-text">{body}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Donut({ parts, center }: { parts: { v: number; color: string }[]; center: string }) {
  const sum = parts.reduce((s, p) => s + p.v, 0) || 1;
  const R = 42, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--sunk)" strokeWidth="22" />
        {parts.map((p, i) => {
          const len = (p.v / sum) * C;
          const el = <circle key={i} cx="60" cy="60" r={R} fill="none" stroke={p.color} strokeWidth="22" strokeDasharray={`${Math.max(0, len - 1.2)} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 60 60)" />;
          acc += len;
          return el;
        })}
      </svg>
      <div className="donut-in"><span>合計</span><b className="num">{center}</b></div>
    </div>
  );
}
