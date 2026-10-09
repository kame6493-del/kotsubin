import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';

const native = Capacitor.isNativePlatform();

export function tap() {
  if (native) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export function cue() {
  if (native) Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  else if ('vibrate' in navigator) navigator.vibrate?.(180);
}

/** 通知の許可。'on' / 'off' */
export async function askNotify(): Promise<'on' | 'off'> {
  if (!native) return 'on';
  try {
    let p = await LocalNotifications.checkPermissions();
    if (p.display !== 'granted') p = await LocalNotifications.requestPermissions();
    return p.display === 'granted' ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

const REST_ID = 201;
const CHIME_ID = 202;

/** at の時刻に1回だけ知らせる。前に入れた同じ種類の通知は消す */
export async function scheduleOnce(kind: 'rest' | 'chime', at: number, title: string, body: string) {
  if (!native) return;
  const id = kind === 'rest' ? REST_ID : CHIME_ID;
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
    if (at <= Date.now() + 1000) return;
    await LocalNotifications.schedule({ notifications: [{ id, title, body, schedule: { at: new Date(at), allowWhileIdle: true } }] });
  } catch (e) {
    console.error('[kotsubin] notify', e);
  }
}

export async function cancelAll() {
  if (!native) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_ID }, { id: CHIME_ID }] });
  } catch { /* 無くても困らない */ }
}

/** 画像を共有(端末なら共有シート、ブラウザなら保存) */
export async function shareImage(dataUrl: string, fileName: string, text: string): Promise<void> {
  if (native) {
    const base64 = dataUrl.split(',')[1];
    const f = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
    await Share.share({ title: text, text, files: [f.uri] });
    return;
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  a.click();
}
