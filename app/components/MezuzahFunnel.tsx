'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../contexts/CartContext';

// ── Types ─────────────────────────────────────────────────────────────────────

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
}

type Location = 'room' | 'entrance';
type Nusach   = 'ספרדי' | 'אשכנזי' | 'תימני';

const SIZES_BY_LOCATION: Record<Location, string[]> = {
  room:     ['12', '15'],
  entrance: ['15', '20'],
};

// ── Step button ───────────────────────────────────────────────────────────────

function StepButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '1 1 0',
        padding: '16px 12px',
        borderRadius: 14,
        border: `2px solid ${hovered ? '#b8972a' : '#e0e0e0'}`,
        background: hovered ? '#fffbf0' : '#fff',
        fontSize: 15,
        fontWeight: 700,
        color: '#0c1a35',
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        direction: 'rtl',
        textAlign: 'center',
      }}
    >
      {children}
    </button>
  );
}

// ── Klaf product card ─────────────────────────────────────────────────────────

function KlafCard({
  product,
  onAdd,
  isMobile,
}: {
  product: Product;
  onAdd: (p: Product) => void;
  isMobile: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const img = product.imgUrl || product.image_url || '';
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: 14,
        border: `2px solid ${hovered ? '#b8972a' : '#eee'}`,
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered
          ? '0 6px 24px rgba(184,151,42,0.15)'
          : '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ position: 'relative', paddingTop: '100%', background: '#f8f4ec', overflow: 'hidden' }}>
        {img ? (
          <img
            src={img}
            alt={product.name}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', transition: 'transform 0.3s',
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
            }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📜</div>
        )}
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: '#0c1a35', lineHeight: 1.3, direction: 'rtl' }}>
          {product.name}
        </div>
        <div style={{ fontSize: 17, fontWeight: 900, color: '#b8972a' }}>
          ₪{product.price?.toLocaleString('he-IL')}
        </div>
        <button
          onClick={() => onAdd(product)}
          style={{
            marginTop: 'auto', background: '#0c1a35', color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#1a2d50')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#0c1a35')}
        >
          הוסף לסל ←
        </button>
      </div>
    </div>
  );
}

// ── Upsell Modal ──────────────────────────────────────────────────────────────

function UpsellModal({
  isMobile,
  onClose,
  onViewCart,
}: {
  isMobile: boolean;
  onClose: () => void;
  onViewCart: () => void;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [cases, setCases]     = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCases() {
      try {
        const snap = await getDocs(
          query(collection(db, 'products'), where('cat', '==', 'מזוזות'), orderBy('priority', 'desc'), limit(20)),
        );
        setCases(
          snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
            .filter(p => p.hidden !== true)
            .slice(0, 4),
        );
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
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden', direction: 'rtl', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0c1a35, #1a2d50)', padding: '22px 24px', textAlign: 'center', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 16, cursor: 'pointer' }}>✕</button>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏠</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#b8972a', marginBottom: 8 }}>נוסף לסל! עכשיו בחר גם בית מזוזה</div>
          <div style={{ display: 'inline-block', background: '#b8972a', color: '#0c1a35', borderRadius: 20, padding: '6px 20px', fontSize: 15, fontWeight: 900 }}>
            🎁 15% הנחה על בתי מזוזה עכשיו
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 20px 24px' }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ borderRadius: 12, overflow: 'hidden', background: '#f5f5f5' }}>
                  <div style={{ paddingTop: '100%', background: '#e8e8e8', animation: 'pulse 1.5s infinite' }} />
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
                <div
                  key={p.id}
                  style={{ background: '#f8f4ec', borderRadius: 12, overflow: 'hidden', border: '1px solid #e8dfc8', cursor: 'pointer' }}
                  onClick={() => handleAddCase(p)}
                >
                  {(p.imgUrl || p.image_url) && (
                    <img src={p.imgUrl || p.image_url} alt={p.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                  )}
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0c1a35', marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: '#b8972a' }}>₪{Math.round(p.price * 0.85).toLocaleString('he-IL')}</span>
                      <span style={{ fontSize: 11, color: '#aaa', textDecoration: 'line-through' }}>₪{p.price?.toLocaleString('he-IL')}</span>
                    </div>
                    <button style={{ width: '100%', background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      + הוסף לסל
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <button onClick={() => router.push('/category/מזוזות')} style={{ width: '100%', background: 'none', border: '2px solid #0c1a35', borderRadius: 12, padding: '11px', fontSize: 14, fontWeight: 700, color: '#0c1a35', cursor: 'pointer', marginBottom: 10 }}>
            לכל בתי המזוזה ←
          </button>
          <button onClick={onViewCart} style={{ width: '100%', background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
            המשך לסל הקניות 🛒
          </button>
          <button onClick={onClose} style={{ width: '100%', background: 'none', border: 'none', color: '#aaa', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
            לא תודה, המשך ללא בית מזוזה
          </button>
        </div>
      </div>
    </div>
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

  async function fetchKlafim(loc: Location, nos: Nusach) {
    setLoading(true);
    setKlafim([]);
    try {
      const snap = await getDocs(
        query(collection(db, 'products'), where('cat', '==', 'קלפי מזוזה'), orderBy('priority', 'desc'), limit(60)),
      );
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Product))
        .filter(p => p.hidden !== true);

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

      setKlafim(
        scored
          .sort((a, b) => b.score - a.score || (b.p.priority ?? 0) - (a.p.priority ?? 0))
          .slice(0, 6)
          .map(s => s.p),
      );
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  function handleSelectLocation(loc: Location) {
    setLocation(loc);
    setStep(1);
  }

  function handleSelectNusach(nos: Nusach) {
    setNusach(nos);
    setStep(2);
    fetchKlafim(location!, nos);
  }

  function handleAddToCart(p: Product) {
    addItem({ id: p.id, name: p.name, price: p.price, imgUrl: p.imgUrl, image_url: p.image_url, quantity: 1 });
    setShowUpsell(true);
  }

  function handleReset() {
    setStep(0);
    setLocation(null);
    setNusach('ספרדי');
    setKlafim([]);
  }

  const sizes = location ? SIZES_BY_LOCATION[location] : [];

  return (
    <>
      {showUpsell && (
        <UpsellModal
          isMobile={isMobile}
          onClose={() => setShowUpsell(false)}
          onViewCart={() => { setShowUpsell(false); router.push('/cart'); }}
        />
      )}

      <div style={{ background: 'linear-gradient(180deg, #f8f4ec 0%, #fff 100%)', padding: isMobile ? '36px 16px' : '52px 16px', direction: 'rtl' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'inline-block', background: '#0c1a35', color: '#b8972a', borderRadius: 20, padding: '4px 16px', fontSize: 12, fontWeight: 700, marginBottom: 12, letterSpacing: 0.5 }}>
              📜 המוצר הנמכר ביותר
            </div>
            <h2 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 900, color: '#0c1a35', margin: '0 0 8px', lineHeight: 1.2 }}>
              מצא את קלף המזוזה המתאים לך
            </h2>
            <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
              ענה על שתי שאלות פשוטות — נמצא את המתאים ביותר
            </p>
          </div>

          {/* Progress indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            {(['מיקום', 'נוסח', 'קלפים'] as const).map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: step >= i ? 1 : 0.4, transition: 'opacity 0.3s' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: step >= i ? '#b8972a' : '#e0e0e0',
                    color: step >= i ? '#0c1a35' : '#999',
                    fontSize: 13, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.3s',
                  }}>
                    {step > i ? '✓' : i + 1}
                  </div>
                  {!isMobile && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: step >= i ? '#0c1a35' : '#aaa' }}>{label}</span>
                  )}
                </div>
                {i < 2 && (
                  <div style={{ width: isMobile ? 24 : 40, height: 2, background: step > i ? '#b8972a' : '#e0e0e0', borderRadius: 2, transition: 'background 0.3s' }} />
                )}
              </div>
            ))}
          </div>

          {/* Card */}
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 32px rgba(0,0,0,0.08)', padding: isMobile ? '24px 16px' : '36px 44px', border: '1px solid #f0ebe0' }}>

            {/* ── Step 0: Location ── */}
            {step === 0 && (
              <>
                <h3 style={{ textAlign: 'center', fontSize: isMobile ? 18 : 22, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>
                  איפה תולים את המזוזה?
                </h3>
                <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginBottom: 28 }}>
                  הבחירה תשפיע על הגודל המומלץ
                </p>
                <div style={{ display: 'flex', gap: 16 }}>
                  <StepButton onClick={() => handleSelectLocation('room')}>
                    <span style={{ fontSize: 36 }}>🚪</span>
                    <span style={{ fontSize: 15, fontWeight: 900 }}>חדר / פתח משני</span>
                    <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>גדלים: 12 או 15 ס"מ</span>
                  </StepButton>
                  <StepButton onClick={() => handleSelectLocation('entrance')}>
                    <span style={{ fontSize: 36 }}>🏠</span>
                    <span style={{ fontSize: 15, fontWeight: 900 }}>כניסה ראשית</span>
                    <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>גדלים: 15 או 20 ס"מ</span>
                  </StepButton>
                </div>
              </>
            )}

            {/* ── Step 1: Nusach ── */}
            {step === 1 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <button onClick={handleReset} style={{ background: 'none', border: 'none', color: '#b8972a', fontSize: 13, cursor: 'pointer', fontWeight: 700, padding: 0 }}>← חזרה</button>
                  <span style={{ background: '#f0ebe0', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, color: '#0c1a35' }}>
                    {location === 'room' ? '🚪 חדר' : '🏠 כניסה ראשית'} — {sizes.join(' / ')} ס"מ
                  </span>
                </div>
                <h3 style={{ textAlign: 'center', fontSize: isMobile ? 18 : 22, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>
                  מה הנוסח שלך?
                </h3>
                <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginBottom: 28 }}>ניתן לשנות בהמשך</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  {(['ספרדי', 'אשכנזי', 'תימני'] as Nusach[]).map((n, i) => (
                    <StepButton key={n} onClick={() => handleSelectNusach(n)}>
                      <span style={{ fontSize: 28 }}>{i === 0 ? '🌊' : i === 1 ? '❄️' : '☀️'}</span>
                      <span style={{ fontSize: 14, fontWeight: 900 }}>{n}</span>
                      {n === 'ספרדי' && (
                        <span style={{ fontSize: 10, color: '#b8972a', fontWeight: 700, background: '#fffbf0', borderRadius: 10, padding: '2px 8px', border: '1px solid #e8d8a0' }}>נפוץ</span>
                      )}
                    </StepButton>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 2: Results ── */}
            {step === 2 && (
              <>
                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
                  <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#b8972a', fontSize: 13, cursor: 'pointer', fontWeight: 700, padding: 0 }}>← חזרה</button>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[location === 'room' ? '🚪 חדר' : '🏠 כניסה ראשית', `נוסח ${nusach}`, `${sizes.join('/')} ס"מ`].map(tag => (
                      <span key={tag} style={{ background: '#f0ebe0', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700, color: '#0c1a35' }}>{tag}</span>
                    ))}
                  </div>
                  <button onClick={handleReset} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#666', cursor: 'pointer' }}>התחל מחדש</button>
                </div>

                <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 900, color: '#0c1a35', marginBottom: 18 }}>
                  קלפי מזוזה מומלצים עבורך
                </h3>

                {/* Skeleton */}
                {loading && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 12 }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} style={{ borderRadius: 14, overflow: 'hidden', background: '#f5f5f5', border: '2px solid #eee' }}>
                        <div style={{ paddingTop: '100%', background: '#e8e8e8', animation: 'pulse 1.5s infinite' }} />
                        <div style={{ padding: 12 }}>
                          <div style={{ height: 12, background: '#e0e0e0', borderRadius: 4, marginBottom: 8 }} />
                          <div style={{ height: 10, background: '#e0e0e0', borderRadius: 4, width: '55%', marginBottom: 12 }} />
                          <div style={{ height: 36, background: '#e0e0e0', borderRadius: 10 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Results */}
                {!loading && klafim.length > 0 && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: isMobile ? 10 : 14, marginBottom: 20 }}>
                      {klafim.map(p => (
                        <KlafCard key={p.id} product={p} onAdd={handleAddToCart} isMobile={isMobile} />
                      ))}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => router.push('/category/קלפי מזוזה')}
                        style={{ background: 'none', border: '2px solid #0c1a35', borderRadius: 12, padding: '11px 32px', fontSize: 14, fontWeight: 700, color: '#0c1a35', cursor: 'pointer' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#f0ebe0')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
                      >
                        לכל קלפי המזוזה ←
                      </button>
                    </div>
                  </>
                )}

                {/* Empty state */}
                {!loading && klafim.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#888' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📜</div>
                    <p style={{ marginBottom: 16 }}>לא נמצאו קלפים — הצג את כל קלפי המזוזה</p>
                    <button
                      onClick={() => router.push('/category/קלפי מזוזה')}
                      style={{ background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                    >
                      לכל הקלפים ←
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
