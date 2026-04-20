'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../contexts/CartContext';

interface Product {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  cat?: string;
  priority?: number;
  hidden?: boolean;
  size?: string | number;
  nusach?: string;
  soferId?: string;
  was?: number | null;
  filterAttributes?: Record<string, string>;
}

interface SoferInfo {
  name: string;
  imageUrl: string;
  style?: string;
}

type Location = 'room' | 'entrance';
type Nusach   = 'ספרדי' | 'אשכנזי' | 'תימני';

const SIZES_BY_LOCATION: Record<Location, string[]> = {
  room:     ['12', '15'],
  entrance: ['15', '20'],
};

const CDN = 'https://res.cloudinary.com/dyxzq3ucy/image/upload/q_auto/f_auto';
const IMAGES = {
  entrance: `${CDN}/knisarashut_tbfcgt`,
  room:     `${CDN}/cheder_aw6zrl`,
  sfaradi:  `${CDN}/sfardi_me6dad`,
  ashkenazi:`${CDN}/ashkenazi_mquvst`,
};

function IconSun({ size = 36, color = '#0c1a35' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconScroll({ size = 48, color = '#c8b898' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  );
}

function IconCart({ size = 14, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  );
}

function IconArrowLeft({ size = 13, color = '#b8972a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconCheck({ size = 12, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconHome({ size = 14, color = '#0c1a35' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function IconDoor({ size = 14, color = '#0c1a35' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" />
      <circle cx="15" cy="12" r="1" fill={color} stroke="none" />
    </svg>
  );
}

function IconGift({ size = 16, color = '#0c1a35' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function IconStar({ size = 12, color = '#b8972a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function StepButton({ children, onClick, selected = false }: { children: React.ReactNode; onClick: () => void; selected?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const active = hovered || selected;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '1 1 0', padding: '0 0 14px', borderRadius: 16,
        border: `2px solid ${active ? '#b8972a' : 'rgba(255,255,255,0.25)'}`,
        background: active ? '#f8f4ec' : '#ffffff',
        cursor: 'pointer', transition: 'all 0.18s ease',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        direction: 'rtl', textAlign: 'center', overflow: 'hidden',
        boxShadow: active ? '0 4px 20px rgba(184,151,42,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
        transform: active ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {children}
    </button>
  );
}

// ── Klaf product card ─────────────────────────────────────────────────────────

function KlafCard({
  product, onAdd, isMobile, quantity, onIncrease, onDecrease, onNavigate,
}: {
  product: Product;
  onAdd: (p: Product) => void;
  isMobile: boolean;
  quantity: number;
  onIncrease: (p: Product) => void;
  onDecrease: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [sofer, setSofer] = useState<SoferInfo | null>(null);
  const img = product.imgUrl || product.image_url || '';
  const hasSale = typeof product.was === 'number' && product.was > product.price;
  const savePct = hasSale ? Math.round((1 - product.price / product.was!) * 100) : 0;

  useEffect(() => {
    if (!product.soferId) return;
    getDoc(doc(db, 'soferim', product.soferId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setSofer({ name: d.name || '', imageUrl: d.imageUrl || '', style: d.style || '' });
      }
    }).catch(() => {});
  }, [product.soferId]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff', borderRadius: 14,
        border: `2px solid ${hovered ? '#b8972a' : '#ede8df'}`,
        overflow: 'hidden', transition: 'all 0.2s ease',
        boxShadow: hovered ? '0 8px 28px rgba(184,151,42,0.18)' : '0 2px 10px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
    >
      {sofer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8f6f2', borderBottom: '1px solid #ede8df' }}>
          {sofer.imageUrl ? (
            <img src={sofer.imageUrl} alt={sofer.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid #b8972a', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0c1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b8972a', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>
              {sofer.name.charAt(0)}
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0c1a35', lineHeight: 1.3 }}>{sofer.name}</div>
            {sofer.style && <div style={{ fontSize: 10, color: '#888' }}>{sofer.style}</div>}
          </div>
        </div>
      )}

      {/* Image — clickable → product page */}
      <div
        onClick={() => onNavigate(product.id)}
        style={{ position: 'relative', paddingTop: '100%', background: '#f5f1ea', overflow: 'hidden', cursor: 'pointer' }}
      >
        {img ? (
          <img src={img} alt={product.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.35s ease', transform: hovered ? 'scale(1.07)' : 'scale(1)' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconScroll size={48} color="#c8b898" />
          </div>
        )}
        {hasSale && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: '#c0392b', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20 }}>
            -{savePct}%
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {/* Name — clickable → product page */}
        <div
          onClick={() => onNavigate(product.id)}
          style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: '#0c1a35', lineHeight: 1.4, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.textDecorationColor = '#0c1a35')}
          onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
        >
          {product.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#b8972a' }}>₪{product.price?.toLocaleString('he-IL')}</div>
          {hasSale && <div style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>₪{product.was?.toLocaleString('he-IL')}</div>}
        </div>

        {/* Add / quantity control */}
        {quantity === 0 ? (
          <button
            onClick={() => onAdd(product)}
            style={{ marginTop: 'auto', background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background 0.15s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#1a2d50')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#0c1a35')}
          >
            <IconCart size={14} /> הוסף לסל
          </button>
        ) : (
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0ebe0', borderRadius: 10, padding: '4px 8px' }}>
            <button
              onClick={() => onIncrease(product)}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#0c1a35', color: '#fff', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
            >+</button>
            <span style={{ fontWeight: 900, fontSize: 15, color: '#0c1a35' }}>{quantity}</span>
            <button
              onClick={() => onDecrease(product.id)}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#0c1a35', color: '#fff', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
            >−</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── "סיימת?" floating banner ──────────────────────────────────────────────────

function FinishedBanner({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 800, background: '#0c1a35', color: '#fff',
      borderRadius: 20, padding: '16px 28px', boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', gap: 16, direction: 'rtl',
      animation: 'slideUp 0.3s ease',
      whiteSpace: 'nowrap',
    }}>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateX(-50%) translateY(20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
      <span style={{ fontSize: 15, fontWeight: 700 }}>סיימת לבחור קלפים?</span>
      <button
        onClick={onYes}
        style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}
      >כן, סיימתי ✓</button>
      <button
        onClick={onNo}
        style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
      >עוד לא סיימתי</button>
    </div>
  );
}

// ── "סיימת לבחור בתי מזוזה?" floating banner ─────────────────────────────────

function FinishedCasesBanner({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 800, background: '#0c1a35', color: '#fff',
      borderRadius: 20, padding: '16px 28px', boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', gap: 16, direction: 'rtl',
      animation: 'slideUp 0.3s ease',
      whiteSpace: 'nowrap',
    }}>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateX(-50%) translateY(20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
      <span style={{ fontSize: 15, fontWeight: 700 }}>סיימת לבחור בתי מזוזה?</span>
      <button
        onClick={onYes}
        style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}
      >כן, לסל</button>
      <button
        onClick={onNo}
        style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
      >עוד לא, אני רוצה לראות מבחר מלא</button>
    </div>
  );
}

// ── Upsell Modal ──────────────────────────────────────────────────────────────

function UpsellModal({ isMobile, onClose, onViewCart }: { isMobile: boolean; onClose: () => void; onViewCart: () => void }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [cases, setCases]     = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCases() {
      try {
        const snap = await getDocs(query(collection(db, 'products'), where('cat', '==', 'מזוזות'), orderBy('priority', 'desc'), limit(20)));
        setCases(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => p.hidden !== true).slice(0, 4));
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    fetchCases();
  }, []);

  function handleAddCase(p: Product) {
    addItem({ id: p.id, name: p.name, price: Math.round(p.price * 0.85), imgUrl: p.imgUrl, image_url: p.image_url, quantity: 1 });
    onViewCart();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 520, boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden', direction: 'rtl', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(135deg, #0c1a35 0%, #1a2d50 100%)', padding: '28px 24px', textAlign: 'center', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: 34, height: 34, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div style={{ background: 'rgba(184,151,42,0.15)', borderRadius: '50%', padding: 14 }}>
              <IconHome size={36} color="#b8972a" />
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 10 }}>נוסף לסל! עכשיו בחר גם בית מזוזה</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#b8972a', color: '#0c1a35', borderRadius: 20, padding: '7px 20px', fontSize: 14, fontWeight: 900 }}>
            <IconGift size={16} color="#0c1a35" /> 15% הנחה על בתי מזוזה עכשיו
          </div>
        </div>
        <div style={{ padding: '20px 20px 24px' }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ borderRadius: 12, overflow: 'hidden', background: '#f5f5f5' }}>
                  <div style={{ paddingTop: '100%', background: '#ebebeb' }} />
                  <div style={{ padding: 12 }}>
                    <div style={{ height: 12, background: '#e0e0e0', borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ height: 10, background: '#e0e0e0', borderRadius: 4, width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : cases.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
              {cases.map(p => (
                <div key={p.id} style={{ background: '#f8f4ec', borderRadius: 14, overflow: 'hidden', border: '1.5px solid #e8dfc8', cursor: 'pointer' }} onClick={() => handleAddCase(p)}>
                  {(p.imgUrl || p.image_url) && <img src={p.imgUrl || p.image_url} alt={p.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />}
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0c1a35', marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: '#b8972a' }}>₪{Math.round(p.price * 0.85).toLocaleString('he-IL')}</span>
                      <span style={{ fontSize: 11, color: '#bbb', textDecoration: 'line-through' }}>₪{p.price?.toLocaleString('he-IL')}</span>
                    </div>
                    <button style={{ width: '100%', background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>+ הוסף לסל</button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <button onClick={() => router.push('/category/מזוזות')} style={{ width: '100%', background: 'none', border: '2px solid #0c1a35', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 700, color: '#0c1a35', cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <IconArrowLeft size={14} color="#0c1a35" /> לכל בתי המזוזה
          </button>
          <button onClick={onViewCart} style={{ width: '100%', background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <IconCart size={16} /> המשך לסל הקניות
          </button>
          <button onClick={onClose} style={{ width: '100%', background: 'none', border: 'none', color: '#aaa', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: '4px 0' }}>לא תודה, המשך ללא בית מזוזה</button>
        </div>
      </div>
    </div>
  );
}

function Tag({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span style={{ background: '#f0ebe0', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#0c1a35', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {icon}{children}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MezuzahFunnel({ isMobile }: { isMobile: boolean }) {
  const router = useRouter();
  const { addItem } = useCart();

  const [step, setStep]         = useState<0 | 1 | 2>(0);
  const [location, setLocation] = useState<Location | null>(null);
  const [nusach, setNusach]     = useState<Nusach>('ספרדי');
  const [klafim, setKlafim]     = useState<Product[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [showFinished, setShowFinished] = useState(false);
  const [showFinishedCases, setShowFinishedCases] = useState(false);

  // quantity per product id
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const finishedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedCasesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // reset timer every time a quantity changes
  useEffect(() => {
    const totalInCart = Object.values(quantities).reduce((s, v) => s + v, 0);
    if (totalInCart === 0) return;
    setShowFinished(false);
    if (finishedTimerRef.current) clearTimeout(finishedTimerRef.current);
    finishedTimerRef.current = setTimeout(() => setShowFinished(true), 3000);
    return () => { if (finishedTimerRef.current) clearTimeout(finishedTimerRef.current); };
  }, [quantities]);

  async function fetchKlafim(loc: Location, nos: Nusach) {
    setLoading(true); setKlafim([]);
    try {
      const snap = await getDocs(query(collection(db, 'products'), where('cat', '==', 'קלפי מזוזה'), orderBy('priority', 'desc'), limit(60)));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => p.hidden !== true);
      const sizes = SIZES_BY_LOCATION[loc];
      const scored = all.map(p => {
        const text = `${p.name ?? ''} ${p.nusach ?? ''}`.toLowerCase();
        const sizeStr = String(p.size ?? '');
        let score = 0;
        if (nos === 'ספרדי'  && (text.includes('ספרד') || (!text.includes('אשכנז') && !text.includes('תימ')))) score += 2;
        if (nos === 'אשכנזי' && text.includes('אשכנז')) score += 2;
        if (nos === 'תימני'  && text.includes('תימ'))   score += 2;
        if (sizes.some(s => sizeStr === s || sizeStr.startsWith(s) || p.name?.includes(s))) score += 1;
        return { p, score };
      });
      setKlafim(scored.sort((a, b) => b.score - a.score || (b.p.priority ?? 0) - (a.p.priority ?? 0)).slice(0, 6).map(s => s.p));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  function handleSelectLocation(loc: Location) { setLocation(loc); setStep(1); }
  function handleSelectNusach(nos: Nusach) { setNusach(nos); setStep(2); fetchKlafim(location!, nos); }

  function handleAddToCart(p: Product) {
    addItem({ id: p.id, name: p.name, price: p.price, imgUrl: p.imgUrl, image_url: p.image_url, quantity: 1 });
    setQuantities(q => ({ ...q, [p.id]: (q[p.id] ?? 0) + 1 }));
  }

  function handleIncrease(p: Product) {
    addItem({ id: p.id, name: p.name, price: p.price, imgUrl: p.imgUrl, image_url: p.image_url, quantity: 1 });
    setQuantities(q => ({ ...q, [p.id]: (q[p.id] ?? 0) + 1 }));
  }

  function handleDecrease(id: string) {
    setQuantities(q => {
      const next = Math.max(0, (q[id] ?? 0) - 1);
      return { ...q, [id]: next };
    });
    // Note: removing from cart context depends on your CartContext API
    // If removeItem exists: removeItem(id); otherwise just track locally
  }

  function handleUpsellClose() {
    setShowUpsell(false);
    if (finishedCasesTimerRef.current) clearTimeout(finishedCasesTimerRef.current);
    finishedCasesTimerRef.current = setTimeout(() => setShowFinishedCases(true), 3000);
  }

  function handleReset() {
    setStep(0); setLocation(null); setNusach('ספרדי'); setKlafim([]);
    setQuantities({}); setShowFinished(false);
  }

  function handleFinishedYes() {
    setShowFinished(false);
    setShowUpsell(true);
  }

  function handleFinishedNo() {
    setShowFinished(false);
  }

  const sizes = location ? SIZES_BY_LOCATION[location] : [];

  const locationConfig = [
    { key: 'room' as Location, label: 'חדר / פתח משני', sub: 'גדלים: 12 או 15 ס"מ', img: IMAGES.room, icon: <IconDoor size={14} color="#0c1a35" /> },
    { key: 'entrance' as Location, label: 'כניסה ראשית', sub: 'גדלים: 15 או 20 ס"מ', img: IMAGES.entrance, icon: <IconHome size={14} color="#0c1a35" /> },
  ];

  const nusachConfig: { key: Nusach; img?: string; fallbackIcon?: React.ReactNode; popular?: boolean }[] = [
    { key: 'ספרדי',  img: IMAGES.sfaradi,  popular: true },
    { key: 'אשכנזי', img: IMAGES.ashkenazi },
    { key: 'תימני',  fallbackIcon: <IconSun size={40} color="#0c1a35" /> },
  ];

  return (
    <>
      {showUpsell && (
        <UpsellModal isMobile={isMobile} onClose={handleUpsellClose} onViewCart={() => { setShowUpsell(false); router.push('/cart'); }} />
      )}

      {showFinished && !showUpsell && (
        <FinishedBanner onYes={handleFinishedYes} onNo={handleFinishedNo} />
      )}

      {showFinishedCases && (
        <FinishedCasesBanner
          onYes={() => { setShowFinishedCases(false); router.push('/cart'); }}
          onNo={() => { setShowFinishedCases(false); router.push('/category/מזוזות'); }}
        />
      )}

      <div style={{ background: '#ffffff', padding: isMobile ? '40px 16px' : '56px 16px', direction: 'rtl' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0c1a35', color: '#b8972a', borderRadius: 20, padding: '5px 16px', fontSize: 12, fontWeight: 700, marginBottom: 14, letterSpacing: 0.5 }}>
              <IconStar size={12} color="#b8972a" /> המוצר הנמכר ביותר
            </div>
            <h2 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 900, color: '#0c1a35', margin: '0 0 10px', lineHeight: 1.2 }}>
              מצא את קלף המזוזה המתאים לך
            </h2>
            <p style={{ fontSize: 14, color: '#888', margin: 0 }}>ענה על שתי שאלות פשוטות — נמצא את המתאים ביותר</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            {(['מיקום', 'נוסח', 'קלפים'] as const).map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: step >= i ? 1 : 0.35, transition: 'opacity 0.3s' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: step > i ? '#b8972a' : step === i ? '#0c1a35' : '#e0e0e0', color: '#fff', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s', boxShadow: step === i ? '0 0 0 3px rgba(12,26,53,0.15)' : 'none' }}>
                    {step > i ? <IconCheck size={12} /> : i + 1}
                  </div>
                  {!isMobile && <span style={{ fontSize: 12, fontWeight: 700, color: step >= i ? '#0c1a35' : '#bbb' }}>{label}</span>}
                </div>
                {i < 2 && <div style={{ width: isMobile ? 24 : 44, height: 2, background: step > i ? '#b8972a' : '#e8e2d8', borderRadius: 2, transition: 'background 0.3s' }} />}
              </div>
            ))}
          </div>

          <div style={{ background: '#0c1a35', borderRadius: 24, boxShadow: '0 4px 40px rgba(0,0,0,0.18)', padding: isMobile ? '24px 16px' : '40px 48px', border: '1.5px solid rgba(184,151,42,0.25)' }}>

            {step === 0 && (
              <>
                <h3 style={{ textAlign: 'center', fontSize: isMobile ? 18 : 22, fontWeight: 900, color: '#ffffff', margin: '0 0 6px' }}>איפה תולים את המזוזה?</h3>
                <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: '0 0 24px' }}>הבחירה תשפיע על הגודל המומלץ</p>
                <div style={{ display: 'flex', gap: 16 }}>
                  {locationConfig.map(loc => (
                    <StepButton key={loc.key} onClick={() => handleSelectLocation(loc.key)}>
                      <div style={{ width: '100%', height: isMobile ? 100 : 130, overflow: 'hidden', borderRadius: '14px 14px 0 0' }}>
                        <img src={loc.img} alt={loc.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                      <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 900, color: '#0c1a35' }}>{loc.label}</span>
                        <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>{loc.sub}</span>
                      </div>
                    </StepButton>
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
                  <button onClick={handleReset} style={{ background: 'none', border: 'none', color: '#b8972a', fontSize: 13, cursor: 'pointer', fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IconArrowLeft size={13} color="#b8972a" /> חזרה
                  </button>
                  <Tag icon={location === 'room' ? <IconDoor size={11} color="#0c1a35" /> : <IconHome size={11} color="#0c1a35" />}>
                    {location === 'room' ? 'חדר' : 'כניסה ראשית'} — {sizes.join(' / ')} ס"מ
                  </Tag>
                </div>
                <h3 style={{ textAlign: 'center', fontSize: isMobile ? 18 : 22, fontWeight: 900, color: '#0c1a35', margin: '0 0 6px' }}>מה הנוסח שלך?</h3>
                <p style={{ textAlign: 'center', fontSize: 13, color: '#999', margin: '0 0 24px' }}>ניתן לשנות בהמשך</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  {nusachConfig.map(({ key, img, fallbackIcon, popular }) => (
                    <StepButton key={key} onClick={() => handleSelectNusach(key)}>
                      <div style={{ width: '100%', height: isMobile ? 80 : 110, overflow: 'hidden', borderRadius: '14px 14px 0 0', background: '#f0ebe0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {img ? <img src={img} alt={key} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : fallbackIcon}
                      </div>
                      <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 900 }}>{key}</span>
                        {popular && <span style={{ fontSize: 10, color: '#b8972a', fontWeight: 700, background: '#fffbf0', borderRadius: 10, padding: '2px 10px', border: '1px solid #e8d8a0' }}>נפוץ</span>}
                      </div>
                    </StepButton>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
                  <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#b8972a', fontSize: 13, cursor: 'pointer', fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IconArrowLeft size={13} color="#b8972a" /> חזרה
                  </button>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Tag icon={location === 'room' ? <IconDoor size={11} color="#0c1a35" /> : <IconHome size={11} color="#0c1a35" />}>
                      {location === 'room' ? 'חדר' : 'כניסה ראשית'}
                    </Tag>
                    <Tag>נוסח {nusach}</Tag>
                    <Tag>{sizes.join('/')} ס"מ</Tag>
                  </div>
                  <button onClick={handleReset} style={{ background: 'none', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#777', cursor: 'pointer', fontWeight: 600 }}>התחל מחדש</button>
                </div>

                <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 900, color: '#0c1a35', margin: '0 0 20px' }}>קלפי מזוזה מומלצים עבורך</h3>

                {loading && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 12 }}>
                    {[1,2,3,4,5,6].map(i => (
                      <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: '#f5f5f5', border: '2px solid #eee' }}>
                        <div style={{ paddingTop: '100%', background: '#ebebeb' }} />
                        <div style={{ padding: 14 }}>
                          <div style={{ height: 12, background: '#e0e0e0', borderRadius: 4, marginBottom: 8 }} />
                          <div style={{ height: 10, background: '#e0e0e0', borderRadius: 4, width: '55%', marginBottom: 14 }} />
                          <div style={{ height: 36, background: '#e0e0e0', borderRadius: 10 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && klafim.length > 0 && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: isMobile ? 10 : 14, marginBottom: 24 }}>
                      {klafim.map(p => (
                        <KlafCard
                          key={p.id}
                          product={p}
                          onAdd={handleAddToCart}
                          isMobile={isMobile}
                          quantity={quantities[p.id] ?? 0}
                          onIncrease={handleIncrease}
                          onDecrease={handleDecrease}
                          onNavigate={(id) => router.push(`/product/${id}`)}
                        />
                      ))}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => router.push('/category/קלפי מזוזה')}
                        style={{ background: 'none', border: '2px solid #0c1a35', borderRadius: 12, padding: '12px 36px', fontSize: 14, fontWeight: 700, color: '#0c1a35', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background 0.15s' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#f0ebe0')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
                      >
                        <IconArrowLeft size={14} color="#0c1a35" /> לכל קלפי המזוזה
                      </button>
                    </div>
                  </>
                )}

                {!loading && klafim.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                      <IconScroll size={52} color="#d0c8b8" />
                    </div>
                    <p style={{ marginBottom: 20, fontSize: 14, color: '#888' }}>לא נמצאו קלפים — הצג את כל קלפי המזוזה</p>
                    <button onClick={() => router.push('/category/קלפי מזוזה')} style={{ background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <IconArrowLeft size={14} color="#fff" /> לכל הקלפים
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}