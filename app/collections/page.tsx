import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'הקולקציות שלנו | Your Sofer',
  description: 'חמש קולקציות עיצוב נבחרות – מצאו את הסגנון שמדבר אליכם',
};

const COLLECTIONS = [
  {
    id: 'יהלום',
    tagline: 'הקו השקוף והמודרני',
    description: 'עיצובים נקיים משקף, אקריל וקריסטל — אלגנטיות מינימליסטית לבית המודרני.',
    color: '#0ea5e9',
    bg: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)',
    border: '#bae6fd',
    dot: '#87CEEB',
    href: '/category/מזוזות?collection=יהלום',
  },
  {
    id: 'שוהם',
    tagline: 'הקו הטבעי והכהה',
    description: 'עץ, אבן ואוניקס — טבע ועומק בעיצוב שמחמם את הבית.',
    color: '#92400e',
    bg: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
    border: '#fde68a',
    dot: '#78350f',
    href: '/category/מזוזות?collection=שוהם',
  },
  {
    id: 'ישפה',
    tagline: 'הקו האומנותי והצבעוני',
    description: 'הדפסים, ציורים ופסיפסים — אמנות ביודאיקה שמספרת סיפור.',
    color: '#7c3aed',
    bg: 'linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%)',
    border: '#ddd6fe',
    dot: 'rainbow',
    href: '/category/כלי שולחן והגשה?collection=ישפה',
  },
  {
    id: 'ספיר',
    tagline: 'הקו המתכתי והקריר',
    description: 'אלומיניום, נירוסטה ומתכת — עיצוב תעשייתי-מודרני עם ניחוח פרמיום.',
    color: '#475569',
    bg: 'linear-gradient(135deg, #f1f5f9 0%, #f8fafc 100%)',
    border: '#cbd5e1',
    dot: '#94a3b8',
    href: '/category/יודאיקה?collection=ספיר',
  },
  {
    id: 'ברקת',
    tagline: 'הקו החגיגי והיוקרתי',
    description: 'זהב, אמייל ויוקרה — מוצרים שמרגישים כמו חגיגה בכל יום.',
    color: '#15803d',
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #f7fef9 100%)',
    border: '#bbf7d0',
    dot: '#15803d',
    href: '/category/כלי שולחן והגשה?collection=ברקת',
  },
];

function RainbowDot() {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6)',
    }} />
  );
}

function ColorDot({ color }: { color: string }) {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
      background: color, border: '1px solid rgba(0,0,0,0.1)',
    }} />
  );
}

export default function CollectionsPage() {
  return (
    <div dir="rtl" style={{ background: '#f8f6f2', minHeight: '100vh', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a35 0%, #18274a 100%)', borderBottom: '3px solid rgba(184,151,42,0.5)', padding: '52px 20px 44px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#b8972a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
          YOUR SOFER
        </p>
        <h1 style={{ fontSize: 'clamp(26px,5vw,42px)', fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.2 }}>
          הקולקציות שלנו
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
          חמישה קוים עיצוביים נבחרים — מצאו את הסגנון שמדבר אליכם
        </p>
      </div>

      {/* Cards grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(24px,4vw,52px) 16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,300px),1fr))',
          gap: 20,
        }}>
          {COLLECTIONS.map(col => (
            <Link
              key={col.id}
              href={col.href}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{
                background: col.bg,
                border: `1.5px solid ${col.border}`,
                borderRadius: 0,
                padding: '28px 24px 24px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
              }}
              >
                {/* Dot + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {col.dot === 'rainbow' ? <RainbowDot /> : <ColorDot color={col.dot} />}
                  <span style={{ fontSize: 22, fontWeight: 900, color: col.color }}>{col.id}</span>
                </div>

                {/* Tagline */}
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0c1a35', margin: 0, lineHeight: 1.4 }}>
                  {col.tagline}
                </p>

                {/* Description */}
                <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.65, flexGrow: 1 }}>
                  {col.description}
                </p>

                {/* CTA */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: col.color }}>
                    לצפייה בקולקציה ←
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
