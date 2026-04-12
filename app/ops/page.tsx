'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOpsAuth } from '@/app/contexts/OpsAuthContext';

export default function OpsRootPage() {
  const { opsUser, loading } = useOpsAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!opsUser) {
      router.replace('/ops/login');
      return;
    }
    if (opsUser.role === 'owner') router.replace('/ops/dashboard/owner');
    else if (opsUser.role === 'ops_manager') router.replace('/ops/dashboard/ops');
    else router.replace('/ops/dashboard/fulfillment');
  }, [opsUser, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0c1a35' }}>
      <div className="text-white text-lg">מעביר לדשבורד...</div>
    </div>
  );
}
