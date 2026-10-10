import type { CandyColor, Category, Session } from './types';
import { MIN, piecesOfDay } from './time';

/**
 * その日のこんぺいとう。時刻順に時間を足していき、grainMinutes 分をまたぐたびに1粒。
 * 粒の色は、またいだ瞬間にやっていた作業の種類の色。
 */
export function grainsOfDay(
  sessions: Session[],
  categories: Category[],
  key: string,
  dayStartHour: number,
  grainMinutes: number,
): CandyColor[] {
  const unit = grainMinutes * MIN;
  const colorOf = new Map(categories.map((c) => [c.id, c.color]));
  const out: CandyColor[] = [];
  let cum = 0;
  for (const p of piecesOfDay(sessions, key, dayStartHour)) {
    const before = cum;
    cum += p.to - p.from;
    const n = Math.floor(cum / unit) - Math.floor(before / unit);
    const color = colorOf.get(p.session.cat) ?? 'shiro';
    for (let i = 0; i < n; i++) out.push(color);
  }
  return out;
}

/** つぎの1粒まであと何ミリ秒か */
export function untilNextGrain(totalMs: number, grainMinutes: number): number {
  const unit = grainMinutes * MIN;
  return unit - (totalMs % unit);
}

/** その日の、記録ごとの粒の数(記録の id → 粒)。粒は「10分をまたいだ瞬間の記録」に数える */
export function grainsBySession(sessions: Session[], key: string, dayStartHour: number, grainMinutes: number): Map<string, number> {
  const unit = grainMinutes * MIN;
  const out = new Map<string, number>();
  let cum = 0;
  for (const p of piecesOfDay(sessions, key, dayStartHour)) {
    const before = cum;
    cum += p.to - p.from;
    const n = Math.floor(cum / unit) - Math.floor(before / unit);
    out.set(p.session.id, (out.get(p.session.id) ?? 0) + n);
  }
  return out;
}

/** 1日ずつ: その日に記録があったか。いちばん長く続いた日数 */
export function longestStreak(keys: Set<string>, addDays: (k: string, n: number) => string): number {
  let best = 0;
  for (const k of keys) {
    if (keys.has(addDays(k, -1))) continue;
    let n = 1;
    let c = k;
    while (keys.has((c = addDays(c, 1)))) n++;
    best = Math.max(best, n);
  }
  return best;
}
