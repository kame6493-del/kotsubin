/** 相棒のひとこと。煽らない・急かさない。話し言葉で短く */

export interface LineContext {
  mode: 'idle' | 'focus' | 'pause' | 'rest' | 'restOver';
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
  if (c.mode === 'restOver') return pick(['おきたよ。つづける？', 'よく寝た。そろそろやる？', '休憩、おわり。むりはしないでね'], c.seed);
  if (c.mode === 'rest') return pick(['すこし休んで\nまたがんばろうね。\nこつびんは\nいつでもここにいるよ。', 'のびをして\nお水ものんでおいで。\nびんは ちゃんと\nここで待ってるよ。', '目をとじて\nゆっくり深呼吸。\nあわてなくて\nだいじょうぶ。'], c.seed);
  if (c.mode === 'pause') return pick(['ちょっと止めたね。\nつづきはいつでも', 'まってるね', 'ひと息ついてね'], c.seed);

  if (c.mode === 'focus') {
    if (c.sessionMs < 2 * MIN) return pick(['よし、いっしょにやろう', 'みがきはじめるね', 'はじまり、はじまり'], c.seed);
    if (c.goalMs > 0 && c.todayMs >= c.goalMs && c.todayMs - c.sessionMs < c.goalMs) return 'きょうの目標、とどいたよ';
    if (c.sessionMs >= 120 * MIN) return pick(['長いこと続いてるね。目をやすめてね', 'ひとやすみしても、粒はにげないよ'], c.seed);
    if (c.sessionMs >= 60 * MIN) return pick(['1時間こえたね', 'いい調子。肩の力ぬいてね', 'びんがにぎやかになってきた'], c.seed);
    return pick(['こつこつ\nつみあげよう!', 'となりで\nみがいてるね', 'その調子', 'こつこつ\nこつこつ', 'しずかに\n見てるね'], c.seed);
  }

  // idle
  if (c.firstTime) return '「はじめる」を押すと\nこんぺいとうを\nみがくよ';
  if (c.goalMs > 0 && c.todayMs >= c.goalMs) return pick(['きょうはもう十分。\nえらかったね', '目標とどいたね。\nゆっくりしよう', 'びんが\nたのしそう'], c.seed);
  if (c.todayMs > 0) return pick(['おかえり。\nつづきやる？', 'きょうの粒、\nちゃんとあるよ', 'またやるときは\n押してね'], c.seed);
  if (c.hour < 5) return pick(['夜ふかしさん。\n少しだけやる？', 'しずかな\n時間だね'], c.seed);
  if (c.hour < 11) return pick(['おはよう。\nきょうは何から？', 'まずは1粒ぶん、\nやってみる？'], c.seed);
  if (c.hour < 17) return pick(['こんにちは。\nびんはまだ空っぽ', '10分だけ、\nいっしょにやる？'], c.seed);
  return pick(['こんばんは。\n少しだけやる？', '1粒だけでも\nいいよ'], c.seed);
}

/** たなの「その日」の吹き出し */
export function dayLine(ms: number, goalMs: number, isToday: boolean, seed: number): string {
  if (ms === 0) return isToday ? 'きょうのびんは\nまだ空っぽ。\nゆっくりいこうね' : 'この日は\nお休みの日。\nそれも大事だよ';
  if (goalMs > 0 && ms >= goalMs) return pick(['よくがんばったね!\nすてきな1日だよ!', 'コツコツ つづけて\nえらいよ!\nこの調子でがんばろう!'], seed);
  return pick(['コツコツ つづけて\nえらいよ!\nこの調子でがんばろう!', '少しずつでも\nちゃんと\nたまっているよ'], seed);
}

/** ふりかえりの「やさしいコメント」。[見出し, 本文] */
export function weekComment(weekMs: number, prevWeekMs: number, days: number): [string, string] {
  if (weekMs === 0) return ['今週は ひと休みの週。', 'お休みも大切な時間です。また はじめたくなったら、いつでもどうぞ。'];
  if (prevWeekMs > 0 && weekMs > prevWeekMs) return ['先週より すこし多く\n積み上がっていますね!', '続けていることが、ちゃんと力になっていますよ。この調子で、また来週もいっしょにやっていきましょう!'];
  if (days >= 5) return ['今週も すこしずつ\n積み上がっていますね!', '続けていることが、ちゃんと力になっていますよ。この調子で、また来週もいっしょにやっていきましょう!'];
  return ['今週も おつかれさま。', `${days}日、びんに こんぺいとうが たまりました。むりのない ペースで いきましょう。`];
}
