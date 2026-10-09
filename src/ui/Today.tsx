import { useEffect, useMemo, useRef } from 'react';
import { CONFIG } from '../config';
import { Grain } from '../art/Mini';
import { Scene, type SceneMode } from '../art/Scene';
import { CANDY } from '../domain/colors';
import { activeCats, goalOf, sessionsWithRunning } from '../domain/data';
import { grainsOfDay, untilNextGrain } from '../domain/grains';
import { lineFor } from '../domain/lines';
import { MIN, dayKey, fmtClock, fmtHM, labelOfDay, piecesOfDay, totalOfDay, weekdayOf } from '../domain/time';
import type { Actions, Ctx } from './App';

export function Today({ ctx, actions }: { ctx: Ctx; actions: Actions }) {
  const { d, now } = ctx;
  const st = d.settings;
  const key = dayKey(now, st.dayStartHour);
  const all = useMemo(() => sessionsWithRunning(d, now), [d, now]);
  const todayMs = totalOfDay(all, key, st.dayStartHour);
  const goalMs = goalOf(d, weekdayOf(key)) * MIN;
  const grains = useMemo(
    () => grainsOfDay(all, d.categories, key, st.dayStartHour, CONFIG.grainMinutes).map((c) => CANDY[c].hex),
    // 粒の数が変わったときだけ描き直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(todayMs / (CONFIG.grainMinutes * MIN)), d.categories, key],
  );
  const r = d.running;
  const sessionMs = r ? now - r.start : 0;
  const restOver = r?.mode === 'rest' && sessionMs >= st.restMin * MIN;
  const mode: SceneMode = !r ? 'idle' : r.mode === 'focus' ? 'focus' : restOver ? 'restOver' : 'rest';
  const cats = activeCats(d);
  const cur = d.categories.find((c) => c.id === (r?.mode === 'focus' ? r.cat : d.currentCat)) ?? cats[0];
  const name = st.names[st.animal];

  // 画面を開いているときの合図(ひとやすみの終わり・区切り)
  const fired = useRef<string>('');
  useEffect(() => {
    if (!r) return;
    if (r.mode === 'rest' && restOver && fired.current !== `rest${r.start}`) {
      fired.current = `rest${r.start}`;
      ctx.signal(`${name}が起きたよ`);
    }
    if (r.mode === 'focus' && st.chimeMin > 0 && sessionMs >= st.chimeMin * MIN && sessionMs < st.chimeMin * MIN + 5 * MIN && fired.current !== `chime${r.start}`) {
      fired.current = `chime${r.start}`;
      ctx.signal(`${st.chimeMin}分たったよ。ひと区切りしてもいいよ`);
    }
  }, [r, restOver, sessionMs, st.chimeMin, name, ctx]);

  const line = lineFor({
    mode,
    hour: new Date(now).getHours(),
    todayMs,
    goalMs,
    sessionMs,
    firstTime: d.sessions.length === 0 && !r,
    seed: Math.floor(now / (4 * MIN)) + (r?.start ?? 0),
  });

  const left = goalMs > 0 ? goalMs - todayMs : 0;
  // きょうの中身(種類ごとの合計)
  const mix = new Map<string, number>();
  for (const p of piecesOfDay(all, key, st.dayStartHour)) mix.set(p.session.cat, (mix.get(p.session.cat) ?? 0) + p.to - p.from);
  const mixRows = [...mix.entries()].sort((a, b) => b[1] - a[1]).map(([id, ms]) => ({ c: d.categories.find((x) => x.id === id), ms }));

  return (
    <div className="screen today">
      <header className="top">
        <h1 className="top-title">{labelOfDay(key)}</h1>
        <span className="top-sub num">{grains.length}粒</span>
      </header>

      <Scene animal={st.animal} jar={st.jar} colors={grains} mode={mode} holdColor={CANDY[cur.color].hex} maxHeight={232} label={`${name}と、きょうのびん。金平糖が${grains.length}粒`} />

      <p className="say" aria-live="polite">
        <span className="say-who">{name}</span>
        <span className="say-line">{line}</span>
      </p>

      <section className="readout" aria-label="時間">
        {r?.mode === 'focus' ? (
          <>
            <div className="readout-label">{cur.name}をしているよ</div>
            <div className="readout-num num" role="timer">{fmtClock(sessionMs)}</div>
            <div className="readout-sub num">きょう {fmtHM(todayMs)}<span className="dot-sep" />つぎの1粒まで {Math.ceil(untilNextGrain(todayMs, CONFIG.grainMinutes) / MIN)}分</div>
          </>
        ) : r?.mode === 'rest' ? (
          <>
            <div className="readout-label">{restOver ? 'ひとやすみ、おわり' : 'ひとやすみ中'}</div>
            <div className="readout-num num" role="timer">{fmtClock(sessionMs)}</div>
            <div className="readout-sub num">きょう {fmtHM(todayMs)}<span className="dot-sep" />{restOver ? `${st.restMin}分たったよ` : `${name}は${st.restMin}分で起きるよ`}</div>
          </>
        ) : (
          <>
            <div className="readout-label">きょうの合計</div>
            <div className="readout-num num">{fmtHM(todayMs)}</div>
            <div className="readout-sub num">
              {goalMs === 0 ? 'きょうは目標なし' : left > 0 ? `目標まで あと${fmtHM(left)}` : '目標にとどいたよ'}
            </div>
          </>
        )}
      </section>

      <div className="chips" role="radiogroup" aria-label="作業の種類">
        {cats.map((c) => {
          const on = c.id === cur.id;
          return (
            <button key={c.id} className={'chip' + (on ? ' on' : '')} role="radio" aria-checked={on} onClick={() => actions.pick(c.id)}>
              <Grain color={CANDY[c.color].hex} scale={3} />
              <span>{c.name}</span>
            </button>
          );
        })}
        <button className="chip chip-ghost" onClick={() => ctx.go({ tab: 'settings', sub: 'cats' })}>種類を編集</button>
      </div>

      {mixRows.length > 0 && (
        <section className="today-mix" aria-label="きょうの中身">
          <h2 className="sec-title">きょうの中身</h2>
          <ul className="mix-list">
            {mixRows.map(({ c, ms }) => (
              <li key={c?.id ?? 'x'}>
                <Grain color={CANDY[c?.color ?? 'shiro'].hex} scale={3} />
                <span className="mix-name">{c?.name ?? '作業'}</span>
                <span className="mix-ms num">{fmtHM(ms)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="dock">
        {!r && <button className="btn btn-primary btn-big" onClick={actions.start}>はじめる</button>}
        {r?.mode === 'focus' && (
          <div className="btn-row">
            <button className="btn btn-quiet btn-big" onClick={actions.rest}>ひとやすみ</button>
            <button className="btn btn-primary btn-big" onClick={actions.stop}>おしまい</button>
          </div>
        )}
        {r?.mode === 'rest' && (
          <div className="btn-row">
            <button className="btn btn-quiet btn-big" onClick={actions.stop}>おしまい</button>
            <button className="btn btn-primary btn-big" onClick={actions.resume}>つづける</button>
          </div>
        )}
      </div>
    </div>
  );
}
