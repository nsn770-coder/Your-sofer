'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, getDoc, addDoc, serverTimestamp, getCountFromServer,
} from 'firebase/firestore';
import { db } from './firebase';
import SmartHero from './components/SmartHero';
import MezuzahFunnel from './components/MezuzahFunnel';
import ProductCard from '@/components/ui/ProductCard';
import { useShaliach } from './contexts/ShaliachContext';
import {
  CARDS, ALL_CATS, CONFIG_COLLECTION, CONFIG_DOC, slotKey,
} from './constants/homepageCards';
import type { CardDef, SubItem } from './constants/homepageCards';
// ── הוסף את הקומפוננטות האלה בראש HomePageClient.tsx, אחרי כל ה-imports ──────

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
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testIdx, setTestIdx]         = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle');
  const [newsletterPopupOpen, setNewsletterPopupOpen] = useState(false);
  const cardsRef       = useRef<HTMLDivElement>(null);
  const newRef         = useRef<HTMLDivElement>(null);
  const router         = useRouter();
  const { shaliach }   = useShaliach();

  useEffect(() => {
    function update() { setIsMobile(window.innerWidth < 768); }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
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

    async function fetchNewProducts() {
      try {
        const snap = await getDocs(
          query(collection(db, 'products'), orderBy('priority', 'desc'), limit(32)),
        );
        setNewProducts(
          snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Product))
            .filter((p: Product) => p.hidden !== true)
            .slice(0, 16),
        );
      } catch { /* silently empty */ }
      finally { setNewLoading(false); }
    }

    Promise.all([
      fetchPinnedImages().then(pinned => setSlotImages(pinned)),
      fetchCatImages(),
    ]).finally(() => setImagesReady(true));

    fetchNewProducts();
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
    if (testimonials.length < 2) return;
    const timer = setInterval(() => {
      setTestIdx(prev => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

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
    setActivityIdx(0);
    const id = setInterval(() => setActivityIdx(i => i + 1), 4000);
    function onVisible() {
      if (!document.hidden) setActivityIdx(0);
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
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
        minHeight: '100vh',
        background: '#F5F0E8',
        fontFamily: "'Heebo', Arial, sans-serif",
        overflowX: 'hidden',
        maxWidth: '100vw',
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
            <div style={{ background: 'linear-gradient(135deg, #0c1a35, #1a2d50)', padding: '22px 24px', position: 'relative', textAlign: 'center' }}>
              <button
                onClick={() => setNewsletterPopupOpen(false)}
                style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#b8972a', marginBottom: 4 }}>הצטרפו למועדון הלקוחות</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>קבלו מבצעים ומוצרים חדשים לפני כולם</div>
            </div>
            <div style={{ padding: '24px 24px 28px' }}>
              {newsletterStatus === 'success' ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>נרשמתם בהצלחה!</div>
                  <div style={{ fontSize: 13, color: '#666' }}>נעדכן אתכם ראשונים על מוצרים חדשים ומבצעים.</div>
                  <button onClick={() => setNewsletterPopupOpen(false)} style={{ marginTop: 18, background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 10, padding: '10px 28px', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>סגור</button>
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
                  {newsletterStatus === 'duplicate' && <div style={{ fontSize: 12, color: '#b8972a', fontWeight: 600 }}>כתובת המייל הזו כבר רשומה 😊</div>}
                  {newsletterStatus === 'error' && <div style={{ fontSize: 12, color: '#e74c3c', fontWeight: 600 }}>שגיאה בהרשמה, נסו שוב.</div>}
                  <button
                    type="submit"
                    disabled={newsletterStatus === 'loading'}
                    style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 900, cursor: newsletterStatus === 'loading' ? 'not-allowed' : 'pointer', opacity: newsletterStatus === 'loading' ? 0.7 : 1 }}
                  >
                    {newsletterStatus === 'loading' ? '⏳ שולח...' : '✉️ הצטרפו עכשיו ←'}
                  </button>
                  <button type="button" onClick={() => setNewsletterPopupOpen(false)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>לא תודה</button>
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
                        style={{ padding: '18px 12px', borderRadius: 14, border: '2px solid #e0e0e0', background: '#fff', fontSize: 15, fontWeight: 700, color: '#0c1a35', cursor: 'pointer', transition: 'all 0.15s' }}
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
                    <button onClick={closeWizard} style={{ width: '100%', background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
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
        onSelectCat={(cat: string) => router.push(`/category/${encodeURIComponent(cat)}`)}
      />

      {/* ── Live Activity Bar ── */}
      {(() => {
        const weeklyVisitors = 134 + ((new Date().getDate() * 7) % 83);
        const messages: { icon: React.ReactNode; text: string }[] = [
  { icon: <IconActivityCheck />, text: 'לקוח מתל אביב הוסיף מזוזה לסל לפני 5 דקות' },
  { icon: <IconActivityPen />,   text: 'סופר חדש נרשם מירושלים השבוע' },
  { icon: <IconActivityBox />,   text: `${weeklyProducts || '12'} מוצרים נוספו השבוע` },
  { icon: <IconActivityUsers />, text: `${weeklyVisitors} לקוחות ביקרו השבוע` },
  { icon: <IconActivityShield />,text: 'מוצרי סת"מ נבדקים ע"י מגיה מוסמך' },
];
const msg = messages[activityIdx % messages.length];
return (
  <div style={{ background: '#0c1a35', borderBottom: '1px solid rgba(184,151,42,0.3)', padding: '7px 16px', textAlign: 'center', overflow: 'hidden' }}>
    <span key={activityIdx} style={{ fontSize: isMobile ? 12 : 13, color: '#e8d8a0', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7, animation: 'fadeSlide 0.5s ease' }}>
      {msg.icon}
      {msg.text}
    </span>
    <style>{`@keyframes fadeSlide { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
  </div>
);
      })()}

      {/* ── Live Counters ── */}
      <div ref={countersRef} style={{ background: '#0c1a35', padding: '10px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[
           { icon: <IconCounterPen isMobile={isMobile} />,   value: countedValues.soferim,   suffix: '',  label: 'סופרים מאושרים' },
{ icon: <IconCounterBox isMobile={isMobile} />,   value: countedValues.products,  suffix: '+', label: 'מוצרים באתר' },
{ icon: <IconCounterCheck isMobile={isMobile} />, value: countedValues.customers, suffix: '+', label: 'לקוחות מרוצים' },
{ icon: <IconCounterStar isMobile={isMobile} />,  value: null,                    suffix: '',  label: 'דירוג ממוצע', fixed: '4.8' },
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

      {/* ── Mezuzah Funnel ── */}
      <MezuzahFunnel isMobile={isMobile} />

      {/* ── 2. Category cards — horizontal scroll ── */}
      <div ref={cardsRef} style={{ padding: isMobile ? '20px 0' : '28px 0' }}>
        <div
          className="hide-scrollbar"
          style={{ display: 'flex', gap: 12, overflowX: 'auto', overflowY: 'visible', padding: '4px 16px 8px', direction: 'rtl' }}
        >
          {([
            { label: 'מזוזות' },
            { label: 'קלפי מזוזה' },
            { label: 'קלפי תפילין' },
            { label: 'תפילין קומפלט' },
            { label: 'כיסוי תפילין' },
            { label: 'סט טלית תפילין' },
            { label: 'יודאיקה' },
            { label: 'בר מצווה' },
            { label: 'מתנות' },
            { label: 'מגילות' },
            { label: 'כלי שולחן והגשה' },
            { label: 'עיצוב הבית' },
            { label: 'שבת וחגים', href: `/category/${encodeURIComponent('כלי שולחן והגשה')}?filter=${encodeURIComponent('שבת')}`, imgKey: 'כלי שולחן והגשה' },
          ] as { label: string; href?: string; imgKey?: string }[]).map(({ label, href, imgKey }) => {
            const img = catImages[imgKey ?? label] ?? '';
            return (
              <Link
                key={label}
                href={href ?? `/category/${encodeURIComponent(label)}`}
                style={{ flexShrink: 0, width: 112, height: 144, borderRadius: 12, overflow: 'hidden', position: 'relative', display: 'block', textDecoration: 'none', background: img ? '#000' : 'linear-gradient(to bottom right, #92400e, #b45309)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'; }}
              >
                {img && <img src={img} alt={label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)' }} />
                <div style={{ position: 'absolute', bottom: 0, right: 0, left: 0, padding: '10px 6px 8px', textAlign: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, lineHeight: 1.3, display: 'block', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Category drawer overlay ── */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex' }} onClick={() => setDrawerOpen(false)}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ width: 280, background: '#fff', height: '100%', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #eee', background: '#0c1a35' }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>סינון קטגוריות</span>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', color: '#b8972a', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ padding: '12px 0', flex: 1 }}>
              {['מזוזות', 'קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'כיסוי תפילין', 'סט טלית תפילין', 'יודאיקה', 'בר מצווה', 'מתנות', 'מגילות', 'כלי שולחן והגשה', 'עיצוב הבית'].map(cat => (
                <button key={cat} onClick={() => { setDrawerOpen(false); router.push(`/category/${encodeURIComponent(cat)}`); }}
                  style={{ width: '100%', background: 'none', border: 'none', padding: '13px 20px', textAlign: 'right', fontSize: 15, fontWeight: 600, color: '#0c1a35', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8f4ec'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, color: '#0c1a35', margin: 0 }}>המוצרים החדשים שלנו</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#333', background: '#fff', cursor: 'pointer', fontFamily: 'Heebo, Arial, sans-serif' }}>
              <option value="newest">חדש לישן</option>
              <option value="oldest">ישן לחדש</option>
              <option value="price_asc">מחיר: נמוך לגבוה</option>
              <option value="price_desc">מחיר: גבוה לנמוך</option>
              <option value="popular">הכי נמכר</option>
            </select>
            <button onClick={() => setDrawerOpen(true)} style={{ background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              סינון קטגוריות ☰
            </button>
            <Link href="/category/מזוזות" style={{ fontSize: 13, fontWeight: 700, color: '#b8972a', textDecoration: 'none', whiteSpace: 'nowrap' }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none')}>
              לכל המוצרים ←
            </Link>
          </div>
        </div>
        {newLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 16, padding: isMobile ? '0 12px' : 0 }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                <div style={{ paddingTop: '100%', background: '#e8e8e8', animation: 'pulse 1.5s infinite' }} />
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ height: 12, background: '#e8e8e8', borderRadius: 4, marginBottom: 8, width: '75%' }} />
                  <div style={{ height: 12, background: '#e8e8e8', borderRadius: 4, width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : newProducts.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 16, padding: isMobile ? '0 12px' : 0 }}>
            {[...newProducts].sort((a, b) => {
              if (sortBy === 'price_asc')  return (a.price ?? 0) - (b.price ?? 0);
              if (sortBy === 'price_desc') return (b.price ?? 0) - (a.price ?? 0);
              if (sortBy === 'popular')    return (b.priority ?? 0) - (a.priority ?? 0);
              if (sortBy === 'oldest')     return 1;
              return -1;
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
            <h2 style={{ textAlign: 'center', fontSize: isMobile ? 20 : 26, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>קטגוריות נבחרות</h2>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginBottom: 28 }}>גלו את מגוון מוצרי הסת&quot;מ שלנו</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? 12 : 18 }}>
              {([
                { name: 'מזוזות',         emoji: '📜' },
                { name: 'תפילין קומפלט', emoji: '🖊️' },
                { name: 'מגילות',         emoji: '📖' },
                { name: 'יודאיקה',        emoji: '✡️' },
                { name: 'מתנות',          emoji: '🎁' },
                { name: 'בר מצווה',        emoji: '🎉' },
              ] as { name: string; emoji: string }[]).map(cat => (
                <div key={cat.name} onClick={() => router.push(`/category/${encodeURIComponent(cat.name)}`)}
                  style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', aspectRatio: '4/3', background: '#f3f4f4', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.14)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)'; }}>
                  {catImages[cat.name] ? (
                    <img src={catImages[cat.name]} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>{cat.emoji}</div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(12,26,53,0.82) 0%, rgba(12,26,53,0.1) 55%)' }} />
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
              <h2 style={{ textAlign: 'center', fontSize: isMobile ? 22 : 28, fontWeight: 900, color: '#0c1a35', marginBottom: 8 }}>מה הלקוחות אומרים</h2>
              <p style={{ textAlign: 'center', fontSize: 14, color: '#888', marginBottom: 36 }}>אלפי לקוחות מרוצים ברחבי הארץ</p>
              <div key={testIdx} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 28px rgba(0,0,0,0.09)', padding: isMobile ? '24px 20px' : '36px 44px', display: 'flex', alignItems: 'flex-start', gap: 28, flexDirection: isMobile ? 'column' : 'row', animation: 'testFadeIn 0.55s ease' }}>
                <div style={{ flexShrink: 0, alignSelf: isMobile ? 'center' : 'flex-start' }}>
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt={t.name} style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid #b8972a' }} />
                  ) : (
                    <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#0c1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #b8972a' }}>
                      <span style={{ fontSize: 34, color: '#fff', fontWeight: 900 }}>{t.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ marginBottom: 10 }}>
                    {Array.from({ length: 5 }).map((_, si) => (
                      <span key={si} style={{ color: si < (t.rating ?? 5) ? '#f5c518' : '#ddd', fontSize: 22 }}>★</span>
                    ))}
                  </div>
                  <p style={{ fontSize: isMobile ? 15 : 17, color: '#444', lineHeight: 1.75, marginBottom: 16, fontStyle: 'italic' }}>&ldquo;{t.text}&rdquo;</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#0c1a35' }}>{t.name}</span>
                    {t.city && <span style={{ fontSize: 13, color: '#999' }}>· {t.city}</span>}
                  </div>
                </div>
              </div>
              {testimonials.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20 }}>
                  <button onClick={() => setTestIdx(i => (i - 1 + testimonials.length) % testimonials.length)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#b8972a', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }} aria-label="הקודם">‹</button>
                  {testimonials.map((_, i) => (
                    <button key={i} onClick={() => setTestIdx(i)} style={{ width: i === testIdx ? 24 : 10, height: 10, borderRadius: 5, border: 'none', cursor: 'pointer', background: i === testIdx ? '#b8972a' : '#ccc', padding: 0, transition: 'width 0.3s, background 0.3s' }} />
                  ))}
                  <button onClick={() => setTestIdx(i => (i + 1) % testimonials.length)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#b8972a', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }} aria-label="הבא">›</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
