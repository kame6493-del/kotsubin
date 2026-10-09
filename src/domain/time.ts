import type { Session } from './types';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

const pad = (n: number) => String(n).padStart(2, '0');

/** その時刻が属する日の名前 YYYY-MM-DD。1日は dayStartHour 時から始まる */
export function dayKey(ts: number, dayStartHour = 0): string {
  const d = new Date(ts - dayStartHour * HOUR);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

/** その日の始まりと終わり(終わりは含まない) */
export function dayRange(key: string, dayStartHour = 0): [number, number] {
  const { y, m, d } = parseKey(key);
  const a = new Date(y, m - 1, d, dayStartHour, 0, 0, 0).getTime();
  const b = new Date(y, m - 1, d + 1, dayStartHour, 0, 0, 0).getTime();
  return [a, b];
}

export function addDays(key: string, n: number): string {
  const { y, m, d } = parseKey(key);
  const t = new Date(y, m - 1, d + n, 12);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

/** 0=日曜 */
export function weekdayOf(key: string): number {
  const { y, m, d } = parseKey(key);
  return new Date(y, m - 1, d, 12).getDay();
}

const WD = ['日', '月', '火', '水', '木', '金', '土'];
export const weekdayName = (i: number) => WD[i];

export function labelOfDay(key: string): string {
  const { m, d } = parseKey(key);
  return `${m}月${d}日(${WD[weekdayOf(key)]})`;
}

/** 記録のうち [a,b) に入る部分 */
export function overlap(s: { start: number; end: number }, a: number, b: number): number {
  return Math.max(0, Math.min(s.end, b) - Math.max(s.start, a));
}

export interface Piece {
  session: Session;
  from: number;
  to: number;
}

/** その日にかかる記録を、日の範囲で切って時刻順に */
export function piecesOfDay(sessions: Session[], key: string, dayStartHour = 0): Piece[] {
  const [a, b] = dayRange(key, dayStartHour);
  return sessions
    .filter((s) => s.end > a && s.start < b)
    .map((s) => ({ session: s, from: Math.max(s.start, a), to: Math.min(s.end, b) }))
    .sort((p, q) => p.from - q.from);
}

export function totalOfDay(sessions: Session[], key: string, dayStartHour = 0): number {
  return piecesOfDay(sessions, key, dayStartHour).reduce((t, p) => t + (p.to - p.from), 0);
}

/** [fromKey, toKey] の日の合計(両端を含む) */
export function totalBetween(sessions: Session[], fromKey: string, toKey: string, dayStartHour = 0): number {
  const a = dayRange(fromKey, dayStartHour)[0];
  const b = dayRange(toKey, dayStartHour)[1];
  return sessions.reduce((t, s) => t + overlap(s, a, b), 0);
}

export function totalAll(sessions: Session[]): number {
  return sessions.reduce((t, s) => t + Math.max(0, s.end - s.start), 0);
}

/** その日を含む週(日曜はじまり)の [日曜, 土曜] */
export function weekOf(key: string): [string, string] {
  const start = addDays(key, -weekdayOf(key));
  return [start, addDays(start, 6)];
}

/** 「2時間35分」「35分」「0分」 */
export function fmtHM(ms: number): string {
  const m = Math.floor(Math.max(0, ms) / MIN);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}分`;
  if (r === 0) return `${h}時間`;
  return `${h}時間${r}分`;
}

/** 短い形「2:35」(時:分) */
export function fmtShort(ms: number): string {
  const m = Math.floor(Math.max(0, ms) / MIN);
  return `${Math.floor(m / 60)}:${pad(m % 60)}`;
}

/** 動いている時計「24:13」「1:02:03」 */
export function fmtClock(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0 ? `${h}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

/** 「9:05」 */
export function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${pad(d.getMinutes())}`;
}

/** input[type=datetime-local] の値 */
export function toLocalInput(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(v: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
}

/** その月の日の名前を全部 */
export function daysOfMonth(y: number, m: number): string[] {
  const n = new Date(y, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`);
}
