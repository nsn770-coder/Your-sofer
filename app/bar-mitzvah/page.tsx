'use client';
import { useState } from 'react';

const WA_URL =
  'https://wa.me/972552722228?text=%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%AA%D7%A2%D7%A0%D7%99%D7%99%D7%9F%20%D7%91%D7%A1%D7%98%20%D7%91%D7%A8%20%D7%9E%D7%A6%D7%95%D7%95%D7%94';

const WA_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.057 23.286a.75.75 0 00.92.92l5.427-1.476A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.5-5.25-1.377l-.376-.217-3.898 1.059 1.059-3.898-.217-.376A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </svg>
);

const TIERS = [
  {
    id: 'mehudar',
    name: 'מהודר',
    desc: 'כתיבה מדויקת ברמה גבוהה, קלף מוכשר, בדיקת מחשב ומגיה מוסמך. הרמה הכשרה לכתחילה לפי כל הפוסקים.',
    price: '₪1,200 – ₪1,800',
    featured: false,
    level: 'mehudar',
  },
  {
    id: 'mehudar-betachlit',
    name: 'מהודר בתכלית',
    desc: 'כתיבה ברמה עילית, בדיקה כפולה, קלף גוויל מובחר. הבחירה הפופולרית ביותר לבר מצווה.',
    price: '₪2,200 – ₪3,200',
    featured: true,
    badge: 'הכי נמכר',
    level: 'mehudar-betachlit',
  },
  {
    id: 'premium',
    name: 'מהודר פרימיום',
    desc: 'הרמה הגבוהה ביותר בשוק. סופר מומחה בעל שם, קלף עילי, ותיעוד מלא של הכתיבה. מתנה לכל החיים.',
    price: '₪3,800 – ₪6,500',
    featured: false,
    level: 'premium',
  },
];

const TESTIMONIALS = [
  {
    initials: 'יכ',
    name: 'יוסף כהן',
    city: 'ירושלים',
    text: 'קנינו לבר מצווה של הבן ״מהודר בתכלית״ — קיבלנו שירות אישי מהסופר עצמו. הייתה לנו חוויה שלא נשכח, ולא רק מוצר.',
  },
  {
    initials: 'מל',
    name: 'משה לוי',
    city: 'בני ברק',
    text: 'פחדתי שלא אבין כלום. אנשי Your Sofer ליוו אותי מהרגע הראשון, הסבירו כל רמה ועזרו לבחור. בסוף הצלחתי לתת לבן שלי תפילין אמיתיים.',
  },
  {
    initials: 'אפ',
    name: 'אברהם פרץ',
    city: 'תל אביב',
    text: 'הזמנתי את רמת הפרימיום — ולא מצטער אפילו שנייה. הסופר צלם את כל שלבי הכתיבה. האריזה עצמה הייתה כבר מתנה.',
  },
];

const FAQS = [
  {
    q: 'מה ההבדל בין שלוש הרמות?',
    a: 'ההבדל הוא באיכות הכתיבה, סוג הקלף, ורמת הבדיקה. ״מהודר״ — כשר לכתחילה לפי כל הפוסקים. ״מהודר בתכלית״ — בדיקה כפולה וקלף עילי. ״פרימיום״ — סופר מומחה, קלף גוויל, אריזת יוקרה.',
  },
  {
    q: 'מתי כדאי להזמין?',
    a: 'מומלץ להזמין לפחות 3–4 שבועות לפני הבר מצווה. רמות מהודר בתכלית ופרימיום עשויות לקחת עד 6 שבועות.',
  },
  {
    q: 'האם אפשר לראות את הסופר שיכתוב?',
    a: 'כן. אצלנו כל סופר הוא אדם אמיתי עם פרופיל, תמונה ותעודה. אפשר לבחור סופר ספציפי או לתת לנו להתאים לפי הרמה.',
  },
  {
    q: 'מה קורה אם יש בעיה לאחר הרכישה?',
    a: 'אנחנו מספקים אחריות מלאה. אם מגיה עצמאי מוצא בעיה בשנה הראשונה — נטפל בזה ללא עלות.',
  },
  {
    q: 'האם יש אריזת מתנה?',
    a: 'כן, כל הרמות מגיעות עם אריזה מכובדת. רמת פרימיום מגיעה עם קופסת עץ יוקרתית מודפסת עם שם הבר מצווה.',
  },
  {
    q: 'מה כולל הסט?',
    a: 'סט בר מצווה מלא: תפילין מהודרים (בתים + קלפים), שקית תפילין איכותית, מדריך הנחה, תעודת כשרות ואחריות, ואריזת מתנה.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 px-5 bg-transparent border-0 cursor-pointer text-right"
        style={{ fontFamily: 'inherit' }}
      >
        <span className="text-[15px] font-semibold text-[#0c1a35] flex-1 text-right">{q}</span>
        <span className="text-[#C5A028] font-bold text-base shrink-0 leading-none">
          {open ? '▴' : '▾'}
        </span>
      </button>
      <div style={{ maxHeight: open ? 300 : 0, overflow: 'hidden', transition: 'max-height 0.28s ease' }}>
        <p className="px-5 pb-5 text-[14px] text-gray-600 leading-relaxed m-0 bg-[#F8F5F0]">{a}</p>
      </div>
    </div>
  );
}

export default function BarMitzvahPage() {
  return (
    <div
      dir="rtl"
      className="bg-[#F5F2EC] min-h-screen"
      style={{ fontFamily: "'Heebo', Arial, sans-serif" }}
    >

      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#0c1a35] to-[#1a2a4a] py-16 sm:py-24 px-4 text-center">
        <p className="text-[#C5A028] text-xs sm:text-sm font-bold tracking-widest mb-4 uppercase">
          Your Sofer — סת״מ בשקיפות מלאה
        </p>
        <h1 className="text-white text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-5 max-w-2xl mx-auto">
          סט בר מצווה מהודר — בלי כאב ראש
        </h1>
        <p className="text-white/70 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          תפילין כשרים בכתיבת סופר מוסמך — עם תעודה, שקיפות מלאה,
          וליווי אישי מהסופר עצמו. הכל מוכן לבר המצווה שלך.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <a
            href="#tiers"
            className="bg-[#C5A028] text-[#0c1a35] font-black text-base px-8 py-4 rounded-lg w-full sm:w-auto text-center no-underline"
          >
            בחר את הסט שלך ←
          </a>
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-white/30 text-white font-semibold text-base px-8 py-4 rounded-lg w-full sm:w-auto text-center no-underline"
          >
            שאל שאלה בוואטסאפ
          </a>
        </div>
      </section>

      {/* ── 2. Trust bar ─────────────────────────────────────────────────── */}
      <div className="bg-[#E8E2D6] border-b border-[#C8B99A]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
          {[
            '⭐ 500+ משפחות בחרו בנו השנה',
            '✓ מגיה מוסמך על כל סט',
            '✓ תעודת כשרות מובטחת',
            '✓ ליווי אישי מהסופר',
          ].map(item => (
            <span
              key={item}
              className="text-[#4A3728] text-xs sm:text-sm font-semibold whitespace-nowrap"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── 3. Three tiers ───────────────────────────────────────────────── */}
      <section id="tiers" className="max-w-5xl mx-auto px-4 py-14">
        <h2 className="text-center text-[#0c1a35] text-2xl sm:text-3xl font-black mb-3">
          בחר את הרמה שמתאימה לך
        </h2>
        <p className="text-center text-gray-500 text-sm mb-12">
          כל הרמות כוללות תפילין מלאים, שקית, תעודת כשרות ואריזת מתנה
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch">
          {TIERS.map(tier => (
            <div
              key={tier.id}
              className={[
                'bg-white rounded-2xl p-6 flex flex-col relative',
                tier.featured
                  ? 'border-2 border-[#2563EB] shadow-xl'
                  : 'border border-[#E0D8CC] shadow-sm',
              ].join(' ')}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2563EB] text-white text-xs font-black px-4 py-1 rounded-full whitespace-nowrap">
                  {tier.badge}
                </div>
              )}
              <h3
                className={`text-xl font-black mb-2 mt-2 ${
                  tier.featured ? 'text-[#2563EB]' : 'text-[#0c1a35]'
                }`}
              >
                {tier.name}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5 flex-1">{tier.desc}</p>
              <div className="text-[#0c1a35] text-2xl font-black mb-6">{tier.price}</div>
              <a
                href={`/products?category=%D7%A1%D7%98+%D7%91%D7%A8+%D7%9E%D7%A6%D7%95%D7%95%D7%94&level=${tier.level}`}
                className={[
                  'block text-center font-bold text-base py-3 rounded-lg no-underline',
                  tier.featured
                    ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                    : 'bg-[#0c1a35] hover:bg-[#1a2a4a] text-white',
                ].join(' ')}
              >
                בחר רמה זו
              </a>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-400 text-xs mt-8">
          לא בטוח איזה לבחור?{' '}
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563EB] underline"
          >
            שוחח איתנו בוואטסאפ
          </a>{' '}
          ונעזור לך לבחור.
        </p>
      </section>

      {/* ── 4. Testimonials ──────────────────────────────────────────────── */}
      <section className="bg-[#0c1a35] py-14 px-4">
        <h2 className="text-center text-white text-2xl sm:text-3xl font-black mb-10">
          מה משפחות אומרות עלינו
        </h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-white/10 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#C5A028] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {t.initials}
                </div>
                <div>
                  <div className="text-white font-bold text-sm">{t.name}</div>
                  <div className="text-white/50 text-xs">{t.city}</div>
                </div>
              </div>
              <div className="text-[#C5A028] text-sm mb-3">★★★★★</div>
              <p className="text-white/80 text-sm leading-relaxed italic m-0">"{t.text}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. FAQ ───────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 py-14">
        <h2 className="text-center text-[#0c1a35] text-2xl sm:text-3xl font-black mb-8">
          שאלות נפוצות
        </h2>
        <div className="bg-white rounded-2xl border border-[#E0D8CC] overflow-hidden">
          {FAQS.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ── 6. Final CTA ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#0c1a35] to-[#1a2a4a] py-16 px-4 text-center">
        <h2 className="text-white text-2xl sm:text-3xl font-black mb-3">
          בחר את הסט שלך עכשיו
        </h2>
        <p className="text-white/70 text-base mb-8 max-w-md mx-auto">
          כל יום שעובר — הסופר מלא בהזמנות. הבטח את מקומך עכשיו.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <a
            href="#tiers"
            className="bg-[#C5A028] text-[#0c1a35] font-black text-base px-10 py-4 rounded-lg w-full sm:w-auto text-center no-underline"
          >
            ראה את הסטים ←
          </a>
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] text-white font-bold text-base px-10 py-4 rounded-lg w-full sm:w-auto text-center no-underline flex items-center justify-center gap-2"
          >
            {WA_ICON}
            שוחח עם יועץ
          </a>
        </div>
      </section>

      {/* Minimal footer */}
      <div className="bg-[#0f1111] py-4 text-center text-gray-500 text-xs">
        © 2025 Your Sofer — כל הזכויות שמורות
      </div>
    </div>
  );
}
