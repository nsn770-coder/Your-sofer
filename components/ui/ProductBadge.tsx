interface Props {
  isBestSeller?: boolean;
  priority?: number;
  badge?: string | null;
  bundlePromo?: string | null;
}

interface BadgeConfig {
  label: string;
  className: string;
}

const BUNDLE_LABELS: Record<string, string> = {
  '3for100':  '3 ב-₪100',
  '4for100':  '4 ב-₪100',
  '5for100':  '5 ב-₪100',
  '12for100': '12 ב-₪100',
};

function resolveBadge({ isBestSeller, priority, badge }: Omit<Props, 'bundlePromo'>): BadgeConfig | null {
  if (isBestSeller) {
    return {
      label: 'הכי נמכר',
      className: 'bg-[#FEFBF7] text-[var(--ys-accent)] border-[var(--ys-accent)]',
    };
  }
  if (typeof priority === 'number' && priority >= 80) {
    return {
      label: 'מומלץ',
      className: 'bg-[var(--ys-accent)] text-[#FEFBF7] border-[var(--ys-accent)]',
    };
  }
  if (badge === 'מהודר') {
    return {
      label: 'מהודר',
      className: 'bg-[#FEFBF7] text-[var(--ys-accent)] border-[var(--ys-accent)]',
    };
  }
  if (badge === 'מתנה') {
    return {
      label: 'מתאים כמתנה',
      className: 'bg-[#FEFBF7] text-[var(--ys-accent)] border-[var(--ys-accent)]',
    };
  }
  if (badge === 'בטוח') {
    return {
      label: 'בחירה בטוחה',
      className: 'bg-white text-gray-500 border-gray-300',
    };
  }
  if (badge === 'מהדרין') {
    return {
      label: 'מהדרין',
      className: 'bg-[var(--ys-accent)] text-[#FEFBF7] border-[var(--ys-accent)]',
    };
  }
  return null;
}

export default function ProductBadge({ isBestSeller, priority, badge, bundlePromo }: Props) {
  const config = resolveBadge({ isBestSeller, priority, badge });
  const bundleLabel = bundlePromo ? BUNDLE_LABELS[bundlePromo] : null;

  if (!config && !bundleLabel) return null;

  return (
    <span dir="rtl" className="inline-flex flex-col items-end gap-1">
      {config && (
        <span className={`inline-flex items-center border rounded-none px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${config.className}`}>
          {config.label}
        </span>
      )}
      {bundleLabel && (
        <span
          className="inline-flex items-center whitespace-nowrap"
          style={{ background: 'var(--ys-accent)', color: '#FEFBF7', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 0, letterSpacing: '0.01em' }}
        >
          ✦ {bundleLabel}
        </span>
      )}
    </span>
  );
}
