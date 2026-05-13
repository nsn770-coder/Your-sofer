'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const ITEMS = [
  '✓ 500+ משפחות בחרו בנו',
  '✓ תמיכה מלאה בוואטסאפ גם אחרי הרכישה',
  '🔒 הזמנה בטוחה בתקן SSL',
];

export default function TrustBar() {
  const pathname = usePathname();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex(i => (i + 1) % ITEMS.length);
        setVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
      direction: 'rtl',
      boxSizing: 'border-box',
      padding: '0 16px',
    }}>
      {/* Mobile: single rotating message with fade */}
      <span
        className="lg:hidden"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
          fontSize: 13,
          fontWeight: 500,
          color: '#4A3728',
          whiteSpace: 'nowrap',
        }}
      >
        {ITEMS[currentIndex]}
      </span>

      {/* Desktop: all messages with separators */}
      <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 20 }}>
        {ITEMS.map((item, i) => (
          <div key={item} style={{ display: 'contents' }}>
            {i > 0 && (
              <span style={{ display: 'inline-block', width: 1, height: 16, background: '#B8A88A', flexShrink: 0 }} />
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 600, color: '#4A3728', whiteSpace: 'nowrap' }}>
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
