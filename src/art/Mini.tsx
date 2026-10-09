import { useEffect, useRef, useState } from 'react';
import type { AnimalId, JarId } from '../domain/types';
import { GRAIN_SIZE, SPRITES, animalSize, drawGrain, drawJar, drawSprite, glassOf, jarSize } from './draw';

/** 小さな絵を整数倍で描くだけの canvas */
function useDots(w: number, h: number, scale: number, draw: (ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    cv.width = w * scale * dpr;
    cv.height = h * scale * dpr;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    draw(ctx, cv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, scale, ...deps]);
  return ref;
}

/** 見た目(明るい/暗い)が変わったら描き直すための印 */
function useDark() {
  const [v, setV] = useState(() => document.documentElement.dataset.theme ?? '');
  useEffect(() => {
    const mo = new MutationObserver(() => setV(document.documentElement.dataset.theme ?? ''));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const f = () => setV((x) => x + ' ');
    mq.addEventListener('change', f);
    return () => { mo.disconnect(); mq.removeEventListener('change', f); };
  }, []);
  return v;
}

export function JarMini({ jar, colors, scale = 1, dim = false }: { jar: JarId; colors: string[]; scale?: number; dim?: boolean }) {
  const { w, h } = jarSize(jar);
  const dark = useDark();
  const ref = useDots(w, h, scale, (ctx, cv) => drawJar(ctx, jar, colors, 0, 0, 1, glassOf(cv)), [jar, colors.join(','), dark]);
  return <canvas ref={ref} className="dots" style={{ width: w * scale, height: h * scale, opacity: dim ? 0.5 : 1 }} aria-hidden />;
}

export function AnimalMini({ animal, scale = 3, hold }: { animal: AnimalId; scale?: number; hold?: string }) {
  const { w, h } = animalSize(animal);
  const ref = useDots(w, h, scale, (ctx) => {
    const sp = SPRITES.animals[animal];
    drawSprite(ctx, sp, hold ? ['paws_hold'] : [], 0, 0);
    if (hold && sp.hold) drawGrain(ctx, hold, sp.hold[0], sp.hold[1]);
  }, [animal, hold]);
  return <canvas ref={ref} className="dots" style={{ width: w * scale, height: h * scale }} aria-hidden />;
}

/** 作業の種類の色を、金平糖1粒で見せる */
export function Grain({ color, scale = 3 }: { color: string; scale?: number }) {
  const ref = useDots(GRAIN_SIZE, GRAIN_SIZE, scale, (ctx) => drawGrain(ctx, color, 0, 0), [color]);
  return <canvas ref={ref} className="dots grain" style={{ width: GRAIN_SIZE * scale, height: GRAIN_SIZE * scale }} aria-hidden />;
}
