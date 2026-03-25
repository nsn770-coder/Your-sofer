'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type HeroState = 'main' | 'mezuzah' | 'tefillin' | 'unsure';

const WA_LINK = 'https://wa.me/972584877770';

export default function SmartHero({ shaliach, isMobile, homeContent, onScrollToProducts }: {
  shaliach?: any;
  isMobile: boolean;
  homeContent: { heroTitle: string; heroSubtitle: string; heroText: string };
  onScrollToProducts: () => void;
}) {
  const [state, setState] = useState<HeroState>('main');
  const [animating, setAnimating] = useState(false);
  const router = useRouter();

  function switchState(next: HeroState) {
    setAnimating(true);
    setTimeout(() => {
      setState(next);
      setAnimating(false);
    }, 220);
  }

  // ══ אם יש שליח — hero רגיל ══
  if (shaliach) {
    return (
      <div style={{ width: '100%', height: isMobile ? 200 : 300, background: 'linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 40%, #3d7a52 70%, #1a3a2a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 16px' : '0 6%', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e6a817' fill-opacity='1'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div style={{ position: 'relative', zIndex: 2, flex: 1 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 36, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: isMobile ? 6 : 10 }}>
            רכישת סת&quot;ם<br /><span style={{ color: '#b8972a' }}>בית חבד {shaliach.city || ''}</span>
          </h1>
          {!isMobile && <p style={{ fontSize: 15, color: '#a8c8b4', marginBottom: 24, maxWidth: 440, lineHeight: 1.6 }}>{shaliach.chabadName || shaliach.name} ממליץ על מוצרי סת״ם מסופרים מוסמכים ומאומתים.</p>}
          <button onClick={onScrollToProducts} style={{ background: '#b8972a', color: '#0c1a35', fontSize: isMobile ? 13 : 14, fontWeight: 700, padding: isMobile ? '9px 18px' : '11px 28px', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            לקנייה עכשיו ←
          </button>
        </div>
        <div style={{ position: 'relative', zIndex: 2, flexShrink: 0 }}>
          {shaliach.logoUrl
            ? <img src={shaliach.logoUrl} alt="" style={{ width: isMobile ? 80 : 150, height: isMobile ? 80 : 150, objectFit: 'contain', borderRadius: 16 }} />
            : <div style={{ fontSize: isMobile ? 50 : 90, filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))' }}>📜</div>}
        </div>
      </div>
    );
  }

  // ══ Smart Hero ══
  const content = {
    main: {
      headline: 'לא קונים מזוזה בעיניים עצומות',
      sub: 'ראה את הקלף, הכר את הסופר, והבן בדיוק מה נכנס לבית שלך',
      trust: ['רואים את הקלף לפני קנייה', 'עובדים ישירות מול סופרי סת״מ', 'בוחרים מתוך שקיפות אמיתית'],
      buttons: [
        { label: '📿 אני מחפש מזוזה', action: () => switchState('mezuzah'), style: 'gold' },
        { label: '📦 אני מחפש תפילין', action: () => switchState('tefillin'), style: 'outline' },
        { label: '❓ אני לא בטוח מה לבחור', action: () => switchState('unsure'), style: 'ghost' },
      ],
    },
    mezuzah: {
      headline: 'כך בוחרים מזוזה נכון',
      body: 'רוב האנשים בוחרים לפי מחיר —\nאבל ההבדל האמיתי הוא באיכות הכתיבה, בבדיקה, ובמי שכתב אותה.\n\nאצלנו אתה לא קונה "סתם מזוזה" —\nאתה רואה את הקלף ובוחר מתוך הבנה.',
      support: 'אפשר לראות את הקלף לפני הקנייה ולבחור מתוך גלריה אמיתית',
      buttons: [
        { label: '🔍 ראה מזוזות', action: () => { onScrollToProducts(); }, style: 'gold' },
        { label: '✍️ בחר לפי סופר', action: () => router.push('/soferim'), style: 'outline' },
        { label: '📘 למד איך לבחור נכון', action: () => router.push('/madrich'), style: 'ghost' },
      ],
    },
    tefillin: {
      headline: 'תפילין לא קונים בלי להבין',
      body: 'יש הבדל גדול בין תפילין כשרות לבין תפילין מהודרות —\nוהוא לא תמיד נראה לעין.\n\nאנחנו עוזרים לך להבין בדיוק מה אתה מקבל\nולבחור מתוך ביטחון אמיתי.',
      support: 'הבחירה הנכונה מתחילה בהבנה — לא במחיר',
      buttons: [
        { label: '🔍 ראה תפילין', action: () => { onScrollToProducts(); }, style: 'gold' },
        { label: '📘 מדריך לבחירה נכונה', action: () => router.push('/madrich'), style: 'outline' },
        { label: '💬 שאל סופר', action: () => window.open(WA_LINK, '_blank'), style: 'ghost' },
      ],
    },
    unsure: {
      headline: 'בוא נבחר יחד',
      body: 'לא צריך להבין בסת״ם כדי לבחור נכון.\nתכתוב לנו מה אתה מחפש — ונכוון אותך בצורה פשוטה וברורה.',
      support: 'אנחנו כאן כדי לעזור לך לבחור — לא סתם למכור',
      buttons: [
        { label: '📱 דבר איתנו בוואטסאפ', action: () => window.open(WA_LINK, '_blank'), style: 'gold' },
        { label: '📘 התחל מדריך קצר', action: () => router.push('/madrich'), style: 'outline' },
        { label: '✍️ הכר את הסופרים', action: () => router.push('/soferim'), style: 'ghost' },
      ],
    },
  };

  const c = content[state];
  const isMain = state === 'main';

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight: isMobile ? 320 : 380,
      background: 'linear-gradient(160deg, #1a1008 0%, #2d1f0a 30%, #1a3a2a 70%, #0c1a10 100%)',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      direction: 'rtl',
    }}>
      {/* רקע טקסטורה */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e6c84a' fill-opacity='1'%3E%3Cpath d='M0 0h30v30H0V0zm30 30h30v30H30V30z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
      
      {/* gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, transparent 0%, rgba(0,0,0,0.3) 100%)' }} />

      {/* תוכן */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: 900,
        margin: '0 auto',
        padding: isMobile ? '32px 20px' : '48px 40px',
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 0.22s ease, transform 0.22s ease',
      }}>

        {/* כפתור חזרה */}
        {!isMain && (
          <button onClick={() => switchState('main')}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#ccc', borderRadius: 20, padding: '5px 14px', fontSize: 12, cursor: 'pointer', marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
            ← חזרה
          </button>
        )}

        {/* כותרת */}
        <h1 style={{
          fontSize: isMobile ? 24 : 38,
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1.25,
          marginBottom: 16,
          maxWidth: 680,
          textShadow: '0 2px 20px rgba(0,0,0,0.5)',
        }}>
          {(c as any).headline}
        </h1>

        {/* תוכן לפי state */}
        {isMain ? (
          <>
            <p style={{ fontSize: isMobile ? 14 : 17, color: '#c8d8c0', marginBottom: 28, maxWidth: 560, lineHeight: 1.65 }}>
              {(c as any).sub}
            </p>
            {/* כפתורי בחירה */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
              {(c as any).buttons.map((btn: any, i: number) => (
                <button key={i} onClick={btn.action}
                  style={{
                    padding: isMobile ? '10px 16px' : '12px 22px',
                    fontSize: isMobile ? 13 : 14,
                    fontWeight: 700,
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                    border: btn.style === 'gold' ? 'none' : '1.5px solid rgba(255,255,255,0.35)',
                    background: btn.style === 'gold' ? '#b8972a' : btn.style === 'outline' ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: btn.style === 'gold' ? '#0c1a35' : '#fff',
                  }}
                  onMouseEnter={e => {
                    if (btn.style === 'gold') (e.currentTarget as HTMLButtonElement).style.background = '#d4a832';
                    else (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)';
                  }}
                  onMouseLeave={e => {
                    if (btn.style === 'gold') (e.currentTarget as HTMLButtonElement).style.background = '#b8972a';
                    else if (btn.style === 'outline') (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
                    else (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}>
                  {btn.label}
                </button>
              ))}
            </div>
            {/* Trust strip */}
            <div style={{ display: 'flex', gap: isMobile ? 12 : 24, flexWrap: 'wrap' }}>
              {(c as any).trust.map((t: string, i: number) => (
                <span key={i} style={{ fontSize: 12, color: '#a8c8a0', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#b8972a', fontWeight: 900 }}>✔</span> {t}
                </span>
              ))}
            </div>
            {/* לינק למדריך */}
            <div style={{ marginTop: 20 }}>
              <button onClick={() => router.push('/madrich')}
                style={{ background: 'none', border: 'none', color: '#8ab898', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                חדש בעולם הסת״ם? התחל כאן ←
              </button>
            </div>
          </>
        ) : (
          <>
            {/* body text */}
            <p style={{ fontSize: isMobile ? 13 : 15, color: '#c0d0b8', marginBottom: 24, maxWidth: 580, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {(c as any).body}
            </p>
            {/* כפתורים */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              {(c as any).buttons.map((btn: any, i: number) => (
                <button key={i} onClick={btn.action}
                  style={{
                    padding: isMobile ? '10px 16px' : '11px 20px',
                    fontSize: isMobile ? 13 : 14,
                    fontWeight: 700,
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                    border: btn.style === 'gold' ? 'none' : '1.5px solid rgba(255,255,255,0.3)',
                    background: btn.style === 'gold' ? '#b8972a' : btn.style === 'outline' ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: btn.style === 'gold' ? '#0c1a35' : '#fff',
                  }}
                  onMouseEnter={e => {
                    if (btn.style === 'gold') (e.currentTarget as HTMLButtonElement).style.background = '#d4a832';
                    else (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)';
                  }}
                  onMouseLeave={e => {
                    if (btn.style === 'gold') (e.currentTarget as HTMLButtonElement).style.background = '#b8972a';
                    else if (btn.style === 'outline') (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
                    else (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}>
                  {btn.label}
                </button>
              ))}
            </div>
            {/* support text */}
            <p style={{ fontSize: 12, color: '#8aaa88', fontStyle: 'italic' }}>
              {(c as any).support}
            </p>
          </>
        )}
      </div>

      {/* אייקון ספר/קלף בצד שמאל — רק דסקטופ */}
      {!isMobile && isMain && (
        <div style={{ position: 'absolute', left: '5%', top: '50%', transform: 'translateY(-50%)', fontSize: 100, opacity: 0.12, userSelect: 'none', pointerEvents: 'none' }}>
          📜
        </div>
      )}
    </div>
  );
}
