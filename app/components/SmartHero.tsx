'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackClickHeroMezuzot, trackClickHeroTefillin, trackClickWhatsApp } from '@/lib/analytics';

type HeroState = 'main' | 'mezuzah' | 'tefillin' | 'unsure' | 'klaf';

const WA_LINK = 'https://wa.me/972552722228?text=שלום אני מעוניין בעזרה ופרטים נוספים';

function IconScroll({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>;
}
function IconBox({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>;
}
function IconSearch({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function IconPen({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>;
}
function IconBook({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>;
}
function IconWhatsApp({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.057 23.286a.75.75 0 00.92.92l5.427-1.476A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.5-5.25-1.377l-.376-.217-3.898 1.059 1.059-3.898-.217-.376A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>;
}
function IconArrowLeft({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
}
function IconCheck({ size = 13, color = '#b8972a' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function IconShield({ size = 13, color = '#b8972a' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z" /></svg>;
}

type BtnStyle = 'gold' | 'outline' | 'ghost';
interface HeroButton { label: string; icon: React.ReactNode; action: () => void; style: BtnStyle; }

export default function SmartHero({ isMobile, bgImage }: {
  isMobile: boolean; onScrollToProducts: () => void; onSelectCat: (cat: string) => void; bgImage?: string;
}) {
  const [state, setState]         = useState<HeroState>('main');
  const [animating, setAnimating] = useState(false);
  const router = useRouter();

  function switchState(next: HeroState) {
    setAnimating(true);
    setTimeout(() => { setState(next); setAnimating(false); }, 220);
  }

  const content: Record<HeroState, { headline: string; sub?: string; body?: string; support?: string; trust?: string[]; buttons: HeroButton[]; }> = {
    main: {
      headline: 'ישירות מהסופר שלך',
      sub: 'ללא פערי תיווך',
      trust: [
        'המזוזות נבדקות ע"י רב מוסמך · צילום קלף אמיתי לפני משלוח',
        'תעודת כשרות והסמכה לכל סופר',
        'אפשרות להחזר כספי מלא',
      ],
      buttons: [
        { label: 'ראה קלפי מזוזה', icon: <IconScroll size={14} color="#0c1a35" />, action: () => { trackClickHeroMezuzot(); router.push('/category/קלפי מזוזה'); }, style: 'gold' },
        { label: 'ראה תפילין',     icon: <IconBox size={14} color="#fff" />,        action: () => { trackClickHeroTefillin(); router.push('/category/תפילין קומפלט'); }, style: 'outline' },
      ],
    },
    mezuzah: {
      headline: 'כך בוחרים מזוזה נכון',
      body: 'רוב האנשים בוחרים לפי מחיר —\nאבל ההבדל האמיתי הוא באיכות הכתיבה, בבדיקה, ובמי שכתב אותה.\n\nאצלנו אתה לא קונה "סתם מזוזה" —\nאתה רואה את הקלף ובוחר מתוך הבנה.',
      support: 'אפשר לראות את הקלף לפני הקנייה ולבחור מתוך גלריה אמיתית',
      buttons: [
        { label: 'ראה בתי מזוזה',      icon: <IconSearch size={14} color="#0c1a35" />, action: () => router.push('/category/מזוזות'), style: 'gold' },
        { label: 'בחר לפי סופר',       icon: <IconPen size={14} color="#fff" />,        action: () => router.push('/soferim'),         style: 'outline' },
        { label: 'למד איך לבחור נכון', icon: <IconBook size={14} color="#fff" />,        action: () => router.push('/madrich'),         style: 'ghost' },
      ],
    },
    tefillin: {
      headline: 'תפילין לא קונים בלי להבין',
      body: 'יש הבדל גדול בין תפילין כשרות לבין תפילין מהודרות —\nוהוא לא תמיד נראה לעין.\n\nאנחנו עוזרים לך להבין בדיוק מה אתה מקבל\nולבחור מתוך ביטחון אמיתי.',
      support: 'הבחירה הנכונה מתחילה בהבנה — לא במחיר',
      buttons: [
        { label: 'ראה תפילין',          icon: <IconSearch size={14} color="#0c1a35" />, action: () => router.push('/category/תפילין קומפלט'), style: 'gold' },
        { label: 'מדריך לבחירה נכונה', icon: <IconBook size={14} color="#fff" />,       action: () => router.push('/madrich'),                 style: 'outline' },
        { label: 'שאל סופר',            icon: <IconWhatsApp size={14} color="#fff" />,  action: () => { trackClickWhatsApp('hero'); window.open(WA_LINK, '_blank'); },          style: 'ghost' },
      ],
    },
    klaf: {
      headline: 'בחר קלף מזוזה ספציפי',
      body: 'אצלנו אתה לא קונה "סתם מזוזה" —\nאתה בוחר קלף ספציפי מתוך גלריה אמיתית.\n\nכל קלף מצולם, נבדק ומוצג לפני מכירה.\nאתה רואה בדיוק מה מגיע אליך.',
      support: 'ניתן לשלוח את תמונת הקלף לרב שלך לפני הקנייה',
      buttons: [
        { label: 'קלפי מזוזה',   icon: <IconSearch size={14} color="#0c1a35" />, action: () => router.push('/category/קלפי מזוזה'),  style: 'gold' },
        { label: 'קלפי תפילין',  icon: <IconBox size={14} color="#fff" />,        action: () => router.push('/category/קלפי תפילין'), style: 'outline' },
        { label: 'למד על קלפים', icon: <IconBook size={14} color="#fff" />,        action: () => router.push('/madrich'),              style: 'ghost' },
      ],
    },
    unsure: {
      headline: 'בוא נבחר יחד',
      body: 'לא צריך להבין בסת״מ כדי לבחור נכון.\nתכתוב לנו מה אתה מחפש — ונכוון אותך בצורה פשוטה וברורה.',
      support: 'אנחנו כאן כדי לעזור לך לבחור — לא סתם למכור',
      buttons: [
        { label: 'דבר איתנו בוואטסאפ', icon: <IconWhatsApp size={14} color="#0c1a35" />, action: () => { trackClickWhatsApp('hero'); window.open(WA_LINK, '_blank'); }, style: 'gold' },
        { label: 'התחל מדריך קצר',      icon: <IconBook size={14} color="#fff" />,         action: () => router.push('/madrich'),         style: 'outline' },
        { label: 'הכר את הסופרים',      icon: <IconPen size={14} color="#fff" />,           action: () => router.push('/soferim'),         style: 'ghost' },
      ],
    },
  };

  const c = content[state];
  const isMain = state === 'main';
  return (
    <div style={{ position: 'relative', width: '100%', minHeight: isMobile ? 260 : 360, overflow: 'hidden', display: 'flex', alignItems: 'center', direction: 'rtl' }}>
      {bgImage ? (
        <img src={bgImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
      ) : (
        <>
          <video autoPlay muted loop playsInline poster="/images/stam-hero.jpg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}>
            <source src="/video/hero-stam.mp4" type="video/mp4" />
          </video>
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(160deg, #1a1008 0%, #2d1f0a 30%, #1a3a2a 70%, #0c1a10 100%)', backgroundImage: isMobile ? 'none' : 'url(/images/stam-hero.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        </>
      )}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to left, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.75) 100%)' }} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 900, margin: '0 auto', padding: isMobile ? '28px 16px 32px' : '48px 48px', opacity: animating ? 0 : 1, transform: animating ? 'translateY(8px)' : 'translateY(0)', transition: 'opacity 0.22s ease, transform 0.22s ease' }}>

        {!isMain && (
          <button onClick={() => switchState('main')} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ccc', borderRadius: 20, padding: '5px 12px', fontSize: 11, cursor: 'pointer', marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}>
            <IconArrowLeft size={11} color="#ccc" /> חזרה
          </button>
        )}

        <h1 style={{ fontSize: isMobile ? 22 : 40, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: isMobile ? 10 : 14, textShadow: '0 2px 30px rgba(0,0,0,0.7)', letterSpacing: '-0.5px' }}>
          {c.headline}
        </h1>

        {isMain ? (
          <>
            <p style={{ fontSize: isMobile ? 12 : 15, color: 'rgba(220,235,215,0.9)', marginBottom: 16, maxWidth: 520, lineHeight: 1.6 }}>
              {c.sub}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, flexDirection: 'row' }}>
              {c.buttons.map((btn, i) => <HeroBtn key={i} btn={btn} isMobile={isMobile} />)}
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 10 : 20, flexWrap: 'wrap', marginBottom: 10 }}>
              {(c.trust ?? []).map((t, i) => (
                <span key={i} style={{ fontSize: 11, color: '#a8c8a0', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IconCheck size={11} color="#b8972a" /> {t}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: isMobile ? 12 : 14, color: 'rgba(210,228,205,0.9)', marginBottom: 18, maxWidth: 560, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{c.body}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, flexDirection: 'row' }}>
              {c.buttons.map((btn, i) => <HeroBtn key={i} btn={btn} isMobile={isMobile} />)}
            </div>
            <p style={{ fontSize: 11, color: 'rgba(160,190,155,0.75)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconShield size={11} color="rgba(160,190,155,0.6)" /> {c.support}
            </p>
          </>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 0, right: 0, left: 0, height: 3, zIndex: 3, background: 'linear-gradient(to left, transparent, #b8972a 30%, #e6c84a 50%, #b8972a 70%, transparent)' }} />
    </div>
  );
}

function HeroBtn({ btn, isMobile }: {
  btn: { label: string; icon: React.ReactNode; action: () => void; style: BtnStyle };
  isMobile: boolean;
}) {
  return (
    <button onClick={btn.action} style={{
      padding: isMobile ? '10px 16px' : '10px 22px',
      fontSize: isMobile ? 12 : 13,
      fontWeight: 600, borderRadius: 8, cursor: 'pointer', transition: 'all 0.18s',
      border: '2px solid #ffffff',
      background: 'transparent',
      color: '#ffffff',
      backdropFilter: 'blur(4px)',
      width: isMobile ? 'calc(50% - 4px)' : 'auto',
      boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', gap: 6,
      justifyContent: isMobile ? 'flex-start' : 'center',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}>
      {btn.icon} {btn.label}
    </button>
  );
}
