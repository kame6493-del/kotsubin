import SPR from './sprites.json';
import type { AnimalId, JarId } from '../domain/types';

/**
 * ドット絵を描く。格子は sprites.json(scripts/art.py も同じ物を同じ規則で描く)。
 * 1マス=1ピクセルで小さく描いてから、整数倍に拡大して表示する(ぼかさない)。
 */

export interface SpriteDef {
  name: string;
  w: number;
  mirror?: boolean;
  pal: Record<string, string>;
  base: string[];
  variants?: Record<string, Record<string, string>>;
  hold?: [number, number];
}

type Sprites = { animals: Record<AnimalId, SpriteDef>; jars: Record<JarId, SpriteDef>; grain: string[] };
export const SPRITES = SPR as unknown as Sprites;

export type Variant = 'eyes_closed' | 'paws_hold' | 'paws_low';

export function rowsOf(sp: SpriteDef, variants: Variant[] = []): string[] {
  const rows = [...sp.base];
  for (const v of variants) {
    const rep = sp.variants?.[v];
    if (rep) for (const [k, r] of Object.entries(rep)) rows[Number(k)] = r;
  }
  return rows.map((r) => (sp.mirror ? r + [...r].reverse().join('') : r));
}

function hexToRgb(h: string): [number, number, number] {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

export function shade(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = (c: number) => Math.round(f >= 0 ? c + (255 - c) * f : c * (1 + f));
  return `rgb(${t(r)},${t(g)},${t(b)})`;
}

/** 格子の点を ctx に描く(1マス=1px) */
function paint(ctx: CanvasRenderingContext2D, rows: string[], pal: Record<string, string>, ox: number, oy: number, skip = '.') {
  for (let y = 0; y < rows.length; y++) {
    const r = rows[y];
    for (let x = 0; x < r.length; x++) {
      const ch = r[x];
      if (skip.includes(ch)) continue;
      const col = pal[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

export function drawSprite(ctx: CanvasRenderingContext2D, sp: SpriteDef, variants: Variant[], ox: number, oy: number) {
  paint(ctx, rowsOf(sp, variants), sp.pal, ox, oy);
}

export function drawGrain(ctx: CanvasRenderingContext2D, color: string, ox: number, oy: number) {
  const pal = { L: shade(color, 0.55), M: color, D: shade(color, -0.22) };
  paint(ctx, SPRITES.grain, pal, ox, oy);
}

export const GRAIN_SIZE = 5;

/** びんの中に粒を置ける場所。積もる順(真ん中から山になる)。scripts/art.py の jar_slots と同じ規則 */
export function jarSlots(jar: SpriteDef): [number, number][] {
  const rows = rowsOf(jar);
  const h = rows.length;
  const w = rows[0].length;
  const inside = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < w && 'iH'.includes(rows[y][x]);
  const cells: [number, number][] = [];
  SPRITES.grain.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') cells.push([x, y]); }));
  const fits = (x: number, y: number) => cells.every(([cx, cy]) => inside(x + cx, y + cy));
  const slots: [number, number, number][] = [];
  let row = 0;
  for (let y = h - 6; y >= 0; y -= 4, row++) {
    const off = row % 2 === 0 ? 0 : 2;
    for (let x = 1 + off; x < w - 5; x += 4) {
      const hsh = ((x * 7349 + row * 1931) ^ (row * 271)) & 0xff;
      const jx = x + (hsh % 3) - 1;
      const jy = y - ((hsh >> 3) % 2);
      const score = (px: number) => row + Math.abs(px + 2.5 - w / 2) / (w * 0.3);
      if (fits(jx, jy)) slots.push([jx, jy, score(jx)]);
      else if (fits(x, y)) slots.push([x, y, score(x)]);
    }
  }
  slots.sort((a, b) => a[2] - b[2] || a[0] - b[0]);
  return slots.map(([x, y]) => [x, y]);
}

const slotCache = new Map<JarId, [number, number][]>();
export function slotsOf(id: JarId) {
  let s = slotCache.get(id);
  if (!s) { s = jarSlots(SPRITES.jars[id]); slotCache.set(id, s); }
  return s;
}

export const jarCapacity = (id: JarId) => slotsOf(id).length;

/**
 * びん1つを描く。colors は粒の色(先頭から下に積もる)。入りきらない分は描かない(数は文字で出す)。
 * dropping: 最後の1粒を落としている途中なら 0〜1
 */
export interface Glass { glass: string; edge: string; shine: number }

/** 画面の色の決まり(--jar-*)からガラスの色を読む。読めなければ明るい画面の色 */
export function glassOf(el: Element | null): Glass | undefined {
  if (!el) return undefined;
  const cs = getComputedStyle(el);
  const glass = cs.getPropertyValue('--jar-glass').trim();
  if (!glass) return undefined;
  return { glass, edge: cs.getPropertyValue('--jar-edge').trim() || '#7f9a99', shine: Number(cs.getPropertyValue('--jar-shine')) || 0.55 };
}

export function drawJar(ctx: CanvasRenderingContext2D, id: JarId, colors: string[], ox: number, oy: number, dropping = 1, g?: Glass) {
  const jar = SPRITES.jars[id];
  const pal: Record<string, string> = { ...jar.pal, ...(g ? { i: g.glass, o: g.edge } : {}) };
  const shine = g?.shine ?? 0.55;
  const rows = rowsOf(jar);
  // 中のガラス
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
    if ('iH'.includes(rows[y][x])) { ctx.fillStyle = pal.i; ctx.fillRect(ox + x, oy + y, 1, 1); }
  }
  const slots = slotsOf(id);
  const n = Math.min(colors.length, slots.length);
  for (let i = 0; i < n; i++) {
    const [sx, sy] = slots[i];
    let y = sy;
    if (i === n - 1 && dropping < 1) {
      const top = topOfInside(rows) - GRAIN_SIZE;
      y = Math.round(top + (sy - top) * easeIn(dropping));
    }
    drawGrain(ctx, colors[i], ox + sx, oy + y);
  }
  // ガラスの縁と光(光は粒の上に薄く重ねる)
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
    const ch = rows[y][x];
    if (ch === '.' || ch === 'i') continue;
    if (ch === 'H') { ctx.fillStyle = `rgba(255,255,255,${shine})`; ctx.fillRect(ox + x, oy + y, 1, 1); continue; }
    ctx.fillStyle = pal[ch];
    ctx.fillRect(ox + x, oy + y, 1, 1);
  }
}

function topOfInside(rows: string[]) {
  return rows.findIndex((r) => r.includes('i'));
}

const easeIn = (t: number) => t * t;

/** びんに入りきらない粒を、足もとに山で置く場所(びんの左下から)。下4・3・2・1 の10粒まで */
export function overflowSpots(n: number): [number, number][] {
  const out: [number, number][] = [];
  const rows = [4, 3, 2, 1];
  for (let r = 0; r < rows.length && out.length < n; r++) {
    for (let i = 0; i < rows[r] && out.length < n; i++) out.push([-(i * 4 + r * 2) - 6, -5 - r * 4]);
  }
  return out;
}

export const jarSize = (id: JarId) => ({ w: SPRITES.jars[id].w, h: SPRITES.jars[id].base.length });
export const animalSize = (id: AnimalId) => ({ w: SPRITES.animals[id].w, h: SPRITES.animals[id].base.length });

/** 寝ているときの z(4x4) */
const Z = ['oooo', '..o.', '.o..', 'oooo'];
export function drawZ(ctx: CanvasRenderingContext2D, color: string, ox: number, oy: number) {
  paint(ctx, Z, { o: color }, ox, oy);
}
