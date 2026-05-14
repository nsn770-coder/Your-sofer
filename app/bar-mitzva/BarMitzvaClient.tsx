'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useCart } from '@/app/contexts/CartContext';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import { formatPrice } from '@/app/lib/utils';

const GOLD = '#C5A028';
const NAVY = '#111d3a';
const WA = 'https://wa.me/972552722228';

interface Product {
  id: string;
  name: string;
  price: number;
  was?: number;
  imgUrl?: string;
  image_url?: string;
  sofer?: string;
  soferId?: string;
  level?: string;
  cat?: string;
  hidden?: boolean;
  priority?: number;
}

interface Sofer {
  name: string;
  photoURL?: string;
  image?: string;
}

const COMPLETE_SET = [
  { label: 'טלית', emoji: '🟦', href: '/category/טליתות וציציות' },
  { label: 'כיסוי תפילין', emoji: '🎒', href: '/category/סט טלית תפילין' },
  { label: 'כיפה', emoji: '🎩', href: '/category/כיפות' },
  { label: 'סידור', emoji: '📖', href: '/category/סידור' },
];

export default function BarMitzvaPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [soferimMap, setSoferimMap] = useState<Record<string, Sofer>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { addItem } = useCart();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snap = await getDocs(query(
          collection(db, 'products'),
          where('cat', '==', 'בר מצווה')
        ));
        const prods = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(p => !p.hidden)
          .sort((a, b) => (b.priority || 0) - (a.priority || 0));
        setProducts(prods);

        // load soferim
        const soferIds = [...new Set(prods.map(p => p.soferId).filter(Boolean))] as string[];
        const map: Record<string, Sofer> = {};
        await Promise.all(soferIds.map(async id => {
          const snap = await getDoc(doc(db, 'soferim', id));
          if (snap.exists()) map[id] = snap.data() as Sofer;
        }));
        setSoferimMap(map);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div dir="rtl" style={{ background: '#f8f6f2', minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{
        background: `linear-gradient(160deg, ${NAVY} 0%, #0e1a36 55%, #0a1428 100%)`,
        padding: isMobile ? '48px 20px 40px' : '72px 24px 56px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(197,160,40,0.14)', border: '1px solid rgba(197,160,40,0.4)',
            borderRadius: 20, padding: '6px 18px',
            fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 20,
          }}>✡ מזל טוב לבר המצווה</div>

          <h1 style={{ fontSize: isMobile ? 30 : 44, fontWeight: 900, color: '#fff', lineHeight: 1.2, margin: '0 0 16px' }}>
            סט בר מצווה מהודר
          </h1>
          <p style={{ fontSize: isMobile ? 14 : 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, marginBottom: 28 }}>
            תפילין קומפלט כשרים ומאושרים, כתובים ע&quot;י סופרים מוסמכים.<br/>
            כל קלף מצולם, נבדק ע&quot;י מגיה רבני ומגיע עם תעודת כשרות.
          </p>
          <a href={WA} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#25D366', color: '#fff', borderRadius: 14,
              padding: '12px 28px', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
            💬 צריך עזרה? שאל בוואטסאפ
          </a>
        </div>
      </section>

      {/* Products */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '32px 16px' : '48px 24px' }}>
        <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: NAVY, marginBottom: 8, textAlign: 'center' }}>
          סט בר מצווה
        </h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: 14, marginBottom: 28 }}>
          {products.length} מוצרים זמינים — כל קלף כתוב ביד
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>טוען...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 16 }}>
            {products.map(p => {
              const img = optimizeCloudinaryUrl(p.imgUrl || p.image_url || '', 400);
              const sofer = p.soferId ? soferimMap[p.soferId] : null;
              const soferPhoto = sofer?.photoURL || sofer?.image;
              return (
                <div key={p.id}
                  onClick={() => router.push('/product/' + p.id)}
                  style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                    border: '1px solid #e8e8e8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    display: 'flex', flexDirection: 'column' }}>
                  {/* Image */}
                  <div style={{ paddingTop: '100%', position: 'relative', background: '#f5f5f5' }}>
                    {img && <img src={img} alt={p.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  {/* Sofer strip */}
                  {p.sofer && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: '#f8f6f1', borderTop: '1px solid #ede9df' }}>
                      {soferPhoto ? (
                        <img src={soferPhoto} alt={p.sofer}
                          style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 24, height: 24, borderRadius: 4, background: '#e5e0d5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✍️</div>
                      )}
                      <span style={{ fontSize: 10, color: '#666', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.sofer}</span>
                    </div>
                  )}
                  {/* Content */}
                  <div style={{ padding: '10px 10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: '#111', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.name}</div>
                    <div style={{ marginTop: 'auto' }}>
                      <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900, color: '#1E3A8A' }}>{formatPrice(p.price)}</div>
                      {p.was && p.was > p.price && (
                        <div style={{ fontSize: 11, color: '#999', textDecoration: 'line-through' }}>{formatPrice(p.was)}</div>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); addItem({ id: p.id, name: p.name, price: p.price, imgUrl: img || undefined, quantity: 1 }); }}
                      style={{ width: '100%', padding: '8px 0', borderRadius: 10, background: GOLD, color: '#1E3A8A', border: 'none', fontWeight: 800, fontSize: isMobile ? 12 : 13, cursor: 'pointer' }}>
                      הוסף לסל
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Complete set */}
      <section style={{ background: '#fff', borderTop: '1px solid #eee', padding: isMobile ? '28px 16px' : '40px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: NAVY, marginBottom: 6 }}>השלימו את הסט</h2>
          <p style={{ fontSize: 13, color: '#777', marginBottom: 20 }}>הוסיפו טלית, כיסוי תפילין, כיפה וסידור</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {COMPLETE_SET.map(item => (
              <a key={item.label} href={item.href}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  background: '#f8f6f2', border: '1px solid #e8e4da', borderRadius: 12,
                  padding: '14px 20px', textDecoration: 'none', minWidth: 80 }}>
                <span style={{ fontSize: 24 }}>{item.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{item.label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
