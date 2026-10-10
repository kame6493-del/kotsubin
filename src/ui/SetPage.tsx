import { useState } from 'react';
import { ANIMAL_MINI, art } from '../art/assets';
import { CellJar } from '../art/Jar';
import { Plate } from '../art/Plate';
import { CONFIG } from '../config';
import * as D from '../domain/data';
import { fmtHM, weekdayName } from '../domain/time';
import type { AnimalId, JarId, Settings as S, Theme } from '../domain/types';
import { purchase, restore } from '../platform/billing';
import { askNotify, tap } from '../platform/native';
import { clearData } from '../platform/storage';
import type { Ctx } from './App';
import { IconBack, IconCart, IconCheck, IconDown, IconLock, IconNext } from './icons';

/** セット(見本7): なかまセット(相棒3匹とびん2つ。買い切り)と、見た目・設定 */
export function SetPage({ ctx }: { ctx: Ctx }) {
  if (ctx.route.sub === 'goals') return <GoalsPage ctx={ctx} />;
  return <Main ctx={ctx} />;
}

function useSetting(ctx: Ctx) {
  return <K extends keyof S>(k: K, v: S[K]) => ctx.set((x) => ({ ...x, settings: { ...x.settings, [k]: v } }));
}

const JAR_THUMB: Record<JarId, string> = { std: 'cell_jar', hoshi: 'jar_hoshi', maru: 'jar_maru' };

function Main({ ctx }: { ctx: Ctx }) {
  const { d, owned, billing, setBilling, toast } = ctx;
  const st = d.settings;
  const put = useSetting(ctx);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const buy = async () => {
    setBusy(true);
    try {
      const ok = await purchase(billing);
      if (ok) {
        setBilling({ ...billing, owned: true } as typeof billing);
        toast('なかまがふえたよ。下の「相棒とびん」から選べます');
      }
    } catch (e) {
      console.error(e);
      toast('購入できませんでした。時間をおいてもう一度ためしてね');
    } finally {
      setBusy(false);
    }
  };
  const doRestore = async () => {
    setBusy(true);
    try {
      const ok = await restore();
      if (ok) { setBilling({ ...billing, owned: true } as typeof billing); toast('購入を復元したよ'); }
      else toast('このアカウントで買った記録は見つかりませんでした');
    } catch {
      toast('復元できませんでした。通信を確かめてね');
    } finally {
      setBusy(false);
    }
  };
  const locked = () => { toast('なかまセットで選べるようになります'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const pickAnimal = (a: AnimalId) => { if (a !== D.FREE_ANIMAL && !owned) return locked(); tap(); put('animal', a); };
  const pickJar = (j: JarId) => { if (j !== D.FREE_JAR && !owned) return locked(); tap(); put('jar', j); };
  const goalsText = new Set(st.goals).size === 1 ? (st.goals[0] ? `毎日 ${fmtHM(st.goals[0] * 60_000)}` : 'なし') : '曜日ごと';
  const price = billing.status === 'ready' ? billing.price : '';

  return (
    <div className="screen set">
      <Plate name="plate_set" label="セット 見た目をカスタマイズして こつびんをもっとたのしく" />

      <div className="stack">
        <section className="card nakama" aria-label="なかまセット">
          <div className="nk-top">
            <div className="nk-left">
              <img className="art nk-ribbon" src={art('set_ribbon')} alt="なかまセット" />
              <p className="nk-lead">こつびんに新しい<br />なかまたちと びんのカタチを<br />追加できる みためのセットです。</p>
            </div>
            <div className="nk-note">
              <img className="art" src={art('set_note')} alt="" />
              <div className="nk-price">
                {owned ? <b className="nk-owned">購入ずみ</b> : <b className="num">{price || '―'}</b>}
                <span>買い切り</span>
              </div>
            </div>
          </div>
          <img className="art nk-shelf" src={art('nakama_shelf')} alt="シマエナガ・うさぎ・ペンギンと、ほしのびん・まるびん" />
        </section>

        <section className="card nk-contents" aria-label="なかまセットの内容">
          <img className="art nk-ribbon2" src={art('set_ribbon2')} alt="なかまセットの内容" />
          <div className="nk-cols">
            <div><img className="art" src={art('set_animals')} alt="" /><b>なかま 3ひき</b><span>シマエナガ・うさぎ・ペンギン</span></div>
            <div><img className="art" src={art('set_jars')} alt="" /><b>びんのカタチ 2種類</b><span>ほしのびん・まるびん</span></div>
          </div>
        </section>

        <section className="card nk-free">
          <img className="art" src={art('mini_set')} alt="" />
          <div>
            <b className="nk-free-badge">記録機能は すべて無料 です</b>
            <p>このセットは 見た目だけを追加する課金です。作業の記録・タイマーなどの基本機能は ずっと無料でご利用いただけます。</p>
          </div>
        </section>

        {owned ? null : billing.status === 'ready' ? (
          <button className="btn btn-gold btn-buy" disabled={busy} onClick={buy}><IconCart size={28} /><span className="num">{price}</span>でひらく<IconNext size={24} /></button>
        ) : (
          <button className="btn btn-gold btn-buy" disabled>{billing.status === 'loading' ? 'ストアを確かめています' : billing.reason}</button>
        )}
        {!owned && <button className="btn btn-text" disabled={busy} onClick={doRestore}>購入を復元</button>}

        <section className="card" aria-label="相棒とびん">
          <h2 className="card-title">相棒とびん</h2>
          <div className="choose" role="radiogroup" aria-label="相棒">
            {D.ANIMALS.map((a) => {
              const lock = a !== D.FREE_ANIMAL && !owned;
              const on = st.animal === a;
              return (
                <button key={a} role="radio" aria-checked={on} className={'choice' + (on ? ' on' : '')} onClick={() => pickAnimal(a)} aria-label={D.ANIMAL_LABEL[a] + (lock ? '(なかまセット)' : '')}>
                  <img className="art" src={art(ANIMAL_MINI[a])} alt="" />
                  <span>{D.ANIMAL_LABEL[a]}</span>
                  {lock && <i className="lock"><IconLock size={16} /></i>}
                  {on && <i className="tick"><IconCheck size={16} /></i>}
                </button>
              );
            })}
          </div>
          <label className="field-row">
            <span>名前</span>
            <input className="input" value={st.names[st.animal]} maxLength={12}
              onChange={(e) => put('names', { ...st.names, [st.animal]: e.target.value })}
              onBlur={(e) => { if (!e.target.value.trim()) put('names', { ...st.names, [st.animal]: D.DEFAULT_NAMES[st.animal] }); }} />
          </label>
          <div className="choose" role="radiogroup" aria-label="びんの形">
            {D.JARS.map((j) => {
              const lock = j !== D.FREE_JAR && !owned;
              const on = st.jar === j;
              return (
                <button key={j} role="radio" aria-checked={on} className={'choice' + (on ? ' on' : '')} onClick={() => pickJar(j)} aria-label={D.JAR_LABEL[j] + (lock ? '(なかまセット)' : '')}>
                  {j === 'std' ? <CellJar colors={['sora', 'mikan', 'wakaba', 'fuji', 'sora', 'kinako']} width={44} /> : <img className="art" src={art(JAR_THUMB[j])} alt="" />}
                  <span>{D.JAR_LABEL[j]}</span>
                  {lock && <i className="lock"><IconLock size={16} /></i>}
                  {on && <i className="tick"><IconCheck size={16} /></i>}
                </button>
              );
            })}
          </div>
        </section>

        <section className="card" aria-label="記録の設定">
          <h2 className="card-title">記録</h2>
          <button className="set-row" onClick={() => ctx.go({ tab: 'set', sub: 'goals' })}>
            <span>1日の目標</span><span className="set-val">{goalsText}</span><IconNext size={20} />
          </button>
          <SelectRow label="1日の区切り" value={st.dayStartHour} onChange={(v) => put('dayStartHour', v)}
            options={[0, 1, 2, 3, 4, 5].map((h) => [h, `${h}:00`])} note="夜ふかしの日は、区切りを遅くすると前の日の分になります" />
          <button className="set-row" onClick={() => ctx.go({ tab: 'edit', sub: 'cats' })}>
            <span>作業の種類</span><span className="set-val">{D.activeCats(d).length}つ</span><IconNext size={20} />
          </button>
        </section>

        <section className="card" aria-label="休憩と合図">
          <h2 className="card-title">休憩と合図</h2>
          <SelectRow label="休憩の長さ" value={st.restMin} onChange={(v) => put('restMin', v)}
            options={[3, 5, 10, 15, 20, 30, 45, 60].map((m) => [m, `${m}分`])} />
          <SelectRow label="作業の区切りの合図" value={st.chimeMin} onChange={async (v) => {
            put('chimeMin', v);
            if (v > 0 && st.notify === 'unknown') put('notify', await askNotify());
          }} options={[[0, 'なし'], [25, '25分'], [45, '45分'], [50, '50分'], [60, '60分'], [90, '90分']]} />
          <div className="set-row static">
            <span>通知</span><span className="set-val">{st.notify === 'on' ? '使う' : st.notify === 'off' ? '使わない' : 'まだ決めていない'}</span>
          </div>
          {st.notify === 'off' && (
            <p className="row-note">
              通知を使わないときは、アプリを開いたときに色と振動で知らせます。あとから使うときは、端末の設定で「こつびん」の通知をオンにしてから下を押してね。
              <button className="btn btn-text" onClick={async () => put('notify', await askNotify())}>もう一度たずねる</button>
            </p>
          )}
        </section>

        <section className="card" aria-label="見た目">
          <h2 className="card-title">画面の明るさ</h2>
          <div className="toggle wide" role="radiogroup" aria-label="画面の明るさ">
            {([['auto', '端末に合わせる'], ['light', '明るい'], ['dark', '暗い']] as [Theme, string][]).map(([v, l]) => (
              <button key={v} role="radio" aria-checked={st.theme === v} className={st.theme === v ? 'on' : ''} onClick={() => put('theme', v)}>{l}</button>
            ))}
          </div>
        </section>

        <section className="card" aria-label="このアプリについて">
          <h2 className="card-title">このアプリについて</h2>
          <a className="set-row" href={CONFIG.privacyUrl} target="_blank" rel="noreferrer"><span>プライバシーポリシー</span><IconNext size={20} /></a>
          <p className="row-note">記録はこの端末の中だけに保存します。アカウントも広告もありません。</p>
          <div className="set-row static"><span>バージョン</span><span className="set-val num">{CONFIG.version}</span></div>
          {!confirmClear ? (
            <button className="btn btn-text btn-alert" onClick={() => setConfirmClear(true)}>記録をすべて消す</button>
          ) : (
            <div className="confirm">
              <p>記録と設定がすべて消えて、もとに戻せません。消していい？</p>
              <div className="btn-row">
                <button className="btn btn-white grow" onClick={() => setConfirmClear(false)}>やめる</button>
                <button className="btn btn-alert-fill grow" onClick={async () => { await clearData(); location.reload(); }}>すべて消す</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SelectRow({ label, value, options, onChange, note }: { label: string; value: number; options: [number, string][]; onChange: (v: number) => void; note?: string }) {
  const id = 'sel-' + label;
  return (
    <>
      <label className="set-row" htmlFor={id}>
        <span>{label}</span>
        <select id={id} className="select num" value={value} onChange={(e) => onChange(Number(e.target.value))}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <IconDown size={18} />
      </label>
      {note && <p className="row-note">{note}</p>}
    </>
  );
}

const GOAL_OPTIONS: [number, string][] = [[0, 'なし'], ...Array.from({ length: 24 }, (_, i) => {
  const m = (i + 1) * 30;
  return [m, fmtHM(m * 60_000)] as [number, string];
})];

function GoalsPage({ ctx }: { ctx: Ctx }) {
  const { d } = ctx;
  const put = useSetting(ctx);
  const goals = d.settings.goals;
  const same = new Set(goals).size === 1;
  return (
    <div className="screen set goals">
      <header className="bar">
        <button className="bar-back" onClick={() => ctx.go({ tab: 'set' })} aria-label="セットへ戻る"><IconBack size={26} /><span>セット</span></button>
        <h1 className="bar-date">1日の目標</h1>
        <span />
      </header>
      <div className="stack">
        <section className="card">
          <p className="hint">目標に届いた日は、きょうの画面で知らせます。休みの曜日は「なし」にできます。</p>
          <SelectRow label="まとめて決める" value={same ? goals[0] : -1} onChange={(v) => v >= 0 && put('goals', goals.map(() => v))}
            options={same ? GOAL_OPTIONS : [[-1, '曜日ごと'], ...GOAL_OPTIONS]} />
        </section>
        <section className="card">
          <h2 className="card-title">曜日ごと</h2>
          {[1, 2, 3, 4, 5, 6, 0].map((w) => (
            <SelectRow key={w} label={`${weekdayName(w)}曜日`} value={goals[w]} onChange={(v) => put('goals', goals.map((g, i) => (i === w ? v : g)))} options={GOAL_OPTIONS} />
          ))}
        </section>
      </div>
    </div>
  );
}
