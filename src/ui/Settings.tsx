import { useState } from 'react';
import { CONFIG } from '../config';
import { AnimalMini, Grain, JarMini } from '../art/Mini';
import { SPRITES } from '../art/draw';
import { CANDY } from '../domain/colors';
import * as D from '../domain/data';
import { fmtHM, weekdayName } from '../domain/time';
import type { AnimalId, Category, JarId, Settings as S, Theme } from '../domain/types';
import { askNotify, tap } from '../platform/native';
import { clearData } from '../platform/storage';
import type { Ctx } from './App';
import { IconBack, IconDown, IconLock, IconNext, IconPlus, IconUp } from './icons';
import { CategorySheet, demoColors } from './sheets';

export function Settings({ ctx }: { ctx: Ctx }) {
  if (ctx.route.sub === 'cats') return <CatsPage ctx={ctx} />;
  if (ctx.route.sub === 'goals') return <GoalsPage ctx={ctx} />;
  return <Main ctx={ctx} />;
}

function useSetting(ctx: Ctx) {
  return <K extends keyof S>(k: K, v: S[K]) => ctx.set((x) => ({ ...x, settings: { ...x.settings, [k]: v } }));
}

function Main({ ctx }: { ctx: Ctx }) {
  const { d, owned } = ctx;
  const st = d.settings;
  const put = useSetting(ctx);
  const [confirmClear, setConfirmClear] = useState(false);

  const pickAnimal = (a: AnimalId) => {
    if (a !== D.FREE_ANIMAL && !owned) return ctx.openPaywall();
    tap();
    put('animal', a);
  };
  const pickJar = (j: JarId) => {
    if (j !== D.FREE_JAR && !owned) return ctx.openPaywall();
    tap();
    put('jar', j);
  };
  const goalsText = new Set(st.goals).size === 1 ? (st.goals[0] ? `毎日 ${fmtHM(st.goals[0] * 60_000)}` : 'なし') : '曜日ごと';

  return (
    <div className="screen settings">
      <header className="top"><h1 className="top-title">せってい</h1></header>

      <h2 className="sec-title">相棒</h2>
      <div className="pick-row" role="radiogroup" aria-label="相棒">
        {D.ANIMALS.map((a) => {
          const locked = a !== D.FREE_ANIMAL && !owned;
          return (
            <button key={a} className={'pick' + (st.animal === a ? ' on' : '')} role="radio" aria-checked={st.animal === a} onClick={() => pickAnimal(a)} aria-label={SPRITES.animals[a].name + (locked ? '(なかまセット)' : '')}>
              <AnimalMini animal={a} scale={2} />
              <span className="pick-name">{SPRITES.animals[a].name}</span>
              {locked && <span className="pick-lock"><IconLock size={16} /></span>}
            </button>
          );
        })}
      </div>
      <label className="row row-input">
        <span className="row-title">名前</span>
        <input
          className="input input-inline"
          value={st.names[st.animal]}
          maxLength={12}
          onChange={(e) => put('names', { ...st.names, [st.animal]: e.target.value })}
          onBlur={(e) => { if (!e.target.value.trim()) put('names', { ...st.names, [st.animal]: D.DEFAULT_NAMES[st.animal] }); }}
        />
      </label>

      <h2 className="sec-title">びん</h2>
      <div className="pick-row" role="radiogroup" aria-label="びんの形">
        {D.JARS.map((j) => {
          const locked = j !== D.FREE_JAR && !owned;
          return (
            <button key={j} className={'pick' + (st.jar === j ? ' on' : '')} role="radio" aria-checked={st.jar === j} onClick={() => pickJar(j)} aria-label={SPRITES.jars[j].name + (locked ? '(なかまセット)' : '')}>
              <JarMini jar={j} colors={demoColors(14)} />
              <span className="pick-name">{SPRITES.jars[j].name}</span>
              {locked && <span className="pick-lock"><IconLock size={16} /></span>}
            </button>
          );
        })}
      </div>
      {!owned && (
        <button className="row row-link" onClick={ctx.openPaywall}>
          <span className="row-main"><span className="row-title">なかまセット</span><span className="row-sub">相棒3匹とびん2つ。買い切り</span></span>
          <IconNext size={20} className="row-chev" />
        </button>
      )}

      <h2 className="sec-title">記録</h2>
      <div className="group">
        <button className="row row-link" onClick={() => ctx.go({ tab: 'settings', sub: 'cats' })}>
          <span className="row-title">作業の種類</span>
          <span className="row-val">{D.activeCats(d).length}つ</span>
          <IconNext size={20} className="row-chev" />
        </button>
        <button className="row row-link" onClick={() => ctx.go({ tab: 'settings', sub: 'goals' })}>
          <span className="row-title">1日の目標</span>
          <span className="row-val">{goalsText}</span>
          <IconNext size={20} className="row-chev" />
        </button>
        <SelectRow label="1日の区切り" value={st.dayStartHour} onChange={(v) => put('dayStartHour', v)}
          options={[0, 1, 2, 3, 4, 5].map((h) => [h, `${h}:00`])} note="夜ふかしの日は、区切りを遅くすると前の日の分になります" />
      </div>

      <h2 className="sec-title">合図</h2>
      <div className="group">
        <SelectRow label="ひとやすみの長さ" value={st.restMin} onChange={(v) => put('restMin', v)}
          options={[3, 5, 10, 15, 20, 30, 45, 60].map((m) => [m, `${m}分`])} />
        <SelectRow label="作業の区切りの合図" value={st.chimeMin} onChange={async (v) => {
          put('chimeMin', v);
          if (v > 0 && st.notify === 'unknown') put('notify', await askNotify());
        }}
          options={[[0, 'なし'], [25, '25分'], [45, '45分'], [50, '50分'], [60, '60分'], [90, '90分']]} />
        <div className="row">
          <span className="row-title">通知</span>
          <span className="row-val">{st.notify === 'on' ? '使う' : st.notify === 'off' ? '使わない' : 'まだ決めていない'}</span>
        </div>
        {st.notify === 'off' && (
          <p className="row-note">
            通知を使わないときは、アプリを開いたときに色と振動で知らせます。あとから使うときは、端末の設定で「こつびん」の通知をオンにしてから下を押してね。
            <button className="btn btn-text btn-inline" onClick={async () => put('notify', await askNotify())}>もう一度たずねる</button>
          </p>
        )}
      </div>

      <h2 className="sec-title">見た目</h2>
      <div className="seg" role="radiogroup" aria-label="見た目">
        {([['auto', '端末に合わせる'], ['light', '明るい'], ['dark', '暗い']] as [Theme, string][]).map(([v, l]) => (
          <button key={v} role="radio" aria-checked={st.theme === v} className={'seg-btn' + (st.theme === v ? ' on' : '')} onClick={() => put('theme', v)}>{l}</button>
        ))}
      </div>

      <h2 className="sec-title">このアプリについて</h2>
      <div className="group">
        {owned ? (
          <div className="row"><span className="row-title">なかまセット</span><span className="row-val">購入ずみ</span></div>
        ) : null}
        <a className="row row-link" href={CONFIG.privacyUrl} target="_blank" rel="noreferrer">
          <span className="row-title">プライバシーポリシー</span>
          <IconNext size={20} className="row-chev" />
        </a>
        <p className="row-note">記録はこの端末の中だけに保存します。アカウントも広告もありません。</p>
        <div className="row"><span className="row-title">バージョン</span><span className="row-val num">1.0.0</span></div>
      </div>

      <div className="danger">
        {!confirmClear ? (
          <button className="btn btn-text btn-alert" onClick={() => setConfirmClear(true)}>記録をすべて消す</button>
        ) : (
          <div className="confirm">
            <p>記録と設定がすべて消えて、もとに戻せません。消していい？</p>
            <div className="btn-row">
              <button className="btn btn-quiet" onClick={() => setConfirmClear(false)}>やめる</button>
              <button className="btn btn-alert-fill" onClick={async () => { await clearData(); location.reload(); }}>すべて消す</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectRow({ label, value, options, onChange, note }: { label: string; value: number; options: [number, string][]; onChange: (v: number) => void; note?: string }) {
  const id = 'sel-' + label;
  return (
    <>
      <label className="row row-select" htmlFor={id}>
        <span className="row-title">{label}</span>
        <select id={id} className="select num" value={value} onChange={(e) => onChange(Number(e.target.value))}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <IconDown size={18} className="row-chev" />
      </label>
      {note && <p className="row-note">{note}</p>}
    </>
  );
}

function SubHead({ ctx, title }: { ctx: Ctx; title: string }) {
  return (
    <header className="top top-back">
      <button className="back" onClick={() => ctx.go({ tab: 'settings' })}><IconBack /><span>せってい</span></button>
      <h1 className="top-title">{title}</h1>
    </header>
  );
}

function CatsPage({ ctx }: { ctx: Ctx }) {
  const { d, set } = ctx;
  const [edit, setEdit] = useState<null | { c?: Category }>(null);
  const act = D.activeCats(d);
  const arc = D.archivedCats(d);
  return (
    <div className="screen cats">
      <SubHead ctx={ctx} title="作業の種類" />
      <p className="hint">押すと名前と色を直せます。使わなくなった種類は「しまう」と一覧から消え、記録は残ります。</p>
      <ul className="rows">
        {act.map((c, i) => (
          <li key={c.id} className="row-split">
            <button className="row row-link" onClick={() => setEdit({ c })}>
              <Grain color={CANDY[c.color].hex} />
              <span className="row-title">{c.name}</span>
            </button>
            <button className="icon-btn" disabled={i === 0} onClick={() => set((x) => D.moveCategory(x, c.id, -1))} aria-label={`${c.name}を上へ`}><IconUp /></button>
            <button className="icon-btn" disabled={i === act.length - 1} onClick={() => set((x) => D.moveCategory(x, c.id, 1))} aria-label={`${c.name}を下へ`}><IconDown /></button>
          </li>
        ))}
      </ul>
      <button className="btn btn-quiet btn-big btn-add" onClick={() => setEdit({})}><IconPlus size={20} />種類を足す</button>

      {arc.length > 0 && (
        <>
          <h2 className="sec-title">しまった種類</h2>
          <ul className="rows">
            {arc.map((c) => (
              <li key={c.id} className="row">
                <Grain color={CANDY[c.color].hex} />
                <span className="row-title muted">{c.name}</span>
                <button className="btn btn-text btn-inline" onClick={() => { set((x) => D.restoreCategory(x, c.id)); ctx.toast(`「${c.name}」を戻したよ`); }}>戻す</button>
              </li>
            ))}
          </ul>
        </>
      )}
      {edit && <CategorySheet ctx={ctx} initial={edit.c} onClose={() => setEdit(null)} />}
    </div>
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
    <div className="screen goals">
      <SubHead ctx={ctx} title="1日の目標" />
      <p className="hint">目標に届いた日は、たなの日付の下に印がつきます。休みの曜日は「なし」にできます。</p>
      <div className="group">
        <SelectRow label="まとめて決める" value={same ? goals[0] : -1} onChange={(v) => v >= 0 && put('goals', goals.map(() => v))}
          options={same ? GOAL_OPTIONS : [[-1, '曜日ごと'], ...GOAL_OPTIONS]} />
      </div>
      <h2 className="sec-title">曜日ごと</h2>
      <div className="group">
        {[1, 2, 3, 4, 5, 6, 0].map((w) => (
          <SelectRow key={w} label={`${weekdayName(w)}曜日`} value={goals[w]} onChange={(v) => put('goals', goals.map((g, i) => (i === w ? v : g)))} options={GOAL_OPTIONS} />
        ))}
      </div>
    </div>
  );
}
