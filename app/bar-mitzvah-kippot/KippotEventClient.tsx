'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import { formatPrice } from '@/app/lib/utils';
import { useCart } from '@/app/contexts/CartContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const GOLD = '#C5A028';
const NAVY = '#111d3a';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  hidden?: boolean;
  priority?: number;
  subCategory?: string;
  was?: number | null;
}

export interface FaqItem {
  q: string;
  a: string;
}

// ── Config interface — duplicate this page for future event types ─────────────
// To add "כיפות לחתונה":
//   1. Copy app/bar-mitzvah-kippot → app/wedding-kippot
//   2. Create a new EventKippotConfig with the new copy
//   3. Pass it to KippotEventClient as a prop
// KippotEventClient itself needs no changes.

export interface EventKippotConfig {
  heroTag:       string;   // e.g. "🎩 כיפות לאירועים"
  heroTitle:     string;
  heroSubtitle:  string;
  promoBanner:   string;
  gridTitle:     string;
  ctaPrintTitle: string;
  ctaPrintBody:  string;
}

export const BAR_MITZVAH_CONFIG: EventKippotConfig = {
  heroTag:      '🎩 כיפות לאירועים',
  heroTitle:    'כיפות לבר מצווה\nואירועים במחירים מיוחדים',
  heroSubtitle: 'הזמינו 100 כיפות ומעלה וקבלו 30% הנחה אוטומטית',
  promoBanner:  '🎉 מבצע בר מצווה — 100 כיפות ומעלה = 30% הנחה אוטומטית — הדפסה החל מ־₪4.5 ליחידה',
  gridTitle:    'כיפות לבר מצווה ואירועים',
  ctaPrintTitle:'הוסיפו הדפסה אישית לכיפות',
  ctaPrintBody: 'שם הבר מצווה, תאריך, לוגו — העלו תמונה, קבלו הדמיה, ומקבלים הדפסה מותאמת',
};

const BENEFITS = [
  '✓ מגוון עצום של כיפות',
  '✓ הדפסה אישית',
  '✓ מחירים מיוחדים לבר מצווה',
  '✓ משלוח לכל הארץ',
  '✓ אישור גרפי לפני ייצור',
  '✓ שירות מהיר',
];

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 0, overflow: 'hidden', border: '1px solid #eee' }}>
      <div style={{ aspectRatio: '1', background: '#f0f0f0' }} />
      <div style={{ padding: '12px 14px' }}>
        <div style={{ height: 13, background: '#f0f0f0', borderRadius: 4, marginBottom: 6 }} />
        <div style={{ height: 13, background: '#f0f0f0', borderRadius: 4, width: '70%', marginBottom: 10 }} />
        <div style={{ height: 18, background: '#f0f0f0', borderRadius: 4, width: '40%', marginBottom: 10 }} />
        <div style={{ height: 34, background: '#f0f0f0', borderRadius: 0 }} />
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  faqItems: FaqItem[];
  config?: EventKippotConfig;
}

export default function KippotEventClient({ faqItems, config = BAR_MITZVAH_CONFIG }: Props) {
  const [products,  setProducts]  = useState<Product[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [isMobile,  setIsMobile]  = useState(false);
  const [openFaq,   setOpenFaq]   = useState<number | null>(null);
  const [addedId,   setAddedId]   = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const router     = useRouter();

  // ── Responsive ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Fetch products ───────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'products'),
            where('cat', '==', 'כיפות'),
            orderBy('priority', 'desc'),
            limit(500),
          ),
        );
        const prods = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(p => p.hidden !== true);
        setProducts(prods);
      } catch (e) {
        console.error('[KippotEventClient] fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function scrollToGrid() {
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleAdd(p: Product, e: React.MouseEvent) {
    e.stopPropagation();
    addItem({ id: p.id, name: p.name, price: p.price, imgUrl: p.imgUrl, quantity: 1, cat: 'כיפות' });
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 1500);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" style={{ background: '#f8f6f2', minHeight: '100vh', fontFamily: "'Heebo', Arial, sans-serif" }}>
      <style>{`
        @keyframes ys-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .ys-skeleton { animation: ys-pulse 1.5s ease-in-out infinite; }
        .ys-kip-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.10) !important; }
        .ys-faq-btn:hover { background: #f9f7f2 !important; }
      `}</style>

      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: `linear-gradient(160deg, ${NAVY} 0%, #0e1a36 55%, #0a1428 100%)`,
          padding: isMobile ? '48px 20px 44px' : '80px 24px 72px',
          minHeight: isMobile ? 380 : 460,
        }}
      >
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          {/* Tag */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(197,160,40,0.14)', border: '1px solid rgba(197,160,40,0.4)',
            borderRadius: 20, padding: '6px 18px',
            fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 20,
          }}>
            {config.heroTag}
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: isMobile ? 28 : 46, fontWeight: 900,
            color: '#fff', lineHeight: 1.2, margin: '0 0 14px',
            whiteSpace: 'pre-line',
          }}>
            {config.heroTitle}
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: isMobile ? 15 : 18, color: 'rgba(255,255,255,0.75)', marginBottom: 28, lineHeight: 1.7 }}>
            הזמינו 100 כיפות ומעלה וקבלו{' '}
            <strong style={{ color: GOLD }}>30% הנחה אוטומטית</strong>
          </p>

          {/* Benefits grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
            gap: 10, marginBottom: 32, textAlign: 'right',
          }}>
            {BENEFITS.map(b => (
              <div key={b} style={{
                fontSize: 13, color: 'rgba(255,255,255,0.85)',
                background: 'rgba(255,255,255,0.07)',
                padding: '8px 12px', fontWeight: 600,
              }}>
                {b}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={scrollToGrid}
              style={{
                background: GOLD, color: NAVY, border: 'none',
                padding: '14px 32px', fontSize: 15, fontWeight: 900,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              בחרו כיפות ←
            </button>
            <a
              href="/print-order"
              style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'transparent', color: '#fff',
                border: '1.5px solid rgba(255,255,255,0.5)',
                padding: '13px 32px', fontSize: 15, fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              הוסיפו הדפסה 🖨️
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. Promo banner ─────────────────────────────────────────────────── */}
      <div style={{ background: GOLD, padding: isMobile ? '14px 16px' : '16px 24px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: isMobile ? 13 : 15, fontWeight: 800, color: NAVY, lineHeight: 1.5 }}>
          {config.promoBanner}
        </p>
      </div>

      {/* ── 3. Product grid ─────────────────────────────────────────────────── */}
      <section
        ref={gridRef}
        style={{
          maxWidth: 1280, margin: '0 auto',
          padding: isMobile ? '40px 16px' : '60px 24px',
          scrollMarginTop: 80,
        }}
      >
        {/* Grid header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: NAVY, margin: 0 }}>
            {config.gridTitle}
          </h2>
          {!loading && (
            <span style={{ fontSize: 13, color: '#888' }}>{products.length} מוצרים</span>
          )}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 12 : 16 }}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="ys-skeleton"><SkeletonCard /></div>
              ))
            : products.map((p, idx) => {
                const img = optimizeCloudinaryUrl(p.imgUrl || p.image_url || '', 400);
                const added = addedId === p.id;
                return (
                  <div
                    key={p.id}
                    className="ys-kip-card"
                    onClick={() => router.push(`/product/${p.id}`)}
                    style={{
                      background: '#fff', overflow: 'hidden',
                      border: '1px solid #eee', display: 'flex',
                      flexDirection: 'column', cursor: 'pointer',
                      transition: 'box-shadow 0.2s',
                    }}
                  >
                    {/* Image — aspectRatio prevents CLS */}
                    <div style={{ aspectRatio: '1', overflow: 'hidden', background: '#f5f5f5', position: 'relative' }}>
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={p.name}
                          loading={idx < 8 ? 'eager' : 'lazy'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎩</div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '10px 12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <p style={{
                        fontSize: isMobile ? 12 : 13, fontWeight: 600, color: '#111', margin: 0,
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      } as React.CSSProperties}>
                        {p.name}
                      </p>
                      <div style={{ marginTop: 'auto' }}>
                        <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 900, color: '#1a1a1a' }}>
                          {formatPrice(p.price)}
                        </div>
                        {p.was && p.was > p.price && (
                          <div style={{ fontSize: 11, color: '#999', textDecoration: 'line-through' }}>
                            {formatPrice(p.was)}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={e => handleAdd(p, e)}
                        style={{
                          width: '100%', padding: '9px 0',
                          background: added ? '#22c55e' : GOLD,
                          color: added ? '#fff' : NAVY,
                          border: 'none', fontSize: isMobile ? 12 : 13,
                          fontWeight: 800, cursor: 'pointer',
                          transition: 'background 0.2s', fontFamily: 'inherit',
                        }}
                      >
                        {added ? '✓ נוסף לסל' : 'הוסף לסל'}
                      </button>
                    </div>
                  </div>
                );
              })}
        </div>
      </section>

      {/* ── 4. Print CTA ────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '0 16px 48px' : '0 24px 64px' }}>
        <a
          href="/print-order"
          style={{
            display: 'flex', alignItems: 'center', gap: 16,
            background: `linear-gradient(135deg, ${NAVY} 0%, #162a5c 100%)`,
            padding: isMobile ? '20px' : '28px 36px',
            textDecoration: 'none', border: `2px solid ${GOLD}`,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: isMobile ? 36 : 48, lineHeight: 1, flexShrink: 0 }}>🖨️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: '#fff', marginBottom: 6 }}>
              {config.ctaPrintTitle}
            </div>
            <div style={{ fontSize: isMobile ? 13 : 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>
              {config.ctaPrintBody}
            </div>
          </div>
          <div style={{ flexShrink: 0, background: GOLD, color: NAVY, fontWeight: 900, fontSize: 14, padding: '10px 22px' }}>
            להזמנת הדפסה ←
          </div>
        </a>
      </section>

      {/* ── 5. SEO Content ──────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: isMobile ? '48px 20px 40px' : '72px 24px 56px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', color: '#374151', lineHeight: 1.85, fontSize: isMobile ? 15 : 16 }}>

          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: NAVY, marginBottom: 16, marginTop: 0 }}>
            כיפות לבר מצווה — המדריך המלא להזמנה בכמות
          </h2>
          <p>
            הכיפה היא אחד מסמלי הזהות היהודית העמוקים ביותר, ובאירוע בר המצווה היא הופכת לפריט שכל אורח יקח איתו הביתה — זיכרון קטן שמשאיר רושם גדול. בחירת הכיפות לאירוע היא החלטה שמשלבת טעם אישי, תקציב, כמות האורחים ואפשרויות ההתאמה האישית. במדריך הזה תמצאו כל מה שצריך לדעת כדי לבחור נכון.
          </p>
          <p>
            כשמזמינים כיפות לבר מצווה חשוב לקחת בחשבון כמה פרמטרים: כמות האורחים הצפויה, הסגנון של האירוע, האם רוצים הדפסה אישית, ומה התקציב המוקצה לפריט הזה. הזמנה מוקדמת — לפחות שבועיים לפני האירוע — מאפשרת לכם זמן לאישור הדמיה, ייצור ומשלוח בלי לחץ.
          </p>

          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: NAVY, marginTop: 40, marginBottom: 14 }}>
            כיפות מודפסות — כשהפרט הקטן הופך לזיכרון גדול
          </h2>
          <p>
            כיפות מודפסות הפכו לאחד הטרנדים החמים ביותר באירועי בר מצווה. הרעיון פשוט: על כל כיפה מודפסת שם הבר מצווה, תאריך האירוע, ולפעמים גם פסוק, ציטוט, או לוגו של המשפחה. התוצאה היא פריט אישי ומיוחד שהאורחים שמחים לשמור.
          </p>
          <p>
            בהשוואה לכיפות רגילות, כיפות מודפסות מוסיפות ערך מוסף ניכר בעלות נמוכה יחסית. ההדפסה על כיפה עולה בדרך כלל החל מ־₪4.5 ליחידה בהזמנת 100 יחידות ומעלה — פחות מ-₪500 לכל סט הכיפות של אירוע של 100 אורחים.
          </p>

          <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#1a1a1a', marginTop: 28, marginBottom: 12 }}>
            מה אפשר להדפיס על כיפות?
          </h3>
          <p>
            כמעט כל דבר! שם הבר מצווה ותאריך האירוע הם הבחירה הקלאסית, אבל אפשר ללכת הרבה יותר רחוק. משפחות רבות בוחרות להדפיס את שם הבר מצווה עם שם הפרשה, את הפסוק שהבר מצווה יקרא בתורה, ציור שהבר מצווה יצר בעצמו, לוגו של עסק משפחתי, או סתם עיצוב גרפי מגניב. כל קובץ תמונה ב-PNG עם רקע שקוף יתאים בצורה מושלמת.
          </p>

          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: NAVY, marginTop: 40, marginBottom: 14 }}>
            איך לבחור את הכיפה הנכונה לאירוע?
          </h2>
          <p>
            כיפות מגיעות בחומרים, גדלים וסגנונות שונים מאוד — ולכל אחד מהם יש יתרונות ייחודיים. הבחירה הנכונה תלויה בסגנון האירוע ובהעדפות האישיות.
          </p>

          <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#1a1a1a', marginTop: 28, marginBottom: 12 }}>
            בחירת חומר הכיפה
          </h3>
          <p>
            <strong>כיפות בד ומשי</strong> — קלות ונוחות, מתאימות לאירועים קיציים ולכל סגנון. ניתנות להדפסה בצורה מעולה. זהו החומר הנפוץ ביותר לכיפות בר מצווה מודפסות.
          </p>
          <p>
            <strong>כיפות קטיפה</strong> — מלכותיות ומהודרות, מתאימות לאירועים חגיגיים יותר. הצבע עמוק ויפה, והמראה יוקרתי.
          </p>
          <p>
            <strong>כיפות פשתן וארטמן</strong> — טבעיות ונושמות, מתאימות לאירועים בחוץ ולאירועים בסגנון בוהו.
          </p>
          <p>
            <strong>כיפות סרוגות</strong> — הכיפה הישראלית הקלאסית, מתאימה לאירועים שבהם חלק מהאורחים מגיע עם כיפה משלו.
          </p>

          <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#1a1a1a', marginTop: 28, marginBottom: 12 }}>
            בחירת הגודל
          </h3>
          <p>
            כיפות מגיעות בדרך כלל בקוטר 17, 18, 19 ו-20 ס"מ. עבור כיפות בר מצווה שכולם יוכלו לחבוש בנוחות, מידה 18-19 ס"מ היא הבחירה הנפוצה ביותר. אם מזמינים לקהל מגוון (כולל ילדים), אפשר לחלק בין גדלים שונים.
          </p>

          <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#1a1a1a', marginTop: 28, marginBottom: 12 }}>
            בחירת צבעים
          </h3>
          <p>
            הצבע צריך להתאים לפלטת הצבעים של האירוע. כיפות לבן או קרם הן בחירה נייטרלית שמתאימה לכמעט כל אירוע. כיפות כחול, שחור או כחול-כסף — אלגנטיות ופורמליות. כיפות בצבעים חמים (חאקי, קפה, בורדו) מתאימות לאירועים בסגנון טבעי וחמים. אפשר גם להזמין שני צבעים — גדולות וקטנות — כדי לאפשר לכולם לבחור.
          </p>

          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: NAVY, marginTop: 40, marginBottom: 14 }}>
            הזמנה בכמויות — יתרונות ומחירים
          </h2>
          <p>
            הזמנה של כיפות בכמות גדולה מביאה ליתרונות כפולים: מחיר נמוך יותר ליחידה, וקבלת כמות מספקת לכל האורחים בלי דאגה. בהזמנת 100 כיפות ומעלה, תקבלו 30% הנחה אוטומטית — ללא צורך בקוד קופון.
          </p>

          <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#1a1a1a', marginTop: 28, marginBottom: 12 }}>
            כמה כיפות להזמין?
          </h3>
          <p>
            כלל האצבע: כיפה לכל אורח מוזמן, פלוס 10-15% עודף. לאירוע של 150 אורחים, הזמינו 165-175 כיפות. העודף הולך לצלמים, למארגנים, לאורחים שמגיעים בלי הזמנה, ולמשפחה שתרצה לשמור כמה כזיכרון.
          </p>
          <p>
            חשוב גם לקחת בחשבון שחלק מהאורחים מגיעים עם כיפה משלהם — אבל תמיד עדיף שיהיה יותר מאשר שייגמרו.
          </p>

          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: NAVY, marginTop: 40, marginBottom: 14 }}>
            זמני אספקה ומשלוח
          </h2>
          <p>
            הזמנת כיפות רגילות (ללא הדפסה) מגיעה תוך 3-5 ימי עסקים. הזמנות עם הדפסה מותאמת אישית — תוך 5-7 ימי עסקים. הזמנות גדולות (מעל 200 יחידות) — מומלץ להזמין לפחות שלושה שבועות לפני האירוע.
          </p>
          <p>
            משלוח זמין לכל רחבי הארץ. ניתן לבחור בין משלוח רגיל (בדואר ישראל) לבין שליח עד הבית. הזמנות דחופות ניתן לתאם בצ'אט.
          </p>

          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: NAVY, marginTop: 40, marginBottom: 14 }}>
            רעיונות עיצוב לכיפות מודפסות
          </h2>
          <p>
            הנה כמה רעיונות שעשו הכי הרבה הצלחה עם לקוחות שלנו:
          </p>
          <ul style={{ paddingRight: 24, margin: '12px 0' }}>
            <li style={{ marginBottom: 10 }}><strong>עיצוב מינימלי:</strong> שם הבר מצווה בכתב יד אלגנטי בצבע אחד, מרכוז, בלי הרבה אלמנטים.</li>
            <li style={{ marginBottom: 10 }}><strong>פסוק מהתורה:</strong> הפסוק שהבר מצווה יקרא, עם שם הפרשה ותאריך.</li>
            <li style={{ marginBottom: 10 }}><strong>עיצוב שיש:</strong> טקסטורת שיש בשחור-לבן עם שם הבר מצווה — נראה יוקרתי ומעניין.</li>
            <li style={{ marginBottom: 10 }}><strong>ציור ילדות:</strong> סריקת ציור שהבר מצווה עשה — תמיד מרגש ואנשים מדברים עליו כל הערב.</li>
            <li style={{ marginBottom: 10 }}><strong>לוגו ומיתוג:</strong> עסק משפחתי או עיצוב גרפי שמשקף את אישיות הבר מצווה.</li>
          </ul>
          <p>
            העצה שלנו: פשוט יותר הוא לרוב טוב יותר. עיצוב נקי עם שם ותאריך הוא תמיד בטוח ויפה. אם רוצים להפוך את הכיפה לחלק מחוויה שלמה — שלבו אותה עם מארז נייר כתשורת תודה.
          </p>

          <p style={{ marginTop: 32, padding: '16px 20px', background: '#FBF8F3', borderRight: `4px solid ${GOLD}`, fontSize: 14, color: '#555' }}>
            יש שאלות? <a href="https://wa.me/972584877770" target="_blank" rel="noopener noreferrer" style={{ color: GOLD, fontWeight: 700, textDecoration: 'none' }}>כתבו לנו בוואטסאפ</a> — נשמח לעזור לכם לבחור את הכיפה המושלמת לאירוע.
          </p>
        </div>
      </section>

      {/* ── 6. FAQ Accordion ────────────────────────────────────────────────── */}
      <section style={{ background: '#FAF8F3', padding: isMobile ? '48px 20px 56px' : '72px 24px 80px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: NAVY, marginBottom: 32, textAlign: 'center' }}>
            שאלות נפוצות
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {faqItems.map((item, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #E7E2D8', overflow: 'hidden' }}>
                <button
                  className="ys-faq-btn"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '16px 20px', background: 'none',
                    border: 'none', cursor: 'pointer', textAlign: 'right',
                    fontFamily: 'inherit', transition: 'background 0.15s',
                  }}
                  aria-expanded={openFaq === i}
                >
                  <span style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: '#1a1a1a', flex: 1, textAlign: 'right' }}>
                    {item.q}
                  </span>
                  <span style={{
                    fontSize: 18, color: GOLD, flexShrink: 0, marginRight: 12,
                    transition: 'transform 0.25s',
                    transform: openFaq === i ? 'rotate(180deg)' : 'none',
                    display: 'inline-block',
                  }}>
                    ▾
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 20px 18px', fontSize: isMobile ? 13 : 14, color: '#555', lineHeight: 1.75 }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
