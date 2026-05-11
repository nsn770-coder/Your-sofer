import type { Metadata } from 'next';
import BarMitzvaClient from './BarMitzvaClient';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'מדריך בר מצווה | תפילין ומזוזות | YourSofer',
  description: 'סט בר מצווה מושלם: תפילין קומפלט כשר לכתחילה, מהודר ומהודר בתכלית — מסופר סת״מ מוסמך. טלית, כיפה וכיסוי תפילין לבחירתך. משלוח לכל הארץ.',
  alternates: { canonical: `${BASE_URL}/bar-mitzva` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/bar-mitzva`,
    siteName: 'Your Sofer',
    title: 'מדריך בר מצווה | תפילין ומזוזות | YourSofer',
    description: 'סט בר מצווה מושלם: תפילין קומפלט כשר לכתחילה מסופר מוסמך. טלית וכיפה לבחירתך.',
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Your Sofer' }],
  },
};

export default function BarMitzvaPage() {
  return <BarMitzvaClient />;
}
