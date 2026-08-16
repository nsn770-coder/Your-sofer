'use client';

// ─────────────────────────────────────────────────────────────────────────────
// "≈ $34.99" — הערכה במטבע המקומי לצד המחיר בשקלים.
// בעברית לא מרונדר כלום. החיוב עצמו תמיד בשקלים.
// ─────────────────────────────────────────────────────────────────────────────

import { useFx } from '@/app/lib/i18n/useFx';

export default function PriceApprox({
  ils,
  style,
  block = false,
}: {
  ils: number;
  style?: React.CSSProperties;
  /** true = שורה נפרדת מתחת למחיר; false = צמוד באותה שורה */
  block?: boolean;
}) {
  const { approx, enabled } = useFx();
  if (!enabled) return null;
  const text = approx(ils);
  if (!text) return null;

  return (
    <span
      style={{
        display: block ? 'block' : 'inline',
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        ...style,
      }}
      // מוסתר מקוראי מסך: המחיר המחייב הוא זה שבשקלים, וכפילות מבלבלת
      aria-hidden="true"
    >
      ≈ {text}
    </span>
  );
}
