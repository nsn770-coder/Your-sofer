import type { Metadata } from 'next';
import JoinClient from './JoinClient';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'הצטרפות יוצרים ושותפים | Your Sofer - אתר היודאיקה של ישראל',
  description: 'הצטרפו ל-Your Sofer — אתר היודאיקה הגדול בישראל. יוצרים, סופרים ושליחים מקבלים פרופיל, הזמנות ודשבורד ניהול. רבני קהילה מקבלים 10% מכל הזמנה כתרומה לעמותה שלהם.',
  // לא לאינדוקס — עמוד תפעולי, לא רלוונטי לתוצאות חיפוש
  robots: { index: false, follow: true },
  alternates: { canonical: `${BASE_URL}/join` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/join`,
    siteName: 'Your Sofer',
    title: 'הצטרפות יוצרים ושותפים | Your Sofer',
    description: 'יוצרים, סופרים ושליחים — פרופיל, הזמנות ודשבורד. רבני קהילה — 10% מכל הזמנה לעמותה.',
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Your Sofer' }],
  },
};

export default function JoinPage() {
  return <JoinClient />;
}
