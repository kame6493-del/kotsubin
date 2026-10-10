import { useState } from 'react';
import { Scene } from '../art/Scene';
import { DEFAULT_NAMES } from '../domain/data';
import type { AppData } from '../domain/types';
import { tap } from '../platform/native';
import { demoColors } from './sheets';

/** はじめて開いたとき。2画面で終わり、どちらからでも飛ばせる */
export function Onboarding({ d, onDone }: { d: AppData; onDone: (name: string) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(DEFAULT_NAMES.hamster);
  const finish = () => { tap(); onDone(name.trim() || DEFAULT_NAMES.hamster); };

  return (
    <div className="onb">
      <Scene
        mode={step === 0 ? 'focus' : 'idle'}
        animal="hamster"
        jar={d.settings.jar}
        colors={step === 0 ? demoColors(14) : []}
        tagTop={'きょうの\nこつぶ'}
        tagCount={step === 0 ? 14 : 0}
        label={step === 0 ? 'ハムスターがこんぺいとうを磨き、びんにこんぺいとうがたまっている絵' : 'ハムスターと空のびん'}
      />
      <div className="onb-body card">
        <div className="onb-top">
          <span className="onb-step num" aria-label={`${step + 1}/2`}>{step + 1} / 2</span>
          <button className="btn btn-text" onClick={finish}>とばす</button>
        </div>
        {step === 0 ? (
          <>
            <h1 className="onb-title">がんばった時間が、<br />びんのこんぺいとうになる。</h1>
            <p className="onb-text">「はじめる」を押すと、となりでハムスターがこんぺいとうを磨きます。10分ごとに1粒。1日で1びん。</p>
            <button className="btn btn-primary btn-big" onClick={() => { tap(); setStep(1); }}>つぎへ</button>
          </>
        ) : (
          <>
            <h1 className="onb-title">相棒に名前をつけてね</h1>
            <p className="onb-text">あとから「セット」で変えられます。</p>
            <label className="field">
              <span className="field-label">名前</span>
              <input className="input" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} />
            </label>
            <button className="btn btn-primary btn-big" onClick={finish}>{(name.trim() || DEFAULT_NAMES.hamster)}とはじめる</button>
          </>
        )}
      </div>
    </div>
  );
}
