'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { OpsAuthProvider, useOpsAuth } from '@/app/contexts/OpsAuthContext';
import OpsNavbar from '@/components/ops/OpsNavbar';

function OpsLayoutContent({ children }: { children: React.ReactNode }) {
  const { opsUser, loading } = useOpsAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/ops/login';

  useEffect(() => {
    if (loading) return;
    if (!opsUser && !isLoginPage) {
      router.replace('/ops/login');
    }
  }, [opsUser, loading, isLoginPage, router]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0c1a35' }}
      >
        <div className="text-center text-white">
          <div className="text-3xl font-black mb-3" style={{ color: '#b8972a' }}>✡ Your Sofer</div>
          <div className="text-sm opacity-60">טוען מערכת...</div>
        </div>
      </div>
    );
  }

  // Login page: no navbar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Not authenticated
  if (!opsUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <OpsNavbar />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <OpsAuthProvider>
      <OpsLayoutContent>{children}</OpsLayoutContent>
    </OpsAuthProvider>
  );
}
