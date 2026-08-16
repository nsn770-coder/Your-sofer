'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MEGA_MENU_DATA, categoryUrl } from '@/data/categoriesMenu';
import PaymentMethodsRow from './trust/PaymentMethodsRow';
import { BUSINESS, TRUST_TEXT } from '@/app/config/siteTrust';
import { buildWhatsAppLink, WA_PREFILL } from '@/lib/whatsapp';
import { useT } from '@/app/lib/i18n/useT';

const WA_LINK = buildWhatsAppLink(WA_PREFILL.general);

interface LinkItem { label: string; path?: string; href?: string; }
interface Column { title: string; links: LinkItem[]; }

// ── All categories + subcategories, derived from the same data as the mega menu ──
interface CatBlock { title: string; path: string; subs: LinkItem[] }

export default function Footer() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, tc, dir, locale } = useT();

  // התוויות מתורגמות לפי השפה; ה-cat/filter נשארים בעברית — הם ערכי Firestore
  // ומרכיבי ה-URL, ושינויָם היה שובר כל שאילתה בקטלוג.
  const CATEGORY_BLOCKS: CatBlock[] = [
    ...MEGA_MENU_DATA.map(item => {
      const seen = new Set<string>();
      const subs: LinkItem[] = [];
      for (const col of item.columns) {
        for (const s of col.items) {
          if (!s.filter && s.label.startsWith('כל')) continue; // "כל X" — the block title already links there
          const key = `${s.cat}|${s.filter ?? ''}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const translated = tc(s.filter ?? s.cat);
          subs.push({
            label: translated && translated !== (s.filter ?? s.cat) ? translated : s.label,
            path: categoryUrl(s.cat, s.filter),
          });
        }
      }
      const title = tc(item.cat);
      return { title: title && title !== item.cat ? title : item.label, path: categoryUrl(item.cat), subs };
    }),
    {
      title: tc('בר מצווה'),
      path: '/bar-mitzva',
      subs: [
        { label: t('footer.barMitzvahSet'), path: '/bar-mitzva' },
        { label: t('nav.eventKippot'),      path: '/event-kippot' },
      ],
    },
  ];

  const COLUMNS: Column[] = [
    {
      title: t('footer.customerService'),
      links: [
        { label: t('footer.faq'),      path: '/faq' },
        { label: t('footer.returns'),  path: '/legal/returns' },
        { label: t('footer.contact'),  path: '/contact' },
        { label: t('footer.whatsapp'), href: WA_LINK },
      ],
    },
    {
      title: t('footer.trustTitle'),
      links: [
        { label: t('footer.ourScribes'),   path: '/soferim' },
        { label: t('footer.proofreading'), path: '/kashrut' },
        { label: t('footer.kashrutCerts'), path: '/kashrut' },
        { label: t('footer.about'),        path: '/about' },
      ],
    },
    {
      title: t('footer.infoTitle'),
      links: [
        { label: t('footer.stamGuide'),      path: '/madrich' },
        { label: t('footer.terms'),          path: '/legal/takanon' },
        { label: t('footer.privacy'),        path: '/legal/privacy' },
        { label: t('footer.shippingPolicy'), path: '/legal/shipping' },
        { label: t('footer.accessibility'),  path: '/legal/accessibility' },
        { label: t('footer.faq'),            path: '/faq' },
        { label: t('footer.halachicFaq'),    path: '/madrich/faq' },
      ],
    },
    {
      title: t('footer.joinTitle'),
      links: [
        { label: t('footer.joinScribe'),      path: '/soferim/apply' },
        { label: t('footer.joinRabbi'),       path: '/join/apply' },
        { label: t('footer.businessPartner'), path: '/partner-signup' },
      ],
    },
  ];

  const [isMobile, setIsMobile] = useState(false);
  const [openCols, setOpenCols] = useState<Set<number>>(new Set());
  const [openCats, setOpenCats] = useState<Set<number>>(new Set());
  const [catsSectionOpen, setCatsSectionOpen] = useState(false); // מובייל: כל בלוק הקטגוריות סגור עד לחיצה

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // הערה: ה-return המותנה חייב לבוא אחרי כל ה-hooks (כללי React)
  if (pathname?.startsWith('/bar-mitzvah') || pathname?.startsWith('/admin/emails')) return null;

  function toggleCol(i: number) {
    setOpenCols(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function toggleCat(i: number) {
    setOpenCats(prev => {
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
    textAlign: dir === 'rtl' ? 'right' : 'left',
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
        .ys-footer-cols { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
        @media (max-width: 767px) { .ys-footer-cols { grid-template-columns: 1fr; gap: 0; } }
        .ys-footer-cats { columns: 6 150px; column-gap: 28px; }
        @media (max-width: 1023px) { .ys-footer-cats { columns: 4 150px; } }
      `}</style>

      <footer dir={dir} style={{ background: '#1F2937', color: '#F9FAFB' }}>

        {/* Top section */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '32px 20px 24px' : '48px 24px 32px' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', marginBottom: 6 }}>
              Your Sofer
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              {t('footer.tagline')}
            </div>
          </div>

          {/* ── All categories + subcategories ── */}
          <div style={{ marginBottom: isMobile ? 20 : 36 }}>
            {isMobile ? (
              <button
                onClick={() => setCatsSectionOpen(o => !o)}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0', fontFamily: 'inherit',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span style={{ ...colTitleStyle, marginBottom: 0 }}>{t('footer.categories')}</span>
                <svg
                  width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transition: 'transform 0.25s', transform: catsSectionOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            ) : (
              <div style={{ ...colTitleStyle, marginBottom: 18 }}>{t('footer.categories')}</div>
            )}

            {isMobile ? (
              /* Mobile: whole section collapsible; accordion per category inside */
              <div style={{
                overflow: 'hidden',
                maxHeight: catsSectionOpen ? 2000 : 0,
                transition: 'max-height 0.35s ease',
                paddingRight: catsSectionOpen ? 6 : 0,
              }}>
                {CATEGORY_BLOCKS.map((block, i) => {
                  const isOpen = openCats.has(i);
                  return (
                    <div key={block.title} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <button
                        onClick={() => toggleCat(i)}
                        style={{
                          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 0', fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{block.title}</span>
                        <svg
                          width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ flexShrink: 0, transition: 'transform 0.25s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      <div style={{
                        overflow: 'hidden',
                        maxHeight: isOpen ? 600 : 0,
                        transition: 'max-height 0.3s ease',
                        paddingBottom: isOpen ? 12 : 0,
                        paddingRight: 10,
                      }}>
                        <NavLink label={t('footer.allOf').replace('{x}', block.title)} path={block.path} />
                        {block.subs.map(s => (
                          <NavLink key={`${s.label}-${s.path}`} {...s} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Desktop: all categories open, masonry columns */
              <div className="ys-footer-cats">
                {CATEGORY_BLOCKS.map(block => (
                  <div key={block.title} style={{ breakInside: 'avoid', marginBottom: 22 }}>
                    <button
                      onClick={() => nav(block.path)}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#C9A227'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)'; }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontFamily: 'inherit', textAlign: dir === 'rtl' ? 'right' : 'left', display: 'block',
                        fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
                        marginBottom: 8, borderBottom: '1px solid rgba(201,162,39,0.35)', paddingBottom: 5,
                        width: '100%',
                      }}
                    >
                      {block.title}
                    </button>
                    {block.subs.map(s => (
                      <NavLink key={`${s.label}-${s.path}`} {...s} />
                    ))}
                  </div>
                ))}
              </div>
            )}
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

        {/* Bottom bar — פרטי עסק, אמצעי תשלום ואבטחה */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '20px 20px',
          textAlign: 'center',
          fontSize: 12,
          color: 'rgba(255,255,255,0.7)',
        }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
            {/* הנוסח המשפטי העברי הוא הנוסח המחייב — בשפות אחרות מוצגים הפרטים
                העובדתיים בלבד, בלי לתרגם מונח רשמי כמו "עוסק מורשה". */}
            {locale === 'he'
              ? <>{BUSINESS.name} — בבעלות ובניהול {BUSINESS.legalName}, עוסק מורשה {BUSINESS.businessNumber}</>
              : <>{BUSINESS.name} — {BUSINESS.legalName} · {BUSINESS.businessNumber}</>}
          </div>
          <div style={{ marginBottom: 14, fontSize: 13, color: 'rgba(255,255,255,0.75)', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 16px' }}>
            <span>📍 {BUSINESS.address}</span>
            <a href={BUSINESS.phoneHref} style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>📞 {BUSINESS.phone}</a>
            <a href={BUSINESS.whatsappHref} style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>💬 {BUSINESS.whatsappNumber}</a>
            <a href={`mailto:${BUSINESS.supportEmail}`} style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>✉️ {BUSINESS.supportEmail}</a>
            <span>🕐 {BUSINESS.supportHours}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <PaymentMethodsRow size="sm" onDark />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
              <svg width="11" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              {TRUST_TEXT.paymentBody}
            </div>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>© 2026 {BUSINESS.name} — {t('footer.rights')}</span>
        </div>

      </footer>
    </>
  );
}
