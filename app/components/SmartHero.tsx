'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

<<<<<<< HEAD
type HeroState = 'main' | 'mezuzah' | 'tefillin' | 'unsure';
=======
type HeroState = 'main' | 'mezuzah' | 'tefillin' | 'unsure' | 'klaf';
>>>>>>> 6a1c5712b2bdf92ce2b5b46b9f825d0c288778b2

const WA_LINK = 'https://wa.me/972584877770';

export default function SmartHero({ isMobile, onScrollToProducts, onSelectCat }: {
  isMobile: boolean;
  onScrollToProducts: () => void;
  onSelectCat: (cat: string) => void;
}) {
  const [state, setState] = useState<HeroState>('main');
  const [animating, setAnimating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  function switchState(next: HeroState) {
    setAnimating(true);
    setTimeout(() => {
      setState(next);
      setAnimating(false);
    }, 220);
  }

  const content = {
    main: {
      headline: 'לא קונים מזוזה בעיניים עצומות',
      sub: 'ראה את הקלף, הכר את הסופר, והבן בדיוק מה נכנס לבית שלך',
      trust: ['רואים את הקלף לפני קנייה', 'עובדים ישירות מול סופרי סת״מ', 'בוחרים מתוך שקיפות אמיתית'],
      buttons: [
        { label: '📿 אני מחפש בית מזוזה', action: () => switchState('mezuzah'), style: 'gold' },
        { label: '📦 אני מחפש תפילין', action: () => switchState('tefillin'), style: 'outline' },
        { label: '❓ אני לא בטוח מה לבחור', action: () => switchState('unsure'), style: 'ghost' },
<<<<<<< HEAD
=======
        { label: '📜 אני מחפש קלף מזוזה', action: () => switchState('klaf'), style: 'outline' },
>>>>>>> 6a1c5712b2bdf92ce2b5b46b9f825d0c288778b2
      ],
    },
    mezuzah: {
      headline: 'כך בוחרים מזוזה נכון',
      body: 'רוב האנשים בוחרים לפי מחיר —\nאבל ההבדל האמיתי הוא באיכות הכתיבה, בבדיקה, ובמי שכתב אותה.\n\nאצלנו אתה לא קונה "סתם מזוזה" —\nאתה רואה את הקלף ובוחר מתוך הבנה.',
      support: 'אפשר לראות את הקלף לפני הקנייה ולבחור מתוך גלריה אמיתית',
      buttons: [
        { label: '🔍 ראה בתי מזוזה', action: () => { onSelectCat('קלפים'); onScrollToProducts(); }, style: 'gold' },
        { label: '✍️ בחר לפי סופר', action: () => router.push('/soferim'), style: 'outline' },
        { label: '📘 למד איך לבחור נכון', action: () => router.push('/madrich'), style: 'ghost' },
      ],
    },
    tefillin: {
      headline: 'תפילין לא קונים בלי להבין',
      body: 'יש הבדל גדול בין תפילין כשרות לבין תפילין מהודרות —\nוהוא לא תמיד נראה לעין.\n\nאנחנו עוזרים לך להבין בדיוק מה אתה מקבל\nולבחור מתוך ביטחון אמיתי.',
      support: 'הבחירה הנכונה מתחילה בהבנה — לא במחיר',
      buttons: [
        { label: '🔍 ראה תפילין', action: () => onScrollToProducts(), style: 'gold' },
        { label: '📘 מדריך לבחירה נכונה', action: () => router.push('/madrich'), style: 'outline' },
        { label: '💬 שאל סופר', action: () => window.open(WA_LINK, '_blank'), style: 'ghost' },
      ],
    },
<<<<<<< HEAD
=======
    klaf: {
      headline: 'בחר קלף מזוזה ספציפי',
      body: 'אצלנו אתה לא קונה "סתם מזוזה" —\nאתה בוחר קלף ספציפי מתוך גלריה אמיתית.\n\nכל קלף מצולם, נבדק ומוצג לפני מכירה.\nאתה רואה בדיוק מה מגיע אליך.',
      support: 'ניתן לשלוח את תמונת הקלף לרב שלך לפני הקנייה',
      buttons: [
        { label: '🔍 קלפי מזוזה', action: () => { onSelectCat('קלפים'); onScrollToProducts(); }, style: 'gold' },
        { label: '📦 קלפי תפילין', action: () => { onSelectCat('קלפים'); onScrollToProducts(); }, style: 'outline' },
        { label: '📘 למד על קלפים', action: () => router.push('/madrich'), style: 'ghost' },
      ],
    },
>>>>>>> 6a1c5712b2bdf92ce2b5b46b9f825d0c288778b2
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
      minHeight: isMobile ? 360 : 480,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      direction: 'rtl',
    }}>

      {/* ══ וידאו ברקע — דסקטופ בלבד ══ */}
<<<<<<< HEAD
      {!isMobile && (
=======
      {(
>>>>>>> 6a1c5712b2bdf92ce2b5b46b9f825d0c288778b2
        <video
          autoPlay muted loop playsInline
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', zIndex: 0,
          }}
        >
          <source src="/video/hero-stam.mp4" type="video/mp4" />
        </video>
      )}

      {/* ══ Fallback — מובייל או אם אין וידאו ══ */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
<<<<<<< HEAD
        background: 'linear-gradient(160deg, #1a1008 0%, #2d1f0a 30%, #1a3a2a 70%, #0c1a10 100%)',
=======
        background: 'linear-gradient(160deg, #0a0a1a 0%, #1a0a2e 30%, #0c1a35 70%, #080818 100%)',
>>>>>>> 6a1c5712b2bdf92ce2b5b46b9f825d0c288778b2
        backgroundImage: isMobile ? 'none' : 'url(/images/stam-hero.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }} />

      {/* ══ Overlay כהה לקריאות ══ */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
<<<<<<< HEAD
        background: 'linear-gradient(to left, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.75) 100%)',
      }} />

      {/* ══ טקסטורה עדינה ══ */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, opacity: 0.035,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e6c84a' fill-opacity='1'%3E%3Cpath d='M0 0h30v30H0V0zm30 30h30v30H30V30z'/%3E%3C/g%3E%3C/svg%3E\")",
      }} />
=======
        background: 'rgba(0,0,0,0.7)',

      }} />

      
>>>>>>> 6a1c5712b2bdf92ce2b5b46b9f825d0c288778b2

      {/* ══ תוכן ══ */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: 900,
        margin: '0 auto',
        padding: isMobile ? '40px 20px 48px' : '56px 48px',
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 0.22s ease, transform 0.22s ease',
      }}>

        {/* כפתור חזרה */}
        {!isMain && (
          <button onClick={() => switchState('main')}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#ccc', borderRadius: 20, padding: '5px 14px', fontSize: 12,
              cursor: 'pointer', marginBottom: 20, display: 'inline-flex',
              alignItems: 'center', gap: 6, transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
            ← חזרה
          </button>
        )}

        {/* כותרת */}
        <h1 style={{
          fontSize: isMobile ? 26 : 44,
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1.2,
          marginBottom: isMobile ? 14 : 18,
          textShadow: '0 2px 30px rgba(0,0,0,0.7)',
          letterSpacing: '-0.5px',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}>
          {(c as any).headline}
        </h1>

        {/* תוכן לפי state */}
        {isMain ? (
          <>
            <p style={{
              fontSize: isMobile ? 14 : 17, color: 'rgba(220,235,215,0.9)',
              marginBottom: 28, maxWidth: 560, lineHeight: 1.7,
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.7s ease 0.12s, transform 0.7s ease 0.12s',
            }}>
              {(c as any).sub}
            </p>

            {/* כפתורי בחירה */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
              {(c as any).buttons.map((btn: any, i: number) => (
                <button key={i} onClick={btn.action}
                  style={{
                    padding: isMobile ? '11px 18px' : '12px 22px',
                    fontSize: isMobile ? 13 : 14,
                    fontWeight: 700, borderRadius: 10, cursor: 'pointer',
                    transition: 'all 0.18s',
                    border: btn.style === 'gold' ? 'none' : '1.5px solid rgba(255,255,255,0.35)',
                    background: btn.style === 'gold'
                      ? 'linear-gradient(135deg, #b8972a, #e6c84a)'
                      : btn.style === 'outline' ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: btn.style === 'gold' ? '#0c1a35' : '#fff',
                    backdropFilter: 'blur(4px)',
                    opacity: loaded ? 1 : 0,
                    transform: loaded ? 'translateY(0)' : 'translateY(12px)',
                    transitionDelay: `${0.2 + i * 0.08}s`,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget;
                    if (btn.style === 'gold') {
                      el.style.background = 'linear-gradient(135deg, #d4a832, #f0d860)';
                      el.style.transform = 'translateY(-2px)';
                      el.style.boxShadow = '0 8px 20px rgba(184,151,42,0.35)';
                    } else {
                      el.style.background = 'rgba(255,255,255,0.18)';
                      el.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget;
                    if (btn.style === 'gold') {
                      el.style.background = 'linear-gradient(135deg, #b8972a, #e6c84a)';
                      el.style.transform = 'translateY(0)';
                      el.style.boxShadow = 'none';
                    } else {
                      el.style.background = btn.style === 'outline' ? 'rgba(255,255,255,0.08)' : 'transparent';
                      el.style.transform = 'translateY(0)';
                    }
                  }}>
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Trust strip */}
            <div style={{ display: 'flex', gap: isMobile ? 12 : 24, flexWrap: 'wrap', marginBottom: 20 }}>
              {(c as any).trust.map((t: string, i: number) => (
                <span key={i} style={{ fontSize: 12, color: '#a8c8a0', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#b8972a', fontWeight: 900 }}>✔</span> {t}
                </span>
              ))}
            </div>

            {/* Helper line */}
            <button onClick={() => router.push('/madrich')}
              style={{
                background: 'none', border: 'none', color: 'rgba(180,210,175,0.7)',
                fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0,
              }}>
              חדש בעולם הסת״מ? התחל כאן ←
            </button>
          </>
        ) : (
          <>
            <p style={{
              fontSize: isMobile ? 13 : 15, color: 'rgba(210,228,205,0.9)',
              marginBottom: 24, maxWidth: 580, lineHeight: 1.85, whiteSpace: 'pre-line',
            }}>
              {(c as any).body}
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              {(c as any).buttons.map((btn: any, i: number) => (
                <button key={i} onClick={btn.action}
                  style={{
                    padding: isMobile ? '10px 16px' : '11px 20px',
                    fontSize: isMobile ? 13 : 14,
                    fontWeight: 700, borderRadius: 10, cursor: 'pointer',
                    transition: 'all 0.18s',
                    border: btn.style === 'gold' ? 'none' : '1.5px solid rgba(255,255,255,0.3)',
                    background: btn.style === 'gold'
                      ? 'linear-gradient(135deg, #b8972a, #e6c84a)'
                      : btn.style === 'outline' ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: btn.style === 'gold' ? '#0c1a35' : '#fff',
                    backdropFilter: 'blur(4px)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget;
                    if (btn.style === 'gold') {
                      el.style.background = 'linear-gradient(135deg, #d4a832, #f0d860)';
                      el.style.transform = 'translateY(-2px)';
                    } else {
                      el.style.background = 'rgba(255,255,255,0.18)';
                      el.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget;
                    if (btn.style === 'gold') {
                      el.style.background = 'linear-gradient(135deg, #b8972a, #e6c84a)';
                    } else {
                      el.style.background = btn.style === 'outline' ? 'rgba(255,255,255,0.08)' : 'transparent';
                    }
                    el.style.transform = 'translateY(0)';
                  }}>
                  {btn.label}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 12, color: 'rgba(160,190,155,0.75)', fontStyle: 'italic' }}>
              {(c as any).support}
            </p>
          </>
        )}
      </div>

      {/* ══ קו זהב תחתון ══ */}
      <div style={{
        position: 'absolute', bottom: 0, right: 0, left: 0, height: 3, zIndex: 3,
        background: 'linear-gradient(to left, transparent, #b8972a 30%, #e6c84a 50%, #b8972a 70%, transparent)',
      }} />
    </div>
  );
}
