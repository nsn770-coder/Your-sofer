'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Suspense } from 'react';

function LoginContent() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [signingIn, setSigningIn] = useState(false);

  // אחרי כניסה מוצלחת — אדמין לדשבורד, אחרים ל-?next או /account
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') { router.replace('/admin'); return; }
      const next = searchParams.get('next') || '/account';
      router.replace(next);
    }
  }, [user, loading, router, searchParams]);

  async function handleGoogle() {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  }

  if (loading) {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F6F1' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #E7E2D8', borderTopColor: '#C5A028', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#F8F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Heebo', Arial, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* לוגו / כותרת */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 13, letterSpacing: 2, color: '#C5A028', fontWeight: 700, marginBottom: 8 }}>YOUR SOFER</div>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: '#1a1a1a', margin: 0, letterSpacing: '-0.02em' }}>כניסה לחשבון</h1>
          <p style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8, fontWeight: 300 }}>עקוב אחרי הזמנות, נהל כתובות, וצבור נקודות</p>
        </div>

        {/* כרטיס כניסה */}
        <div style={{ background: '#fff', padding: '40px 36px', boxShadow: '0 2px 24px rgba(0,0,0,0.06)' }}>

          <button
            onClick={handleGoogle}
            disabled={signingIn}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              padding: '14px 20px', background: signingIn ? '#555' : '#1a1a1a', color: '#fff',
              border: 'none', cursor: signingIn ? 'default' : 'pointer',
              fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
              transition: 'background 0.2s', borderRadius: 0,
            }}
          >
            {signingIn ? (
              <>
                <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                מתחבר...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                המשך עם Google
              </>
            )}
          </button>

          <div style={{ marginTop: 24, padding: '16px', background: '#F8F6F1', fontSize: 12, color: '#888', lineHeight: 1.6, textAlign: 'center' }}>
            ניתן לרכוש ללא חשבון — הכניסה אופציונלית בלבד
          </div>
        </div>

        {/* חזרה לחנות */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
            חזרה לחנות
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F8F6F1' }} />}>
      <LoginContent />
    </Suspense>
  );
}
