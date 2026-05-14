'use client';

import { useState, useEffect, useLayoutEffect, useRef, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, getDoc, addDoc, serverTimestamp, getCountFromServer,
} from 'firebase/firestore';
import { db } from './firebase';
import HeroSwiper from './components/HeroSwiper';
import ProductCard from '@/components/ui/ProductCard';
const RabbinicalSupervision = dynamic(() => import('./components/RabbinicalSupervision'), { ssr: false, loading: () => <div style={{ height: 420 }} /> });

const SmartFunnel        = dynamic(() => import('./components/SmartFunnel'),            { ssr: false, loading: () => <div style={{ height: 400 }} /> });

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

// Counter icons
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
        style={{ fontSize: 17, fontWeight: 900, color: '#1E3A8A', lineHeight: 1.2 }}
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
  { name: 'שרה אברמוב',  city: 'חיפה',     stars: 5, text: 'מתנה לאמא שלי - היא בכתה מרוב שמחה. האריזה הייתה מהודרת ותעודת הכשרות נתנה לה ביטחון.' },
  { name: 'דוד נחמיאס',  city: 'באר שבע',  stars: 5, text: 'ראיתי הרבה חנויות אונליין. כאן היחיד שמציג צילום אמיתי של הקלף. זה ההבדל כולו.' },
] as const;

const CLEAR_PATH_ITEMS = [
  { label: 'מצא מזוזה לבית',  href: '/category/מזוזות' },
  { label: 'מצא מתנה לשבת',   href: '/category/שבתות וחגים' },
  { label: 'צפה בכל המוצרים', href: '/category/יודאיקה' },
] as const;

const MORE_CAT_DEFS = [
  { slug: 'סט טלית תפילין', emoji: '🕍' },
  { slug: 'ספרי תורה',       emoji: '📜' },
  { slug: 'פסח',             emoji: '🍷' },
  { slug: 'כיסוי תפילין',    emoji: '🖊️' },
  { slug: 'חנוכה',           emoji: '🕎' },
  { slug: 'קלפי תפילין',    emoji: '📄' },
  { slug: 'תפילין קומפלט',  emoji: '⬛' },
  { slug: 'בר מצווה',        emoji: '🎉' },
] as const;

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
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [testimonials, setTestimonials]         = useState<Testimonial[]>([]);
  const [newsletterEmail, setNewsletterEmail]   = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle');
  const [newsletterPopupOpen, setNewsletterPopupOpen] = useState(false);
  const cardsRef   = useRef<HTMLDivElement>(null);
  const router     = useRouter();
  const { shaliach } = useShaliach();
  const { addItem }  = useCart();

  // Read isMobile synchronously before the browser paints to prevent CLS on mobile
  // (avoids the false→true flip that shifts the entire layout after hydration)
  useLayoutEffect(() => { setIsMobile(window.innerWidth < 768); }, []);

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
      try {
        const snap = await getDocs(collection(db, 'categories'));
        if (!snap.empty) {
          const map: Record<string, string> = {};
          snap.forEach(d => {
            const r = d.data();
            const key = (d.id || r.slug || r.name || '') as string;
            const img = (r.imageUrl || r.imgUrl || '') as string;
            if (key) map[key] = img;
          });
          setCatImages(map);
          return;
        }
      } catch { /* fall through */ }
      const pairs = await Promise.all(
        ALL_CATS.map(async cat => {
          try {
            const snap = await getDocs(
              query(collection(db, 'products'), where('cat', '==', cat), limit(1)),
            );
            if (!snap.empty) {
              const d = snap.docs[0].data();
              return [cat, (d.imgUrl || d.image_url || '') as string] as const;
            }
          } catch { /* ignore */ }
          return [cat, ''] as const;
        }),
      );
      setCatImages(Object.fromEntries(pairs));
    }

    async function fetchFeaturedProducts() {
      try {
        const snap = await getDocs(
          query(collection(db, 'products'), where('isBestSeller', '==', true), limit(50)),
        );
        const KLAF_CATS = new Set(['קלפי מזוזה', 'קלפי תפילין', 'מגילות', 'ספרי תורה']);
        const BLOCKED_NAMES = /מלחי|מלחית|מלחיות/;
        const isShowable = (p: Product) =>
          p.hidden !== true &&
          (p as any).status !== 'inactive' &&
          !KLAF_CATS.has(p.cat ?? '') &&
          !BLOCKED_NAMES.test(p.name ?? '') &&
          !!(p.imgUrl || p.image_url);

        const bestSellers = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(isShowable);
        if (bestSellers.length >= 4) {
          setFeaturedProducts(bestSellers);
          return;
        }
        const fallbackSnap = await getDocs(
          query(collection(db, 'products'), orderBy('priority', 'desc'), limit(50)),
        );
        const all = fallbackSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(isShowable);
        setFeaturedProducts(all);
      } catch { /* non-fatal */ }
    }

    // Defer all Firebase reads so the hero (LCP element) paints first
    const timer = setTimeout(() => {
      Promise.all([
        fetchPinnedImages().then(pinned => setSlotImages(pinned)),
        fetchCatImages(),
      ]);
      fetchFeaturedProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

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
    const targets = { soferim: soferimCount || 12, products: productsCount || 180, customers: 1000 };
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('wizard_shown')) return;
    const timer = setTimeout(() => {
      setWizardOpen(true);
      localStorage.setItem('wizard_shown', '1');
    }, 30000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('newsletter_popup_shown')) return;
    const timer = setTimeout(() => {
      setNewsletterPopupOpen(true);
      sessionStorage.setItem('newsletter_popup_shown', '1');
    }, 120000);
    return () => clearTimeout(timer);
  }, []);

  // ── Memoized arrays that depend on catImages ───────────────────────────────

  const categoryGridItems = useMemo(() => [
    { name: 'תפילין קומפלט',  emoji: '🖊️', img: catImages['תפילין קומפלט']  || '', href: '/category/%D7%AA%D7%A4%D7%99%D7%9C%D7%99%D7%9F%20%D7%A7%D7%95%D7%9E%D7%A4%D7%9C%D7%98' },
    { name: 'קלף מזוזה',       emoji: '📜', img: catImages['קלפי מזוזה']      || '', href: '/category/%D7%A7%D7%9C%D7%A4%D7%99%20%D7%9E%D7%96%D7%95%D7%96%D7%94',       fallback: '#1a2744' },
    { name: 'יודאיקה',         emoji: '✡️', img: catImages['יודאיקה']         || '', href: '/category/%D7%99%D7%95%D7%93%D7%90%D7%99%D7%A7%D7%94' },
    { name: 'נטלות וכלים',    emoji: '🫙', img: catImages['נטלות וכלים'] || 'https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto,w_800/v1776283325/eolm1mte2d2q1zjaijsn.png', href: '/category/%D7%99%D7%95%D7%93%D7%90%D7%99%D7%A7%D7%94?filter=%D7%A0%D7%98%D7%99%D7%9C%D7%AA%20%D7%99%D7%93%D7%99%D7%99%D7%9D' },
    { name: 'שבתות וחגים',    emoji: '🕯️', img: catImages['שבתות וחגים'] || 'https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto,w_800/v1776635301/lsgvbw3tbwfbnv626xv7_ebthks.png', href: '/category/%D7%A9%D7%91%D7%AA%D7%95%D7%AA%20%D7%95%D7%97%D7%92%D7%99%D7%9D' },
    { name: 'מגילות',          emoji: '📖', img: catImages['מגילות']          || '', href: '/category/%D7%9E%D7%92%D7%99%D7%9C%D7%95%D7%AA' },
    { name: 'בתי מזוזה',       emoji: '📜', img: catImages['מזוזות']          || '', href: '/category/%D7%9E%D7%96%D7%95%D7%96%D7%95%D7%AA' },
    { name: 'סט טלית תפילין', emoji: '🕍', img: catImages['סט טלית תפילין'] || '', href: '/category/%D7%A1%D7%98%20%D7%98%D7%9C%D7%99%D7%AA%20%D7%AA%D7%A4%D7%99%D7%9C%D7%99%D7%9F', fallback: '#1a2744' },
  ] as { name: string; emoji: string; img: string; href: string; fallback?: string }[], [catImages]);

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
        background: '#F8F6F1',
        fontFamily: "'Heebo', Arial, sans-serif",
        overflowX: 'hidden',
        maxWidth: '100vw',
      }}
    >
      <style>{`
        .ys-hero-clip { height: 500px; }
        .ys-cats-section { min-height: 560px; }
        .ys-cats-grid { grid-template-columns: repeat(3, 1fr); min-height: 300px; }
        .ys-quotes-grid { grid-template-columns: repeat(2, 1fr); }
        @media (max-width: 767px) {
          .ys-hero-clip { height: 260px; }
          .ys-cats-section { min-height: 700px; }
          .ys-cats-grid { grid-template-columns: repeat(2, 1fr); min-height: 450px; }
          .ys-quotes-grid { grid-template-columns: 1fr; }
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
            <div style={{ background: '#1E3A8A', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                <div style={{ height: '100%', width: `${((wizardStep + 1) / 3) * 100}%`, background: '#C5A028', transition: 'width 0.4s ease' }} />
              </div>
            )}
            <div style={{ padding: 24 }}>
              {wizardStep === 0 && (
                <>
                  <p style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>למי זה מיועד?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[{ val: 'self' as const, label: '👤 לי עצמי' }, { val: 'gift' as const, label: '🎁 מתנה לאחר' }].map(opt => (
                      <button key={opt.val} onClick={() => { setWizardFor(opt.val); setWizardStep(1); }}
                        style={{ padding: '18px 12px', borderRadius: 0, border: '2px solid #e0e0e0', background: '#fff', fontSize: 15, fontWeight: 700, color: '#1E3A8A', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#C5A028'; (e.currentTarget as HTMLButtonElement).style.background = '#fffbf0'; }}
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
                        style={{ padding: '14px 18px', borderRadius: 0, border: '2px solid #e0e0e0', background: '#fff', fontSize: 15, fontWeight: 700, color: '#1E3A8A', cursor: 'pointer', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#C5A028'; (e.currentTarget as HTMLButtonElement).style.background = '#fffbf0'; }}
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
                        style={{ padding: '14px 18px', borderRadius: 0, border: '2px solid #e0e0e0', background: '#fff', fontSize: 15, fontWeight: 700, color: '#1E3A8A', cursor: 'pointer', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#C5A028'; (e.currentTarget as HTMLButtonElement).style.background = '#fffbf0'; }}
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
                    <button onClick={() => router.push('/')} style={{ marginTop: 16, background: '#1E3A8A', color: '#fff', border: 'none', borderRadius: 0, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>לכל המוצרים</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                      {wizardResults.map(p => (
                        <div key={p.id} onClick={() => { closeWizard(); router.push(`/product/${p.id}`); }}
                          style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', borderRadius: 0, border: '1px solid #eee', cursor: 'pointer', background: '#fafafa', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#C5A028'; (e.currentTarget as HTMLDivElement).style.background = '#fffbf0'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#eee'; (e.currentTarget as HTMLDivElement).style.background = '#fafafa'; }}>
                          {(p.imgUrl || p.image_url) && (
                            <img src={optimizeCloudinaryUrl(p.imgUrl || p.image_url || '', 100)} alt={p.name} loading="lazy" style={{ width: 60, height: 60, borderRadius: 0, objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A8A', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                            <div style={{ fontSize: 15, fontWeight: 900, color: '#C5A028' }}>{formatPrice(p.price)}</div>
                          </div>
                          <span style={{ color: '#C5A028', fontSize: 18, flexShrink: 0 }}>←</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={closeWizard} style={{ width: '100%', background: '#1E3A8A', color: '#fff', border: 'none', borderRadius: 0, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
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
      <div
        dir="rtl"
        style={{
          position: 'relative',
          minHeight: isMobile ? 420 : 520,
          overflow: 'hidden',
          borderRadius: 0,
          width: '100%',
          marginLeft: 0,
          marginRight: 0,
        }}
      >
        {/* Background video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        >
          <source src="https://res.cloudinary.com/dyxzq3ucy/video/upload/q_auto,f_auto/v1778695037/download_ft8kbz.mp4" type="video/mp4" />
          <source src="https://res.cloudinary.com/dyxzq3ucy/video/upload/v1778695037/download_ft8kbz.mp4" type="video/mp4" />
        </video>

        {/* Overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)', zIndex: 1 }} />

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 2,
          padding: isMobile ? '60px 24px 40px' : '80px 48px 60px',
          minHeight: isMobile ? 420 : 520,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <h1 style={{
            fontSize: isMobile ? 32 : 48,
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.2,
            maxWidth: '90%',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            margin: 0,
          }}>
            היחידים שמראים לך את הסופר
          </h1>

          <p style={{
            fontSize: isMobile ? 16 : 18,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.92)',
            marginTop: 12,
            maxWidth: '85%',
            lineHeight: 1.6,
          }}>
            מזוזות ותפילין מסופרים מוסמכים — עם צילום הקלף, בדיקת מגיה ואחריות מלאה.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
            <a
              href="/category/%D7%A7%D7%9C%D7%A4%D7%99%20%D7%9E%D7%96%D7%95%D7%96%D7%94"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: '#C9A227',
                color: '#1F3D8F',
                height: 52,
                padding: '0 28px',
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 16,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              בחרו מזוזה
            </a>
            <a
              href={`/category/${encodeURIComponent('בר מצווה')}`}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.15)',
                color: '#FFFFFF',
                border: '1.5px solid rgba(255,255,255,0.6)',
                height: 52,
                padding: '0 28px',
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 16,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              סט בר מצווה
            </a>
          </div>
        </div>
      </div>

      {/* ── Smart Funnel ── */}
      <div style={{ background: '#F8F6F1', textAlign: 'center', direction: 'rtl', padding: isMobile ? '4px 0 8px' : '8px 0 12px' }}>
        <p style={{ fontSize: isMobile ? 12 : 13, color: 'rgba(0,0,0,0.45)', margin: 0, padding: '10px 0 6px', fontWeight: 500 }}>
          בחר מה אתה מחפש - נמצא לך את המתאים ביותר
        </p>
        <SmartFunnel isMobile={isMobile} />
      </div>

      {/* ── Live Activity Bar - isolated component, re-renders independently ── */}
      <ActivityBar weeklyProducts={weeklyProducts} isMobile={isMobile} />

      {/* ── Live Counters ── */}
      <div ref={countersRef} style={{ background: '#F8F6F1', padding: isMobile ? '12px 12px' : '16px 24px', borderBottom: '1px solid #f0ece4' }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          background: '#fff',
          padding: isMobile ? '14px 12px' : '20px 24px',
          borderRadius: 14,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid #E7E2D8',
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
            <span style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.3 }}>לקוחות מרוצים</span>
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

      <div dir="rtl" style={{ padding: '28px 20px 22px', maxWidth: 680, margin: '0 auto', textAlign: 'center', fontFamily: "'Frank Ruhl Libre', serif" }}>
        <p style={{ fontSize: isMobile ? 17 : 15, lineHeight: 1.8, color: '#1F2937', fontWeight: 300 }}>
          יש אנשים שמבינים שהדברים הכי חשובים בחיים — הם דווקא אלה שלא תמיד רואים.
        </p>
        <p style={{ fontSize: isMobile ? 17 : 15, lineHeight: 1.8, color: '#1F2937', fontWeight: 300, marginTop: 12 }}>
          מזוזה ותפילין הם לא עוד מוצר.<br/>
          הם הקדושה והברכה שנכנסת לבית שלך, והחיבור השקט שלך לדבר אמיתי וגדול יותר.
        </p>
      </div>

      {/* ── 4. Category grid ── */}
      <div id="categories" style={{ background: '#F8F6F1', padding: isMobile ? '28px 20px' : '40px 24px', direction: 'rtl' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#1F2937', marginBottom: 8 }}>קטגוריות נבחרות</h2>
          <p style={{ textAlign: 'center', fontSize: 15, color: '#6B7280', marginBottom: 24 }}>גלה עוד מגוון מוצרים</p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: isMobile ? 12 : 20,
          }}>
            {([
              categoryGridItems.find(c => c.name === 'קלף מזוזה'),
              categoryGridItems.find(c => c.name === 'תפילין קומפלט'),
              { name: 'סט בר מצווה', emoji: '✡️', img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1777989198/fqm7twz1berprum03u7u.png', href: '/category/%D7%91%D7%A8%20%D7%9E%D7%A6%D7%95%D7%95%D7%94' },
              categoryGridItems.find(c => c.name === 'בתי מזוזה'),
              categoryGridItems.find(c => c.name === 'סט טלית תפילין'),
              categoryGridItems.find(c => c.name === 'יודאיקה'),
            ].filter(Boolean) as { name: string; emoji: string; img: string; href: string; fallback?: string }[]).map(cat => (
              <div key={cat.name}
                onClick={() => router.push(cat.href)}
                style={{
                  borderRadius: 18,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: '#FFFFFF',
                  border: '1px solid #E7E2D8',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.14)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
              >
                <div style={{ height: 160, overflow: 'hidden', position: 'relative' }}>
                  {cat.img ? (
                    <Image fill unoptimized loading="lazy" src={optimizeCloudinaryUrl(cat.img, 400)} alt={cat.name} style={{ objectFit: 'cover' }} sizes="(max-width: 640px) 50vw, 33vw" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, background: cat.fallback ?? '#f3f4f4' }}>{cat.emoji}</div>
                  )}
                </div>
                <div style={{ padding: '12px 16px', background: '#FFFFFF', textAlign: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>{cat.name}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <a
              href="/categories"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: '#FFFFFF',
                border: '1.5px solid #E7E2D8',
                color: '#2446A6',
                borderRadius: 12,
                height: 48,
                padding: '0 28px',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              לכל הקטגוריות ←
            </a>
          </div>
        </div>
      </div>

      {/* ── Collections section ── */}
      <div style={{ background: '#1E3A8A', padding: isMobile ? '36px 16px' : '52px 16px', direction: 'rtl' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#C5A028', letterSpacing: '0.15em', textAlign: 'center', marginBottom: 8 }}>COLLECTIONS</p>
          <h2 style={{ textAlign: 'center', fontSize: isMobile ? 20 : 28, fontWeight: 900, color: '#fff', marginBottom: 8 }}>הקולקציות שלנו</h2>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>שישה קוים עיצוביים — מצאו את הסגנון שמדבר אליכם</p>

          {/* Horizontal scroll on mobile, grid on desktop */}
          <div style={isMobile
            ? { display: 'flex', overflowX: 'auto', gap: 12, paddingBottom: 8, scrollbarWidth: 'none' } as React.CSSProperties
            : { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14 }
          }>
            {[
              { id: 'יהלום',  tagline: 'הקו השקוף והמודרני',     dot: '#87CEEB', href: '/category/מזוזות?collection=יהלום',                     img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_600,q_auto,f_auto/v1777919873/1777913222083_ibossf.png' },
              { id: 'ישפה',   tagline: 'הקו האומנותי והצבעוני',  dot: 'rainbow', href: '/category/כלי שולחן והגשה?collection=ישפה',             img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_600,q_auto,f_auto/v1777919874/1777919845235_zcbze1.png' },
              { id: 'ברקת',   tagline: 'הקו החגיגי והיוקרתי',    dot: '#15803d', href: '/category/כלי שולחן והגשה?collection=ברקת',             img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_600,q_auto,f_auto/v1777919875/1777919689931_fkb8c6.png' },
              { id: 'תרשיש',  tagline: 'הקו הזהוב והמאיר',       dot: '#b45309', href: '/category/יודאיקה?collection=תרשיש',                     img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_600,q_auto,f_auto/v1777919932/1777919910394_olu4mi.png' },
              { id: 'ספיר',   tagline: 'הקו המתכתי והקריר',      dot: '#94a3b8', href: '/category/יודאיקה?collection=ספיר',                      img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_600,q_auto,f_auto/v1777919875/1777919702083_vflhuc.png' },
              { id: 'שוהם',   tagline: 'הקו הטבעי והכהה',        dot: '#78350f', href: '/category/מזוזות?collection=שוהם',                       img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_600,q_auto,f_auto/v1777920809/1777920771814_vikmum.png' },
            ].map(col => (
              <a
                key={col.id}
                href={col.href}
                style={{
                  textDecoration: 'none',
                  display: 'block',
                  flexShrink: 0,
                  width: isMobile ? 160 : 'auto',
                  backgroundImage: `url(${col.img})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 0,
                  padding: '18px 16px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: isMobile ? 140 : 160,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none'; }}
              >
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 0 }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
                      background: col.dot === 'rainbow'
                        ? 'linear-gradient(135deg,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6)'
                        : col.dot,
                    }} />
                    <span style={{ fontSize: isMobile ? 16 : 17, fontWeight: 900, color: '#fff' }}>{col.id}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>{col.tagline}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', margin: '10px 0 0' }}>לצפייה ←</p>
                </div>
              </a>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <a href="/collections" style={{ display: 'inline-block', border: '1.5px solid rgba(184,151,42,0.5)', color: '#C5A028', background: 'none', padding: '10px 28px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              לכל הקולקציות ←
            </a>
          </div>
        </div>
      </div>

      {/* ── 5. Featured products horizontal scroll ── */}
      <div style={{ minHeight: isMobile ? 290 : 330 }}>
      {featuredProducts.length > 0 && (
        <div style={{ background: '#F8F6F1', padding: isMobile ? '24px 0' : '32px 0', direction: 'rtl' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px', marginBottom: 14 }}>
            <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: '#111111', margin: 0 }}>המוצרים הנמכרים ביותר</h2>
          </div>
          <div style={{ display: 'flex', overflowX: 'auto', gap: 12, padding: '0 16px 8px', scrollbarWidth: 'none' } as React.CSSProperties}>
            {featuredProducts.map(p => {
              const imgSrc = optimizeCloudinaryUrl(p.imgUrl || p.image_url || '', 300);
              return (
                <div key={p.id}
                  style={{ width: 160, flexShrink: 0, cursor: 'pointer', background: '#fff', borderRadius: 0, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                  onClick={() => router.push(`/product/${p.id}`)}
                >
                  <div style={{ height: 140, overflow: 'hidden', position: 'relative' }}>
                    {imgSrc ? (
                      <Image fill unoptimized loading="lazy" src={imgSrc} alt={p.name} style={{ objectFit: 'cover' }} sizes="160px" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 32, color: '#ccc' }}>📦</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '8px 10px 10px' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#1E3A8A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{p.name}</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#C5A028', marginBottom: 8 }}>{formatPrice(p.price)}</p>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        addItem({ id: p.id, name: p.name, price: p.price, imgUrl: p.imgUrl, image_url: p.image_url, quantity: 1 });
                      }}
                      style={{ background: '#C5A028', color: '#1E3A8A', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, padding: '4px 10px', cursor: 'pointer', width: '100%' }}
                    >
                      הוסף לסל
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>

      {/* ── Shop All CTA ── */}
      <div style={{ background: '#F8F6F1', padding: isMobile ? '16px 16px 24px' : '20px 16px 32px', textAlign: 'center' }}>
        <a
          href="/category"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', color: '#2446A6', border: '1.5px solid #E7E2D8', borderRadius: 12, height: 48, padding: '0 32px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
        >
          לכל המוצרים ←
        </a>
      </div>

      {/* ── Soferim CTA ── */}
      <div style={{ background: '#F8F6F1', padding: isMobile ? '20px 16px 32px' : '24px 16px 40px', direction: 'rtl', textAlign: 'center' }}>
        <button
          onClick={() => router.push('/soferim')}
          style={{
            background: '#C9A227',
            color: '#1F3D8F',
            fontWeight: 800,
            fontSize: 15,
            padding: '0 48px',
            height: 52,
            borderRadius: 14,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          לצפייה במאגר הסופרים שלנו ←
        </button>
      </div>

      <div dir="rtl" style={{ padding: '16px 20px', background: '#F5F2EC', margin: '0', fontFamily: "'Frank Ruhl Libre', serif" }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: isMobile ? 17 : 15, lineHeight: 1.8, color: '#1F2937', fontWeight: 300 }}>
            כי קל להשקיע במה שמרשים אחרים.
          </p>
          <p style={{ fontSize: isMobile ? 17 : 15, lineHeight: 1.8, color: '#1F2937', fontWeight: 300, marginTop: 12 }}>
            אבל אנשים עם יראת שמים אמיתית משקיעים גם בדברים שנמצאים בתוך המזוזה שעל הדלת — אפילו שאף אחד אחר לא יראה אותם לעולם.
          </p>
          <p style={{ fontSize: isMobile ? 17 : 15, lineHeight: 1.8, color: '#1F2937', fontWeight: 500, marginTop: 20 }}>
            אלו אנשים שלא מחפשים "בערך".<br/>
            הם מחפשים אמת, דיוק ואמון.
          </p>
          <p style={{ fontSize: isMobile ? 17 : 15, lineHeight: 1.8, color: '#1F2937', fontWeight: 300, marginTop: 16 }}>
            לכן הקמנו את Your Sofer — לאנשים שמבינים את החשיבות של סת״מ מהודר, רוצים לדעת בדיוק:<br/>
            מי כתב את הקלף שלהם, מי בדק אותו, ושרוצים לדעת שיש על מי לסמוך.
          </p>
        </div>
      </div>

      {/* ── 6. More categories horizontal scroll ── */}
      <div style={{ background: '#F8F6F1', padding: isMobile ? '24px 0' : '32px 0', direction: 'rtl' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>
          <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: '#111111', marginBottom: 14 }}>עוד קטגוריות</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '0 12px' }}>
          {MORE_CAT_DEFS.map(cat => {
            const img = catImages[cat.slug] ? optimizeCloudinaryUrl(catImages[cat.slug], 300) : '';
            return (
              <div key={cat.slug}
                onClick={() => router.push(`/category/${encodeURIComponent(cat.slug)}`)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ height: 100, width: '100%', borderRadius: 0, overflow: 'hidden', background: img ? '#000' : '#e8e4dc', position: 'relative' }}>
                  {img ? (
                    <Image fill unoptimized loading="lazy" src={img} alt={cat.slug} style={{ objectFit: 'cover' }} sizes="130px" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>{cat.emoji}</div>
                  )}
                </div>
                <p style={{ fontSize: 11, textAlign: 'center', color: '#1E3A8A', fontWeight: 600, marginTop: 6 }}>{cat.slug}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Rabbinical Supervision ── */}
      <RabbinicalSupervision isMobile={isMobile} />

      {/* ── Why Your Sofer trust block ── */}
      <div style={{ background: '#F8F6F1', padding: isMobile ? '28px 16px' : '40px 24px', direction: 'rtl' }}>
        <div style={{
          maxWidth: 680, margin: '0 auto',
          background: '#EEF3FF',
          borderRadius: 22,
          padding: isMobile ? '32px 20px' : '40px 36px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: isMobile ? 26 : 26, fontWeight: 800, color: '#1F2937', marginBottom: 24, lineHeight: 1.4 }}>
            רוב האנשים לא יודעים מי כתב את המזוזה שלהם — אבל אצלנו:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'right' }}>
            {[
              'כל קלף מצולם ומאומת לפני מכירה',
              'בדיקת מגיה מוסמך לכל מוצר',
              'ניתן לתקשר ישירות עם הסופר סת"מ',
              'ניתן לבחור קלף ספציפי',
              'כל סופר עובר אצלנו אבחון',
            ].map(row => (
              <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', border: '1px solid #E7E2D8', borderRadius: 12, padding: '14px 16px' }}>
                <span style={{ color: '#C9A227', fontSize: 16, flexShrink: 0, fontWeight: 900 }}>✓</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1F2937' }}>{row}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div dir="rtl" style={{ padding: '34px 20px 22px', maxWidth: 720, margin: '0 auto', textAlign: 'center', fontFamily: "'Frank Ruhl Libre', serif" }}>
        <h2 style={{ fontSize: isMobile ? 28 : 32, fontWeight: 600, color: '#1F2937', marginBottom: 16, lineHeight: 1.4, fontFamily: "'Cormorant Garamond', serif" }}>
          הקמנו את Your Sofer.
        </h2>
        <p style={{ fontSize: isMobile ? 17 : 15, lineHeight: 1.8, color: '#1F2937', fontWeight: 300 }}>
          מקום שמאפשר לך לקנות סת״מ בצורה אחרת.
        </p>
        <p style={{ fontSize: isMobile ? 17 : 15, lineHeight: 1.8, color: '#1F2937', fontWeight: 300, marginTop: 14 }}>
          לראות את הקלף האמיתי.<br/>
          להכיר את הסופר שכתב אותו.<br/>
          לקבל תיעוד, בדיקה ושקיפות מלאה — ברמה שלא הייתה קיימת עד היום בעולם הסת״מ.
        </p>
        <p style={{ fontSize: isMobile ? 17 : 16, lineHeight: 1.8, color: '#1F2937', fontWeight: 500, marginTop: 20, fontStyle: 'italic' }}>
          כי כשמדובר בדברים שמלווים את החיים עצמם —<br/>
          לא מתפשרים על הדבר האמיתי.
        </p>
      </div>

      {/* ── Static Social Proof ── */}
      <div style={{ background: '#F8F6F1', padding: isMobile ? '36px 20px' : '52px 24px', direction: 'rtl' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#1F2937', marginBottom: 8 }}>
            מה הלקוחות אומרים
          </h2>
          <p style={{ textAlign: 'center', fontSize: 15, color: '#6B7280', marginBottom: 32 }}>אלפי לקוחות מרוצים ברחבי הארץ</p>
          <div className="ys-quotes-grid" style={{ display: 'grid', gap: 16 }}>
            {STATIC_QUOTES.slice(0, 3).map((q, i) => (
              <div key={i} style={{
                background: '#FFFFFF',
                border: '1px solid #E7E2D8',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
                <div style={{ marginBottom: 10, display: 'flex', gap: 2 }}>
                  {Array.from({ length: q.stars }).map((_, si) => (
                    <span key={si} style={{ color: '#C9A227', fontSize: 16 }}>★</span>
                  ))}
                </div>
                <p style={{ fontSize: 15, color: '#4B5563', lineHeight: 1.6, marginBottom: 16, fontStyle: 'italic' }}>
                  &ldquo;{q.text}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#2446A6', fontWeight: 700, fontSize: 14 }}>{q.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>{q.name}</div>
                    <div style={{ fontSize: 13, color: '#6B7280' }}>{q.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <a
              href="/reviews"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: '#FFFFFF',
                border: '1.5px solid #E7E2D8',
                color: '#2446A6',
                borderRadius: 12,
                height: 48,
                padding: '0 28px',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              לכל הביקורות ←
            </a>
          </div>
        </div>
      </div>

      {/* ── Testimonials carousel - self-contained timer ── */}
      <div style={{ minHeight: 450 }}>
        {testimonials.length > 0 && (
          <TestimonialsCarousel
            testimonials={testimonials}
            isMobile={isMobile}
          />
        )}
      </div>

    </div>
  );
}
