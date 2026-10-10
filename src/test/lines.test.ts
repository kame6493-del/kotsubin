import { describe, expect, it } from 'vitest';
import { dayLine, lineFor, weekComment, type LineContext } from '../domain/lines';

const base: LineContext = { mode: 'idle', hour: 9, todayMs: 0, goalMs: 0, sessionMs: 0, firstTime: false, seed: 0 };
const MIN = 60_000;
const MODES = ['idle', 'focus', 'pause', 'rest', 'restOver'] as const;

describe('相棒のひとこと', () => {
  it('はじめての人には使い方', () => {
    expect(lineFor({ ...base, firstTime: true })).toContain('はじめる');
  });
  it('目標をこえた回だけ知らせる', () => {
    expect(lineFor({ ...base, mode: 'focus', todayMs: 125 * MIN, goalMs: 120 * MIN, sessionMs: 30 * MIN })).toBe('きょうの目標、とどいたよ');
    expect(lineFor({ ...base, mode: 'focus', todayMs: 200 * MIN, goalMs: 120 * MIN, sessionMs: 30 * MIN })).not.toBe('きょうの目標、とどいたよ');
  });
  it('ひとやすみの終わり', () => {
    expect(lineFor({ ...base, mode: 'restOver' })).toMatch(/おきた|寝た|おわり/);
  });
  it('どの場面でも言葉が出て、英語とせかす言葉が無い', () => {
    const all = new Set<string>();
    for (const mode of MODES)
      for (let seed = 0; seed < 30; seed++)
        for (const hour of [2, 8, 14, 21])
          for (const s of [0, 5, 70, 130]) all.add(lineFor({ ...base, mode, seed, hour, sessionMs: s * MIN, todayMs: s * MIN, goalMs: 60 * MIN, firstTime: seed === 3 }));
    expect(all.size).toBeGreaterThan(20);
    for (const l of all) {
      expect(l.length).toBeGreaterThan(2);
      expect(l).not.toMatch(/[A-Za-z]/);
      expect(l).not.toMatch(/してください|しなさい|サボ/);
    }
  });
  it('たなの吹き出しと、ふりかえりのコメント', () => {
    expect(dayLine(0, 60 * MIN, true, 1)).toContain('空っぽ');
    expect(dayLine(90 * MIN, 60 * MIN, false, 1).length).toBeGreaterThan(5);
    expect(weekComment(0, 0, 0)[0]).toContain('ひと休み');
    expect(weekComment(600 * MIN, 300 * MIN, 5)[0]).toContain('先週');
    for (const t of [...weekComment(100 * MIN, 0, 2), ...weekComment(600 * MIN, 0, 6)]) expect(t).not.toMatch(/[A-Za-z]|してください/);
  });
});
