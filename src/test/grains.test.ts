import { describe, expect, it } from 'vitest';
import { grainsBySession, grainsOfDay, longestStreak, untilNextGrain } from '../domain/grains';
import { MIN, addDays } from '../domain/time';
import type { Category } from '../domain/types';

const at = (h: number, mi = 0) => new Date(2026, 9, 9, h, mi).getTime();
const cats: Category[] = [
  { id: 'a', name: '勉強', color: 'sora', icon: 'book', archived: false },
  { id: 'b', name: '読書', color: 'wakaba', icon: 'read', archived: false },
];

describe('こんぺいとう', () => {
  it('10分ごとに1粒', () => {
    expect(grainsOfDay([{ id: '1', cat: 'a', start: at(9), end: at(9, 9) }], cats, '2026-10-09', 0, 10)).toEqual([]);
    expect(grainsOfDay([{ id: '1', cat: 'a', start: at(9), end: at(9, 10) }], cats, '2026-10-09', 0, 10)).toEqual(['sora']);
    expect(grainsOfDay([{ id: '1', cat: 'a', start: at(9), end: at(10) }], cats, '2026-10-09', 0, 10)).toHaveLength(6);
  });
  it('短い記録が続いても、足して10分ごとに1粒', () => {
    const s = [
      { id: '1', cat: 'a', start: at(9), end: at(9, 6) },
      { id: '2', cat: 'b', start: at(10), end: at(10, 6) },
    ];
    // 6分+6分=12分。10分をまたいだのは読書の途中なので、読書の色
    expect(grainsOfDay(s, cats, '2026-10-09', 0, 10)).toEqual(['wakaba']);
  });
  it('粒の色は時刻順', () => {
    const s = [
      { id: '2', cat: 'b', start: at(11), end: at(11, 20) },
      { id: '1', cat: 'a', start: at(9), end: at(9, 30) },
    ];
    expect(grainsOfDay(s, cats, '2026-10-09', 0, 10)).toEqual(['sora', 'sora', 'sora', 'wakaba', 'wakaba']);
  });
  it('消えた種類の記録は、しろい粒', () => {
    expect(grainsOfDay([{ id: '1', cat: 'zz', start: at(9), end: at(9, 10) }], cats, '2026-10-09', 0, 10)).toEqual(['shiro']);
  });
  it('日付をまたぐ記録は、その日の分だけ粒になる', () => {
    const s = [{ id: '1', cat: 'a', start: new Date(2026, 9, 8, 23, 30).getTime(), end: at(0, 20) }];
    expect(grainsOfDay(s, cats, '2026-10-09', 0, 10)).toHaveLength(2);
    expect(grainsOfDay(s, cats, '2026-10-08', 0, 10)).toHaveLength(3);
  });
  it('つぎの1粒まで', () => {
    expect(untilNextGrain(0, 10)).toBe(10 * MIN);
    expect(untilNextGrain(14 * MIN, 10)).toBe(6 * MIN);
  });
  it('記録ごとの粒(タイムラインの「5粒」)', () => {
    const s = [
      { id: '1', cat: 'a', start: at(9), end: at(9, 50) },
      { id: '2', cat: 'b', start: at(10), end: at(10, 6) },
      { id: '3', cat: 'b', start: at(11), end: at(11, 6) },
    ];
    const m = grainsBySession(s, '2026-10-09', 0, 10);
    expect([m.get('1'), m.get('2'), m.get('3')]).toEqual([5, 0, 1]);
  });
  it('いちばん長く続いた日数', () => {
    expect(longestStreak(new Set(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05']), addDays)).toBe(3);
    expect(longestStreak(new Set(), addDays)).toBe(0);
  });
});
