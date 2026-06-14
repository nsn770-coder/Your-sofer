import type { Metadata } from 'next';
import AboutClient from './AboutClient';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'אודותינו | Your Sofer',
  description: 'Your Sofer נולד מתוך שליחות — הסיפור, החזון והערכים שלנו',
  alternates: { canonical: `${BASE_URL}/about` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/about`,
    siteName: 'Your Sofer',
    title: 'אודותינו | Your Sofer — הרבה יותר מחנות יהדות',
    description: 'Your Sofer נולד מתוך שליחות. הסיפור, החזון, הערכים והמשימה שלנו.',
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Your Sofer' }],
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
