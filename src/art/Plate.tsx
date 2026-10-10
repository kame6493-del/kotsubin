import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { LAYOUT, art } from './assets';

/**
 * 場面の台紙。見本の画像の画素の大きさの「舞台」を、画面の幅に合わせて拡大・縮小する。
 * 中の部品は台紙の画素で置く(style={{left, top}})。
 * 背の低い画面では、上(壁)と下(棚の前)を cropTop / cropBottom 画素まで切って高さを詰める。
 */
export function Plate({
  name, children, cropTop = 0, cropBottom = 0, maxCss, className, label, img = true,
}: {
  name: string;
  children?: ReactNode;
  cropTop?: number;
  cropBottom?: number;
  /** この高さ(CSS px)まで詰めたい。詰めすぎは cropTop + cropBottom で止まる */
  maxCss?: number;
  className?: string;
  label?: string;
  /** 台紙の絵を出す(false なら部品だけ) */
  img?: boolean;
}) {
  const p = LAYOUT.plates[name];
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(375);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setW(el.clientWidth || 375);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const s = w / p.w;
  const full = p.h * s;
  const minH = (p.h - cropTop - cropBottom) * s;
  const h = maxCss ? Math.max(minH, Math.min(full, maxCss)) : full;
  const cut = full - h; // 切る量(CSS px)
  const top = cropTop + cropBottom > 0 ? cut * (cropTop / (cropTop + cropBottom)) : 0;
  const stage: CSSProperties = { width: p.w, height: p.h, transform: `translate(0, ${-top}px) scale(${s})` };
  return (
    <div ref={wrap} className={'plate' + (className ? ' ' + className : '')} style={{ height: h }} role={label ? 'img' : undefined} aria-label={label}>
      <div className="plate-stage" style={stage}>
        {img && <img className="plate-img art" src={art(name)} alt="" width={p.w} height={p.h} draggable={false} />}
        {children}
      </div>
    </div>
  );
}

/** 台紙の無い「舞台」: w×h 画素の物を、画面の幅に合わせて拡大・縮小する(棚など) */
export function Stage({ w, h, children, className, label }: { w: number; h: number; children?: ReactNode; className?: string; label?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(375);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setCw(el.clientWidth || 375);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const s = cw / w;
  return (
    <div ref={wrap} className={'plate' + (className ? ' ' + className : '')} style={{ height: h * s }} aria-label={label}>
      <div className="plate-stage" style={{ width: w, height: h, transform: `scale(${s})` }}>{children}</div>
    </div>
  );
}

/** 台紙の上に置く部品(画素で位置と大きさ) */
export function At({ x, y, w, h, children, className, style, z }: { x: number; y: number; w?: number; h?: number; children?: ReactNode; className?: string; style?: CSSProperties; z?: number }) {
  return (
    <div className={'at' + (className ? ' ' + className : '')} style={{ left: x, top: y, width: w, height: h, zIndex: z, ...style }}>
      {children}
    </div>
  );
}

export function Img({ name, x, y, k = 1, w, h, className, style, alt = '' }: { name: string; x: number; y: number; k?: number; w: number; h: number; className?: string; style?: CSSProperties; alt?: string }) {
  return <img className={'at art' + (className ? ' ' + className : '')} src={art(name)} alt={alt} draggable={false} style={{ left: x, top: y, width: w * k, height: h * k, ...style }} />;
}
