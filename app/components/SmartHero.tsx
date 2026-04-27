'use client';
import Image from 'next/image';

const HERO_IMAGE = 'https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto:good,w_1400/v1777180035/IMG_1277_apvc5v.png';

function IconCheck({ size = 13, color = '#b8972a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconShield({ size = 13, color = '#b8972a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z" />
    </svg>
  );
}

const TRUST = [
  'המזוזות נבדקות ע"י רב מוסמך · צילום קלף אמיתי לפני משלוח',
  'תעודת כשרות והסמכה לכל סופר',
  'אפשרות להחזר כספי מלא',
] as const;

export default function SmartHero({ isMobile, onScrollToProducts, onSelectCat, bgImage }: {
  isMobile: boolean;
  onScrollToProducts?: () => void;
  onSelectCat?: (cat: string) => void;
  bgImage?: string;
}) {
  void onScrollToProducts;
  void onSelectCat;
  void bgImage;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight: isMobile ? 380 : 500,
      display: 'flex',
      alignItems: 'center',
      direction: 'rtl',
    }}>
      {/* ── Background image via Next.js Image ── */}
      <Image
        src={HERO_IMAGE}
        alt="Your Sofer — סופר סת״מ"
        fill
        priority={true}
        fetchPriority="high"
        loading="eager"
        sizes="100vw"
        quality={80}
        style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
      />

      {/* ── Dark overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(160deg, rgba(10,8,5,0.70) 0%, rgba(13,10,6,0.52) 55%, rgba(10,8,5,0.75) 100%)',
      }} />

      {/* ── Vignette ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '35%', zIndex: 1,
        background: 'linear-gradient(to top, rgba(10,8,5,0.70) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Content ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: 860,
        margin: '0 auto',
        padding: isMobile ? '32px 20px 40px' : '0 48px',
        display: 'flex', flexDirection: 'column',
        alignItems: isMobile ? 'center' : 'flex-start',
        textAlign: isMobile ? 'center' : 'right',
      }}>

        {/* ── Gold line ── */}
        <div style={{
          width: 44, height: 1,
          background: 'linear-gradient(to left, transparent, #C9A96E, transparent)',
          marginBottom: isMobile ? 20 : 28,
          alignSelf: isMobile ? 'center' : 'flex-start',
        }} />

        {/* ── H1 ── */}
        <h1 style={{
          fontSize: isMobile ? 26 : 52,
          fontWeight: 900,
          color: '#F7F4EE',
          lineHeight: 1.18,
          marginBottom: isMobile ? 14 : 20,
          textShadow: '0 2px 40px rgba(0,0,0,0.8)',
          letterSpacing: '-0.02em',
          fontFamily: "'Frank Ruhl Libre', 'David Libre', serif",
        }}>
          היחידים בעולם שמראים לך את <span style={{ color: '#C9A96E' }}>הסופר</span>.
        </h1>

        {/* ── Subtitle ── */}
        <p style={{
          fontSize: isMobile ? 14 : 18,
          color: 'rgba(247,244,238,0.82)',
          marginBottom: isMobile ? 18 : 28,
          lineHeight: 1.55,
          maxWidth: 480,
          fontWeight: 400,
        }}>
          סת״מ ויודאיקה מהודרים בשקיפות שעוד לא הכרת.
        </p>

        {/* ── Trust bullets ── */}
        <ul style={{
          listStyle: 'none', padding: 0, margin: 0,
          display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 8,
        }}>
          {TRUST.map((t, i) => (
            <li key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              fontSize: isMobile ? 11 : 13,
              color: 'rgba(247,244,238,0.75)',
              lineHeight: 1.4,
            }}>
              {i === 0 ? <IconCheck size={12} /> : <IconShield size={12} />}
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
