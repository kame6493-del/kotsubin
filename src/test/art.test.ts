import { describe, expect, it } from 'vitest';
import { LAYOUT, tierFor } from '../art/assets';
import { sample } from '../art/Jar';
import { CANDY_ORDER } from '../domain/colors';
import type { JarId } from '../domain/types';

/** public/art にある絵の名前(Vite の glob で数える) */
const HAVE = new Set(Object.keys(import.meta.glob('../../public/art/*.webp')).map((p) => p.split('/').pop()!.replace('.webp', '')));

describe('見本から切り出した絵', () => {
  it('使う絵がそろっている(粒は全部の色)', () => {
    const need = ['plate_focus', 'plate_rest', 'plate_shelf', 'plate_review', 'plate_set', 'nakama_shelf', 'jar_std', 'jar_hoshi', 'jar_maru', 'jar_maru_front', 'bow_std', 'tag_std',
      'cab_head', 'cab_row', 'cab_bottom', 'cell_jar', 'logo', ...Object.keys(LAYOUT.sprites)];
    for (const n of [...need, ...CANDY_ORDER.map((c) => `candy_${c}`)]) expect(HAVE.has(n), n).toBe(true);
  });
  it('粒の置き場所は、びんの中に収まり、重ならず、下から積もる', () => {
    for (const jar of ['std', 'hoshi', 'maru'] as JarId[]) {
      const j = LAYOUT.jars[jar];
      for (const t of j.tiers) {
        expect(t.slots.length, jar).toBeGreaterThan(3);
        const seen = new Set<string>();
        for (const [x, y] of t.slots) {
          expect(x).toBeGreaterThan(0);
          expect(x).toBeLessThan(j.w);
          expect(y).toBeGreaterThan(0);
          expect(y).toBeLessThan(j.h);
          const k = `${Math.round(x / 8)},${Math.round(y / 8)}`;
          expect(seen.has(k)).toBe(false);
          seen.add(k);
        }
        expect(t.slots[0][1]).toBeGreaterThan(t.slots[t.slots.length - 1][1]);
      }
    }
  });
  it('粒が増えると小さい粒の段に切り替わり、スタンダードは1日8時間ぶん近く(45粒以上)入る', () => {
    expect(tierFor('std', 5).d).toBeGreaterThan(tierFor('std', 40).d);
    expect(LAYOUT.jars.std.tiers.at(-1)!.slots.length).toBeGreaterThanOrEqual(45);
  });
  it('棚の升に出す粒は、色の割合を保って9粒まで', () => {
    const c = [...Array(20).fill('sora'), ...Array(10).fill('mikan')];
    const s = sample(c, 9);
    expect(s).toHaveLength(9);
    expect(s.filter((x) => x === 'sora').length).toBe(6);
    expect(sample(['sora'], 9)).toEqual(['sora']);
  });
});
