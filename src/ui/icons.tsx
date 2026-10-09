/** 線のアイコン。24px の格子に 1.75 の線で描く。絵文字は使わない */
type P = { size?: number; className?: string };
const S = ({ size = 24, className, children }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    {children}
  </svg>
);

/** きょう: ふたつきのびん */
export const IconJar = (p: P) => (
  <S {...p}>
    <rect x="8" y="2.5" width="8" height="3" rx="1" />
    <path d="M9 5.5v1.5c-2.5 1-4 2.6-4 5V19a2.5 2.5 0 0 0 2.5 2.5h9A2.5 2.5 0 0 0 19 19v-7c0-2.4-1.5-4-4-5V5.5" />
    <path d="M8.5 15.5h.01M12 14h.01M15.5 16h.01M10 18.5h.01M14 18.5h.01" strokeWidth={2.6} />
  </S>
);

/** たな: 棚に並んだびん */
export const IconShelf = (p: P) => (
  <S {...p}>
    <path d="M3 11h18M3 20.5h18" />
    <path d="M5.5 11V6.5a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 1.5 1.5V11M14.5 11V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4" />
    <path d="M5.5 20.5V16a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 10.5 16v4.5M15 20.5v-5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v5" />
  </S>
);

/** せってい: つまみ */
export const IconSliders = (p: P) => (
  <S {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </S>
);

export const IconBack = (p: P) => (
  <S {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </S>
);

export const IconNext = (p: P) => (
  <S {...p}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </S>
);

export const IconClose = (p: P) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </S>
);

export const IconPlus = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);

export const IconLock = (p: P) => (
  <S {...p}>
    <rect x="5.5" y="10.5" width="13" height="10" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </S>
);

export const IconUp = (p: P) => (
  <S {...p}>
    <path d="M6.5 14.5 12 9l5.5 5.5" />
  </S>
);

export const IconDown = (p: P) => (
  <S {...p}>
    <path d="M6.5 9.5 12 15l5.5-5.5" />
  </S>
);

export const IconCheck = (p: P) => (
  <S {...p}>
    <path d="m5.5 12.5 4 4 9-9" />
  </S>
);

export const IconShare = (p: P) => (
  <S {...p}>
    <path d="M12 3.5v11M8 7.5l4-4 4 4" />
    <path d="M6 11.5H5.5A1.5 1.5 0 0 0 4 13v6a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-6a1.5 1.5 0 0 0-1.5-1.5H18" />
  </S>
);
