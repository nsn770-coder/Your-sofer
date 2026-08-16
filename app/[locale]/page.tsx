import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PREFIXED_LOCALES, getLocale } from '@/app/lib/i18n/config';
import { getDictionary } from '@/app/lib/i18n/dictionaries';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';

export function generateStaticParams() {
  return PREFIXED_LOCALES.map(locale => ({ locale }));
}
export const dynamicParams = false;

const GOLD = 'var(--ys-accent)';
const NAVY = '#111d3a';

// קטגוריות מפתח — מצביעות בינתיים לקטלוג העברי (שלב 2 יתרגם את המוצרים)
const CATEGORY_LINKS: { key: 'nav.kippot' | 'nav.eventKippot' | 'nav.tefillin' | 'nav.mezuzah' | 'nav.talit' | 'nav.books'; href: string; img: string }[] = [
  { key: 'nav.eventKippot', href: '/event-kippot',                              img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto,w_600/v1784407273/ChatGPT_Image_Jul_18_2026_11_38_25_PM_mcqhle.png' },
  { key: 'nav.kippot',      href: '/category/%D7%9B%D7%99%D7%A4%D7%95%D7%AA',   img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto,w_600/v1781586601/a8c7n05vniv34n4qw44g.jpg' },
  { key: 'nav.tefillin',    href: '/category/%D7%AA%D7%A4%D7%99%D7%9C%D7%99%D7%9F%20%D7%A7%D7%95%D7%9E%D7%A4%D7%9C%D7%98', img: '' },
  { key: 'nav.mezuzah',     href: '/category/%D7%91%D7%AA%D7%99%20%D7%9E%D7%96%D7%95%D7%96%D7%94', img: '' },
  { key: 'nav.talit',       href: '/category/%D7%98%D7%9C%D7%99%D7%AA%D7%95%D7%AA', img: '' },
  { key: 'nav.books',       href: '/category/%D7%A1%D7%A4%D7%A8%D7%99%20%D7%A7%D7%95%D7%93%D7%A9%20%D7%95%D7%91%D7%A8%D7%9B%D7%95%D7%A0%D7%99%D7%9D', img: '' },
];

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!PREFIXED_LOCALES.includes(locale)) notFound();
  const t = getDictionary(locale);
  const def = getLocale(locale);
  const align = def.dir === 'rtl' ? 'right' : 'left';

  return (
    <div
      dir={def.dir}
      style={{
        fontFamily: "Arial, 'Segoe UI', sans-serif",
        maxWidth: 1100,
        margin: '0 auto',
        padding: 'clamp(16px, 3vw, 40px) 16px 64px',
        textAlign: align,
      }}
    >
      {/* בורר שפה — בולט בעמוד הבינלאומי */}
      <div style={{ display: 'flex', justifyContent: def.dir === 'rtl' ? 'flex-start' : 'flex-end', marginBottom: 20 }}>
        <LanguageSwitcher />
      </div>

      {/* Hero */}
      <div style={{ borderBottom: '1px solid #E5E0D5', paddingBottom: 28, marginBottom: 32 }}>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, color: NAVY, letterSpacing: '-0.5px', lineHeight: 1.15, margin: 0 }}>
          {t['intl.heroTitle']}
        </h1>
        <p style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', color: '#4B5563', lineHeight: 1.7, maxWidth: 640, marginTop: 14 }}>
          {t['intl.heroSub']}
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22 }}>
          <Link
            href="/category/%D7%94%D7%9B%D7%9C"
            style={{
              background: GOLD, color: '#FEFBF7', fontWeight: 900, fontSize: 16,
              padding: '15px 30px', textDecoration: 'none', display: 'inline-block',
            }}
          >
            {t['intl.cta']} →
          </Link>
          <Link
            href="/?lang=he"
            style={{
              background: '#fff', color: NAVY, fontWeight: 800, fontSize: 16,
              padding: '15px 30px', textDecoration: 'none', display: 'inline-block',
              border: `1.5px solid ${NAVY}`,
            }}
          >
            {t['intl.browseHebrew']}
          </Link>
        </div>
      </div>

      {/* שלוש נקודות אמון */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
        {([
          ['intl.trust1Title', 'intl.trust1Body', '✍️'],
          ['intl.trust2Title', 'intl.trust2Body', '✈️'],
          ['intl.trust3Title', 'intl.trust3Body', '🎨'],
        ] as const).map(([title, body, emoji]) => (
          <div key={title} style={{ background: '#fff', border: '1px solid #E5E0D5', padding: 20 }}>
            <div style={{ fontSize: 26, marginBottom: 8 }} aria-hidden>{emoji}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: NAVY, marginBottom: 6 }}>{t[title]}</div>
            <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.65 }}>{t[body]}</div>
          </div>
        ))}
      </div>

      {/* קטגוריות */}
      <h2 style={{ fontSize: 'clamp(19px, 2.4vw, 26px)', fontWeight: 900, color: NAVY, marginBottom: 16 }}>
        {t['nav.catalog']}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginBottom: 32 }}>
        {CATEGORY_LINKS.map(c => (
          <Link
            key={c.key}
            href={c.href}
            style={{
              display: 'block', textDecoration: 'none', border: '1px solid #E5E0D5',
              background: '#fff', overflow: 'hidden',
            }}
          >
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#EDE7DA' }}>
              {c.img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              )}
            </div>
            <div style={{ padding: '11px 13px', fontSize: 14.5, fontWeight: 800, color: NAVY }}>
              {t[c.key]}
            </div>
          </Link>
        ))}
      </div>

      {/* הבהרה כנה — הקטלוג עצמו עדיין בעברית */}
      <div style={{ background: '#FBF8F1', border: '1px solid #E5E0D5', padding: '14px 18px', fontSize: 13.5, color: '#6B5B36', lineHeight: 1.7 }}>
        {t['intl.partialNotice']}
        <br />
        <a href="https://wa.me/972587479933" style={{ color: NAVY, fontWeight: 800 }}>
          {t['intl.contactUs']} →
        </a>
      </div>
    </div>
  );
}
