'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

type Path = 'mezuzah' | 'tefillin' | null;
type Nusach = 'ספרדי' | 'אשכנזי' | null;
type Level = 'פשוט' | 'מהודר' | 'מהודר בתכלית';

const CDN = 'https://res.cloudinary.com/dyxzq3ucy/image/upload/q_auto/f_auto';
const NUSACH_IMAGES: Record<string, string> = {
  'ספרדי':  `${CDN}/sfardi_me6dad`,
  'אשכנזי': `${CDN}/ashkenazi_mquvst`,
};

// ── Shared image card ─────────────────────────────────────────────────────────

function ImageCard({
  img, label, desc, onClick, height, overlayOpacity = 0.4, isMobile, textCenter = false, noOverlay = false,
}: {
  img: string;
  label: string;
  desc?: string;
  onClick: () => void;
  height: number;
  overlayOpacity?: number;
  isMobile: boolean;
  textCenter?: boolean;
  noOverlay?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        height,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        background: img ? '#000' : '#1a2744',
        border: '1px solid rgba(255,252,240,0.15)',
        transition: 'transform 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
    >
      {img && (
        <Image
          fill
          loading="lazy"
          src={optimizeCloudinaryUrl(img, 600)}
          alt={label}
          style={{ objectFit: 'cover' }}
          sizes="(max-width: 640px) 50vw, 300px"
        />
      )}
      {/* Dark overlay */}
      {!noOverlay && <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${overlayOpacity})` }} />}
      {/* Text at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, right: 0, left: 0,
        padding: '10px 12px',
        textAlign: textCenter ? 'center' : 'right',
      }}>
        <div style={{
          color: '#fff', fontSize: isMobile ? 15 : 17, fontWeight: 700,
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        }}>
          {label}
        </div>
        {desc && (
          <div style={{
            color: 'rgba(255,252,240,0.75)', fontSize: isMobile ? 11 : 12,
            fontWeight: 400, marginTop: 2,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            {desc}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SmartFunnel({ isMobile }: { isMobile: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [path, setPath] = useState<Path>(null);
  const [nusach, setNusach] = useState<Nusach>(null);
  const [animating, setAnimating] = useState(false);

  // STEP 0 images
  const [mezuzahImg, setMezuzahImg] = useState('');
  const [tefillinImg, setTefillinImg] = useState('');
  // STEP 1 sub-type images
  const [klafImg, setKlafImg] = useState('');
  const [batimImg, setBatimImg] = useState('');

  useEffect(() => {
    async function fetchImages() {
      try {
        const [mezSnap, tefSnap, klafSnap] = await Promise.all([
          getDocs(query(collection(db, 'categories'), where('name', '==', 'מזוזות'), limit(1))),
          getDocs(query(collection(db, 'categories'), where('name', '==', 'תפילין קומפלט'), limit(1))),
          getDocs(query(collection(db, 'categories'), where('name', '==', 'קלפי מזוזה'), limit(1))),
        ]);

        if (!mezSnap.empty) {
          const d = mezSnap.docs[0].data();
          const img = (d.imageUrl || d.imgUrl || '') as string;
          setMezuzahImg(img);
          setBatimImg(img); // בתי מזוזה card reuses the מזוזות category image
        }
        if (!tefSnap.empty) {
          const d = tefSnap.docs[0].data();
          const img = (d.imageUrl || d.imgUrl || '') as string;
          if (img) { setTefillinImg(img); }
        }
        if (!klafSnap.empty) {
          const d = klafSnap.docs[0].data();
          setKlafImg((d.imageUrl || d.imgUrl || '') as string);
        }

        // Tefillin fallback chain
        if (tefSnap.empty || !(tefSnap.docs[0]?.data().imageUrl || tefSnap.docs[0]?.data().imgUrl)) {
          const tefSlugSnap = await getDocs(query(collection(db, 'categories'), where('slug', '==', 'תפילין-קומפלט'), limit(1)));
          if (!tefSlugSnap.empty) {
            const d = tefSlugSnap.docs[0].data();
            const img = (d.imageUrl || d.imgUrl || '') as string;
            if (img) { setTefillinImg(img); return; }
          }
          setTefillinImg('https://res.cloudinary.com/dyxzq3ucy/image/upload/v1/yoursofer_upload/tefillin-category');
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

  function getLevelOptions(): { label: Level; desc: string }[] {
    if (path === 'mezuzah') {
      return [
        { label: 'פשוט', desc: 'עד ₪280' },
        { label: 'מהודר', desc: '₪281 – ₪399' },
        { label: 'מהודר בתכלית', desc: '₪400+' },
      ];
    }
    if (nusach === 'ספרדי') {
      return [
        { label: 'פשוט', desc: '₪2,700 – ₪3,200' },
        { label: 'מהודר', desc: '₪3,201 – ₪3,699' },
        { label: 'מהודר בתכלית', desc: '₪3,700+' },
      ];
    }
    return [
      { label: 'פשוט', desc: '₪3,000 – ₪3,500' },
      { label: 'מהודר', desc: '₪3,501 – ₪3,999' },
      { label: 'מהודר בתכלית', desc: '₪4,000+' },
    ];
  }

  function navigate(level: Level) {
    const catName = path === 'mezuzah' ? 'קלפי מזוזה' : 'תפילין קומפלט';
    const levelParam = level === 'מהודר בתכלית' ? 'מהודר-בתכלית' : level;
    const nusachParam = nusach ? `nusach=${encodeURIComponent(nusach)}&` : '';
    router.push(`/category/${encodeURIComponent(catName)}?${nusachParam}level=${encodeURIComponent(levelParam)}`);
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
    <div style={{ background: '#F5F0E8', padding: isMobile ? '24px 12px' : '40px 24px' }}>
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
              <ImageCard
                img={mezuzahImg}
                label="צפה במזוזות"
                onClick={() => { setPath('mezuzah'); go(1); }}
                height={140}
                isMobile={isMobile}
                noOverlay
              />
              <ImageCard
                img="https://res.cloudinary.com/dyxzq3ucy/image/upload/v1776222894/vrknd4v6jp9z7fyrcbyf.jpg"
                label="צפה בתפילין"
                onClick={() => { setPath('tefillin'); go(2); }}
                height={140}
                isMobile={isMobile}
                noOverlay
              />
            </div>
          </>
        )}

        {/* STEP 1 — Sub-type (מזוזות only) */}
        {step === 1 && (
          <>
            <div style={titleStyle}>בחר סוג מזוזה</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ImageCard
                img={klafImg}
                label="קלפי מזוזה"
                desc="בחירת קלף ספציפי מגלריה"
                onClick={() => go(2)}
                height={130}
                overlayOpacity={0.4}
                isMobile={isMobile}
              />
              <ImageCard
                img={batimImg}
                label="בתי מזוזה"
                desc="נרתיקים ובתים מכל הסוגים"
                onClick={() => router.push(`/category/${encodeURIComponent('מזוזות')}`)}
                height={130}
                overlayOpacity={0.4}
                isMobile={isMobile}
              />
            </div>
          </>
        )}

        {/* STEP 2 — Nusach */}
        {step === 2 && (
          <>
            <div style={titleStyle}>בחר נוסח</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {(['ספרדי', 'אשכנזי'] as const).map(n => (
                <ImageCard
                  key={n}
                  img={NUSACH_IMAGES[n]}
                  label={n}
                  onClick={() => { setNusach(n); go(3); }}
                  height={120}
                  overlayOpacity={0.35}
                  isMobile={isMobile}
                  textCenter
                />
              ))}
            </div>
          </>
        )}

        {/* STEP 3 — Level */}
        {step === 3 && (
          <>
            <div style={titleStyle}>בחר רמת הידור</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {getLevelOptions().map(opt => (
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
