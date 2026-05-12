import type { Metadata } from 'next';
import FaqClient from './FaqClient';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'שאלות ותשובות | Your Sofer',
  description: 'כל מה שרצית לדעת לפני שקונים סת״מ — מזוזות, תפילין, כשרות, משלוח והחזרות.',
  alternates: { canonical: `${BASE_URL}/faq` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/faq`,
    siteName: 'Your Sofer',
    title: 'שאלות ותשובות | Your Sofer',
    description: 'כל מה שרצית לדעת לפני שקונים סת״מ',
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Your Sofer' }],
  },
};

export default function FaqPage() {
  return <FaqClient />;
}
