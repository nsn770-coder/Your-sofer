'use client';
import { useState } from 'react';
import { Product } from '@/app/lib/types';
import { Order } from '@/app/lib/types';

interface ProfitabilityTabProps {
  products: Product[];
  orders: Order[];
}

export default function ProfitabilityTab({ products, orders }: ProfitabilityTabProps) {
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month');

  const getFilteredOrders = () => {
    const cutoffDate = new Date();

    switch (dateRange) {
      case 'day':     cutoffDate.setDate(cutoffDate.getDate() - 1); break;
      case 'week':    cutoffDate.setDate(cutoffDate.getDate() - 7); break;
      case 'month':   cutoffDate.setMonth(cutoffDate.getMonth() - 1); break;
      case 'quarter': cutoffDate.setMonth(cutoffDate.getMonth() - 3); break;
      case 'year':    cutoffDate.setFullYear(cutoffDate.getFullYear() - 1); break;
    }

    return orders.filter(order => {
      const orderDate = order.createdAt instanceof Date
        ? order.createdAt
        : new Date(((order.createdAt as { seconds: number } | undefined)?.seconds ?? 0) * 1000);
      return orderDate >= cutoffDate;
    });
  };

  const getProfitData = () => {
    const profitMap: Record<string, {
      name: string; sold: number;
      revenue: number; cost: number; profit: number; profitAfterVat: number;
      noCost: boolean;
    }> = {};

    getFilteredOrders().forEach(order => {
      (order.items ?? []).forEach(item => {
        const anyItem = item as { productId?: string; id?: string; productName?: string; name?: string };
        const pid = anyItem.productId ?? anyItem.id;
        if (!pid) return;
        const product = products.find(p => p.id === pid);
        if (!product) return;

        const supplierCost = product.supplierCost ?? 0;
        const noCost       = supplierCost === 0;

        const paid           = item.price * item.quantity;
        const revenueNet     = paid / 1.18;
        const costInclVat    = supplierCost * 0.95 * 1.18 * item.quantity;
        const costNet        = supplierCost * 0.95 * item.quantity;
        const profitCashflow = revenueNet - costInclVat;
        const profitAfterVat = revenueNet - costNet;

        if (!profitMap[pid]) {
          profitMap[pid] = {
            name: anyItem.productName ?? anyItem.name ?? pid,
            sold: 0, revenue: 0, cost: 0, profit: 0, profitAfterVat: 0,
            noCost,
          };
        }
        profitMap[pid].sold          += item.quantity;
        profitMap[pid].revenue       += revenueNet;
        profitMap[pid].cost          += costInclVat;
        profitMap[pid].profit        += profitCashflow;
        profitMap[pid].profitAfterVat += profitAfterVat;
      });
    });

    return Object.values(profitMap).sort((a, b) => b.profit - a.profit);
  };

  const profitData       = getProfitData();
  const totalRevenue     = profitData.reduce((s, p) => s + p.revenue,       0);
  const totalCost        = profitData.reduce((s, p) => s + p.cost,          0);
  const totalProfit      = profitData.reduce((s, p) => s + p.profit,        0);
  const totalAfterVat    = profitData.reduce((s, p) => s + p.profitAfterVat, 0);
  const profitPercent    = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  // שווי מלאי שטרם נמכר — דינמי, לא תלוי ב-inStock השמור
  const unsoldInventory = (() => {
    const soldMap: Record<string, number> = orders
      .filter(o => o.status !== 'pending_payment' && o.status !== 'cancelled')
      .flatMap(o => o.items ?? [])
      .reduce<Record<string, number>>((m, i) => {
        const pid = (i as { productId?: string; id?: string }).productId ?? (i as { productId?: string; id?: string }).id;
        if (pid) m[pid] = (m[pid] ?? 0) + i.quantity;
        return m;
      }, {});

    let value = 0;
    let count = 0;
    for (const p of products) {
      if (!p.receivedFromSupplier || !p.supplierCost) continue;
      const currentStock = p.receivedFromSupplier - (soldMap[p.id] ?? 0);
      if (currentStock > 0) {
        value += currentStock * p.supplierCost;
        count++;
      }
    }
    return { value, count };
  })();

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 15 }}>📊 דוח רווחיות</h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {(['day', 'week', 'month', 'quarter', 'year'] as const).map(range => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            style={{
              padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700,
              border:     dateRange === range ? '2px solid #0c1a35' : '1px solid #ddd',
              background: dateRange === range ? '#0c1a35' : '#fff',
              color:      dateRange === range ? '#fff' : '#0c1a35',
            }}
          >
            {range === 'day'     && '📅 יום'}
            {range === 'week'    && '📆 שבוע'}
            {range === 'month'   && '📊 חודש'}
            {range === 'quarter' && '📈 רבעון'}
            {range === 'year'    && '📉 שנה'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 15, marginBottom: 20 }}>
        <div style={{ background: '#ecfdf5', padding: 15, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>רווח תזרימי</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#059669' }}>₪{totalProfit.toFixed(0)}</div>
        </div>
        <div style={{ background: '#f0fdf4', padding: 15, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>רווח אחרי מע״מ תשומות</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#16a34a' }}>₪{totalAfterVat.toFixed(0)}</div>
        </div>
        <div style={{ background: '#eff6ff', padding: 15, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#0369a1', fontWeight: 700 }}>הכנסות נטו (ללא מע״מ)</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0369a1' }}>₪{totalRevenue.toFixed(0)}</div>
        </div>
        <div style={{ background: '#fef2f2', padding: 15, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700 }}>עלויות כולל מע״מ</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#dc2626' }}>₪{totalCost.toFixed(0)}</div>
        </div>
        <div style={{ background: '#f5f3ff', padding: 15, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700 }}>% רווח תזרימי</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#7c3aed' }}>{profitPercent}%</div>
        </div>
        <div style={{ background: '#f8f8f8', padding: 15, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 12, color: '#374151', fontWeight: 700 }}>שווי מלאי (טרם נמכר)</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>₪{unsoldInventory.value.toFixed(0)}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{unsoldInventory.count} מוצרים במלאי</div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 10, textAlign: 'right' }}>מוצר</th>
              <th style={{ padding: 10, textAlign: 'center' }}>מכירות</th>
              <th style={{ padding: 10, textAlign: 'center' }}>הכנסות נטו</th>
              <th style={{ padding: 10, textAlign: 'center' }}>עלויות</th>
              <th style={{ padding: 10, textAlign: 'center' }}>רווח תזרימי</th>
              <th style={{ padding: 10, textAlign: 'center' }}>רווח אחרי מע״מ</th>
              <th style={{ padding: 10, textAlign: 'center' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {profitData.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                  אין נתונים לתקופה שנבחרה
                </td>
              </tr>
            ) : profitData.map((p, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee', opacity: p.noCost ? 0.6 : 1 }}>
                <td style={{ padding: 10 }}>
                  {p.name.slice(0, 40)}
                  {p.noCost && <span style={{ fontSize: 10, color: '#999', marginRight: 4 }}>(אין עלות)</span>}
                </td>
                <td style={{ padding: 10, textAlign: 'center', fontWeight: 700 }}>{p.sold}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>₪{p.revenue.toFixed(0)}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>₪{p.cost.toFixed(0)}</td>
                <td style={{ padding: 10, textAlign: 'center', fontWeight: 700, color: p.profit >= 0 ? '#059669' : '#dc2626' }}>
                  ₪{p.profit.toFixed(0)}
                </td>
                <td style={{ padding: 10, textAlign: 'center', fontWeight: 700, color: p.profitAfterVat >= 0 ? '#16a34a' : '#dc2626' }}>
                  ₪{p.profitAfterVat.toFixed(0)}
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  {p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
