import { isCandy } from './colors';
import { DAY, MIN } from './time';
import type { AnimalId, AppData, Category, JarId, Running, Session, Settings, Theme } from './types';

export const ANIMALS: AnimalId[] = ['hamster', 'enaga', 'usagi', 'pengin'];
export const FREE_ANIMAL: AnimalId = 'hamster';
export const JARS: JarId[] = ['round', 'square', 'pot'];
export const FREE_JAR: JarId = 'round';

export const DEFAULT_NAMES: Record<AnimalId, string> = { hamster: 'もち', enaga: 'ゆき', usagi: 'しらたま', pengin: 'あずき' };

/** 押し間違いで残る短い記録は捨てる */
export const MIN_SESSION_MS = MIN;

let seq = 0;
export function newId(now = Date.now()): string {
  seq = (seq + 1) % 1296;
  return now.toString(36) + seq.toString(36).padStart(2, '0') + Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
}

export function defaultCategories(): Category[] {
  return [
    { id: 'c-study', name: '勉強', color: 'sora', archived: false },
    { id: 'c-work', name: '仕事', color: 'kinako', archived: false },
    { id: 'c-make', name: '創作', color: 'momo', archived: false },
    { id: 'c-read', name: '読書', color: 'wakaba', archived: false },
    { id: 'c-home', name: '家のこと', color: 'mikan', archived: false },
  ];
}

export function defaultSettings(): Settings {
  return {
    animal: FREE_ANIMAL,
    names: { ...DEFAULT_NAMES },
    jar: FREE_JAR,
    restMin: 10,
    chimeMin: 0,
    dayStartHour: 0,
    goals: [120, 120, 120, 120, 120, 120, 120],
    theme: 'auto',
    notify: 'unknown',
  };
}

export function emptyData(): AppData {
  const categories = defaultCategories();
  return { v: 1, onboarded: false, categories, currentCat: categories[0].id, sessions: [], running: null, settings: defaultSettings() };
}

const num = (v: unknown, lo: number, hi: number, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d;

/** 保存してあった物を今の形に読み替える。壊れた所は初期値で埋め、記録はできるだけ残す */
export function normalize(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;

  const cats: Category[] = Array.isArray(r.categories)
    ? (r.categories as unknown[]).flatMap((c) => {
        const o = c as Record<string, unknown>;
        if (!o || typeof o.id !== 'string' || typeof o.name !== 'string') return [];
        return [{ id: o.id, name: o.name.slice(0, 20) || '作業', color: isCandy(o.color) ? o.color : 'shiro', archived: !!o.archived }];
      })
    : [];
  const categories = cats.length ? cats : base.categories;
  if (!categories.some((c) => !c.archived)) categories[0] = { ...categories[0], archived: false };
  const ids = new Set(categories.map((c) => c.id));

  const sessions: Session[] = Array.isArray(r.sessions)
    ? (r.sessions as unknown[]).flatMap((s) => {
        const o = s as Record<string, unknown>;
        if (!o || typeof o.start !== 'number' || typeof o.end !== 'number' || !(o.end > o.start)) return [];
        const cat = typeof o.cat === 'string' && ids.has(o.cat) ? o.cat : categories[0].id;
        return [{ id: typeof o.id === 'string' ? o.id : newId(o.start), cat, start: o.start, end: o.end }];
      })
    : [];
  sessions.sort((a, b) => a.start - b.start);

  let running: Running = null;
  const ru = r.running as Record<string, unknown> | null | undefined;
  if (ru && (ru.mode === 'focus' || ru.mode === 'rest') && typeof ru.start === 'number') {
    const cat = typeof ru.cat === 'string' && ids.has(ru.cat) ? ru.cat : categories[0].id;
    running = { mode: ru.mode, cat, start: ru.start };
  }

  const st = (r.settings ?? {}) as Record<string, unknown>;
  const d = base.settings;
  const names = { ...d.names };
  if (st.names && typeof st.names === 'object') {
    for (const a of ANIMALS) {
      const v = (st.names as Record<string, unknown>)[a];
      if (typeof v === 'string' && v.trim()) names[a] = v.trim().slice(0, 12);
    }
  }
  const goals = Array.isArray(st.goals) && st.goals.length === 7 ? (st.goals as unknown[]).map((g) => num(g, 0, 24 * 60, 120)) : d.goals;
  const settings: Settings = {
    animal: ANIMALS.includes(st.animal as AnimalId) ? (st.animal as AnimalId) : d.animal,
    names,
    jar: JARS.includes(st.jar as JarId) ? (st.jar as JarId) : d.jar,
    restMin: num(st.restMin, 1, 120, d.restMin),
    chimeMin: num(st.chimeMin, 0, 240, d.chimeMin),
    dayStartHour: num(st.dayStartHour, 0, 5, d.dayStartHour),
    goals,
    theme: (['auto', 'light', 'dark'] as Theme[]).includes(st.theme as Theme) ? (st.theme as Theme) : d.theme,
    notify: st.notify === 'on' || st.notify === 'off' ? st.notify : 'unknown',
  };

  const currentCat = typeof r.currentCat === 'string' && categories.some((c) => c.id === r.currentCat && !c.archived)
    ? r.currentCat
    : categories.find((c) => !c.archived)!.id;

  return { v: 1, onboarded: !!r.onboarded, categories, currentCat, sessions, running, settings };
}

/* ---------- 記録の操作。どれも新しい AppData を返す ---------- */

function closeFocus(d: AppData, now: number): Session[] {
  const r = d.running;
  if (!r || r.mode !== 'focus') return d.sessions;
  const end = Math.max(now, r.start);
  if (end - r.start < MIN_SESSION_MS) return d.sessions;
  return [...d.sessions, { id: newId(now), cat: r.cat, start: r.start, end }];
}

export function start(d: AppData, now: number): AppData {
  if (d.running?.mode === 'focus') return d;
  return { ...d, running: { mode: 'focus', cat: d.currentCat, start: now } };
}

export function rest(d: AppData, now: number): AppData {
  if (d.running?.mode !== 'focus') return d;
  return { ...d, sessions: closeFocus(d, now), running: { mode: 'rest', cat: d.running.cat, start: now } };
}

export function resume(d: AppData, now: number): AppData {
  if (d.running?.mode !== 'rest') return d;
  return { ...d, running: { mode: 'focus', cat: d.currentCat, start: now } };
}

export function stop(d: AppData, now: number): AppData {
  if (!d.running) return d;
  return { ...d, sessions: closeFocus(d, now), running: null };
}

/** 作業の種類を選ぶ。作業中なら、そこで区切って新しい種類で続ける */
export function switchCat(d: AppData, cat: string, now: number): AppData {
  if (!d.categories.some((c) => c.id === cat && !c.archived)) return d;
  if (d.running?.mode === 'focus' && d.running.cat !== cat) {
    return { ...d, currentCat: cat, sessions: closeFocus(d, now), running: { mode: 'focus', cat, start: now } };
  }
  if (d.running?.mode === 'rest') return { ...d, currentCat: cat, running: { ...d.running, cat } };
  return { ...d, currentCat: cat };
}

/** つけっぱなしだった作業を、指定の時刻で終わったことにする */
export function endRunningAt(d: AppData, end: number): AppData {
  if (d.running?.mode !== 'focus') return { ...d, running: null };
  return { ...d, sessions: closeFocus(d, Math.max(end, d.running.start)), running: null };
}

/** 記録の中身が正しいか。だめなら理由の一文 */
export function checkSession(s: { start: number; end: number }, now: number): string | null {
  if (!Number.isFinite(s.start) || !Number.isFinite(s.end)) return '時刻を入れてね';
  if (s.end <= s.start) return '終わりは始まりより後にしてね';
  if (s.end - s.start > DAY) return '1回の記録は24時間までにしてね';
  if (s.end > now + MIN) return 'まだ来ていない時刻は入れられないよ';
  return null;
}

const sortS = (a: Session[]) => [...a].sort((x, y) => x.start - y.start);

export function addSession(d: AppData, s: Omit<Session, 'id'>, now: number): AppData {
  return { ...d, sessions: sortS([...d.sessions, { ...s, id: newId(now) }]) };
}

export function updateSession(d: AppData, s: Session): AppData {
  return { ...d, sessions: sortS(d.sessions.map((x) => (x.id === s.id ? s : x))) };
}

export function deleteSession(d: AppData, id: string): AppData {
  return { ...d, sessions: d.sessions.filter((x) => x.id !== id) };
}

export function restoreSession(d: AppData, s: Session): AppData {
  if (d.sessions.some((x) => x.id === s.id)) return d;
  return { ...d, sessions: sortS([...d.sessions, s]) };
}

/* ---------- 作業の種類 ---------- */

export const activeCats = (d: AppData) => d.categories.filter((c) => !c.archived);
export const archivedCats = (d: AppData) => d.categories.filter((c) => c.archived);

export function addCategory(d: AppData, name: string, color: Category['color'], now: number): AppData {
  const n = name.trim().slice(0, 20);
  if (!n) return d;
  return { ...d, categories: [...d.categories, { id: 'c-' + newId(now), name: n, color, archived: false }] };
}

export function updateCategory(d: AppData, id: string, patch: Partial<Pick<Category, 'name' | 'color'>>): AppData {
  return {
    ...d,
    categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch, name: (patch.name ?? c.name).trim().slice(0, 20) || c.name } : c)),
  };
}

/** しまう。最後の1つはしまえない。選んでいた物なら、残っている先頭に切り替える */
export function archiveCategory(d: AppData, id: string, now: number): AppData {
  if (activeCats(d).length <= 1) return d;
  let next: AppData = { ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, archived: true } : c)) };
  if (d.currentCat === id) next = switchCat({ ...next, categories: next.categories }, activeCats(next)[0].id, now);
  return next;
}

export function restoreCategory(d: AppData, id: string): AppData {
  return { ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, archived: false } : c)) };
}

/** 並べ替え。dir=-1 で上へ、+1 で下へ(しまっていない物の中で) */
export function moveCategory(d: AppData, id: string, dir: -1 | 1): AppData {
  const act = activeCats(d);
  const i = act.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= act.length) return d;
  const order = [...act];
  [order[i], order[j]] = [order[j], order[i]];
  return { ...d, categories: [...order, ...archivedCats(d)] };
}

/** 動いている作業も入れた記録(表示用) */
export function sessionsWithRunning(d: AppData, now: number): Session[] {
  if (d.running?.mode !== 'focus' || now <= d.running.start) return d.sessions;
  return [...d.sessions, { id: 'running', cat: d.running.cat, start: d.running.start, end: now }];
}

export function goalOf(d: AppData, weekday: number): number {
  return d.settings.goals[weekday] ?? 0;
}
