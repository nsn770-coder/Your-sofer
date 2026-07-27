import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'כל הקטגוריות | כיפות, מתנות, מזכרות לאירועים ויודאיקה | Your Sofer',
  description:
    'כל קטגוריות המוצרים ב-Your Sofer: כיפות בעיצוב אישי, מזכרות ומתנות לאירועים, תיקי טלית ותפילין, שבת, חגים, תשמישי קדושה ומוצרים לבית היהודי. מעל 5,000 מוצרים במקום אחד.',
  alternates: { canonical: 'https://your-sofer.com/categories' },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: 'https://your-sofer.com/categories',
    siteName: 'Your Sofer',
    title: 'כל הקטגוריות | Your Sofer',
    description: 'כל קטגוריות המוצרים: כיפות, מתנות, מזכרות לאירועים, שבת, חגים ויודאיקה.',
  },
};

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
