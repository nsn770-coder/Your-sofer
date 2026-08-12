'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

interface Customer {
  key: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  orders: number;
  totalSpent: number;
  lastOrderAt: number | null;
}

interface Summary {
  total: number;
  returning: number;
  returningRate: number;
  averageSpend: number;
  totalSpent: number;
}

const shekel = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;
const date = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString('he-IL') : '—');

export default function PartnerCustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.idToken) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/partner/customers', {
          headers: { Authorization: `Bearer ${user.idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'טעינת הלקוחות נכשלה');
        if (!cancelled) {
          setCustomers(data.customers || []);
          setSummary(data.summary || null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'שגיאה');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.idToken]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.email, c.phone, c.city].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [customers, search]);

  function exportCsv() {
    const header = ['שם', 'אימייל', 'טלפון', 'עיר', 'הזמנות', 'סה"כ', 'הזמנה אחרונה'];
    const rows = filtered.map((c) => [
      c.name,
      c.email,
      c.phone,
      c.city,
      c.orders,
      Math.round(c.totalSpent),
      date(c.lastOrderAt),
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">הלקוחות שלי</h1>
          <p className="text-gray-600 mt-1">כל מי שרכש מהחנות שלכם.</p>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-40"
        >
          ייצוא CSV
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="לקוחות" value={loading ? '…' : String(summary?.total ?? 0)} />
        <Card label="לקוחות חוזרים" value={loading ? '…' : String(summary?.returning ?? 0)} />
        <Card
          label="שיעור חזרה"
          value={loading ? '…' : `${(summary?.returningRate ?? 0).toFixed(1)}%`}
        />
        <Card label="הוצאה ממוצעת" value={loading ? '…' : shekel(summary?.averageSpend ?? 0)} />
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="חיפוש לפי שם, אימייל, טלפון או עיר..."
        className="w-full border border-gray-300 rounded-lg px-4 py-2"
      />

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        {loading ? (
          <p className="p-6 text-gray-500">בטעינה...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-gray-500">אין לקוחות להצגה</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <Th>לקוח</Th>
                <Th>אימייל</Th>
                <Th>טלפון</Th>
                <Th>עיר</Th>
                <Th>הזמנות</Th>
                <Th>סה״כ רכישות</Th>
                <Th>אחרונה</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.key} className="border-t border-gray-100">
                  <Td>
                    <span className="font-medium text-gray-900">{c.name || '—'}</span>
                    {c.orders > 1 && (
                      <span className="mr-2 text-[10px] bg-green-100 text-green-700 rounded px-1.5 py-0.5">
                        חוזר
                      </span>
                    )}
                  </Td>
                  <Td>{c.email || '—'}</Td>
                  <Td>{c.phone || '—'}</Td>
                  <Td>{c.city || '—'}</Td>
                  <Td>{c.orders}</Td>
                  <Td>{shekel(c.totalSpent)}</Td>
                  <Td>{date(c.lastOrderAt)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-right font-medium px-4 py-3 whitespace-nowrap">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{children}</td>;
}
