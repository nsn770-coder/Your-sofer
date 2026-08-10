'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import type { Partner, PartnerSubscription } from '@/app/lib/partner-types';

interface PartnerContextType {
  partner: Partner | null;
  subscription: PartnerSubscription | null;
  loading: boolean;
  error: string | null;

  // Methods
  refreshPartner: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  updatePartnerProfile: (updates: Partial<Partner>) => Promise<void>;
}

const PartnerContext = createContext<PartnerContextType | null>(null);

export function PartnerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [subscription, setSubscription] = useState<PartnerSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load partner data when user changes
  useEffect(() => {
    if (user?.role === 'partner' && user.partnerId) {
      refreshPartner();
      refreshSubscription();
    } else {
      setPartner(null);
      setSubscription(null);
    }
  }, [user?.partnerId, user?.role]);

  async function refreshPartner() {
    if (!user?.partnerId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/partner/profile', {
        headers: { 'Authorization': `Bearer ${user.idToken}` },
      });

      if (!response.ok) throw new Error('Failed to load partner');
      const data = await response.json();
      setPartner(data.partner);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[PartnerContext] refresh error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function refreshSubscription() {
    if (!user?.partnerId) return;

    try {
      const response = await fetch('/api/partner/subscription', {
        headers: { 'Authorization': `Bearer ${user.idToken}` },
      });

      if (!response.ok) return;
      const data = await response.json();
      setSubscription(data.subscription);
    } catch (err) {
      console.warn('[PartnerContext] subscription load failed:', err);
    }
  }

  async function updatePartnerProfile(updates: Partial<Partner>) {
    if (!user?.partnerId) return;

    try {
      setError(null);
      const response = await fetch('/api/partner/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.idToken}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update partner');
      const data = await response.json();
      setPartner(data.partner);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  }

  return (
    <PartnerContext.Provider value={{
      partner,
      subscription,
      loading,
      error,
      refreshPartner,
      refreshSubscription,
      updatePartnerProfile,
    }}>
      {children}
    </PartnerContext.Provider>
  );
}

export function usePartner() {
  const context = useContext(PartnerContext);
  if (!context) {
    throw new Error('usePartner must be used within PartnerProvider');
  }
  return context;
}
