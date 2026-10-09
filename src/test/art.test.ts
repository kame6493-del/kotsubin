import { describe, expect, it } from 'vitest';
import { SPRITES, jarSlots, rowsOf, type Variant } from '../art/draw';

describe('ドット絵の格子', () => {
  it('どの相棒もどの形でも、行の長さがそろっていて、色が全部決まっている', () => {
    for (const [id, sp] of Object.entries(SPRITES.animals)) {
      for (const v of [[], ['eyes_closed'], ['paws_hold'], ['paws_low']] as Variant[][]) {
        for (const r of rowsOf(sp, v)) {
          expect(r.length, `${id} ${v}`).toBe(sp.w);
          for (const ch of r) if (ch !== '.') expect(sp.pal[ch], `${id} の色 ${ch}`).toBeTruthy();
        }
      }
      expect(sp.hold, id).toBeTruthy();
    }
  });
  it('びんは左右対称で、粒が50以上入る', () => {
    for (const [id, jar] of Object.entries(SPRITES.jars)) {
      for (const r of rowsOf(jar)) expect(r).toBe([...r].reverse().join(''));
      expect(jarSlots(jar).length, id).toBeGreaterThanOrEqual(50);
    }
  });
  it('粒の置き場所は重複せず、下から積もる(scripts/art.py と同じ数)', () => {
    const slots = jarSlots(SPRITES.jars.round);
    expect(new Set(slots.map((s) => s.join(','))).size).toBe(slots.length);
    expect(slots[0][1]).toBeGreaterThan(slots[slots.length - 1][1]);
    expect(slots.length).toBe(59);
    expect(jarSlots(SPRITES.jars.square).length).toBe(64);
    expect(jarSlots(SPRITES.jars.pot).length).toBe(58);
  });
});
