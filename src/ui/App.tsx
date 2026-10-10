import { App as CapApp } from '@capacitor/app';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { art } from '../art/assets';
import { CONFIG } from '../config';
import * as D from '../domain/data';
import { HOUR, MIN } from '../domain/time';
import type { AppData } from '../domain/types';
import { loadBilling, type BillingState } from '../platform/billing';
import { askNotify, cancelAll, cue, scheduleOnce, tap } from '../platform/native';
import { loadData, saveData } from '../platform/storage';
import { Day } from './Day';
import { Edit } from './Edit';
import { IconBooks, IconEdit, IconGear, IconHome } from './icons';
import { Onboarding } from './Onboarding';
import { Review } from './Review';
import { SetPage } from './SetPage';
import { Shelf } from './Shelf';
import { LongRunSheet, NotifyAskSheet } from './sheets';
import { Today } from './Today';

export type Tab = 'today' | 'shelf' | 'edit' | 'set';
/** shelf: view=day(その日のくわしい画面)/ review(ふりかえり)。edit: sub=cats(作業の種類)。set: sub=goals(1日の目標) */
export type Route = { tab: Tab; day?: string; view?: 'day' | 'review'; sub?: 'cats' | 'goals' };

export interface Ctx {
  d: AppData;
  now: number;
  set: (f: (d: AppData) => AppData) => void;
  owned: boolean;
  billing: BillingState;
  setBilling: (b: BillingState) => void;
  /** なかまセットの画面を開く(セットのタブの上) */
  openPaywall: () => void;
  toast: (msg: string, undo?: () => void) => void;
  go: (r: Route) => void;
  route: Route;
  /** 画面の色を一瞬変えて、振動で知らせる */
  signal: (msg: string) => void;
}

export function App() {
  const [d, setD] = useState<AppData | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [route, setRoute] = useState<Route>({ tab: 'today' });
  const [billing, setBilling] = useState<BillingState>({ status: 'loading', owned: false });
  const [notifyAsk, setNotifyAsk] = useState<null | (() => void)>(null);
  const [toastMsg, setToast] = useState<{ msg: string; undo?: () => void; id: number } | null>(null);
  const [flash, setFlash] = useState<{ msg: string; id: number } | null>(null);
  const [longRunSeen, setLongRunSeen] = useState(false);

  useEffect(() => {
    loadData().then((x) => setD(x));
    loadBilling().then(setBilling);
  }, []);

  // 保存(変わるたび)
  const first = useRef(true);
  useEffect(() => {
    if (!d) return;
    if (first.current) { first.current = false; return; }
    saveData(d);
  }, [d]);

  // 見た目
  useEffect(() => {
    const t = d?.settings.theme ?? 'auto';
    if (t === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  }, [d?.settings.theme]);

  // 時計。動いている間は1秒ごと、止まっている間は30秒ごと
  const ticking = d?.running?.mode === 'focus' || d?.running?.mode === 'rest';
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ticking ? 1000 : 30_000);
    const vis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [ticking]);

  const set = useCallback((f: (d: AppData) => AppData) => setD((cur) => (cur ? f(cur) : cur)), []);

  // 画面を移ったら、知らせは消し、上へ戻す
  useEffect(() => { setToast(null); window.scrollTo(0, 0); }, [route.tab, route.day, route.sub, route.view]);

  const toast = useCallback((msg: string, undo?: () => void) => setToast({ msg, undo, id: Date.now() }), []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToast(null), toastMsg.undo ? 6000 : 2800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const signal = useCallback((msg: string) => {
    cue();
    setFlash({ msg, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  const owned = billing.owned;
  // 買っていないのに有料の相棒・びんになっていたら(復元前・返金後など)最初の物に戻す
  useEffect(() => {
    if (!d || billing.status === 'loading' || owned) return;
    if (d.settings.animal !== D.FREE_ANIMAL || d.settings.jar !== D.FREE_JAR) {
      set((x) => ({ ...x, settings: { ...x.settings, animal: D.FREE_ANIMAL, jar: D.FREE_JAR } }));
    }
  }, [d, owned, billing.status, set]);

  // Android の戻るボタン
  const state = useRef({ notifyAsk, route });
  state.current = { notifyAsk, route };
  useEffect(() => {
    const h = CapApp.addListener('backButton', () => {
      const s = state.current;
      if (document.querySelector('.sheet-back')) { (document.querySelector('.sheet-back') as HTMLElement).click(); return; }
      if (s.notifyAsk) return setNotifyAsk(null);
      if (s.route.view === 'day' && s.route.day) return setRoute({ tab: 'shelf', day: s.route.day });
      if (s.route.view || s.route.sub) return setRoute({ tab: s.route.tab, day: s.route.day });
      if (s.route.tab !== 'today') return setRoute({ tab: 'today' });
      CapApp.minimizeApp();
    });
    return () => { h.then((x) => x.remove()).catch(() => {}); };
  }, []);

  const ctx: Ctx | null = useMemo(() => d && {
    d, now, set, owned, billing, setBilling,
    openPaywall: () => setRoute({ tab: 'set' }),
    toast, go: setRoute, route, signal,
  }, [d, now, set, owned, billing, toast, route, signal]);

  if (!d || !ctx) return <div className="boot" aria-busy="true" />;

  if (!d.onboarded) {
    return <Onboarding d={d} onDone={(name) => set((x) => ({ ...x, onboarded: true, settings: { ...x.settings, names: { ...x.settings.names, hamster: name } } }))} />;
  }

  const longRun = !longRunSeen && d.running?.mode === 'focus' && now - d.running.start > CONFIG.longRunHours * HOUR;
  const name = d.settings.names[d.settings.animal];

  return (
    <div className={'app' + (flash ? ' is-cue' : '')}>
      <main className="main">
        {route.tab === 'today' && <Today ctx={ctx} actions={makeActions(ctx, (f) => setNotifyAsk(() => f))} />}
        {route.tab === 'shelf' && route.view === 'review' && <Review ctx={ctx} />}
        {route.tab === 'shelf' && route.view === 'day' && route.day && <Day ctx={ctx} dayKey={route.day} />}
        {route.tab === 'shelf' && !route.view && <Shelf ctx={ctx} />}
        {route.tab === 'edit' && <Edit ctx={ctx} />}
        {route.tab === 'set' && <SetPage ctx={ctx} />}
      </main>

      <nav className="tabbar" aria-label="画面の切り替え">
        <TabBtn label="きょう" on={route.tab === 'today'} onClick={() => setRoute({ tab: 'today' })} icon={<IconHome size={28} />} />
        <TabBtn label="たな" on={route.tab === 'shelf'} onClick={() => setRoute({ tab: 'shelf' })} icon={<IconBooks size={28} />} />
        <TabBtn label="編集" on={route.tab === 'edit'} onClick={() => setRoute({ tab: 'edit' })} icon={<IconEdit size={28} />} />
        <TabBtn label="セット" on={route.tab === 'set'} onClick={() => setRoute({ tab: 'set' })} icon={<IconGear size={28} />} />
      </nav>

      {flash && (
        <div className="bubble-note cue-banner" role="status" key={flash.id}>
          <img className="art" src={art(d.settings.animal === 'enaga' ? 'face_enaga' : 'face_ham')} alt="" />
          <span>{flash.msg}</span>
        </div>
      )}
      {toastMsg && (
        <div className="bubble-note toast" role="status" key={toastMsg.id}>
          <img className="art" src={art('face_ham')} alt="" />
          <span>{toastMsg.msg}</span>
          {toastMsg.undo && <button className="toast-btn" onClick={() => { toastMsg.undo!(); setToast(null); }}>もとに戻す</button>}
        </div>
      )}

      {notifyAsk && (
        <NotifyAskSheet
          name={name}
          onAnswer={async (yes) => {
            const after = notifyAsk;
            setNotifyAsk(null);
            const v = yes ? await askNotify() : 'off';
            lastNotify.value = v;
            set((x) => ({ ...x, settings: { ...x.settings, notify: v } }));
            after();
          }}
        />
      )}
      {longRun && d.running?.mode === 'focus' && (
        <LongRunSheet
          start={d.running.start}
          now={now}
          onKeep={() => setLongRunSeen(true)}
          onEnd={(end) => { set((x) => D.endRunningAt(x, end)); cancelAll(); setLongRunSeen(true); toast('終わりの時刻で記録したよ'); }}
        />
      )}
    </div>
  );
}

function TabBtn({ label, on, onClick, icon }: { label: string; on: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button className={'tab' + (on ? ' on' : '')} aria-current={on ? 'page' : undefined} onClick={() => { tap(); onClick(); }}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

export interface Actions {
  start: () => void;
  pause: () => void;
  unpause: () => void;
  rest: (len?: number) => void;
  /** 休憩の長さ。remember=true なら次からもこの長さ(延長のときは false) */
  restLen: (len: number, remember?: boolean) => void;
  resume: () => void;
  stop: () => void;
  pick: (cat: string) => void;
}

/** きょうの画面のボタン。通知の予約もここで */
export function makeActions(ctx: Ctx, ask: (f: (() => void) | null) => void): Actions {
  const { d, set, toast } = ctx;
  const name = d.settings.names[d.settings.animal];
  const notifyOn = () => lastNotify.value === 'on' || d.settings.notify === 'on';

  const chime = (start: number) => {
    if (notifyOn() && d.settings.chimeMin > 0) {
      scheduleOnce('chime', start + d.settings.chimeMin * MIN, `${d.settings.chimeMin}分たったよ`, `${name}がひと区切りを知らせに来たよ`);
    }
  };
  const wake = (start: number, len: number) => {
    if (notifyOn()) scheduleOnce('rest', start + len * MIN, `${name}が起きたよ`, '休憩、おわり。つづける？');
  };

  return {
    start: () => {
      tap();
      const t = Date.now();
      set((x) => D.start(x, t));
      chime(t);
    },
    pause: () => {
      tap();
      const t = Date.now();
      set((x) => D.pause(x, t));
      scheduleOnce('chime', 0, '', '');
    },
    unpause: () => {
      tap();
      const t = Date.now();
      set((x) => D.unpause(x, t));
      chime(t);
    },
    rest: (len = d.settings.restMin) => {
      tap();
      const t = Date.now();
      const doRest = () => {
        set((x) => D.rest(x, t, len));
        scheduleOnce('chime', 0, '', '');
        wake(t, len);
      };
      // 通知は使う直前に聞く(1回だけ)
      if (d.settings.notify === 'unknown' && lastNotify.value === 'unknown') ask(() => { doRest(); });
      else doRest();
    },
    restLen: (len, remember = true) => {
      tap();
      const r = d.running;
      set((x) => {
        const y = D.setRestLen(x, len);
        return remember ? { ...y, settings: { ...y.settings, restMin: len } } : y;
      });
      if (r?.mode === 'rest') wake(r.start, len);
    },
    resume: () => {
      tap();
      const t = Date.now();
      set((x) => D.resume(x, t));
      scheduleOnce('rest', 0, '', '');
      chime(t);
    },
    stop: () => {
      tap();
      const t = Date.now();
      const before = d;
      set((x) => D.stop(x, t));
      cancelAll();
      const r = d.running;
      if (r?.mode === 'focus' && t - r.start < D.MIN_SESSION_MS && !(r.carry ?? 0)) toast('1分より短いので、記録はしなかったよ');
      else if (r) toast('おつかれさま。記録したよ', () => set(() => before));
    },
    pick: (cat) => {
      tap();
      const t = Date.now();
      const wasFocus = d.running?.mode === 'focus' && d.running.cat !== cat;
      set((x) => D.switchCat(x, cat, t));
      if (wasFocus) chime(t);
    },
  };
}

/** 通知の許可の最新の答え(聞いた直後に、保存を待たずに使う) */
export const lastNotify: { value: 'unknown' | 'on' | 'off' } = { value: 'unknown' };
