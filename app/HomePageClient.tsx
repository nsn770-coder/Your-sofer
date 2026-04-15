'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, getDoc, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import SmartHero from './components/SmartHero';
import ProductCard from '@/components/ui/ProductCard';
import { useShaliach } from './contexts/ShaliachContext';
import {
  CARDS, ALL_CATS, CONFIG_COLLECTION, CONFIG_DOC, slotKey,
} from './constants/homepageCards';
import type { CardDef, SubItem } from './constants/homepageCards';

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
}

// ── Sub-image slot ─────────────────────────────────────────────────────────────

function SubSlot({ imgUrl, label, href }: { imgUrl: string; label: string; href: string }) {
  return (
    <Link href={href} className="block group">
      <div
        className="relative aspect-square rounded-md overflow-hidden bg-gray-100 mb-1.5"
        style={{ borderRadius: 6 }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={label}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          // Placeholder: gray box with the first Hebrew letter
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
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        padding: 16,
        height: '100%',
      }}
    >
      {/* Title */}
      <h3
        className="text-right mb-3"
        style={{ fontSize: 17, fontWeight: 900, color: '#0c1a35', lineHeight: 1.2 }}
      >
        {card.title}
      </h3>

      {/* 2×2 subcategory image grid */}
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

      {/* CTA link */}
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
        borderRadius: 8,
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function HomePageClient() {
  const [isMobile, setIsMobile]       = useState(false);
  const [catImages, setCatImages]     = useState<Record<string, string>>({});
  const [slotImages, setSlotImages]   = useState<Record<string, string>>({});
  const [imagesReady, setImagesReady] = useState(false);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [newLoading, setNewLoading]   = useState(true);
  const [sortBy, setSortBy]           = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular'>('newest');
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [wizardOpen, setWizardOpen]   = useState(false);
  // Live bar + counters
  const [activityIdx, setActivityIdx] = useState(0);
  const [weeklyProducts, setWeeklyProducts] = useState(0);
  const [soferimCount, setSoferimCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const countersRef = useRef<HTMLDivElement>(null);
  const [countersVisible, setCountersVisible] = useState(false);
  const [countedValues, setCountedValues] = useState({ soferim: 0, products: 0, customers: 0 });
  const [wizardStep, setWizardStep]   = useState(0);
  const [wizardFor, setWizardFor]     = useState<'self' | 'gift' | null>(null);
  const [wizardBudget, setWizardBudget] = useState<'low' | 'mid' | 'high' | null>(null);
  const [wizardKashrut, setWizardKashrut] = useState<'regular' | 'mehudar' | 'mehudar_plus' | null>(null);
  const [wizardResults, setWizardResults] = useState<Product[]>([]);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [cardWidth, setCardWidth]     = useState(0);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testIdx, setTestIdx]         = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle');
  const [newsletterPopupOpen, setNewsletterPopupOpen] = useState(false);
  const [benefitOpen, setBenefitOpen] = useState<number | null>(null);
  const cardsRef       = useRef<HTMLDivElement>(null); // outer wrap — for scrollIntoView
  const carouselTrack  = useRef<HTMLDivElement>(null); // scrollable track
  const newRef         = useRef<HTMLDivElement>(null);
  const router         = useRouter();
  const { shaliach }   = useShaliach();

  // Mobile detection + carousel card-width computation
  useEffect(() => {
    function update() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (cardsRef.current) {
        const w = cardsRef.current.clientWidth;
        const gap = 16;
        // Desktop: 3 cards exactly. Mobile: 1.5 cards (shows half of next).
        const visible = mobile ? 1.5 : 3;
        setCardWidth((w - gap * (Math.ceil(visible) - 1)) / visible);
      }
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  function scrollCarousel(dir: 'prev' | 'next') {
    const track = carouselTrack.current;
    if (!track || cardWidth === 0) return;
    const amount = cardWidth + 16;
    track.scrollBy({ left: dir === 'next' ? amount : -amount, behavior: 'smooth' });
  }

  // Fetch data: homepage config + cat fallback images + 8 newest products
  useEffect(() => {
    // 1. Load admin-pinned product images from Firestore config
    async function fetchPinnedImages(): Promise<Record<string, string>> {
      try {
        const snap = await getDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC));
        if (!snap.exists()) return {};
        const configMap = snap.data() as Record<string, Record<string, string>>;

        // Collect all unique productIds that are pinned
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

        // Fetch each unique product doc in parallel
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
            } catch { /* skip — slot falls back to catImages */ }
          }),
        );
        return result;
      } catch { return {}; }
    }

    // 2. Read category images from the `categories` collection (admin-managed),
    //    falling back to a product-based query if the collection is empty.
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
      } catch { /* fall through to product-based fallback */ }
      // Fallback: grab first product image per category
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

    async function fetchNewProducts() {
      try {
        const snap = await getDocs(
          query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(16)),
        );
        setNewProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      } catch { /* silently empty */ }
      finally { setNewLoading(false); }
    }

    // Run all in parallel; mark images ready once both image fetches complete
    Promise.all([
      fetchPinnedImages().then(pinned => setSlotImages(pinned)),
      fetchCatImages(),
    ]).finally(() => setImagesReady(true));

    fetchNewProducts();
  }, []);

  // Fetch active testimonials — filter client-side to avoid composite index requirement
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

  // Auto-rotate testimonials every 4 seconds
  useEffect(() => {
    if (testimonials.length < 2) return;
    const timer = setInterval(() => {
      setTestIdx(prev => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  // Fetch live counter data
  useEffect(() => {
    async function fetchCounts() {
      try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const weekTs = { seconds: Math.floor(oneWeekAgo.getTime() / 1000), nanoseconds: 0 };

        const [soferimSnap, productsSnap, weeklySnap] = await Promise.all([
          getDocs(collection(db, 'soferim')),
          getDocs(collection(db, 'products')),
          getDocs(query(collection(db, 'products'), where('createdAt', '>=', weekTs), limit(100))),
        ]);
        setSoferimCount(soferimSnap.size);
        setProductsCount(productsSnap.size);
        setWeeklyProducts(weeklySnap.size);
      } catch { /* non-fatal */ }
    }
    fetchCounts();
  }, []);

  // Activity bar rotation every 4 s + reset when user returns to tab/page
  useEffect(() => {
    setActivityIdx(0); // reset to first message on every mount
    const id = setInterval(() => setActivityIdx(i => i + 1), 4000);
    // Also reset when tab becomes visible again (user switched tabs then returned)
    function onVisible() {
      if (!document.hidden) setActivityIdx(0);
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Count-up animation when counters enter viewport
  useEffect(() => {
    const el = countersRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setCountersVisible(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!countersVisible) return;
    const targets = { soferim: soferimCount || 12, products: productsCount || 180, customers: 247 };
    const duration = 1200;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setCountedValues({
        soferim:   Math.round(targets.soferim   * ease),
        products:  Math.round(targets.products  * ease),
        customers: Math.round(targets.customers * ease),
      });
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [countersVisible, soferimCount, productsCount]);

  // 30-second wizard trigger — once per user (localStorage guard)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('wizard_shown')) return;
    const timer = setTimeout(() => {
      setWizardOpen(true);
      localStorage.setItem('wizard_shown', '1');
    }, 30000);
    return () => clearTimeout(timer);
  }, []);

  // 45-second newsletter popup — once per session (sessionStorage guard)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('newsletter_popup_shown')) return;
    const timer = setTimeout(() => {
      setNewsletterPopupOpen(true);
      sessionStorage.setItem('newsletter_popup_shown', '1');
    }, 45000);
    return () => clearTimeout(timer);
  }, []);

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
          limit(20),
        )
      );
      const candidates: Product[] = [];
      snap.forEach(d => candidates.push({ id: d.id, ...d.data() } as Product));

      // Prefer products whose name/badge matches kashrut keywords
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
        minHeight: '100vh',
        background: '#F5F0E8',
        fontFamily: "'Heebo', Arial, sans-serif",
      }}
    >
      {/* ── Newsletter popup (45 s trigger) ── */}
      {newsletterPopupOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 850, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setNewsletterPopupOpen(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden', direction: 'rtl' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #0c1a35, #1a2d50)', padding: '22px 24px', position: 'relative', textAlign: 'center' }}>
              <button
                onClick={() => setNewsletterPopupOpen(false)}
                style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#b8972a', marginBottom: 4 }}>הצטרפו למועדון הלקוחות</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>קבלו מבצעים ומוצרים חדשים לפני כולם</div>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 24px 28px' }}>
              {newsletterStatus === 'success' ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>נרשמתם בהצלחה!</div>
                  <div style={{ fontSize: 13, color: '#666' }}>נעדכן אתכם ראשונים על מוצרים חדשים ומבצעים.</div>
                  <button
                    onClick={() => setNewsletterPopupOpen(false)}
                    style={{ marginTop: 18, background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 10, padding: '10px 28px', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}
                  >סגור</button>
                </div>
              ) : (
                <form onSubmit={async e => { await handleNewsletter(e); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={e => { setNewsletterEmail(e.target.value); setNewsletterStatus('idle'); }}
                    placeholder="כתובת המייל שלכם"
                    required
                    style={{ border: '2px solid #e0e0e0', borderRadius: 10, padding: '12px 16px', fontSize: 14, outline: 'none', direction: 'rtl', width: '100%', boxSizing: 'border-box' }}
                  />
                  {newsletterStatus === 'duplicate' && (
                    <div style={{ fontSize: 12, color: '#b8972a', fontWeight: 600 }}>כתובת המייל הזו כבר רשומה 😊</div>
                  )}
                  {newsletterStatus === 'error' && (
                    <div style={{ fontSize: 12, color: '#e74c3c', fontWeight: 600 }}>שגיאה בהרשמה, נסו שוב.</div>
                  )}
                  <button
                    type="submit"
                    disabled={newsletterStatus === 'loading'}
                    style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 900, cursor: newsletterStatus === 'loading' ? 'not-allowed' : 'pointer', opacity: newsletterStatus === 'loading' ? 0.7 : 1 }}
                  >
                    {newsletterStatus === 'loading' ? '⏳ שולח...' : '✉️ הצטרפו עכשיו ←'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewsletterPopupOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                  >לא תודה</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Selection Wizard modal ── */}
      {wizardOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.55)' }}
          onClick={closeWizard}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
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

            {/* Progress bar */}
            {wizardStep < 3 && (
              <div style={{ height: 3, background: '#f0f0f0' }}>
                <div style={{ height: '100%', width: `${((wizardStep + 1) / 3) * 100}%`, background: '#b8972a', transition: 'width 0.4s ease' }} />
              </div>
            )}

            <div style={{ padding: 24 }}>

              {/* Step 0 — למי זה מיועד */}
              {wizardStep === 0 && (
                <>
                  <p style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>למי זה מיועד?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[{ val: 'self' as const, label: '👤 לי עצמי' }, { val: 'gift' as const, label: '🎁 מתנה לאחר' }].map(opt => (
                      <button key={opt.val} onClick={() => { setWizardFor(opt.val); setWizardStep(1); }}
                        style={{ padding: '18px 12px', borderRadius: 14, border: '2px solid #e0e0e0', background: '#fff', fontSize: 15, fontWeight: 700, color: '#0c1a35', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#b8972a'; (e.currentTarget as HTMLButtonElement).style.background = '#fffbf0'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e0e0e0'; (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Step 1 — תקציב */}
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
                        style={{ padding: '14px 18px', borderRadius: 14, border: '2px solid #e0e0e0', background: '#fff', fontSize: 15, fontWeight: 700, color: '#0c1a35', cursor: 'pointer', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#b8972a'; (e.currentTarget as HTMLButtonElement).style.background = '#fffbf0'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e0e0e0'; (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}>
                        <span>{opt.label}</span>
                        <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Step 2 — כשרות */}
              {wizardStep === 2 && (
                <>
                  <p style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>רמת כשרות?</p>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {[
                      { val: 'regular'      as const, label: 'רגיל',              sub: 'כשר לכתחילה לפי כל הדעות' },
                      { val: 'mehudar'      as const, label: 'מהודר',             sub: 'רמה גבוהה מעל הרגיל' },
                      { val: 'mehudar_plus' as const, label: 'מהודר בתכלית',      sub: 'רמת הכשרות הגבוהה ביותר' },
                    ].map(opt => (
                      <button key={opt.val} onClick={() => {
                          setWizardKashrut(opt.val);
                          setWizardStep(3);
                          fetchWizardResults(wizardBudget, opt.val);
                        }}
                        style={{ padding: '14px 18px', borderRadius: 14, border: '2px solid #e0e0e0', background: '#fff', fontSize: 15, fontWeight: 700, color: '#0c1a35', cursor: 'pointer', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#b8972a'; (e.currentTarget as HTMLButtonElement).style.background = '#fffbf0'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e0e0e0'; (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}>
                        <span>{opt.label}</span>
                        <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Step 3 — Results */}
              {wizardStep === 3 && (
                wizardLoading ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#888', fontSize: 15 }}>מחפש עבורך את הכי מתאים...</div>
                ) : wizardResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#888' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                    לא נמצאו מוצרים מתאימים לפי הסינון.
                    <br />
                    <button onClick={() => router.push('/')} style={{ marginTop: 16, background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>לכל המוצרים</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                      {wizardResults.map(p => (
                        <div key={p.id} onClick={() => { closeWizard(); router.push(`/product/${p.id}`); }}
                          style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', borderRadius: 12, border: '1px solid #eee', cursor: 'pointer', background: '#fafafa', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#b8972a'; (e.currentTarget as HTMLDivElement).style.background = '#fffbf0'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#eee'; (e.currentTarget as HTMLDivElement).style.background = '#fafafa'; }}>
                          {(p.imgUrl || p.image_url) && (
                            <img src={p.imgUrl || p.image_url} alt={p.name} style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#0c1a35', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                            <div style={{ fontSize: 15, fontWeight: 900, color: '#b8972a' }}>₪{p.price?.toLocaleString('he-IL')}</div>
                          </div>
                          <span style={{ color: '#b8972a', fontSize: 18, flexShrink: 0 }}>←</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={closeWizard}
                      style={{ width: '100%', background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      המשך לגלישה
                    </button>
                  </>
                )
              )}

              {/* Back button for steps 1+ */}
              {wizardStep > 0 && wizardStep < 3 && (
                <button onClick={() => setWizardStep(s => s - 1)}
                  style={{ marginTop: 16, background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center' }}>
                  ← חזרה
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 1. SmartHero — unchanged ── */}
      <SmartHero
        isMobile={isMobile}
        onScrollToProducts={() => cardsRef.current?.scrollIntoView({ behavior: 'smooth' })}
        onSelectCat={(cat: string) => router.push(`/category/${encodeURIComponent(cat)}`)}
      />

      {/* ── Live Activity Bar ── */}
      {(() => {
        const weeklyVisitors = 134 + ((new Date().getDate() * 7) % 83); // stable-ish random
        const messages = [
          '✅ לקוח מתל אביב הוסיף מזוזה לסל לפני 5 דקות',
          '🖊️ סופר חדש נרשם מירושלים השבוע',
          `📦 ${weeklyProducts || '12'} מוצרים נוספו השבוע`,
          `👁️ ${weeklyVisitors} לקוחות ביקרו השבוע`,
          '⭐ מוצרי סת"ם נבדקים ע"י מגיה מוסמך',
        ];
        const msg = messages[activityIdx % messages.length];
        return (
          <div style={{ background: '#0c1a35', borderBottom: '1px solid rgba(184,151,42,0.3)', padding: '7px 16px', textAlign: 'center', overflow: 'hidden' }}>
            <span key={activityIdx} style={{ fontSize: isMobile ? 12 : 13, color: '#e8d8a0', fontWeight: 600, display: 'inline-block', animation: 'fadeSlide 0.5s ease' }}>
              {msg}
            </span>
            <style>{`@keyframes fadeSlide { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
          </div>
        );
      })()}

      {/* ── Live Counters — single compact row ── */}
      <div ref={countersRef} style={{ background: '#0c1a35', padding: '10px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[
            { icon: '🖊️', value: countedValues.soferim,   suffix: '',  label: 'סופרים מאושרים' },
            { icon: '📦', value: countedValues.products,  suffix: '+', label: 'מוצרים באתר' },
            { icon: '✅', value: countedValues.customers, suffix: '+', label: 'לקוחות מרוצים' },
            { icon: '⭐', value: null,                    suffix: '',  label: 'דירוג ממוצע', fixed: '4.8' },
          ].map(c => (
            <div key={c.label} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ fontSize: isMobile ? 16 : 18 }}>{c.icon}</span>
              <span style={{ fontSize: isMobile ? 15 : 17, fontWeight: 900, color: '#b8972a' }}>
                {c.fixed ?? (c.value + c.suffix)}
              </span>
              <span style={{ fontSize: isMobile ? 10 : 11, color: '#a8c0d8', fontWeight: 600 }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Category cards — horizontal carousel ── */}
      <div
        ref={cardsRef}
        style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '20px 0' : '28px 0' }}
      >
        {/* Outer wrapper: clips overflow, positions arrows */}
        <div style={{ position: 'relative' }}>

          {/* ← prev arrow */}
          <button
            onClick={() => scrollCarousel('prev')}
            aria-label="הקודם"
            style={{
              position: 'absolute', left: 0, top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10, width: 40, height: 40, borderRadius: '50%',
              background: '#0c1a35', color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, lineHeight: 1,
              boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
              flexShrink: 0,
            }}
          >‹</button>

          {/* Scrollable track — LTR internally so scrollLeft math is simple */}
          <div
            ref={carouselTrack}
            className="hide-scrollbar"
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              overflowY: 'visible',
              scrollSnapType: 'x mandatory',
              direction: 'ltr',           // avoid RTL scroll-direction quirks
              padding: `4px ${isMobile ? 12 : 52}px`, // lateral space for arrows on desktop
            }}
          >
            {imagesReady
              ? CARDS.map(card => (
                  <div
                    key={card.href}
                    style={{
                      flex: `0 0 ${cardWidth > 0 ? cardWidth : 320}px`,
                      width: cardWidth > 0 ? cardWidth : 320,
                      scrollSnapAlign: 'start',
                      direction: 'rtl',   // restore RTL inside each card
                    }}
                  >
                    <CategoryCard card={card} catImages={catImages} slotImages={slotImages} />
                  </div>
                ))
              : Array.from({ length: 16 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: `0 0 ${cardWidth > 0 ? cardWidth : 320}px`,
                      width: cardWidth > 0 ? cardWidth : 320,
                    }}
                  >
                    <SkeletonCategoryCard />
                  </div>
                ))
            }
          </div>

          {/* → next arrow */}
          <button
            onClick={() => scrollCarousel('next')}
            aria-label="הבא"
            style={{
              position: 'absolute', right: 0, top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10, width: 40, height: 40, borderRadius: '50%',
              background: '#0c1a35', color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, lineHeight: 1,
              boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
              flexShrink: 0,
            }}
          >›</button>

        </div>
      </div>

      {/* ── Category drawer overlay ── */}
      {drawerOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex' }}
          onClick={() => setDrawerOpen(false)}
        >
          {/* Dark backdrop */}
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} />
          {/* Drawer panel — slides in from the right */}
          <div
            style={{ width: 280, background: '#fff', height: '100%', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #eee', background: '#0c1a35' }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>סינון קטגוריות</span>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', color: '#b8972a', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ padding: '12px 0', flex: 1 }}>
              {[
                'מזוזות', 'קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט',
                'כיסוי תפילין', 'סט טלית תפילין', 'יודאיקה',
                'בר מצוה', 'מתנות', 'מגילות',
              ].map(cat => (
                <button
                  key={cat}
                  onClick={() => { setDrawerOpen(false); router.push(`/category/${encodeURIComponent(cat)}`); }}
                  style={{ width: '100%', background: 'none', border: 'none', padding: '13px 20px', textAlign: 'right', fontSize: 15, fontWeight: 600, color: '#0c1a35', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8f4ec'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                >
                  {cat}
                  <span style={{ color: '#b8972a', fontSize: 13 }}>←</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 3. New products section ── */}
      <div ref={newRef} style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '0 12px 40px' : '0 16px 48px' }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, color: '#0c1a35', margin: 0 }}>
            המוצרים החדשים שלנו
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#333', background: '#fff', cursor: 'pointer', fontFamily: 'Heebo, Arial, sans-serif' }}
            >
              <option value="newest">חדש לישן</option>
              <option value="oldest">ישן לחדש</option>
              <option value="price_asc">מחיר: נמוך לגבוה</option>
              <option value="price_desc">מחיר: גבוה לנמוך</option>
              <option value="popular">הכי נמכר</option>
            </select>
            {/* Category filter button */}
            <button
              onClick={() => setDrawerOpen(true)}
              style={{ background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
            >
              סינון קטגוריות ☰
            </button>
            <Link
              href="/category/מזוזות"
              style={{ fontSize: 13, fontWeight: 700, color: '#b8972a', textDecoration: 'none', whiteSpace: 'nowrap' }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none')}
            >
              לכל המוצרים ←
            </Link>
          </div>
        </div>

        {/* Product grid */}
        {newLoading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? 10 : 16,
            }}
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #f0f0f0' }}
              >
                <div
                  style={{ paddingTop: '100%', background: '#e8e8e8', animation: 'pulse 1.5s infinite' }}
                />
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ height: 12, background: '#e8e8e8', borderRadius: 4, marginBottom: 8, width: '75%' }} />
                  <div style={{ height: 12, background: '#e8e8e8', borderRadius: 4, width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : newProducts.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? 10 : 16,
            }}
          >
            {[...newProducts].sort((a, b) => {
              if (sortBy === 'price_asc')  return (a.price ?? 0) - (b.price ?? 0);
              if (sortBy === 'price_desc') return (b.price ?? 0) - (a.price ?? 0);
              if (sortBy === 'popular')    return (b.priority ?? 0) - (a.priority ?? 0);
              if (sortBy === 'oldest')     return 1; // reverse: Firestore gave newest-first, so flip
              return -1; // 'newest' = keep Firestore order
            }).map(p => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                price={p.price}
                images={[p.imgUrl || p.image_url, p.imgUrl2, p.imgUrl3].filter(Boolean) as string[]}
                priority={p.priority}
                isBestSeller={p.isBestSeller}
                badge={p.badge}
                was={p.was}
                createdAt={p.createdAt}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* ── 4. Category grid ── */}
      {Object.keys(catImages).length > 0 && (
        <div style={{ background: '#fff', padding: isMobile ? '32px 16px' : '48px 16px', direction: 'rtl' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: isMobile ? 20 : 26, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>
              קטגוריות נבחרות
            </h2>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginBottom: 28 }}>גלו את מגוון מוצרי הסת&quot;מ שלנו</p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: isMobile ? 12 : 18,
            }}>
              {([
                { name: 'מזוזות',         emoji: '📜' },
                { name: 'תפילין קומפלט', emoji: '🖊️' },
                { name: 'מגילות',         emoji: '📖' },
                { name: 'יודאיקה',        emoji: '✡️' },
                { name: 'מתנות',          emoji: '🎁' },
                { name: 'בר מצוה',        emoji: '🎉' },
              ] as { name: string; emoji: string }[]).map(cat => (
                <div
                  key={cat.name}
                  onClick={() => router.push(`/category/${encodeURIComponent(cat.name)}`)}
                  style={{
                    position: 'relative', borderRadius: 14, overflow: 'hidden',
                    cursor: 'pointer', aspectRatio: '4/3', background: '#f3f4f4',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.14)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)'; }}
                >
                  {catImages[cat.name] ? (
                    <img
                      src={catImages[cat.name]}
                      alt={cat.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                      {cat.emoji}
                    </div>
                  )}
                  {/* Overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(12,26,53,0.82) 0%, rgba(12,26,53,0.1) 55%)',
                  }} />
                  <div style={{ position: 'absolute', bottom: 0, right: 0, left: 0, padding: isMobile ? '12px 14px' : '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 900, color: '#fff' }}>{cat.name}</span>
                    <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Testimonials carousel ── */}
      {testimonials.length > 0 && (() => {
        const t = testimonials[testIdx];
        return (
          <div style={{ background: '#f8f4ec', padding: isMobile ? '40px 16px' : '56px 16px', direction: 'rtl' }}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              {/* Heading */}
              <h2 style={{ textAlign: 'center', fontSize: isMobile ? 22 : 28, fontWeight: 900, color: '#0c1a35', marginBottom: 8 }}>
                מה הלקוחות אומרים
              </h2>
              <p style={{ textAlign: 'center', fontSize: 14, color: '#888', marginBottom: 36 }}>
                אלפי לקוחות מרוצים ברחבי הארץ
              </p>

              {/* Card — re-keyed on testIdx so CSS animation fires on every change */}
              <div
                key={testIdx}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  boxShadow: '0 4px 28px rgba(0,0,0,0.09)',
                  padding: isMobile ? '24px 20px' : '36px 44px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 28,
                  flexDirection: isMobile ? 'column' : 'row',
                  animation: 'testFadeIn 0.55s ease',
                }}
              >
                {/* Avatar */}
                <div style={{ flexShrink: 0, alignSelf: isMobile ? 'center' : 'flex-start' }}>
                  {t.imageUrl ? (
                    <img
                      src={t.imageUrl}
                      alt={t.name}
                      style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid #b8972a' }}
                    />
                  ) : (
                    <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#0c1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #b8972a' }}>
                      <span style={{ fontSize: 34, color: '#fff', fontWeight: 900 }}>{t.name.charAt(0)}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, textAlign: 'right' }}>
                  {/* Stars */}
                  <div style={{ marginBottom: 10 }}>
                    {Array.from({ length: 5 }).map((_, si) => (
                      <span key={si} style={{ color: si < (t.rating ?? 5) ? '#f5c518' : '#ddd', fontSize: 22 }}>★</span>
                    ))}
                  </div>
                  {/* Quote text */}
                  <p style={{ fontSize: isMobile ? 15 : 17, color: '#444', lineHeight: 1.75, marginBottom: 16, fontStyle: 'italic' }}>
                    &ldquo;{t.text}&rdquo;
                  </p>
                  {/* Name + city */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#0c1a35' }}>{t.name}</span>
                    {t.city && <span style={{ fontSize: 13, color: '#999' }}>· {t.city}</span>}
                  </div>
                </div>
              </div>

              {/* Dots + arrows */}
              {testimonials.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20 }}>
                  <button
                    onClick={() => setTestIdx(i => (i - 1 + testimonials.length) % testimonials.length)}
                    style={{ background: 'none', border: 'none', fontSize: 20, color: '#b8972a', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}
                    aria-label="הקודם"
                  >‹</button>
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setTestIdx(i)}
                      style={{
                        width: i === testIdx ? 24 : 10,
                        height: 10,
                        borderRadius: 5,
                        border: 'none',
                        cursor: 'pointer',
                        background: i === testIdx ? '#b8972a' : '#ccc',
                        padding: 0,
                        transition: 'width 0.3s, background 0.3s',
                      }}
                    />
                  ))}
                  <button
                    onClick={() => setTestIdx(i => (i + 1) % testimonials.length)}
                    style={{ background: 'none', border: 'none', fontSize: 20, color: '#b8972a', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}
                    aria-label="הבא"
                  >›</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── 6. Footer ── */}
      <footer style={{ background: '#0f1111', color: '#fff' }}>

        {/* ── Benefits accordion ── */}
        {(() => {
          const BENEFITS = [
            {
              title: 'כשרות מוסמכת',
              desc: 'כל מוצרי סת"מ נבדקים על ידי מגיה מוסמך. כל יחידה מגיעה עם תעודת כשרות ופיקוח רבני.',
              svg: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              ),
            },
            {
              title: 'משלוח והחזרות',
              desc: 'משלוח חינם לכל הארץ תוך 7–14 ימי עסקים. ניתן להחזיר מוצר תוך 14 יום ממועד הקבלה בהתאם למדיניות ההחזרים.',
              svg: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" rx="1"/>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              ),
            },
            {
              title: 'תשלום מאובטח',
              desc: 'כל העסקאות מוצפנות בתקן SSL. אנו תומכים בכרטיסי אשראי, ביט ופייפאל — בצורה בטוחה לחלוטין.',
              svg: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              ),
            },
            {
              title: 'שירות לקוחות אישי',
              desc: 'צוות מומחי סת"מ זמין בוואטסאפ ובמייל לענות על כל שאלה — לפני ואחרי הרכישה.',
              svg: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              ),
            },
          ];
          return (
            <div style={{ borderBottom: '1px solid #222', direction: 'rtl' }}>
              <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)' }}>
                {BENEFITS.map((b, i) => {
                  const open = benefitOpen === i;
                  return (
                    <div
                      key={b.title}
                      style={{ borderRight: !isMobile && i < BENEFITS.length - 1 ? '1px solid #222' : 'none', borderBottom: isMobile && i < BENEFITS.length - 1 ? '1px solid #222' : 'none' }}
                    >
                      <button
                        onClick={() => setBenefitOpen(open ? null : i)}
                        style={{
                          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '16px 20px', color: '#fff', direction: 'rtl', textAlign: 'right',
                        }}
                      >
                        <span style={{ flexShrink: 0 }}>{b.svg}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#e0e0e0' }}>{b.title}</span>
                        {/* Chevron */}
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ flexShrink: 0, transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                      {/* Accordion body */}
                      <div style={{
                        overflow: 'hidden',
                        maxHeight: open ? 120 : 0,
                        transition: 'max-height 0.3s ease',
                      }}>
                        <div style={{ padding: '0 20px 16px 20px', fontSize: 12, color: '#888', lineHeight: 1.65 }}>
                          {b.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div style={{ borderBottom: '1px solid #333', padding: '28px 16px' }}>
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
              gap: isMobile ? 16 : 32,
            }}
          >
            {[
              { title: 'קבלו מידע',     items: ['אודות Your Sofer', 'הצהרת נגישות', 'הצהרת פרטיות'] },
              { title: 'הרוויחו אתנו',  items: ['הצטרפו כסופר', 'הצטרפו כשליח'] },
              { title: 'שירות לקוחות', items: ['שאלות נפוצות', 'מדיניות החזרות', 'צרו קשר'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ddd' }}>{col.title}</div>
                {col.items.map(item => (
                  <div key={item} style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>{item}</div>
                ))}
              </div>
            ))}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ddd' }}>מידע ולמידה</div>
              {[
                { label: '📖 מדריך לקניית מזוזה', path: '/madrich' },
                { label: '✍️ מי הסופרים שלנו',    path: '/soferim' },
                { label: '❓ שאלות נפוצות',        path: '/madrich/faq' },
              ].map(link => (
                <div
                  key={link.label}
                  onClick={() => router.push(link.path)}
                  style={{ fontSize: 12, color: '#999', marginBottom: 6, cursor: 'pointer' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.color = '#fff')}
                  onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.color = '#999')}
                >
                  {link.label}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ddd' }}>מסמכים משפטיים</div>
              {[
                { label: 'תקנון האתר',      path: '/legal/takanon' },
                { label: 'מדיניות החזרים', path: '/legal/returns' },
                { label: 'מדיניות פרטיות', path: '/legal/privacy' },
                { label: 'משלוחים',         path: '/legal/shipping' },
                { label: 'נגישות',          path: '/legal/accessibility' },
                { label: 'שאלות נפוצות',   path: '/legal/faq' },
              ].map(link => (
                <div
                  key={link.path}
                  onClick={() => router.push(link.path)}
                  style={{ fontSize: 12, color: '#999', marginBottom: 6, cursor: 'pointer' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.color = '#fff')}
                  onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.color = '#999')}
                >
                  {link.label}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 900, color: '#b8972a' }}>Your Sofer</span>
          <span style={{ fontSize: 11, color: '#555' }}>© 2025 Your Sofer — כל הזכויות שמורות</span>
        </div>
      </footer>

      {/* ── WhatsApp floating button ── */}
      <a
        href="https://wa.me/972552722228?text=שלום אני מעוניין בעזרה ופרטים נוספים"
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 999,
          background: '#25D366',
          color: '#fff',
          borderRadius: 50,
          padding: isMobile ? '10px 16px' : '12px 20px',
          fontSize: isMobile ? 13 : 14,
          fontWeight: 900,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(37,211,102,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          direction: 'rtl',
          textDecoration: 'none',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.05)';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 28px rgba(37,211,102,0.7)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 20px rgba(37,211,102,0.5)';
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.057 23.286a.75.75 0 00.92.92l5.427-1.476A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.5-5.25-1.377l-.376-.217-3.898 1.059 1.059-3.898-.217-.376A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
        </svg>
        {isMobile ? 'וואטסאפ' : 'שאלות? דברו איתנו'}
      </a>
    </div>
  );
}
