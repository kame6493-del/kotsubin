import { useState } from 'react';
import { Candy } from '../art/Jar';
import { CANDY, CANDY_ORDER } from '../domain/colors';
import * as D from '../domain/data';
import { HOUR, MIN, fmtHM, fromLocalInput, toLocalInput } from '../domain/time';
import type { CandyColor, CatIcon, Category, Session } from '../domain/types';
import { tap } from '../platform/native';
import type { Ctx } from './App';
import { CatGlyph, IconSave, IconTrash } from './icons';
import { Sheet } from './Sheet';

/* ---------- 記録を直す・足す ---------- */

export function SessionSheet({ ctx, initial, defaultStart, onClose }: { ctx: Ctx; initial?: Session; defaultStart: number; onClose: () => void }) {
  const { d, set, toast } = ctx;
  const cats = D.activeCats(d);
  const [cat, setCat] = useState(initial ? initial.cat : d.currentCat);
  const [start, setStart] = useState(toLocalInput(initial?.start ?? defaultStart));
  const [end, setEnd] = useState(toLocalInput(initial?.end ?? Math.min(Date.now(), defaultStart + HOUR)));
  const [note, setNote] = useState(initial?.note ?? '');
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
    const n = note.trim().slice(0, 40);
    const body = { cat, start: s!, end: e!, ...(n ? { note: n } : {}) };
    if (initial) set((x) => D.updateSession(x, { id: initial.id, ...body }));
    else set((x) => D.addSession(x, body, now));
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
        <div className="cat-tabs wrap" role="radiogroup" aria-labelledby="f-cat">
          {shown.map((c) => (
            <button key={c.id} className={'cat-tab' + (c.id === cat ? ' on' : '')} role="radio" aria-checked={c.id === cat} onClick={() => setCat(c.id)}
              style={{ ['--c' as string]: CANDY[c.color].ink, ['--cs' as string]: CANDY[c.color].soft }}>
              <CatGlyph icon={c.icon} size={20} />
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
      <label className="field">
        <span className="field-label">なにをした？(なくてもいいよ)</span>
        <input className="input" value={note} maxLength={40} placeholder="たとえば 英単語の復習" onChange={(ev) => setNote(ev.target.value)} />
      </label>
      <p className={'field-note num' + (err ? ' is-err' : '')} role={err ? 'alert' : undefined}>{err ?? (len ? `${fmtHM(len)}の記録になるよ` : '')}</p>
      <button className="btn btn-primary btn-big" onClick={save}><IconSave size={22} />{initial ? 'これで直す' : 'これで足す'}</button>
      {initial && <button className="btn btn-text btn-alert" onClick={remove}><IconTrash size={20} />この記録を消す</button>}
    </Sheet>
  );
}

/* ---------- 作業の種類を直す・足す ---------- */

export function CategorySheet({ ctx, initial, onClose }: { ctx: Ctx; initial?: Category; onClose: () => void }) {
  const { d, set, toast } = ctx;
  const used = new Set(D.activeCats(d).map((c) => c.color));
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState<CandyColor>(initial?.color ?? CANDY_ORDER.find((c) => !used.has(c)) ?? 'momo');
  const [icon, setIcon] = useState<CatIcon | null>(initial?.icon ?? null);
  const canArchive = initial && !initial.archived && D.activeCats(d).length > 1;
  const shownIcon = icon ?? D.guessIcon(name);

  const save = () => {
    const n = name.trim();
    if (!n) return;
    tap();
    if (initial) set((x) => D.updateCategory(x, initial.id, { name: n, color, icon: shownIcon }));
    else set((x) => D.addCategory(x, n, color, Date.now(), shownIcon));
    onClose();
  };

  return (
    <Sheet title={initial ? '種類を直す' : '種類を足す'} onClose={onClose}>
      <label className="field">
        <span className="field-label">名前</span>
        <input className="input" value={name} maxLength={20} placeholder="たとえば 英語、ピアノ" onChange={(e) => setName(e.target.value)} autoFocus={!initial} />
      </label>
      <div className="field">
        <div className="field-label" id="f-color">こんぺいとうの色</div>
        <div className="swatches" role="radiogroup" aria-labelledby="f-color">
          {CANDY_ORDER.map((c) => (
            <button key={c} className={'swatch' + (c === color ? ' on' : '')} role="radio" aria-checked={c === color} aria-label={CANDY[c].label} onClick={() => setColor(c)}>
              <Candy color={c} size={34} />
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <div className="field-label" id="f-icon">しるし</div>
        <div className="swatches" role="radiogroup" aria-labelledby="f-icon" style={{ color: CANDY[color].ink }}>
          {D.ICONS.map((i) => (
            <button key={i} className={'swatch' + (i === shownIcon ? ' on' : '')} role="radio" aria-checked={i === shownIcon} aria-label={ICON_LABEL[i]} onClick={() => setIcon(i)}>
              <CatGlyph icon={i} size={26} />
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-primary btn-big" disabled={!name.trim()} onClick={save}><IconSave size={22} />{initial ? 'これで直す' : 'これで足す'}</button>
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

const ICON_LABEL: Record<CatIcon, string> = { book: '本', bag: 'かばん', read: '読書', game: 'ゲーム', pen: 'えんぴつ', music: '音楽', home: '家', star: 'ほし', run: '運動', code: 'パソコン' };

/* ---------- その日のメモ ---------- */

export function MemoSheet({ ctx, dayKey, onClose }: { ctx: Ctx; dayKey: string; onClose: () => void }) {
  const [text, setText] = useState(ctx.d.memos[dayKey] ?? '');
  return (
    <Sheet title="この日のメモ" onClose={onClose}>
      <label className="field">
        <span className="field-label">メモ(400字まで)</span>
        <textarea className="input textarea" value={text} maxLength={400} rows={5} placeholder="きょうできたこと、気づいたこと" onChange={(e) => setText(e.target.value)} />
      </label>
      <button className="btn btn-primary btn-big" onClick={() => { tap(); ctx.set((x) => D.setMemo(x, dayKey, text)); ctx.toast(text.trim() ? 'メモを残したよ' : 'メモを消したよ'); onClose(); }}><IconSave size={22} />保存</button>
    </Sheet>
  );
}

/* ---------- 通知を使っていいか(使う直前に1回) ---------- */

export function NotifyAskSheet({ name, onAnswer }: { name: string; onAnswer: (yes: boolean) => void }) {
  return (
    <Sheet title="起きたら知らせてもいい？" onClose={() => onAnswer(false)}>
      <p className="sheet-text">休憩が終わったら、画面を消していても{name}が通知で知らせます。通知はそれ以外に使いません。</p>
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

/** 見本の画面写真用の、色のまざった粒 */
export function demoColors(n: number): CandyColor[] {
  const order: CandyColor[] = ['sora', 'mikan', 'wakaba', 'fuji', 'kinako', 'momo', 'sora', 'wakaba'];
  return Array.from({ length: n }, (_, i) => order[(i * 5) % order.length]);
}
