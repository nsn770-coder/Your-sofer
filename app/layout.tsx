import type { Metadata } from "next";
import { Geist, Heebo } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ShaliachProvider } from "./contexts/ShaliachContext";
import NavBar from "@/app/components/navigation/NavBar";
import Footer from "@/app/components/Footer";
import ShiraChat from "@/app/components/chat/ShiraChat";
import GTMLoader from "@/app/components/GTMLoader";
import MetaPixelPageView from "@/app/components/MetaPixelPageView";
import WizardStickyBar from "@/app/components/WizardStickyBar";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { FacebookPixel } from "@/components/FacebookPixel";
import { TidioChat } from "@/components/TidioChat";

const geist = Geist({ subsets: ["latin"], display: "swap" });
const heebo = Heebo({ subsets: ["hebrew", "latin"], display: "swap", variable: "--font-heebo" });

const BASE_URL = 'https://your-sofer.com';

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
        {/* ── Preconnects & DNS prefetches ── */}
        <link rel="preconnect" href="https://your-sofer.firebaseapp.com" />
        <link rel="preconnect" href="https://apis.google.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://firebaseapp.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        {/* ── Hero image preload ── */}
        <link
          rel="preload"
          as="image"
          href="https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto:good,w_1400/v1777180035/IMG_1277_apvc5v.png"
          fetchPriority="high"
        />
      </head>
      <body className={`${geist.className} ${heebo.variable} overflow-x-hidden`} style={{ overflowX: 'hidden', maxWidth: '100vw', fontFamily: 'var(--font-heebo), Arial, sans-serif' }}>
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

        {/* ── Meta Pixel — deferred until user interaction ── */}
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <>
            <FacebookPixel />
            <Suspense fallback={null}>
              <MetaPixelPageView />
            </Suspense>
          </>
        )}

        {/* ── Tidio live chat — deferred 5 seconds ── */}
        {process.env.NEXT_PUBLIC_TIDIO_KEY && <TidioChat />}
      </body>
    </html>
  );
}
