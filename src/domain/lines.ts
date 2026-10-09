/** 相棒のひとこと。煽らない・急かさない。話し言葉で短く */

export interface LineContext {
  mode: 'idle' | 'focus' | 'rest' | 'restOver';
  hour: number;
  /** きょうの合計 */
  todayMs: number;
  /** きょうの目標(0 はなし) */
  goalMs: number;
  /** いまの作業が始まってから */
  sessionMs: number;
  /** これまでに記録が1つも無い */
  firstTime: boolean;
  /** 同じ言葉が続かないようにする種(数分ごとに変わる値) */
  seed: number;
}

const MIN = 60_000;

const pick = (arr: string[], seed: number) => arr[Math.abs(seed) % arr.length];

export function lineFor(c: LineContext): string {
  if (c.mode === 'restOver') return pick(['おきたよ。つづける？', 'よく寝た。そろそろやる？', 'ひとやすみ、おわり。むりはしないでね'], c.seed);
  if (c.mode === 'rest') return pick(['すこし寝るね', 'おやすみ…', 'のびをしてきてね', 'お水のんでおいで'], c.seed);

  if (c.mode === 'focus') {
    if (c.sessionMs < 2 * MIN) return pick(['よし、いっしょにやろう', 'みがきはじめるね', 'はじまり、はじまり'], c.seed);
    if (c.goalMs > 0 && c.todayMs >= c.goalMs && c.todayMs - c.sessionMs < c.goalMs) return 'きょうの目標、とどいたよ';
    if (c.sessionMs >= 120 * MIN) return pick(['長いこと続いてるね。目をやすめてね', 'ひとやすみしても、粒はにげないよ'], c.seed);
    if (c.sessionMs >= 60 * MIN) return pick(['1時間こえたね', 'いい調子。肩の力ぬいてね', 'びんがにぎやかになってきた'], c.seed);
    return pick(['こつこつ、こつこつ', 'となりでみがいてるね', '10分ごとに1粒できるよ', 'しずかにしてるね', 'その調子'], c.seed);
  }

  // idle
  if (c.firstTime) return '「はじめる」を押すと、となりで金平糖をみがくよ';
  if (c.goalMs > 0 && c.todayMs >= c.goalMs) return pick(['きょうはもう十分。えらかったね', '目標とどいたね。ゆっくりしよう', 'びんがたのしそう'], c.seed);
  if (c.todayMs > 0) return pick(['おかえり。つづきやる？', 'きょうの粒、ちゃんとあるよ', 'またやるときは押してね'], c.seed);
  if (c.hour < 5) return pick(['夜ふかしさん。少しだけやる？', 'しずかな時間だね'], c.seed);
  if (c.hour < 11) return pick(['おはよう。きょうは何からやる？', 'まずは1粒ぶん、やってみる？'], c.seed);
  if (c.hour < 17) return pick(['こんにちは。きょうのびんはまだ空っぽ', '10分だけ、いっしょにやる？'], c.seed);
  return pick(['こんばんは。少しだけやる？', '1粒だけでもいいよ'], c.seed);
}
