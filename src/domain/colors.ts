import type { CandyColor } from './types';

/**
 * こんぺいとうの色。hex は粒の色(グラフ・点)、ink は文字やアイコンに使う濃い色、soft は札の地の色。
 * 見本の4色: 勉強=青・仕事=橙・読書=緑・趣味=紫。残りは種類を足したとき用
 */
export const CANDY: Record<CandyColor, { hex: string; ink: string; soft: string; label: string }> = {
  sora: { hex: '#5ea4ec', ink: '#2f76d2', soft: '#e3eefb', label: 'そら' },
  mikan: { hex: '#f6a04e', ink: '#e8711f', soft: '#fdeedf', label: 'みかん' },
  wakaba: { hex: '#79c463', ink: '#3f9a3c', soft: '#e7f3df', label: 'わかば' },
  fuji: { hex: '#ad86e4', ink: '#8a5ad3', soft: '#efe7fa', label: 'ふじ' },
  kinako: { hex: '#f5cb3f', ink: '#c9930a', soft: '#fcf3d6', label: 'きなこ' },
  momo: { hex: '#f3a6c8', ink: '#d9659a', soft: '#fbe8f0', label: 'もも' },
  ume: { hex: '#e8738f', ink: '#c94467', soft: '#fae3e8', label: 'うめ' },
  matcha: { hex: '#9fb768', ink: '#6f8a35', soft: '#eef2e0', label: 'まっちゃ' },
  shiro: { hex: '#e6dccb', ink: '#9a8873', soft: '#f5efe5', label: 'しろ' },
};

export const CANDY_ORDER: CandyColor[] = ['sora', 'mikan', 'wakaba', 'fuji', 'kinako', 'momo', 'ume', 'matcha', 'shiro'];

export const isCandy = (c: unknown): c is CandyColor => typeof c === 'string' && c in CANDY;
