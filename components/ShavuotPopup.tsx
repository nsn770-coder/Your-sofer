'use client';
import { useState, useEffect } from 'react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/firebase';

export default function ShavuotPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // popup disabled
  }, []);

  function close() {
    sessionStorage.setItem('shavuot_popup_seen', '1');
    setVisible(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) { setError('נא להזין אימייל תקין'); return; }
    setLoading(true);
    setError('');
    try {
      await addDoc(collection(db, 'newsletter'), {
        email: trimmed.toLowerCase(),
        source: 'shavuot_popup',
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
      sessionStorage.setItem('shavuot_popup_seen', '1');
    } catch {
      setError('שגיאה בשמירת האימייל, נסו שוב');
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          zIndex: 9000, backdropFilter: 'blur(2px)',
        }}
      />
      {/* Modal */}
      <div
        dir="rtl"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9001,
          background: '#1E3A8A',
          border: '1px solid rgba(184,151,42,0.45)',
          borderRadius: 20,
          padding: '36px 32px 32px',
          width: 'min(92vw, 420px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          fontFamily: 'Heebo, Arial, sans-serif',
          textAlign: 'center',
        }}
      >
        {/* Close button */}
        <button
          onClick={close}
          style={{
            position: 'absolute', top: 14, left: 14,
            background: 'rgba(255,255,255,0.08)', border: 'none',
            color: '#aaa', borderRadius: '50%', width: 30, height: 30,
            cursor: 'pointer', fontSize: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        {!submitted ? (
          <>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🌸</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>
              חג שבועות שמח!
            </h2>
            <p style={{ fontSize: 14, color: '#a8c0d8', margin: '0 0 4px' }}>
              הצטרפו למועדון הלקוחות וקבלו
            </p>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#b8972a', margin: '8px 0 20px' }}>
              10% הנחה על כל האתר
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="הכניסו את האימייל שלכם"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1.5px solid rgba(184,151,42,0.4)',
                  borderRadius: 10, padding: '12px 14px',
                  fontSize: 14, outline: 'none',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff', fontFamily: 'inherit',
                  textAlign: 'right',
                }}
              />
              {error && <div style={{ fontSize: 12, color: '#f87171' }}>{error}</div>}
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: '#b8972a', color: '#1E3A8A',
                  border: 'none', borderRadius: 24,
                  padding: '13px', fontSize: 15, fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  width: '100%',
                }}
              >
                {loading ? '...' : 'אני רוצה את ההנחה'}
              </button>
            </form>
            <p style={{ fontSize: 11, color: '#667', marginTop: 10 }}>
              הקופון יישלח לאימייל תוך דקות
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
              הקופון שלך מוכן!
            </h2>
            <p style={{ fontSize: 14, color: '#a8c0d8', marginBottom: 16 }}>
              השתמשו בקוד הזה בקופה:
            </p>
            <div style={{
              background: 'rgba(184,151,42,0.15)',
              border: '2px dashed #b8972a',
              borderRadius: 12, padding: '14px 20px',
              fontSize: 26, fontWeight: 900, color: '#b8972a',
              letterSpacing: 2, marginBottom: 20,
            }}>
              SHAVUOT10
            </div>
            <button
              onClick={close}
              style={{
                background: '#b8972a', color: '#1E3A8A',
                border: 'none', borderRadius: 24,
                padding: '12px 32px', fontSize: 14, fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              לקנייה עכשיו ←
            </button>
          </>
        )}
      </div>
    </>
  );
}
