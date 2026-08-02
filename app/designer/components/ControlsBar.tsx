'use client';
// שורת פעולות תחתונה: כמות + שמור / אפס / ביטול

import { KIPA_MIN_QTY, getKipaUnitPrice, type KipaMaterial } from '../../lib/kippot';

export default function ControlsBar({
  quantity, onQuantity, material, saving, onSave, onReset, onCancel,
}: {
  quantity: number;
  onQuantity: (q: number) => void;
  material: KipaMaterial;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  onCancel: () => void;
}) {
  const unit = getKipaUnitPrice(Math.max(quantity, KIPA_MIN_QTY), material);
  const total = unit * Math.max(quantity, KIPA_MIN_QTY);

  const btn: React.CSSProperties = {
    padding: '10px 16px', borderRadius: 10, fontSize: 14, fontWeight: 700,
    cursor: 'pointer', border: '1px solid #d1d5db', background: '#fff', color: '#374151',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>כמות (מינימום {KIPA_MIN_QTY}):</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" style={{ ...btn, padding: '6px 12px' }} onClick={() => onQuantity(Math.max(KIPA_MIN_QTY, quantity - 10))} aria-label="הפחתת כמות">−</button>
          <input
            type="number"
            min={KIPA_MIN_QTY}
            value={quantity}
            onChange={e => onQuantity(Number(e.target.value) || KIPA_MIN_QTY)}
            onBlur={() => onQuantity(Math.max(KIPA_MIN_QTY, quantity))}
            style={{ width: 70, textAlign: 'center', padding: '8px 4px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, fontWeight: 700, color: '#111827', background: '#fff' }}
            aria-label="כמות כיפות"
          />
          <button type="button" style={{ ...btn, padding: '6px 12px' }} onClick={() => onQuantity(quantity + 10)} aria-label="הגדלת כמות">+</button>
        </div>
        <div style={{ fontSize: 14, color: '#111827' }}>
          ₪{unit} ליחידה · <strong>סה״כ ₪{total.toLocaleString()}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          style={{
            ...btn, flex: '1 1 auto', minWidth: 160,
            background: saving ? '#93c5fd' : '#2563eb', borderColor: 'transparent', color: '#fff', fontSize: 15,
          }}
        >
          {saving ? 'שומר עיצוב…' : '🛒 שמור עיצוב והוסף לסל'}
        </button>
        <button type="button" style={btn} onClick={onReset} disabled={saving}>אפס</button>
        <button type="button" style={btn} onClick={onCancel} disabled={saving}>ביטול</button>
      </div>
    </div>
  );
}
