'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/contexts/CartContext';
import { formatPrice, effectivePrice as computeEffectivePrice } from '@/app/lib/utils';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import type { MomentProduct } from '@/app/moment/[id]/fetchMomentProducts';
import {
  BUNDLE_STEPS, BUNDLE_DISCOUNT_PCT, ADDON_PRICES, BUNDLE_META,
  type StepId,
} from '@/data/bundleBuilder';

/**
 * BundleBuilderClient — אשף בניית מארז חתנים.
 *
 * תמחור: מחיר כל רכיב נגזר מ-effectivePrice() בלבד — אותו מקור אמת כמו
 * הכרטיס, עמוד המוצר והפידים. הנחת המארז חלה על סכום המוצרים בלבד ולא על
 * תוספות הרקמה/ההדפס/ההטבעה, שהן עלות עבודה בפועל.
 *
 * הוספה לסל: פריט **אחד** עם id ייחודי, ו-bundleComponentCodes נושא את מזהי
 * הרכיבים — כך שהם מופיעים בהזמנה ללקיטה, ו-BundleContents יודע להציג אותם.
 * id סינתטי שאינו קיים ב-Firestore הוא דפוס קיים בפרויקט (ראו `print-${id}`
 * ב-ProductClient), ולכן אין כאן שינוי בזרימת התשלום.
 */

const NAVY = '#373A5A';
const GOLD = '#C5A028';
const CREAM = '#FAF8F3';

type PersonalizationChoice = 'none' | 'print' | 'embroidery';

export default function BundleBuilderClient({ products }: { products: MomentProduct[] }) {
  const router = useRouter();
  const { addItem } = useCart();

  const [stepIdx, setStepIdx] = useState(0);
  const [picked, setPicked] = useState<Partial<Record<StepId, MomentProduct>>>({});
  const [persoChoice, setPersoChoice] = useState<PersonalizationChoice>('none');
  const [persoText, setPersoText] = useState('');
  const [embossOn, setEmbossOn] = useState(false);
  const [embossText, setEmbossText] = useState('');
  const [error, setError] = useState('');

  const step = BUNDLE_STEPS[stepIdx];
  const isLast = stepIdx === BUNDLE_STEPS.length - 1;

  // מוצרי השלב הנוכחי — סינון מהרשימה שכבר נשלפה בשרת, בלי שליפה נוספת
  const stepProducts = useMemo(() => {
    if (!step.source) return [];
    const cats = new Set(step.source.map(s => s.category));
    return products.filter(p => p.cat && cats.has(p.cat) && !p.outOfStock);
  }, [step, products]);

  // ── תמחור ──
  const priceOf = (p?: MomentProduct) => (p ? computeEffectivePrice(p) : 0);
  const productsSubtotal =
    priceOf(picked.cover) + priceOf(picked.tallit) + priceOf(picked.siddur);

  const persoSurcharge =
    persoChoice === 'print' ? ADDON_PRICES.print
    : persoChoice === 'embroidery' ? ADDON_PRICES.embroidery
    : 0;
  const embossSurcharge = embossOn ? ADDON_PRICES.embossing : 0;
  const addonsTotal = persoSurcharge + embossSurcharge;

  // ההנחה חלה על המוצרים בלבד — לא על עבודת הרקמה/ההטבעה
  const discount = Math.round(productsSubtotal * (BUNDLE_DISCOUNT_PCT / 100));
  const finalPrice = Math.max(0, productsSubtotal - discount + addonsTotal);

  const chosenCount = [picked.cover, picked.tallit, picked.siddur].filter(Boolean).length;
  const complete = chosenCount === 3;

  function goNext() {
    setError('');
    if (step.source && !picked[step.id]) { setError('בחרו פריט כדי להמשיך'); return; }
    if (step.id === 'personalization' && persoChoice !== 'none' && !persoText.trim()) {
      setError('הקלידו את השם או הנוסח לרקמה'); return;
    }
    if (step.id === 'siddur' && embossOn && !embossText.trim()) {
      setError('הקלידו את נוסח ההטבעה'); return;
    }
    if (!isLast) { setStepIdx(i => i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  function handleAddBundle() {
    if (!complete) { setError('יש להשלים את בחירת שלושת הפריטים'); return; }
    if (embossOn && !embossText.trim()) { setError('הקלידו את נוסח ההטבעה'); return; }
    if (persoChoice !== 'none' && !persoText.trim()) { setError('הקלידו את השם לרקמה'); return; }

    const componentIds = [picked.cover!.id, picked.tallit!.id, picked.siddur!.id];
    const parts = [picked.cover!.name, picked.tallit!.name, picked.siddur!.name];

    const notes: string[] = [];
    if (persoChoice === 'print') notes.push(`הדפס: ${persoText.trim()}`);
    if (persoChoice === 'embroidery') notes.push(`רקמה: ${persoText.trim()}`);
    if (embossOn) notes.push(`הטבעה על הסידור: ${embossText.trim()}`);

    addItem({
      // id ייחודי — מאפשר כמה מארזים שונים בסל בלי שיתמזגו
      id: `bundle-chatan-${Date.now()}`,
      name: `${BUNDLE_META.name} | ${parts.join(' + ')}${notes.length ? ` (${notes.join(' · ')})` : ''}`,
      price: finalPrice,
      imgUrl: picked.cover!.imgUrl || picked.cover!.image_url,
      quantity: 1,
      cat: BUNDLE_META.cartCat,
      bundleComponentCodes: componentIds,
    });

    router.push('/cart');
  }

  return (
    <main dir="rtl" style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      {/* ── Hero ── */}
      <section style={{ background: CREAM, borderBottom: '1px solid #E7E2D8', padding: '40px 16px 32px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9C7B3F', letterSpacing: 2.5, margin: '0 0 10px' }}>
            בנה מארז משלך
          </p>
          <h1 style={{ fontSize: 'clamp(24px, 5vw, 38px)', fontWeight: 800, color: NAVY, lineHeight: 1.25, margin: '0 0 12px' }}>
            {BUNDLE_META.heroTitle}
          </h1>
          <p style={{ fontSize: 'clamp(14px, 2.4vw, 17px)', color: '#5A5A5A', lineHeight: 1.6, margin: 0 }}>
            {BUNDLE_META.heroSubtitle}
          </p>
          <div style={{ display: 'inline-block', marginTop: 16, background: NAVY, color: GOLD, fontSize: 13, fontWeight: 800, padding: '6px 16px' }}>
            ✦ {BUNDLE_DISCOUNT_PCT}% הנחה על כל המארז
          </div>
        </div>
      </section>

      {/* ── סרגל שלבים ── */}
      <nav aria-label="שלבי בניית המארז" style={{ borderBottom: '1px solid #F0EDE6', background: '#FFFFFF' }}>
        <ol style={{ maxWidth: 900, margin: '0 auto', padding: '14px 12px', display: 'flex', listStyle: 'none', gap: 6 }}>
          {BUNDLE_STEPS.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <li key={s.id} style={{ flex: 1, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => { if (i <= stepIdx) { setStepIdx(i); setError(''); } }}
                  disabled={i > stepIdx}
                  aria-current={active ? 'step' : undefined}
                  style={{
                    width: '100%', background: 'none', border: 'none', padding: '4px 2px',
                    cursor: i <= stepIdx ? 'pointer' : 'default', font: 'inherit',
                  }}
                >
                  <div style={{
                    height: 3, background: done || active ? GOLD : '#E7E2D8', marginBottom: 7,
                  }} />
                  <span style={{
                    fontSize: 11.5, fontWeight: active ? 800 : 600,
                    color: active ? NAVY : done ? '#9C7B3F' : '#B0AAA0',
                    whiteSpace: 'nowrap',
                  }}>
                    {done ? '✓ ' : `${i + 1}. `}{s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ── תוכן השלב ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 16px 140px' }}>
        <h2 style={{ fontSize: 21, fontWeight: 700, color: NAVY, margin: '0 0 4px' }}>{step.title}</h2>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 22px' }}>{step.subtitle}</p>

        {step.source ? (
          stepProducts.length === 0 ? (
            <p style={{ color: '#6B7280', fontSize: 14 }}>אין כרגע פריטים זמינים בשלב הזה.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
              {stepProducts.map(p => {
                const selected = picked[step.id]?.id === p.id;
                const img = optimizeCloudinaryUrl(p.imgUrl || p.image_url || '', 300);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setPicked(prev => ({ ...prev, [step.id]: p })); setError(''); }}
                    aria-pressed={selected}
                    style={{
                      textAlign: 'right', background: '#FFFFFF', cursor: 'pointer', padding: 0,
                      border: selected ? `2px solid ${GOLD}` : '1px solid #E7E2D8',
                      font: 'inherit', display: 'flex', flexDirection: 'column',
                    }}
                  >
                    <span style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', background: CREAM, display: 'block', overflow: 'hidden' }}>
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={p.name} loading="lazy" decoding="async"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : null}
                      {selected && (
                        <span style={{
                          position: 'absolute', top: 6, right: 6, background: GOLD, color: '#111',
                          fontSize: 11, fontWeight: 800, padding: '2px 8px',
                        }}>✓ נבחר</span>
                      )}
                    </span>
                    <span style={{ padding: '8px 9px 10px', display: 'block' }}>
                      <span style={{
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden', fontSize: 12.5, color: NAVY, lineHeight: 1.4, minHeight: 35,
                      }}>{p.name}</span>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 800, color: '#111', marginTop: 5 }}>
                        {formatPrice(computeEffectivePrice(p))}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          /* ── שלב הרקמה/הדפס ── */
          <div style={{ maxWidth: 560 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              {([
                { id: 'none', label: 'בלי שם', price: 0, desc: 'הכיסוי יישאר חלק' },
                { id: 'print', label: 'הדפס שם', price: ADDON_PRICES.print, desc: 'הדפסה נקייה — החלופה המשתלמת' },
                { id: 'embroidery', label: 'רקמת שם', price: ADDON_PRICES.embroidery, desc: 'רקמה בחוט — מהודר ועמיד לשנים' },
              ] as const).map(opt => {
                const on = persoChoice === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { setPersoChoice(opt.id); setError(''); }}
                    aria-pressed={on}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      padding: '14px 16px', textAlign: 'right', cursor: 'pointer', font: 'inherit',
                      background: on ? '#FDF8EC' : '#FFFFFF',
                      border: on ? `2px solid ${GOLD}` : '1px solid #E7E2D8',
                    }}
                  >
                    <span>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: NAVY }}>
                        {on ? '✓ ' : ''}{opt.label}
                      </span>
                      <span style={{ display: 'block', fontSize: 12.5, color: '#6B7280', marginTop: 2 }}>{opt.desc}</span>
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: opt.price ? '#8a6d0f' : '#6B7280', whiteSpace: 'nowrap' }}>
                      {opt.price ? `+${formatPrice(opt.price)}` : 'ללא תוספת'}
                    </span>
                  </button>
                );
              })}
            </div>

            {persoChoice !== 'none' && (
              <div style={{ marginTop: 16 }}>
                <label htmlFor="perso-text" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
                  השם או הנוסח שיופיע על הכיסוי
                </label>
                <input
                  id="perso-text"
                  value={persoText}
                  onChange={e => { setPersoText(e.target.value); setError(''); }}
                  maxLength={30}
                  placeholder="לדוגמה: משה כהן"
                  style={{ width: '100%', padding: '11px 13px', border: '1px solid #E7E2D8', fontSize: 15, fontFamily: 'inherit' }}
                />
                <p style={{ fontSize: 11.5, color: '#9CA3AF', margin: '6px 0 0' }}>
                  עד 30 תווים · בדקו את הכתיב — פריט בהתאמה אישית אינו ניתן להחזרה
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── הטבעה על הסידור — רק בשלב האחרון ── */}
        {step.id === 'siddur' && picked.siddur && (
          <div style={{ marginTop: 26, padding: '16px 18px', background: CREAM, border: '1px solid #E7E2D8', maxWidth: 560 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={embossOn}
                onChange={e => { setEmbossOn(e.target.checked); setError(''); }}
                style={{ width: 17, height: 17, accentColor: GOLD }}
              />
              <span style={{ fontSize: 14.5, fontWeight: 700, color: NAVY }}>
                להוסיף הטבעת שם על הסידור · +{formatPrice(ADDON_PRICES.embossing)}
              </span>
            </label>
            {embossOn && (
              <input
                value={embossText}
                onChange={e => { setEmbossText(e.target.value); setError(''); }}
                maxLength={30}
                placeholder="נוסח ההטבעה"
                aria-label="נוסח ההטבעה על הסידור"
                style={{ width: '100%', marginTop: 11, padding: '11px 13px', border: '1px solid #E7E2D8', fontSize: 15, fontFamily: 'inherit' }}
              />
            )}
          </div>
        )}

        {error && (
          <p role="alert" style={{ marginTop: 18, color: '#c0392b', fontSize: 13.5, fontWeight: 700 }}>{error}</p>
        )}
      </section>

      {/* ── סרגל סיכום קבוע ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: '#FFFFFF', borderTop: '1px solid #E7E2D8',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.07)',
        padding: '10px 14px calc(10px + env(safe-area-inset-bottom, 0px))',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: '#6B7280' }}>
              {chosenCount}/3 פריטים
              {discount > 0 && <span style={{ color: '#1a6b3c', fontWeight: 700 }}> · חסכת {formatPrice(discount)}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>{formatPrice(finalPrice)}</span>
              {discount > 0 && (
                <span style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'line-through' }}>
                  {formatPrice(productsSubtotal + addonsTotal)}
                </span>
              )}
            </div>
          </div>

          {isLast ? (
            <button
              type="button"
              onClick={handleAddBundle}
              disabled={!complete}
              style={{
                background: complete ? NAVY : '#C9C6C0', color: '#fff', border: 'none',
                padding: '13px 26px', fontSize: 15, fontWeight: 800,
                cursor: complete ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              הוספת המארז לסל
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              style={{
                background: NAVY, color: '#fff', border: 'none',
                padding: '13px 30px', fontSize: 15, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              המשך ←
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
