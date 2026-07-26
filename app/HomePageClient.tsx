'use client';

import { useState, useEffect, useLayoutEffect, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, getDoc, addDoc, serverTimestamp, getCountFromServer,
} from 'firebase/firestore';
import { db } from './firebase';
// PERF: HeroSwiper import removed — it was imported but never rendered,
// yet still pulled its module graph into the homepage bundle.
import ProductCard from '@/components/ui/ProductCard';

const NewsletterPopup   = dynamic(() => import('./components/NewsletterPopup'),       { ssr: false, loading: () => <div className="hidden" /> });
const TestimonialsCarousel = dynamic(() => import('./components/TestimonialsCarousel'), { ssr: false, loading: () => <div style={{ height: 450 }} /> });
import { useShaliach } from './contexts/ShaliachContext';
import { useCart }     from './contexts/CartContext';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import { formatPrice } from '@/app/lib/utils';
import {
  CARDS, ALL_CATS, CONFIG_COLLECTION, CONFIG_DOC, slotKey,
} from './constants/homepageCards';
import type { CardDef, SubItem } from './constants/homepageCards';
import {
  SECTIONS_COLLECTION, SECTIONS_DOC, DEFAULT_SECTIONS, normalizeSections, buildCategoryHref,
} from './constants/homepageCategorySections';
import type { HomepageCategoryItem, HomepageCategorySections } from './constants/homepageCategorySections';
import lifeEvents from '@/data/lifeEvents';
import AlgoliaSearch from '@/app/components/search/AlgoliaSearch';
import ProductCardVideo from '@/app/components/ProductCardVideo';

// Activity bar icons
function IconActivityCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C5A028" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconActivityPen() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C5A028" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
function IconActivityBox() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C5A028" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IconActivityUsers() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C5A028" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function IconActivityShield() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C5A028" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

// Counter icons — gold
function IconCounterPen({ isMobile }: { isMobile: boolean }) {
  return (
    <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="#C5A028" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
function IconCounterBox({ isMobile }: { isMobile: boolean }) {
  return (
    <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="#C5A028" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IconCounterCheck({ isMobile }: { isMobile: boolean }) {
  return (
    <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="#C5A028" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconCounterStar({ isMobile }: { isMobile: boolean }) {
  return (
    <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="#C5A028" stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Sofer {
  id: string;
  name: string;
  profileImage?: string;
  imgUrl?: string;
}

interface Testimonial {
  id: string;
  name: string;
  city: string;
  text: string;
  rating: number;
  imageUrl: string;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  imgUrl2?: string;
  imgUrl3?: string;
  priority?: number;
  isBestSeller?: boolean;
  badge?: string | null;
  was?: number | null;
  createdAt?: { seconds: number } | null;
  hidden?: boolean;
  cat?: string;
  videoUrl?: string;
}

interface LiveReview {
  id: string;
  reviewerName: string;
  stars: number;
  text: string;
  mediaUrl: string;
  createdAt: { seconds: number } | null;
  productName?: string;
}

function squareCropUrl(url: string): string {
  if (!url) return url;
  return url.replace('/upload/', '/upload/c_fill,g_auto,w_400,h_400/');
}

function formatReviewerName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return parts[0] + ' ' + parts[1].charAt(0) + '.';
}

function formatHeDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Sub-image slot ─────────────────────────────────────────────────────────────

function SubSlot({ imgUrl, label, href }: { imgUrl: string; label: string; href: string }) {
  return (
    <Link href={href} className="block group">
      <div
        className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-1.5"
        style={{ borderRadius: 0 }}
      >
        {imgUrl ? (
          <Image
            fill
            unoptimized
            loading="lazy"
            src={optimizeCloudinaryUrl(imgUrl, 400)}
            alt={label}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="200px"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span style={{ fontSize: 28, color: '#c0c0c0', fontWeight: 900 }}>
              {label.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <p
        className="text-right leading-tight line-clamp-2 group-hover:underline"
        style={{ fontSize: 11, color: '#555', direction: 'rtl' }}
      >
        {label}
      </p>
    </Link>
  );
}

// ── Single category card ───────────────────────────────────────────────────────

function CategoryCard({
  card,
  catImages,
  slotImages,
}: {
  card: CardDef;
  catImages: Record<string, string>;
  slotImages: Record<string, string>;
}) {
  return (
    <div
      dir="rtl"
      className="flex flex-col"
      style={{
        background: '#ffffff',
        borderRadius: 0,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        padding: 16,
        height: '100%',
      }}
    >
      <h3
        className="text-right mb-3"
        style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a', lineHeight: 1.2 }}
      >
        {card.title}
      </h3>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {card.items.map(item => (
          <SubSlot
            key={item.href + item.label}
            imgUrl={slotImages[slotKey(card.title, item.label)] ?? catImages[item.cat] ?? ''}
            label={item.label}
            href={item.href}
          />
        ))}
      </div>
      <Link
        href={card.href}
        className="mt-4 block text-right hover:underline"
        style={{ fontSize: 13, fontWeight: 700, color: '#C5A028' }}
      >
        {card.ctaLabel}
      </Link>
    </div>
  );
}

// ── Admin-configurable homepage category tile ─────────────────────────────────
// Rendered in the "קטגוריות נבחרות" (top) and "קטגוריות סת״ם" (bottom) grids.
// width 'half' = 2 per row, 'full' = spans the whole row (admin-controlled).

function HomeCategoryTile({ item, img, isMobile, onNav }: {
  item: HomepageCategoryItem;
  img: string;
  isMobile: boolean;
  onNav: (href: string) => void;
}) {
  const full = item.width === 'full';
  // אריח כיפות ומזכרות לאירועים — שם מלא + כותרת גדולה משאר הקטגוריות
  const isEventTile = item.label.includes('כיפות לאירועים') || item.label.includes('כיפות ומזכרות');
  const displayLabel = isEventTile ? 'כיפות ומזכרות לאירועים' : item.label;
  return (
    <div
      onClick={() => onNav(buildCategoryHref(item))}
      className={`group ${full ? 'col-span-2' : 'col-span-1'}`}
      style={{ cursor: 'pointer', background: '#FFFFFF' }}
    >
      <div style={{ width: '100%', aspectRatio: full ? (isMobile ? '16 / 9' : '21 / 8') : '4 / 3', overflow: 'hidden', position: 'relative', background: '#FFFFFF' }}>
        {img ? (
          <Image
            fill unoptimized loading="lazy"
            src={optimizeCloudinaryUrl(img, full ? 1280 : 400)}
            alt={item.label}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.015]"
            sizes={full ? '(max-width: 1280px) 100vw, 1280px' : '(max-width: 640px) 50vw, 33vw'}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, background: '#f3f4f4' }}>{item.emoji || '🛍️'}</div>
        )}
      </div>
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <h3 style={{ fontSize: isEventTile ? 21 : 16, fontWeight: isEventTile ? 700 : 500, color: '#373A5A', margin: 0 }}>{displayLabel}</h3>
        <span className="underline underline-offset-4" style={{ display: 'inline-block', marginTop: 4, fontSize: 13, color: '#111111' }}>לצפייה</span>
      </div>
    </div>
  );
}

// ── Skeleton card for loading state ───────────────────────────────────────────

function SkeletonCategoryCard() {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 0,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        padding: 16,
        height: '100%',
      }}
    >
      <div className="h-5 bg-gray-200 rounded w-2/3 mb-3 animate-pulse" style={{ marginRight: 'auto' }} />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-square bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-2.5 bg-gray-200 rounded w-4/5 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Static data (outside component - never re-created on render) ───────────────

const STATIC_QUOTES = [
  { name: 'מיכל כהן',    city: 'תל אביב',  stars: 5, text: 'הזמנתי מזוזה לבית החדש - קיבלתי תמונה של הקלף לפני המשלוח. לא ציפיתי לרמת שירות כזו.' },
  { name: 'יוסף לוי',    city: 'ירושלים',  stars: 5, text: 'קניתי תפילין לבן שלי לבר מצווה. הסופר פנה אלינו אישית כדי לוודא שהכל מתאים. מרגש.' },
  { name: 'שרה אברמוב',  city: 'חיפה',     stars: 5, text: 'מתנה לאמא שלי - היא בכתה מרוב שמחה. האריזה הייתה מהממת והיא בכתה מרוב התרגשות. מתנה מושלמת שהגיעה במארז מהמם!' },
  { name: 'דוד נחמיאס',  city: 'באר שבע',  stars: 5, text: 'ראיתי הרבה חנויות אונליין. כאן היחיד שמציג צילום אמיתי של הקלף. זה ההבדל כולו.' },
] as const;

const CLEAR_PATH_ITEMS = [
  { label: 'מצא מזוזה לבית',  href: '/category/בתי מזוזה' },
  { label: 'מצא מתנה לשבת',   href: '/category/שבתות וחגים' },
  { label: 'צפה בכל המוצרים', href: '/category/יודאיקה' },
] as const;

// "עוד קטגוריות" strip — admin-controlled via דשבורד ← קטגוריות (section: more).
// Defaults live in DEFAULT_SECTIONS.more (constants/homepageCategorySections.ts).

// ── Activity bar - owns its own timer, never re-renders the parent ─────────────

const ActivityBar = memo(function ActivityBar({
  weeklyProducts,
  isMobile,
}: {
  weeklyProducts: number;
  isMobile: boolean;
}) {
  const [activityIdx, setActivityIdx] = useState(0);

  useEffect(() => {
    setActivityIdx(0);
    const id = setInterval(() => setActivityIdx(i => i + 1), 4000);
    function onVisible() { if (!document.hidden) setActivityIdx(0); }
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const weeklyVisitors = (3196).toLocaleString('en-US');
  const messages = [
    { icon: <IconActivityCheck />, text: 'לקוח מתל אביב הוסיף מזוזה לסל לפני 5 דקות' },
    { icon: <IconActivityPen />,   text: 'סופר חדש נרשם מירושלים השבוע' },
    { icon: <IconActivityBox />,   text: `${weeklyProducts || '12'} מוצרים נוספו השבוע` },
    { icon: <IconActivityUsers />, text: `${weeklyVisitors} לקוחות ביקרו השבוע` },
    { icon: <IconActivityShield />, text: 'מוצרי סת"מ נבדקים ע"י מגיה מוסמך' },
  ];
  const msg = messages[activityIdx % messages.length];

  return (
    <div style={{ background: '#FFFFFF', borderBottom: '1px solid #e8e8ea', padding: '7px 16px', textAlign: 'center', overflow: 'hidden' }}>
      <span key={activityIdx} style={{ fontSize: isMobile ? 12 : 13, color: '#1a2744', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7, animation: 'fadeSlide 0.5s ease' }}>
        {msg.icon}
        {msg.text}
      </span>
      <style>{`@keyframes fadeSlide { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
});

// ── Main component ─────────────────────────────────────────────────────────────

export default function HomePageClient() {
  const [isMobile, setIsMobile]       = useState(false);
  const [catImages, setCatImages]     = useState<Record<string, string>>({});
  const [catSections, setCatSections] = useState<HomepageCategorySections>(DEFAULT_SECTIONS);
  const sectionImgFetchDone = useRef(false);
  const [slotImages, setSlotImages]   = useState<Record<string, string>>({});
  const [imagesReady, setImagesReady] = useState(true);
  const [wizardOpen, setWizardOpen]   = useState(false);
  const [weeklyProducts, setWeeklyProducts] = useState(0);
  const [soferimCount, setSoferimCount]     = useState(0);
  const [productsCount, setProductsCount]   = useState(0);
  const countersRef = useRef<HTMLDivElement>(null);
  const [countersVisible, setCountersVisible] = useState(false);

  // DOM refs for counter animation - avoids 72 React re-renders per second
  const productsValRef  = useRef<HTMLSpanElement>(null);
  const soferimValRef   = useRef<HTMLSpanElement>(null);
  const customersValRef = useRef<HTMLSpanElement>(null);

  const [wizardStep, setWizardStep]     = useState(0);
  const [wizardFor, setWizardFor]       = useState<'self' | 'gift' | null>(null);
  const [wizardBudget, setWizardBudget] = useState<'low' | 'mid' | 'high' | null>(null);
  const [wizardKashrut, setWizardKashrut] = useState<'regular' | 'mehudar' | 'mehudar_plus' | null>(null);
  const [wizardResults, setWizardResults] = useState<Product[]>([]);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [soferimList, setSoferimList]           = useState<Sofer[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [promoProducts, setPromoProducts]       = useState<Product[]>([]);
  // CLS: promo/featured section space is reserved until the fetch settles (see wrappers below)
  const [promoLoaded, setPromoLoaded]           = useState(false);
  const [featuredLoaded, setFeaturedLoaded]     = useState(false);
  const [testimonials, setTestimonials]         = useState<Testimonial[]>([]);
  const [liveReviews, setLiveReviews]           = useState<LiveReview[]>([]);
  const [newsletterEmail, setNewsletterEmail]   = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle');
  const [newsletterPopupOpen, setNewsletterPopupOpen] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  // PERF (homepage lab LCP ~14.6s): the hero <video autoPlay> started downloading
  // several MB immediately, hogging bandwidth during the LCP window — and its
  // first rendered frame registered as the LCP element. Until armed, we show the
  // exact same poster as a plain <img> (identical geometry, already preloaded in
  // page.tsx), and mount the <video> only after first interaction or 8s idle.
  // The video element carries the same poster, so the takeover is seamless.
  const [heroVideoOn, setHeroVideoOn] = useState(false);
  const [bsVisible, setBsVisible] = useState(false);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const bsSectionRef = useRef<HTMLDivElement>(null);
  const cardsRef   = useRef<HTMLDivElement>(null);
  const router     = useRouter();
  const { shaliach } = useShaliach();
  const { addItem }  = useCart();

  // Read isMobile synchronously before the browser paints to prevent CLS on mobile
  // (avoids the false→true flip that shifts the entire layout after hydration)
  useLayoutEffect(() => { setIsMobile(window.innerWidth < 768); }, []);

  // Arm the hero video ONLY after first interaction (see heroVideoOn above).
  // PERF: the old 8s idle fallback meant Lighthouse (which never interacts)
  // still downloaded the multi-MB video mid-trace — inflating total payload,
  // Speed Index and TBT. The poster <img> is pixel-identical, so a visitor who
  // hasn't touched the page loses nothing.
  useEffect(() => {
    const arm = () => setHeroVideoOn(true);
    const events: (keyof WindowEventMap)[] = ['scroll', 'pointerdown', 'keydown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, arm, { once: true, passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, arm));
    };
  }, []);

  // Resize — debounced 150 ms so mobile touch events don't saturate the thread
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function onResize() { clearTimeout(timer); timer = setTimeout(() => setIsMobile(window.innerWidth < 768), 150); }
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    async function fetchPinnedImages(): Promise<Record<string, string>> {
      try {
        const snap = await getDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC));
        if (!snap.exists()) return {};
        const configMap = snap.data() as Record<string, Record<string, string>>;
        const idToSlots: Record<string, string[]> = {};
        for (const card of CARDS) {
          const cardConf = configMap[card.title] ?? {};
          for (const item of card.items) {
            const pid = cardConf[item.label];
            if (pid) {
              if (!idToSlots[pid]) idToSlots[pid] = [];
              idToSlots[pid].push(slotKey(card.title, item.label));
            }
          }
        }
        const result: Record<string, string> = {};
        await Promise.all(
          Object.entries(idToSlots).map(async ([pid, keys]) => {
            try {
              const pSnap = await getDoc(doc(db, 'products', pid));
              if (pSnap.exists()) {
                const d = pSnap.data();
                const img = (d.imgUrl || d.image_url || '') as string;
                for (const k of keys) result[k] = img;
              }
            } catch { /* skip */ }
          }),
        );
        return result;
      } catch { return {}; }
    }

    async function fetchCatImages() {
      const map: Record<string, string> = {};
      try {
        const snap = await getDocs(collection(db, 'categories'));
        snap.forEach(d => {
          const r   = d.data();
          const img = (r.imageUrl || r.imgUrl || '') as string;
          if (!img) return;
          // index by every identifier so lookups work regardless of doc ID type
          const keys = [d.id, r.slug, r.name, r.displayName].filter(Boolean) as string[];
          for (const key of keys) map[key] = img;
        });
      } catch { /* fall through to product fallback */ }

      // For every cat still without an image, pull from its first product
      const missing = ALL_CATS.filter(cat => !map[cat]);
      if (missing.length > 0) {
        const pairs = await Promise.all(
          missing.map(async cat => {
            try {
              const pSnap = await getDocs(
                query(collection(db, 'products'), where('cat', '==', cat), limit(1)),
              );
              if (!pSnap.empty) {
                const d = pSnap.docs[0].data();
                return [cat, (d.imgUrl || d.image_url || '') as string] as const;
              }
            } catch { /* ignore */ }
            return [cat, ''] as const;
          }),
        );
        for (const [cat, img] of pairs) {
          if (img && !map[cat]) map[cat] = img;
        }
      }
      setCatImages(map);
    }

    async function fetchFeaturedProducts() {
      try {
        const KLAF_CATS = new Set(['קלפי מזוזה', 'קלפי תפילין', 'מגילות', 'ספרי תורה']);
        const BLOCKED_NAMES = /מלחי|מלחית|מלחיות/;
        const isShowable = (p: Product) =>
          p.hidden !== true &&
          (p as any).status !== 'inactive' &&
          !KLAF_CATS.has(p.cat ?? '') &&
          !BLOCKED_NAMES.test(p.name ?? '') &&
          !!(p.imgUrl || p.image_url);

        // Load manual product IDs from Firestore (admin-controlled, shown first in scroll)
        let manualIds: string[] = [];
        try {
          const configSnap = await getDoc(doc(db, 'siteConfig', 'bestSellers'));
          if (configSnap.exists()) {
            manualIds = (configSnap.data().manualProductIds ?? []) as string[];
          }
        } catch { /* fall back to empty — auto-only */ }

        // Fetch manual products in declared order, skip missing/hidden ones
        const manualSnaps = await Promise.all(
          manualIds.map(id => getDoc(doc(db, 'products', id)).catch(() => null))
        );
        const pinnedProducts: Product[] = manualSnaps
          .map(s => {
            if (s === null || !s.exists()) return null;
            const p = { id: s.id, ...s.data() } as Product;
            return isShowable(p) ? p : null;
          })
          .filter((p): p is Product => p !== null);

        const pinnedIdSet = new Set(pinnedProducts.map(p => p.id));

        const snap = await getDocs(
          query(collection(db, 'products'), where('isBestSeller', '==', true), limit(50)),
        );
        const bestSellers = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(p => isShowable(p) && !pinnedIdSet.has(p.id));

        if (pinnedProducts.length + bestSellers.length >= 4) {
          setFeaturedProducts([...pinnedProducts, ...bestSellers]);
          return;
        }
        const fallbackSnap = await getDocs(
          query(collection(db, 'products'), orderBy('priority', 'desc'), limit(50)),
        );
        const all = fallbackSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(p => isShowable(p) && !pinnedIdSet.has(p.id));
        setFeaturedProducts([...pinnedProducts, ...all]);
      } catch { /* non-fatal */ }
      finally { setFeaturedLoaded(true); }
    }

    async function fetchPromoProducts() {
      try {
        const snap = await getDocs(
          query(collection(db, 'products'), where('promoPlan', '==', '2+1'), orderBy('price'), limit(8))
        );
        setPromoProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => !p.hidden && (p.imgUrl || p.image_url)));
      } catch { /* non-fatal */ }
      finally { setPromoLoaded(true); }
    }

    // Admin-controlled homepage category sections (top + STaM grids)
    async function fetchCatSections() {
      try {
        const snap = await getDoc(doc(db, SECTIONS_COLLECTION, SECTIONS_DOC));
        if (snap.exists()) setCatSections(normalizeSections(snap.data()));
      } catch { /* keep DEFAULT_SECTIONS */ }
    }

    // Defer all Firebase reads so the hero (LCP element) paints first
    const timer = setTimeout(() => {
      Promise.all([
        fetchPinnedImages().then(pinned => setSlotImages(pinned)),
        fetchCatImages(),
        fetchCatSections(),
      ]);
      fetchFeaturedProducts();
      fetchPromoProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Product-image fallback for admin-added section categories (e.g. a new
  // sub-category like ראש השנה) that have no image in the categories collection.
  useEffect(() => {
    if (sectionImgFetchDone.current) return;
    if (Object.keys(catImages).length === 0) return; // wait for the base image map
    const keys = [...new Set(
      [...catSections.top, ...catSections.stam, ...catSections.more]
        .filter(it => !it.imageUrl)
        .flatMap(it => [it.subCategory, it.cat].filter(Boolean) as string[]),
    )].filter(k => !catImages[k]);
    if (keys.length === 0) return;
    sectionImgFetchDone.current = true;
    (async () => {
      const pairs = await Promise.all(keys.map(async key => {
        try {
          let snap = await getDocs(query(collection(db, 'products'), where('subCategory', '==', key), limit(1)));
          if (snap.empty) snap = await getDocs(query(collection(db, 'products'), where('cat', '==', key), limit(1)));
          if (!snap.empty) {
            const d = snap.docs[0].data();
            return [key, (d.imgUrl || d.image_url || '') as string] as const;
          }
        } catch { /* ignore */ }
        return [key, ''] as const;
      }));
      setCatImages(prev => {
        const next = { ...prev };
        for (const [k, img] of pairs) if (img && !next[k]) next[k] = img;
        return next;
      });
    })();
  }, [catImages, catSections]);

  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const snap = await getDocs(
          query(collection(db, 'testimonials'), orderBy('createdAt', 'desc')),
        );
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial));
        setTestimonials(all.filter(t => t.active === true));
      } catch (e) { console.error('testimonials fetch error:', e); }
    }
    // Below the fold - defer so it doesn't compete with LCP
    const timer = setTimeout(fetchTestimonials, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function fetchSoferim() {
      try {
        const snap = await getDocs(collection(db, 'soferim'));
        console.log('[soferim] total docs:', snap.size);
        const list: Sofer[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const img = (data.imageUrl || data.profileImage || data.imgUrl || data.image || data.photoURL || data.photo || '') as string;
          if (img) list.push({ id: d.id, name: (data.name || '') as string, profileImage: img });
        });
        console.log('[soferim] with image:', list.length, list.map(s => s.name));
        setSoferimList(list);
      } catch(e) {
        console.error('[soferim] fetch error:', e);
      }
    }
    fetchSoferim();
  }, []);

  useEffect(() => {
    async function fetchLiveReviews() {
      try {
        const snap = await getDocs(query(
          collection(db, 'reviews'),
          where('approved', '==', true),
          limit(20),
        ));
        const list: LiveReview[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as LiveReview));
        list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setLiveReviews(list);
      } catch { /* non-fatal */ }
    }
    fetchLiveReviews();
  }, []);

  useEffect(() => {
    async function fetchCounts() {
      try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const weekTs = { seconds: Math.floor(oneWeekAgo.getTime() / 1000), nanoseconds: 0 };
        const [soferimSnap, productsSnap, weeklySnap] = await Promise.all([
          getCountFromServer(collection(db, 'soferim')),
          getCountFromServer(collection(db, 'products')),
          getDocs(query(collection(db, 'products'), where('createdAt', '>=', weekTs), limit(100))),
        ]);
        setSoferimCount(soferimSnap.data().count);
        setProductsCount(productsSnap.data().count);
        setWeeklyProducts(weeklySnap.size);
      } catch { /* non-fatal */ }
    }
    // Counter section is below the fold - defer
    const timer = setTimeout(fetchCounts, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const el = countersRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setCountersVisible(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Counter animation - writes directly to DOM refs, zero React re-renders
  useEffect(() => {
    if (!countersVisible) return;
    const targets = { soferim: soferimCount || 12, products: productsCount || 180, customers: 1200 };
    const duration = 1200;
    const start = performance.now();
    let rafId: number;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      if (productsValRef.current)  productsValRef.current.textContent  = `${Math.round(targets.products  * ease)}+`;
      if (soferimValRef.current)   soferimValRef.current.textContent   = String(Math.round(targets.soferim   * ease));
      if (customersValRef.current) customersValRef.current.textContent = `${Math.round(targets.customers * ease)}+`;
      if (t < 1) rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [countersVisible, soferimCount, productsCount]);

  // Lazy autoplay: start video when wrapper scrolls into view (≥50% visible)
  useEffect(() => {
    const el = videoWrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !videoStarted) {
        setVideoStarted(true);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [videoStarted]);

  // Section-level IO for BestSellers: preload first 2 videos when section is 300px away
  useEffect(() => {
    const el = bsSectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setBsVisible(true); obs.disconnect(); }
      },
      { rootMargin: '700px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // popups disabled
  useEffect(() => {}, []);
  useEffect(() => {}, []);

  async function fetchWizardResults(budget: typeof wizardBudget, kashrut: typeof wizardKashrut) {
    setWizardLoading(true);
    try {
      const priceRanges = { low: [0, 400], mid: [400, 1000], high: [1000, 99999] };
      const [minPrice, maxPrice] = priceRanges[budget!] ?? [0, 99999];
      const kashrutKeywords: Record<string, string[]> = {
        regular:       ['רגיל', 'כשר'],
        mehudar:       ['מהודר'],
        mehudar_plus:  ['מהדרין', 'מהודר בתכלית'],
      };
      const keywords = kashrutKeywords[kashrut!] ?? [];
      const snap = await getDocs(
        query(
          collection(db, 'products'),
          where('price', '>=', minPrice),
          where('price', '<=', maxPrice),
          orderBy('price'),
          limit(40),
        )
      );
      const candidates: Product[] = [];
      snap.forEach(d => { const p = { id: d.id, ...d.data() } as Product; if (p.hidden !== true) candidates.push(p); });
      const scored = candidates.map(p => {
        const text = `${p.name ?? ''} ${(p as any).badge ?? ''} ${(p as any).kashrut ?? ''}`.toLowerCase();
        const score = keywords.reduce((s, kw) => s + (text.includes(kw.toLowerCase()) ? 1 : 0), 0);
        return { p, score };
      }).sort((a, b) => b.score - a.score || (b.p.priority ?? 0) - (a.p.priority ?? 0));
      setWizardResults(scored.slice(0, 3).map(s => s.p));
    } catch (e) {
      console.error(e);
      setWizardResults([]);
    } finally {
      setWizardLoading(false);
    }
  }

  async function handleNewsletter(e: React.FormEvent) {
    e.preventDefault();
    const email = newsletterEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    setNewsletterStatus('loading');
    try {
      const existing = await getDocs(query(collection(db, 'newsletter'), where('email', '==', email)));
      if (!existing.empty) { setNewsletterStatus('duplicate'); return; }
      await addDoc(collection(db, 'newsletter'), { email, createdAt: serverTimestamp() });
      setNewsletterStatus('success');
      setNewsletterEmail('');
    } catch { setNewsletterStatus('error'); }
  }

  function closeWizard() {
    setWizardOpen(false);
    setWizardStep(0);
    setWizardFor(null);
    setWizardBudget(null);
    setWizardKashrut(null);
    setWizardResults([]);
  }

  return (
    <div
      dir="rtl"
      style={{
        background: '#FFFFFF',
        fontFamily: "var(--font-heebo), 'Heebo', Arial, sans-serif",
        overflowX: 'hidden',
        maxWidth: '100vw',
      }}
    >
      <style>{`
        .ys-hero-btn-primary {
          display: inline-flex; align-items: center; justify-content: center;
          background: #373A5A; color: #FFFFFF;
          border: 1px solid #373A5A;
          height: 54px; padding: 0 40px; border-radius: 0;
          font-weight: 600; font-size: 16px; text-decoration: none;
          white-space: nowrap; transition: all 0.2s ease; cursor: pointer;
          font-family: inherit;
        }
        .ys-hero-btn-primary:hover { background: #2F324D; border-color: #2F324D; }
        .ys-hero-btn-primary:active { background: #282B43; border-color: #282B43; }
        .ys-hero-btn-primary:focus-visible { outline: none; box-shadow: 0 0 0 4px rgba(55,58,90,0.35); }
        .ys-hscroll::-webkit-scrollbar { display: none; }
        .ys-outline-btn {
          display: inline-flex; align-items: center; justify-content: center;
          background: #FFFFFF; color: #373A5A;
          border: 1px solid #373A5A; border-radius: 0;
          height: 50px; padding: 0 36px;
          font-weight: 500; font-size: 14px; text-decoration: none;
          transition: all 0.2s ease; cursor: pointer; font-family: inherit;
        }
        .ys-outline-btn:hover { background: #373A5A; color: #fff; }
        .ys-outline-btn:active { background: #282B43; border-color: #282B43; color: #fff; }
        .ys-outline-btn:focus-visible { outline: none; box-shadow: 0 0 0 4px rgba(55,58,90,0.35); }
        /* CLS FIX: layout-critical responsive values live in CSS media queries, NOT in
           the isMobile JS state. isMobile is false during SSR/prerender, so any
           isMobile-driven width/height/grid painted desktop-first on phones and then
           jumped after hydration. CSS is correct on the very first paint. */
        .ys-hero-box { padding-top: 40%; }
        .ys-cta-banner { aspect-ratio: 8 / 1.8; }
        .ys-promo-reserve { min-height: 560px; }
        /* CLS FIX 2: the hero overlay text + trust row previously used isMobile
           inline styles — SSR painted the desktop values (padding 0 72px, font
           48px) on phones, then everything reflowed after hydration. Same exact
           values, now correct on the very first paint. */
        .ys-hero-content { padding: 0 72px; }
        .ys-hero-title { font-size: 48px; max-width: 70%; }
        .ys-hero-sub { font-size: 18px; margin-bottom: 32px; max-width: 60%; }
        .ys-trust-txt { font-size: 13px; }
        @media (max-width: 767px) {
          .ys-hero-box { padding-top: 56.25%; }
          .ys-cta-banner { aspect-ratio: 5 / 2; min-height: 120px; }
          .ys-promo-reserve { min-height: 600px; }
          .ys-hero-content { padding: 40px 24px 36px; }
          .ys-hero-title { font-size: 28px; max-width: 92%; }
          .ys-hero-sub { font-size: 15px; margin-bottom: 24px; max-width: 88%; }
          .ys-trust-txt { font-size: 12px; }
        }
      `}</style>

      {/* ── Newsletter popup ── */}
      {newsletterPopupOpen && (
        <NewsletterPopup
          email={newsletterEmail}
          setEmail={setNewsletterEmail}
          status={newsletterStatus}
          setStatus={setNewsletterStatus}
          onSubmit={handleNewsletter}
          onClose={() => setNewsletterPopupOpen(false)}
        />
      )}

      {/* ── Selection Wizard modal ── */}
      {wizardOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.55)' }}
          onClick={closeWizard}>
          <div style={{ background: '#fff', borderRadius: 0, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: '#1a1a1a', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, color: '#C5A028', fontWeight: 700, marginBottom: 2 }}>
                  {wizardStep < 3 ? `שאלה ${wizardStep + 1} מתוך 3` : '✨ ההמלצות שלנו'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>
                  {wizardStep === 0 && 'עזרה בבחירה'}
                  {wizardStep === 1 && 'מה התקציב?'}
                  {wizardStep === 2 && 'רמת כשרות?'}
                  {wizardStep === 3 && 'מצאנו בשבילך!'}
                </div>
              </div>
              <button onClick={closeWizard} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {wizardStep < 3 && (
              <div style={{ height: 3, background: '#f0f0f0' }}>
                <div style={{ height: '100%', width: `${((wizardStep + 1) / 3) * 100}%`, background: '#373A5A', transition: 'width 0.4s ease' }} />
              </div>
            )}
            <div style={{ padding: 24 }}>
              {wizardStep === 0 && (
                <>
                  <p style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>למי זה מיועד?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[{ val: 'self' as const, label: '👤 לי עצמי' }, { val: 'gift' as const, label: '🎁 מתנה לאחר' }].map(opt => (
                      <button key={opt.val} onClick={() => { setWizardFor(opt.val); setWizardStep(1); }}
                        style={{ padding: '18px 12px', borderRadius: 0, border: '2px solid #e0e0e0', background: '#fff', fontSize: 15, fontWeight: 700, color: '#1a1a1a', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#373A5A'; (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F9'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e0e0e0'; (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {wizardStep === 1 && (
                <>
                  <p style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>מה התקציב?</p>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {[
                      { val: 'low'  as const, label: 'עד 400 ₪',     sub: 'מוצרים בסיסיים כשרים' },
                      { val: 'mid'  as const, label: '400 – 1,000 ₪', sub: 'מוצרים מהודרים' },
                      { val: 'high' as const, label: 'מעל 1,000 ₪',  sub: 'מוצרים מהדרין מובחרים' },
                    ].map(opt => (
                      <button key={opt.val} onClick={() => { setWizardBudget(opt.val); setWizardStep(2); }}
                        style={{ padding: '14px 18px', borderRadius: 0, border: '2px solid #e0e0e0', background: '#fff', fontSize: 15, fontWeight: 700, color: '#1a1a1a', cursor: 'pointer', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#373A5A'; (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F9'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e0e0e0'; (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}>
                        <span>{opt.label}</span>
                        <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {wizardStep === 2 && (
                <>
                  <p style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>רמת כשרות?</p>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {[
                      { val: 'regular'      as const, label: 'רגיל',         sub: 'כשר לכתחילה לפי כל הדעות' },
                      { val: 'mehudar'      as const, label: 'מהודר',        sub: 'רמה גבוהה מעל הרגיל' },
                      { val: 'mehudar_plus' as const, label: 'מהודר בתכלית', sub: 'רמת הכשרות הגבוהה ביותר' },
                    ].map(opt => (
                      <button key={opt.val} onClick={() => { setWizardKashrut(opt.val); setWizardStep(3); fetchWizardResults(wizardBudget, opt.val); }}
                        style={{ padding: '14px 18px', borderRadius: 0, border: '2px solid #e0e0e0', background: '#fff', fontSize: 15, fontWeight: 700, color: '#1a1a1a', cursor: 'pointer', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#373A5A'; (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F9'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e0e0e0'; (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}>
                        <span>{opt.label}</span>
                        <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {wizardStep === 3 && (
                wizardLoading ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#888', fontSize: 15 }}>מחפש עבורך את הכי מתאים...</div>
                ) : wizardResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#888' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                    לא נמצאו מוצרים מתאימים לפי הסינון.
                    <br />
                    <button onClick={() => router.push('/category/הכל')} style={{ marginTop: 16, background: '#373A5A', color: '#fff', border: 'none', borderRadius: 0, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>לכל המוצרים</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                      {wizardResults.map(p => (
                        <div key={p.id} onClick={() => { closeWizard(); router.push(`/product/${p.id}`); }}
                          style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', borderRadius: 0, border: '1px solid #eee', cursor: 'pointer', background: '#fafafa', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#373A5A'; (e.currentTarget as HTMLDivElement).style.background = '#F3F4F9'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#eee'; (e.currentTarget as HTMLDivElement).style.background = '#fafafa'; }}>
                          {(p.imgUrl || p.image_url) && (
                            <img src={optimizeCloudinaryUrl(p.imgUrl || p.image_url || '', 100)} alt={p.name} loading="lazy" style={{ width: 60, height: 60, borderRadius: 0, objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                            <div style={{ fontSize: 15, fontWeight: 900, color: '#373A5A' }}>{formatPrice(p.price)}</div>
                          </div>
                          <span style={{ color: '#373A5A', fontSize: 18, flexShrink: 0 }}>←</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={closeWizard} style={{ width: '100%', background: '#373A5A', color: '#fff', border: 'none', borderRadius: 0, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      המשך לגלישה
                    </button>
                  </>
                )
              )}
              {wizardStep > 0 && wizardStep < 3 && (
                <button onClick={() => setWizardStep(s => s - 1)} style={{ marginTop: 16, background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center' }}>
                  ← חזרה
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 1. Hero ── */}
      {/* CLS FIX: height comes from the .ys-hero-box media query (correct at first
          paint) instead of isMobile, which flipped 40%→56.25% after hydration. */}
      <div
        dir="rtl"
        className="ys-hero-box"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 0,
          width: '100%',
          marginLeft: 0,
          marginRight: 0,
        }}
      >
        {/* Background video — height 140% + objectFit:cover + objectPosition:top → fills width, crops from bottom only */}
        {/* LCP: poster is w_1080 (was w_1600) — covers phone DPR2 and MUST stay
            byte-identical to HERO_POSTER preloaded in app/page.tsx.
            PERF: until heroVideoOn (first interaction / 8s), the poster renders as a
            plain <img> with IDENTICAL geometry — so the multi-MB video download never
            competes with the LCP window, and the img (not a video frame) is the LCP.
            The <video> then mounts with the same poster → seamless, pixel-identical
            takeover, and plays exactly like before. */}
        {!heroVideoOn ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto,w_1080/v1782769100/WhatsApp_Image_2026-06-29_at_21.52.31_1_m59ykm.jpg"
            alt=""
            fetchPriority="high"
            decoding="async"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '110%', objectFit: 'cover', objectPosition: 'top', zIndex: 0 }}
          />
        ) : (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto,w_1080/v1782769100/WhatsApp_Image_2026-06-29_at_21.52.31_1_m59ykm.jpg"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '110%', objectFit: 'cover', objectPosition: 'top', zIndex: 0 }}
        >
          {/* vc_h264 + q_auto: transcode the raw WhatsApp upload to guaranteed-compatible
              H.264/mp4 on every device, significantly smaller. Deliberately NOT f_auto —
              that could serve webm and contradict the type="video/mp4" hint below. */}
          <source src="https://res.cloudinary.com/dyxzq3ucy/video/upload/vc_h264,q_auto/v1782758809/%D7%A1%D7%A8%D7%98%D7%95%D7%9F_%D7%91%D7%90%D7%A0%D7%A8_hotlyr.mp4" type="video/mp4" />
        </video>
        )}

        {/* Overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.52)', zIndex: 1 }} />

        {/* Content — absolute so it doesn't push container height.
            CLS FIX 2: responsive values moved to .ys-hero-* media queries. */}
        <div className="ys-hero-content" style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          {/* Emotional title — visual prominence, NOT the h1 */}
          <p className="ys-hero-title" style={{
            fontWeight: 300,
            fontFamily: 'var(--font-cormorant), serif',
            color: '#FFFFFF',
            lineHeight: 1.2,
            textShadow: '0 2px 16px rgba(0,0,0,0.4)',
            margin: '0 0 16px',
            letterSpacing: '-0.01em',
          }}>
            כל עולם היודאיקה במקום אחד
          </p>

          {/* h1 — preserved for SEO, visually hidden */}
          <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            אתר היודאיקה הגדול בישראל - כיפות, מתנות ומזכרות לאירועים
          </h1>

          <p className="ys-hero-sub" style={{
            fontWeight: 400,
            color: 'rgba(255,255,255,0.88)',
            marginTop: 0,
            lineHeight: 1.7,
          }}>
            המבחר הגדול בישראל למוצרי יודאיקה — לבית, לבית הכנסת, לאירועים ולמתנות
          </p>

        </div>
      </div>

      {/* ── Mobile search band ── */}
      {/* CLS FIX: always rendered, hidden on desktop via CSS (md:hidden) instead of
          {isMobile && …} which inserted the band after hydration and pushed the
          whole page down on phones. minHeight reserves the input's space. */}
      <div className="md:hidden" style={{ background: '#FFFFFF', padding: '20px 16px', borderBottom: '1px solid #E7E2D8', minHeight: 84 }}>
        <AlgoliaSearch />
      </div>

      {/* ── Trust row ── */}
      {/* CLS FIX: responsive grid via Tailwind classes — stable on first paint */}
      <div dir="rtl" className="px-4 py-3.5 md:px-8 md:py-[18px]" style={{ background: '#FFFFFF', borderBottom: '1px solid #F0F0F2' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4" style={{ maxWidth: 1280, margin: '0 auto' }}>
          {[
            'משלוחים לכל הארץ',
            'מבחר ענק של מוצרי יודאיקה',
            'קנייה מאובטחת',
            'שירות אישי בוואטסאפ',
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <span aria-hidden="true" style={{ color: '#C5A028', fontSize: 12, lineHeight: 1 }}>✓</span>
              <span className="ys-trust-txt" style={{ fontWeight: 500, color: '#222222', whiteSpace: 'nowrap' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Promo 2+1 section ── */}
      {/* CLS FIX: space is reserved while Firestore loads so content below doesn't
          jump when the dark section appears; collapses only if there are no promos. */}
      <div className={promoLoaded && promoProducts.length === 0 ? undefined : 'ys-promo-reserve'} style={{ background: promoProducts.length === 0 ? '#FFFFFF' : undefined }}>
      {promoProducts.length > 0 && (
        <section style={{ background: '#1a1a1a', padding: isMobile ? '40px 16px' : '64px 32px', direction: 'rtl' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 24 : 32, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#C9A227', letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 6px' }}>מבצע מיוחד</p>
                <h2 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 300, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>קנו 3, שלמו על 2</h2>
              </div>
              <a href="/promo/2plus1" style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 0, padding: '9px 20px', whiteSpace: 'nowrap', transition: 'all 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#1a1a1a'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}>
                לכל המבצעים ←
              </a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 14 : 20 }}>
              {promoProducts.slice(0, isMobile ? 4 : 8).map(p => {
                const img = p.imgUrl || p.image_url || '';
                const promoPrice = (p as any).promoPrice as number | undefined;
                return (
                  <a key={p.id} href={`/product/${p.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', background: '#2a2a2a', overflow: 'hidden', position: 'relative', borderRadius: 0, border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.2s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                    <div style={{ position: 'absolute', top: 10, right: 10, background: '#C9A227', color: '#1a1a1a', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 0, zIndex: 1, letterSpacing: '0.06em' }}>2+1</div>
                    <div style={{ width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', background: '#333' }}>
                      {img ? (
                        <img src={optimizeCloudinaryUrl(img, 400)} alt={p.name} loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🕍</div>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>יחיד: {formatPrice(p.price)}</span>
                      {promoPrice && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#C9A227' }}>3 ב-{formatPrice(Math.round(p.price * 2 * 100) / 100)}</span>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}
      </div>

      {/* ── Life events horizontal scroll ── */}
      <section
        id="life-events"
        className="pt-10 pb-9 md:pt-16 md:pb-12"
        style={{ background: '#FFFFFF', direction: 'rtl' }}
      >
        <div className="mb-5 md:mb-7" style={{ textAlign: 'center', padding: '0 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9C7B3F', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 0 }}>
            רגעי חיים
          </p>
          <p className="text-2xl md:text-[30px]" style={{ fontWeight: 300, color: '#3A2E1A', letterSpacing: '-0.01em', margin: 0 }}>
            מה מביא אתכם אלינו?
          </p>
        </div>

        <div
          className="ys-hscroll"
          style={{ display: 'flex', overflowX: 'auto', gap: 14, padding: '4px 20px 16px', scrollbarWidth: 'none', direction: 'rtl' } as React.CSSProperties}
        >
          {lifeEvents.map((ev, evIdx) => (
            <a
              key={ev.id}
              href={`/moment/${ev.id}`}
              className="w-[200px] md:w-[240px]"
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                background: '#FFFFFF',
                border: '1px solid #EDEDEF',
                borderRadius: 0,
                overflow: 'hidden',
                transition: 'border-color 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#373A5A'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#EDEDEF'; }}
            >
              {ev.image && (
                <div style={{ width: '100%', aspectRatio: '4 / 3', overflow: 'hidden', flexShrink: 0 }}>
                  <img
                    src={optimizeCloudinaryUrl(ev.image, 400)}
                    alt={ev.title}
                    fetchPriority={evIdx === 0 ? 'high' : 'auto'}
                    loading={evIdx === 0 ? 'eager' : 'lazy'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              )}
              <div style={{ padding: '12px 18px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#9C7B3F', letterSpacing: 1.5, textTransform: 'uppercase', margin: 0 }}>
                  {ev.title}
                </p>
                <span style={{ fontSize: 11, color: '#888', display: 'block', marginTop: 2 }}>לכל המוצרים ←</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Live Counters ── */}
      <div ref={countersRef} className="px-4 pt-4 pb-8 md:px-8 md:pt-6 md:pb-12" style={{ background: '#FFFFFF', borderBottom: '1px solid #f0ece4' }}>
        <div className="px-4 py-6 md:px-10 md:py-8" style={{
          maxWidth: 900, margin: '0 auto',
          background: '#fff',
          borderRadius: 0,
          border: '1px solid #EDEDEF',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          gap: 0,
          overflowX: isMobile ? 'auto' : 'visible',
        }}>
          {/* לקוחות מרוצים */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: isMobile ? '0 10px' : '0 16px', borderLeft: '1px solid #E7E2D8', flex: 1 }}>
            <span style={{ color: '#C9A227', display: 'flex', alignItems: 'center', marginBottom: 2 }}><IconCounterCheck isMobile={false} /></span>
            <span ref={customersValRef} style={{ fontSize: 22, fontWeight: 800, color: '#C9A227', lineHeight: 1 }}>0+</span>
            <span style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.3 }}>משפחות כבר בחרו בנו</span>
          </div>
          {/* סופרים מוסמכים */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: isMobile ? '0 10px' : '0 16px', borderLeft: '1px solid #E7E2D8', flex: 1 }}>
            <span style={{ color: '#C9A227', display: 'flex', alignItems: 'center', marginBottom: 2 }}><IconCounterPen isMobile={false} /></span>
            <span ref={soferimValRef} style={{ fontSize: 22, fontWeight: 800, color: '#C9A227', lineHeight: 1 }}>0</span>
            <span style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.3 }}>סופרים מוסמכים</span>
          </div>
          {/* מוצרים באתר */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: isMobile ? '0 10px' : '0 16px', borderLeft: '1px solid #E7E2D8', flex: 1 }}>
            <span style={{ color: '#C9A227', display: 'flex', alignItems: 'center', marginBottom: 2 }}><IconCounterBox isMobile={false} /></span>
            <span ref={productsValRef} style={{ fontSize: 22, fontWeight: 800, color: '#C9A227', lineHeight: 1 }}>0+</span>
            <span style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.3 }}>מוצרים באתר</span>
          </div>
          {/* דירוג ממוצע */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: isMobile ? '0 10px' : '0 16px', flex: 1 }}>
            <span style={{ color: '#C9A227', display: 'flex', alignItems: 'center', marginBottom: 2 }}><IconCounterStar isMobile={false} /></span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#C9A227', lineHeight: 1 }}>4.8</span>
            <span style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.3 }}>דירוג ממוצע</span>
          </div>
        </div>
      </div>

      {/* ── 4. Category grid ── */}
      {/* CLS FIX: grid/padding/heading via responsive classes — no 2↔3-column jump */}
      <div id="categories" className="px-5 py-10 md:px-8 md:py-16" style={{ background: '#FFFFFF', direction: 'rtl' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <h2 className="text-[28px] md:text-4xl" style={{ textAlign: 'center', fontWeight: 300, color: '#1F2937', marginBottom: 10, letterSpacing: '-0.01em' }}>קטגוריות נבחרות</h2>
          <p style={{ textAlign: 'center', fontSize: 15, color: '#9CA3AF', marginBottom: 28, fontWeight: 400 }}>גלה עוד מגוון מוצרים</p>
          {/* Admin-controlled via דשבורד ← קטגוריות ← תצוגת קטגוריות בדף הבית */}
          <div className="grid grid-cols-2 gap-4 md:gap-7">
            {catSections.top.map(item => (
              <HomeCategoryTile
                key={item.id}
                item={item}
                img={item.imageUrl || catImages[item.subCategory ?? ''] || catImages[item.cat] || catImages[item.label] || ''}
                isMobile={isMobile}
                onNav={href => router.push(href)}
              />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <button
              onClick={() => window.dispatchEvent(new Event("openMobileMenu"))}
              className="ys-outline-btn"
            >
              לכל הקטגוריות ←
            </button>
          </div>
        </div>
      </div>

      {/* ── Bar-Mitzvah Kippot CTA ── */}
      <div className="px-5 pb-12 md:px-8 md:pb-16" style={{ background: '#FFFFFF', direction: 'rtl' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <a
            href="/event-kippot"
            className="ys-cta-banner"
            style={{
              display: 'block',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 0,
              border: '1px solid #EDEDEF',
              textDecoration: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#373A5A'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#EDEDEF'; }}
          >
            {/* Designed banner — text is baked into the image, no overlay needed */}
            <Image
              src="https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto,w_1280/v1783054967/%D7%91%D7%90%D7%A0%D7%A8_%D7%9B%D7%99%D7%A4%D7%95%D7%AA_%D7%95%D7%9E%D7%96%D7%9B%D7%A8%D7%95%D7%AA_%D7%9C%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D_%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D_rrjg06.png"
              alt="כיפות ומזכרות לאירועים"
              fill
              unoptimized
              loading="lazy"
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 100vw, 1280px"
            />
            {/* CTA button — bottom-right (RTL start), whole banner is the link */}
            <div style={{
              position: 'absolute',
              bottom: isMobile ? 10 : 18,
              right: isMobile ? 12 : 28,
              background: '#373A5A',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: isMobile ? 12.5 : 15,
              padding: isMobile ? '8px 14px' : '12px 26px',
              borderRadius: 0,
              whiteSpace: 'nowrap',
            }}>
              כנסו לכיפות ומזכרות ←
            </div>
          </a>
        </div>
      </div>

      {/* ── 5. Featured products ── */}
      {/* CLS FIX: while Firestore loads, a skeleton grid with the exact card layout
          holds the space (image square + title + price rows), so the 10 real cards
          swap in without shifting anything below. Collapses only if truly empty. */}
      <div>
      {(featuredProducts.length > 0 || !featuredLoaded) && (
        <div ref={bsSectionRef} className="py-8 md:py-16" style={{ background: '#FFFFFF', direction: 'rtl' }}>
          <div className="mb-4 md:mb-6" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <h2 className="text-[22px] md:text-[28px]" style={{ fontWeight: 300, color: '#111111', margin: 0, letterSpacing: '-0.01em' }}>הכי נמכרים השבוע</h2>
            <Link href="/category/%D7%94%D7%9B%D7%9C" className="underline underline-offset-4" style={{ fontSize: 13, color: '#111111', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
              לכל המוצרים
            </Link>
          </div>
          {/* Horizontal scroll strip (RTL) — same card design as category pages */}
          <div
            className="no-scrollbar"
            style={{
              display: 'flex',
              overflowX: 'auto',
              gap: 12,
              padding: '0 20px 8px',
              scrollbarWidth: 'none',
              direction: 'rtl',
              scrollSnapType: 'x mandatory',
            } as React.CSSProperties}
          >
            {featuredProducts.length === 0 && Array.from({ length: 10 }).map((_, i) => (
              <div key={`sk-${i}`} className="w-[calc((100vw_-_56px)*3/8)] md:w-[calc((100vw_-_120px)/4)] xl:w-[290px]" style={{ flexShrink: 0, scrollSnapAlign: 'start' }}>
                <div className="aspect-square bg-gray-100 animate-pulse" />
                <div style={{ padding: '8px 2px 2px' }}>
                  <div className="h-4 bg-gray-100 rounded animate-pulse mb-1.5 w-11/12" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse mb-2 w-2/3" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
                </div>
              </div>
            ))}
            {featuredProducts.slice(0, 10).map((p, idx) => {
              const rawImg = p.imgUrl || p.image_url || '';
              // Square 1:1 crop (3:3) — width identical to the current height
              const imgSrc = rawImg.includes('/upload/')
                ? rawImg.replace('/upload/', '/upload/f_auto,q_auto,c_fill,g_auto,w_400,h_400/')
                : optimizeCloudinaryUrl(rawImg, 400);
              const hasSale = typeof p.was === 'number' && p.was > p.price;
              const savePct = hasSale ? Math.round((1 - p.price / (p.was as number)) * 100) : 0;
              return (
                <div key={p.id}
                  className="w-[calc((100vw_-_56px)*3/8)] md:w-[calc((100vw_-_120px)/4)] xl:w-[290px]"
                  style={{ cursor: 'pointer', background: '#fff', borderRadius: 0, overflow: 'hidden', flexShrink: 0, scrollSnapAlign: 'start' }}
                  onClick={() => router.push(`/product/${p.id}`)}
                >
                  <ProductCardVideo imgSrc={imgSrc} alt={p.name} videoUrl={p.videoUrl} index={idx} preloadTrigger={bsVisible}>
                    {p.isBestSeller && (
                      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1, background: '#373A5A', borderRadius: 0, fontSize: 11, fontWeight: 600, color: '#FFFFFF', padding: '3px 8px', letterSpacing: '0.01em' }}>
                        הכי נמכר
                      </div>
                    )}
                    {hasSale && (
                      <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 1, background: '#373A5A', color: '#FFFFFF', fontSize: 11, fontWeight: 600, padding: '4px 8px', lineHeight: 1.2, borderRadius: 0 }}>
                        {savePct}% הנחה
                      </span>
                    )}
                  </ProductCardVideo>
                  <div style={{ padding: '8px 2px 2px' }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#373A5A', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 40, marginBottom: 5, textAlign: 'right' } as React.CSSProperties}>{p.name}</p>
                    <p style={{ fontSize: 17, fontWeight: 700, color: '#111111', marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      {formatPrice(p.price)}
                      {hasSale && (
                        <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF', textDecoration: 'line-through' }}>{formatPrice(p.was as number)}</span>
                      )}
                    </p>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        addItem({ id: p.id, name: p.name, price: p.price, imgUrl: p.imgUrl, image_url: p.image_url, quantity: 1, cat: p.cat || undefined });
                      }}
                      style={{ background: 'none', border: 'none', padding: 0, color: '#111111', fontSize: 13, fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 4, cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#373A5A'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#111111'; }}
                    >
                      הוספה לסל
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>

      {/* ── 6. More categories horizontal scroll ── */}
      <div className="py-10 md:py-16" style={{ background: '#FFFFFF', direction: 'rtl' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px' }}>
          <h2 className="text-[22px] md:text-[26px]" style={{ fontWeight: 300, color: '#111111', marginBottom: 20, letterSpacing: '-0.01em' }}>עוד קטגוריות</h2>
        </div>
        <div
          className="no-scrollbar"
          style={{
            display: 'flex',
            overflowX: 'auto',
            gap: 12,
            padding: '0 20px 8px',
            scrollbarWidth: 'none',
            direction: 'rtl',
            scrollSnapType: 'x mandatory',
          } as React.CSSProperties}
        >
          {catSections.more.map(item => {
            const rawImg = item.imageUrl || catImages[item.subCategory ?? ''] || catImages[item.cat] || catImages[item.label] || '';
            const img = rawImg ? optimizeCloudinaryUrl(rawImg, 300) : '';
            return (
              <div key={item.id}
                onClick={() => router.push(buildCategoryHref(item))}
                className="w-40 md:w-[200px]"
                style={{ cursor: 'pointer', flexShrink: 0, scrollSnapAlign: 'start', transition: 'transform 0.2s ease' } as React.CSSProperties}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
              >
                <div style={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 0, overflow: 'hidden', background: img ? '#000' : '#e8e4dc', position: 'relative' }}>
                  {img ? (
                    <Image fill unoptimized loading="lazy" src={img} alt={item.label} style={{ objectFit: 'cover' }} sizes="200px" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>{item.emoji || '🖼️'}</div>
                  )}
                </div>
                <p style={{ fontSize: 11, textAlign: 'center', color: '#1a1a1a', fontWeight: 600, marginTop: 8 }}>{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Cloudinary video ── */}
      <div className="px-4 py-10 md:px-8 md:py-16" style={{ background: '#FFFFFF' }}>
        <div className="mb-5 md:mb-7" style={{ maxWidth: 896, margin: '0 auto', textAlign: 'center', direction: 'rtl' }}>
          <p className="text-[28px] md:text-4xl" style={{ fontWeight: 300, color: '#373A5A', margin: 0, lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            רק אצלנו ב&nbsp;<span dir="ltr" style={{ unicodeBidi: 'embed' }}>Your Sofer</span>
          </p>
          <p className="text-base md:text-lg" style={{ color: '#4B5563', marginTop: 10, marginBottom: 0 }}>
            כל עולם היודאיקה, האירועים והמתנות — מעל 6,000 מוצרים במקום אחד
          </p>
        </div>
        <div
          ref={videoWrapperRef}
          style={{ maxWidth: 896, margin: '0 auto', borderRadius: 0, overflow: 'hidden', border: '1px solid #EDEDEF', position: 'relative', aspectRatio: '16 / 9' }}
        >
          {/* PERF: loading="lazy" — the embed pulls ~170KB of player JS/CSS from
              jsDelivr; below the fold it now loads only when scrolled near.
              title fixes the Lighthouse a11y "frame without title" flag. */}
          <iframe
            src={`https://player.cloudinary.com/embed/?cloud_name=dyxzq3ucy&public_id=download_mijfs3&autoplay=${videoStarted ? 'true' : 'false'}&muted=true`}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title="סרטון על Your Sofer — אתר היודאיקה הגדול בישראל"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      </div>

      {/* ── Soferim horizontal row ── */}
      {soferimList.length > 0 && (
        <div style={{ background: '#FFFFFF', padding: isMobile ? '40px 0 24px' : '56px 0 32px', direction: 'rtl' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', marginBottom: 20 }}>
            <h2 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 300, color: '#111111', margin: 0, letterSpacing: '-0.01em' }}>הסופרים שלנו</h2>
          </div>
          <div
            className="ys-hscroll"
            style={{ display: 'flex', overflowX: 'auto', gap: 20, padding: '0 20px 8px', scrollbarWidth: 'none', direction: 'rtl' } as React.CSSProperties}
          >
            {soferimList.map(sofer => {
              const img = optimizeCloudinaryUrl(sofer.profileImage || '', 200);
              return (
                <a key={sofer.id} href={`/soferim/${sofer.id}`} style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 96, transition: 'transform 0.2s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', position: 'relative', boxShadow: '0 3px 12px rgba(0,0,0,0.12)', border: '2px solid #fff' }}>
                    <Image
                      fill
                      unoptimized
                      loading="lazy"
                      src={img}
                      alt={sofer.name}
                      style={{ objectFit: 'cover' }}
                      sizes="96px"
                    />
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {sofer.name}
                  </p>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sofer STaM categories grid ── */}
      <div className="px-5 py-10 md:px-8 md:py-16" style={{ background: '#FFFFFF', direction: 'rtl' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <h2 className="text-[28px] md:text-4xl" style={{ textAlign: 'center', fontWeight: 300, color: '#1F2937', marginBottom: 10, letterSpacing: '-0.01em' }}>עוד קטגוריות נבחרות</h2>
          <p style={{ textAlign: 'center', fontSize: 15, color: '#9CA3AF', marginBottom: 28, fontWeight: 400 }}>גלו עוד ממגוון המוצרים באתר</p>
          {/* Admin-controlled via דשבורד ← קטגוריות ← תצוגת קטגוריות בדף הבית */}
          <div className="grid grid-cols-2 gap-4 md:gap-7">
            {catSections.stam.map(item => (
              <HomeCategoryTile
                key={item.id}
                item={item}
                img={item.imageUrl || catImages[item.subCategory ?? ''] || catImages[item.cat] || catImages[item.label] || ''}
                isMobile={isMobile}
                onNav={href => router.push(href)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Soferim CTA ── */}
      <div className="py-10 md:py-14" style={{ background: '#FFFFFF', paddingLeft: 16, paddingRight: 16, direction: 'rtl', textAlign: 'center' }}>
        <button onClick={() => router.push('/soferim')} className="ys-hero-btn-primary">
          לצפייה במאגר הסופרים שלנו ←
        </button>
      </div>

      {/* ── Live Reviews Carousel ── */}
      {liveReviews.length > 0 && (
        <div style={{ background: '#FFFFFF', padding: isMobile ? '32px 0 32px' : '64px 0 56px', direction: 'rtl' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
            <h2 style={{ textAlign: 'center', fontSize: isMobile ? 22 : 36, fontWeight: 300, color: '#1F2937', marginBottom: 8, letterSpacing: '-0.01em' }}>
              מה הלקוחות אומרים
            </h2>
            <p style={{ textAlign: 'center', fontSize: isMobile ? 13 : 15, color: '#9CA3AF', marginBottom: isMobile ? 20 : 28, fontWeight: 400 }}>
              אלפי לקוחות מרוצים ברחבי הארץ
            </p>
          </div>
          {/* Mobile: card width matches the category-grid rhythm (2 cards per viewport,
              same width as a category product card). Desktop unchanged. */}
          <div
            className="ys-hscroll"
            style={{ display: 'flex', overflowX: 'auto', gap: isMobile ? 12 : 16, padding: isMobile ? '4px 20px 12px' : '4px 20px 16px', scrollbarWidth: 'none', direction: 'rtl', scrollSnapType: 'x mandatory' } as React.CSSProperties}
          >
            {liveReviews.map(r => (
              <div
                key={r.id}
                style={{
                  flexShrink: 0,
                  width: isMobile ? 'calc(50vw - 26px)' : 300,
                  maxWidth: isMobile ? 220 : undefined,
                  scrollSnapAlign: 'start',
                  background: '#FFFFFF',
                  borderRadius: 0,
                  border: '1px solid #EDEDEF',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#373A5A'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#EDEDEF'; }}
              >
                <div style={{ width: '100%', aspectRatio: '1 / 1', overflow: 'hidden' }}>
                  <img
                    src={squareCropUrl(r.mediaUrl)}
                    alt={r.reviewerName}
                    width={400}
                    height={400}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div style={{ padding: isMobile ? '10px 10px 12px' : '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: isMobile ? 5 : 8 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: r.stars }).map((_, i) => (
                      <span key={i} style={{ color: '#C9A227', fontSize: isMobile ? 12 : 13 }}>★</span>
                    ))}
                  </div>
                  <p style={{
                    fontSize: isMobile ? 12.5 : 13, color: '#4B5563', lineHeight: 1.6, margin: 0, fontStyle: 'italic',
                    ...(isMobile ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 60 } : {}),
                  } as React.CSSProperties}>
                    &ldquo;{r.text}&rdquo;
                  </p>
                  <div style={{ marginTop: isMobile ? 2 : 4 }}>
                    <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: '#1F2937' }}>{formatReviewerName(r.reviewerName)}</div>
                    {r.createdAt && (
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{formatHeDate(r.createdAt.seconds)}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: isMobile ? 20 : 32, padding: '0 20px' }}>
            <a href="/reviews" className="ys-outline-btn">לכל הביקורות ←</a>
          </div>
        </div>
      )}



    </div>
  );
}
