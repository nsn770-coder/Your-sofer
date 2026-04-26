'use client';

import { useState, useCallback } from 'react';

export const LS_WIZARD_ACTIVE   = 'wizardActive';
export const LS_WIZARD_STEP     = 'wizardStep';
export const LS_WIZARD_CATEGORY = 'wizardCategory';

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

export interface WizardSession {
  wizardActive:      boolean;
  wizardStep:        number;
  wizardCategory:    string | null;
  setWizardActive:   (v: boolean)       => void;
  setWizardStep:     (v: number)        => void;
  setWizardCategory: (v: string | null) => void;
  clearSession:      ()                 => void;
}

export function useWizardSession(): WizardSession {
  const [active,   setActive]   = useState<boolean>      (() => safeRead(LS_WIZARD_ACTIVE,   false));
  const [step,     setStep]     = useState<number>        (() => safeRead(LS_WIZARD_STEP,     0));
  const [category, setCategory] = useState<string | null>(() => safeRead(LS_WIZARD_CATEGORY, null));

  const setWizardActive = useCallback((v: boolean) => {
    try { localStorage.setItem(LS_WIZARD_ACTIVE, JSON.stringify(v)); } catch {}
    setActive(v);
  }, []);

  const setWizardStep = useCallback((v: number) => {
    try { localStorage.setItem(LS_WIZARD_STEP, String(v)); } catch {}
    setStep(v);
  }, []);

  const setWizardCategory = useCallback((v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(LS_WIZARD_CATEGORY);
      else localStorage.setItem(LS_WIZARD_CATEGORY, v);
    } catch {}
    setCategory(v);
  }, []);

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(LS_WIZARD_ACTIVE);
      localStorage.removeItem(LS_WIZARD_STEP);
      localStorage.removeItem(LS_WIZARD_CATEGORY);
    } catch {}
    setActive(false);
    setStep(0);
    setCategory(null);
  }, []);

  return {
    wizardActive:   active,
    wizardStep:     step,
    wizardCategory: category,
    setWizardActive,
    setWizardStep,
    setWizardCategory,
    clearSession,
  };
}
