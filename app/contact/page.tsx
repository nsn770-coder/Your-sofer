import type { Metadata } from 'next';
import ContactClient from './ContactClient';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'צור קשר | YourSofer',
  description: 'צרו קשר עם Your Sofer — שירות לקוחות בוואטסאפ, מייל ושליחת הודעה. נשמח לעזור בכל שאלה על כיפות, מתנות, מזכרות לאירועים וכל מוצרי היודאיקה.',
  alternates: { canonical: `${BASE_URL}/contact` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/contact`,
    siteName: 'Your Sofer',
    title: 'צור קשר | YourSofer',
    description: 'שירות לקוחות בוואטסאפ, מייל ושליחת הודעה. זמינים ימים א׳–ו׳.',
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Your Sofer' }],
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
