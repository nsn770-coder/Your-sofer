'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { getAuthLazy } from '@/lib/authLazy';
import { useAuth } from '@/app/contexts/AuthContext';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

// ── Club popup — Google sign-in only ─────────────────────────────────────────
// The old email+phone form is gone: joining the club now means signing in with
// Google, so every member becomes a real Firebase user (users/{uid} is the
// identity). Server-side (/api/club-join) links/creates the matching `leads`
// record so the mailing list keeps working, and recovers the phone number of
// "old" members who joined via the previous popup (email match).
//
// sessionStorage → shows once per browser session, resets on each new visit.
// 'ys_club_join_pending' survives the signInWithRedirect fallback: when Google
// bounces the whole page, the popup re-opens on return and finishes the join.
const SESSION_KEY = 'ys_club_popup_seen';
const PENDING_KEY = 'ys_club_join_pending';
const COUPON_CODE = 'TAMUZ10';
const DELAY_MS    = 8000;
const IMAGE_URL   = optimizeCloudinaryUrl('https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780510230/%D7%A4%D7%95%D7%A4%D7%90%D7%A4_rnyoth.png', 800);

const GOLD   = '#C9A14A';
const GOLD_D = '#a07c30';
const DARK   = '#111111';

export default function ClubPopup() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [visible, setVisible]   = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [screen, setScreen]     = useState<'join' | 'thanks'>('join');
  const [joining, setJoining]   = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [pointsCredited, setPointsCredited] = useState(0);

  // Guards: run the join exactly once, and don't re-run the "should we show?"
  // check after it already decided.
  const joinRanRef = useRef(false);
  const timerCheckedRef = useRef(false);

  // ── Complete the join for the signed-in user (idempotent) ─────────────────
  const completeJoin = useCallback(async () => {
    if (joinRanRef.current) return;
    joinRanRef.current = true;
    setJoining(true);
    setJoinError(null);

    try {
      const auth = await getAuthLazy();
      const current = auth.currentUser;
      if (!current) throw new Error('no-current-user');
      const idToken = await current.getIdToken();

      const res = await fetch('/api/club-join', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `club-join ${res.status}`);
      if (typeof data.pointsCredited === 'number' && data.pointsCredited > 0) {
        setPointsCredited(data.pointsCredited);
      }

      // Welcome email (with the coupon) — best-effort, never blocks the user,
      // and only for NEW members so repeat sign-ins don't spam the inbox.
      if (!data.alreadyMember && current.email) {
        fetch('/api/send-club-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: current.email }),
        }).catch(() => {});
      }

      sessionStorage.setItem(SESSION_KEY, '1');
      sessionStorage.removeItem(PENDING_KEY);
      setScreen('thanks');
      setVisible(true);
    } catch (e) {
      console.error('[ClubPopup] completeJoin failed:', e);
      joinRanRef.current = false; // allow retry
      setJoinError('אירעה שגיאה בהצטרפות — נסו שוב בעוד רגע');
    } finally {
      setJoining(false);
    }
  }, []);

  // ── Redirect-return / popup sign-in completion ─────────────────────────────
  // Runs whenever auth state settles: if a join was started (pending flag) and
  // we now have a signed-in user — finish the join and show the coupon screen.
  // Covers both the signInWithPopup path and the signInWithRedirect fallback
  // (where the page reloads and the modal would otherwise be lost).
  useEffect(() => {
    if (authLoading) return;
    if (!sessionStorage.getItem(PENDING_KEY)) return;
    if (!user) {
      // Auth settled with no user — the redirect came back without a sign-in
      // (blocked/cancelled/failed). Don't dead-end silently: clear the flag
      // and re-open the join screen with a visible error so the user can retry.
      sessionStorage.removeItem(PENDING_KEY);
      setIsMobile(window.innerWidth < 640);
      setJoinError('ההתחברות לא הושלמה — נסו שוב');
      setScreen('join');
      setVisible(true);
      return;
    }
    setVisible(true);
    setIsMobile(window.innerWidth < 640);
    completeJoin();
  }, [authLoading, user, completeJoin]);

  // ── 8-second timer (once per session) ─────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;               // wait until we know who's here
    if (timerCheckedRef.current) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (sessionStorage.getItem(PENDING_KEY)) return; // redirect flow owns the UI
    timerCheckedRef.current = true;

    let cancelled = false;
    const t = setTimeout(async () => {
      // Signed-in users who are already club members never see the popup.
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists() && snap.data().clubMember === true) {
            sessionStorage.setItem(SESSION_KEY, '1');
            return;
          }
        } catch { /* if the check fails, fall through and show the popup */ }
      }
      if (cancelled) return;
      setIsMobile(window.innerWidth < 640);
      setVisible(true);
    }, DELAY_MS);

    return () => { cancelled = true; clearTimeout(t); };
  }, [authLoading, user]);

  function close() {
    sessionStorage.setItem(SESSION_KEY, '1');
    sessionStorage.removeItem(PENDING_KEY);
    setVisible(false);
  }

  // ── CTA click ──────────────────────────────────────────────────────────────
  async function handleJoinClick() {
    setJoinError(null);
    if (user) {
      // Already signed in — no re-auth needed, just join.
      completeJoin();
      return;
    }
    // Mark the join as pending BEFORE starting sign-in: if signInWithGoogle
    // falls back to a full-page redirect, this flag lets us resume on return.
    sessionStorage.setItem(PENDING_KEY, '1');
    setJoining(true);
    try {
      await signInWithGoogle();
      // Popup path: auth state updates async — the pending-flag effect above
      // completes the join once `user` lands. If the user closed the Google
      // popup, auth state never changes and nothing happens (flag is cleared
      // when the popup is dismissed).
    } finally {
      setJoining(false);
    }
  }

  if (!visible) return null;

  const pad = isMobile ? '28px 22px 32px' : '44px 40px 44px';

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard unavailable */ }
  }

  return (
    <>
      <style>{`
        @keyframes club-in {
          from { opacity: 0; transform: translate(-50%,-46%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        .cgold {
          background: ${GOLD}; color: ${DARK};
          border: none; border-radius: 10px;
          font-size: 15px; font-weight: 800;
          cursor: pointer; font-family: inherit;
          transition: background 0.18s, transform 0.12s;
        }
        .cgold:hover:not(:disabled) { background: ${GOLD_D}; transform: scale(1.01); }
        .cgold:disabled { opacity: 0.55; cursor: not-allowed; }
        .cgoogle {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; padding: 13px; margin-top: 4px;
          background: #fff; color: #1f1f1f;
          border: none; border-radius: 10px;
          font-size: 15px; font-weight: 800; font-family: inherit;
          cursor: pointer; transition: transform 0.12s, box-shadow 0.18s;
        }
        .cgoogle:hover:not(:disabled) { transform: scale(1.01); box-shadow: 0 4px 18px rgba(0,0,0,0.35); }
        .cgoogle:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={close}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9100, backdropFilter: 'blur(4px)' }}
      />

      {/* Modal */}
      <div
        dir="rtl"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 9101,
          width: isMobile ? 'min(95vw, 440px)' : 'min(92vw, 500px)',
          maxHeight: '92dvh',
          overflowY: 'auto',
          borderRadius: 18,
          boxShadow: '0 28px 90px rgba(0,0,0,0.55)',
          fontFamily: 'Heebo, Arial, sans-serif',
          animation: 'club-in 0.32s cubic-bezier(0.34,1.56,0.64,1)',
          backgroundImage: `url(${IMAGE_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.60)', borderRadius: 18 }} />

        {/* Content above overlay */}
        <div style={{ position: 'relative', zIndex: 1, padding: pad }}>

          {/* X button */}
          <button
            onClick={close}
            aria-label="סגור"
            style={{
              position: 'absolute', top: 14, left: 14,
              background: 'rgba(255,255,255,0.12)', border: 'none',
              color: 'rgba(255,255,255,0.75)', borderRadius: '50%',
              width: 32, height: 32, cursor: 'pointer', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >✕</button>

          {screen === 'join' ? (
            <>
              {/* Label */}
              <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
                מועדון לקוחות
              </div>

              {/* Title */}
              <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, color: '#fff', margin: '0 0 12px', lineHeight: 1.35 }}>
                🎉 הצטרפו למועדון ותתחילו להרוויח כבר מהקנייה הראשונה!
              </h2>

              {/* Benefits */}
              <p style={{ fontSize: isMobile ? 15 : 16, color: '#fff', fontWeight: 700, lineHeight: 1.75, margin: '0 0 8px' }}>
                <span style={{ color: GOLD }}>10% הנחה</span> בקנייה הראשונה
                {' + '}
                <span style={{ color: GOLD }}>10% כסף</span> לקנייה הבאה.
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: '0 0 20px' }}>
                לדוגמה: קנייה ב־500 ₪ = 50 ₪ לקנייה הבאה | קנייה ב־1,000 ₪ = 100 ₪ לקנייה הבאה.
              </p>

              {/* Error */}
              {joinError && (
                <div style={{
                  background: 'rgba(248,113,113,0.15)',
                  border: '1px solid rgba(248,113,113,0.5)',
                  borderRadius: 8,
                  padding: '9px 12px',
                  fontSize: 12,
                  color: '#fca5a5',
                  textAlign: 'center',
                  marginBottom: 10,
                }}>
                  {joinError}
                </div>
              )}

              {/* Google CTA */}
              <button onClick={handleJoinClick} disabled={joining} className="cgoogle">
                {joining ? (
                  '⏳ מתחברים...'
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    {user ? 'צרפו אותי למועדון' : 'הצטרפות עם Google'}
                  </>
                )}
              </button>

              {/* Consent note */}
              <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '12px 0 0', textAlign: 'center' }}>
                בהצטרפות למועדון אתם מאשרים קבלת דיוור שיווקי ומסכימים{' '}
                <a href="/legal/privacy" target="_blank" rel="noopener noreferrer"
                   style={{ color: GOLD, textDecoration: 'underline' }}>
                  למדיניות הפרטיות
                </a>
              </p>
            </>
          ) : (
            /* ── Screen 2: Thank you ── */
            <div style={{ textAlign: 'center', paddingTop: 16 }}>
              <div style={{ fontSize: 46, marginBottom: 14 }}>🎉</div>

              <h2 style={{ fontSize: isMobile ? 21 : 25, fontWeight: 900, color: '#fff', margin: '0 0 10px' }}>
                ברוכים הבאים למועדון!
              </h2>

              {pointsCredited > 0 && (
                <div style={{
                  background: 'rgba(201,161,74,0.15)',
                  border: `1px solid ${GOLD}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13.5,
                  color: '#fff',
                  marginBottom: 16,
                  lineHeight: 1.7,
                }}>
                  ⭐ על הרכישות הקודמות שלכם זוכיתם ב-
                  <span style={{ color: GOLD, fontWeight: 900 }}>{pointsCredited} נקודות</span>
                  {' '}(שוות ₪{pointsCredited})!
                </div>
              )}

              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.7, margin: '0 0 22px' }}>
                הנה קוד ההנחה שלכם ל-10% על הרכישה הראשונה:
              </p>

              {/* Coupon box + copy */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginBottom: 16 }}>
                <input
                  readOnly
                  value={COUPON_CODE}
                  onClick={e => (e.target as HTMLInputElement).select()}
                  style={{
                    flex: 1,
                    border: `2px dashed ${GOLD}`,
                    borderRadius: 10,
                    padding: '13px 12px',
                    fontSize: isMobile ? 15 : 18,
                    fontWeight: 900,
                    color: GOLD,
                    letterSpacing: 2,
                    background: 'rgba(201,161,74,0.12)',
                    textAlign: 'center',
                    outline: 'none',
                    fontFamily: 'inherit',
                    cursor: 'text',
                    direction: 'ltr',
                  }}
                />
                <button
                  onClick={copyCode}
                  style={{
                    background: copied ? '#15803d' : GOLD,
                    color: copied ? '#fff' : DARK,
                    border: 'none', borderRadius: 10,
                    padding: '12px 16px', fontSize: 13, fontWeight: 800,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    fontFamily: 'inherit', flexShrink: 0,
                    transition: 'background 0.22s',
                  }}
                >
                  {copied ? '✓ הועתק!' : 'העתק'}
                </button>
              </div>

              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '0 0 26px', lineHeight: 1.6 }}>
                שמרו את הקוד — שלחנו אותו גם למייל שלכם.
              </p>

              <button
                onClick={close}
                className="cgold"
                style={{ padding: '12px 36px', fontSize: 14 }}
              >
                לקנייה עכשיו ←
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
