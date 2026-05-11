import type { Metadata } from 'next';
import CollectionsClient from './CollectionsClient';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'קולקציות | YourSofer',
  description: 'חמש קולקציות עיצוב ייחודיות: יהלום, שוהם, ישפה, ספיר וברקת — מזוזות, יודאיקה וכלי שולחן בסגנונות שונים לכל בית. Your Sofer.',
  alternates: { canonical: `${BASE_URL}/collections` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/collections`,
    siteName: 'Your Sofer',
    title: 'קולקציות | YourSofer',
    description: 'יהלום, שוהם, ישפה, ספיר וברקת — מזוזות ויודאיקה בחמישה סגנונות עיצוב.',
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Your Sofer' }],
  },
};

export default function CollectionsPage() {
  return <CollectionsClient />;
}
