import L from './layout.json';
import type { AnimalId, CandyColor, JarId } from '../domain/types';

/**
 * 絵は public/art/*.webp(見本の画面から scripts/cut_assets.py で切り出した物)。
 * 位置と大きさは見本の画像の画素のまま(layout.json)。台紙の上では「台紙の左上=0」の画素で置く。
 */
export interface Slot { 0: number; 1: number; 2: number }
interface JarLayout { w: number; h: number; tiers: { d: number; slots: [number, number, number][] }[] }
interface Layout {
  plates: Record<string, { w: number; h: number; x0: number; y0: number }>;
  stage: { jar: { x: number; y: number }; tag: { x: number; y: number }; ham: { x: number; bottom: number; k: number } };
  jars: Record<JarId, JarLayout>;
  fancy: Record<'hoshi' | 'maru', { x: number; y: number }>;
  cabinet: { w: number; head: number; row: number; bottom: number; cols: [number, number][]; cellH: number };
  sprites: Record<string, { x: number; y: number; w: number; h: number }>;
}
export const LAYOUT = L as unknown as Layout;

export const art = (name: string) => `./art/${name}.webp`;
export const candyImg = (c: CandyColor) => art(`candy_${c}`);

/** 場面に立たせる大きさ(見本1のハムスターを覆う幅にそろえる) */
export const ANIMAL_ART: Record<Exclude<AnimalId, 'hamster'>, { name: string; k: number }> = {
  enaga: { name: 'enaga', k: 1.45 },
  usagi: { name: 'usagi', k: 1.2 },
  pengin: { name: 'pengin', k: 1.5 },
};

/** 小さな顔(吹き出し・選ぶ所) */
export const ANIMAL_MINI: Record<AnimalId, string> = { hamster: 'ham_yorokobu_s', enaga: 'enaga_s', usagi: 'usagi_s', pengin: 'pengin_s' };

export function spriteSize(name: string) {
  const s = LAYOUT.sprites[name];
  return s ? { w: s.w, h: s.h } : { w: 100, h: 100 };
}

/** 段(粒の大きさ)を選ぶ。数が増えるほど小さい粒で詰める */
export function tierFor(jar: JarId, n: number) {
  const tiers = LAYOUT.jars[jar].tiers;
  return tiers.find((t) => t.slots.length >= n) ?? tiers[tiers.length - 1];
}

/** びんの絵の大きさ(画素) */
export function jarSize(jar: JarId) {
  const j = LAYOUT.jars[jar];
  return { w: j.w, h: j.h };
}
