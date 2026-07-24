import type { Metadata } from 'next';

// מטא-דאטה לעמוד המועדון — כולל תמונת שיתוף (OG) שמופיעה בוואטסאפ/פייסבוק
// כשמשתפים את הקישור https://your-sofer.com/club.
// קובץ התמונה: public/club-og.jpg
export const metadata: Metadata = {
  title: 'הצטרפו למועדון — 10% נקודות על כל קנייה',
  description:
    'הצטרפו בחינם למועדון הלקוחות של Your Sofer: 10% נקודות על כל קנייה (שוות כסף לקנייה הבאה), נקודות רטרואקטיביות על רכישות קודמות, מבצעים והטבות בלעדיות לחברי מועדון.',
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: '/club',
    siteName: 'Your Sofer',
    title: 'הצטרפו למועדון Your Sofer — 10% Cashback על כל קנייה',
    description:
      'הצטרפות בחינם בלחיצה אחת: 10% נקודות על כל קנייה, נקודות רטרואקטיביות על רכישות קודמות, מבצעים והטבות בלעדיות.',
    images: [{ url: '/club-og.jpg', width: 1456, height: 1088, alt: 'מועדון הלקוחות של Your Sofer — 10% Cashback' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'הצטרפו למועדון Your Sofer — 10% Cashback על כל קנייה',
    images: ['/club-og.jpg'],
  },
};

export default function ClubLayout({ children }: { children: React.ReactNode }) {
  return children;
}
