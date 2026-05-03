'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RabbinicalSupervision from '../components/RabbinicalSupervision';

const GOLD = '#C5A028';
const NAVY = '#111d3a';
const NAVY_CARD = '#18274a';
const WA = 'https://wa.me/972584877770';

const PACKAGES = [
  {
    tier: 'א',
    label: 'כשר לכתחילה',
    levelParam: 'כשר לכתחילה',
    price: 'החל מ-₪2,700',
    desc: 'תפילין כשרות לכתחילה לפי כל הדעות',
    badge: null as string | null,
    featured: false,
    bg: NAVY_CARD,
    border: 'rgba(255,255,255,0.12)',
  },
  {
    tier: 'ב',
    label: 'מהודר',
    levelParam: 'מהודר',
    price: 'החל מ-₪3,200',
    desc: 'רמה גבוהה מעל הרגיל — הפופולרי ביותר',
    badge: '⭐ מומלץ' as string | null,
    featured: true,
    bg: '#142350',
    border: 'rgba(197,160,40,0.8)',
  },
  {
    tier: 'ג',
    label: 'מהודר בתכלית',
    levelParam: 'מהודר-בתכלית',
    price: 'החל מ-₪3,700',
    desc: 'רמת הכשרות הגבוהה ביותר',
    badge: '👑 פרימיום' as string | null,
    featured: false,
    bg: '#0d1830',
    border: 'rgba(197,160,40,0.45)',
  },
];

const COMPLETE_SET = [
  { label: 'טלית', emoji: '🟦', href: '/category/טלית' },
  { label: 'כיסוי תפילין', emoji: '🎒', href: '/category/כיסוי תפילין' },
  { label: 'סידור', emoji: '📖', href: '/category/סידור' },
];

export default function BarMitzvaPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div dir="rtl" style={{ background: '#f8f6f2', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{
        background: `linear-gradient(160deg, ${NAVY} 0%, #0e1a36 55%, #0a1428 100%)`,
        padding: isMobile ? '52px 20px 44px' : '80px 24px 64px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 420,
          background: 'radial-gradient(ellipse, rgba(197,160,40,0.09) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(197,160,40,0.14)',
            border: '1px solid rgba(197,160,40,0.4)',
            borderRadius: 20, padding: '6px 18px',
            fontSize: 12, fontWeight: 700, color: GOLD,
            marginBottom: 22, letterSpacing: 0.5,
          }}>
            ✡ מזל טוב לבר המצווה
          </div>

          <h1 style={{
            fontSize: isMobile ? 32 : 48,
            fontWeight: 900, color: '#fff',
            lineHeight: 1.2, margin: '0 0 18px',
            textShadow: '0 2px 24px rgba(0,0,0,0.4)',
          }}>
            סט בר מצווה
            <br />
            <span style={{ color: GOLD }}>מושלם ומהודר</span>
          </h1>

          <p style={{
            fontSize: isMobile ? 15 : 17, color: 'rgba(255,255,255,0.68)',
            lineHeight: 1.75, marginBottom: 36,
            maxWidth: 520, marginRight: 'auto', marginLeft: 'auto',
          }}>
            בחר את רמת ההידור המתאימה — תפילין קומפלט כשרים ומאושרים.
            <br style={{ display: isMobile ? 'none' : 'block' }} />
            טלית, כיסוי תפילין וסידור לבחירתך בנפרד.
          </p>

          <a
            href={WA}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: '#25D366', color: '#fff',
              padding: isMobile ? '13px 26px' : '15px 34px',
              fontSize: isMobile ? 14 : 15, fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(37,211,102,0.28)',
            }}
          >
            💬 צריך עזרה? שאל בוואטסאפ
          </a>
        </div>
      </section>

      {/* ── Package cards ── */}
      <section style={{ padding: isMobile ? '44px 16px 32px' : '64px 24px 48px' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <h2 style={{
            fontSize: isMobile ? 21 : 27, fontWeight: 900, color: '#0c1a35',
            textAlign: 'center', margin: '0 0 8px',
          }}>
            בחר את החבילה שלך
          </h2>
          <p style={{ textAlign: 'center', color: '#888', fontSize: 14, margin: '0 0 36px', lineHeight: 1.6 }}>
            ההבדל בין החבילות הוא רמת ההידור של תפילין קומפלט בלבד
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? 14 : 18,
            alignItems: 'stretch',
          }}>
            {PACKAGES.map(pkg => (
              <Link
                key={pkg.tier}
                href={`/category/${encodeURIComponent('תפילין קומפלט')}?level=${encodeURIComponent(pkg.levelParam)}`}
                style={{ textDecoration: 'none', display: 'flex' }}
              >
                <div
                  style={{
                    flex: 1,
                    background: pkg.bg,
                    border: `2px solid ${pkg.border}`,
                    padding: isMobile ? '28px 22px 22px' : '32px 26px 24px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                    boxShadow: pkg.featured
                      ? '0 0 0 1px rgba(197,160,40,0.25), 0 8px 32px rgba(0,0,0,0.35)'
                      : '0 4px 20px rgba(0,0,0,0.2)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateY(-5px)';
                    el.style.boxShadow = '0 14px 44px rgba(0,0,0,0.42)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateY(0)';
                    el.style.boxShadow = pkg.featured
                      ? '0 0 0 1px rgba(197,160,40,0.25), 0 8px 32px rgba(0,0,0,0.35)'
                      : '0 4px 20px rgba(0,0,0,0.2)';
                  }}
                >
                  {pkg.badge && (
                    <div style={{
                      position: 'absolute', top: -13, right: 20,
                      background: GOLD, color: '#0c1a35',
                      fontSize: 11, fontWeight: 900,
                      padding: '4px 14px', borderRadius: 20,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
                      letterSpacing: 0.3,
                    }}>
                      {pkg.badge}
                    </div>
                  )}

                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', marginBottom: 6, letterSpacing: 0.7, textTransform: 'uppercase' }}>
                    חבילה {pkg.tier}
                  </div>
                  <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
                    {pkg.label}
                  </div>
                  <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, color: GOLD, marginBottom: 14 }}>
                    {pkg.price}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, flex: 1, marginBottom: 6 }}>
                    {pkg.desc}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>
                    + טלית, כיסוי תפילין וסידור לבחירתך
                  </div>

                  <div style={{
                    background: pkg.featured ? GOLD : 'rgba(197,160,40,0.13)',
                    border: `1px solid ${pkg.featured ? GOLD : 'rgba(197,160,40,0.38)'}`,
                    color: pkg.featured ? '#0c1a35' : GOLD,
                    padding: '11px 16px',
                    fontSize: 13, fontWeight: 800,
                    textAlign: 'center',
                    letterSpacing: 0.2,
                  }}>
                    הצג תפילין {pkg.label} ←
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── השלם את הסט ── */}
      <section style={{
        background: '#fff',
        borderTop: '1px solid #f0ece4',
        borderBottom: '1px solid #f0ece4',
        padding: isMobile ? '36px 16px' : '52px 24px',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: '#0c1a35', margin: '0 0 8px' }}>
            השלם את הסט שלך
          </h2>
          <p style={{ fontSize: 14, color: '#888', margin: '0 0 32px', lineHeight: 1.65 }}>
            תפילין קומפלט מגיעים ללא טלית וכיסויים — השלם את הסט עם הפריטים הנוספים
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            {COMPLETE_SET.map(item => (
              <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: '#f8f6f2',
                    border: '2px solid #e8e0d0',
                    padding: isMobile ? '20px 28px' : '24px 36px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    minWidth: 130,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = GOLD;
                    el.style.background = '#fdf9f0';
                    el.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = '#e8e0d0';
                    el.style.background = '#f8f6f2';
                    el.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: 34, marginBottom: 10 }}>{item.emoji}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0c1a35', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>לצפייה ←</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rabbinical Supervision ── */}
      <RabbinicalSupervision isMobile={isMobile} />

      {/* ── WhatsApp CTA ── */}
      <section style={{
        background: NAVY,
        padding: isMobile ? '44px 20px' : '60px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(37,211,102,0.14)',
            border: '2px solid rgba(37,211,102,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 20px',
          }}>
            💬
          </div>
          <h2 style={{ fontSize: isMobile ? 21 : 25, fontWeight: 900, color: '#fff', margin: '0 0 10px' }}>
            צריך עזרה לבחור?
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '0 0 28px', lineHeight: 1.7 }}>
            דבר ישירות עם ניסים — סופר סת״מ מוסמך שיעזור לך לבחור את הסט המתאים לבנך
          </p>
          <a
            href={WA}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: '#25D366', color: '#fff',
              padding: isMobile ? '14px 30px' : '16px 42px',
              fontSize: isMobile ? 15 : 16, fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 24px rgba(37,211,102,0.3)',
              letterSpacing: 0.3,
            }}
          >
            💬 דבר איתנו בוואטסאפ
          </a>
        </div>
      </section>

    </div>
  );
}
