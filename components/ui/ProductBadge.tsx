'use client';
import { useT } from '@/app/lib/i18n/useT';
import type { DictKey } from '@/app/lib/i18n/dictionaries';

interface Props {
  isBestSeller?: boolean;
  priority?: number;
  badge?: string | null;
  bundlePromo?: string | null;
}

interface BadgeConfig {
  /** מפתח במילון — התרגום נעשה בזמן הרינדור, לא כאן */
  labelKey: DictKey;
  className: string;
}

/** מיפוי מבצע-מארז ← מספר הפריטים (התבנית עצמה מתורגמת: badge.forPrice) */
const BUNDLE_COUNTS: Record<string, string> = {
  '3for100': '3', '4for100': '4', '5for100': '5', '12for100': '12',
};

function resolveBadge({ isBestSeller, priority, badge }: Omit<Props, 'bundlePromo'>): BadgeConfig | null {
  if (isBestSeller) {
    return {
      labelKey: 'badge.bestSeller',
      className: 'bg-[#FEFBF7] text-[var(--ys-accent)] border-[var(--ys-accent)]',
    };
  }
  if (typeof priority === 'number' && priority >= 80) {
    return {
      labelKey: 'badge.recommended',
      className: 'bg-[var(--ys-accent)] text-[#FEFBF7] border-[var(--ys-accent)]',
    };
  }
  if (badge === 'מהודר') {
    return {
      labelKey: 'badge.mehudar',
      className: 'bg-[#FEFBF7] text-[var(--ys-accent)] border-[var(--ys-accent)]',
    };
  }
  if (badge === 'מתנה') {
    return {
      labelKey: 'badge.giftable',
      className: 'bg-[#FEFBF7] text-[var(--ys-accent)] border-[var(--ys-accent)]',
    };
  }
  if (badge === 'בטוח') {
    return {
      labelKey: 'badge.safeChoice',
      className: 'bg-white text-gray-500 border-gray-300',
    };
  }
  if (badge === 'מהדרין') {
    return {
      labelKey: 'badge.mehadrin',
      className: 'bg-[var(--ys-accent)] text-[#FEFBF7] border-[var(--ys-accent)]',
    };
  }
  return null;
}

export default function ProductBadge({ isBestSeller, priority, badge, bundlePromo }: Props) {
  const { t, dir } = useT();
  const config = resolveBadge({ isBestSeller, priority, badge });
  const bundleCount = bundlePromo ? BUNDLE_COUNTS[bundlePromo] : null;
  const bundleLabel = bundleCount ? t('badge.forPrice').replace('{n}', bundleCount) : null;

  if (!config && !bundleLabel) return null;

  return (
    <span dir={dir} className={`inline-flex flex-col gap-1 ${dir === 'rtl' ? 'items-end' : 'items-start'}`}>
      {config && (
        <span className={`inline-flex items-center border rounded-none px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${config.className}`}>
          {t(config.labelKey)}
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
