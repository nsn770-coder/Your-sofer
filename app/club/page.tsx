'use client';
// עמוד נחיתה להצטרפות למועדון — הקישור לשליחה במיילים: https://your-sofer.com/club
// כניסה עם גוגל → קריאה ל-/api/club-join (הצטרפות + זיכוי נקודות רטרואקטיבי) → אישור.
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { getAuthLazy } from '@/lib/authLazy';

type JoinState = 'idle' | 'signing' | 'joining' | 'success' | 'already' | 'error';

const GOLD = '#C5A028';

export default function ClubJoinPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [state, setState] = useState<JoinState>('idle');
  const [pointsCredited, setPointsCredited] = useState(0);
  const joinAttempted = useRef(false);

  // מחובר (מהכניסה עכשיו או מקודם) → מצטרף אוטומטית, פעם אחת
  useEffect(() => {
    if (loading || !user || joinAttempted.current) return;
    joinAttempted.current = true;
    void joinClub();
  }, [user, loading]);

  async function joinClub() {
    setState('joining');
    try {
      const auth = await getAuthLazy();
      if (!auth.currentUser) { setState('error'); return; }
      const idToken = await auth.currentUser.getIdToken();

      const res = await fetch('/api/club-join', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) { setState('error'); return; }

      const data = await res.json() as { ok?: boolean; alreadyMember?: boolean; pointsCredited?: number };
      if (data.alreadyMember) { setState('already'); return; }
      if (data.ok) {
        setPointsCredited(Number(data.pointsCredited ?? 0));
        setState('success');
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  }

  async function handleGoogle() {
    setState('signing');
    try {
      await signInWithGoogle();
      // ה-useEffect למעלה יתפוס את המשתמש המחובר ויקרא ל-joinClub
    } catch {
      setState('idle');
    }
  }

  const busy = state === 'signing' || state === 'joining' || loading;

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#F8F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Heebo', Arial, sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* כותרת */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 13, letterSpacing: 2, color: GOLD, fontWeight: 700, marginBottom: 8 }}>YOUR SOFER</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>מועדון הלקוחות שלנו 🎉</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 10, lineHeight: 1.7 }}>
            הצטרפות בחינם בלחיצה אחת — ומתחילים להרוויח
          </p>
        </div>

        <div style={{ background: '#fff', padding: '36px 32px', boxShadow: '0 2px 24px rgba(0,0,0,0.06)', borderRadius: 14 }}>

          {(state === 'success' || state === 'already') ? (
            /* ── אישור הצטרפות ── */
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#166534', margin: '0 0 10px' }}>
                {state === 'already' ? 'את/ה כבר חבר/ת מועדון!' : 'ברוכים הבאים למועדון!'}
              </h2>
              {pointsCredited > 0 && (
                <div style={{ background: '#ecfdf5', borderRadius: 10, padding: '12px 16px', margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#059669' }}>
                  זוכית ב-{pointsCredited} נקודות על רכישות קודמות 🎁
                </div>
              )}
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.8, margin: '0 0 20px' }}>
                מעכשיו כל רכישה צוברת נקודות (נקודה = ₪1 הנחה), ותקבלו גישה למבצעי מועדון בלעדיים.
              </p>
              <a href="/account/loyalty" style={{ display: 'inline-block', background: '#1a1a1a', color: '#fff', padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none', marginLeft: 8 }}>
                לנקודות שלי
              </a>
              <a href="/" style={{ display: 'inline-block', background: GOLD, color: '#1a1a1a', padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                לחנות ←
              </a>
            </div>
          ) : (
            /* ── הצטרפות ── */
            <>
              {/* הטבות */}
              <div style={{ display: 'grid', gap: 12, marginBottom: 26 }}>
                {[
                  ['💰', 'צבירת נקודות בכל קנייה — נקודה = ₪1 הנחה'],
                  ['🎁', 'זיכוי נקודות רטרואקטיבי על רכישות שכבר עשיתם'],
                  ['⭐', 'מבצעים והטבות בלעדיים לחברי מועדון'],
                  ['📬', 'עדכונים לפני כולם על מוצרים חדשים'],
                ].map(([icon, text]) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: '#374151' }}>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleGoogle}
                disabled={busy}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  padding: '14px 20px', background: busy ? '#555' : '#1a1a1a', color: '#fff',
                  border: 'none', cursor: busy ? 'default' : 'pointer', borderRadius: 10,
                  fontSize: 15, fontWeight: 700, fontFamily: 'inherit', transition: 'background 0.2s',
                }}
              >
                {busy ? (
                  <>
                    <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    {state === 'joining' ? 'מצרף אותך למועדון...' : 'מתחבר...'}
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    הצטרפות למועדון עם Google
                  </>
                )}
              </button>

              {state === 'error' && (
                <div style={{ marginTop: 14, background: '#fef2f2', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13, textAlign: 'center' }}>
                  משהו השתבש — נסו שוב, או כתבו לנו בוואטסאפ ונצרף אתכם ידנית.
                </div>
              )}

              <p style={{ fontSize: 11.5, color: '#9ca3af', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
                בהצטרפות למועדון אתם מאשרים קבלת דיוור שיווקי ומסכימים{' '}
                <a href="/legal/takanon" style={{ color: '#9ca3af' }}>לתקנון</a>
                {' '}ו<a href="/legal/privacy" style={{ color: '#9ca3af' }}>למדיניות הפרטיות</a>.
                אפשר להסיר את ההרשמה בכל רגע.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
