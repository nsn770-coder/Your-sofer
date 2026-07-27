import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ShaliachProvider } from "./contexts/ShaliachContext";
import AnnouncementBar from "@/app/components/AnnouncementBar";
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
import GoogleReviewsStrip from "@/app/components/GoogleReviewsStrip";
import AccessibilityWidget from "@/app/components/AccessibilityWidget";

// נגישות + PERF: כל פונטי Google הוסרו (Heebo, Cormorant). האתר עבר לפונט
// מערכת קריא — Arial — בכל הרכיבים, כולל כותרות (בעקבות משוב שהפונט הקריא
// מתפריט הנגישות נוח יותר). אפס קבצי woff2 בשרשרת הקריטית = LCP מהיר יותר.
// var(--font-heebo) ו-var(--font-cormorant) ממופים ל-Arial ב-globals.css,
// כך שכל ההפניות הקיימות ממשיכות לעבוד.

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'YourSofer | תכשיטים ומתנות בעיצוב אישי, יודאיקה מהודרת וכיפות לאירועים',
    template: '%s | Your Sofer',
  },
  description:
    'תכשיטים עם שם, מתנות בחריטה אישית, כיפות מודפסות לאירועים ותשמישי קדושה מהודרים. משלוח מהיר לכל הארץ עם מספר מעקב · תשלום מאובטח.',
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
    title: 'YourSofer | תכשיטים ומתנות בעיצוב אישי, יודאיקה מהודרת וכיפות לאירועים',
    description:
      'מעל 5,000 מוצרים לבית היהודי: תכשיטים ומתנות בעיצוב אישי, 800+ סוגי כיפות, 300+ תיקי טלית ותפילין ומזכרות לאירועים.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Your Sofer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YourSofer | תכשיטים ומתנות בעיצוב אישי, יודאיקה מהודרת וכיפות לאירועים',
    description: 'מעל 5,000 מוצרים לבית היהודי: תכשיטים ומתנות בעיצוב אישי, 800+ סוגי כיפות, מזכרות לאירועים.',
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
    <html lang="he" dir="rtl" style={{ overflowX: 'hidden', maxWidth: '100%' }} className="overflow-x-hidden">
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
          gtag('config', 'AW-18095875961');
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
      <body className="overflow-x-hidden" style={{ overflowX: 'hidden', maxWidth: '100%', fontFamily: "Arial, 'Segoe UI', sans-serif" }}>
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
                {/* נגישות: קישור דילוג לתוכן הראשי — האלמנט הראשון שמקבל פוקוס */}
                <a href="#main-content" className="skip-link">דילוג לתוכן הראשי</a>
                <ScrollToTop />
                <ChatCartBridge />
                <AnnouncementBar />
                <NavBar />
                {/* עוגן יעד לקישור הדילוג — לפני תוכן העמוד */}
                <div id="main-content" tabIndex={-1} style={{ outline: 'none' }} />
                {children}
                <GoogleReviewsStrip />
                <Footer />
                <ShiraChatLoader />
                <ShavuotPopupWrapper />
                <ClubPopupWrapper />
                <GiftProgressBar />
                <AccessibilityWidget />
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
