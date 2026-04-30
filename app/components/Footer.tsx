'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const WA_LINK = 'https://wa.me/972552722228?text=שלום אני מעוניין בעזרה ופרטים נוספים';

const BENEFITS = [
  {
    title: 'כשרות מוסמכת',
    desc: 'כל מוצרי סת"מ נבדקים על ידי מגיה מוסמך. כל יחידה מגיעה עם תעודת כשרות ופיקוח רבני.',
    svg: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z"/><polyline points="9 12 11 14 15 10"/></svg>),
  },
  {
    title: 'משלוח והחזרות',
    desc: 'משלוח חינם לכל הארץ תוך 7–14 ימי עסקים. ניתן להחזיר מוצר תוך 14 יום ממועד הקבלה.',
    svg: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>),
  },
  {
    title: 'תשלום מאובטח',
    desc: 'כל העסקאות מוצפנות בתקן SSL. אנו תומכים בכרטיסי אשראי, ביט ופייפאל — בצורה בטוחה לחלוטין.',
    svg: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  },
  {
    title: 'שירות לקוחות אישי',
    desc: 'צוות מומחי סת"מ זמין בוואטסאפ ובמייל לענות על כל שאלה — לפני ואחרי הרכישה.',
    svg: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>),
  },
];

export default function Footer() {
  const [isMobile, setIsMobile] = useState(false);
  const [benefitOpen, setBenefitOpen] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  function nav(path: string) { router.push(path); }

  const linkStyle: React.CSSProperties = {
    fontSize: 12, color: '#999', marginBottom: 6, cursor: 'pointer',
  };

  function NavLink({ label, path, href }: { label: string; path?: string; href?: string }) {
    if (href) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, display: 'block', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#999')}>
          {label}
        </a>
      );
    }
    return (
      <div style={linkStyle} onClick={() => path && nav(path)}
        onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.color = '#fff')}
        onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.color = '#999')}>
        {label}
      </div>
    );
  }

  return (
    <>
      <style>{`
        .ys-footer-benefits { grid-template-columns: repeat(4, 1fr); }
        .ys-footer-links { grid-template-columns: repeat(6, 1fr); gap: 28px; }
        @media (max-width: 767px) {
          .ys-footer-benefits { grid-template-columns: 1fr; }
          .ys-footer-links { grid-template-columns: repeat(2, 1fr); gap: 16px; }
        }
      `}</style>
      <footer style={{ background: '#0f1111', color: '#fff' }}>
        {/* Benefits accordion */}
        <div style={{ borderBottom: '1px solid #222', direction: 'rtl' }}>
          <div className="ys-footer-benefits" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid' }}>
            {BENEFITS.map((b, i) => {
              const open = benefitOpen === i;
              return (
                <div key={b.title} style={{ borderRight: !isMobile && i < BENEFITS.length - 1 ? '1px solid #222' : 'none', borderBottom: isMobile && i < BENEFITS.length - 1 ? '1px solid #222' : 'none' }}>
                  <button onClick={() => setBenefitOpen(open ? null : i)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', color: '#fff', direction: 'rtl', textAlign: 'right' }}>
                    <span style={{ flexShrink: 0 }}>{b.svg}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#e0e0e0' }}>{b.title}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  <div style={{ overflow: 'hidden', maxHeight: open ? 120 : 0, transition: 'max-height 0.3s ease' }}>
                    <div style={{ padding: '0 20px 16px 20px', fontSize: 12, color: '#888', lineHeight: 1.65 }}>{b.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Links grid */}
        <div style={{ borderBottom: '1px solid #333', padding: '28px 16px' }}>
          <div className="ys-footer-links" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid' }}>

            {/* קבלו מידע */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ddd' }}>קבלו מידע</div>
              <NavLink label="הצהרת נגישות" path="/legal/accessibility" />
              <NavLink label="הצהרת פרטיות" path="/legal/privacy" />
              <NavLink label="תקנון האתר"    path="/legal/takanon" />
            </div>

            {/* הרוויחו אתנו */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ddd' }}>הרוויחו אתנו</div>
              <NavLink label="הצטרף כסופר"        path="/soferim/apply" />
              <NavLink label="הצטרף כרב קהילה"    path="/join/apply" />
              <NavLink label="הצטרף לפלטפורמה"    path="/join" />
            </div>

            {/* שירות לקוחות */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ddd' }}>שירות לקוחות</div>
              <NavLink label="שאלות נפוצות"    path="/madrich/faq" />
              <NavLink label="מדיניות החזרות"  path="/legal/returns" />
              <NavLink label="צרו קשר"         href={WA_LINK} />
            </div>

            {/* קהילה */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ddd' }}>קהילה</div>
              <NavLink label="✍️ הסופרים שלנו" path="/soferim" />
              <NavLink label="🌟 הצטרף"         path="/join" />
              <NavLink label="🏛️ רבני קהילה"   path="/join/apply" />
            </div>

            {/* מידע ולמידה */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ddd' }}>מידע ולמידה</div>
              <NavLink label="📖 מדריך לקניית מזוזה" path="/madrich" />
              <NavLink label="✍️ מי הסופרים שלנו"    path="/soferim" />
              <NavLink label="❓ שאלות נפוצות"        path="/madrich/faq" />
            </div>

            {/* מסמכים משפטיים */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ddd' }}>מסמכים משפטיים</div>
              <NavLink label="תקנון האתר"      path="/legal/takanon" />
              <NavLink label="מדיניות החזרים" path="/legal/returns" />
              <NavLink label="מדיניות פרטיות" path="/legal/privacy" />
              <NavLink label="משלוחים"         path="/legal/shipping" />
              <NavLink label="נגישות"          path="/legal/accessibility" />
              <NavLink label="שאלות נפוצות"   path="/legal/faq" />
            </div>

          </div>
        </div>

        {/* Copyright */}
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#b8972a' }}>Your Sofer</span>
          <span style={{ fontSize: 11, color: '#555' }}>© 2025 Your Sofer — כל הזכויות שמורות</span>
        </div>
      </footer>

    </>
  );
}
