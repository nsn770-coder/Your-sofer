import type { Metadata } from 'next';
import JoinClient from './JoinClient';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'הצטרף כסופר או שליח | YourSofer',
  description: 'הצטרף לפלטפורמת Your Sofer — סופרי סת״מ מוסמכים מקבלים פרופיל, הזמנות ודשבורד ניהול. רבני קהילה מקבלים 10% מכל הזמנה כתרומה לעמותה שלהם.',
  alternates: { canonical: `${BASE_URL}/join` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/join`,
    siteName: 'Your Sofer',
    title: 'הצטרף כסופר או שליח | YourSofer',
    description: 'סופרי סת״מ — פרופיל, הזמנות ודשבורד. רבני קהילה — 10% מכל הזמנה לעמותה.',
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Your Sofer' }],
  },
};

export default function JoinPage() {
  return <JoinClient />;
}
