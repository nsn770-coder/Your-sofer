'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/app/firebase';

type Path = 'mezuzah' | 'tefillin' | null;
type Nusach = 'ספרדי' | 'אשכנזי' | null;
type Level = 'פשוט' | 'מהודר' | 'מהודר בתכלית';

export default function SmartFunnel({ isMobile }: { isMobile: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [path, setPath] = useState<Path>(null);
  const [nusach, setNusach] = useState<Nusach>(null);
  const [animating, setAnimating] = useState(false);
  const [mezuzahImg, setMezuzahImg] = useState('');
  const [tefillinImg, setTefillinImg] = useState('');

  useEffect(() => {
    async function fetchImages() {
      try {
        const [mezSnap, tefSnap] = await Promise.all([
          getDocs(query(collection(db, 'categories'), where('name', '==', 'מזוזות'), limit(1))),
          getDocs(query(collection(db, 'categories'), where('name', '==', 'תפילין קומפלט'), limit(1))),
        ]);
        if (!mezSnap.empty) {
          const d = mezSnap.docs[0].data();
          setMezuzahImg((d.imageUrl || d.imgUrl || '') as string);
        }
        if (!tefSnap.empty) {
          const d = tefSnap.docs[0].data();
          setTefillinImg((d.imageUrl || d.imgUrl || '') as string);
        }
      } catch { /* non-fatal */ }
    }
    fetchImages();
  }, []);

  function go(nextStep: number) {
    setAnimating(true);
    setTimeout(() => { setStep(nextStep); setAnimating(false); }, 200);
  }

  function back() {
    if (step === 1) { setPath(null); go(0); }
    else if (step === 2) {
      if (path === 'mezuzah') go(1);
      else { setPath(null); go(0); }
    }
    else if (step === 3) { setNusach(null); go(2); }
  }

  function navigate(level: Level) {
    const catName = path === 'mezuzah' ? 'קלפי מזוזה' : 'תפילין קומפלט';
    const ranges: Record<Level, string> = {
      'פשוט': 'minPrice=180&maxPrice=240',
      'מהודר': 'minPrice=241&maxPrice=280',
      'מהודר בתכלית': 'minPrice=281',
    };
    const nusachParam = nusach ? `nusach=${encodeURIComponent(nusach)}&` : '';
    router.push(`/category/${encodeURIComponent(catName)}?${nusachParam}${ranges[level]}`);
  }

  const btnStyle: React.CSSProperties = {
    background: 'rgba(255,252,240,0.15)',
    border: '2px solid rgba(255,252,240,0.6)',
    color: '#fff',
    borderRadius: 12,
    padding: '14px 20px',
    fontSize: isMobile ? 15 : 16,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'right',
    transition: 'background 0.18s',
    direction: 'rtl',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: isMobile ? 18 : 22,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'right',
  };

  return (
    <div style={{ background: '#0c1a35', padding: isMobile ? '24px 12px' : '40px 24px' }}>
      <div
        style={{
          background: '#1a2744',
          borderRadius: 16,
          padding: isMobile ? '24px 16px' : '32px 40px',
          direction: 'rtl',
          maxWidth: 560,
          margin: '0 auto',
          opacity: animating ? 0 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {/* Back link */}
        {step > 0 && (
          <button
            onClick={back}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,252,240,0.7)', fontSize: 13,
              cursor: 'pointer', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 4, padding: 0,
            }}
          >
            ← חזרה
          </button>
        )}

        {/* STEP 0 — Choose path */}
        {step === 0 && (
          <>
            <div style={titleStyle}>מה אתה מחפש?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'צפה במזוזות', img: mezuzahImg, onClick: () => { setPath('mezuzah'); go(1); } },
                { label: 'צפה בתפילין', img: tefillinImg, onClick: () => { setPath('tefillin'); go(2); } },
              ].map(card => (
                <div
                  key={card.label}
                  onClick={card.onClick}
                  style={{
                    height: 140, borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                    position: 'relative', background: card.img ? '#000' : '#1a2744',
                    border: '1px solid rgba(255,252,240,0.15)',
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
                >
                  {card.img && (
                    <img
                      src={card.img}
                      alt={card.label}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ color: '#fff', fontSize: isMobile ? 15 : 17, fontWeight: 700, textAlign: 'center', padding: '0 8px' }}>
                      {card.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* STEP 1 — Sub-type (מזוזות only) */}
        {step === 1 && (
          <>
            <div style={titleStyle}>בחר סוג מזוזה</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'קלפי מזוזה', desc: 'בחירת קלף ספציפי מגלריה', next: () => go(2) },
                { label: 'בתי מזוזה', desc: 'נרתיקים ובתים מכל הסוגים', next: () => router.push('/category/מזוזות') },
              ].map(opt => (
                <button
                  key={opt.label}
                  style={{ ...btnStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={opt.next}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,252,240,0.25)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,252,240,0.15)'; }}
                >
                  <span>{opt.label}</span>
                  <span style={{ fontSize: isMobile ? 11 : 12, color: 'rgba(255,252,240,0.6)', fontWeight: 400 }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2 — Nusach */}
        {step === 2 && (
          <>
            <div style={titleStyle}>בחר נוסח</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(['ספרדי', 'אשכנזי'] as const).map(n => (
                <button
                  key={n}
                  style={btnStyle}
                  onClick={() => { setNusach(n); go(3); }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,252,240,0.25)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,252,240,0.15)'; }}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 3 — Level */}
        {step === 3 && (
          <>
            <div style={titleStyle}>בחר רמת הידור</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {([
                { label: 'פשוט', desc: '₪180 – ₪240' },
                { label: 'מהודר', desc: '₪241 – ₪280' },
                { label: 'מהודר בתכלית', desc: '₪281+' },
              ] as { label: Level; desc: string }[]).map(opt => (
                <button
                  key={opt.label}
                  style={{ ...btnStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => navigate(opt.label)}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,252,240,0.25)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,252,240,0.15)'; }}
                >
                  <span>{opt.label}</span>
                  <span style={{ fontSize: isMobile ? 11 : 12, color: 'rgba(255,252,240,0.6)', fontWeight: 400 }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
