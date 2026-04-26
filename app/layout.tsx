import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ShaliachProvider } from "./contexts/ShaliachContext";
import NavBar from "@/app/components/navigation/NavBar";
import Footer from "@/app/components/Footer";
import ShiraChat from "@/app/components/chat/ShiraChat";
import GTMLoader from "@/app/components/GTMLoader";
import WizardStickyBar from "@/app/components/WizardStickyBar";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geist = Geist({ subsets: ["latin"], display: "swap" });

const BASE_URL = 'https://yoursofer.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Your Sofer — חנות סת"מ | מזוזות, תפילין וספרי תורה',
    template: '%s | Your Sofer',
  },
  description:
    'רכישת סת"מ מסופרים מוסמכים — מזוזות, תפילין, מגילות וספרי תורה עם שקיפות מלאה. כל קלף מצולם, נבדק ומקושר לסופר שכתב אותו.',
  keywords: [
    'מזוזה', 'מזוזות', 'סת"מ', 'קלף', 'תפילין', 'מגילה', 'ספר תורה',
    'סופר סת"מ', 'yoursofer', 'your sofer', 'קניית מזוזה',
    'מזוזה מהודרת', 'מזוזה כשרה',
  ],
  authors: [{ name: 'Your Sofer', url: BASE_URL }],
  creator: 'Your Sofer',
  publisher: 'Your Sofer',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: BASE_URL,
    siteName: 'Your Sofer',
    title: 'Your Sofer — חנות סת"מ | מזוזות, תפילין וספרי תורה',
    description:
      'רכישת סת"מ מסופרים מוסמכים — מזוזות, תפילין, מגילות וספרי תורה עם שקיפות מלאה.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Your Sofer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your Sofer — חנות סת"מ',
    description: 'רכישת סת"מ מסופרים מוסמכים — מזוזות, תפילין ועוד.',
    images: ['/og-default.png'],
  },
  alternates: { canonical: BASE_URL },
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" style={{ overflowX: 'hidden', maxWidth: '100vw' }} className="overflow-x-hidden">
      <head>
        <link rel="preconnect" href="https://your-sofer.firebaseapp.com" />
        <link rel="preconnect" href="https://apis.google.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
      </head>
      <body className={`${geist.className} overflow-x-hidden`} style={{ overflowX: 'hidden', maxWidth: '100vw' }}>
        <AuthProvider>
          {/* Suspense is required by Next.js when useSearchParams() is used
              inside a component rendered from the root layout */}
          <Suspense fallback={null}>
            <ShaliachProvider>
              <CartProvider>
                <NavBar />
                {children}
                <Footer />
              </CartProvider>
            </ShaliachProvider>
          </Suspense>
          <GTMLoader />
        </AuthProvider>
        <WizardStickyBar />
        <ShiraChat />
        <SpeedInsights />
      </body>
    </html>
  );
}
