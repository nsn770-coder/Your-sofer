'use client';
import { type AccountEra, ERA_OPTIONS, BUSINESS_ERA_START } from '@/app/lib/accountEra';

/**
 * Reusable toggle between business-era / amuta-era / all financial views.
 * Default era everywhere should be 'business' — the fresh count that started 10/07/2026.
 */
export default function EraToggle({ era, setEra }: { era: AccountEra; setEra: (e: AccountEra) => void }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '12px 16px', marginBottom: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexWrap: 'wrap',
      gap: 10, alignItems: 'center',
    }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: '#1E3A8A' }}>חשבון:</span>
      {ERA_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => setEra(opt.value)}
          style={{
            background: era === opt.value ? (opt.value === 'business' ? '#166534' : '#1E3A8A') : '#f3f4f6',
            color: era === opt.value ? '#fff' : '#444',
            border: 'none', borderRadius: 999, padding: '7px 16px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {opt.label}
        </button>
      ))}
      <span style={{ fontSize: 11, color: '#9ca3af', marginRight: 'auto' }}>
        מעבר לחשבון העסק: {BUSINESS_ERA_START.toLocaleDateString('he-IL')}
      </span>
    </div>
  );
}
