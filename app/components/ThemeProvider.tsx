'use client';

import { useTheme } from '@/app/hooks/useTheme';
import { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();

  useEffect(() => {
    const root = document.documentElement;

    const btnCheckoutRadius =
      theme.btnCheckoutShape === 'pill' ? '9999px' :
      theme.btnCheckoutShape === 'square' ? '0px' :
      `${theme.btnRadius}px`;

    const shadowMap: Record<string, string> = {
      none: 'none',
      sm: '0 1px 3px rgba(0,0,0,0.1)',
      md: '0 4px 12px rgba(0,0,0,0.12)',
      lg: '0 8px 24px rgba(0,0,0,0.15)',
    };

    root.style.setProperty('--color-primary', theme.colorPrimary);
    root.style.setProperty('--color-secondary', theme.colorSecondary);
    root.style.setProperty('--color-background', theme.colorBackground);
    root.style.setProperty('--color-surface', theme.colorSurface);
    root.style.setProperty('--color-text', theme.colorText);
    root.style.setProperty('--color-text-muted', theme.colorTextMuted);
    root.style.setProperty('--btn-add-to-cart-bg', theme.btnAddToCartBg);
    root.style.setProperty('--btn-add-to-cart-text', theme.btnAddToCartText);
    root.style.setProperty('--btn-checkout-bg', theme.btnCheckoutBg);
    root.style.setProperty('--btn-checkout-text', theme.btnCheckoutText);
    root.style.setProperty('--btn-radius', `${theme.btnRadius}px`);
    root.style.setProperty('--btn-checkout-radius', btnCheckoutRadius);
    root.style.setProperty('--card-radius', `${theme.cardRadius}px`);
    root.style.setProperty('--card-shadow', shadowMap[theme.cardShadow]);
    root.style.setProperty('--card-padding', `${theme.cardPadding}px`);
    root.style.setProperty('--card-gap', `${theme.cardGap}px`);
    root.style.setProperty('--card-img-height', `${theme.cardImgHeight}px`);
    root.style.setProperty('--section-padding', `${theme.sectionPadding}px`);
    root.style.setProperty('--container-max-width', `${theme.containerMaxWidth}px`);
    root.style.setProperty('--font-size-base', `${theme.fontSizeBase}px`);
  }, [theme]);

  return <>{children}</>;
}