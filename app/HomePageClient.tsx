'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, getDoc, addDoc, serverTimestamp, getCountFromServer,
} from 'firebase/firestore';
import { db } from './firebase';
const HERO_PLACEHOLDER = 'https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto:good,w_1200/v1777032728/WhatsApp_Image_2026-03-08_at_13.20.41_2_alfat3_h4q3ap_xkykpw.jpg';
const HeroSwiper = dynamic(() => import('./components/HeroSwiper'), {
  loading: () => (
    <div style={{ background: '#FFFFFF', padding: '12px 0' }}>
      <div
        className="h-[260px] md:h-[360px]"
        style={{
          width: '92%', margin: '0 auto', borderRadius: 0, overflow: 'hidden',
          backgroundImage: `url(${HERO_PLACEHOLDER})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}
      />
    </div>
  ),
});
import SmartHero from './components/SmartHero';
import SmartFunnel from './components/SmartFunnel';
import ProductCard from '@/components/ui/ProductCard';

const NewsletterPopup   = dynamic(() => import('./components/NewsletterPopup'),       { ssr: false, loading: () => <div className="hidden" /> });
const TestimonialsCarousel = dynamic(() => import('./components/TestimonialsCarousel'), { ssr: false, loading: () => <div className="hidden" /> });
import { useShaliach } from './contexts/ShaliachContext';
import { useCart }     from './contexts/CartContext';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import {
  CARDS, ALL_CATS, CONFIG_COLLECTION, CONFIG_DOC, slotKey,
} from './constants/homepageCards';
import type { CardDef, SubItem } from './constants/homepageCards';

// Activity bar icons
function IconActivityCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconActivityPen() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
function IconActivityBox() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IconActivityUsers() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function IconActivityShield() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

// Counter icons
function IconCounterPen({ isMobile }: { isMobile: boolean }) {
  return (
    <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
function IconCounterBox({ isMobile }: { isMobile: boolean }) {
  return (
    <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IconCounterCheck({ isMobile }: { isMobile: boolean }) {
  return (
    <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconCounterStar({ isMobile }: { isMobile: boolean }) {
  return (
    <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="#b8972a" stroke="none">
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
        style={{ fontSize: 17, fontWeight: 900, color: '#0c1a35', lineHeight: 1.2 }}
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
        style={{ fontSize: 13, fontWeight: 700, color: '#b8972a' }}
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

// ── Static data (outside component — never re-created on render) ───────────────

const STATIC_QUOTES = [
  { name: 'מיכל כהן',    city: 'תל אביב',  stars: 5, text: 'הזמנתי מזוזה לבית החדש — קיבלתי תמונה של הקלף לפני המשלוח. לא ציפיתי לרמת שירות כזו.' },
  { name: 'יוסף לוי',    city: 'ירושלים',  stars: 5, text: 'קניתי תפילין לבן שלי לבר מצווה. הסופר פנה אלינו אישית כדי לוודא שהכל מתאים. מרגש.' },
  { name: 'שרה אברמוב',  city: 'חיפה',     stars: 5, text: 'מתנה לאמא שלי — היא בכתה מרוב שמחה. האריזה הייתה מהודרת ותעודת הכשרות נתנה לה ביטחון.' },
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

// ── Activity bar — owns its own timer, never re-renders the parent ─────────────

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

  const weeklyVisitors = 134 + ((new Date().getDate() * 7) % 83);
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
  const [imagesReady, setImagesReady] = useState(false);
  const [wizardOpen, setWizardOpen]   = useState(false);
  const [weeklyProducts, setWeeklyProducts] = useState(0);
  const [soferimCount, setSoferimCount]     = useState(0);
  const [productsCount, setProductsCount]   = useState(0);
  const countersRef = useRef<HTMLDivElement>(null);
  const [countersVisible, setCountersVisible] = useState(false);

  // DOM refs for counter animation — avoids 72 React re-renders per second
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

  // ── Resize — debounced 150 ms so mobile touch events don't saturate the thread
  useEffect(() => {
    function update() { setIsMobile(window.innerWidth < 768); }
    update();
    let timer: ReturnType<typeof setTimeout>;
    function onResize() { clearTimeout(timer); timer = setTimeout(update, 150); }
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
            const key = (r.slug || r.name || '') as string;
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
          query(collection(db, 'products'), where('isBestSeller', '==', true), limit(16)),
        );
        const bestSellers = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter((p: Product) => p.hidden !== true && (p as any).status !== 'inactive');
        if (bestSellers.length >= 4) {
          setFeaturedProducts(bestSellers.slice(0, 8));
          return;
        }
        const fallbackSnap = await getDocs(
          query(collection(db, 'products'), orderBy('priority', 'desc'), limit(24)),
        );
        const all = fallbackSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter((p: Product) => p.hidden !== true && (p as any).status !== 'inactive');
        setFeaturedProducts(all.slice(0, 8));
      } catch { /* non-fatal */ }
    }

    Promise.all([
      fetchPinnedImages().then(pinned => setSlotImages(pinned)),
      fetchCatImages(),
    ]).finally(() => setImagesReady(true));

    fetchFeaturedProducts();
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
    fetchTestimonials();
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
    fetchCounts();
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

  // Counter animation — writes directly to DOM refs, zero React re-renders
  useEffect(() => {
    if (!countersVisible) return;
    const targets = { soferim: soferimCount || 12, products: productsCount || 180, customers: 247 };
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
    }, 20000);
    return () => clearTimeout(timer);
  }, []);

  // ── Memoized arrays that depend on catImages ───────────────────────────────

  const categoryGridItems = useMemo(() => [
    { name: 'מזוזות',          emoji: '📜', img: catImages['מזוזות']          || '', href: '/category/%D7%9E%D7%96%D7%95%D7%96%D7%95%D7%AA' },
    { name: 'תפילין קומפלט',  emoji: '🖊️', img: catImages['תפילין קומפלט']  || '', href: '/category/%D7%AA%D7%A4%D7%99%D7%9C%D7%99%D7%9F%20%D7%A7%D7%95%D7%9E%D7%A4%D7%9C%D7%98' },
    { name: 'מגילות',          emoji: '📖', img: catImages['מגילות']          || '', href: '/category/%D7%9E%D7%92%D7%99%D7%9C%D7%95%D7%AA' },
    { name: 'יודאיקה',         emoji: '✡️', img: catImages['יודאיקה']         || '', href: '/category/%D7%99%D7%95%D7%93%D7%90%D7%99%D7%A7%D7%94' },
    { name: 'נטלות וכלים',    emoji: '🫙', img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1776283325/eolm1mte2d2q1zjaijsn.png', href: '/category/%D7%99%D7%95%D7%93%D7%90%D7%99%D7%A7%D7%94?filter=%D7%A0%D7%98%D7%99%D7%9C%D7%AA%20%D7%99%D7%93%D7%99%D7%99%D7%9D' },
    { name: 'שבתות וחגים',    emoji: '🕯️', img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1776635301/lsgvbw3tbwfbnv626xv7_ebthks.png', href: '/category/%D7%A9%D7%91%D7%AA%D7%95%D7%AA%20%D7%95%D7%97%D7%92%D7%99%D7%9D' },
    { name: 'קלף מזוזה',       emoji: '📜', img: catImages['קלפי מזוזה']      || '', href: '/category/%D7%A7%D7%9C%D7%A4%D7%99%20%D7%9E%D7%96%D7%95%D7%96%D7%94',       fallback: '#1a2744' },
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
        background: '#ffffff',
        fontFamily: "'Heebo', Arial, sans-serif",
        overflowX: 'hidden',
        maxWidth: '100vw',
      }}
    >

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
            <div style={{ background: '#0c1a35', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, color: '#b8972a', fontWeight: 700, marginBottom: 2 }}>
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
                <div style={{ height: '100%', width: `${((wizardStep + 1) / 3) * 100}%`, background: '#b8972a', transition: 'width 0.4s ease' }} />
              </div>
            )}
            <div style={{ padding: 24 }}>
              {wizardStep === 0 && (
                <>
                  <p style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>למי זה מיועד?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[{ val: 'self' as const, label: '👤 לי עצמי' }, { val: 'gift' as const, label: '🎁 מתנה לאחר' }].map(opt => (
                      <button key={opt.val} onClick={() => { setWizardFor(opt.val); setWizardStep(1); }}
                        style={{ padding: '18px 12px', borderRadius: 0, border: '2px solid #e0e0e0', background: '#fff', fontSize: 15, fontWeight: 700, color: '#0c1a35', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#b8972a'; (e.currentTarget as HTMLButtonElement).style.background = '#fffbf0'; }}
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
                        style={{ padding: '14px 18px', borderRadius: 0, border: '2px solid #e0e0e0', background: '#fff', fontSize: 15, fontWeight: 700, color: '#0c1a35', cursor: 'pointer', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#b8972a'; (e.currentTarget as HTMLButtonElement).style.background = '#fffbf0'; }}
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
                        style={{ padding: '14px 18px', borderRadius: 0, border: '2px solid #e0e0e0', background: '#fff', fontSize: 15, fontWeight: 700, color: '#0c1a35', cursor: 'pointer', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#b8972a'; (e.currentTarget as HTMLButtonElement).style.background = '#fffbf0'; }}
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
                    <button onClick={() => router.push('/')} style={{ marginTop: 16, background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 0, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>לכל המוצרים</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                      {wizardResults.map(p => (
                        <div key={p.id} onClick={() => { closeWizard(); router.push(`/product/${p.id}`); }}
                          style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', borderRadius: 0, border: '1px solid #eee', cursor: 'pointer', background: '#fafafa', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#b8972a'; (e.currentTarget as HTMLDivElement).style.background = '#fffbf0'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#eee'; (e.currentTarget as HTMLDivElement).style.background = '#fafafa'; }}>
                          {(p.imgUrl || p.image_url) && (
                            <img src={optimizeCloudinaryUrl(p.imgUrl || p.image_url || '', 100)} alt={p.name} loading="lazy" style={{ width: 60, height: 60, borderRadius: 0, objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#0c1a35', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                            <div style={{ fontSize: 15, fontWeight: 900, color: '#b8972a' }}>₪{p.price?.toLocaleString('he-IL')}</div>
                          </div>
                          <span style={{ color: '#b8972a', fontSize: 18, flexShrink: 0 }}>←</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={closeWizard} style={{ width: '100%', background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 0, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
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

      {/* ── 1. SmartHero ── */}
      <SmartHero
        isMobile={isMobile}
        onScrollToProducts={() => cardsRef.current?.scrollIntoView({ behavior: 'smooth' })}
      />

      {/* ── Smart Funnel ── */}
      <div style={{ background: '#FFFFFF', textAlign: 'center', direction: 'rtl', padding: isMobile ? '4px 0 8px' : '8px 0 12px' }}>
        <p style={{ fontSize: isMobile ? 12 : 13, color: 'rgba(0,0,0,0.45)', margin: 0, padding: '10px 0 6px', fontWeight: 500 }}>
          בחר מה אתה מחפש — נמצא לך את המתאים ביותר
        </p>
        <SmartFunnel isMobile={isMobile} />
      </div>

      {/* ── Live Activity Bar — isolated component, re-renders independently ── */}
      <ActivityBar weeklyProducts={weeklyProducts} isMobile={isMobile} />

      {/* ── Live Counters ── */}
      <div ref={countersRef} style={{ background: '#FFFFFF', padding: isMobile ? '16px 12px' : '20px 24px', borderBottom: '1px solid #f0ece4' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: isMobile ? '14px 8px' : '16px 12px', background: '#fafaf8', borderRadius: 0, border: '1.5px solid #ede8df', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#b8972a', display: 'flex', alignItems: 'center' }}><IconCounterBox isMobile={isMobile} /></span>
              <span ref={productsValRef} style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, color: '#b8972a', lineHeight: 1 }}>0+</span>
            </div>
            <span style={{ fontSize: isMobile ? 11 : 12, color: '#0c1a35', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>מוצרים באתר</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: isMobile ? '14px 8px' : '16px 12px', background: '#fafaf8', borderRadius: 0, border: '1.5px solid #ede8df', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#b8972a', display: 'flex', alignItems: 'center' }}><IconCounterPen isMobile={isMobile} /></span>
              <span ref={soferimValRef} style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, color: '#b8972a', lineHeight: 1 }}>0</span>
            </div>
            <span style={{ fontSize: isMobile ? 11 : 12, color: '#0c1a35', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>סופרים מאושרים</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: isMobile ? '14px 8px' : '16px 12px', background: '#fafaf8', borderRadius: 0, border: '1.5px solid #ede8df', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#b8972a', display: 'flex', alignItems: 'center' }}><IconCounterCheck isMobile={isMobile} /></span>
              <span ref={customersValRef} style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, color: '#b8972a', lineHeight: 1 }}>0+</span>
            </div>
            <span style={{ fontSize: isMobile ? 11 : 12, color: '#0c1a35', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>לקוחות מרוצים</span>
          </div>
        </div>
        {/* Rating row */}
        <div style={{ maxWidth: 900, margin: '10px auto 0', textAlign: 'center' }}>
          <span style={{ fontSize: isMobile ? 15 : 17, color: '#c8962a', letterSpacing: 2 }}>★★★★★</span>
          <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: '#c8962a', marginRight: 6 }}>4.8</span>
          <span style={{ fontSize: isMobile ? 11 : 12, color: '#888', fontWeight: 500 }}>דירוג ממוצע</span>
        </div>
      </div>

      {/* ── 4. Category grid ── */}
      <div style={{ background: '#FFFFFF', padding: isMobile ? '28px 12px' : '40px 16px', direction: 'rtl' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: isMobile ? 20 : 26, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>קטגוריות נבחרות</h2>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginBottom: 24 }}>גלו את מגוון מוצרי הסת&quot;מ שלנו</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 12 }}
            className="md:grid-cols-3 lg:grid-cols-6">
            {categoryGridItems.map(cat => (
              <div key={cat.name}
                onClick={() => router.push(cat.href)}
                style={{
                  borderRadius: 0, overflow: 'hidden', cursor: 'pointer',
                  background: '#fff',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.14)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)'; }}
              >
                <div style={{ height: isMobile ? 180 : 220, overflow: 'hidden', borderRadius: 0, position: 'relative' }}>
                  {cat.img ? (
                    <Image fill loading="lazy" src={optimizeCloudinaryUrl(cat.img, 400)} alt={cat.name} style={{ objectFit: 'cover' }} sizes="(max-width: 640px) 50vw, 220px" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, background: cat.fallback ?? '#f3f4f4', borderRadius: 0 }}>{cat.emoji}</div>
                  )}
                </div>
                <div style={{ padding: 10, background: '#fff', textAlign: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0c1a35' }}>{cat.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. Featured products horizontal scroll ── */}
      {featuredProducts.length > 0 && (
        <div style={{ background: '#FFFFFF', padding: isMobile ? '24px 0' : '32px 0', direction: 'rtl' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: '#0c1a35', margin: 0 }}>המוצרים הנמכרים ביותר</h2>
            <button
              onClick={() => router.push('/category/יודאיקה')}
              style={{ background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 0, padding: isMobile ? '9px 18px' : '10px 22px', fontSize: isMobile ? 13 : 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              צפה במוצרים הנמכרים ביותר ←
            </button>
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
                      <Image fill loading="lazy" src={imgSrc} alt={p.name} style={{ objectFit: 'cover' }} sizes="160px" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 32, color: '#ccc' }}>📦</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '8px 10px 10px' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#0c1a35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{p.name}</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#b8972a', marginBottom: 8 }}>₪{p.price?.toLocaleString('he-IL')}</p>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        addItem({ id: p.id, name: p.name, price: p.price, imgUrl: p.imgUrl, image_url: p.image_url, quantity: 1 });
                      }}
                      style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 0, fontSize: 11, fontWeight: 700, padding: '4px 10px', cursor: 'pointer', width: '100%' }}
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

      {/* ── Shop All CTA ── */}
      <div style={{ background: '#FFFFFF', padding: isMobile ? '16px 16px 24px' : '20px 16px 32px', textAlign: 'center' }}>
        <a
          href="/category/יודאיקה"
          style={{ display: 'inline-block', background: '#0c1a35', color: '#fff', borderRadius: 0, padding: isMobile ? '12px 32px' : '14px 40px', fontSize: isMobile ? 15 : 17, fontWeight: 900, textDecoration: 'none' }}
        >
          לכל המוצרים ←
        </a>
      </div>

      {/* ── Clear Path CTA ── */}
      <div style={{ background: '#FFFFFF', padding: isMobile ? '32px 16px' : '40px 16px', direction: 'rtl', textAlign: 'center' }}>
        <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: '#0c1a35', marginBottom: 8 }}>לא בטוח מה לבחור?</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>בחר לפי מה שאתה מחפש — נמצא לך את המתאים ביותר</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {CLEAR_PATH_ITEMS.map(item => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              style={{
                background: '#0c1a35',
                color: '#fff',
                border: 'none',
                borderRadius: 0,
                padding: isMobile ? '12px 22px' : '13px 28px',
                fontSize: isMobile ? 14 : 15,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1a2d50'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#0c1a35'; }}
            >
              {item.label} ←
            </button>
          ))}
        </div>
      </div>

      {/* ── 6. More categories horizontal scroll ── */}
      <div style={{ background: '#FFFFFF', padding: isMobile ? '24px 0' : '32px 0', direction: 'rtl' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>
          <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: '#0c1a35', marginBottom: 14 }}>עוד קטגוריות</h2>
        </div>
        <div style={{ display: 'flex', overflowX: 'auto', gap: 10, padding: '0 12px 8px', scrollbarWidth: 'none' } as React.CSSProperties}>
          {MORE_CAT_DEFS.map(cat => {
            const img = catImages[cat.slug] ? optimizeCloudinaryUrl(catImages[cat.slug], 300) : '';
            return (
              <div key={cat.slug}
                onClick={() => router.push(`/category/${encodeURIComponent(cat.slug)}`)}
                style={{ width: 130, flexShrink: 0, cursor: 'pointer' }}
              >
                <div style={{ height: 100, width: '100%', borderRadius: 0, overflow: 'hidden', background: img ? '#000' : '#e8e4dc', position: 'relative' }}>
                  {img ? (
                    <Image fill loading="lazy" src={img} alt={cat.slug} style={{ objectFit: 'cover' }} sizes="130px" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>{cat.emoji}</div>
                  )}
                </div>
                <p style={{ fontSize: 11, textAlign: 'center', color: '#0c1a35', fontWeight: 600, marginTop: 6 }}>{cat.slug}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Static Social Proof ── */}
      <div style={{ background: '#FFFFFF', padding: isMobile ? '36px 16px' : '52px 16px', direction: 'rtl' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: isMobile ? 20 : 26, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>
            לקוחות שכבר קנו — מה הם אומרים
          </h2>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#999', marginBottom: 32 }}>ביקורות אמיתיות מלקוחות אמיתיים</p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: 16,
          }}>
            {STATIC_QUOTES.map((q, i) => (
              <div key={i} style={{
                background: '#fff',
                border: '1px solid #ebebeb',
                borderRadius: 0,
                padding: isMobile ? '18px 16px' : '22px 24px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}>
                <div style={{ marginBottom: 10, display: 'flex', gap: 2 }}>
                  {Array.from({ length: q.stars }).map((_, si) => (
                    <span key={si} style={{ color: '#e6a817', fontSize: 15 }}>★</span>
                  ))}
                </div>
                <p style={{ fontSize: 13, color: '#444', lineHeight: 1.75, marginBottom: 14, fontStyle: 'italic' }}>
                  &ldquo;{q.text}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0c1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#b8972a', fontWeight: 900, fontSize: 14 }}>{q.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0c1a35' }}>{q.name}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>{q.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Testimonials carousel — self-contained timer ── */}
      {testimonials.length > 0 && (
        <TestimonialsCarousel
          testimonials={testimonials}
          isMobile={isMobile}
        />
      )}

    </div>
  );
}
