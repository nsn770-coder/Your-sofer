'use client';
import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { Order } from '@/app/lib/types';

interface PC {
  productType: string;
  side: string;
  color?: string;
  uploadedImageUrl: string;
  bgRemoved: boolean;
  originalImageUrl: string;
  imageX?: number;
  imageY?: number;
  imageScale?: number;
  imageRotation?: number;
  logoWidthPct?: number;
  mockupUrl?: string;
  designText?: string;
  addSide?: boolean;
  addSideText?: string;
  kippahLabel?: string;
  printType?: string;
}

interface PrintRow {
  orderId: string;
  orderNumber: string;
  customerName: string;
  phone?: string;
  itemIdx: number;
  itemName: string;
  quantity: number;
  pc: PC;
  savedPrinted: boolean;
}

interface PrintsTabProps {
  orders: Order[];
}

export default function PrintsTab({ orders }: PrintsTabProps) {
  const [markedPrinted, setMarkedPrinted] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);

  const rows: PrintRow[] = orders.flatMap(order => {
    const items: any[] = (order as any).items ?? [];
    const printStatuses: Record<string, string> = (order as any).printStatuses ?? {};
    return items
      .map((item: any, idx: number) => ({ item, idx }))
      .filter(({ item }) => item.printCustomization)
      .map(({ item, idx }) => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        phone: order.phone,
        itemIdx: idx,
        itemName: item.name ?? item.productName ?? '—',
        quantity: item.quantity ?? 1,
        pc: item.printCustomization as PC,
        savedPrinted: printStatuses[String(idx)] === 'printed',
      }));
  });

  function isPrinted(row: PrintRow): boolean {
    return row.savedPrinted || markedPrinted.has(`${row.orderId}__${row.itemIdx}`);
  }

  const pendingCount = rows.filter(r => !isPrinted(r)).length;

  async function markPrinted(row: PrintRow) {
    const key = `${row.orderId}__${row.itemIdx}`;
    setSaving(key);
    try {
      await updateDoc(doc(db, 'orders', row.orderId), {
        [`printStatuses.${row.itemIdx}`]: 'printed',
      });
      setMarkedPrinted(prev => new Set(prev).add(key));
    } catch (e) {
      console.error('[PrintsTab] markPrinted failed', e);
      alert('שגיאה בשמירה');
    } finally {
      setSaving(null);
    }
  }

  function openForPrint(row: PrintRow) {
    const url = row.pc.mockupUrl || row.pc.uploadedImageUrl;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div dir="rtl">
      <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 15 }}>🖨️ הדפסות</h2>

      <div style={{
        background: pendingCount > 0 ? '#fee2e2' : '#f0fdf4',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 700, color: pendingCount > 0 ? '#dc2626' : '#16a34a' }}>
          {pendingCount} ממתינות להדפסה
        </span>
        {rows.length !== pendingCount && (
          <span style={{ fontSize: 12, color: '#6b7280' }}>· {rows.length} סה&quot;כ</span>
        )}
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
          אין הדפסות
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rows.map(row => {
            const printed = isPrinted(row);
            const rowKey = `${row.orderId}__${row.itemIdx}`;
            const isSaving = saving === rowKey;

            return (
              <div key={rowKey} style={{
                border: `1px solid ${printed ? '#86efac' : '#e5e7eb'}`,
                borderRadius: 8,
                padding: 16,
                background: printed ? '#f0fdf4' : '#fff',
                opacity: printed ? 0.75 : 1,
                transition: 'opacity 0.2s, border-color 0.2s',
              }}>

                {/* ── Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1E3A8A' }}>
                      {row.orderNumber}
                    </span>
                    <span style={{ fontSize: 13 }}>{row.customerName}</span>
                    {row.phone && (
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{row.phone}</span>
                    )}
                    <span style={{
                      fontSize: 12, background: '#f3f4f6',
                      padding: '2px 8px', borderRadius: 4, color: '#374151',
                    }}>
                      {row.itemName} × {row.quantity}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    padding: '3px 10px', borderRadius: 4,
                    background: printed ? '#dcfce7' : '#fef3c7',
                    color: printed ? '#15803d' : '#92400e',
                  }}>
                    {printed ? '✓ הודפס' : '⏳ ממתין'}
                  </span>
                </div>

                {/* ── Spec chips ── */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  {([
                    row.pc.kippahLabel || row.pc.productType,
                    `צד: ${row.pc.side}`,
                    row.pc.color ? `צבע: ${row.pc.color}` : null,
                    row.pc.bgRemoved ? 'ללא רקע ✓' : null,
                    row.pc.addSide ? 'צד נוסף ✓' : null,
                  ] as (string | null)[]).filter(Boolean).map((tag, i) => (
                    <span key={i} style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 4,
                      background: '#eff6ff', color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* ── Design text ── */}
                {(row.pc.designText || row.pc.addSideText) && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>
                    {row.pc.designText && <div>✏️ <strong>טקסט:</strong> {row.pc.designText}</div>}
                    {row.pc.addSideText && <div>↕️ <strong>צד נוסף:</strong> {row.pc.addSideText}</div>}
                  </div>
                )}

                {/* ── Images + position data ── */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  {row.pc.mockupUrl && (
                    <div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>מוקאפ</div>
                      <img
                        src={row.pc.mockupUrl}
                        alt="mockup"
                        style={{
                          width: 140, height: 140,
                          objectFit: 'contain',
                          border: '1px solid #e5e7eb',
                          borderRadius: 6,
                          background: '#f9fafb',
                          display: 'block',
                        }}
                      />
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>תמונה מקורית</div>
                    <img
                      src={row.pc.uploadedImageUrl}
                      alt="uploaded"
                      style={{
                        width: 100, height: 100,
                        objectFit: 'contain',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        background: '#f9fafb',
                        display: 'block',
                      }}
                    />
                  </div>

                  {(row.pc.imageScale != null || row.pc.imageX != null || row.pc.logoWidthPct != null) && (
                    <div style={{ fontSize: 11, color: '#555', lineHeight: 1.8 }}>
                      {row.pc.imageScale != null && (
                        <div>scale: {row.pc.imageScale.toFixed(2)}</div>
                      )}
                      {row.pc.imageX != null && (
                        <div>X: {row.pc.imageX.toFixed(2)}</div>
                      )}
                      {row.pc.imageY != null && (
                        <div>Y: {row.pc.imageY.toFixed(2)}</div>
                      )}
                      {row.pc.imageRotation != null && row.pc.imageRotation !== 0 && (
                        <div>סיבוב: {row.pc.imageRotation}°</div>
                      )}
                      {row.pc.logoWidthPct != null && (
                        <div>רוחב: {row.pc.logoWidthPct}%</div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Actions ── */}
                {printed ? (
                  <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>
                    ✓ הדפסה הושלמה
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => openForPrint(row)}
                      style={{
                        background: '#1E3A8A', color: '#fff',
                        border: 'none', borderRadius: 6,
                        padding: '7px 16px', fontSize: 13,
                        fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      🖨️ הדפס
                    </button>
                    <button
                      onClick={() => markPrinted(row)}
                      disabled={isSaving}
                      style={{
                        background: '#fff', color: '#16a34a',
                        border: '1.5px solid #86efac', borderRadius: 6,
                        padding: '7px 16px', fontSize: 13,
                        fontWeight: 700,
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        opacity: isSaving ? 0.6 : 1,
                      }}
                    >
                      {isSaving ? '...' : '✓ סמן כהודפס'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
