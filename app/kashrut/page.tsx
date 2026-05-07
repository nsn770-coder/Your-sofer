'use client';

import { useState } from 'react';

const CERT_URL =
  'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1778134296/%D7%9B%D7%A9%D7%A8%D7%95%D7%AA_j3eo9p.png';

const PROCESS = [
  { icon: '🔍', title: 'בדיקת מחשב', desc: 'כל קלף עובר סריקה ממוחשבת לאיתור שגיאות בכתב' },
  { icon: '👁️', title: 'פיקוח מגיה מוסמך', desc: 'הרב שמחה בונים ברג׳יקובסקי בודק כל יחידה אישית' },
  { icon: '📜', title: 'תעודת כשרות', desc: 'כל מוצר יוצא עם תעודת כשרות חתומה ומאושרת' },
  { icon: '✡️', title: 'עמידה בתקן הלכתי', desc: 'כשר לכתחילה על פי כל השיטות המקובלות' },
];

export default function KashrutPage() {
  const [lightbox, setLightbox] = useState(false);

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif", background: '#f7f4ef', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a35 0%, #1a2a4a 100%)', padding: '52px 20px 44px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>📜</div>
        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: '0 0 10px' }}>כשרות ופיקוח רבני</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, margin: 0 }}>
          כל מוצר סת״מ באתר עובר בדיקה מלאה לפני המשלוח
        </p>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 16px 60px' }}>

        {/* Certificate image */}
        <div style={{ background: '#fff', border: '1px solid #e8e0d0', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📜</span>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0c1a35', margin: 0 }}>תעודת כשרות</h2>
          </div>

          {/* Image — full width, clickable */}
          <div
            onClick={() => setLightbox(true)}
            role="button"
            tabIndex={0}
            aria-label="הגדל תעודת כשרות"
            onKeyDown={e => e.key === 'Enter' && setLightbox(true)}
            style={{
              margin: '16px 24px 0',
              maxWidth: 672,
              cursor: 'zoom-in',
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid #e8e0d0',
              position: 'relative',
            }}
          >
            <img
              src={CERT_URL}
              alt="תעודת כשרות — Your Sofer"
              style={{ width: '100%', display: 'block' }}
            />
            {/* Hover hint */}
            <div style={{
              position: 'absolute', bottom: 10, left: 10,
              background: 'rgba(12,26,53,0.72)',
              color: '#fff', fontSize: 11, fontWeight: 600,
              padding: '3px 10px', borderRadius: 20,
              backdropFilter: 'blur(4px)',
              pointerEvents: 'none',
            }}>
              🔍 הגדל
            </div>
          </div>

          {/* Zoom button */}
          <div style={{ padding: '14px 24px 24px' }}>
            <button
              onClick={() => setLightbox(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#0c1a35', color: '#fff',
                border: 'none', borderRadius: 8,
                padding: '10px 20px', fontSize: 14, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🔍 הגדל תעודה
            </button>
          </div>
        </div>

        {/* Kashrut process steps */}
        <h2 style={{ color: '#0c1a35', fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>תהליך הבדיקה</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 32 }}>
          {PROCESS.map(step => (
            <div key={step.title} style={{ background: '#fff', border: '1px solid #e8e0d0', borderRadius: 10, padding: '20px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>{step.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#0c1a35', marginBottom: 6 }}>{step.title}</div>
              <div style={{ fontSize: 12, color: '#666', lineHeight: 1.65 }}>{step.desc}</div>
            </div>
          ))}
        </div>

        {/* Magiah credentials */}
        <div style={{ background: '#fff', border: '1px solid #e8e0d0', borderRadius: 12, padding: '28px 24px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0c1a35', margin: '0 0 20px' }}>המגיה שלנו</h2>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #223366, #0c1a35)',
              border: '3px solid #b8972a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              fontSize: 20, fontWeight: 900, color: '#b8972a',
            }}>
              שב
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0c1a35', marginBottom: 3 }}>
                הרב שמחה בונים ברג׳יקובסקי
              </div>
              <div style={{ fontSize: 13, color: '#b8972a', fontWeight: 700, marginBottom: 10 }}>
                רב מגיה מוסמך
              </div>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7, margin: 0 }}>
                עם נסיון של 12 שנה בתחום ההגהה קיבל הסמכה מגדולי הרבנים בארץ וממכון יד רפאל המוכר.
                כל מוצר סת״מ הנמכר באתר עובר תחת ידיו לבדיקה מדוקדקת לפני המשלוח.
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12,
                background: 'rgba(184,151,42,0.1)', border: '1px solid rgba(184,151,42,0.4)',
                borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#b8972a',
              }}>
                <span>✓</span> הסמכה מוכרת — מכון יד רפאל
              </div>
            </div>
          </div>
        </div>

        {/* Commitment box */}
        <div style={{ background: 'rgba(184,151,42,0.08)', border: '2px solid #b8972a', borderRadius: 10, padding: '24px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✡️</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0c1a35', marginBottom: 6 }}>
            אנו מחויבים לסטנדרט הכשרות הגבוה ביותר
          </div>
          <div style={{ fontSize: 14, color: '#555', lineHeight: 1.65 }}>
            כל יחידה שיוצאת מאיתנו עוברת בדיקת מחשב, פיקוח מגיה מוסמך, ומגיעה עם תעודת כשרות חתומה.
            אין פשרות.
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label="תעודת כשרות — תצוגה מוגדלת"
        >
          <img
            src={CERT_URL}
            alt="תעודת כשרות — Your Sofer"
            style={{ maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 48px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(false)}
            style={{
              position: 'absolute', top: 18, left: 18,
              background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff',
              width: 44, height: 44, borderRadius: '50%',
              fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="סגור"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
