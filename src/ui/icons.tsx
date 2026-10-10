import type { CatIcon } from '../domain/types';

/** 見本の「アイコンテイスト」(⑤): 角の丸い、塗りのアイコン。24px の格子。色は currentColor */
type P = { size?: number; className?: string };
const S = ({ size = 24, className, children }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    {children}
  </svg>
);

export const IconHome = (p: P) => (
  <S {...p}><path d="M11.2 2.6a1.3 1.3 0 0 1 1.6 0l8.4 6.7c.7.6.3 1.7-.6 1.7H19v8.6c0 1-.8 1.9-1.8 1.9h-3.1v-5.2a1.2 1.2 0 0 0-1.2-1.2h-1.8a1.2 1.2 0 0 0-1.2 1.2v5.2H6.8c-1 0-1.8-.9-1.8-1.9V11H3.4c-.9 0-1.3-1.1-.6-1.7z" /></S>
);
export const IconBooks = (p: P) => (
  <S {...p}>
    <rect x="3" y="4" width="3.6" height="14" rx="1" /><rect x="7.6" y="4" width="3.6" height="14" rx="1" />
    <path d="m12.6 5.6 3.3-1.3a1 1 0 0 1 1.3.6l4.1 11.4a1 1 0 0 1-.6 1.3l-.4.1z" />
    <rect x="2.5" y="19.3" width="19" height="2" rx="1" />
  </S>
);
export const IconEdit = (p: P) => (
  <S {...p}>
    <path d="M5 4h8.5l-2 2H5.6a.6.6 0 0 0-.6.6v11.8c0 .3.3.6.6.6h11.8c.3 0 .6-.3.6-.6v-5.9l2-2v8.5c0 1.4-1.1 2.5-2.5 2.5H5A2.5 2.5 0 0 1 2.5 19V6.5C2.5 5.1 3.6 4 5 4z" />
    <path d="M19.3 2.6a1.6 1.6 0 0 1 2.2 2.2l-8.6 8.6-3.3 1.1 1.1-3.3z" />
  </S>
);
export const IconGear = (p: P) => (
  <S {...p}><path fillRule="evenodd" d="M10.3 2h3.4l.5 2.6c.6.2 1.2.5 1.7.9l2.5-.9 1.7 2.9-2 1.8c.1.6.1 1.2 0 1.8l2 1.8-1.7 2.9-2.5-.9c-.5.4-1.1.7-1.7.9l-.5 2.6h-3.4l-.5-2.6c-.6-.2-1.2-.5-1.7-.9l-2.5.9-1.7-2.9 2-1.8a6 6 0 0 1 0-1.8l-2-1.8 1.7-2.9 2.5.9c.5-.4 1.1-.7 1.7-.9zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z" transform="translate(0 1)" /></S>
);
export const IconCalendar = (p: P) => (
  <S {...p}>
    <path fillRule="evenodd" d="M7 2.5a1 1 0 0 1 1 1V4h8v-.5a1 1 0 1 1 2 0V4h.5A2.5 2.5 0 0 1 21 6.5v12a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-12A2.5 2.5 0 0 1 5.5 4H6v-.5a1 1 0 0 1 1-1zM5 9v9.5c0 .3.2.5.5.5h13c.3 0 .5-.2.5-.5V9z" />
    <rect x="7" y="11" width="2.4" height="2.2" rx=".5" /><rect x="10.8" y="11" width="2.4" height="2.2" rx=".5" /><rect x="14.6" y="11" width="2.4" height="2.2" rx=".5" />
    <rect x="7" y="14.8" width="2.4" height="2.2" rx=".5" /><rect x="10.8" y="14.8" width="2.4" height="2.2" rx=".5" /><rect x="14.6" y="14.8" width="2.4" height="2.2" rx=".5" />
  </S>
);
export const IconChart = (p: P) => (
  <S {...p}><rect x="4" y="10" width="3.6" height="9" rx="1" /><rect x="10.2" y="5" width="3.6" height="14" rx="1" /><rect x="16.4" y="12" width="3.6" height="7" rx="1" /><rect x="2.5" y="19.5" width="19" height="2" rx="1" /></S>
);
export const IconBack = (p: P) => (
  <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className={p.className} aria-hidden><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
);
export const IconNext = (p: P) => (
  <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className={p.className} aria-hidden><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>
);
export const IconUp = (p: P) => (
  <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className={p.className} aria-hidden><path d="M6.5 14.5 12 9l5.5 5.5" /></svg>
);
export const IconDown = (p: P) => (
  <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className={p.className} aria-hidden><path d="M6.5 9.5 12 15l5.5-5.5" /></svg>
);
export const IconClose = (p: P) => (
  <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className={p.className} aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconPlay = (p: P) => (<S {...p}><path d="M7 4.6c0-1 1.1-1.6 2-1.1l10.4 6.4c.8.5.8 1.7 0 2.2L9 18.5c-.9.5-2-.1-2-1.1z" transform="translate(0 1)" /></S>);
export const IconPause = (p: P) => (<S {...p}><rect x="5.5" y="4" width="4.6" height="16" rx="1.6" /><rect x="13.9" y="4" width="4.6" height="16" rx="1.6" /></S>);
export const IconStop = (p: P) => (<S {...p}><rect x="5" y="5" width="14" height="14" rx="2.4" /></S>);
export const IconPlus = (p: P) => (
  <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" className={p.className} aria-hidden><path d="M12 5v14M5 12h14" /></svg>
);
export const IconTrash = (p: P) => (
  <S {...p}><path d="M9 2.5h6a1 1 0 0 1 1 1V5h4a1 1 0 1 1 0 2H4a1 1 0 0 1 0-2h4V3.5a1 1 0 0 1 1-1z" /><path fillRule="evenodd" d="M5.5 8.5h13l-.9 11.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8zm4 2.5a.9.9 0 0 0-.9 1l.4 6a.9.9 0 0 0 1.8-.1l-.4-6a.9.9 0 0 0-.9-.9zm5 0a.9.9 0 0 0-.9.9l-.4 6a.9.9 0 1 0 1.8.1l.4-6a.9.9 0 0 0-.9-1z" /></S>
);
export const IconClock = (p: P) => (
  <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className={p.className} aria-hidden><circle cx="12" cy="12" r="8.6" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IconBed = (p: P) => (
  <S {...p}><rect x="2" y="5" width="2.6" height="15" rx="1" /><rect x="2" y="13" width="20" height="3.4" rx="1" /><rect x="19.4" y="10" width="2.6" height="10" rx="1" /><rect x="6" y="8" width="5" height="4" rx="1.6" /><path d="M12 9a1 1 0 0 1 1-1h5a3 3 0 0 1 3 3v1h-9z" /></S>
);
export const IconMoon = (p: P) => (<S {...p}><path d="M14.5 3.2a8.6 8.6 0 1 0 6.3 12.6A7 7 0 0 1 14.5 3.2z" /></S>);
export const IconSprout = (p: P) => (
  <S {...p}><path d="M11.2 21v-7.1C10.1 10.6 7 9 3.5 9.3c.2 3.6 2.6 6 6 6.1h.1V21z" /><path d="M12.8 21v-8.7c.6-3.6 3.5-5.9 7.7-5.8 0 4.1-2.5 6.9-6.1 7.2v7.3z" /></S>
);
export const IconClover = (p: P) => (
  <S {...p}><circle cx="9" cy="8.5" r="3.6" /><circle cx="15" cy="8.5" r="3.6" /><circle cx="9" cy="14.5" r="3.6" /><circle cx="15" cy="14.5" r="3.6" /><path d="M12 12c1.5 3 2.4 6 2 9" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></S>
);
export const IconCrown = (p: P) => (<S {...p}><path d="M3 8l4.5 3.6L12 5l4.5 6.6L21 8l-1.8 10H4.8z" /></S>);
export const IconFlame = (p: P) => (<S {...p}><path d="M12.6 2c.6 3.4 5.9 6.5 5.9 11.8A6.5 6.5 0 0 1 12 20.5a6.5 6.5 0 0 1-6.5-6.7c0-2.8 1.7-4.6 3-5.6.1 1.6.7 2.9 1.9 3.6C10.2 7.6 11.3 4.4 12.6 2z" /></S>);
export const IconCart = (p: P) => (
  <S {...p}><path d="M2 3.5a1 1 0 0 1 1-1h1.8a1.6 1.6 0 0 1 1.5 1.2L6.6 5H20a1 1 0 0 1 1 1.2l-1.5 7a1.6 1.6 0 0 1-1.6 1.3H8.5l.3 1.5h9.7a1 1 0 1 1 0 2H8.1a1.6 1.6 0 0 1-1.6-1.3L4.4 4.5H3a1 1 0 0 1-1-1z" /><circle cx="9.5" cy="20.2" r="1.6" /><circle cx="17" cy="20.2" r="1.6" /></S>
);
export const IconPencil = (p: P) => (<S {...p}><path d="M16.1 3.4a2.2 2.2 0 0 1 3.1 0l1.4 1.4c.9.9.9 2.3 0 3.1L9.2 19.3l-5.3 1.4a.5.5 0 0 1-.6-.6l1.4-5.3z" /></S>);
export const IconMemo = (p: P) => (
  <S {...p}><path fillRule="evenodd" d="M6 2.5h12A2.5 2.5 0 0 1 20.5 5v14a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 19V5A2.5 2.5 0 0 1 6 2.5zM7.5 7a1 1 0 0 0 0 2h9a1 1 0 1 0 0-2zm0 4a1 1 0 0 0 0 2h9a1 1 0 1 0 0-2zm0 4a1 1 0 0 0 0 2h5a1 1 0 1 0 0-2z" /></S>
);
export const IconImage = (p: P) => (
  <S {...p}><path fillRule="evenodd" d="M5 3h14a2.5 2.5 0 0 1 2.5 2.5v13A2.5 2.5 0 0 1 19 21H5a2.5 2.5 0 0 1-2.5-2.5v-13A2.5 2.5 0 0 1 5 3zm-.5 13.3V18.5c0 .3.2.5.5.5h14c.3 0 .5-.2.5-.5v-2.7l-4-4.2-4.4 4.6-2.6-2.4zM8.5 6.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" /></S>
);
export const IconSave = (p: P) => (
  <S {...p}><path d="M12 3a1.2 1.2 0 0 1 1.2 1.2v8.1l2.6-2.6a1.2 1.2 0 1 1 1.7 1.7l-4.6 4.6a1.2 1.2 0 0 1-1.8 0l-4.6-4.6a1.2 1.2 0 1 1 1.7-1.7l2.6 2.6V4.2A1.2 1.2 0 0 1 12 3z" /><path d="M4 16a1.2 1.2 0 0 1 1.2 1.2v1.6h13.6v-1.6a1.2 1.2 0 1 1 2.4 0v2.3c0 1-.8 1.7-1.7 1.7H4.5c-1 0-1.7-.8-1.7-1.7v-2.3A1.2 1.2 0 0 1 4 16z" /></S>
);
export const IconLaptop = (p: P) => (
  <S {...p}><path fillRule="evenodd" d="M5 4h14a2 2 0 0 1 2 2v9H3V6a2 2 0 0 1 2-2zm.5 2.3v6.4h13V6.3z" /><path d="M1.5 16.5h21c0 1.7-1.3 3-3 3h-15a3 3 0 0 1-3-3z" /><path d="M9.6 9.6c.6.6 1.4.9 2.4.9s1.8-.3 2.4-.9" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" /></S>
);
export const IconLock = (p: P) => (
  <S {...p}><path fillRule="evenodd" d="M12 2.5A4.5 4.5 0 0 0 7.5 7v2.5H7A2.5 2.5 0 0 0 4.5 12v7A2.5 2.5 0 0 0 7 21.5h10a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 0 17 9.5h-.5V7A4.5 4.5 0 0 0 12 2.5zm2.5 7V7a2.5 2.5 0 1 0-5 0v2.5z" /></S>
);
export const IconCheck = (p: P) => (
  <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={p.className} aria-hidden><path d="m5.5 12.5 4 4 9-9" /></svg>
);
export const IconShare = IconImage;

/* ---------- 作業の種類のしるし ---------- */
const CatBook = (p: P) => (
  <S {...p}><path d="M2 5.6c0-.6.4-1.1 1-1.1 3.2-.2 5.9.5 8 2v13.1c-2.2-1.4-4.8-2-8-1.8-.6 0-1-.4-1-1z" /><path d="M22 5.6c0-.6-.4-1.1-1-1.1-3.2-.2-5.9.5-8 2v13.1c2.2-1.4 4.8-2 8-1.8.6 0 1-.4 1-1z" /></S>
);
const CatBag = (p: P) => (
  <S {...p}><path fillRule="evenodd" d="M9 3h6a2 2 0 0 1 2 2v1.5h2.5A2.5 2.5 0 0 1 22 9v3.2H2V9a2.5 2.5 0 0 1 2.5-2.5H7V5a2 2 0 0 1 2-2zm.2 2.2v1.3h5.6V5.2z" /><path d="M2 13.6h8.3v.9a1.2 1.2 0 0 0 1.2 1.2h1a1.2 1.2 0 0 0 1.2-1.2v-.9H22V18a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18z" /></S>
);
const CatRead = (p: P) => (
  <S {...p}><path fillRule="evenodd" d="M4 3.5h6.5a2.5 2.5 0 0 1 1.5.5 2.5 2.5 0 0 1 1.5-.5H20a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-6.2c-.7 0-1.2.4-1.4 1h-.8c-.2-.6-.7-1-1.4-1H4A1.5 1.5 0 0 1 2.5 18V5A1.5 1.5 0 0 1 4 3.5zm1 2v11.6h5.4c.4 0 .7.1 1 .2V6.5c0-.6-.4-1-1-1zm8.6 1V17.3c.3-.1.6-.2 1-.2H19V5.5h-4.4c-.6 0-1 .4-1 1z" /></S>
);
const CatGame = (p: P) => (
  <S {...p}><path fillRule="evenodd" d="M7.3 6h9.4a5 5 0 0 1 4.9 4l1 5.2a3.2 3.2 0 0 1-5.6 2.7L15.4 16H8.6L7 17.9a3.2 3.2 0 0 1-5.6-2.7l1-5.2a5 5 0 0 1 4.9-4zM7 8.5a.9.9 0 0 0-.9.9v1.2H4.9a.9.9 0 1 0 0 1.8h1.2v1.2a.9.9 0 1 0 1.8 0v-1.2h1.2a.9.9 0 1 0 0-1.8H7.9V9.4A.9.9 0 0 0 7 8.5zm9.8.6a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zm-2.3 2.4a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z" /></S>
);
const CatMusic = (p: P) => (<S {...p}><path d="M20 3.5v11.8a3.2 3.2 0 1 1-2-3V7.6l-8 1.8v8a3.2 3.2 0 1 1-2-3V6.8a1 1 0 0 1 .8-1l10-2.3a1 1 0 0 1 1.2 1z" /></S>);
const CatStar = (p: P) => (<S {...p}><path d="M12 2.8l2.8 5.7 6.3.9-4.5 4.4 1 6.2L12 17l-5.6 3 1-6.2-4.5-4.4 6.3-.9z" /></S>);
const CatRun = (p: P) => (<S {...p}><circle cx="15" cy="4.3" r="2.2" /><path d="M10.2 7.4c1.5-.7 3.4-.6 4.6.5l2 1.9 2.4.2a1 1 0 0 1-.1 2l-3-.2-1.3-1.2-1 3.4 2.6 2.3c.3.3.4.6.4 1l-.3 4.1a1 1 0 0 1-2-.1l.2-3.6-3-2.4-1.2 3.6a1 1 0 0 1-.7.6l-4.2 1a1 1 0 1 1-.5-1.9l3.7-.9 2.3-7.4-1.2.5-1.3 2.4a1 1 0 1 1-1.8-1z" /></S>);
const CatCode = (p: P) => (
  <S {...p}><path fillRule="evenodd" d="M4.5 3.5h15A2.5 2.5 0 0 1 22 6v12a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18V6a2.5 2.5 0 0 1 2.5-2.5zm3.2 5.6a1 1 0 0 0-1.4 1.4L8 12.2l-1.7 1.7a1 1 0 0 0 1.4 1.4l2.4-2.4a1 1 0 0 0 0-1.4zm4.3 4.4a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2z" /></S>
);

export function CatGlyph({ icon, size = 22, className }: { icon: CatIcon; size?: number; className?: string }) {
  const p = { size, className };
  switch (icon) {
    case 'book': return <CatBook {...p} />;
    case 'bag': return <CatBag {...p} />;
    case 'read': return <CatRead {...p} />;
    case 'game': return <CatGame {...p} />;
    case 'pen': return <IconPencil {...p} />;
    case 'music': return <CatMusic {...p} />;
    case 'home': return <IconHome {...p} />;
    case 'run': return <CatRun {...p} />;
    case 'code': return <CatCode {...p} />;
    default: return <CatStar {...p} />;
  }
}
