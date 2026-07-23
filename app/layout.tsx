import type { Metadata } from "next";
import { Heebo, Cormorant_Garamond } from "next/font/google";
import { Suspense } from "react";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ShaliachProvider } from "./contexts/ShaliachContext";
import NavBar from "@/app/components/navigation/NavBar";
import Footer from "@/app/components/Footer";
import ShiraChatLoader from "@/app/components/chat/ShiraChatLoader";
import ChatCartBridge from "@/app/components/chat/ChatCartBridge";
import { ChatPersonaProvider } from "@/app/components/chat/ChatPersonaContext";
import ScrollToTop from "@/app/components/ScrollToTop";
import MetaPixelPageView from "@/app/components/MetaPixelPageView";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { FacebookPixel } from "@/components/FacebookPixel";
import { TidioChat } from "@/components/TidioChat";
import { CanonicalTag } from "@/components/CanonicalTag";
import ShavuotPopupWrapper from "@/components/ShavuotPopupWrapper";
import ClubPopupWrapper from "@/components/ClubPopupWrapper";
import GiftProgressBar from "./components/GiftProgressBar";

// PERF: Geist removed — its className was on <body> but the inline style
// (fontFamily: var(--font-heebo)…) overrode it everywhere, so the font file was
// preloaded with display:swap on every page and never actually rendered.
// One less woff2 in the critical chain + one less potential font-swap CLS source.
const heebo = Heebo({ subsets: ["hebrew", "latin"], display: "optional", variable: "--font-heebo" });
// PERF: Frank Ruhl Libre removed — next/font preloaded 5 weights × 2 subsets on
// every page, but the only selector using it (.brand-story) appears in no component.
// globals.css still maps --font-frank to a serif fallback if it's ever reused.
// PERF: Cormorant trimmed 5 weights → the 3 actually used (300 = hero title +
// homepage h2s, 600 = h1/h2/h3 default in globals.css, 700 = bold headings).
// 2 fewer preloaded woff2 files on every page — the font chain was the longest
// item in the critical request path (2.6s on slow 4G).
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '600', '700'],
  display: 'swap',
  variable: '--font-cormorant',
});

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Your Sofer | כיפות לאירועים בעיצוב אישי - אתר היודאיקה הגדול בישראל',
    template: '%s | Your Sofer',
  },
  description:
    'אתר היודאיקה הגדול בישראל: מעל 6,000 מוצרים — 800+ סוגי כיפות לאירועים בעיצוב אישי, 300+ תיקי ומארזי טלית ותפילין, מזכרות ומתנות לאירועים, כלי שולחן ותשמישי קדושה לבית היהודי. משלוחים לכל הארץ.',
  keywords: [
    'יודאיקה', 'חנות יודאיקה', 'כיפות', 'כיפות בעיצוב אישי', 'כיפות לאירועים',
    'מזכרות לאירועים', 'מתנות לאירועים', 'מתנות לבר מצווה', 'תיקי טלית ותפילין',
    'תשמישי קדושה', 'מתנות יהודיות', 'כלי שולחן לשבת', 'yoursofer', 'your sofer',
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
    title: 'Your Sofer | כיפות לאירועים בעיצוב אישי - אתר היודאיקה הגדול בישראל',
    description:
      'מעל 6,000 מוצרי יודאיקה: 800+ סוגי כיפות בעיצוב אישי, 300+ תיקי טלית ותפילין, מזכרות ומתנות לאירועים.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Your Sofer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your Sofer | כיפות לאירועים בעיצוב אישי - אתר היודאיקה הגדול בישראל',
    description: 'מעל 6,000 מוצרי יודאיקה: 800+ סוגי כיפות בעיצוב אישי, מזכרות ומתנות לאירועים.',
    images: ['/og-default.png'],
  },
  alternates: {},
  // הלוגו המקורי (דמות הסופר) מקלאודינרי באיכות מלאה — 96×96 (כפולה של 48, דרישת גוגל)
  icons: {
    icon: [
      { url: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_96,h_96,c_fit,f_png/v1784459751/%D7%A2%D7%99%D7%A6%D7%95%D7%91_%D7%9C%D7%9C%D7%90_%D7%A9%D7%9D_43_gfp2nf.png', sizes: '96x96', type: 'image/png' },
      { url: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_192,h_192,c_fit,f_png/v1784459751/%D7%A2%D7%99%D7%A6%D7%95%D7%91_%D7%9C%D7%9C%D7%90_%D7%A9%D7%9D_43_gfp2nf.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_180,h_180,c_fit,f_png/v1784459751/%D7%A2%D7%99%D7%A6%D7%95%D7%91_%D7%9C%D7%9C%D7%90_%D7%A9%D7%9D_43_gfp2nf.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" style={{ overflowX: 'hidden', maxWidth: '100%' }} className={`overflow-x-hidden ${cormorant.variable}`}>
      <head>
        {/* ── Google Tag Manager ── */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-PTHMKJ97');
          window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
        ` }} />
        {/* ── End Google Tag Manager ── */}
        {/* ── GA4 ישיר (G-PM7GW4MWEJ) — אל תסיר! ──
            קונטיינר GTM אינו מעבד קריאות gtag('event',...) — הוא מגיב רק ל-
            dataLayer.push עם event. בלי ה-config הישיר הזה, כל אירועי ה-ecommerce
            (purchase, view_item, add_to_cart, begin_checkout) לא מגיעים ל-GA4.
            זה בדיוק מה שקרה ב-3.7.26 כשההגדרה הישירה הוסרה לטובת GTM בלבד.
            send_page_view:false כי תג ה-Google בקונטיינר כבר שולח page_view. */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-PM7GW4MWEJ" />
        <script dangerouslySetInnerHTML={{ __html: `
          gtag('js', new Date());
          gtag('config', 'G-PM7GW4MWEJ', { send_page_view: false });
        ` }} />
        <meta name="facebook-domain-verification" content="xuwtu57l434nldfe7p4s8l2sr829jw" />
        <CanonicalTag />
        {/* ── Preconnects & DNS prefetches ── */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://your-sofer.firebaseapp.com" />
        <link rel="dns-prefetch" href="https://apis.google.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://firebaseapp.com" />
        {/* PERF: removed stale hero preload (old banner PNG no longer rendered anywhere) —
            it fetched a high-priority image on EVERY page and competed with the real LCP.
            The homepage hero poster is now preloaded from app/page.tsx instead. */}
      </head>
      <body className={`${heebo.variable} overflow-x-hidden`} style={{ overflowX: 'hidden', maxWidth: '100%', fontFamily: 'var(--font-heebo), Arial, sans-serif' }}>
        {/* ── Google Tag Manager (noscript) ── */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PTHMKJ97"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* ── End Google Tag Manager (noscript) ── */}
        <ChatPersonaProvider>
        <AuthProvider>
          {/* NOTE: nothing inside this boundary may call useSearchParams() —
              it would suspend static prerendering and ship this entire tree as
              EMPTY HTML (fallback=null) on every page, destroying LCP & CLS.
              Read window.location.search in a useEffect instead (see ShaliachContext). */}
          <Suspense fallback={null}>
            <ShaliachProvider>
              <CartProvider>
                <ScrollToTop />
                <ChatCartBridge />
                <NavBar />
                {children}
                <Footer />
                <ShiraChatLoader />
                <ShavuotPopupWrapper />
                <ClubPopupWrapper />
                <GiftProgressBar />
              </CartProvider>
            </ShaliachProvider>
          </Suspense>
        </AuthProvider>
        </ChatPersonaProvider>
        <SpeedInsights />

        {/* ── Meta Pixel - deferred until user interaction ── */}
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <>
            <FacebookPixel />
            <Suspense fallback={null}>
              <MetaPixelPageView />
            </Suspense>
          </>
        )}

        {/* ── Tidio live chat - deferred 5 seconds ── */}
        {process.env.NEXT_PUBLIC_TIDIO_KEY && <TidioChat />}

        {/* ── Microsoft Clarity — lazyOnload: session replay doesn't need to boot
               during the load window (~150ms CPU + 25KB saved from the TBT window);
               it still records the full session once loaded ── */}
        <Script id="ms-clarity" strategy="lazyOnload">{`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window,document,"clarity","script","wiozsdfcgm");
        `}</Script>
      </body>
    </html>
  );
}
