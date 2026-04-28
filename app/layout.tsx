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
          href="https://res.cloudinary.com/dyxzq3ucy/image/upload/w_1200,q_auto:good,f_auto/v1777365002/%D7%94%D7%99%D7%97%D7%99%D7%93%D7%99%D7%9D_%D7%91%D7%A2%D7%95%D7%9C%D7%9D_%D7%A9%D7%9E%D7%A8%D7%90%D7%99%D7%9D_%D7%9C%D7%9A_%D7%90%D7%AA_%D7%94%D7%A1%D7%95%D7%A4%D7%A8._%D7%A1%D7%AA_%D7%9E_%D7%95%D7%99%D7%95%D7%93%D7%90%D7%99%D7%A7%D7%94_%D7%9E%D7%94%D7%95%D7%93%D7%A8%D7%99%D7%9D_%D7%91%D7%A9%D7%A7%D7%99%D7%A4%D7%95%D7%AA_%D7%A9%D7%A2%D7%95%D7%93_%D7%9C%D7%90_%D7%94%D7%9B%D7%A8%D7%AA._%D7%94%D7%9E%D7%96%D7%95%D7%96%D7%95%D7%AA_%D7%A0%D7%91%D7%93%D7%A7%D7%95_%D7%A2%D7%99_%D7%A8%D7%91_%D7%9E%D7%95%D7%A1%D7%9E%D7%9A_%D7%A6%D7%99%D7%9C%D7%95%D7%9D_%D7%A7%D7%9C%D7%A3_%D7%90%D7%9E%D7%99%D7%AA%D7%99_%D7%9C%D7%A4%D7%A0%D7%99_%D7%9E%D7%A9%D7%9C%D7%95%D7%97_%D7%AA%D7%A2%D7%95%D7%93%D7%AA_%D7%9B%D7%A9%D7%A8%D7%95%D7%AA_%D7%95%D7%94%D7%A1%D7%9E%D7%9B%D7%94_%D7%9C%D7%9B%D7%9C_%D7%A1%D7%95%D7%A4%D7%A8_hiascz.png"
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
