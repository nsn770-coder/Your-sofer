'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type Status = 'loading' | 'unsubscribed' | 'already_unsubscribed' | 'resubscribed' | 'invalid' | 'not_found' | 'error';

function UnsubscribeContent() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<Status>('loading');
  const [rejoining, setRejoining] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        const s = d.status as string;
        if (s === 'unsubscribed') setStatus('unsubscribed');
        else if (s === 'already_unsubscribed') setStatus('already_unsubscribed');
        else if (s === 'not_found') setStatus('not_found');
        else if (s === 'invalid_token') setStatus('invalid');
        else setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  async function rejoin() {
    if (!token || rejoining) return;
    setRejoining(true);
    try {
      const r = await fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}&action=resubscribe`);
      const d = await r.json();
      setStatus(d.status === 'resubscribed' ? 'resubscribed' : 'error');
    } catch {
      setStatus('error');
    } finally {
      setRejoining(false);
    }
  }

  const config: Record<Status, { icon: string; title: string; body: string; color: string }> = {
    loading: {
      icon: '⏳',
      title: 'מעבד את הבקשה...',
      body: 'אנא המתן.',
      color: '#888',
    },
    unsubscribed: {
      icon: '💚',
      title: 'הוסרת בהצלחה מרשימת הדיוור של YourSofer',
      body: 'לא תקבל/י יותר ניוזלטר שיווקי ממנו. מיילים טרנזקציוניים (אישור הזמנה, תעודות) ימשיכו להישלח כרגיל.',
      color: '#15803d',
    },
    already_unsubscribed: {
      icon: '✅',
      title: 'כבר הוסרת מהרשימה',
      body: 'כתובת המייל שלך כבר רשומה כהוסרה מרשימת הדיוור.',
      color: '#15803d',
    },
    resubscribed: {
      icon: '🎉',
      title: 'ברוך שובך!',
      body: 'הצטרפת מחדש לרשימת הדיוור של YourSofer. תשמח/י לשמוע על מבצעים ועדכונים.',
      color: '#1E3A8A',
    },
    not_found: {
      icon: '🔍',
      title: 'לא נמצאה רישום',
      body: 'לא מצאנו כתובת מייל זו ברשימת הדיוור שלנו.',
      color: '#92400e',
    },
    invalid: {
      icon: '⚠️',
      title: 'קישור לא תקין',
      body: 'הקישור פג תוקף או שגוי. אם ברצונך להסיר את עצמך — פנה אלינו ישירות בוואטסאפ.',
      color: '#dc2626',
    },
    error: {
      icon: '❌',
      title: 'אירעה שגיאה',
      body: 'לא הצלחנו לעבד את הבקשה. נסה שוב מאוחר יותר או פנה אלינו ישירות.',
      color: '#dc2626',
    },
  };

  const c = config[status];

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: '#f5f0e8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 500,
          width: '100%',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ background: '#1E3A8A', padding: '24px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 6 }}>
            YOUR SOFER
          </div>
          <div style={{ fontSize: 28, color: '#C5A028' }}>✡</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
            סת״מ ישירות מהסופר
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '36px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{c.icon}</div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: c.color,
              margin: '0 0 14px',
              lineHeight: 1.4,
            }}
          >
            {c.title}
          </h1>
          <p style={{ fontSize: 14, color: '#555', lineHeight: 1.75, margin: '0 0 28px' }}>
            {c.body}
          </p>

          {/* Rejoin button — shown after successful unsubscribe or already_unsubscribed */}
          {(status === 'unsubscribed' || status === 'already_unsubscribed') && (
            <button
              onClick={rejoin}
              disabled={rejoining}
              style={{
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 13,
                color: '#888',
                cursor: rejoining ? 'not-allowed' : 'pointer',
                marginBottom: 24,
              }}
            >
              {rejoining ? '⏳ מעדכן...' : 'טעות? הצטרף/י מחדש לרשימה'}
            </button>
          )}

          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 20, marginTop: 4 }}>
            <a
              href="https://your-sofer.com"
              style={{ color: '#1E3A8A', fontSize: 13, textDecoration: 'none', fontWeight: 700 }}
            >
              ← חזרה לחנות
            </a>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            background: '#f0f0f0',
            padding: '12px 24px',
            textAlign: 'center',
            fontSize: 11,
            color: '#aaa',
          }}
        >
          © 2025 Your Sofer · your-sofer.com ·{' '}
          <a
            href="https://wa.me/972587479933"
            style={{ color: '#aaa', textDecoration: 'underline' }}
          >
            058-747-9933
          </a>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div
          dir="rtl"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif',
            color: '#888',
          }}
        >
          ⏳ טוען...
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
