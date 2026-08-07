'use client';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { getTier, getNextTierInfo, TIER_CONFIG, TIER_ORDER, formatILS } from '@/app/lib/loyalty';

export default function LoyaltyPage() {
  const { user } = useAuth();
  if (!user) return null;

  const spent  = user.totalSpent    ?? 0;
  const pts    = user.loyaltyPoints ?? 0;
  const tier   = getTier(spent);
  const next   = getNextTierInfo(spent);

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 300, color: 'var(--ys-text)', margin: '0 0 24px', letterSpacing: '-0.01em' }}>
        הנקודות שלי
      </h2>

      {/* ── כרטיס דרגה ראשי ──────────────────────────────────────────── */}
      <div style={{ background: 'var(--ys-dark-surface)', color: '#fff', padding: '28px 28px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>

          {/* בלוק שמאלי — דרגה */}
          <div>
            <div style={{ fontSize: 11, color: tier.color, fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>
              מועדון YOUR SOFER
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 36 }}>{tier.icon}</span>
              <span style={{ fontSize: 32, fontWeight: 700, color: tier.color }}>{tier.label}</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
              הוצאה מצטברת: {formatILS(spent)}
            </div>
          </div>

          {/* בלוק ימני — נקודות + פס */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>נקודות זמינות</div>
              <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1, color: '#fff' }}>
                {pts.toLocaleString('he-IL')}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                כל נקודה שווה ₪1 בקנייה הבאה
              </div>
            </div>

            {/* פס התקדמות לדרגה הבאה */}
            {next.nextTier ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
                  <span>{tier.label}</span>
                  <span>{next.nextTier.label}</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: `${next.progressPercent}%`, height: '100%', background: tier.color, transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                  {next.progressLabel}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: tier.color, fontWeight: 700 }}>
                הדרגה הגבוהה ביותר 🏆
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── הודעת אפס נקודות ─────────────────────────────────────────── */}
      {pts === 0 && (
        <div style={{ background: '#FDF8EE', border: '1px solid #F0E5C0', padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#92700A', lineHeight: 1.6 }}>
          🎁 עדיין לא צברת נקודות — הקנייה הראשונה שלך תתחיל לצבור
        </div>
      )}

      {/* ── טבלת 3 הדרגות ────────────────────────────────────────────── */}
      <div style={{ background: '#fff', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0EDE8' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ys-text)', margin: 0 }}>דרגות חברות</h3>
        </div>

        {/* כותרות טבלה */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '2px solid #F0EDE8' }}>
          {TIER_ORDER.map(t => {
            const td     = TIER_CONFIG[t];
            const active = tier.id === t;
            return (
              <div key={t} style={{
                padding: '16px 20px', textAlign: 'center',
                background: active ? td.colorLight : '#fff',
                borderBottom: active ? `3px solid ${td.color}` : '3px solid transparent',
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{td.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: active ? td.color : '#888' }}>{td.label}</div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                  {td.maxSpent === null
                    ? `${formatILS(td.minSpent)}+`
                    : `${formatILS(td.minSpent)}–${formatILS(td.maxSpent)}`}
                </div>
                {active && (
                  <div style={{ marginTop: 6, fontSize: 10, color: td.color, fontWeight: 700, border: `1px solid ${td.color}`, padding: '2px 6px', display: 'inline-block' }}>
                    הדרגה שלך
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* שורות הטבות */}
        {[
          {
            label: 'צבירת נקודות',
            values: [
              TIER_CONFIG.bronze.accrualRate + '%',
              TIER_CONFIG.silver.accrualRate + '%',
              TIER_CONFIG.gold.accrualRate + '%',
            ],
          },
          {
            label: 'משלוח חינם',
            values: ['—', '—', 'מעל ₪100'],
          },
          {
            label: 'מבצעי מועדון',
            values: ['✓', '✓', '✓'],
          },
          {
            label: 'גישה מוקדמת למבצעים',
            values: ['—', '✓', '✓'],
          },
        ].map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #F8F6F1' }}>
            {TIER_ORDER.map((t, ci) => {
              const active = tier.id === t;
              return (
                <div key={t} style={{
                  padding: '12px 20px', textAlign: 'center', fontSize: 13,
                  background: active ? TIER_CONFIG[t].colorLight : ci % 2 === 0 ? '#fff' : '#FAFAF9',
                  color: active ? '#1a1a1a' : '#666',
                  fontWeight: ci === 0 && ri === 0 ? 600 : 400,
                }}>
                  {ci === 0 && (
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 2, textAlign: 'right' }}>
                      {row.label}
                    </div>
                  )}
                  <div style={{ color: row.values[ci] === '—' ? '#ccc' : active ? TIER_CONFIG[t].color : '#555', fontWeight: row.values[ci] !== '—' ? 600 : 400 }}>
                    {row.values[ci]}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── הסבר קצר ─────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', fontSize: 13, color: '#555', lineHeight: 1.8 }}>
        <div style={{ fontWeight: 700, color: 'var(--ys-text)', marginBottom: 8 }}>איך עובד המועדון?</div>
        <ul style={{ margin: 0, paddingRight: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>על כל קנייה תצבור נקודות לפי אחוז צבירת הדרגה שלך.</li>
          <li>ניתן לממש נקודות בקנייה הבאה (נקודה = ₪1).</li>
          <li>הדרגה נקבעת לפי <strong>סך ההוצאה המצטברת</strong> — הדרגה לעולם לא יורדת.</li>
          <li>הדרגה מתעדכנת אוטומטית לאחר כל קנייה.</li>
        </ul>
      </div>
    </div>
  );
}
