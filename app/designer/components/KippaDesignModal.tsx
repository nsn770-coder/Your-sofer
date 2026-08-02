'use client';
// Modal מעל הדף — עוטף את העורך. לא מבצע ניווט.

import { useEffect } from 'react';
import KippaDesigner from './KippaDesigner';
import type { KippaDesign } from '../utils/types';
import type { KipaMaterial } from '../../lib/kippot';

export default function KippaDesignModal({
  open,
  material,
  productImageUrl,
  initialDesign,
  onSave,
  onClose,
}: {
  open: boolean;
  material: KipaMaterial;
  /** תמונת המוצר שנבחר — משמשת כרקע העיצוב */
  productImageUrl?: string;
  initialDesign?: KippaDesign | null;
  onSave: (design: KippaDesign) => Promise<void> | void;
  onClose: () => void;
}) {
  // נעילת גלילת הרקע כשה-Modal פתוח
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="עורך כיפה מותאמת אישית"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 12px', overflowY: 'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        dir="rtl"
        style={{
          background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520,
          padding: '18px 18px 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          margin: 'auto 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>✨ עיצוב כיפה מותאמת אישית</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירת העורך"
            style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
        <KippaDesigner
          material={material}
          productImageUrl={productImageUrl}
          initialDesign={initialDesign}
          onSave={onSave}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
