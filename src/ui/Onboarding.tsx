import { useState } from 'react';
import { Scene } from '../art/Scene';
import { DEFAULT_NAMES } from '../domain/data';
import type { AppData } from '../domain/types';
import { tap } from '../platform/native';
import { demoColors } from './sheets';
import { CANDY } from '../domain/colors';

/** はじめて開いたとき。2画面で終わり、どちらからでも飛ばせる */
export function Onboarding({ d, onDone }: { d: AppData; onDone: (name: string) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(DEFAULT_NAMES.hamster);
  const finish = () => { tap(); onDone(name.trim() || DEFAULT_NAMES.hamster); };

  return (
    <div className="onb">
      <div className="onb-top">
        <span className="onb-step num" aria-label={`${step + 1}/2`}>{step + 1} / 2</span>
        <button className="btn btn-text" onClick={finish}>とばす</button>
      </div>

      {step === 0 ? (
        <>
          <Scene animal="hamster" jar={d.settings.jar} colors={demoColors(17)} mode="focus" holdColor={CANDY.sora.hex} maxHeight={260} label="ハムスターが金平糖をみがき、びんに金平糖がたまっている絵" />
          <div className="onb-text">
            <h1 className="onb-title">がんばった時間が、<br />びんの金平糖になる。</h1>
            <p className="onb-body">「はじめる」を押すと、となりで相棒が金平糖をみがきます。10分ごとに1粒。1日で1びん。</p>
          </div>
          <div className="onb-dock">
            <button className="btn btn-primary btn-big" onClick={() => { tap(); setStep(1); }}>つぎへ</button>
          </div>
        </>
      ) : (
        <>
          <Scene animal="hamster" jar={d.settings.jar} colors={[]} mode="idle" maxHeight={260} label="ハムスターと空のびん" />
          <div className="onb-text">
            <h1 className="onb-title">相棒に名前をつけてね</h1>
            <p className="onb-body">あとから、せっていで変えられます。</p>
            <label className="field">
              <span className="field-label">名前</span>
              <input className="input" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} />
            </label>
          </div>
          <div className="onb-dock">
            <button className="btn btn-primary btn-big" onClick={finish}>{(name.trim() || DEFAULT_NAMES.hamster)}とはじめる</button>
          </div>
        </>
      )}
    </div>
  );
}
