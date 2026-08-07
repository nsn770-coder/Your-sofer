'use client';
import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';
import { getTier, getNextTierInfo } from '@/app/lib/loyalty';

const QUICK_LINKS = [
  { href: '/account/orders',    icon: '📦', title: 'ההזמנות שלי',        desc: 'עקוב אחרי הזמנות פעילות ועיין בהיסטוריה' },
  { href: '/account/profile',   icon: '👤', title: 'הפרטים שלי',         desc: 'ערוך שם, טלפון, תאריך לידה ופרטי חשבון' },
  { href: '/account/addresses', icon: '📍', title: 'הכתובות שלי',        desc: 'נהל כתובות משלוח וחיוב שמורות' },
  { href: '/account/loyalty',   icon: '⭐', title: 'הנקודות שלי',        desc: 'דרגת חברות, נקודות וההטבות שלך' },
  { href: '/account/club-deals',icon: '🏷️', title: 'מבצעי מועדון',       desc: 'הטבות ומבצעים לפי דרגת חברות' },
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
        <h1 style={{ fontSize: 26, fontWeight: 300, color: 'var(--ys-text)', margin: 0, letterSpacing: '-0.01em' }}>
          שלום, {displayName} 👋
        </h1>
        <p style={{ fontSize: 14, color: '#9CA3AF', marginTop: 6, fontWeight: 300 }}>
          ברוך הבא לחשבונך
        </p>
      </div>

      {/* כרטיס מועדון — מחובר ל-totalSpent ו-loyaltyPoints אמיתיים */}
      {(() => {
        const spent = user.totalSpent ?? 0;
        const pts   = user.loyaltyPoints ?? 0;
        const tier  = getTier(spent);
        const next  = getNextTierInfo(spent);
        return (
          <Link href="/account/loyalty" style={{ textDecoration: 'none', display: 'block', marginBottom: 28 }}>
            <div style={{ background: 'var(--ys-dark-surface)', color: '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', cursor: 'pointer' }}>
              {/* שמאל — דרגה ונקודות */}
              <div style={{ minWidth: 140 }}>
                <div style={{ fontSize: 11, color: tier.color, fontWeight: 700, letterSpacing: 1, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>{tier.icon}</span> מועדון YOUR SOFER · {tier.label}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{pts.toLocaleString('he-IL')}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>נקודות זמינות</div>
              </div>
              {/* ימין — פס התקדמות */}
              <div style={{ flex: 1, minWidth: 180 }}>
                {next.nextTier ? (
                  <>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{next.progressLabel}</div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                      <div style={{ width: `${next.progressPercent}%`, height: '100%', background: tier.color, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 5 }}>
                      ₪{spent.toLocaleString('he-IL')} מתוך ₪{next.nextTier.minSpent.toLocaleString('he-IL')}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: tier.color, fontWeight: 700 }}>הדרגה הגבוהה ביותר 🏆</div>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>← לדשבורד המועדון</div>
            </div>
          </Link>
        );
      })()}

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
            onMouseEnter={e => { if (!link.soon) (e.currentTarget as HTMLDivElement).style.borderRightColor = 'var(--ys-accent)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderRightColor = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{link.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ys-text)', marginBottom: 4 }}>{link.title}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 300, lineHeight: 1.5 }}>{link.desc}</div>
                </div>
                {link.soon && (
                  <span style={{ fontSize: 10, color: 'var(--ys-accent)', border: '1px solid var(--ys-accent)', padding: '2px 6px', whiteSpace: 'nowrap', marginTop: 2 }}>בקרוב</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
