'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePartner } from '@/app/contexts/PartnerContext';
import ProductsTable from '@/app/components/partner/ProductsTable';
import WarehouseSettingsForm from '@/app/components/partner/WarehouseSettingsForm';
import ProductFormModal from '@/app/components/partner/ProductFormModal';
import type { PartnerProduct } from '@/app/lib/partner-types';

type TabKey = 'active' | 'all' | 'warehouse';

const TAB_LABELS: Record<TabKey, string> = {
  active: 'פעילים',
  all: 'כל המוצרים',
  warehouse: 'הגדרות מחסן',
};

export default function PartnerProductsPage() {
  const { user } = useAuth();
  const { partner } = usePartner();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) || 'active';
  const [activeTab, setActiveTab] = useState<TabKey>(
    initialTab === 'all' || initialTab === 'warehouse' ? initialTab : 'active'
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PartnerProduct | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    router.push(`/partner/products?tab=${tab}`, { scroll: false });
  }

  const idToken = user?.idToken;
  const warehouseType = partner?.warehouse?.type ?? null;

  if (!idToken) {
    return <div>בטעינה...</div>;
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">המוצרים שלי</h1>
        {activeTab !== 'warehouse' && (
          <button
            onClick={() => {
              setEditingProduct(null);
              setModalOpen(true);
            }}
            className="px-4 py-2 rounded-lg text-white font-bold"
            style={{ background: 'var(--ys-accent, #2563eb)' }}
          >
            + הוסף מוצר חדש
          </button>
        )}
      </div>

      {!warehouseType && (
        <div className="mb-4 p-4 rounded-lg bg-amber-50 text-amber-800 text-sm">
          יש להגדיר הגדרות מחסן לפני העלאת מוצרים.{' '}
          <button onClick={() => switchTab('warehouse')} className="underline font-medium">
            עבור להגדרות מחסן
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px ${
              activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {(activeTab === 'active' || activeTab === 'all') && (
        <ProductsTable
          idToken={idToken}
          status={activeTab}
          refreshKey={refreshKey}
          onEdit={(p) => {
            setEditingProduct(p);
            setModalOpen(true);
          }}
        />
      )}

      {activeTab === 'warehouse' && <WarehouseSettingsForm idToken={idToken} />}

      {modalOpen && (
        <ProductFormModal
          idToken={idToken}
          mode={editingProduct ? 'edit' : 'create'}
          initialData={editingProduct}
          warehouseType={warehouseType}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
