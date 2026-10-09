import type { CandyColor, Category, Session } from './types';
import { MIN, piecesOfDay } from './time';

/**
 * その日の金平糖。時刻順に時間を足していき、grainMinutes 分をまたぐたびに1粒。
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
