import { useMemo, useState } from 'react';
import { art } from '../art/assets';
import { Candy } from '../art/Jar';
import { CONFIG } from '../config';
import { CANDY } from '../domain/colors';
import * as D from '../domain/data';
import { grainsBySession } from '../domain/grains';
import { HOUR, addDays, dayKey, dayRange, fmtClock, fmtTime2, parseKey, piecesOfDay, weekdayOf } from '../domain/time';
import type { Category, Session } from '../domain/types';
import type { Ctx } from './App';
import { CatGlyph, IconDown, IconPencil, IconPlus, IconUp } from './icons';
import { CategorySheet, SessionSheet } from './sheets';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

/** 編集(見本ガイド ⑮): 作業履歴の一覧から直す・足す。作業の種類もここで */
export function Edit({ ctx }: { ctx: Ctx }) {
  const tab = ctx.route.sub === 'cats' ? 'cats' : 'log';
  return (
    <div className="screen edit">
      <header className="page-head">
        <img className="art ph-ham" src={art('ham_henshu')} alt="" />
        <div>
          <h1 className="page-title">編集</h1>
          <p className="page-sub">{tab === 'log' ? 'なおしたい記録を えらんでね。押し忘れた分は「追加」から。' : '作業の種類の名前・色・しるしを決められます。'}</p>
        </div>
      </header>
      <div className="toggle wide" role="tablist" aria-label="編集するもの">
        <button role="tab" aria-selected={tab === 'log'} className={tab === 'log' ? 'on' : ''} onClick={() => ctx.go({ tab: 'edit', day: ctx.route.day })}>作業の記録</button>
        <button role="tab" aria-selected={tab === 'cats'} className={tab === 'cats' ? 'on' : ''} onClick={() => ctx.go({ tab: 'edit', sub: 'cats' })}>作業の種類</button>
      </div>
      {tab === 'log' ? <LogList ctx={ctx} /> : <Cats ctx={ctx} />}
    </div>
  );
}

function LogList({ ctx }: { ctx: Ctx }) {
  const { d, now } = ctx;
  const st = d.settings;
  const today = dayKey(now, st.dayStartHour);
  const [days, setDays] = useState(14);
  const [edit, setEdit] = useState<null | { s?: Session; start?: number }>(null);
  const focusDay = ctx.route.day;
  const all = useMemo(() => D.sessionsWithRunning(d, now), [d, now]);
  // 日ごとに、新しい日から
  const groups = useMemo(() => {
    const out: { key: string; rows: { s: Session; ms: number; n: number }[] }[] = [];
    const first = all.length ? dayKey(all[0].start, st.dayStartHour) : today;
    const from = focusDay ?? today;
    for (let i = 0, k = from; i < days && k >= first; i++, k = addDays(k, -1)) {
      const pcs = piecesOfDay(all, k, st.dayStartHour);
      if (!pcs.length) continue;
      const per = grainsBySession(all, k, st.dayStartHour, CONFIG.grainMinutes);
      out.push({ key: k, rows: pcs.slice().reverse().map((p) => ({ s: p.session, ms: p.to - p.from, n: per.get(p.session.id) ?? 0 })) });
      if (focusDay) break;
    }
    return out;
  }, [all, days, focusDay, today, st.dayStartHour]);
  const catOf = (id: string) => d.categories.find((c) => c.id === id);
  const lastFrom = groups.length ? addDays(groups[groups.length - 1].key, -1) : today;
  const more = !focusDay && all.length > 0 && lastFrom >= dayKey(all[0].start, st.dayStartHour);

  return (
    <>
      <div className="row-actions">
        <button className="btn btn-primary btn-add-big" onClick={() => setEdit({ start: focusDay ? dayRange(focusDay, st.dayStartHour)[0] + 9 * HOUR : Math.max(now - HOUR, 0) })}><IconPlus size={22} />追加</button>
        {focusDay && <button className="btn btn-white" onClick={() => ctx.go({ tab: 'edit' })}>ほかの日も見る</button>}
      </div>
      {groups.length === 0 ? (
        <section className="card empty-card"><img className="art" src={art('art_empty')} alt="空のびんと、さあ はじめよう と言うハムスター" /></section>
      ) : groups.map((g) => (
        <section key={g.key} className="card hist" aria-label={`${parseKey(g.key).m}月${parseKey(g.key).d}日の記録`}>
          <h2 className="hist-day num">{parseKey(g.key).m}/{parseKey(g.key).d}({WD[weekdayOf(g.key)]}){g.key === today ? ' きょう' : ''}</h2>
          <ul>
            {g.rows.map(({ s, ms, n }) => {
              const c = catOf(s.cat);
              const col = CANDY[c?.color ?? 'shiro'];
              const run = s.id === 'running';
              return (
                <li key={s.id} className="hist-row" style={{ ['--c' as string]: col.ink, ['--cs' as string]: col.soft }}>
                  <span className="hr-cat"><CatGlyph icon={c?.icon ?? 'star'} size={20} />{c?.name ?? '作業'}</span>
                  <span className="hr-when num">{fmtTime2(s.start)}〜{fmtTime2(s.end)}{s.note ? <em>{s.note}</em> : null}</span>
                  <span className="hr-len num">{fmtClock(ms)}</span>
                  <span className="hr-n num">+{n}<small>粒</small><Candy color={c?.color ?? 'shiro'} size={20} /></span>
                  <button className="hr-edit" disabled={run} onClick={() => setEdit({ s })} aria-label={`${parseKey(g.key).m}月${parseKey(g.key).d}日 ${c?.name ?? '作業'} ${fmtTime2(s.start)}の記録を直す`}><IconPencil size={20} /></button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {more && <button className="btn btn-white btn-more" onClick={() => setDays((n) => n + 14)}>もっと前の記録</button>}
      {edit && <SessionSheet ctx={ctx} initial={edit.s} defaultStart={edit.start ?? now - HOUR} onClose={() => setEdit(null)} />}
    </>
  );
}

function Cats({ ctx }: { ctx: Ctx }) {
  const { d, set } = ctx;
  const [edit, setEdit] = useState<null | { c?: Category }>(null);
  const act = D.activeCats(d);
  const arc = D.archivedCats(d);
  return (
    <>
      <section className="card">
        <p className="hint">押すと名前・色・しるしを直せます。使わなくなった種類は「しまう」と一覧から消え、記録は残ります。</p>
        <ul className="cat-list">
          {act.map((c, i) => (
            <li key={c.id} style={{ ['--c' as string]: CANDY[c.color].ink, ['--cs' as string]: CANDY[c.color].soft }}>
              <button className="cl-main" onClick={() => setEdit({ c })} aria-label={c.name}>
                <span className="cl-ic"><CatGlyph icon={c.icon} size={24} /></span>
                <span className="cl-name">{c.name}</span>
                <Candy color={c.color} size={26} />
              </button>
              <button className="sq-btn" disabled={i === 0} onClick={() => set((x) => D.moveCategory(x, c.id, -1))} aria-label={`${c.name}を上へ`}><IconUp size={22} /></button>
              <button className="sq-btn" disabled={i === act.length - 1} onClick={() => set((x) => D.moveCategory(x, c.id, 1))} aria-label={`${c.name}を下へ`}><IconDown size={22} /></button>
            </li>
          ))}
        </ul>
        <button className="btn btn-white btn-wide" onClick={() => setEdit({})}><IconPlus size={20} className="ic-blue" />種類を足す</button>
      </section>
      {arc.length > 0 && (
        <section className="card">
          <h2 className="card-title">しまった種類</h2>
          <ul className="cat-list">
            {arc.map((c) => (
              <li key={c.id} className="muted-row" style={{ ['--c' as string]: CANDY[c.color].ink, ['--cs' as string]: CANDY[c.color].soft }}>
                <span className="cl-main static"><span className="cl-ic"><CatGlyph icon={c.icon} size={24} /></span><span className="cl-name">{c.name}</span></span>
                <button className="btn btn-white btn-small" onClick={() => { set((x) => D.restoreCategory(x, c.id)); ctx.toast(`「${c.name}」を戻したよ`); }}>戻す</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {edit && <CategorySheet ctx={ctx} initial={edit.c} onClose={() => setEdit(null)} />}
    </>
  );
}
