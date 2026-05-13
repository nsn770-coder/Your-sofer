'use client';
import { useState } from 'react';

const WA_URL = 'https://wa.me/972552722228';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/send-contact-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (res.ok) {
        setStatus('sent');
        setName(''); setEmail(''); setMessage('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  const input: React.CSSProperties = {
    width: '100%', padding: '11px 14px', fontSize: 14, border: '1.5px solid #ddd',
    borderRadius: 0, fontFamily: 'inherit', direction: 'rtl', outline: 'none',
    boxSizing: 'border-box', background: '#fff', color: '#1a1a1a',
  };

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif", background: '#f7f4ef', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', padding: '52px 20px 44px', textAlign: 'center' }}>
        <div style={{ fontSize: 38, marginBottom: 10 }}>✉️</div>
        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: '0 0 10px' }}>צור קשר</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, margin: 0 }}>
          אנחנו כאן לכל שאלה — לפני הרכישה, במהלכה ואחריה
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 16px 60px' }}>

        {/* Contact details */}
        <div style={{ background: '#fff', border: '1px solid #e8e0d0', padding: '28px', marginBottom: 24 }}>
          <h2 style={{ color: '#1E3A8A', fontSize: 18, fontWeight: 800, margin: '0 0 20px' }}>פרטי התקשרות</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '📍', label: 'כתובת', value: 'האורן 18, דימונה' },
              { icon: '📧', label: 'מייל', value: 'cteend7@gmail.com' },
              { icon: '🕐', label: 'שעות פעילות', value: 'ימים א\'–ו\', 8:00–22:00' },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 15, color: '#1a1a1a', fontWeight: 500 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp section */}
        <div style={{ background: '#fff', border: '1px solid #e8e0d0', padding: '28px', marginBottom: 24 }}>
          <h2 style={{ color: '#1E3A8A', fontSize: 18, fontWeight: 800, margin: '0 0 12px' }}>
            💬 שירות לקוחות מהיר בוואטסאפ
          </h2>
          <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>
            הצ'אט שלנו זמין לכל שאלה — לפני הרכישה, במהלכה ואחריה.<br />
            לחץ על הכפתור לשיחה ישירה עם נציג אנושי
          </p>
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '12px 24px', fontWeight: 700, fontSize: 15, textDecoration: 'none', borderRadius: 0 }}
          >
            פתח שיחה בוואטסאפ ←
          </a>
        </div>

        {/* Shira chatbot note */}
        <div style={{ background: 'rgba(184,151,42,0.08)', border: '1px solid rgba(184,151,42,0.3)', padding: '20px 24px', marginBottom: 28 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#4a3a00', lineHeight: 1.7 }}>
            <strong>🤖 ניתן גם לשוחח עם שירה — הנציגה הווירטואלית שלנו</strong><br />
            זמינה 24/7 לשאלות על מוצרים, כשרות והזמנות
          </p>
        </div>

        {/* Contact form */}
        <div style={{ background: '#fff', border: '1px solid #e8e0d0', padding: '28px' }}>
          <h2 style={{ color: '#1E3A8A', fontSize: 18, fontWeight: 800, margin: '0 0 20px' }}>שלחו לנו הודעה</h2>

          {status === 'sent' ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '20px', textAlign: 'center', color: '#166534', fontSize: 15, fontWeight: 600 }}>
              ✅ ההודעה נשלחה בהצלחה! נחזור אליכם בהקדם.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>שם מלא</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  required
                  style={input}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>כתובת מייל</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="israel@example.com"
                  required
                  style={input}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>הודעה</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="כתבו את הודעתכם כאן..."
                  required
                  rows={5}
                  style={{ ...input, resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>
              {status === 'error' && (
                <div style={{ color: '#dc2626', fontSize: 13 }}>⚠️ אירעה שגיאה בשליחה. נסו שוב או פנו בוואטסאפ.</div>
              )}
              <button
                type="submit"
                disabled={status === 'sending'}
                style={{ background: '#1E3A8A', color: '#fff', border: 'none', padding: '13px 28px', fontSize: 15, fontWeight: 700, cursor: status === 'sending' ? 'not-allowed' : 'pointer', opacity: status === 'sending' ? 0.7 : 1, alignSelf: 'flex-start', borderRadius: 0, fontFamily: 'inherit' }}
              >
                {status === 'sending' ? 'שולח...' : 'שלח הודעה ←'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
