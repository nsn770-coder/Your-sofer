import type { Metadata } from 'next';
import KashrutClient from './KashrutClient';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'כשרות המוצרים | YourSofer',
  description: 'כל מוצר סת״מ ב-Your Sofer עובר בדיקת מחשב ופיקוח מגיה מוסמך לפני המשלוח. תעודת כשרות חתומה לכל יחידה. כשר לכתחילה על פי כל השיטות.',
  alternates: { canonical: `${BASE_URL}/kashrut` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/kashrut`,
    siteName: 'Your Sofer',
    title: 'כשרות המוצרים | YourSofer',
    description: 'בדיקת מחשב, פיקוח מגיה מוסמך ותעודת כשרות לכל מוצר סת״מ.',
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Your Sofer' }],
  },
};

export default function KashrutPage() {
  return <KashrutClient />;
}
