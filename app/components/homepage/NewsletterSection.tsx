'use client';

import { useState } from 'react';
import {
  collection, query, where, getDocs, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/app/firebase';

type Status = 'idle' | 'loading' | 'success' | 'error' | 'duplicate';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = email.trim().toLowerCase();
    if (!val || !val.includes('@')) return;
    setStatus('loading');
    try {
      const existing = await getDocs(
        query(collection(db, 'newsletter'), where('email', '==', val))
      );
      if (!existing.empty) { setStatus('duplicate'); return; }
      await addDoc(collection(db, 'newsletter'), { email: val, createdAt: serverTimestamp() });
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0c1a35 0%, #162d5a 100%)',
      padding: 'clamp(48px,7vw,88px) clamp(16px,4vw,40px)',
      direction: 'rtl',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(184,151,42,0.18)',
          border: '1px solid rgba(184,151,42,0.4)',
          borderRadius: 20,
          padding: '5px 16px',
          fontSize: 11,
          fontWeight: 700,
          color: '#e6c84a',
          letterSpacing: '0.08em',
          marginBottom: 20,
        }}>
          ✦ הצטרפו למועדון הלקוחות
        </div>

        <h2 style={{ fontSize: 'clamp(22px,3.5vw,38px)', fontWeight: 900, color: '#fff', margin: '0 0 14px', lineHeight: 1.25 }}>
          קבלו מבצעים ומוצרים חדשים — לפני כולם
        </h2>

        <p style={{ fontSize: 'clamp(13px,1.5vw,16px)', color: 'rgba(220,210,190,0.85)', margin: '0 0 36px', lineHeight: 1.6 }}>
          הירשמו לניוזלטר ותקבלו עדכונים על מוצרים חדשים, מבצעים בלעדיים ותוכן מעניין מעולם הסת&quot;מ.
        </p>

        {status === 'success' ? (
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(184,151,42,0.4)',
            borderRadius: 16,
            padding: '28px 24px',
          }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#b8972a', marginBottom: 8 }}>ברוכים הבאים!</div>
            <div style={{ fontSize: 14, color: 'rgba(220,210,190,0.85)' }}>
              נרשמתם בהצלחה. נעדכן אתכם ראשונים על כל חדשות ומבצעים.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, maxWidth: 460, margin: '0 auto', flexWrap: 'wrap' }}>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setStatus('idle'); }}
              placeholder="כתובת המייל שלכם"
              required
              style={{
                flex: 1,
                minWidth: 220,
                padding: '14px 18px',
                borderRadius: 12,
                border: '2px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontSize: 15,
                outline: 'none',
                direction: 'rtl',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => ((e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(184,151,42,0.6)')}
              onBlur={e => ((e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.15)')}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                background: 'linear-gradient(135deg, #b8972a 0%, #e6c84a 100%)',
                color: '#0c1a35',
                border: 'none',
                borderRadius: 12,
                padding: '14px 28px',
                fontSize: 15,
                fontWeight: 900,
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.7 : 1,
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.15s',
              }}
            >
              {status === 'loading' ? '...' : 'הצטרפו עכשיו ←'}
            </button>
            {status === 'duplicate' && (
              <div style={{ width: '100%', fontSize: 13, color: '#e6c84a', fontWeight: 600 }}>
                כתובת המייל הזו כבר רשומה 😊
              </div>
            )}
            {status === 'error' && (
              <div style={{ width: '100%', fontSize: 13, color: '#e88', fontWeight: 600 }}>
                שגיאה — נסו שוב בעוד רגע.
              </div>
            )}
          </form>
        )}

        <p style={{ fontSize: 12, color: 'rgba(200,190,170,0.55)', marginTop: 18, margin: '18px 0 0' }}>
          לא נשלח ספאם. בטל בכל עת.
        </p>
      </div>
    </div>
  );
}
