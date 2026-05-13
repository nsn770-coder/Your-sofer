'use client';
import { useState } from 'react';

const WA_URL =
  'https://wa.me/972552722228?text=%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%AA%D7%A2%D7%A0%D7%99%D7%99%D7%9F%20%D7%91%D7%A1%D7%98%20%D7%91%D7%A8%20%D7%9E%D7%A6%D7%95%D7%95%D7%94';

const CATEGORY_URL = '/category/%D7%91%D7%A8%20%D7%9E%D7%A6%D7%95%D7%95%D7%94';

const WA_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.057 23.286a.75.75 0 00.92.92l5.427-1.476A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.5-5.25-1.377l-.376-.217-3.898 1.059 1.059-3.898-.217-.376A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </svg>
);

const TESTIMONIALS = [
  {
    initials: 'יכ',
    name: 'יוסף כהן',
    city: 'ירושלים',
    text: 'קנינו לבר מצווה של הבן — קיבלנו שירות אישי מהסופר עצמו. הייתה לנו חוויה שלא נשכח, ולא רק מוצר.',
  },
  {
    initials: 'מל',
    name: 'משה לוי',
    city: 'בני ברק',
    text: 'פחדתי שלא אבין כלום. אנשי Your Sofer ליוו אותי מהרגע הראשון, הסבירו כל שלב ועזרו לבחור. בסוף הצלחתי לתת לבן שלי תפילין אמיתיים.',
  },
  {
    initials: 'אפ',
    name: 'אברהם פרץ',
    city: 'תל אביב',
    text: 'הסופר צלם את כל שלבי הכתיבה ושלח לי תמונות. ידעתי בדיוק מה הבן שלי מקבל. לא ציפיתי לרמה הזאת.',
  },
];

const FAQS = [
  {
    q: 'מה כולל הסט?',
    a: 'סט בר מצווה מלא: תפילין מהודרים (בתים + קלפים), שקית תפילין איכותית, מדריך הנחה, תעודת כשרות ואחריות, ואריזת מתנה.',
  },
  {
    q: 'מתי כדאי להזמין?',
    a: 'מומלץ להזמין לפחות 3–4 שבועות לפני הבר מצווה. ככל שמזמינים מוקדם יותר — כך אפשר לבחור בנחת.',
  },
  {
    q: 'האם אפשר לראות את הסופר שיכתוב?',
    a: 'כן. כל סופר הוא אדם אמיתי עם פרופיל, תמונה ותעודה. אפשר לבחור סופר ספציפי או לתת לנו להתאים.',
  },
  {
    q: 'מה קורה אם יש בעיה לאחר הרכישה?',
    a: 'אנחנו מספקים אחריות מלאה. אם מגיה עצמאי מוצא בעיה בשנה הראשונה — נטפל בזה ללא עלות.',
  },
  {
    q: 'האם יש אריזת מתנה?',
    a: 'כן, הסט מגיע עם אריזה מכובדת ומוכנה למסירה.',
  },
  {
    q: 'מה ההבדל בין הסטים השונים בחנות?',
    a: 'ההבדל הוא באיכות הקלף, רמת הכתיבה, ומספר שלבי הבדיקה. בדף הקטגוריה תוכל לראות כל סט עם הפירוט המלא.',
  },
];

const STEPS = [
  {
    num: '1',
    title: 'בוחרים סט',
    desc: 'לוחצים על הכפתור ורואים את כל הסטים הזמינים עם פירוט מלא.',
  },
  {
    num: '2',
    title: 'מזמינים באתר',
    desc: 'תשלום מאובטח, אישור מיידי במייל.',
  },
  {
    num: '3',
    title: 'מקבלים הביתה',
    desc: 'משלוח מהיר עם תעודת כשרות, אחריות, ומדריך הנחה.',
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
        <span className="text-[15px] font-semibold text-[#1E3A8A] flex-1 text-right">{q}</span>
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
      <section className="bg-[#1E3A8A] py-16 sm:py-24 px-4 text-center">
        <p className="text-[#C5A028] text-xs sm:text-sm font-bold tracking-widest mb-4 uppercase">
          Your Sofer — סת״מ בשקיפות מלאה
        </p>
        <h1 className="text-white text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-5 max-w-2xl mx-auto">
          סט תפילין לבר המצווה שלו —<br className="hidden sm:block" /> מהודר, מוסמך, ומוכן למסירה
        </h1>
        <p className="text-white/75 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          בחרנו עבורך את הסט הטוב ביותר. סופר מוסמך, קלף איכותי, בדיקת מחשב — הכל כלול.
        </p>
        <a
          href={CATEGORY_URL}
          className="inline-block bg-[#C5A028] text-[#1E3A8A] font-black text-base px-10 py-4 rounded-lg no-underline"
        >
          בחר את הסט שלך ←
        </a>
      </section>

      {/* ── 2. Trust bar ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-start justify-center gap-6 sm:gap-12 flex-wrap">
          {[
            { icon: '✓', text: 'סופר מוסמך ומוכר' },
            { icon: '✓', text: 'בדיקת מחשב לכל קלף' },
            { icon: '✓', text: 'משלוח מהיר עם אחריות' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2">
              <span className="text-[#C5A028] font-black text-lg leading-none">{item.icon}</span>
              <span className="text-[#1E3A8A] text-sm font-bold">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Single tier card ──────────────────────────────────────────── */}
      <section id="tiers" className="max-w-lg mx-auto px-4 py-14">
        <div className="bg-white rounded-2xl border border-[#E0D8CC] shadow-md p-8 flex flex-col items-center text-center">
          <h3 className="text-2xl font-black text-[#1E3A8A] mb-3">סט תפילין מהודר לבר מצווה</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm">
            כתיבה ברמה גבוהה על קלף מעובד, בדיקת מחשב מוסמכת, תיק תפילין איכותי — סט מלא ומוכן.
          </p>
          <div className="bg-[#FEF9EC] border border-[#C5A028]/40 rounded-lg px-4 py-2 mb-4">
            <span className="text-[#9A7B1A] text-xs font-bold">המחיר כולל הכל — אין הפתעות</span>
          </div>
          <div className="text-[#1E3A8A] text-3xl font-black mb-8">₪2,800 – ₪3,700</div>
          <a
            href={CATEGORY_URL}
            className="w-full block text-center bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-base py-4 rounded-lg no-underline transition-colors"
          >
            לצפייה בסטים ←
          </a>
          <p className="text-gray-400 text-xs mt-5">
            שאלות?{' '}
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] underline">
              שוחח איתנו בוואטסאפ
            </a>
            {' '}ונעזור לבחור.
          </p>
        </div>
      </section>

      {/* ── 4. How it works ──────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 pb-14">
        <h2 className="text-center text-[#1E3A8A] text-2xl sm:text-3xl font-black mb-10">
          איך זה עובד?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEPS.map(step => (
            <div key={step.num} className="bg-white rounded-2xl border border-[#E0D8CC] p-6 flex flex-col items-center text-center shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#1E3A8A] flex items-center justify-center text-[#C5A028] font-black text-xl mb-4 shrink-0">
                {step.num}
              </div>
              <h4 className="text-[#1E3A8A] font-black text-base mb-2">{step.title}</h4>
              <p className="text-gray-500 text-sm leading-relaxed m-0">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Testimonials ──────────────────────────────────────────────── */}
      <section className="bg-[#1E3A8A] py-14 px-4">
        <h2 className="text-center text-white text-2xl sm:text-3xl font-black mb-10">
          מה משפחות אומרות עלינו
        </h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-white rounded-2xl p-6 flex flex-col shadow-md">
              <div className="text-[#C5A028] text-base mb-3 tracking-wide">★★★★★</div>
              <p className="text-gray-700 text-sm leading-relaxed italic mb-4 flex-1">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <div className="w-9 h-9 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {t.initials}
                </div>
                <div>
                  <div className="text-[#1E3A8A] font-bold text-sm">{t.name}</div>
                  <div className="text-gray-400 text-xs">{t.city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. FAQ ───────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 py-14">
        <h2 className="text-center text-[#1E3A8A] text-2xl sm:text-3xl font-black mb-8">
          שאלות נפוצות
        </h2>
        <div className="bg-white rounded-2xl border border-[#E0D8CC] overflow-hidden shadow-sm">
          {FAQS.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ── 7. Final CTA ─────────────────────────────────────────────────── */}
      <section className="bg-[#1E3A8A] py-16 px-4 text-center">
        <h2 className="text-white text-2xl sm:text-3xl font-black mb-4">
          מוכן לבחור?
        </h2>
        <a
          href={CATEGORY_URL}
          className="inline-block bg-[#C5A028] text-[#1E3A8A] font-black text-base px-10 py-4 rounded-lg no-underline mb-5"
        >
          לצפייה בסטים ←
        </a>
        <p className="text-white/60 text-sm">
          שאלות?{' '}
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white underline font-semibold"
          >
            נשמח לעזור בוואטסאפ
          </a>
        </p>
      </section>

      {/* Minimal footer */}
      <div className="bg-[#0f1111] py-4 text-center text-gray-500 text-xs">
        © 2025 Your Sofer — כל הזכויות שמורות
      </div>
    </div>
  );
}
