import { App as CapApp } from '@capacitor/app';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from '../config';
import * as D from '../domain/data';
import { HOUR, MIN } from '../domain/time';
import type { AppData } from '../domain/types';
import { loadBilling, type BillingState } from '../platform/billing';
import { askNotify, cancelAll, cue, scheduleOnce, tap } from '../platform/native';
import { loadData, saveData } from '../platform/storage';
import { Day } from './Day';
import { IconJar, IconShelf, IconSliders } from './icons';
import { Onboarding } from './Onboarding';
import { Settings } from './Settings';
import { Shelf } from './Shelf';
import { LongRunSheet, NotifyAskSheet, PaywallSheet } from './sheets';
import { Today } from './Today';

export type Tab = 'today' | 'shelf' | 'settings';
export type Route = { tab: Tab; day?: string; sub?: 'cats' | 'goals' };

export interface Ctx {
  d: AppData;
  now: number;
  set: (f: (d: AppData) => AppData) => void;
  owned: boolean;
  billing: BillingState;
  setBilling: (b: BillingState) => void;
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
  const [paywall, setPaywall] = useState(false);
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
  const running = !!d?.running;
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), running ? 1000 : 30_000);
    const vis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [running]);

  const set = useCallback((f: (d: AppData) => AppData) => setD((cur) => (cur ? f(cur) : cur)), []);

  // 画面を移ったら、知らせは消す
  useEffect(() => { setToast(null); }, [route.tab, route.day, route.sub]);

  const toast = useCallback((msg: string, undo?: () => void) => setToast({ msg, undo, id: Date.now() }), []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToast(null), toastMsg.undo ? 6000 : 2600);
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
  // 買っていないのに有料の相棒・びんになっていたら(復元前・返金後など)無料の物に戻す
  useEffect(() => {
    if (!d || billing.status === 'loading' || owned) return;
    if (d.settings.animal !== D.FREE_ANIMAL || d.settings.jar !== D.FREE_JAR) {
      set((x) => ({ ...x, settings: { ...x.settings, animal: D.FREE_ANIMAL, jar: D.FREE_JAR } }));
    }
  }, [d, owned, billing.status, set]);

  // Android の戻るボタン
  const state = useRef({ paywall, notifyAsk, route });
  state.current = { paywall, notifyAsk, route };
  useEffect(() => {
    const h = CapApp.addListener('backButton', () => {
      const s = state.current;
      if (s.paywall) return setPaywall(false);
      if (s.notifyAsk) return setNotifyAsk(null);
      if (s.route.day || s.route.sub) return setRoute({ tab: s.route.tab });
      if (s.route.tab !== 'today') return setRoute({ tab: 'today' });
      CapApp.minimizeApp();
    });
    return () => { h.then((x) => x.remove()).catch(() => {}); };
  }, []);

  const ctx: Ctx | null = useMemo(() => d && {
    d, now, set, owned, billing, setBilling,
    openPaywall: () => setPaywall(true),
    toast, go: setRoute, route, signal,
  }, [d, now, set, owned, billing, toast, route, signal]);

  if (!d || !ctx) return <div className="boot" aria-busy="true" />;

  if (!d.onboarded) {
    return <Onboarding d={d} onDone={(name) => set((x) => ({ ...x, onboarded: true, settings: { ...x.settings, names: { ...x.settings.names, hamster: name } } }))} />;
  }

  const longRun = !longRunSeen && d.running?.mode === 'focus' && now - d.running.start > CONFIG.longRunHours * HOUR;

  return (
    <div className={'app' + (flash ? ' is-cue' : '')}>
      <main className="main">
        {route.tab === 'today' && <Today ctx={ctx} actions={makeActions(ctx, (f) => setNotifyAsk(() => f))} />}
        {route.tab === 'shelf' && !route.day && <Shelf ctx={ctx} />}
        {route.tab === 'shelf' && route.day && <Day ctx={ctx} dayKey={route.day} />}
        {route.tab === 'settings' && <Settings ctx={ctx} />}
      </main>

      <nav className="tabbar" aria-label="画面の切り替え">
        <TabBtn label="きょう" on={route.tab === 'today'} onClick={() => setRoute({ tab: 'today' })} icon={<IconJar />} />
        <TabBtn label="たな" on={route.tab === 'shelf'} onClick={() => setRoute({ tab: 'shelf' })} icon={<IconShelf />} />
        <TabBtn label="せってい" on={route.tab === 'settings'} onClick={() => setRoute({ tab: 'settings' })} icon={<IconSliders />} />
      </nav>

      {flash && <div className="cue-banner" role="status" key={flash.id}>{flash.msg}</div>}
      {toastMsg && (
        <div className={'toast' + (route.tab === 'today' || route.day ? '' : ' toast-low')} role="status" key={toastMsg.id}>
          <span>{toastMsg.msg}</span>
          {toastMsg.undo && <button className="toast-btn" onClick={() => { toastMsg.undo!(); setToast(null); }}>もとに戻す</button>}
        </div>
      )}

      {paywall && <PaywallSheet ctx={ctx} onClose={() => setPaywall(false)} />}
      {notifyAsk && (
        <NotifyAskSheet
          name={d.settings.names[d.settings.animal]}
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
  rest: () => void;
  resume: () => void;
  stop: () => void;
  pick: (cat: string) => void;
}

/** きょうの画面のボタン。通知の予約もここで */
function makeActions(ctx: Ctx, ask: (f: (() => void) | null) => void): Actions {
  const { d, set, toast } = ctx;
  const name = d.settings.names[d.settings.animal];
  const notifyOn = d.settings.notify === 'on';

  const chime = (start: number) => {
    if (notifyOn && d.settings.chimeMin > 0) {
      scheduleOnce('chime', start + d.settings.chimeMin * MIN, `${d.settings.chimeMin}分たったよ`, `${name}がひと区切りを知らせに来たよ`);
    }
  };

  return {
    start: () => {
      tap();
      const t = Date.now();
      set((x) => D.start(x, t));
      chime(t);
    },
    rest: () => {
      tap();
      const t = Date.now();
      const doRest = () => {
        set((x) => D.rest(x, t));
        scheduleOnce('chime', 0, '', '');
        if (ctxNotify()) scheduleOnce('rest', t + d.settings.restMin * MIN, `${name}が起きたよ`, 'ひとやすみ、おわり。つづける？');
      };
      // 通知は使う直前に聞く(1回だけ)
      if (d.settings.notify === 'unknown') ask(() => { doRest(); });
      else doRest();
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
      if (d.running?.mode === 'focus' && t - d.running.start < D.MIN_SESSION_MS) toast('1分より短いので、記録はしなかったよ');
      else if (d.running?.mode === 'focus') toast('おつかれさま。記録したよ', () => set(() => before));
    },
    pick: (cat) => {
      tap();
      const t = Date.now();
      const wasFocus = d.running?.mode === 'focus' && d.running.cat !== cat;
      set((x) => D.switchCat(x, cat, t));
      if (wasFocus) chime(t);
    },
  };

  // 予約の時点の許可(聞いた直後の答えは保存より先に来るので、ここでは保存済みの値を読み直す)
  function ctxNotify() {
    return lastNotify.value === 'on' || notifyOn;
  }
}

/** 通知の許可の最新の答え(聞いた直後に、保存を待たずに使う) */
export const lastNotify: { value: 'unknown' | 'on' | 'off' } = { value: 'unknown' };
