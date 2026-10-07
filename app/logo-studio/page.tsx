import { Suspense } from 'react';
import type { Metadata } from 'next';
import LogoStudioClient from './LogoStudioClient';

export const metadata: Metadata = {
  title: 'סטודיו לוגו אישי לכיפה | Your Sofer',
  description: 'מעצבים לוגו אישי לאירוע — שמות, תאריך, גופן וצבע — מתקנים בשיחה ורואים הדמיה על הכיפה שבחרתם. 3 ניסיונות עיצוב בחינם.',
  alternates: { canonical: 'https://your-sofer.com/logo-studio' },
  robots: { index: true, follow: true },
};

export default function LogoStudioPage() {
  return (
    <Suspense fallback={<div dir="rtl" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>טוען את הסטודיו…</div>}>
      <LogoStudioClient />
    </Suspense>
  );
}
