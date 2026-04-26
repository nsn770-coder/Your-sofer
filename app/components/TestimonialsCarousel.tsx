'use client';

import Image from 'next/image';

interface Testimonial {
  id: string;
  name: string;
  city: string;
  text: string;
  rating: number;
  imageUrl: string;
  active: boolean;
}

interface Props {
  testimonials: Testimonial[];
  testIdx: number;
  setTestIdx: React.Dispatch<React.SetStateAction<number>>;
  isMobile: boolean;
}

export default function TestimonialsCarousel({ testimonials, testIdx, setTestIdx, isMobile }: Props) {
  const t = testimonials[testIdx];
  if (!t) return null;

  return (
    <div style={{ background: '#F5F0E8', padding: isMobile ? '40px 16px' : '56px 16px', direction: 'rtl' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: isMobile ? 22 : 28, fontWeight: 900, color: '#0c1a35', marginBottom: 8 }}>מה הלקוחות אומרים</h2>
        <p style={{ textAlign: 'center', fontSize: 14, color: '#888', marginBottom: 36 }}>אלפי לקוחות מרוצים ברחבי הארץ</p>
        <div key={testIdx} style={{ background: '#fff', borderRadius: 0, boxShadow: '0 4px 28px rgba(0,0,0,0.09)', padding: isMobile ? '24px 20px' : '36px 44px', display: 'flex', alignItems: 'flex-start', gap: 28, flexDirection: isMobile ? 'column' : 'row', animation: 'testFadeIn 0.55s ease' }}>
          <div style={{ flexShrink: 0, alignSelf: isMobile ? 'center' : 'flex-start' }}>
            {t.imageUrl ? (
              <Image src={t.imageUrl} alt={t.name} width={84} height={84} loading="lazy" style={{ borderRadius: '50%', objectFit: 'cover', border: '3px solid #b8972a' }} />
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
              <button key={i} onClick={() => setTestIdx(i)} style={{ width: i === testIdx ? 24 : 10, height: 10, borderRadius: 0, border: 'none', cursor: 'pointer', background: i === testIdx ? '#b8972a' : '#ccc', padding: 0, transition: 'width 0.3s, background 0.3s' }} />
            ))}
            <button onClick={() => setTestIdx(i => (i + 1) % testimonials.length)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#b8972a', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }} aria-label="הבא">›</button>
          </div>
        )}
      </div>
    </div>
  );
}
