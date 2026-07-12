'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { getKipaUnitPrice } from '@/app/lib/kippot';
import { useAuth } from '@/app/contexts/AuthContext';
import { Product } from '@/app/lib/types';
import ProductCard from '@/components/ui/ProductCard';

const GOLD = '#C5A028';
const NAVY = '#111d3a';

const KIPPOT_STYLES = [
  { id: 'lavan',    label: 'לבן ורדרד',    img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636051/%D7%9B%D7%99%D7%A4%D7%94_%D7%9C%D7%91%D7%9F_%D7%95%D7%A8%D7%93%D7%A8%D7%93_nauwhq.png' },
  { id: 'beige',    label: "בז'",           img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636052/%D7%9B%D7%99%D7%A4%D7%94_%D7%91%D7%96_fhrr09.png' },
  { id: 'marva',    label: 'ירוק מרווה',   img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636052/%D7%9B%D7%99%D7%A4%D7%94_%D7%9E%D7%A8%D7%95%D7%95%D7%94_b5ov4n.png' },
  { id: 'techelet', label: 'כחול רויאל',   img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636052/%D7%9B%D7%99%D7%A4%D7%94_%D7%AA%D7%9B%D7%9C%D7%AA_iflyjn.png' },
];

const PRINT_TYPES = [
  { id: 'print-top',    label: 'הדפסה למעלה', desc: 'הדפסה על חלק עליון', img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782638747/%D7%9B%D7%99%D7%A4%D7%94_%D7%91%D7%96_%D7%A2%D7%9D_%D7%94%D7%93%D7%A4%D7%A1_%D7%9C%D7%9E%D7%A2%D7%9C%D7%94_dh4nuv.png' },
  { id: 'print-bottom', label: 'הדפסה למטה',  desc: 'הדפסה על שוליים',    img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782638855/ChatGPT_Image_Jun_28_2026_12_27_20_PM_amqsji.png' },
  { id: 'embroidery',   label: 'רקמה',         desc: '+₪5 ליחידה',         img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782638923/%D7%9B%D7%99%D7%A4%D7%94_%D7%9C%D7%91%D7%A0%D7%94_%D7%A2%D7%9D_%D7%A8%D7%A7%D7%9E%D7%94_%D7%95%D7%95%D7%A8%D7%95%D7%93_n9tjmk.png' },
] as const;

type PrintType = typeof PRINT_TYPES[number]['id'];

export default function EventKippotClient() {
  const [qty, setQty]             = useState(30);
  const [printType, setPrintType] = useState<PrintType>('print-top');
  const [style, setStyle]         = useState<string | null>(null);
  const { user } = useAuth();
  const [eventProducts, setEventProducts] = useState<Product[]>([]);

  useEffect(() => {
    getDocs(query(collection(db, 'products'), where('isEventProduct', '==', true)))
      .then(snap => setEventProducts(
        snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
                 .filter(p => !p.hidden && !p.outOfStock && p.status !== 'inactive')
      ));
  }, []);

  const embroideryExtra = printType === 'embroidery' ? 5 : 0;
  const unitPrice = getKipaUnitPrice(qty) + embroideryExtra;
  const total = qty * unitPrice;

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif", maxWidth: 860, margin: '0 auto', padding: 'clamp(16px, 3vw, 40px) 16px 60px' }}>
      <style>{`
        .ys-ekip-range { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; background: #E5E0D5; outline: none; cursor: pointer; transform: scaleX(-1); }
        .ys-ekip-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 26px; height: 26px; background: ${GOLD}; cursor: pointer; border-radius: 50%; box-shadow: 0 2px 8px rgba(197,160,40,0.4); }
        .ys-ekip-range::-moz-range-thumb { width: 26px; height: 26px; background: ${GOLD}; cursor: pointer; border-radius: 50%; border: none; box-shadow: 0 2px 8px rgba(197,160,40,0.4); }
        .ys-ekip-card { transition: all 0.2s; }
        .ys-ekip-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
      `}</style>

      {/* Hero */}
      <div style={{ marginBottom: 32, borderBottom: '1px solid #E5E0D5', paddingBottom: 24 }}>
        <div style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 300, color: NAVY, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
          כיפות לאירועים
        </div>
        <div style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 900, color: NAVY, letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 12 }}>
          עם הדפסה אישית
        </div>
        <div style={{ fontSize: 15, color: '#6B7280', fontWeight: 400, lineHeight: 1.6, maxWidth: 520 }}>
          שם, תאריך ולוגו — הדמיה מיידית, מגוון ענק של צבעים וסגנונות, אספקה בזמן לאירוע.
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {[{ icon: '🎩', text: 'בר מצווה' }, { icon: '💒', text: 'חתונות' }, { icon: '🎉', text: 'אירועים פרטיים' }].map(b => (
            <span key={b.text} style={{ fontSize: 12, fontWeight: 600, color: '#9C7B3F', background: 'rgba(197,160,40,0.08)', padding: '5px 12px' }}>
              {b.icon} {b.text}
            </span>
          ))}
        </div>
      </div>

      {/* שלב 1: סוג עיצוב */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#3A2E1A', marginBottom: 12 }}>1. בחר סוג עיצוב</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {PRINT_TYPES.map(opt => (
            <button
              key={opt.id}
              onClick={() => setPrintType(opt.id)}
              style={{
                flex: '1 1 140px',
                padding: 0,
                border: printType === opt.id ? `2px solid ${GOLD}` : '2px solid #E5E0D5',
                background: printType === opt.id ? 'rgba(197,160,40,0.08)' : '#fff',
                cursor: 'pointer',
                textAlign: 'right',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                overflow: 'hidden',
              }}
            >
              <img src={opt.img} alt={opt.label} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: '#9C7B3F', marginTop: 2 }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* שלב 2: כמות */}
      <div style={{ background: '#fff', border: '1px solid #E5E0D5', padding: 'clamp(16px, 2.5vw, 28px)', marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#3A2E1A', marginBottom: 16 }}>2. בחר כמות</div>
        <input
          type="range"
          className="ys-ekip-range"
          min={30}
          max={300}
          step={1}
          value={qty}
          onChange={e => setQty(Number(e.target.value))}
          style={{ touchAction: 'pan-y' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#9C7B3F', fontWeight: 600 }}>
          <span>300</span><span>30</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
          <div style={{ background: '#FAF8F3', padding: '12px 20px', minWidth: 80 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9C7B3F', marginBottom: 4 }}>כמות</div>
            <div style={{ fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 900, color: NAVY }}>{qty}</div>
          </div>
          <div style={{ background: '#FAF8F3', padding: '12px 20px', minWidth: 110 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9C7B3F', marginBottom: 4 }}>מחיר ליחידה</div>
            <div style={{ fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 900, color: GOLD }}>₪{unitPrice}</div>
            {embroideryExtra > 0 && <div style={{ fontSize: 10, color: '#9C7B3F' }}>כולל +₪{embroideryExtra} רקמה</div>}
          </div>
          <div style={{ background: '#FAF8F3', padding: '12px 20px', minWidth: 130 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9C7B3F', marginBottom: 4 }}>סה&quot;כ משוער</div>
            <div style={{ fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 900, color: NAVY }}>
              ₪{total.toLocaleString('he-IL')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9C7B3F' }}>מדרגות:</span>
          {([
            { range: '30–99',   price: 12, active: qty >= 30  && qty <= 99  },
            { range: '100–150', price: 10, active: qty >= 100 && qty <= 150 },
            { range: '151–300', price: 9,  active: qty >= 151              },
          ] as { range: string; price: number; active: boolean }[]).map(({ range, price, active }) => (
            <span key={range} style={{ fontSize: 11, fontWeight: active ? 800 : 400, color: active ? GOLD : '#9C7B3F', background: active ? 'rgba(197,160,40,0.10)' : 'transparent', padding: active ? '2px 8px' : '2px 0', transition: 'all 0.15s' }}>
              {range} = ₪{price}{printType === 'embroidery' ? '+₪5' : ''}
            </span>
          ))}
        </div>
      </div>

      {/* שלב 3: בחר סוג כיפה */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#3A2E1A', marginBottom: 12 }}>3. בחר סוג כיפה</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {KIPPOT_STYLES.map(s => (
            <button
              key={s.id}
              className="ys-ekip-card"
              onClick={() => setStyle(style === s.id ? null : s.id)}
              style={{
                border: style === s.id ? `2px solid ${GOLD}` : '2px solid #E5E0D5',
                background: '#fff',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'center',
                fontFamily: 'inherit',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {style === s.id && (
                <div style={{ position: 'absolute', top: 6, left: 6, background: GOLD, color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>✓</div>
              )}
              <img src={s.img} alt={s.label} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{s.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      {style ? (
        <a
          href={`/kippot-order?qty=${qty}&type=${printType}&style=${style}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: GOLD,
            color: '#1a1a1a',
            fontWeight: 900,
            fontSize: 17,
            padding: '18px 32px',
            textDecoration: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          המשך לעיצוב ←
        </a>
      ) : (
        <div style={{ textAlign: 'center', fontSize: 13, color: '#9C7B3F', padding: '16px 0', border: '1px dashed #E5E0D5' }}>
          בחר סוג כיפה (שלב 3) כדי להמשיך ←
        </div>
      )}
      <div style={{ textAlign: 'center', fontSize: 13, color: '#9C7B3F', marginTop: 10, fontWeight: 600 }}>
        ✨ בשלב הבא: מעלים לוגו ומקבלים הדמיית AI של הכיפה שלכם — חינם
      </div>
      {eventProducts.length > 0 && (
        <div style={{ marginTop: 48, borderTop: '1px solid #E5E0D5', paddingTop: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 16 }}>מוצרים נוספים לאירוע</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {eventProducts.map(p => (
              <ProductCard
                key={p.id} id={p.id} name={p.name} price={p.price}
                images={[p.imgUrl, p.imgUrl2, p.imgUrl3].filter(Boolean) as string[]}
                was={p.was} badge={p.badge} isBestSeller={p.isBestSeller}
                outOfStock={p.outOfStock} cat={p.cat}
              />
            ))}
          </div>
        </div>
      )}

      {user?.role === 'admin' && (
        <a
          href="/admin/new-product?isEventProduct=true"
          style={{
            position: 'fixed', bottom: 140, right: 20, zIndex: 9999,
            background: '#374151', color: '#fff', fontWeight: 700, fontSize: 13,
            padding: '10px 16px', textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            fontFamily: 'Heebo, Arial, sans-serif',
          }}
        >
          ➕ הוסף מוצר לאירוע
        </a>
      )}
      {user?.role === 'admin' && (
        <a
          href={`/admin/new-product?cat=${encodeURIComponent('כיפות')}&isEventKippot=true`}
          style={{
            position: 'fixed', bottom: 90, right: 20, zIndex: 9999,
            background: '#C5A028', color: '#fff', fontWeight: 700, fontSize: 13,
            padding: '10px 16px', textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            fontFamily: 'Heebo, Arial, sans-serif',
          }}
        >
          + הוסף כיפה
        </a>
      )}
    </div>
  );
}
