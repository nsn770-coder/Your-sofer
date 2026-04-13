interface Props {
  isBestSeller?: boolean;
  priority?: number;
  badge?: string | null;
}

interface BadgeConfig {
  label: string;
  className: string;
}

function resolveBadge({ isBestSeller, priority, badge }: Props): BadgeConfig | null {
  if (isBestSeller) {
    return {
      label: 'הכי נמכר',
      className: 'bg-orange-100 text-orange-700 border-orange-300',
    };
  }
  if (typeof priority === 'number' && priority >= 80) {
    return {
      label: 'מומלץ',
      className: 'bg-blue-100 text-blue-700 border-blue-300',
    };
  }
  if (badge === 'מהודר') {
    return {
      label: 'מהודר',
      className: 'bg-amber-100 text-amber-700 border-amber-400',
    };
  }
  if (badge === 'מתנה') {
    return {
      label: 'מתאים כמתנה',
      className: 'bg-green-100 text-green-700 border-green-300',
    };
  }
  if (badge === 'בטוח') {
    return {
      label: 'בחירה בטוחה',
      className: 'bg-gray-100 text-gray-600 border-gray-300',
    };
  }
  if (badge === 'מהדרין') {
    return {
      label: 'מהדרין',
      className: 'bg-purple-100 text-purple-700 border-purple-300',
    };
  }
  return null;
}

export default function ProductBadge({ isBestSeller, priority, badge }: Props) {
  const config = resolveBadge({ isBestSeller, priority, badge });
  if (!config) return null;

  return (
    <span
      dir="rtl"
      className={`inline-flex items-center border rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </span>
  );
}
