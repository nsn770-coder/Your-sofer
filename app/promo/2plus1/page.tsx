import type { Metadata } from 'next';
import TwoPlusOneClient from './TwoPlusOneClient';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'מבצע 2+1 | Your Sofer',
  description: 'קנו 3, שלמו על 2! מבחר מוצרי יודאיקה ופמוטים במבצע מיוחד. המוצר הזול ביותר — חינם.',
  alternates: { canonical: `${BASE_URL}/promo/2plus1` },
  openGraph: {
    type: 'website', locale: 'he_IL', url: `${BASE_URL}/promo/2plus1`, siteName: 'Your Sofer',
    title: 'מבצע 2+1 | Your Sofer',
    description: 'קנו 3, שלמו על 2! המוצר הזול ביותר חינם.',
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Your Sofer 2+1' }],
  },
};

export default function TwoPlusOnePage() {
  return <TwoPlusOneClient />;
}
