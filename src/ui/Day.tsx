import { useMemo, useState } from 'react';
import { Candy } from '../art/Jar';
import { HeadButtons, Scene } from '../art/Scene';
import { CONFIG } from '../config';
import { CANDY } from '../domain/colors';
import * as D from '../domain/data';
import { grainsBySession, grainsOfDay } from '../domain/grains';
import { HOUR, addDays, dayKey, dayRange, fmtHM, fmtTime2, labelOfDay, parseKey, piecesOfDay, totalOfDay, weekdayOf } from '../domain/time';
import type { Session } from '../domain/types';
import { shareImage } from '../platform/native';
import type { Ctx } from './App';
import { CatGlyph, IconBack, IconCalendar, IconChart, IconGear, IconClock, IconEdit, IconImage, IconMemo, IconNext, IconPlus } from './icons';
import { makeShareCard } from './shareCard';
import { MemoSheet, SessionSheet } from './sheets';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

/** その日(見本3): びん・サマリー・作業のタイムライン・編集/メモ/画像 */
export function Day({ ctx, dayKey: key }: { ctx: Ctx; dayKey: string }) {
  const { d, now } = ctx;
  const st = d.settings;
  const all = useMemo(() => D.sessionsWithRunning(d, now), [d, now]);
  const pieces = piecesOfDay(all, key, st.dayStartHour);
  const ms = totalOfDay(all, key, st.dayStartHour);
  const grains = grainsOfDay(all, d.categories, key, st.dayStartHour, CONFIG.grainMinutes);
  const perSession = grainsBySession(all, key, st.dayStartHour, CONFIG.grainMinutes);
  const today = dayKey(now, st.dayStartHour);
  const isToday = key === today;
  const [edit, setEdit] = useState<null | { s?: Session }>(null);
  const [memo, setMemo] = useState(false);
  const [a] = dayRange(key, st.dayStartHour);
  const catOf = (id: string) => d.categories.find((c) => c.id === id);
  const { m, d: dd } = parseKey(key);

  // 種類ごと
  const byCat = new Map<string, { ms: number; n: number }>();
  for (const p of pieces) {
    const v = byCat.get(p.session.cat) ?? { ms: 0, n: 0 };
    v.ms += p.to - p.from;
    byCat.set(p.session.cat, v);
  }
  for (const p of pieces) {
    const v = byCat.get(p.session.cat)!;
    v.n += perSession.get(p.session.id) ?? 0;
  }
  const tiles = [...byCat.entries()].map(([id, v]) => ({ c: catOf(id), ...v })).sort((x, y) => y.ms - x.ms);

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
      <header className="bar">
        <button className="bar-back" onClick={() => ctx.go({ tab: 'shelf', day: key })} aria-label="たなへ戻る"><IconBack size={26} /><span className="bar-logo">たな</span></button>
        <h1 className="bar-date num">{m}月{dd}日<span className="wd-badge">{WD[weekdayOf(key)]}</span></h1>
        <div className="bar-arrows">
          <button className="sq-btn" onClick={() => ctx.go({ tab: 'shelf', view: 'day', day: addDays(key, -1) })} aria-label="前の日"><IconBack size={22} /></button>
          <button className="sq-btn" onClick={() => ctx.go({ tab: 'shelf', view: 'day', day: addDays(key, 1) })} aria-label="次の日" disabled={key >= today}><IconNext size={22} /></button>
        </div>
      </header>

      <Scene
        mode="idle"
        animal={st.animal}
        jar={st.jar}
        colors={grains}
        tagTop={isToday ? 'きょうの\nこつぶ' : 'この日の\nこつぶ'}
        tagCount={grains.length}
        tagBottom={`集中時間\n${fmtHM(ms)}`}
        label={`${labelOfDay(key)}のびん。こんぺいとうが${grains.length}粒`}
      >
        <HeadButtons items={[
          { label: 'たな(カレンダー)', icon: <IconCalendar size={36} />, onClick: () => ctx.go({ tab: 'shelf', day: key }) },
          { label: 'ふりかえり', icon: <IconChart size={36} />, onClick: () => ctx.go({ tab: 'shelf', view: 'review' }) },
          { label: 'セット', icon: <IconGear size={36} />, onClick: () => ctx.go({ tab: 'set' }) },
        ]} />
      </Scene>

      <div className="stack">
        <section className="card" aria-label="サマリー">
          <div className="card-head">
            <h2 className="card-title"><IconChart size={24} className="ic-brown" />{isToday ? 'きょうのサマリー' : 'この日のサマリー'}</h2>
            <span className="pill num">合計 <b>{fmtHM(ms)}</b></span>
          </div>
          {tiles.length === 0 ? <p className="empty">この日の記録はまだありません。</p> : (
            <div className="tiles">
              {tiles.map(({ c, ms: t, n }) => {
                const col = CANDY[c?.color ?? 'shiro'];
                return (
                  <div key={c?.id ?? 'x'} className="tile" style={{ ['--c' as string]: col.ink, ['--cs' as string]: col.soft }}>
                    <div className="tile-name"><CatGlyph icon={c?.icon ?? 'star'} size={22} />{c?.name ?? '作業'}</div>
                    <div className="tile-num num">{Math.round(t / 60000)}<small>分</small></div>
                    <div className="tile-n num"><Candy color={c?.color ?? 'shiro'} size={22} />{n}<small>粒</small></div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card" aria-label="作業のタイムライン">
          <div className="card-head">
            <h2 className="card-title"><IconClock size={24} className="ic-brown" />作業のタイムライン</h2>
            <span className="pill num">合計 <b>{pieces.length}</b> セッション</span>
          </div>
          {pieces.length === 0 ? <p className="empty">押し忘れた分は、下の「追加」から入れられます。</p> : (
            <ol className="timeline">
              {pieces.map((p) => {
                const c = catOf(p.session.cat);
                const col = CANDY[c?.color ?? 'shiro'];
                const isRun = p.session.id === 'running';
                const fromPrev = p.session.start < a;
                const toNext = p.session.end > a + 24 * HOUR;
                return (
                  <li key={p.session.id} style={{ ['--c' as string]: col.ink, ['--cs' as string]: col.soft }}>
                    <span className="tl-dot" aria-hidden />
                    <button className="tl-row" disabled={isRun} onClick={() => setEdit({ s: p.session })}>
                      <span className="tl-time num">{fromPrev ? '前日 ' : ''}{fmtTime2(p.session.start)} - {toNext ? '翌日 ' : ''}{fmtTime2(p.session.end)}</span>
                      <span className="tl-cat"><CatGlyph icon={c?.icon ?? 'star'} size={18} />{c?.name ?? '作業'}</span>
                      <span className="tl-note">{isRun ? 'いま作業中' : p.session.note ?? ''}</span>
                      <span className="tl-n num"><Candy color={c?.color ?? 'shiro'} size={20} />{perSession.get(p.session.id) ?? 0}<small>粒</small></span>
                      {!isRun && <IconNext size={18} className="tl-chev" />}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          <button className="btn btn-white btn-small add-inline" onClick={() => setEdit({})}><IconPlus size={18} className="ic-blue" />追加</button>
        </section>

        {d.memos[key] && (
          <section className="card memo-card" aria-label="メモ">
            <h2 className="card-title"><IconMemo size={22} className="ic-brown" />メモ</h2>
            <p className="memo-text">{d.memos[key]}</p>
          </section>
        )}

        <div className="btn-row three">
          <button className="btn btn-white" onClick={() => ctx.go({ tab: 'edit', day: key })}><IconEdit size={22} className="ic-brown" />編集</button>
          <button className="btn btn-white" onClick={() => setMemo(true)}><IconMemo size={22} className="ic-brown" />メモを書く</button>
          <button className="btn btn-white" onClick={share} disabled={grains.length === 0}><IconImage size={22} className="ic-brown" />画像にする</button>
        </div>
      </div>

      {edit && (
        <SessionSheet ctx={ctx} initial={edit.s} defaultStart={isToday ? Math.max(a, now - HOUR) : a + 9 * HOUR} onClose={() => setEdit(null)} />
      )}
      {memo && <MemoSheet ctx={ctx} dayKey={key} onClose={() => setMemo(false)} />}
    </div>
  );
}
