import { Capacitor } from '@capacitor/core';
import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { CONFIG } from '../config';

/**
 * なかまセット(買い切り)。RevenueCat のキーが空なら「購入は準備中です」で、課金は走らない。
 * ブラウザの開発中だけ、画面確認用の疑似購入を使う(?mockbuy=1 を付けると本番ビルドのブラウザでも疑似購入)。
 */
export type BillingState =
  | { status: 'loading'; owned: boolean }
  | { status: 'unavailable'; reason: string; owned: boolean }
  | { status: 'ready'; owned: boolean; price: string; pkg: PurchasesPackage | null };

const platform = Capacitor.getPlatform();
const key = platform === 'ios' ? CONFIG.revenuecat.ios : platform === 'android' ? CONFIG.revenuecat.android : '';
const mock = !Capacitor.isNativePlatform() && (import.meta.env.DEV || new URLSearchParams(location.search).has('mockbuy'));
const MOCK_KEY = 'kotsubin.mockOwned';

let configured = false;
async function ensure() {
  if (configured) return;
  await Purchases.configure({ apiKey: key });
  configured = true;
}

const ownedOf = (active: Record<string, unknown>) => CONFIG.entitlement in active;

export async function loadBilling(): Promise<BillingState> {
  if (mock) return { status: 'ready', owned: localStorage.getItem(MOCK_KEY) === '1', price: '¥500', pkg: null };
  if (!key) return { status: 'unavailable', reason: '購入は準備中です', owned: false };
  try {
    await ensure();
    const [{ customerInfo }, offerings] = await Promise.all([Purchases.getCustomerInfo(), Purchases.getOfferings()]);
    const pkg = offerings.current?.availablePackages.find((p) => p.product.identifier === CONFIG.productId) ?? null;
    const owned = ownedOf(customerInfo.entitlements.active);
    if (!pkg) return { status: 'unavailable', reason: '購入は準備中です', owned };
    return { status: 'ready', owned, price: pkg.product.priceString, pkg };
  } catch (e) {
    console.error('[kotsubin] billing', e);
    return { status: 'unavailable', reason: 'ストアにつながりませんでした', owned: false };
  }
}

/** true=買えた / false=やめた。失敗は例外 */
export async function purchase(state: BillingState): Promise<boolean> {
  if (mock) { localStorage.setItem(MOCK_KEY, '1'); return true; }
  if (state.status !== 'ready' || !state.pkg) throw new Error('いまは購入できません');
  await ensure();
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: state.pkg });
    return ownedOf(customerInfo.entitlements.active);
  } catch (e) {
    if ((e as { userCancelled?: boolean })?.userCancelled) return false;
    throw e;
  }
}

/** 復元。持っていれば true */
export async function restore(): Promise<boolean> {
  if (mock) return localStorage.getItem(MOCK_KEY) === '1';
  if (!key) return false;
  await ensure();
  const { customerInfo } = await Purchases.restorePurchases();
  return ownedOf(customerInfo.entitlements.active);
}

export function resetMock() {
  if (mock) localStorage.removeItem(MOCK_KEY);
}
