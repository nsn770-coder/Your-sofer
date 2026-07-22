import type { Metadata } from 'next';
import MadrichPageClient from './MadrichPageClient';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'המדריך לעולם היודאיקה - כיפות, אירועים, מתנות וסת״ם',
  description:
    'מדריכים בשפה ברורה לכל עולם היודאיקה: בחירת כיפות וסוגיהן, כיפות מודפסות לאירועים, סידורי תפילה, מתנות יהודיות - וגם עולם הסת״ם המלא: מזוזות, תפילין וספרי תורה.',
  alternates: { canonical: `${BASE_URL}/madrich` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich`,
    siteName: 'Your Sofer',
    title: 'המדריך לעולם היודאיקה | Your Sofer',
    description: 'מדריכים לבחירת כיפות, מזכרות לאירועים, סידורים ומתנות - וגם עולם הסת״ם המלא.',
  },
};

export default function MadrichPage() {
  return <MadrichPageClient />;
}
