/** こんぺいとうの色。名前で持ち、色の値は domain/colors.ts で決める */
export type CandyColor = 'momo' | 'kinako' | 'wakaba' | 'sora' | 'fuji' | 'mikan' | 'ume' | 'matcha' | 'shiro';

/** 作業の種類のしるし(下のタブ・記録の行に出す) */
export type CatIcon = 'book' | 'bag' | 'read' | 'game' | 'pen' | 'music' | 'home' | 'star' | 'run' | 'code';

export interface Category {
  id: string;
  name: string;
  color: CandyColor;
  icon: CatIcon;
  /** しまった(一覧から外した)。記録は残り、いつでも戻せる */
  archived: boolean;
}

/** 1回の記録。start / end はミリ秒の時刻 */
export interface Session {
  id: string;
  cat: string;
  start: number;
  end: number;
  /** 何をしたか(任意。タイムラインに出す) */
  note?: string;
}

/**
 * いま動いている物。
 * focus=作業中(carry は一時停止の前までに数えた分。時計は carry + いまの区切り)
 * pause=一時停止中(start は止めた時刻。carry はそこまでの時計)
 * rest=休憩中(len 分たったら起こす。cat は戻ったときに続ける種類)
 */
export type Running =
  | { mode: 'focus'; cat: string; start: number; carry?: number }
  | { mode: 'pause'; cat: string; start: number; carry: number }
  | { mode: 'rest'; cat: string; start: number; len: number }
  | null;

export type AnimalId = 'hamster' | 'enaga' | 'usagi' | 'pengin';
/** std=スタンダード(最初から) / hoshi=ほしのびん / maru=まるびん(なかまセット) */
export type JarId = 'std' | 'hoshi' | 'maru';
export type Theme = 'auto' | 'light' | 'dark';

export interface Settings {
  animal: AnimalId;
  /** 相棒ごとの名前 */
  names: Record<AnimalId, string>;
  jar: JarId;
  /** 休憩の長さ(分) */
  restMin: number;
  /** 作業の区切りの合図(分)。0 はなし */
  chimeMin: number;
  /** 1日の区切り(時)。0〜5。夜ふかし・夜勤の人は 3 や 5 にする */
  dayStartHour: number;
  /** 曜日ごとの目標(分)。[日,月,火,水,木,金,土] */
  goals: number[];
  theme: Theme;
  /** 通知: unknown=まだ聞いていない / on / off(断られた・使わない) */
  notify: 'unknown' | 'on' | 'off';
}

export interface AppData {
  v: 1;
  onboarded: boolean;
  categories: Category[];
  /** いま選んでいる作業の種類 */
  currentCat: string;
  sessions: Session[];
  running: Running;
  settings: Settings;
  /** 日ごとのメモ(YYYY-MM-DD → 文) */
  memos: Record<string, string>;
}
