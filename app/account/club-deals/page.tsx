'use client';
import { useAuth } from '@/app/contexts/AuthContext';
import { getTier, TIER_CONFIG, TIER_ORDER } from '@/app/lib/loyalty';

export default function ClubDealsPage() {
  const { user } = useAuth();
  const spent     = user?.totalSpent ?? 0;
  const currentTier = getTier(spent);

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 300, color: 'var(--ys-text)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
        מבצעי מועדון
      </h2>
      <p style={{ fontSize: 14, color: '#9CA3AF', margin: '0 0 24px', fontWeight: 300 }}>
        הטבות בלעדיות לחברי מועדון YOUR SOFER לפי דרגת חברות
      </p>

      {/* כרטיסי דרגות */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {TIER_ORDER.map(t => {
          const td     = TIER_CONFIG[t];
          const active = currentTier.id === t;
          const locked = TIER_ORDER.indexOf(t) > TIER_ORDER.indexOf(currentTier.id);

          return (
            <div key={t} style={{
              background: '#fff',
              boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
              borderRight: `4px solid ${active ? td.color : locked ? '#E7E2D8' : td.color + '55'}`,
              overflow: 'hidden',
              opacity: locked ? 0.6 : 1,
            }}>
              {/* כותרת כרטיס */}
              <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #F0EDE8', background: active ? td.colorLight : '#fff' }}>
                <span style={{ fontSize: 26 }}>{td.icon}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: active ? td.color : '#555' }}>{td.label}</span>
                    {active && (
                      <span style={{ fontSize: 10, color: '#fff', background: td.color, padding: '2px 7px', fontWeight: 700 }}>
                        הדרגה שלך
                      </span>
                    )}
                    {locked && (
                      <span style={{ fontSize: 10, color: '#888', border: '1px solid #ddd', padding: '2px 7px' }}>
                        🔒 נעולה
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                    אחוז צבירה: <strong style={{ color: td.color }}>{td.accrualRate}%</strong>
                  </div>
                </div>
              </div>

              {/* רשימת הטבות */}
              <div style={{ padding: '14px 20px' }}>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {td.benefits.map((benefit, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: locked ? '#aaa' : '#444' }}>
                      <span style={{ color: locked ? '#ddd' : td.color, flexShrink: 0, fontWeight: 700 }}>✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* הערת שלב */}
      <div style={{ marginTop: 20, padding: '14px 18px', background: '#F8F6F1', fontSize: 12, color: '#888', lineHeight: 1.6 }}>
        המימוש וההנחות הפעילות ייכנסו לתוקף עם השקת מנגנון הנקודות המלא — בקרוב.
      </div>
    </div>
  );
}
