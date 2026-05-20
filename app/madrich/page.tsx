import type { Metadata } from 'next';
import MadrichPageClient from './MadrichPageClient';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'מדריך לעולם הסת״ם - כל מה שצריך לדעת לפני הקנייה',
  description:
    'לא קונים סת״ם בעיניים עצומות. מאמרים ומדריכים על בחירת מזוזה, תפילין וספר תורה, בדיקות כשרות, פערי מחירים ועוד - כתובים בשפה ברורה.',
  alternates: { canonical: `${BASE_URL}/madrich` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich`,
    siteName: 'Your Sofer',
    title: 'מדריך לעולם הסת״ם | Your Sofer',
    description: 'מאמרים ומדריכים על בחירת מזוזה, תפילין וספר תורה, בדיקות כשרות, פערי מחירים ועוד.',
  },
};

export default function MadrichPage() {
  return <MadrichPageClient />;
}
