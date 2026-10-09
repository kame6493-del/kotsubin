import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AnimalId, JarId } from '../domain/types';
import { SPRITES, animalSize, drawGrain, drawJar, drawSprite, drawZ, glassOf, jarCapacity, jarSize, overflowSpots, type Variant } from './draw';

export type SceneMode = 'idle' | 'focus' | 'rest' | 'restOver';

interface Props {
  animal: AnimalId;
  jar: JarId;
  /** その日の粒の色(先に入った物から) */
  colors: string[];
  mode: SceneMode;
  /** 作業中に相棒が持っている粒の色 */
  holdColor?: string;
  /** 表示の高さの上限(CSS px) */
  maxHeight?: number;
  /** 動かさない(画面写真・小さい表示) */
  still?: boolean;
  label?: string;
}

/** 場面の大きさ(ドット) */
export const SCENE_W = 88;
export const SCENE_H = 56;
const TABLE_Y = 50;

function cssVar(el: Element, name: string, fallback: string) {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

export function Scene({ animal, jar, colors, mode, holdColor, maxHeight = 240, still = false, label }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(3);
  const prevCount = useRef(colors.length);
  const dropStart = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth || 343;
      setScale(Math.max(2, Math.min(5, Math.floor(w / SCENE_W), Math.floor(maxHeight / SCENE_H))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxHeight]);

  // 粒が増えたら、落ちる動き
  useEffect(() => {
    if (colors.length > prevCount.current && !still) dropStart.current = performance.now();
    prevCount.current = colors.length;
  }, [colors.length, still]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    cv.width = SCENE_W * scale * dpr;
    cv.height = SCENE_H * scale * dpr;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const sp = SPRITES.animals[animal];
    const a = animalSize(animal);
    const j = jarSize(jar);
    const cap = jarCapacity(jar);
    let raf = 0;

    const frame = (t: number) => {
      const table = cssVar(cv, '--table', '#c49a6c');
      const edge = cssVar(cv, '--table-edge', '#9c7550');
      const ink3 = cssVar(cv, '--ink-3', '#978c7f');
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      ctx.clearRect(0, 0, SCENE_W, SCENE_H);

      // 机
      ctx.fillStyle = table;
      ctx.fillRect(0, TABLE_Y, SCENE_W, SCENE_H - TABLE_Y);
      ctx.fillStyle = edge;
      ctx.fillRect(0, TABLE_Y + 1, SCENE_W, 1);

      // びん
      const jx = SCENE_W - j.w - 6;
      const jy = TABLE_Y - j.h;
      let drop = 1;
      if (dropStart.current !== null) {
        drop = Math.min(1, (t - dropStart.current) / 650);
        if (drop >= 1) dropStart.current = null;
      }
      drawJar(ctx, jar, colors, jx, jy, drop, glassOf(cv));
      // 入りきらない粒は、びんの足もとに小さな山で(10粒まで)
      const spots = overflowSpots(Math.max(0, colors.length - cap));
      spots.forEach(([dx, dy], i) => drawGrain(ctx, colors[cap + i], jx + dx, TABLE_Y + dy));

      // 相棒
      const ax = 8;
      let ay = TABLE_Y - a.h;
      const variants: Variant[] = [];
      const slow = still ? 0 : t;
      if (mode === 'focus') {
        const low = Math.floor(slow / 650) % 2 === 1;
        variants.push(low ? 'paws_low' : 'paws_hold');
      } else if (mode === 'rest') {
        variants.push('eyes_closed');
        if (Math.floor(slow / 1400) % 2 === 1) ay += 1;
      } else {
        const blink = !still && slow % 3600 < 140;
        if (blink) variants.push('eyes_closed');
        if (mode === 'restOver' && Math.floor(slow / 380) % 2 === 1) ay -= 1;
      }
      drawSprite(ctx, sp, variants, ax, ay);
      if (mode === 'focus' && holdColor && sp.hold) {
        const low = variants.includes('paws_low');
        drawGrain(ctx, holdColor, ax + sp.hold[0], ay + sp.hold[1] + (low ? 1 : 0));
      }
      if (mode === 'rest') {
        const k = Math.floor(slow / 900) % 3;
        drawZ(ctx, ink3, ax + a.w - 2 + k, ay - 2 - k * 3);
      }

      if (!still) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [animal, jar, colors, mode, holdColor, scale, still]);

  return (
    <div ref={wrap} className="scene-wrap" style={{ ['--px' as string]: `${scale}px` }}>
      <div className="scene-table" aria-hidden />
      <canvas
        ref={canvas}
        className="scene-canvas"
        style={{ width: SCENE_W * scale, height: SCENE_H * scale }}
        role="img"
        aria-label={label ?? 'びんと相棒'}
      />
    </div>
  );
}
