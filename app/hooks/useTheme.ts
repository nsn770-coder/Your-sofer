'use client';

import { useEffect, useState } from 'react';
import { db } from '@/app/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { DEFAULT_THEME, type ThemeConfig } from '@/app/admin/theme-editor/theme.config';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'theme'), (snap) => {
      if (snap.exists()) {
        setTheme({ ...DEFAULT_THEME, ...snap.data() } as ThemeConfig);
      }
    });
    return () => unsub();
  }, []);

  return theme;
}