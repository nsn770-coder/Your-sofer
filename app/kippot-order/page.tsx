'use client';
import { useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const KIPPOT_STYLES: Record<string, { label: string; img: string }> = {
  lavan:    { label: 'לבן ורדרד',  img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636051/%D7%9B%D7%99%D7%A4%D7%94_%D7%9C%D7%91%D7%9F_%D7%95%D7%A8%D7%93%D7%A8%D7%93_nauwhq.png' },
  beige:    { label: "בז'",         img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636052/%D7%9B%D7%99%D7%A4%D7%94_%D7%91%D7%96_fhrr09.png' },
  marva:    { label: 'ירוק מרווה', img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636052/%D7%9B%D7%99%D7%A4%D7%94_%D7%9E%D7%A8%D7%95%D7%95%D7%94_b5ov4n.png' },
  techelet: { label: 'כחול רויאל', img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636052/%D7%9B%D7%99%D7%A4%D7%94_%D7%AA%D7%9B%D7%9C%D7%AA_iflyjn.png' },
};

const TYPE_LABELS: Record<string, string> = {
  'print-top':    'הדפסה למעלה',
  'print-bottom': 'הדפסה למטה',
  'embroidery':   'רקמה',
};

function getBasePrice(qty: number) {
  return qty <= 49 ? 19 : qty <= 99 ? 17 : qty <= 150 ? 10 : 9;
}

function KippotOrderInner() {
  const searchParams = useSearchParams();
  const qty   = Number(searchParams.get('qty') || 50);
  const type  = (searchParams.get('type') || 'print-top') as 'print-top' | 'print-bottom' | 'embroidery';
  const style = searchParams.get('style') || 'lavan';

  const kippah = KIPPOT_STYLES[style] || KIPPOT_STYLES.lavan;

  const [designText, setDesignText]     = useState('');
  const [addSide, setAddSide]           = useState(false);
  const [addSideText, setAddSideText]   = useState('');
  const [contactName, setContactName]   = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const basePrice  = getBasePrice(qty);
  const typeExtra  = type === 'embroidery' ? 5 : 0;
  const sideExtra  = addSide ? 3 : 0;
  const unitPrice  = basePrice + typeExtra + sideExtra;
  const totalPrice = qty * unitPrice;

  // Second side label
  const secondSideLabel = type === 'print-top' ? 'הדפסה גם למטה (+₪3 ליחידה)' : 'הדפסה גם למעלה (+₪3 ליחידה)';

  function buildWhatsApp() {
    const secondLine = addSide ? `\nצד נוסף: ${addSideText || '(פרטים יישלחו)'}` : '';
    const msg =
      `הזמנת כיפות – YourSofer\n` +
      `סוג כיפה: ${kippah.label}\n` +
      `עיצוב: ${TYPE_LABELS[type]}\n` +
      `כמות: ${qty}\n` +
      `טקסט/עיצוב: ${designText || '(יישלח בנפרד)'}\n` +
      secondLine +
      `\nמחיר ליחידה: ₪${unitPrice}\n` +
      `סה"כ: ₪${totalPrice.toLocaleString('he-IL')}\n\n` +
      `שם: ${contactName}\nטל: ${contactPhone}`;
    return `https://wa.me/972522600127?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div dir="rtl" style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(16px, 3vw, 40px) 16px', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* חזרה */}
      <a href="/category/כיפות" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#C5A028', fontWeight: 700, fontSize: 13, textDecoration: 'none', marginBottom: 24 }}>
        → חזרה לבחירת כיפה
      </a>

      <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 900, color: '#1a1a1a', marginBottom: 4 }}>
        פרטי ההזמנה
      </h1>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 28 }}>
        {kippah.label} · {TYPE_LABELS[type]} · {qty} יחידות
      </p>

      {/* תמונת הכיפה הנבחרת */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', background: '#FAF8F3', border: '1px solid #E5E0D5', padding: 20, marginBottom: 28 }}>
        <img src={kippah.img} alt={kippah.label} style={{ width: 100, height: 100, objectFit: 'cover', flexShrink: 0, border: '2px solid #C5A028' }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#1a1a1a' }}>{kippah.label}</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{TYPE_LABELS[type]}</div>
          <div style={{ fontSize: 13, color: '#C5A028', fontWeight: 700, marginTop: 8 }}>₪{unitPrice} ליחידה × {qty} = ₪{totalPrice.toLocaleString('he-IL')}</div>
        </div>
      </div>

      {/* טקסט / לוגו */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
          {type === 'embroidery' ? 'טקסט לרקמה' : 'טקסט / שם לוגו להדפסה'}
        </label>
        <textarea
          value={designText}
          onChange={e => setDesignText(e.target.value)}
          placeholder={type === 'embroidery' ? 'לדוגמה: שם החתן, תאריך חתונה...' : 'לדוגמה: שם, לוגו, פסוק...'}
          rows={3}
          style={{ width: '100%', border: '1px solid #E5E0D5', padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
        />
        <div style={{ fontSize: 11, color: '#9C7B3F', marginTop: 4 }}>
          * לוגו / קובץ ישלח ב-WhatsApp לאחר ההזמנה
        </div>
      </div>

      {/* הוספת צד נוסף — רק בהדפסה */}
      {type !== 'embroidery' && (
        <div style={{ marginBottom: 20, border: '1px solid #E5E0D5', padding: 16, background: '#fff' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={addSide}
              onChange={e => setAddSide(e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#C5A028' }}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{secondSideLabel}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>הוסף הדפסה לצד השני של הכיפה</div>
            </div>
          </label>
          {addSide && (
            <textarea
              value={addSideText}
              onChange={e => setAddSideText(e.target.value)}
              placeholder="טקסט / עיצוב לצד הנוסף..."
              rows={2}
              style={{ width: '100%', marginTop: 12, border: '1px solid #E5E0D5', padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          )}
        </div>
      )}

      {/* פרטי קשר */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>פרטי יצירת קשר</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="שם מלא"
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            style={{ flex: '1 1 180px', border: '1px solid #E5E0D5', padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
          />
          <input
            type="tel"
            placeholder="מספר טלפון"
            value={contactPhone}
            onChange={e => setContactPhone(e.target.value)}
            style={{ flex: '1 1 180px', border: '1px solid #E5E0D5', padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
          />
        </div>
      </div>

      {/* סיכום מחיר */}
      <div style={{ background: '#FAF8F3', border: '1px solid #E5E0D5', padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>סיכום מחיר</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6B7280' }}>
            <span>₪{getBasePrice(qty)} × {qty}</span>
            <span>מחיר בסיס</span>
          </div>
          {typeExtra > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6B7280' }}>
              <span>+₪{typeExtra} × {qty}</span>
              <span>תוספת רקמה</span>
            </div>
          )}
          {sideExtra > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6B7280' }}>
              <span>+₪3 × {qty}</span>
              <span>הדפסה צד נוסף</span>
            </div>
          )}
          <div style={{ borderTop: '1px solid #E5E0D5', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 16, color: '#1a1a1a' }}>
            <span>₪{totalPrice.toLocaleString('he-IL')}</span>
            <span>סה"כ</span>
          </div>
        </div>
      </div>

      {/* כפתור WhatsApp */}
      <a
        href={buildWhatsApp()}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: '#25D366',
          color: '#fff',
          fontWeight: 900,
          fontSize: 16,
          padding: '18px 32px',
          textDecoration: 'none',
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      >
        📲 שלח הזמנה ב-WhatsApp
      </a>
      <div style={{ fontSize: 11, color: '#9C7B3F', textAlign: 'center', marginTop: 8 }}>
        נחזור אליך תוך 24 שעות עם אישור וקישור לתשלום
      </div>
    </div>
  );
}

export default function KippotOrderPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>טוען...</div>}>
      <KippotOrderInner />
    </Suspense>
  );
}
