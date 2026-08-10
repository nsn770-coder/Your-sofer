'use client';
import { useEffect, useState } from 'react';
import type { PartnerWarehouse } from '@/app/lib/partner-types';

const EMPTY: PartnerWarehouse = {
  city: '',
  street: '',
  number: '',
  apartment: '',
  zipCode: '',
  phone: '',
  recipientName: '',
  type: 'partner',
  updatedAt: '',
};

export default function WarehouseSettingsForm({ idToken }: { idToken: string }) {
  const [form, setForm] = useState<PartnerWarehouse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/partner/warehouse', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (data.success && data.warehouse) setForm(data.warehouse);
      } catch (err) {
        console.error('Load warehouse error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [idToken]);

  function update<K extends keyof PartnerWarehouse>(key: K, value: PartnerWarehouse[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/partner/warehouse', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שמירה נכשלה');
      setForm(data.warehouse);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>בטעינה...</div>;

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 max-w-xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="עיר" required value={form.city} onChange={(v) => update('city', v)} />
        <Field label="רחוב" required value={form.street} onChange={(v) => update('street', v)} />
        <Field label="מספר בית" required value={form.number} onChange={(v) => update('number', v)} />
        <Field label="דירה" value={form.apartment || ''} onChange={(v) => update('apartment', v)} />
        <Field label="מיקוד" value={form.zipCode || ''} onChange={(v) => update('zipCode', v)} />
        <Field label="טלפון" required value={form.phone} onChange={(v) => update('phone', v)} />
      </div>
      <Field label="שם הנוכל" required value={form.recipientName} onChange={(v) => update('recipientName', v)} />

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">סוג מחסן</p>
        <label className="flex items-center gap-2 mb-1">
          <input
            type="radio"
            checked={form.type === 'partner'}
            onChange={() => update('type', 'partner')}
          />
          <span className="text-sm">משלוח מהמחסן שלי</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={form.type === 'dropship'}
            onChange={() => update('type', 'dropship')}
          />
          <span className="text-sm">אשלח לכם למחסן</span>
        </label>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {saved && !error && <p className="text-green-600 text-sm">נשמר בהצלחה</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded-lg text-white font-bold disabled:opacity-50"
        style={{ background: 'var(--ys-accent, #2563eb)' }}
      >
        {saving ? 'שומר...' : 'שמור הגדרות'}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
    </label>
  );
}
