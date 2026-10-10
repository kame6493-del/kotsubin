import { describe, expect, it } from 'vitest';
import { HOUR, MIN, addDays, fmtMS, fmtTime2, weekOfMon, dayKey, dayRange, fmtClock, fmtHM, fmtShort, fromLocalInput, piecesOfDay, toLocalInput, totalAll, totalBetween, totalOfDay, weekOf, weekdayOf } from '../domain/time';

const at = (y: number, m: number, d: number, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const S = (id: string, start: number, end: number, cat = 'a') => ({ id, cat, start, end });

describe('日の名前と区切り', () => {
  it('0時区切りなら、その日の日付', () => {
    expect(dayKey(at(2026, 10, 9, 0, 0))).toBe('2026-10-09');
    expect(dayKey(at(2026, 10, 9, 23, 59))).toBe('2026-10-09');
  });
  it('3時区切りなら、2時台は前の日', () => {
    expect(dayKey(at(2026, 10, 10, 2, 30), 3)).toBe('2026-10-09');
    expect(dayKey(at(2026, 10, 10, 3, 0), 3)).toBe('2026-10-10');
  });
  it('日の範囲は区切りの時刻から24時間', () => {
    const [a, b] = dayRange('2026-10-09', 3);
    expect(a).toBe(at(2026, 10, 9, 3));
    expect(b - a).toBe(24 * HOUR);
  });
  it('月末・年末をまたいで日を足せる', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('曜日と週(日曜はじまり)', () => {
    expect(weekdayOf('2026-10-09')).toBe(5);
    expect(weekOf('2026-10-09')).toEqual(['2026-10-04', '2026-10-10']);
    expect(weekOf('2026-10-04')).toEqual(['2026-10-04', '2026-10-10']);
  });
});

describe('合計', () => {
  it('日付をまたぐ記録は、日ごとに分けて数える', () => {
    const s = [S('x', at(2026, 10, 9, 23, 0), at(2026, 10, 10, 1, 30))];
    expect(totalOfDay(s, '2026-10-09')).toBe(60 * MIN);
    expect(totalOfDay(s, '2026-10-10')).toBe(90 * MIN);
    // 3時区切りなら全部 9日の分
    expect(totalOfDay(s, '2026-10-09', 3)).toBe(150 * MIN);
    expect(totalOfDay(s, '2026-10-10', 3)).toBe(0);
  });
  it('切った記録は時刻順', () => {
    const s = [S('b', at(2026, 10, 9, 15), at(2026, 10, 9, 16)), S('a', at(2026, 10, 9, 9), at(2026, 10, 9, 10))];
    expect(piecesOfDay(s, '2026-10-09').map((p) => p.session.id)).toEqual(['a', 'b']);
  });
  it('期間の合計と全部の合計', () => {
    const s = [S('a', at(2026, 10, 3, 9), at(2026, 10, 3, 10)), S('b', at(2026, 10, 5, 9), at(2026, 10, 5, 11))];
    expect(totalBetween(s, '2026-10-04', '2026-10-10')).toBe(2 * HOUR);
    expect(totalAll(s)).toBe(3 * HOUR);
  });
});

describe('表示の形', () => {
  it('時間と分', () => {
    expect(fmtHM(0)).toBe('0分');
    expect(fmtHM(59 * 1000)).toBe('0分');
    expect(fmtHM(35 * MIN)).toBe('35分');
    expect(fmtHM(2 * HOUR)).toBe('2時間');
    expect(fmtHM(155 * MIN)).toBe('2時間35分');
    expect(fmtShort(155 * MIN)).toBe('2:35');
  });
  it('動いている時計', () => {
    expect(fmtClock(0)).toBe('00:00');
    expect(fmtClock(24 * MIN + 13_000)).toBe('24:13');
    expect(fmtClock(HOUR + 2 * MIN + 3000)).toBe('1:02:03');
  });
  it('日時の入力欄の値と行き来できる', () => {
    const t = at(2026, 10, 9, 7, 5);
    expect(toLocalInput(t)).toBe('2026-10-09T07:05');
    expect(fromLocalInput('2026-10-09T07:05')).toBe(t);
    expect(fromLocalInput('')).toBeNull();
  });
});

describe('月曜はじまりの週(たな・ふりかえり)と表の形', () => {
  it('weekOfMon・fmtMS・fmtTime2', () => {
    expect(weekOfMon('2026-10-09')).toEqual(['2026-10-05', '2026-10-11']);
    expect(weekOfMon('2026-10-11')).toEqual(['2026-10-05', '2026-10-11']);
    expect(weekOfMon('2026-10-12')).toEqual(['2026-10-12', '2026-10-18']);
    expect(fmtMS(5 * 60_000 + 50_000)).toBe('05:50');
    expect(fmtTime2(new Date(2026, 9, 9, 9, 5).getTime())).toBe('09:05');
  });
});
