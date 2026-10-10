import { useMemo, useState } from 'react';
import { LAYOUT, art } from '../art/assets';
import { Candy, CellJar } from '../art/Jar';
import { At, Img, Plate, Stage } from '../art/Plate';
import { CONFIG } from '../config';
import { CANDY } from '../domain/colors';
import * as D from '../domain/data';
import { grainsBySession, grainsOfDay } from '../domain/grains';
import { dayLine } from '../domain/lines';
import { HOUR, MIN, addDays, dayKey, dayRange, daysOfMonth, fmtClock, fmtHM, fmtTime2, parseKey, piecesOfDay, totalOfDay, weekdayOf } from '../domain/time';
import type { Session } from '../domain/types';
import type { Ctx } from './App';
import { CatGlyph, IconBack, IconCalendar, IconClock, IconNext, IconPlus, IconTrash } from './icons';
import { SessionSheet } from './sheets';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

/** たな(見本2): 月のカレンダーが、びんの並んだ棚。下に選んだ日の記録 */
export function Shelf({ ctx }: { ctx: Ctx }) {
  const { d, now } = ctx;
  const st = d.settings;
  const today = dayKey(now, st.dayStartHour);
  const [sel, setSel] = useState(ctx.route.day ?? today);
  const t = parseKey(sel);
  const [ym, setYm] = useState({ y: t.y, m: t.m });
  const all = useMemo(() => D.sessionsWithRunning(d, now), [d, now]);
  const days = daysOfMonth(ym.y, ym.m);
  const lead = (weekdayOf(days[0]) + 6) % 7; // 月曜はじまり
  const rows = Math.ceil((lead + days.length) / 7);
  const grid = Array.from({ length: rows * 7 }, (_, i) => addDays(days[0], i - lead));
  const tk = parseKey(today);
  const isThisMonth = ym.y === tk.y && ym.m === tk.m;

  const shift = (n: number) => setYm(({ y, m }) => {
    const mm = m + n;
    return mm < 1 ? { y: y - 1, m: 12 } : mm > 12 ? { y: y + 1, m: 1 } : { y, m: mm };
  });

  const cab = LAYOUT.cabinet;
  const cabH = cab.head + rows * cab.row + cab.bottom;
  const legend = D.activeCats(d).slice(0, 4);

  return (
    <div className="screen shelf">
      <Plate name="plate_shelf" label="植物と額のある棚。のぞきこむハムスター">
        <At x={18} y={26} w={84} h={84} z={5}>
          <button className="head-btn" onClick={() => ctx.go({ tab: 'today' })} aria-label="きょうへ戻る"><span className="head-btn-face"><IconBack size={34} /></span></button>
        </At>
        <At x={656} y={26} w={84} h={84} z={5}>
          <button className="head-btn" onClick={() => { setYm({ y: tk.y, m: tk.m }); setSel(today); }} aria-label="きょうの月へ"><span className="head-btn-face"><IconCalendar size={36} /></span></button>
        </At>
        <At x={16} y={170} w={444} h={104} z={4} className="month-pill">
          <button className="mp-arrow" onClick={() => shift(-1)} aria-label="前の月"><IconBack size={30} /></button>
          <span className="mp-name num">{ym.y}<small>年</small>{ym.m}<small>月</small></span>
          <button className="mp-arrow" onClick={() => shift(1)} aria-label="次の月" disabled={isThisMonth}><IconNext size={30} /></button>
        </At>
        <At x={366} y={286} w={386} h={58} z={4} className="legend-pill">
          {legend.map((c) => (
            <span key={c.id} className="lg"><Candy color={c.color} size={30} /><span>{c.name}</span></span>
          ))}
        </At>
      </Plate>

      <Stage w={758} h={cabH} className="cabinet" label={`${ym.m}月のびんの棚`}>
        <Img name="cab_head" x={7} y={0} w={cab.w} h={cab.head} />
        {Array.from({ length: rows }, (_, i) => <Img key={i} name="cab_row" x={7} y={cab.head + i * cab.row} w={cab.w} h={cab.row} />)}
        <Img name="cab_bottom" x={7} y={cab.head + rows * cab.row} w={cab.w} h={cab.bottom} />
        {grid.map((k, i) => {
          const r = Math.floor(i / 7), c = i % 7;
          const [x0, x1] = cab.cols[c];
          const inMonth = parseKey(k).m === ym.m;
          const future = k > today;
          const ms = future ? 0 : totalOfDay(all, k, st.dayStartHour);
          const g = ms > 0 ? grainsOfDay(all, d.categories, k, st.dayStartHour, CONFIG.grainMinutes) : [];
          const goal = D.goalOf(d, weekdayOf(k)) * MIN;
          const wd = weekdayOf(k);
          const on = k === sel;
          return (
            <At key={k} x={7 + x0} y={cab.head + r * cab.row} w={x1 - x0} h={cab.cellH} z={on ? 3 : 1}>
              <button
                className={'cell' + (on ? ' on' : '') + (inMonth ? '' : ' other') + (wd === 6 ? ' sat' : wd === 0 ? ' sun' : '')}
                onClick={() => { setSel(k); if (!inMonth) setYm({ y: parseKey(k).y, m: parseKey(k).m }); }}
                disabled={future}
                aria-pressed={on}
                aria-label={`${parseKey(k).m}月${parseKey(k).d}日 ${fmtHM(ms)}${goal > 0 && ms >= goal ? ' 目標とどいた' : ''}`}
              >
                <CellJar colors={g} bare width={x1 - x0 - 8} />
                <span className="cell-num num">{parseKey(k).d}</span>
                {on && <span className="cell-glow" aria-hidden><i /><i /><i /></span>}
              </button>
            </At>
          );
        })}
      </Stage>

      <DayPanel ctx={ctx} dayKey={sel} all={all} />
    </div>
  );
}

function DayPanel({ ctx, dayKey: key, all }: { ctx: Ctx; dayKey: string; all: Session[] }) {
  const { d, now } = ctx;
  const st = d.settings;
  const [edit, setEdit] = useState<null | { s?: Session }>(null);
  const pieces = piecesOfDay(all, key, st.dayStartHour);
  const ms = totalOfDay(all, key, st.dayStartHour);
  const goal = D.goalOf(d, weekdayOf(key)) * MIN;
  const today = dayKey(now, st.dayStartHour);
  const { m, d: dd } = parseKey(key);
  const [a] = dayRange(key, st.dayStartHour);
  const catOf = (id: string) => d.categories.find((c) => c.id === id);
  const grains = grainsOfDay(all, d.categories, key, st.dayStartHour, CONFIG.grainMinutes);
  const per = grainsBySession(all, key, st.dayStartHour, CONFIG.grainMinutes);
  const mixMap = new Map<string, { t: number; n: number }>();
  for (const p of pieces) {
    const v = mixMap.get(p.session.cat) ?? { t: 0, n: 0 };
    v.t += p.to - p.from;
    v.n += per.get(p.session.id) ?? 0;
    mixMap.set(p.session.cat, v);
  }
  const mix = [...mixMap.entries()].flatMap(([id, v]) => { const c = catOf(id); return c ? [{ c, ...v }] : []; }).sort((a, b) => b.t - a.t);

  const remove = (s: Session) => {
    ctx.set((x) => D.deleteSession(x, s.id));
    ctx.toast('記録を消したよ', () => ctx.set((x) => D.restoreSession(x, s)));
  };

  return (
    <section className="card day-panel" aria-label={`${m}月${dd}日の記録`}>
      <div className="dp-head">
        <h2 className="dp-date num">{m}<small>月</small>{dd}<small>日</small><span className="dp-wd">({WD[weekdayOf(key)]})</span></h2>
        <img className="art dp-ham" src={art('mini_progress')} alt="" />
        <p className="dp-say">{dayLine(ms, goal, key === today, parseKey(key).d)}</p>
        <button className="btn btn-white btn-add" onClick={() => setEdit({})}><IconPlus size={20} className="ic-blue" />追加</button>
      </div>
      {pieces.length > 0 && (
        <div className="dp-sum" aria-label="この日のまとめ">
          <div className="dp-sum-top">
            <span><IconClock size={18} />作業時間 <b className="num">{fmtClock(ms)}</b></span>
            <span><Candy color="kinako" size={22} />こんぺいとう <b className="num">{grains.length}</b>粒</span>
          </div>
          <ul className="dp-bars">
            {mix.map(({ c, t, n }) => (
              <li key={c.id}>
                <Candy color={c.color} size={18} />
                <span className="db-name">{c.name}</span>
                <span className="db-bar"><i style={{ width: `${Math.max(4, (t / ms) * 100)}%`, background: CANDY[c.color].hex }} /></span>
                <span className="db-min num">{Math.round(t / MIN)}分</span>
                <span className="db-n num">{n}粒</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {pieces.length === 0 ? (
        <p className="empty">この日の記録はありません。押し忘れた分は「追加」から入れられます。</p>
      ) : (
        <ul className="rec-list">
          {pieces.map((p) => {
            const c = catOf(p.session.cat);
            const col = CANDY[c?.color ?? 'shiro'];
            const isRun = p.session.id === 'running';
            const fromPrev = p.session.start < a;
            const toNext = p.session.end > a + 24 * HOUR;
            return (
              <li key={p.session.id} className="rec">
                <button className="rec-main" disabled={isRun} onClick={() => setEdit({ s: p.session })} aria-label={`${c?.name ?? '作業'} ${fmtTime2(p.session.start)}から${fmtTime2(p.session.end)} ${fmtHM(p.to - p.from)}を直す`}>
                  <span className="rec-cat" style={{ ['--c' as string]: col.ink, ['--cs' as string]: col.soft }}>
                    <span className="rec-ic"><CatGlyph icon={c?.icon ?? 'star'} size={24} /></span>
                    <span className="rec-name">{c?.name ?? '作業'}{isRun ? '(いま)' : ''}</span>
                  </span>
                  <span className="rec-time num">{fromPrev ? '前日 ' : ''}{fmtTime2(p.session.start)} 〜 {toNext ? '翌日 ' : ''}{fmtTime2(p.session.end)}</span>
                  <span className="rec-len num">{fmtHM(p.to - p.from)}</span>
                </button>
                {!isRun && <button className="rec-del" onClick={() => remove(p.session)} aria-label={`${c?.name ?? '作業'}の記録を消す`}><IconTrash size={22} /></button>}
              </li>
            );
          })}
        </ul>
      )}
      <button className="link-row" onClick={() => ctx.go({ tab: 'shelf', view: 'day', day: key })}>この日をくわしく見る<IconNext size={18} /></button>
      {edit && (
        <SessionSheet
          ctx={ctx}
          initial={edit.s}
          defaultStart={today === key ? Math.max(a, now - HOUR) : a + 9 * HOUR}
          onClose={() => setEdit(null)}
        />
      )}
    </section>
  );
}
