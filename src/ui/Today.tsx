import { useEffect, useMemo, useRef, useState } from 'react';
import { art } from '../art/assets';
import { Candy } from '../art/Jar';
import { HeadButtons, Scene, type SceneMode } from '../art/Scene';
import { CONFIG } from '../config';
import { CANDY } from '../domain/colors';
import { activeCats, goalOf, restLeft, sessionClock, sessionsWithRunning } from '../domain/data';
import { grainsOfDay, untilNextGrain } from '../domain/grains';
import { lineFor } from '../domain/lines';
import { MIN, dayKey, fmtClock, fmtHM, fmtMS, fmtShort, totalOfDay, weekdayOf } from '../domain/time';
import type { Actions, Ctx } from './App';
import { CatGlyph, IconBed, IconCalendar, IconChart, IconClock, IconGear, IconLaptop, IconMoon, IconPause, IconPlay, IconPlus, IconSprout, IconStop } from './icons';

const REST_CHOICES = [5, 10, 15, 30];

export function Today({ ctx, actions }: { ctx: Ctx; actions: Actions }) {
  const { d, now } = ctx;
  const st = d.settings;
  const key = dayKey(now, st.dayStartHour);
  const all = useMemo(() => sessionsWithRunning(d, now), [d, now]);
  const todayMs = totalOfDay(all, key, st.dayStartHour);
  const goalMs = goalOf(d, weekdayOf(key)) * MIN;
  const unit = CONFIG.grainMinutes * MIN;
  const grains = useMemo(
    () => grainsOfDay(all, d.categories, key, st.dayStartHour, CONFIG.grainMinutes),
    // 粒の数が変わったときだけ数え直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(todayMs / unit), d.categories, key],
  );
  const r = d.running;
  const clock = sessionClock(r, now);
  const left = restLeft(r, now);
  const restOver = r?.mode === 'rest' && left === 0;
  const mode: SceneMode = !r ? 'idle' : r.mode === 'focus' ? 'focus' : r.mode === 'pause' ? 'pause' : restOver ? 'restOver' : 'rest';
  const cats = activeCats(d);
  const cur = d.categories.find((c) => c.id === (r ? r.cat : d.currentCat)) ?? cats[0];
  const name = st.names[st.animal];
  const firstTime = d.sessions.length === 0 && !r;

  // 粒がふえたら、落ちる動きと、やさしい知らせ(見本 ⑫・⑯)
  const prev = useRef(grains.length);
  const [drop, setDrop] = useState(0);
  useEffect(() => {
    if (grains.length > prev.current && r?.mode === 'focus') {
      setDrop(Date.now());
      ctx.toast('すごい！ こんぺいとうが1粒 ふえたよ！');
    }
    prev.current = grains.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grains.length]);
  const dropping = drop > 0 && now - drop < 2500;

  // 画面を開いているときの合図(休憩の終わり・区切り)
  const fired = useRef<string>('');
  const chimeAt = st.chimeMin > 0 ? st.chimeMin : 0;
  useEffect(() => {
    if (!r) return;
    if (r.mode === 'rest' && restOver && fired.current !== `rest${r.start}`) {
      fired.current = `rest${r.start}`;
      ctx.signal(`${name}が起きたよ。休憩、おわり`);
    }
    if (r.mode === 'focus' && chimeAt > 0 && clock >= chimeAt * MIN && clock < chimeAt * MIN + 5 * MIN && fired.current !== `chime${r.start}`) {
      fired.current = `chime${r.start}`;
      ctx.signal(`${chimeAt}分たったよ。ひと区切りしてもいいよ`);
    }
  }, [r, restOver, clock, chimeAt, name, ctx]);

  const line = lineFor({
    mode, hour: new Date(now).getHours(), todayMs, goalMs, sessionMs: clock, firstTime,
    seed: Math.floor(now / (4 * MIN)) + (r?.start ?? 0),
  });

  // 背の低い画面では場面を少し詰めて、ボタンまでが1画面に入るように
  const [vh, setVh] = useState(() => window.innerHeight);
  useEffect(() => {
    const f = () => setVh(window.innerHeight);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);

  const toNext = untilNextGrain(todayMs, CONFIG.grainMinutes);
  const prog = 1 - toNext / unit;
  const suggestRest = (r?.mode === 'focus' && clock >= (chimeAt || 50) * MIN) || r?.mode === 'pause';

  return (
    <div className="screen today">
      <Scene
        mode={mode}
        animal={st.animal}
        jar={st.jar}
        colors={grains}
        drop={dropping}
        tagTop={'きょうの\nこつぶ'}
        tagCount={grains.length}
        maxCss={Math.max(250, vh - 380)}
        label={`${name}と、きょうのびん。こんぺいとうが${grains.length}粒`}
      >
        <HeadButtons items={[
          { label: 'たな(カレンダー)', icon: <IconCalendar size={36} />, onClick: () => ctx.go({ tab: 'shelf' }) },
          { label: 'ふりかえり', icon: <IconChart size={36} />, onClick: () => ctx.go({ tab: 'shelf', view: 'review' }) },
          { label: 'セット', icon: <IconGear size={36} />, onClick: () => ctx.go({ tab: 'set' }) },
        ]} />
      </Scene>

      <div className="stack">
        {mode === 'rest' || mode === 'restOver' ? (
          <section className="card tcard" aria-label="休憩">
            <div className="ring-box">
              <Ring value={r?.mode === 'rest' ? 1 - left / (r.len * MIN) : 1} />
              <div className="ring-label"><IconBed size={22} />{restOver ? '休憩おわり' : '休憩中'}</div>
              <div className="ring-in">
                <IconMoon size={26} className="moon" />
                <div className="ring-cap">{restOver ? 'おきたよ' : '起こすまで'}</div>
                <div className="ring-num num" role="timer">{fmtMS(left)}</div>
              </div>
            </div>
            <p className="say-cloud" aria-live="polite">{line}</p>
          </section>
        ) : (
          <section className="card tcard" aria-label="時間">
            <div className="ring-box">
              <Ring value={mode === 'idle' ? 0 : prog} />
              <div className="ring-label">
                {mode === 'pause' ? <IconPause size={20} /> : <IconLaptop size={22} />}
                {mode === 'focus' ? '作業中' : mode === 'pause' ? '一時停止中' : 'きょうの合計'}
              </div>
              <div className="ring-in">
                {mode === 'idle'
                  ? <div className={'ring-num num'}>{fmtShort(todayMs)}</div>
                  : <div className={'ring-num num' + (clock >= 3600_000 ? ' long' : '')} role="timer">{fmtClock(clock)}</div>}
              </div>
            </div>
            <div className="next-box">
              {mode === 'idle' && goalMs > 0 ? (
                <>
                  <div className="next-cap">{todayMs >= goalMs ? 'きょうの目標' : '目標まで あと'}</div>
                  <div className="next-num num goal">{todayMs >= goalMs ? 'とどいた！' : fmtHM(goalMs - todayMs)}</div>
                </>
              ) : (
                <>
                  <div className="next-cap">次の 1 粒まで</div>
                  <div className="next-row"><Candy color={cur.color} size={30} /><span className="next-num num">{fmtMS(toNext)}</span></div>
                </>
              )}
            </div>
          </section>
        )}

        {mode === 'rest' || mode === 'restOver' ? (
          <section className="card pick-card" aria-label="休憩時間を選ぶ">
            <div className="pick-title"><IconClock size={20} />休憩時間を選ぶ</div>
            <div className="seg4" role="radiogroup" aria-label="休憩時間">
              {REST_CHOICES.map((m) => {
                const on = r?.mode === 'rest' && r.len === m;
                return <button key={m} role="radio" aria-checked={on} className={'seg4-btn num' + (on ? ' on' : '')} onClick={() => actions.restLen(m)}>{m}<small>分</small></button>;
              })}
            </div>
          </section>
        ) : (
          <div className="cat-tabs" role="radiogroup" aria-label="作業の種類">
            {cats.map((c) => {
              const on = c.id === cur.id;
              return (
                <button key={c.id} className={'cat-tab' + (on ? ' on' : '')} role="radio" aria-checked={on} onClick={() => actions.pick(c.id)}
                  style={{ ['--c' as string]: CANDY[c.color].ink, ['--cs' as string]: CANDY[c.color].soft }}>
                  <CatGlyph icon={c.icon} size={22} />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="btn-row">
          {mode === 'idle' && <button className="btn btn-primary btn-big" onClick={actions.start}><IconPlay size={22} />はじめる</button>}
          {mode === 'focus' && (
            <>
              <button className="btn btn-primary btn-big grow" onClick={actions.pause}><IconPause size={22} />一時停止</button>
              <button className="btn btn-white btn-big" onClick={actions.stop}><IconStop size={20} className="ic-brown" />終了</button>
            </>
          )}
          {mode === 'pause' && (
            <>
              <button className="btn btn-primary btn-big grow" onClick={actions.unpause}><IconPlay size={22} />再開</button>
              <button className="btn btn-white btn-big" onClick={actions.stop}><IconStop size={20} className="ic-brown" />終了</button>
            </>
          )}
          {mode === 'rest' && (
            <>
              <button className="btn btn-white btn-big grow" onClick={actions.resume}><IconStop size={20} className="ic-brown" />休憩を終える</button>
              <button className="btn btn-primary btn-big grow" onClick={() => r?.mode === 'rest' && actions.restLen(r.len + 5, false)}><IconPlus size={22} />5分延長</button>
            </>
          )}
          {mode === 'restOver' && (
            <>
              <button className="btn btn-primary btn-big grow" onClick={actions.resume}><IconPlay size={22} />つづける</button>
              <button className="btn btn-white btn-big" onClick={actions.stop}><IconStop size={20} className="ic-brown" />終了</button>
            </>
          )}
        </div>

        {mode === 'rest' ? (
          <section className="card info-card">
            <IconSprout size={26} className="ic-green" />
            <p>こつびんは がんばりすぎなくていいよ、と思っています。<br />休憩は、つぎの集中のための大切な時間です。</p>
            <img className="art info-ham" src={art('mini_sleep')} alt="" />
          </section>
        ) : suggestRest ? (
          <section className="card rest-card">
            <img className="art rest-art" src={art('art_rest')} alt="" />
            <div className="rest-body">
              <div className="rest-title">{mode === 'pause' ? 'ひとやすみする？' : 'そろそろ ひとやすみ？'}</div>
              <p>{mode === 'pause' ? 'このまま' : 'がんばっていますね。'}{st.restMin}分ほど 休憩しましょう</p>
              <button className="btn btn-brown" onClick={() => actions.rest()}>休憩する</button>
            </div>
          </section>
        ) : mode === 'idle' && grains.length === 0 && todayMs === 0 ? (
          <section className="card empty-card" aria-label="さあ、はじめよう">
            <img className="art" src={art('art_empty')} alt="空のびんと、さあ はじめよう と言うハムスター" />
          </section>
        ) : (
          <section className="card prog-card" aria-label="次の1粒までの進み">
            <div className="prog-title"><IconClock size={18} />{CONFIG.grainMinutes}分の作業で こんぺいとうが1粒 びんに入ります</div>
            <div className="prog-row">
              <div className="prog-pill" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(prog * 100)}>
                {Array.from({ length: 7 }, (_, i) => <i key={i} className={i < Math.round(prog * 7) ? 'on' : ''} />)}
              </div>
              <span className="prog-arrow" aria-hidden>→</span>
              <span className="prog-candy"><Candy color={cur.color} size={34} /><b className="spark" /></span>
              <img className="art prog-ham" src={art('mini_progress')} alt="" />
              <p className="prog-say">{line}</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/** 時計のまわりの輪(見本 ⑧)。横長の角の丸い輪を、進みの分だけ青く */
function Ring({ value }: { value: number }) {
  const v = Math.max(0, Math.min(1, value));
  const path = 'M 70 8 H 130 A 62 62 0 0 1 130 132 H 70 A 62 62 0 0 1 70 8 Z';
  return (
    <svg className="ring" viewBox="0 0 200 140" preserveAspectRatio="none" aria-hidden>
      <path d={path} className="ring-track" pathLength={100} />
      <path d={path} className="ring-bar" pathLength={100} strokeDasharray={`${v * 100} 100`} />
    </svg>
  );
}
