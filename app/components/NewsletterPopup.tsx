'use client';

type NewsletterStatus = 'idle' | 'loading' | 'success' | 'error' | 'duplicate';

interface Props {
  email: string;
  setEmail: (v: string) => void;
  status: NewsletterStatus;
  setStatus: (v: NewsletterStatus) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
}

export default function NewsletterPopup({ email, setEmail, status, setStatus, onSubmit, onClose }: Props) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 850, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden', direction: 'rtl' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ background: 'linear-gradient(135deg, #0c1a35, #1a2d50)', padding: '22px 24px', position: 'relative', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#b8972a', marginBottom: 4 }}>הצטרפו למועדון הלקוחות</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>קבלו מבצעים ומוצרים חדשים לפני כולם</div>
          <div style={{ marginTop: 10, background: '#b8972a', color: '#0c1a35', borderRadius: 20, padding: '5px 16px', fontSize: 13, fontWeight: 900, display: 'inline-block' }}>קבל 5% הנחה על ההזמנה הראשונה</div>
        </div>
        <div style={{ padding: '24px 24px 28px' }}>
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>נרשמתם בהצלחה!</div>
              <div style={{ fontSize: 13, color: '#666' }}>נעדכן אתכם ראשונים על מוצרים חדשים ומבצעים.</div>
              <button onClick={onClose} style={{ marginTop: 18, background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 10, padding: '10px 28px', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>סגור</button>
            </div>
          ) : (
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setStatus('idle'); }}
                placeholder="כתובת המייל שלכם"
                required
                style={{ border: '2px solid #e0e0e0', borderRadius: 10, padding: '12px 16px', fontSize: 14, outline: 'none', direction: 'rtl', width: '100%', boxSizing: 'border-box' }}
              />
              {status === 'duplicate' && <div style={{ fontSize: 12, color: '#b8972a', fontWeight: 600 }}>כתובת המייל הזו כבר רשומה 😊</div>}
              {status === 'error' && <div style={{ fontSize: 12, color: '#e74c3c', fontWeight: 600 }}>שגיאה בהרשמה, נסו שוב.</div>}
              <button
                type="submit"
                disabled={status === 'loading'}
                style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 900, cursor: status === 'loading' ? 'not-allowed' : 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}
              >
                {status === 'loading' ? '⏳ שולח...' : '✉️ הצטרפו עכשיו ←'}
              </button>
              <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>לא תודה</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
