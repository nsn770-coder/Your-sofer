'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BAR_MITZVA_STEPS, BAR_MITZVA_TOTAL } from '@/app/constants/barMitzvaSteps';
import { LS_WIZARD_ACTIVE, LS_WIZARD_STEP, LS_WIZARD_CATEGORY } from '@/app/hooks/useWizardSession';

const STORAGE_KEY   = 'bmWizard_v1';
const ACTIVE_STEP_KEY = 'bmWizard_step';

const STEPS = BAR_MITZVA_STEPS;
const TOTAL = BAR_MITZVA_TOTAL;

interface Props {
  variant?: 'homepage' | 'page';
}

export default function BarMitzvaWizard({ variant = 'page' }: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { step } = JSON.parse(raw) as { step: number };
        if (typeof step === 'number' && step >= 0 && step <= TOTAL) {
          setCurrent(step);
        }
      }
    } catch { /* ignore */ }

    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('step') === 'next') {
        localStorage.removeItem(ACTIVE_STEP_KEY);
        const url = new URL(window.location.href);
        url.searchParams.delete('step');
        window.history.replaceState({}, '', url.toString());
      }
    } catch { /* ignore */ }

    setMounted(true);
  }, []);

  function handleSelect(idx: number) {
    const next = idx + 1;
    try {
      // Legacy keys (used by ProductCard redirect signal)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: next }));
      localStorage.setItem(ACTIVE_STEP_KEY, String(idx));
      // Shared session keys — read by useWizardSession + WizardStickyBar
      localStorage.setItem(LS_WIZARD_ACTIVE,   'true');
      localStorage.setItem(LS_WIZARD_STEP,     String(next));
      localStorage.setItem(LS_WIZARD_CATEGORY, STEPS[idx].category);
    } catch { /* ignore */ }
    setCurrent(next);
    router.push(STEPS[idx].href);
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ACTIVE_STEP_KEY);
      localStorage.removeItem(LS_WIZARD_ACTIVE);
      localStorage.removeItem(LS_WIZARD_STEP);
      localStorage.removeItem(LS_WIZARD_CATEGORY);
    } catch { /* ignore */ }
    setCurrent(0);
  }

  if (!mounted) return null;

  const done    = current >= TOTAL;
  const isPage  = variant === 'page';

  const bg           = isPage ? '#fff' : 'transparent';
  const textPrimary  = isPage ? '#0c1a35' : '#fff';
  const textMuted    = isPage ? '#6b7280' : 'rgba(255,252,240,0.6)';
  const accentGold   = '#b8972a';
  const green        = '#22c55e';
  const borderColor  = isPage ? '#e5e7eb' : 'rgba(255,252,240,0.15)';
  const currentBg    = isPage ? '#f0f4ff' : 'rgba(184,151,42,0.15)';
  const currentBorder = isPage ? '#0c1a35' : accentGold;

  const inner = (
    <div dir="rtl" style={{ fontFamily: 'inherit' }}>

      {done ? (
        <div style={{ textAlign: 'center', padding: isPage ? '32px 0' : '16px 0' }}>
          <div style={{ fontSize: isPage ? 40 : 32, marginBottom: 8 }}>🎉</div>
          <p style={{ color: textPrimary, fontWeight: 700, fontSize: isPage ? 20 : 17, marginBottom: 6 }}>
            הגעת לעגלה המוכנה שלך!
          </p>
          <p style={{ color: textMuted, fontSize: 13, marginBottom: 20 }}>
            כל הפריטים נבחרו — עכשיו עבור לעגלה ורכוש
          </p>
          <a
            href="/cart"
            style={{
              display: 'inline-block',
              background: accentGold,
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              borderRadius: 0,
              padding: '12px 28px',
              textDecoration: 'none',
            }}
          >
            לעגלת הקניות ←
          </a>
          <div style={{ marginTop: 16 }}>
            <button
              onClick={reset}
              style={{ background: 'none', border: 'none', color: textMuted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
            >
              התחל מחדש
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: isPage ? 20 : 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: textPrimary, fontWeight: 700, fontSize: isPage ? 18 : 16 }}>מדריך בר מצווה</span>
              <span style={{ color: textMuted, fontSize: 12, fontWeight: 600 }}>{current}/{TOTAL}</span>
            </div>
            <div style={{ height: 5, borderRadius: 0, background: borderColor, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(current / TOTAL) * 100}%`, background: accentGold, borderRadius: 0, transition: 'width 0.4s ease' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {STEPS.map((step, idx) => {
              const isCompleted = idx < current;
              const isActive    = idx === current;

              if (isCompleted) {
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 0, opacity: 0.85 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: green, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span style={{ color: isPage ? '#374151' : 'rgba(255,252,240,0.75)', fontSize: 13, fontWeight: 600 }}>{step.title}</span>
                  </div>
                );
              }

              if (isActive) {
                return (
                  <div key={idx} style={{ background: currentBg, border: `1.5px solid ${currentBorder}`, borderRadius: 0, padding: isPage ? '14px 16px' : '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <div style={{ color: textPrimary, fontWeight: 700, fontSize: isPage ? 16 : 14, marginBottom: 3 }}>{step.title}</div>
                        <div style={{ color: textMuted, fontSize: 12 }}>{step.subtitle}</div>
                      </div>
                      <button
                        onClick={() => handleSelect(idx)}
                        style={{ flexShrink: 0, background: isPage ? '#0c1a35' : accentGold, color: '#fff', border: 'none', borderRadius: 0, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        לבחירה ←
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 0, opacity: 0.4 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${isPage ? '#d1d5db' : 'rgba(255,252,240,0.35)'}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: textMuted, fontSize: 10, fontWeight: 700 }}>{idx + 1}</span>
                  </div>
                  <span style={{ color: textMuted, fontSize: 13, fontWeight: 500 }}>{step.title}</span>
                </div>
              );
            })}
          </div>

          {current > 0 && (
            <div style={{ marginTop: 14, textAlign: 'left' }}>
              <button onClick={reset} style={{ background: 'none', border: 'none', color: textMuted, fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
                איפוס
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (isPage) {
    return (
      <div dir="rtl" style={{ background: bg, borderRadius: 0, border: `1px solid ${borderColor}`, padding: '24px 20px', marginBottom: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        {inner}
      </div>
    );
  }

  return inner;
}
