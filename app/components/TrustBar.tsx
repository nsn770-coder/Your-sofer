'use client';
import { usePathname } from 'next/navigation';

const ITEMS = [
  '✓ 500+ משפחות בחרו בנו',
  '✓ תמיכה מלאה בוואטסאפ גם אחרי הרכישה',
  '🔒 הזמנה בטוחה בתקן SSL',
];

export default function TrustBar() {
  const pathname = usePathname();
  if (pathname?.startsWith('/bar-mitzvah')) return null;
  return (
    <div style={{
      width: '100%',
      height: 40,
      background: '#E8E2D6',
      borderBottom: '1.5px solid #C8B99A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      direction: 'rtl',
      boxSizing: 'border-box',
      padding: '0 16px',
    }}>
      {ITEMS.map((item, i) => (
        <div key={item} style={{ display: 'contents' }}>
          {i > 0 && (
            <span
              className={i >= 2 ? 'tb-divider tb-hide-mobile' : 'tb-divider'}
              style={{ display: 'inline-block', width: 1, height: 16, background: '#B8A88A', flexShrink: 0 }}
            />
          )}
          <span
            className={i >= 2 ? 'tb-item tb-hide-mobile' : 'tb-item'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#4A3728', whiteSpace: 'nowrap' }}
          >
            <span style={{ color: '#C5A028', fontWeight: 700 }}>✓</span>
            {item}
          </span>
        </div>
      ))}
      <style jsx global>{`
        @media (max-width: 640px) {
          .tb-hide-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
