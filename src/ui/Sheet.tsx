import { useEffect, useRef } from 'react';
import { IconClose } from './icons';

/** 下から出る面。外側を押すか × で閉じる */
export function Sheet({ title, onClose, children, label }: { title: string; onClose: () => void; children: React.ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label ?? title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 className="sheet-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="閉じる"><IconClose /></button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
