import { useState } from 'react';
import { AnimalMini, Grain, JarMini } from '../art/Mini';
import { CANDY, CANDY_ORDER } from '../domain/colors';
import * as D from '../domain/data';
import { HOUR, MIN, fmtHM, fromLocalInput, toLocalInput } from '../domain/time';
import type { CandyColor, Category, Session } from '../domain/types';
import { purchase, restore } from '../platform/billing';
import { tap } from '../platform/native';
import type { Ctx } from './App';
import { Sheet } from './Sheet';

/* ---------- 記録を直す・足す ---------- */

export function SessionSheet({ ctx, initial, defaultStart, onClose }: { ctx: Ctx; initial?: Session; defaultStart: number; dayKey: string; onClose: () => void }) {
  const { d, set, toast } = ctx;
  const cats = D.activeCats(d);
  const startCat = initial ? initial.cat : d.currentCat;
  const [cat, setCat] = useState(startCat);
  const [start, setStart] = useState(toLocalInput(initial?.start ?? defaultStart));
  const [end, setEnd] = useState(toLocalInput(initial?.end ?? Math.min(Date.now(), defaultStart + HOUR)));
  const [err, setErr] = useState<string | null>(null);
  const s = fromLocalInput(start);
  const e = fromLocalInput(end);
  const len = s !== null && e !== null && e > s ? e - s : 0;
  // しまった種類の記録を直すときは、その種類も選べるように出す
  const shown = initial && !cats.some((c) => c.id === initial.cat) ? [...cats, d.categories.find((c) => c.id === initial.cat)!].filter(Boolean) : cats;

  const save = () => {
    const now = Date.now();
    const why = s === null || e === null ? '時刻を入れてね' : D.checkSession({ start: s, end: e }, now);
    if (why) { setErr(why); return; }
    tap();
    if (initial) set((x) => D.updateSession(x, { ...initial, cat, start: s!, end: e! }));
    else set((x) => D.addSession(x, { cat, start: s!, end: e! }, now));
    toast(initial ? '直したよ' : '記録を足したよ');
    onClose();
  };

  const remove = () => {
    if (!initial) return;
    tap();
    set((x) => D.deleteSession(x, initial.id));
    toast('記録を消したよ', () => set((x) => D.restoreSession(x, initial)));
    onClose();
  };

  return (
    <Sheet title={initial ? '記録を直す' : '記録を足す'} onClose={onClose}>
      <div className="field">
        <div className="field-label" id="f-cat">作業の種類</div>
        <div className="chips chips-wrap" role="radiogroup" aria-labelledby="f-cat">
          {shown.map((c) => (
            <button key={c.id} className={'chip' + (c.id === cat ? ' on' : '')} role="radio" aria-checked={c.id === cat} onClick={() => setCat(c.id)}>
              <Grain color={CANDY[c.color].hex} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span className="field-label">はじめ</span>
        <input className="input num" type="datetime-local" value={start} onChange={(ev) => { setStart(ev.target.value); setErr(null); }} />
      </label>
      <label className="field">
        <span className="field-label">おわり</span>
        <input className="input num" type="datetime-local" value={end} onChange={(ev) => { setEnd(ev.target.value); setErr(null); }} />
      </label>
      <p className={'field-note num' + (err ? ' is-err' : '')} role={err ? 'alert' : undefined}>{err ?? (len ? `${fmtHM(len)}の記録になるよ` : '')}</p>
      <button className="btn btn-primary btn-big" onClick={save}>{initial ? 'これで直す' : 'これで足す'}</button>
      {initial && <button className="btn btn-text btn-alert" onClick={remove}>この記録を消す</button>}
    </Sheet>
  );
}

/* ---------- 作業の種類を直す・足す ---------- */

export function CategorySheet({ ctx, initial, onClose }: { ctx: Ctx; initial?: Category; onClose: () => void }) {
  const { d, set, toast } = ctx;
  const used = new Set(D.activeCats(d).map((c) => c.color));
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState<CandyColor>(initial?.color ?? CANDY_ORDER.find((c) => !used.has(c)) ?? 'momo');
  const canArchive = initial && !initial.archived && D.activeCats(d).length > 1;

  const save = () => {
    const n = name.trim();
    if (!n) return;
    tap();
    if (initial) set((x) => D.updateCategory(x, initial.id, { name: n, color }));
    else set((x) => D.addCategory(x, n, color, Date.now()));
    onClose();
  };

  return (
    <Sheet title={initial ? '種類を直す' : '種類を足す'} onClose={onClose}>
      <label className="field">
        <span className="field-label">名前</span>
        <input className="input" value={name} maxLength={20} placeholder="たとえば 英語、ピアノ" onChange={(e) => setName(e.target.value)} autoFocus={!initial} />
      </label>
      <div className="field">
        <div className="field-label" id="f-color">金平糖の色</div>
        <div className="swatches" role="radiogroup" aria-labelledby="f-color">
          {CANDY_ORDER.map((c) => (
            <button key={c} className={'swatch' + (c === color ? ' on' : '')} role="radio" aria-checked={c === color} aria-label={CANDY[c].label} onClick={() => setColor(c)}>
              <Grain color={CANDY[c].hex} scale={5} />
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-primary btn-big" disabled={!name.trim()} onClick={save}>{initial ? 'これで直す' : 'これで足す'}</button>
      {canArchive && (
        <button
          className="btn btn-text"
          onClick={() => {
            set((x) => D.archiveCategory(x, initial!.id, Date.now()));
            toast(`「${initial!.name}」をしまったよ。記録は残っています`, () => set((x) => D.restoreCategory(x, initial!.id)));
            onClose();
          }}
        >
          この種類をしまう
        </button>
      )}
    </Sheet>
  );
}

/* ---------- なかまセット ---------- */

export function PaywallSheet({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const { billing, setBilling, toast } = ctx;
  const [busy, setBusy] = useState(false);
  const owned = billing.owned;

  const buy = async () => {
    setBusy(true);
    try {
      const ok = await purchase(billing);
      if (ok) {
        setBilling({ ...billing, owned: true } as typeof billing);
        toast('なかまがふえたよ。せっていで選べます');
        onClose();
      }
    } catch (e) {
      console.error(e);
      toast('購入できませんでした。時間をおいてもう一度ためしてね');
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    setBusy(true);
    try {
      const ok = await restore();
      if (ok) { setBilling({ ...billing, owned: true } as typeof billing); toast('購入を復元したよ'); onClose(); }
      else toast('このアカウントで買った記録は見つかりませんでした');
    } catch {
      toast('復元できませんでした。通信を確かめてね');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="なかまセット" onClose={onClose}>
      <div className="pay-art" aria-hidden>
        <AnimalMini animal="enaga" scale={3} hold={CANDY.sora.hex} />
        <AnimalMini animal="usagi" scale={3} hold={CANDY.momo.hex} />
        <AnimalMini animal="pengin" scale={3} hold={CANDY.kinako.hex} />
      </div>
      <div className="pay-art pay-jars" aria-hidden>
        <JarMini jar="square" colors={demoColors(26)} scale={2} />
        <JarMini jar="pot" colors={demoColors(20)} scale={2} />
      </div>
      <ul className="pay-list">
        <li>相棒が3匹ふえます(シマエナガ・うさぎ・ペンギン)</li>
        <li>びんの形が2つふえます(かくびん・つぼ)</li>
        <li>一度買えばずっと使えます。毎月の支払いはありません</li>
      </ul>
      <p className="pay-note">記録の機能はぜんぶ無料のままです。あとから有料にすることはありません。</p>
      {owned ? (
        <p className="pay-owned">もう持っています。せっていの「相棒」と「びん」から選べます。</p>
      ) : billing.status === 'ready' ? (
        <button className="btn btn-primary btn-big" disabled={busy} onClick={buy}>{billing.price}で買う</button>
      ) : (
        <button className="btn btn-primary btn-big" disabled>{billing.status === 'loading' ? 'ストアを確かめています' : billing.reason}</button>
      )}
      {!owned && <button className="btn btn-text" disabled={busy} onClick={doRestore}>購入を復元</button>}
    </Sheet>
  );
}

export function demoColors(n: number): string[] {
  const order = ['sora', 'sora', 'kinako', 'momo', 'wakaba', 'sora', 'fuji', 'mikan'] as const;
  return Array.from({ length: n }, (_, i) => CANDY[order[Math.floor(i / 4) % order.length]].hex);
}

/* ---------- 通知を使っていいか(使う直前に1回) ---------- */

export function NotifyAskSheet({ name, onAnswer }: { name: string; onAnswer: (yes: boolean) => void }) {
  return (
    <Sheet title="起きたら知らせてもいい？" onClose={() => onAnswer(false)}>
      <p className="sheet-text">ひとやすみが終わったら、画面を消していても{name}が通知で知らせます。通知はそれ以外に使いません。</p>
      <button className="btn btn-primary btn-big" onClick={() => onAnswer(true)}>知らせてほしい</button>
      <button className="btn btn-text" onClick={() => onAnswer(false)}>いまはいい</button>
    </Sheet>
  );
}

/* ---------- つけっぱなしの確認 ---------- */

export function LongRunSheet({ start, now, onKeep, onEnd }: { start: number; now: number; onKeep: () => void; onEnd: (end: number) => void }) {
  const [end, setEnd] = useState(toLocalInput(Math.min(now, start + 2 * HOUR)));
  const t = fromLocalInput(end);
  const bad = t === null || t <= start || t > now + MIN;
  return (
    <Sheet title={`${fmtHM(now - start)}つけっぱなしだよ`} onClose={onKeep}>
      <p className="sheet-text">押し忘れていたら、終わった時刻を入れてね。その時刻までを記録します。</p>
      <label className="field">
        <span className="field-label">終わった時刻</span>
        <input className="input num" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
      </label>
      <button className="btn btn-primary btn-big" disabled={bad} onClick={() => t && onEnd(t)}>この時刻で終わり</button>
      <button className="btn btn-text" onClick={onKeep}>まだ続けている</button>
    </Sheet>
  );
}
