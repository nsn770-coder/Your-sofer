'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOpsAuth } from '@/app/contexts/OpsAuthContext';

export default function OpsLoginPage() {
  const { opsUser, loading, accessDenied, signInWithGoogle } = useOpsAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && opsUser) {
      const role = opsUser.role;
      if (role === 'owner') router.replace('/ops/dashboard/owner');
      else if (role === 'ops_manager') router.replace('/ops/dashboard/ops');
      else router.replace('/ops/dashboard/fulfillment');
    }
  }, [opsUser, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0c1a35' }}>
        <div className="text-white text-lg">טוען...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0c1a35' }}
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mb-6">
          <div style={{ color: '#b8972a' }} className="text-4xl font-black mb-1">✡ Your Sofer</div>
          <div className="text-gray-500 text-sm">מערכת ניהול פנימית</div>
        </div>

        {accessDenied && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-right">
            <div className="text-red-700 font-bold text-sm mb-1">🚫 אין גישה</div>
            <div className="text-red-600 text-sm">
              אין לך גישה למערכת. פנה למנהל.
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-800 mb-2">כניסה למערכת</h1>
          <p className="text-gray-500 text-sm">
            כניסה מותרת לצוות הפנימי בלבד
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3.5 px-4 hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-gray-700"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
            <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9L38.2 9C34.9 6.1 29.7 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.2-2.7-.2-4z" fill="#FFC107"/>
            <path d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9L38.2 9C34.9 6.1 29.7 4 24 4c-7.8 0-14.5 4.4-17.7 10.7z" fill="#FF3D00"/>
            <path d="M24 44c5.7 0 10.8-1.9 14.8-5.1l-6.9-5.7c-2 1.4-4.5 2.2-7.9 2.2-5.8 0-10.6-3.9-12.3-9.2l-7 5.4C7.5 39.6 15.2 44 24 44z" fill="#4CAF50"/>
            <path d="M44.5 20H24v8.5h11.8c-.6 2.6-2.2 4.8-4.4 6.3l6.9 5.7c4-3.7 6.4-9.2 6.4-16.2 0-1.3-.2-2.7-.2-4.3z" fill="#1976D2"/>
          </svg>
          כניסה עם Google
        </button>

        <div className="mt-6 text-xs text-gray-400">
          מערכת מאובטחת לשימוש פנימי בלבד
        </div>
      </div>
    </div>
  );
}
