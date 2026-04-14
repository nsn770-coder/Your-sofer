'use client';
import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CARDS, CONFIG_COLLECTION, CONFIG_DOC } from '../../constants/homepageCards';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminProduct {
  id: string;
  name: string;
  imgUrl?: string;
  image_url?: string;
  cat?: string;
}

// config shape: { [cardTitle]: { [slotLabel]: productId } }
type ConfigMap = Record<string, Record<string, string>>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function slotKey(cardTitle: string, slotLabel: string) {
  return `${cardTitle}|||${slotLabel}`;
}

function productImg(p: AdminProduct) {
  return p.imgUrl || p.image_url || '';
}

// ── SlotEditor ────────────────────────────────────────────────────────────────

function SlotEditor({
  cardTitle,
  slotLabel,
  pinnedId,
  products,
  onPin,
}: {
  cardTitle: string;
  slotLabel: string;
  pinnedId: string;
  products: AdminProduct[];
  onPin: (productId: string) => void;
}) {
  const [search, setSearch]   = useState('');
  const [open, setOpen]       = useState(false);
  const wrapRef               = useRef<HTMLDivElement>(null);

  const pinned = products.find(p => p.id === pinnedId);
  const thumb  = pinned ? productImg(pinned) : '';

  const results = search.trim().length >= 1
    ? products.filter(p => p.name?.includes(search.trim())).slice(0, 6)
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      style={{
        background: '#f8f9fb',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: '10px 12px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 60, height: 60, flexShrink: 0,
          borderRadius: 6, overflow: 'hidden',
          background: '#e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {thumb ? (
          <img src={thumb} alt={pinned?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 22, color: '#c0c0c0', fontWeight: 900 }}>{slotLabel.charAt(0)}</span>
        )}
      </div>

      {/* Right side */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>{slotLabel}</div>
        {pinned && (
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📌 {pinned.name}
          </div>
        )}

        {/* Search */}
        <div ref={wrapRef} style={{ position: 'relative' }}>
          <input
            type="text"
            value={search}
            placeholder="חפש מוצר..."
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1px solid #d1d5db', borderRadius: 6,
              padding: '5px 8px', fontSize: 12, direction: 'rtl',
              outline: 'none', background: '#fff',
            }}
          />

          {/* Dropdown */}
          {open && results.length > 0 && (
            <div
              style={{
                position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 50,
                background: '#fff', border: '1px solid #d1d5db',
                borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                maxHeight: 220, overflowY: 'auto', marginTop: 2,
              }}
            >
              {results.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onPin(p.id);
                    setSearch('');
                    setOpen(false);
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', border: 'none', background: 'none',
                    cursor: 'pointer', textAlign: 'right', direction: 'rtl',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 4, overflow: 'hidden', background: '#e5e7eb' }}>
                    {productImg(p) && (
                      <img src={productImg(p)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear pin */}
        {pinnedId && (
          <button
            onClick={() => onPin('')}
            style={{ fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 }}
          >
            ✕ הסר בחירה
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function HomepageConfigTab({ products }: { products: AdminProduct[] }) {
  const [config, setConfig]         = useState<ConfigMap>({});
  const [loadingConfig, setLoading] = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({});

  // Load existing config from Firestore
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC));
        if (snap.exists()) setConfig(snap.data() as ConfigMap);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  function toggleCard(title: string) {
    setExpanded(prev => ({ ...prev, [title]: !prev[title] }));
  }

  function handlePin(cardTitle: string, slotLabel: string, productId: string) {
    setConfig(prev => ({
      ...prev,
      [cardTitle]: {
        ...(prev[cardTitle] ?? {}),
        [slotLabel]: productId,
      },
    }));
  }

  async function saveAll() {
    setSaving(true);
    try {
      await setDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC), config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
      alert('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  if (loadingConfig) {
    return <div className="p-10 text-center text-gray-400">טוען הגדרות...</div>;
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-800">🏠 עריכת תמונות דף הבית</h2>
          <p className="text-sm text-gray-500 mt-1">בחר מוצר ספציפי לכל חריץ בכרטיסי הקטגוריה. אם לא נבחר מוצר, תוצג תמונה אוטומטית.</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="px-5 py-2 rounded-xl font-bold text-white transition"
          style={{ background: saved ? '#16a34a' : '#0c1a35', minWidth: 120 }}
        >
          {saving ? '...' : saved ? '✅ נשמר!' : '💾 שמור הכל'}
        </button>
      </div>

      <div className="grid gap-4">
        {CARDS.map(card => {
          const isOpen = !!expanded[card.title];
          // count how many slots in this card have a pin
          const pinnedCount = card.items.filter(item => config[card.title]?.[item.label]).length;

          return (
            <div key={card.title} className="bg-white rounded-xl shadow overflow-hidden">
              {/* Card header */}
              <button
                onClick={() => toggleCard(card.title)}
                className="w-full flex items-center justify-between p-4 text-right hover:bg-gray-50 transition"
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-gray-800">{card.title}</span>
                  {pinnedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                      📌 {pinnedCount} מוצרים נבחרו
                    </span>
                  )}
                </div>
                <span className="text-gray-400 text-lg">{isOpen ? '▲' : '▼'}</span>
              </button>

              {/* Slots grid */}
              {isOpen && (
                <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-100">
                  {card.items.map(item => (
                    <SlotEditor
                      key={slotKey(card.title, item.label)}
                      cardTitle={card.title}
                      slotLabel={item.label}
                      pinnedId={config[card.title]?.[item.label] ?? ''}
                      products={products}
                      onPin={(pid) => handlePin(card.title, item.label, pid)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom save button */}
      <div className="mt-6 flex justify-start">
        <button
          onClick={saveAll}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl font-bold text-white transition"
          style={{ background: saved ? '#16a34a' : '#0c1a35' }}
        >
          {saving ? 'שומר...' : saved ? '✅ נשמר!' : '💾 שמור הכל'}
        </button>
      </div>
    </div>
  );
}
