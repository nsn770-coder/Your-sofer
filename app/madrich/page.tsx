import type { Metadata } from 'next';
import MadrichPageClient from './MadrichPageClient';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'מדריך למזוזות — כל מה שצריך לדעת לפני הקנייה',
  description:
    'לא קונים מזוזה בעיניים עצומות. מאמרים ומדריכים על בחירת מזוזה, בדיקות כשרות, פערי מחירים ועוד — כתובים בשפה ברורה.',
  alternates: { canonical: `${BASE_URL}/madrich` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich`,
    siteName: 'Your Sofer',
    title: 'מדריך למזוזות | Your Sofer',
    description: 'מאמרים ומדריכים על בחירת מזוזה, בדיקות כשרות, פערי מחירים ועוד.',
  },
};

export default function MadrichPage() {
  return <MadrichPageClient />;
}
