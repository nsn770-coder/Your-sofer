'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const WA_LINK = 'https://wa.me/972552722228?text=שלום אני מעוניין בעזרה ופרטים נוספים';

interface LinkItem { label: string; path?: string; href?: string; }
interface Column { title: string; links: LinkItem[]; }

const COLUMNS: Column[] = [
  {
    title: 'קטגוריות',
    links: [
      { label: 'קלפי מזוזה',    path: `/category/${encodeURIComponent('קלפי מזוזה')}` },
      { label: 'תפילין קומפלט', path: `/category/${encodeURIComponent('תפילין קומפלט')}` },
      { label: 'סט בר מצווה',   path: '/bar-mitzva' },
      { label: 'בתי מזוזה',     path: `/category/${encodeURIComponent('מזוזות')}` },
      { label: 'יודאיקה',       path: `/category/${encodeURIComponent('יודאיקה')}` },
    ],
  },
  {
    title: 'שירות לקוחות',
    links: [
      { label: 'שאלות נפוצות',   path: '/madrich/faq' },
      { label: 'מדיניות החזרות', path: '/legal/returns' },
      { label: 'צור קשר',        path: '/contact' },
      { label: 'וואטסאפ',        href: WA_LINK },
    ],
  },
  {
    title: 'אמון וכשרות',
    links: [
      { label: 'הסופרים שלנו',  path: '/soferim' },
      { label: 'בדיקת מגיה',    path: '/kashrut' },
      { label: 'תעודות כשרות',  path: '/kashrut' },
      { label: 'מי אנחנו',      path: '/about' },
    ],
  },
  {
    title: 'מידע',
    links: [
      { label: 'מדריך לקניית מזוזה', path: '/madrich' },
      { label: 'תקנון האתר',          path: '/legal/takanon' },
      { label: 'מדיניות פרטיות',      path: '/legal/privacy' },
      { label: 'משלוחים',              path: '/legal/shipping' },
      { label: 'נגישות',               path: '/legal/accessibility' },
      { label: 'שאלות נפוצות',         path: '/madrich/faq' },
    ],
  },
  {
    title: 'הצטרפו אלינו',
    links: [
      { label: 'הצטרף כסופר',     path: '/soferim/apply' },
      { label: 'הצטרף כרב קהילה', path: '/join/apply' },
    ],
  },
];

export default function Footer() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [openCols, setOpenCols] = useState<Set<number>>(new Set());

  if (pathname?.startsWith('/bar-mitzvah')) return null;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  function toggleCol(i: number) {
    setOpenCols(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function nav(path: string) { router.push(path); }

  const linkStyle: React.CSSProperties = {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: '2',
    textDecoration: 'none',
    display: 'block',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    fontFamily: 'inherit',
    textAlign: 'right',
  };

  function NavLink({ label, path, href }: LinkItem) {
    const handlers = {
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.color = '#FFFFFF'; },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; },
    };
    if (href) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={linkStyle} {...handlers}>
          {label}
        </a>
      );
    }
    return (
      <button style={linkStyle} onClick={() => path && nav(path)} {...handlers}>
        {label}
      </button>
    );
  }

  const colTitleStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: '#C9A227',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: 12,
  };

  return (
    <>
      <style>{`
        @keyframes ys-footer-slide { from { opacity: 0; } to { opacity: 1; } }
        .ys-footer-cols { display: grid; grid-template-columns: repeat(5, 1fr); gap: 32px; }
        @media (max-width: 767px) { .ys-footer-cols { grid-template-columns: 1fr; gap: 0; } }
      `}</style>

      <footer dir="rtl" style={{ background: '#1F2937', color: '#F9FAFB' }}>

        {/* Top section */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '32px 20px 24px' : '48px 24px 32px' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', marginBottom: 6 }}>
              Your Sofer
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              לא קונים סת״ם בלי לדעת מי כתב אותו
            </div>
          </div>

          {/* Columns */}
          <div className="ys-footer-cols">
            {COLUMNS.map((col, i) => {
              const isOpen = !isMobile || openCols.has(i);
              return (
                <div key={col.title} style={isMobile ? { borderBottom: '1px solid rgba(255,255,255,0.08)' } : {}}>
                  {/* Column header */}
                  {isMobile ? (
                    <button
                      onClick={() => toggleCol(i)}
                      style={{
                        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 0', fontFamily: 'inherit',
                      }}
                    >
                      <span style={colTitleStyle}>{col.title}</span>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ flexShrink: 0, transition: 'transform 0.25s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  ) : (
                    <div style={{ ...colTitleStyle, marginBottom: 16 }}>{col.title}</div>
                  )}

                  {/* Links */}
                  <div style={{
                    overflow: 'hidden',
                    maxHeight: isMobile ? (isOpen ? 300 : 0) : 'none',
                    transition: 'max-height 0.3s ease',
                    paddingBottom: isMobile && isOpen ? 14 : 0,
                  }}>
                    {col.links.map(link => (
                      <NavLink key={link.label} {...link} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '16px 20px',
          textAlign: 'center',
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
        }}>
          <div style={{ marginBottom: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 16px' }}>
            <span>📍 פרופ׳ עדיה תנוי 19/2, דימונה</span>
            <a href="tel:0552722228" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>📞 055-272-2228</a>
            <a href="mailto:shop@your-sofer.com" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>✉️ shop@your-sofer.com</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/visa.svg" alt="Visa" style={{ height: 20, filter: 'grayscale(100%) opacity(0.6)' }} />
            <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/mastercard.svg" alt="Mastercard" style={{ height: 20, filter: 'grayscale(100%) opacity(0.6)' }} />
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 4, padding: '3px 8px' }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.7)' }}>bit</span>
            </div>
            <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/paypal.svg" alt="PayPal" style={{ height: 20, filter: 'grayscale(100%) opacity(0.6)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '3px 10px' }}>
              <svg width="10" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 700 }}>SSL מאובטח</span>
            </div>
          </div>
          © 2025 Your Sofer — כל הזכויות שמורות
        </div>

      </footer>
    </>
  );
}
