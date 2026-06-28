'use client';
import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';

const QUICK_LINKS = [
  { href: '/account/orders',    icon: '📦', title: 'ההזמנות שלי',        desc: 'עקוב אחרי הזמנות פעילות ועיין בהיסטוריה' },
  { href: '/account/profile',   icon: '👤', title: 'הפרטים שלי',         desc: 'ערוך שם, טלפון, תאריך לידה ופרטי חשבון' },
  { href: '/account/addresses', icon: '📍', title: 'הכתובות שלי',        desc: 'נהל כתובות משלוח וחיוב שמורות' },
  { href: '/account/loyalty',   icon: '⭐', title: 'הנקודות שלי',        desc: 'צבור נקודות וקבל הטבות בלעדיות', soon: true },
  { href: '/account/club-deals',icon: '🏷️', title: 'מבצעי מועדון',       desc: 'מבצעים בלעדיים לחברי מועדון', soon: true },
  { href: '/account/messages',  icon: '🔔', title: 'ההודעות שלי',        desc: 'עדכונים ופניות שירות', soon: true },
];

export default function AccountPage() {
  const { user } = useAuth();
  if (!user) return null;

  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.displayName || 'לקוח';

  return (
    <div>
      {/* כותרת */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 300, color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em' }}>
          שלום, {displayName} 👋
        </h1>
        <p style={{ fontSize: 14, color: '#9CA3AF', marginTop: 6, fontWeight: 300 }}>
          ברוך הבא לחשבונך
        </p>
      </div>

      {/* כרטיס נקודות — placeholder עד שלב 3 */}
      <div style={{ background: '#1a1a1a', color: '#fff', padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: '#C5A028', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>מועדון YOUR SOFER</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>0</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>נקודות · דרגת ברונזה</div>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>התקדמות לדרגת כסף</div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <div style={{ width: '0%', height: '100%', background: '#C5A028' }} />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>0 / 500 נקודות</div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px' }}>
          🔜 מערכת נקודות בקרוב
        </div>
      </div>

      {/* רשת קישורים מהירים */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {QUICK_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.soon ? '#' : link.href}
            onClick={e => link.soon && e.preventDefault()}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div style={{
              background: '#fff', padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
              borderRight: '3px solid transparent', transition: 'all 0.15s',
              opacity: link.soon ? 0.65 : 1,
              cursor: link.soon ? 'default' : 'pointer',
            }}
            onMouseEnter={e => { if (!link.soon) (e.currentTarget as HTMLDivElement).style.borderRightColor = '#C5A028'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderRightColor = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{link.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>{link.title}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 300, lineHeight: 1.5 }}>{link.desc}</div>
                </div>
                {link.soon && (
                  <span style={{ fontSize: 10, color: '#C5A028', border: '1px solid #C5A028', padding: '2px 6px', whiteSpace: 'nowrap', marginTop: 2 }}>בקרוב</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
