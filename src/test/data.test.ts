import { describe, expect, it } from 'vitest';
import * as D from '../domain/data';
import { HOUR, MIN } from '../domain/time';

const T0 = new Date(2026, 9, 9, 9, 0).getTime();

describe('記録の流れ', () => {
  it('はじめる→おしまい で1件', () => {
    let d = D.emptyData();
    d = D.start(d, T0);
    expect(d.running).toEqual({ mode: 'focus', cat: 'c-study', start: T0 });
    d = D.stop(d, T0 + 30 * MIN);
    expect(d.running).toBeNull();
    expect(d.sessions).toHaveLength(1);
    expect(d.sessions[0].end - d.sessions[0].start).toBe(30 * MIN);
  });
  it('1分より短い押し間違いは残さない', () => {
    let d = D.start(D.emptyData(), T0);
    d = D.stop(d, T0 + 40_000);
    expect(d.sessions).toHaveLength(0);
  });
  it('時計は開始時刻から数える(何時間後に戻っても正しい)', () => {
    let d = D.start(D.emptyData(), T0);
    d = D.stop(d, T0 + 3 * HOUR + 7 * MIN);
    expect(d.sessions[0].end - d.sessions[0].start).toBe(187 * MIN);
  });
  it('ひとやすみ→つづける で2件に分かれ、休みは記録しない', () => {
    let d = D.start(D.emptyData(), T0);
    d = D.rest(d, T0 + 25 * MIN);
    expect(d.running?.mode).toBe('rest');
    d = D.resume(d, T0 + 35 * MIN);
    d = D.stop(d, T0 + 60 * MIN);
    expect(d.sessions.map((s) => (s.end - s.start) / MIN)).toEqual([25, 25]);
  });
  it('ひとやすみ中におしまいにしても、休みの分は記録しない', () => {
    let d = D.start(D.emptyData(), T0);
    d = D.rest(d, T0 + 25 * MIN);
    d = D.stop(d, T0 + 90 * MIN);
    expect(d.sessions).toHaveLength(1);
    expect(d.running).toBeNull();
  });
  it('作業中に種類を変えると、そこで区切って続ける', () => {
    let d = D.start(D.emptyData(), T0);
    d = D.switchCat(d, 'c-read', T0 + 20 * MIN);
    expect(d.running).toEqual({ mode: 'focus', cat: 'c-read', start: T0 + 20 * MIN });
    expect(d.sessions[0].cat).toBe('c-study');
    expect(d.currentCat).toBe('c-read');
  });
  it('止まっているときに種類を変えても記録は増えない', () => {
    const d = D.switchCat(D.emptyData(), 'c-work', T0);
    expect(d.sessions).toHaveLength(0);
    expect(d.currentCat).toBe('c-work');
  });
  it('しまった種類には切り替えられない', () => {
    let d = D.archiveCategory(D.emptyData(), 'c-work', T0);
    d = D.switchCat(d, 'c-work', T0);
    expect(d.currentCat).toBe('c-study');
  });
  it('つけっぱなしを、指定の時刻で終われる', () => {
    let d = D.start(D.emptyData(), T0);
    d = D.endRunningAt(d, T0 + 2 * HOUR);
    expect(d.running).toBeNull();
    expect(d.sessions[0].end).toBe(T0 + 2 * HOUR);
  });
});

describe('記録を直す', () => {
  it('過去の記録を足す・直す・消す・戻す', () => {
    let d = D.addSession(D.emptyData(), { cat: 'c-study', start: T0 - 48 * HOUR, end: T0 - 47 * HOUR }, T0);
    const s = d.sessions[0];
    d = D.updateSession(d, { ...s, end: s.end + 7 * MIN });
    expect(d.sessions[0].end - d.sessions[0].start).toBe(67 * MIN);
    const removed = d.sessions[0];
    d = D.deleteSession(d, removed.id);
    expect(d.sessions).toHaveLength(0);
    d = D.restoreSession(d, removed);
    expect(d.sessions).toHaveLength(1);
    expect(D.restoreSession(d, removed).sessions).toHaveLength(1);
  });
  it('おかしな時刻は理由つきで断る', () => {
    expect(D.checkSession({ start: T0, end: T0 }, T0)).toMatch('後');
    expect(D.checkSession({ start: T0, end: T0 + 25 * HOUR }, T0 + 30 * HOUR)).toMatch('24時間');
    expect(D.checkSession({ start: T0, end: T0 + HOUR }, T0)).toMatch('まだ来ていない');
    expect(D.checkSession({ start: T0, end: T0 + HOUR }, T0 + HOUR)).toBeNull();
  });
  it('記録はいつも時刻順', () => {
    let d = D.addSession(D.emptyData(), { cat: 'c-study', start: T0, end: T0 + HOUR }, T0);
    d = D.addSession(d, { cat: 'c-study', start: T0 - 5 * HOUR, end: T0 - 4 * HOUR }, T0);
    expect(d.sessions[0].start).toBe(T0 - 5 * HOUR);
  });
});

describe('作業の種類', () => {
  it('足す・名前を直す・しまう・戻す', () => {
    let d = D.addCategory(D.emptyData(), '  英語  ', 'ume', T0);
    const c = d.categories.at(-1)!;
    expect(c.name).toBe('英語');
    d = D.updateCategory(d, c.id, { name: 'ピアノ' });
    expect(d.categories.at(-1)!.name).toBe('ピアノ');
    d = D.archiveCategory(d, c.id, T0);
    expect(D.activeCats(d).some((x) => x.id === c.id)).toBe(false);
    d = D.restoreCategory(d, c.id);
    expect(D.activeCats(d).some((x) => x.id === c.id)).toBe(true);
  });
  it('空の名前は足さない・最後の1つはしまえない', () => {
    expect(D.addCategory(D.emptyData(), '   ', 'ume', T0).categories).toHaveLength(5);
    let d = D.emptyData();
    for (const c of D.activeCats(d).slice(1)) d = D.archiveCategory(d, c.id, T0);
    expect(D.activeCats(d)).toHaveLength(1);
    expect(D.activeCats(D.archiveCategory(d, D.activeCats(d)[0].id, T0))).toHaveLength(1);
  });
  it('選んでいた種類をしまうと、残りの先頭に切り替わる。作業中なら区切る', () => {
    let d = D.start(D.emptyData(), T0);
    d = D.archiveCategory(d, 'c-study', T0 + 30 * MIN);
    expect(d.currentCat).toBe('c-work');
    expect(d.running).toMatchObject({ mode: 'focus', cat: 'c-work' });
    expect(d.sessions).toHaveLength(1);
  });
  it('並べ替え', () => {
    const d = D.moveCategory(D.emptyData(), 'c-work', -1);
    expect(D.activeCats(d).map((c) => c.id).slice(0, 2)).toEqual(['c-work', 'c-study']);
    expect(D.moveCategory(d, 'c-work', -1)).toBe(d);
  });
});

describe('保存した物の読み替え', () => {
  it('壊れた物・空は初期値', () => {
    expect(D.normalize(null).categories).toHaveLength(5);
    expect(D.normalize('x').onboarded).toBe(false);
  });
  it('記録は残し、おかしな所だけ直す', () => {
    const raw = {
      onboarded: true,
      categories: [{ id: 'a', name: '勉強', color: 'nope', archived: false }],
      sessions: [
        { id: 's1', cat: 'a', start: 10, end: 5 },
        { id: 's2', cat: 'gone', start: 100, end: 200 },
        { id: 's3', cat: 'a', start: 50, end: 60 },
      ],
      running: { mode: 'focus', cat: 'a', start: 300 },
      settings: { restMin: 9999, dayStartHour: 9, goals: [1, 2], theme: 'pink', names: { hamster: '  こむぎ ' }, animal: 'dragon' },
    };
    const d = D.normalize(raw);
    expect(d.onboarded).toBe(true);
    expect(d.categories[0].color).toBe('shiro');
    expect(d.sessions.map((s) => s.id)).toEqual(['s3', 's2']);
    expect(d.sessions[1].cat).toBe('a');
    expect(d.running).toEqual({ mode: 'focus', cat: 'a', start: 300 });
    expect(d.settings.restMin).toBe(120);
    expect(d.settings.dayStartHour).toBe(5);
    expect(d.settings.goals).toHaveLength(7);
    expect(d.settings.theme).toBe('auto');
    expect(d.settings.names.hamster).toBe('こむぎ');
    expect(d.settings.animal).toBe('hamster');
  });
  it('全部しまわれていたら、先頭を戻す', () => {
    const d = D.normalize({ categories: [{ id: 'a', name: 'x', color: 'momo', archived: true }] });
    expect(D.activeCats(d)).toHaveLength(1);
  });
  it('保存して読み直しても同じ', () => {
    let d = D.start(D.emptyData(), T0);
    d = D.stop(d, T0 + HOUR);
    expect(D.normalize(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });
});

describe('動いている作業も表示に入れる', () => {
  it('sessionsWithRunning', () => {
    const d = D.start(D.emptyData(), T0);
    expect(D.sessionsWithRunning(d, T0 + 20 * MIN)).toHaveLength(1);
    expect(D.sessionsWithRunning(D.rest(d, T0 + 20 * MIN), T0 + 30 * MIN)).toHaveLength(1);
  });
});
