import type { Metadata } from 'next';
import SaleClient from './SaleClient';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'מבצעים 🏷️ | Your Sofer',
  description: 'כל המוצרים שבמבצע — הנחות על יודאיקה, כיפות, מזוזות ועוד. מחירים מוזלים לזמן מוגבל.',
  alternates: { canonical: `${BASE_URL}/sale` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/sale`,
    siteName: 'Your Sofer',
    title: 'מבצעים | Your Sofer',
    description: 'כל המוצרים שבמבצע — הנחות על יודאיקה, כיפות, מזוזות ועוד.',
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Your Sofer מבצעים' }],
  },
};

export default function SalePage() {
  return <SaleClient />;
}
