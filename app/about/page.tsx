import type { Metadata } from 'next';
import AboutClient from './AboutClient';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'אודות YourSofer | חנות סת״מ ויודאיקה מוסמכת',
  description: 'מי אנחנו ב-Your Sofer — הצוות, הערכים והמשימה שלנו. חנות סת״מ ויודאיקה שמחברת בין לקוחות לסופרים מוסמכים עם שקיפות מלאה. 100% מהרווחים לעמותת סודות התורה.',
  alternates: { canonical: `${BASE_URL}/about` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/about`,
    siteName: 'Your Sofer',
    title: 'אודות YourSofer | חנות סת״מ ויודאיקה מוסמכת',
    description: 'הצוות, הערכים והמשימה שלנו. 100% מהרווחים לעמותת סודות התורה.',
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Your Sofer' }],
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
