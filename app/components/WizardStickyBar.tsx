'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BAR_MITZVA_STEPS, BAR_MITZVA_TOTAL } from '@/app/constants/barMitzvaSteps';
import { LS_WIZARD_ACTIVE, LS_WIZARD_STEP } from '@/app/hooks/useWizardSession';

export default function WizardStickyBar() {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [step,   setStep]   = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    function sync() {
      try {
        setActive(localStorage.getItem(LS_WIZARD_ACTIVE) === 'true');
        setStep(parseInt(localStorage.getItem(LS_WIZARD_STEP) ?? '0', 10) || 0);
      } catch {}
    }
    sync();
    setMounted(true);
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  if (!mounted || !active || step <= 0 || step >= BAR_MITZVA_TOTAL) return null;

  const nextStep = BAR_MITZVA_STEPS[step];
  if (!nextStep) return null;

  const pct = (step / BAR_MITZVA_TOTAL) * 100;
  const circumference = 2 * Math.PI * 18;

  return (
    <div
      dir="rtl"
      style={{
        background: '#1E3A8A',
        borderRadius: 12,
        border: '2px solid #C5A028',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        boxShadow: '0 4px 20px rgba(30,58,138,0.18)',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <div style={{ flexShrink: 0, position: 'relative', width: 44, height: 44 }}>
          <svg width="44" height="44" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
            <circle
              cx="22" cy="22" r="18" fill="none"
              stroke="#C5A028" strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            />
          </svg>
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#C5A028',
          }}>
            {step}/{BAR_MITZVA_TOTAL}
          </span>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: 2 }}>
            מדריך בר מצווה
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            הצעד הבא: {nextStep.title}
          </div>
        </div>
      </div>

      <button
        onClick={() => router.push('/?wizard=bar-mitzva#bar-mitzva-wizard')}
        style={{
          flexShrink: 0,
          background: '#C5A028',
          color: '#1E3A8A',
          border: 'none',
          borderRadius: 8,
          padding: '10px 18px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        חזור למדריך ←
      </button>
    </div>
  );
}
