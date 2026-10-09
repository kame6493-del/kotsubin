import type { CandyColor } from './types';

/** 金平糖の色。絵の中でだけ使う */
export const CANDY: Record<CandyColor, { hex: string; label: string }> = {
  momo: { hex: '#f2a7b5', label: 'もも' },
  kinako: { hex: '#f3cc66', label: 'きなこ' },
  wakaba: { hex: '#a7d38b', label: 'わかば' },
  sora: { hex: '#8cc4e6', label: 'そら' },
  fuji: { hex: '#c3abe2', label: 'ふじ' },
  mikan: { hex: '#f5ad78', label: 'みかん' },
  ume: { hex: '#e07f93', label: 'うめ' },
  matcha: { hex: '#7fae79', label: 'まっちゃ' },
  shiro: { hex: '#ede7dc', label: 'しろ' },
};

export const CANDY_ORDER: CandyColor[] = ['momo', 'kinako', 'wakaba', 'sora', 'fuji', 'mikan', 'ume', 'matcha', 'shiro'];

export const isCandy = (c: unknown): c is CandyColor => typeof c === 'string' && c in CANDY;
