/**
 * アプリ全体の設定。課金は RevenueCat。キーが空のあいだは「購入は準備中です」と出して、課金は走らない。
 * キーは RevenueCat の公開 API キー(秘密鍵ではない)。ストアの商品を作ったらここに入れる。
 */
export const CONFIG = {
  appName: 'こつびん',
  revenuecat: { ios: '', android: '' },
  /** 買い切り(非消耗型)。相棒3匹とびん2つが増える。記録の機能は何も閉じない */
  productId: 'kotsubin_nakama_set',
  entitlement: 'nakama',
  /** 何分で金平糖1粒か */
  grainMinutes: 10,
  /** これより長くつけっぱなしなら、開いたときに確かめる */
  longRunHours: 12,
  privacyUrl: 'https://kame6493-del.github.io/kotsubin/privacy.html',
} as const;
